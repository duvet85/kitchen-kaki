import React, { useState, useSyncExternalStore } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { recipeById } from '../data/recipes';
import { LANGS } from '../i18n';
import { useApp } from '../state';
import { Lang } from '../types';
import { ingredientNames, fullyTranslated } from './text';
import { Button, C, Card, Icon, Row, Text } from '../ui';
import { useAi } from './AiProvider';
import { GeminiError, translateRecipe } from './gemini';
import { FamilyError, FamilyConfig, translateViaFamily } from '../sync/family';
import { AppState } from '../types';

/** Owner-side card on the helper view: translate this week's recipes with the owner's Gemini key. */
export default function GeminiTranslate({ lang }: { lang: Exclude<Lang, 'en'> }) {
  const { state, update, family } = useApp();
  const { key, model } = useAi();
  const [busy, setBusy] = useState<{ done: number; total: number } | null>(null);
  const error = useSyncExternalStore(subscribeTranslate, () => translateError);
  const ids = [...new Set([...(state.plan?.dishes ?? []), ...(state.plan?.meals ?? [])].map((d) => d.recipeId))];
  const done = ids.filter((id) => fullyTranslated(recipeById(id), lang, state)).length;
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
    const todo = redo ? ids : ids.filter((id) => !fullyTranslated(recipeById(id), lang, state));
    setBusy({ done: 0, total: todo.length });
    await translateAll({ todo, lang, family, key, update, onProgress: (n) => setBusy({ done: n, total: todo.length }) });
    setBusy(null);
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

// One translation run at a time, by the button or by AutoTranslate. The last failure is kept here so the card can show it.
let running = false;
let translateError: string | null = null;
const listeners = new Set<() => void>();
export const subscribeTranslate = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
const setTranslateError = (e: string | null) => { translateError = e; listeners.forEach((f) => f()); };
export const isTranslating = () => running;

/** Translates each dish in `todo` (names, steps, ingredients) and saves it into the state. Stops at the first failure and keeps its reason. */
export async function translateAll(o: {
  todo: string[]; lang: Exclude<Lang, 'en'>; family: FamilyConfig | null | undefined; key: string | null | undefined;
  update: (fn: (st: AppState) => AppState) => void; onProgress?: (done: number) => void;
}): Promise<boolean> {
  if (running) return false;
  running = true; setTranslateError(null);
  try {
    for (const [n, id] of o.todo.entries()) {
      const r = recipeById(id);
      const tr = o.family
        ? await translateViaFamily(o.family, { name: r.name, steps: r.steps, lang: o.lang, ingredients: ingredientNames(r) })
        : await translateRecipe(o.key!, r, o.lang);
      o.update((st) => ({ ...st, aiTranslations: { ...st.aiTranslations, [id]: { ...st.aiTranslations?.[id], [o.lang]: tr } } }));
      o.onProgress?.(n + 1);
    }
    return true;
  } catch (e) {
    setTranslateError(e instanceof GeminiError || e instanceof FamilyError ? e.message : `Translation failed (${e instanceof Error ? e.message : 'unknown'}). Try again, or tap Test Gemini in Settings.`);
    return false;
  } finally {
    running = false;
  }
}
