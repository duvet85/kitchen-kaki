import { AppState, Lang, Recipe, Translation } from '../types';

/**
 * The recipe text the helper sees. Dish names have a built-in translation, but the cooking steps are only
 * translated by Gemini (a fixed word list can't translate every step). Without a Gemini translation the
 * steps stay in English and `stepsTranslated` is false, so the screen can say so.
 */
export function recipeText(r: Recipe, lang: Lang, state: AppState): Translation & { byGemini: boolean; stepsTranslated: boolean } {
  if (lang === 'en') return { name: r.name, steps: r.steps, byGemini: false, stepsTranslated: true };
  const ai = state.aiTranslations?.[r.id]?.[lang];
  // A saved translation only counts if it still matches the recipe's current steps.
  if (ai && ai.steps.length === r.steps.length) return { ...ai, byGemini: true, stepsTranslated: true };
  return { name: r.i18n?.[lang]?.name ?? r.name, steps: r.steps, byGemini: false, stepsTranslated: false };
}
