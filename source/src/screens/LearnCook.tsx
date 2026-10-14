import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Button, C, Chip, F, Icon, Row, Text } from '../ui';
import { Difficulty, Lang } from '../types';
import { useApp } from '../state';
import { cookedSet, feedbackText, logOf } from '../engine/recognition';
import { HARD, HARD_TEXT, HISTORY_UI, LEARN_UI, learnFor } from '../data/learn';
import { Stars } from './LessonSheet';

/** What the cook sees on one step: safety first (every mode), then the tip and the why. */
export function StepExtras({ recipeId, step, lang }: { recipeId: string; step: number; lang: Lang }) {
  const l = learnFor(recipeId);
  if (!l) return null;
  const safety = l.safety.filter((s) => s.step === step);
  const tips = l.tips.filter((x) => x.step === step);
  const why = l.why[step];
  if (!safety.length && !tips.length && !why) return null;
  return (
    <View style={{ gap: 10, marginTop: 14 }}>
      {safety.map((s, k) => (
        <View key={`s${k}`} accessibilityLabel={LEARN_UI.safety[lang]} style={{ backgroundColor: '#FDE9E4', borderRadius: 14, padding: 12, borderLeftWidth: 5, borderLeftColor: C.accent }}>
          <Row style={{ flexWrap: 'nowrap', gap: 6 }}>
            <Icon name="warning" size={16} color={C.accent} />
            <Text style={{ fontWeight: '800', color: C.accent, fontSize: 12, letterSpacing: 1 }}>{LEARN_UI.safety[lang].toUpperCase()}</Text>
          </Row>
          <Text style={{ marginTop: 4, fontSize: 16, lineHeight: 23 }}>{s.text[lang]}</Text>
        </View>
      ))}
      {why && (
        <View style={{ backgroundColor: C.brandSoft, borderRadius: 14, padding: 12 }}>
          <Text style={{ fontWeight: '800', color: C.brand, fontSize: 12, letterSpacing: 1 }}>{LEARN_UI.why[lang].toUpperCase()}</Text>
          <Text style={{ marginTop: 4, fontSize: 15, lineHeight: 22 }}>{why[lang]}</Text>
        </View>
      )}
      {tips.map((x, k) => (
        <View key={`t${k}`} style={{ backgroundColor: '#FFF6DC', borderRadius: 14, padding: 12 }}>
          <Row style={{ flexWrap: 'nowrap', gap: 6 }}>
            <Icon name="bulb-outline" size={16} color={C.amber} />
            <Text style={{ fontWeight: '800', color: C.amber, fontSize: 12, letterSpacing: 1 }}>{LEARN_UI.tip[lang].toUpperCase()}</Text>
          </Row>
          <Text style={{ marginTop: 4, fontSize: 15, lineHeight: 22 }}>{x.text[lang]}</Text>
        </View>
      ))}
    </View>
  );
}

/** Before starting again: what she found hard last time, with one line of help each. */
export function LastTime({ hard, lang }: { hard: Difficulty[]; lang: Lang }) {
  if (!hard.length) return null;
  return (
    <View style={{ backgroundColor: '#FFF6DC', borderRadius: 14, padding: 12, marginTop: 12, gap: 6 }}>
      <Text style={{ fontWeight: '700' }}>{LEARN_UI.lastTime[lang]}</Text>
      {hard.map((h) => (
        <Text key={h} style={{ lineHeight: 21 }}><Text style={{ fontWeight: '700' }}>{HARD_TEXT[h].label[lang]}.</Text> {HARD_TEXT[h].help[lang]}</Text>
      ))}
    </View>
  );
}

/** After the last step. Skippable, and only for her family. */
export function ConfidenceCheck({ lang, initial, onSave, onSkip }: { lang: Lang; initial?: number; onSave: (r: { conf?: number; hard: Difficulty[] }) => void; onSkip: () => void }) {
  const [conf, setConf] = useState(initial ?? 0);
  const [hard, setHard] = useState<Difficulty[]>([]);
  const toggle = (h: Difficulty) => setHard((x) => (x.includes(h) ? x.filter((y) => y !== h) : [...x, h]));
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end', alignItems: 'center' }}>
      <View style={{ width: '100%', maxWidth: 640, maxHeight: '92%', backgroundColor: C.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          <Text style={{ fontFamily: F.displayX, fontSize: 26 }}>{LEARN_UI.howWent[lang]}</Text>
          <Text style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>{LEARN_UI.optional[lang]}</Text>
          <Text style={{ fontWeight: '700', marginTop: 16 }}>{LEARN_UI.howSure[lang]}</Text>
          <Stars value={conf} lang={lang} onChange={setConf} />
          <Text style={{ fontWeight: '700', marginTop: 18 }}>{LEARN_UI.anyHard[lang]}</Text>
          <Row style={{ gap: 8, marginTop: 8 }}>
            {HARD.map((h) => <Chip key={h} label={HARD_TEXT[h].label[lang]} selected={hard.includes(h)} onPress={() => toggle(h)} />)}
          </Row>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 22 }}>
            <View style={{ flex: 1 }}><Button kind="ghost" label={LEARN_UI.skip[lang]} onPress={onSkip} /></View>
            <View style={{ flex: 2 }}><Button icon="checkmark" label={LEARN_UI.save[lang]} onPress={() => onSave({ conf: conf || undefined, hard })} /></View>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const shortDay = (iso: string, lang: Lang) => new Date(iso).toLocaleDateString(lang === 'zh' ? 'zh-CN' : lang === 'id' ? 'id-ID' : lang === 'tl' ? 'fil-PH' : lang === 'my' ? 'my-MM' : 'en-SG', { day: 'numeric', month: 'short' });

/** On a dish: has she cooked it before, and what the family said about it last time. */
export function DishHistory({ recipeId, lang }: { recipeId: string; lang: Lang }) {
  const { state } = useApp();
  const id = recipeId.split('@')[0];
  const tries = state.learning?.tries?.[id];
  const n = Math.max(tries?.n ?? 0, cookedSet(state).has(id) ? 1 : 0);
  const notes = logOf(state).filter((e) => (e.kind === 'tip' || e.kind === 'thanks') && e.recipeId === id).slice(-3).reverse();
  const lines = notes.flatMap((e) => { const f = feedbackText(e, lang); return [...f.lines, ...(f.note ? [f.note] : [])]; }).slice(0, 4);
  return (
    <View style={{ marginTop: 4, gap: 2 }}>
      <Text style={{ color: n ? C.brand : C.faint, fontSize: 12, fontWeight: '700' }}>
        {n ? `${HISTORY_UI.cooked[lang].replace('{n}', String(n))}${tries?.last ? ` · ${HISTORY_UI.last[lang].replace('{date}', shortDay(tries.last, lang))}` : ''}` : HISTORY_UI.first[lang]}
      </Text>
      {lines.length > 0 && <Text style={{ color: C.muted, fontSize: 12, lineHeight: 17 }}>{HISTORY_UI.feedback[lang]} {lines.join(' · ')}</Text>}
    </View>
  );
}
