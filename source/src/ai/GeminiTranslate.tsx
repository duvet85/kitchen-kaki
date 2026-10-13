import React, { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { recipeById } from '../data/recipes';
import { LANGS } from '../i18n';
import { useApp } from '../state';
import { Lang } from '../types';
import { Button, C, Card, Icon, Row, Text } from '../ui';
import { useAi } from './AiProvider';
import { GeminiError, translateRecipe } from './gemini';
import { FamilyError, translateViaFamily } from '../sync/family';

/** Owner-side card on the helper view: translate this week's recipes with the owner's Gemini key. */
export default function GeminiTranslate({ lang }: { lang: Exclude<Lang, 'en'> }) {
  const { state, update, family } = useApp();
  const { key, model } = useAi();
  const [busy, setBusy] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ids = [...new Set(state.plan?.dishes.map((d) => d.recipeId) ?? [])];
  const done = ids.filter((id) => state.aiTranslations?.[id]?.[lang]).length;
  const langName = LANGS.find((l) => l.key === lang)?.label ?? lang;

  if (family?.role === 'helper') return null;
  if (!family && (!key || !model)) {
    return (
      <Row style={{ marginTop: 12, gap: 8, flexWrap: 'nowrap' }}>
        <Icon name="sparkles-outline" size={16} color={C.faint} />
        <Text style={{ flex: 1, color: C.amber, fontSize: 13, lineHeight: 19, fontWeight: '600' }}>
          Translation is OFF. Only dish names are translated; cooking steps stay in English, because a fixed word list can't translate every step. Turn on Gemini in Settings (family sharing is best) to translate full recipes.
        </Text>
      </Row>
    );
  }

  const run = async (redo: boolean) => {
    const todo = redo ? ids : ids.filter((id) => !state.aiTranslations?.[id]?.[lang]);
    setError(null);
    setBusy({ done: 0, total: todo.length });
    try {
      for (const [n, id] of todo.entries()) {
        const r = recipeById(id);
        const tr = family
          ? await translateViaFamily(family, { name: r.name, steps: r.steps, lang })
          : await translateRecipe(key!, r, lang);
        update((st) => ({ ...st, aiTranslations: { ...st.aiTranslations, [id]: { ...st.aiTranslations?.[id], [lang]: tr } } }));
        setBusy({ done: n + 1, total: todo.length });
      }
    } catch (e) {
      setError(e instanceof GeminiError || e instanceof FamilyError ? e.message : 'Translation failed. Try again.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card style={{ marginTop: 14, padding: 14, maxWidth: 520 }}>
      <Row style={{ flexWrap: 'nowrap', gap: 10 }}>
        <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: C.brandSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="sparkles" size={18} color={C.brand} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '700' }}>Gemini translation</Text>
          <Text style={{ color: C.muted, fontSize: 12 }}>
            {busy ? `Translating ${busy.done + 1} of ${busy.total}…` : `${done} of ${ids.length} dishes translated into ${langName}`}
          </Text>
        </View>
        {busy ? <ActivityIndicator color={C.brand} /> : done < ids.length
          ? <Button small icon="sparkles" label="Translate" onPress={() => run(false)} />
          : <Button small kind="ghost" icon="refresh" label="Redo" onPress={() => run(true)} />}
      </Row>
      {error && <Text style={{ color: C.red, fontSize: 13, marginTop: 8 }}>{error}</Text>}
    </Card>
  );
}
