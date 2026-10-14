import { useEffect, useRef } from 'react';
import { recipeById } from '../data/recipes';
import { planRecipeIds } from '../engine/grocery';
import { useApp } from '../state';
import { useAi } from './AiProvider';
import { translateAll } from './GeminiTranslate';
import { fullyTranslated } from './text';

/**
 * Translates the confirmed menu into the helper's language by itself, so nobody has to tap "Translate" (a helper who can't read English
 * couldn't). Runs on the owner's phone when Gemini is on; a failure is not retried until the menu or language changes, and the reason
 * shows on the owner's Helper tab. Renders nothing.
 */
export default function AutoTranslate() {
  const { state, update, family } = useApp();
  const { key, model } = useAi();
  const lang = state.settings.helperLang;
  const plan = state.plan?.status === 'confirmed' ? state.plan : null;
  const tried = useRef('');
  const todo = lang !== 'en' && plan ? [...new Set(planRecipeIds(plan))].filter((id) => !fullyTranslated(recipeById(id), lang, state)) : [];
  const sig = `${lang}|${todo.join(',')}`;
  const can = family?.role !== 'helper' && (!!family || (!!key && !!model));
  useEffect(() => {
    if (!can || lang === 'en' || !todo.length || tried.current === sig) return;
    tried.current = sig;
    void translateAll({ todo, lang, family, key, update });
  });
  return null;
}
