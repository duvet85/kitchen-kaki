import { AppState, Lang, Recipe, Translation } from '../types';
import { ZH_NAMES } from '../i18n-zh';
import { CATALOGUE } from '../data/store';

/** The recipe's ingredient names in English, in order (what is sent to Gemini to translate). */
export const ingredientNames = (r: Recipe): string[] => (r.ingredients ?? []).map((i) => CATALOGUE[i.item]?.name ?? i.item);

/** One ingredient's name in the helper's language: Gemini's translation when it has one, else English. */
export const ingredientLabel = (r: Recipe, idx: number, lang: Lang, state: AppState): string => {
  const tr = lang === 'en' ? undefined : state.aiTranslations?.[r.id]?.[lang]?.ingredients;
  return (tr && tr.length === r.ingredients.length && tr[idx]) || (CATALOGUE[r.ingredients[idx].item]?.name ?? r.ingredients[idx].item);
};

/** Item key -> name in the helper's language, gathered from every saved Gemini translation (for the shopping list). */
export const itemNames = (lang: Lang, state: AppState, recipes: Recipe[]): Record<string, string> => {
  const out: Record<string, string> = {};
  if (lang === 'en') return out;
  for (const r of recipes) {
    const tr = state.aiTranslations?.[r.id]?.[lang]?.ingredients;
    if (tr && tr.length === r.ingredients.length) r.ingredients.forEach((i, k) => { if (tr[k] && !out[i.item]) out[i.item] = tr[k]; });
  }
  return out;
};

/** True when Gemini's saved translation of this recipe is complete (name, every step and every ingredient). */
export const fullyTranslated = (r: Recipe, lang: Lang, state: AppState): boolean => {
  if (lang === 'en') return true;
  const ai = state.aiTranslations?.[r.id]?.[lang];
  return !!ai && ai.steps.length === r.steps.length && (r.ingredients.length === 0 || ai.ingredients?.length === r.ingredients.length);
};

/**
 * The recipe text the helper sees. Dish names have a built-in translation, but the cooking steps are only
 * translated by Gemini (a fixed word list can't translate every step). Without a Gemini translation the
 * steps stay in English and `stepsTranslated` is false, so the screen can say so.
 */
/** A dish name in the helper's language: hand-written names first, then the recipe's own name. */
export const dishName = (r: Recipe, lang: Lang): string => (lang === 'en' ? r.name : lang === 'zh' ? ZH_NAMES[r.id] ?? r.i18n?.zh?.name ?? r.name : r.i18n?.[lang]?.name ?? r.name);

export function recipeText(r: Recipe, lang: Lang, state: AppState): Translation & { byGemini: boolean; stepsTranslated: boolean } {
  if (lang === 'en') return { name: r.name, steps: r.steps, byGemini: false, stepsTranslated: true };
  const ai = state.aiTranslations?.[r.id]?.[lang];
  // A saved translation only counts if it still matches the recipe's current steps.
  if (ai && ai.steps.length === r.steps.length) return { ...ai, byGemini: true, stepsTranslated: true };
  return { name: dishName(r, lang), steps: r.steps, byGemini: false, stepsTranslated: false };
}
