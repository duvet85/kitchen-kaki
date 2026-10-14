import { AppState, Difficulty, Recipe } from '../types';
import { methodOf } from '../data/methods';
import { RECIPES } from '../data/recipes';

/**
 * Learn While You Cook. Everything here reads what the app already records (confidence, tries) and
 * never scores her: confidence is how she feels, not proof she can do it.
 */
export const baseId = (key: string) => key.split('@')[0];

/** After cooking: remember she cooked it, what she found hard (if she said), and her own confidence (if she gave it). */
export function recordTry(st: AppState, recipeId: string, result?: { conf?: number; hard: Difficulty[] }): AppState {
  const id = baseId(recipeId);
  const old = st.learning?.tries?.[id];
  const tries = { n: (old?.n ?? 0) + 1, hard: result ? result.hard : old?.hard ?? [], last: new Date().toISOString() };
  let next: AppState = { ...st, learning: { ...st.learning, tries: { ...st.learning?.tries, [id]: tries } } };
  if (result?.conf) next = { ...next, confidence: { ...(next.confidence ?? {}), [id]: result.conf } };
  return next;
}

/**
 * A gentle nudge for the weekly menu. Dishes cooked with a method she feels sure about get a little
 * extra; a method she has not tried yet gets a little less, so new techniques come in gradually.
 * It does nothing until she has cooked something with the app.
 */
export function learnBias(r: Recipe, st: AppState): number {
  const tries = st.learning?.tries;
  if (!tries || !Object.keys(tries).length) return 0;
  const known = new Set<string>();
  const tried = new Set<string>();
  for (const id of Object.keys(tries)) {
    const rec = RECIPES.find((x) => x.id === id);
    if (!rec) continue;
    tried.add(methodOf(rec));
    if ((st.confidence?.[id] ?? 0) >= 3) known.add(methodOf(rec));
  }
  const m = methodOf(r);
  if (known.has(m)) return 0.6;
  if (!tried.has(m)) return -0.8;
  return 0;
}
