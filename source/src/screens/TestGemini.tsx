import React, { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useAi } from '../ai/AiProvider';
import { GeminiError, testGemini } from '../ai/gemini';
import { GeminiReport, searchWords, statusWords } from '../ai/modelPick';
import { useApp } from '../state';
import { FamilyError, testViaFamily } from '../sync/family';
import { Button, C, Icon, Row, Text } from '../ui';

/** "Test Gemini": shows which models the key can call and whether text and web search each work. Sends only fixed test prompts. */
export default function TestGemini() {
  const { family } = useApp();
  const { key } = useAi();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<GeminiReport | null>(null);
  if (!family && !key) return null;

  const run = async () => {
    setBusy(true);
    setError(null);
    setReport(null);
    try {
      setReport(family ? await testViaFamily(family) : await testGemini(key!));
    } catch (e) {
      setError(e instanceof GeminiError || e instanceof FamilyError ? e.message : 'The test failed. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const textOk = report?.text.find((t) => t.ok);
  const searchOk = !!report?.search?.ok && report.search.links > 0;
  return (
    <View style={{ marginTop: 14, borderTopWidth: 1, borderTopColor: C.line, paddingTop: 14 }}>
      {busy
        ? <Row style={{ gap: 8 }}><ActivityIndicator color={C.brand} /><Text style={{ color: C.muted }}>Testing with Google…</Text></Row>
        : <Button kind="ghost" icon="pulse-outline" label="Test Gemini" onPress={run} />}
      <Text style={{ color: C.faint, fontSize: 12, marginTop: 6 }}>Sends only a short test message to each model, plus one test search. Nothing about your family.</Text>
      {error && <Text style={{ color: C.red, fontSize: 13, marginTop: 8 }}>{error}</Text>}
      {report && (
        <View style={{ marginTop: 12, gap: 10 }}>
          <Verdict ok={!!textOk} title="Text (translate, Ask Kaki, drafting, lessons)"
            body={textOk ? `Works, using ${textOk.model}.` : 'No model answered. See the list below for what Google said.'} />
          <Verdict ok={searchOk} title="Web recipe search" body={searchWords(report)} />
          <View style={{ backgroundColor: C.bg, borderRadius: 12, padding: 12, gap: 6 }}>
            <Text style={{ fontWeight: '700', fontSize: 13 }}>
              {report.available ? `The key can see ${report.available.length} Gemini text models. The app tries these, in order:` : "Couldn't read the key's model list, so the app tries its fixed list:"}
            </Text>
            {report.text.map((t) => (
              <View key={t.model}>
                <Text style={{ fontSize: 13 }}>{t.ok ? '✓' : '✗'} {t.model}: {statusWords(t)}</Text>
                {!t.ok && t.why && <Text style={{ color: C.faint, fontSize: 11 }} numberOfLines={2}>{t.why}</Text>}
              </View>
            ))}
            {report.search && !report.search.ok && report.search.why && (
              <Text style={{ color: C.faint, fontSize: 11 }} numberOfLines={3}>Search test: {report.search.why}</Text>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

function Verdict({ ok, title, body }: { ok: boolean; title: string; body: string }) {
  return (
    <Row style={{ flexWrap: 'nowrap', alignItems: 'flex-start', gap: 10 }}>
      <Icon name={ok ? 'checkmark-circle' : 'close-circle'} size={20} color={ok ? C.brand : C.red} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontWeight: '700' }}>{title}</Text>
        <Text style={{ color: C.muted, fontSize: 13, lineHeight: 19 }}>{body}</Text>
      </View>
    </Row>
  );
}
