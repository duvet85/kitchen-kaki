import React, { useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useAi } from '../ai/AiProvider';
import { GeminiError, kakiMessage } from '../ai/gemini';
import { kakiContext } from '../ai/kaki';
import { KakiPlan, describeKakiAction, resolveKaki } from '../engine/kakiPlan';
import { ASK_EXAMPLES, differences, planDifferences } from '../data/askExamples';
import { Ask, describeAsk, understand } from '../engine/hiccup';
import { useApp } from '../state';
import { FamilyError, kakiViaFamily } from '../sync/family';
import { Button, C, Chip, Notice, Row, Text } from '../ui';

type Row_ = { q: string; rules: Ask | null; ruleDiff: string[]; plan?: KakiPlan; gemDiff?: string[]; error?: string };

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * "Try common questions": runs a fixed list of things owners and helpers say through the rule reader and through Gemini
 * (the family's own Supabase function, or the key on this phone), and shows what each understood and what Kaki would propose.
 * Only the fixed example sentences are sent. Nothing about the family. Nothing is ever changed.
 */
export default function AskTester() {
  const { family, state } = useApp();
  const { key } = useAi();
  const [rows, setRows] = useState<Row_[]>([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(0);
  const [only, setOnly] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const stop = useRef(false);
  if (!family && !key) return null;

  const run = async () => {
    if (!state.plan) { setNote('Make a menu on the Menu tab first. Kaki needs a menu to propose changes to.'); return; }
    stop.current = false; setBusy(true); setNote(null); setDone(0);
    const out: Row_[] = ASK_EXAMPLES.map((ex) => { const r = understand(ex.q); return { q: ex.q, rules: r, ruleDiff: differences(ex.expect, r) }; });
    setRows([...out]);
    for (let i = 0; i < ASK_EXAMPLES.length && !stop.current; i++) {
      const ex = ASK_EXAMPLES[i];
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const ctx = kakiContext(state);
          const raw = family ? await kakiViaFamily(family, ex.q, ctx) : await kakiMessage(key!, ex.q, ctx);
          const plan = resolveKaki(state, raw);
          out[i] = { ...out[i], plan, gemDiff: planDifferences(ex.expect, plan), error: undefined };
          break;
        } catch (e) {
          const msg = e instanceof GeminiError || e instanceof FamilyError ? e.message : 'The call failed.';
          out[i] = { ...out[i], error: msg };
          if (attempt === 0 && /busy|limit|quota|429|too many/i.test(msg)) await wait(20000); else break;
        }
      }
      setRows([...out]); setDone(i + 1);
      await wait((globalThis as { __ASK_GAP?: number }).__ASK_GAP ?? 4000); // stays inside Gemini's free requests-per-minute limit
    }
    setBusy(false);
  };

  const gemRows = rows.filter((r) => r.gemDiff);
  const bad = gemRows.filter((r) => r.gemDiff!.length).length;
  const shown = rows.filter((r) => !only || r.error || r.gemDiff?.length || (!r.plan && r.ruleDiff.length));
  return (
    <View style={{ marginTop: 14, borderTopWidth: 1, borderTopColor: C.line, paddingTop: 14 }}>
      <Text style={{ fontWeight: '700' }}>Try common questions</Text>
      <Text style={{ color: C.muted, fontSize: 13, marginTop: 4, lineHeight: 19 }}>
        Sends {ASK_EXAMPLES.length} example messages to Gemini, one at a time (about 3 minutes), with this week's menu and dish names, and shows Kaki's reply and the edits it would propose. Each edit is checked by the app against your family's rules first. Nothing about your family goes to Google, and nothing on your menu changes.
      </Text>
      <Row style={{ gap: 8, marginTop: 10 }}>
        {busy
          ? <><ActivityIndicator color={C.brand} /><Text style={{ color: C.muted }}>{done} of {ASK_EXAMPLES.length}…</Text><Button small kind="quiet" label="Stop" onPress={() => { stop.current = true; }} /></>
          : <Button kind="ghost" icon="chatbubbles-outline" label={rows.length ? 'Run again' : 'Try common questions'} onPress={run} />}
      </Row>
      {note && <Notice tone="warn" icon="alert-circle-outline">{note}</Notice>}
      {rows.length > 0 && (
        <View style={{ marginTop: 12, gap: 10 }}>
          {gemRows.length > 0 && <Text style={{ fontWeight: '700' }}>{gemRows.length - bad} of {gemRows.length} read as expected{bad ? `, ${bad} differ` : ''}.</Text>}
          <Row><Chip label="Show everything" selected={!only} onPress={() => setOnly(false)} /><Chip label="Only where it differs" selected={only} onPress={() => setOnly(true)} /></Row>
          {shown.map((r) => (
            <View key={r.q} style={{ backgroundColor: C.bg, borderRadius: 12, padding: 12, gap: 4 }}>
              <Text style={{ fontWeight: '700' }}>“{r.q}”</Text>
              <Text style={{ fontSize: 12, color: C.muted }}>Rule reader: {describeAsk(r.rules)}{r.ruleDiff.length ? '  ⚠ ' + r.ruleDiff.join('; ') : '  ✓'} (offline fallback)</Text>
              {r.error ? <Text style={{ fontSize: 12, color: C.red }}>Gemini: {r.error}</Text>
                : r.gemDiff ? (
                  <>
                    <Text style={{ fontSize: 13 }}>Kaki says: {r.plan?.reply}</Text>
                    {r.plan && r.plan.actions.length > 0
                      ? r.plan.actions.map((a) => <Text key={describeKakiAction(a)} style={{ fontSize: 12, color: C.brandDeep }}>→ {describeKakiAction(a)}{a.kind !== 'remove' && a.toBuy.length ? '  🛒 needs buying' : ''}</Text>)
                      : <Text style={{ fontSize: 12, color: C.muted }}>No edits proposed.</Text>}
                    {r.plan?.dropped.map((d) => <Text key={d} style={{ fontSize: 12, color: C.amber }}>Skipped by the app: {d}</Text>)}
                    <Text style={{ fontSize: 12, color: r.gemDiff.length ? C.amber : C.green, fontWeight: '700' }}>{r.gemDiff.length ? '⚠ Differs: ' + r.gemDiff.join('; ') : '✓ As expected'}</Text>
                  </>
                ) : <Text style={{ fontSize: 12, color: C.faint }}>Gemini: waiting…</Text>}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
