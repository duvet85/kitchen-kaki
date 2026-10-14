import { AppState, PlannedMeal, PlannedMealKind } from '../types';
import { PANTRY, groceryFit, planRecipeIds, shoppingList } from './grocery';
import { MEAL_KINDS, buildMeals, mealPool } from './planner';

export const MEAL_LABEL: Record<PlannedMealKind, { title: string; emoji: string }> = {
  breakfast: { title: 'Breakfast', emoji: '🍳' },
  lunch: { title: 'Lunch', emoji: '🍱' },
};

export const mealKey = (m: PlannedMeal) => `${m.recipeId}@${m.day}`;
export const mealOn = (plan: { meals?: PlannedMeal[] } | null | undefined, day: number, kind: PlannedMealKind) => plan?.meals?.find((m) => m.day === day && m.meal === kind);

const groceryFitFor = (st: AppState, recipeId: string): string[] => {
  const onList = new Set(st.plan ? shoppingList(planRecipeIds(st.plan)).map((l) => l.item) : []);
  const r = shoppingList([recipeId]).filter((l) => !l.pantry).map((l) => l.item);
  return r.filter((item) => !onList.has(item) || st.shopSwaps?.[item]?.to === null);
};

/** Puts a breakfast or lunch on a day (replacing the one that was there). On a menu already sent, anything new to buy is flagged for the helper. */
export function placeMeal(st: AppState, day: number, kind: PlannedMealKind, recipeId: string, newId: () => string): AppState {
  if (!st.plan) return st;
  const rest = (st.plan.meals ?? []).filter((m) => !(m.day === day && m.meal === kind));
  const meals = [...rest, { recipeId, day, meal: kind }].sort((a, b) => a.day - b.day);
  if (st.plan.status === 'draft') return { ...st, plan: { ...st.plan, meals } };
  const toBuy = groceryFitFor(st, recipeId).filter((i) => !PANTRY.has(i));
  return {
    ...st,
    plan: { ...st.plan, meals },
    lateItems: [...new Set([...(st.lateItems ?? []), ...toBuy])],
    helperNotes: [{ id: newId(), at: new Date().toISOString(), changes: [{ day, from: recipeId, to: recipeId, kind: 'add' as const }] }, ...(st.helperNotes ?? [])].slice(0, 5),
  };
}

/** Takes a breakfast or lunch off a day. */
export function removeMeal(st: AppState, day: number, kind: PlannedMealKind, newId: () => string): AppState {
  const was = mealOn(st.plan, day, kind);
  if (!st.plan || !was) return st;
  const meals = (st.plan.meals ?? []).filter((m) => m !== was);
  if (st.plan.status === 'draft') return { ...st, plan: { ...st.plan, meals } };
  const key = mealKey(was);
  const stillNeeded = new Set(shoppingList(planRecipeIds({ dishes: st.plan.dishes, meals })).map((l) => l.item));
  const { [key]: _gone, ...cooking } = st.cooking;
  return {
    ...st,
    plan: { ...st.plan, meals },
    cooking,
    timers: st.timers.filter((x) => x.recipeId !== key),
    lateItems: (st.lateItems ?? []).filter((k) => stillNeeded.has(k)),
    helperNotes: [{ id: newId(), at: new Date().toISOString(), changes: [{ day, from: was.recipeId, to: was.recipeId, kind: 'remove' as const }] }, ...(st.helperNotes ?? [])].slice(0, 5),
  };
}

/**
 * Switches breakfast or lunch on or off for the menu. Switching on fills every day of the current menu; switching off clears the days
 * that are not cooked yet. On a menu already sent, the new groceries are flagged as new for the helper.
 */
export function setMealPlanned(st: AppState, kind: PlannedMealKind, on: boolean, newId: () => string): AppState {
  const settings = { ...st.settings, meals: { ...(st.settings.meals ?? {}), [kind]: on } };
  let next: AppState = { ...st, settings };
  if (!st.plan) return next;
  if (on) {
    const have = new Set((st.plan.meals ?? []).filter((m) => m.meal === kind).map((m) => m.day));
    const fill = buildMeals(next, st.plan.weekOf, [kind]).filter((m) => !have.has(m.day));
    if (!fill.length) return next;
    const meals = [...(st.plan.meals ?? []), ...fill].sort((a, b) => a.day - b.day);
    if (st.plan.status === 'draft') return { ...next, plan: { ...st.plan, meals } };
    const toBuy = [...new Set(fill.flatMap((m) => groceryFitFor(st, m.recipeId)))];
    return { ...next, plan: { ...st.plan, meals }, lateItems: [...new Set([...(st.lateItems ?? []), ...toBuy])] };
  }
  const cooked = (m: PlannedMeal) => st.plan!.cooked.includes(mealKey(m));
  const meals = (st.plan.meals ?? []).filter((m) => m.meal !== kind || cooked(m));
  next = { ...next, plan: { ...st.plan, meals } };
  if (st.plan.status !== 'draft') {
    const stillNeeded = new Set(shoppingList(planRecipeIds(next.plan!)).map((l) => l.item));
    next = { ...next, lateItems: (st.lateItems ?? []).filter((k) => stillNeeded.has(k)) };
  }
  return next;
}

/** The recipes the owner can pick from for a breakfast or lunch on a day (the same rules as the planner), best liked first. */
export const mealChoices = (st: AppState, kind: PlannedMealKind) => mealPool(st, kind);

export { MEAL_KINDS };
