import { RECIPES } from '../data/recipes';
import { AppState, PlannedDish, PlannedMeal, SavedMenu } from '../types';
import { MEAL_LABEL } from './meals';
import { DROP_BELOW, eligibleRecipes, exclusionReasons, isSoup, mealPool, mealsOn, mondayOf } from './planner';

export const MAX_SAVED = 20;
const MAX_NAME = 30;

/** "Menu A", "Menu B"… the first one not used yet. */
export function nextMenuName(menus: SavedMenu[] = []): string {
  const used = new Set(menus.map((m) => m.name.trim().toLowerCase()));
  for (let i = 0; i < 26 * 4; i++) {
    const name = `Menu ${String.fromCharCode(65 + (i % 26))}${i >= 26 ? Math.floor(i / 26) + 1 : ''}`;
    if (!used.has(name.toLowerCase())) return name;
  }
  return `Menu ${menus.length + 1}`;
}

const clean = (name: string) => name.replace(/\s+/g, ' ').trim().slice(0, MAX_NAME);

/** Saves this week's menu under a name. The same name (any capitals) is replaced, so "Menu A" can be updated. */
export function saveMenu(st: AppState, name: string, id: string, now = new Date().toISOString()): AppState {
  const n = clean(name);
  if (!st.plan || !n || !st.plan.dishes.length) return st;
  const menu: SavedMenu = { id, name: n, savedAt: now, dishes: st.plan.dishes.map((d) => ({ recipeId: d.recipeId, day: d.day, ...(d.added ? { added: true } : {}) })),
    ...(st.plan.meals?.length ? { meals: st.plan.meals.map((m) => ({ recipeId: m.recipeId, day: m.day, meal: m.meal })) } : {}) };
  const rest = (st.savedMenus ?? []).filter((m) => m.name.trim().toLowerCase() !== n.toLowerCase());
  return { ...st, savedMenus: [menu, ...rest].slice(0, MAX_SAVED) };
}

export function renameMenu(st: AppState, id: string, name: string): AppState {
  const n = clean(name);
  if (!n) return st;
  const clash = (st.savedMenus ?? []).some((m) => m.id !== id && m.name.trim().toLowerCase() === n.toLowerCase());
  if (clash) return st;
  return { ...st, savedMenus: (st.savedMenus ?? []).map((m) => (m.id === id ? { ...m, name: n } : m)) };
}

export const deleteMenu = (st: AppState, id: string): AppState => ({ ...st, savedMenus: (st.savedMenus ?? []).filter((m) => m.id !== id) });

export interface MenuCheck {
  dishes: PlannedDish[];
  meals: PlannedMeal[];
  skipped: { recipeId: string; name: string; why: string }[];
}

/**
 * What using a saved menu would give this week. Every dish is checked again against the recipe book and the family's rules
 * (allergies, religion, spice, ratings), so a menu saved before a rule changed never brings a banned dish back.
 */
export function checkMenu(st: AppState, menu: SavedMenu): MenuCheck {
  const { ok, excluded, dropped } = eligibleRecipes(st);
  const okIds = new Set(ok.map((r) => r.id));
  const dishes: PlannedDish[] = [];
  const skipped: MenuCheck['skipped'] = [];
  const seen = new Set<string>();
  for (const d of menu.dishes) {
    const r = RECIPES.find((x) => x.id === d.recipeId);
    const name = r?.name ?? 'A dish';
    const key = `${d.recipeId}@${d.day}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (!r) { skipped.push({ recipeId: d.recipeId, name, why: 'it is no longer in the recipe book' }); continue; }
    if (d.day < 0 || d.day >= st.settings.daysPerWeek) { skipped.push({ recipeId: r.id, name, why: `your week now has ${st.settings.daysPerWeek} cooking days` }); continue; }
    if (!okIds.has(r.id)) {
      const why = excluded.find((e) => e.recipe.id === r.id)?.reasons.join('; ')
        ?? (dropped.some((x) => x.id === r.id) ? `the family rated it below ${DROP_BELOW} pots` : "it isn't planned for dinner");
      skipped.push({ recipeId: r.id, name, why });
      continue;
    }
    dishes.push({ recipeId: r.id, day: d.day, isNew: !st.history.includes(r.id), ...(d.added ? { added: true } : {}) });
  }
  dishes.sort((a, b) => a.day - b.day || Number(isSoup(RECIPES.find((x) => x.id === a.recipeId)!)) - Number(isSoup(RECIPES.find((x) => x.id === b.recipeId)!)));
  // breakfasts and lunches: only the kinds that are switched on now, and only dishes that still pass the rules
  const meals: PlannedMeal[] = [];
  const on = new Set(mealsOn(st));
  for (const kind of ['breakfast', 'lunch'] as const) {
    const saved = (menu.meals ?? []).filter((m) => m.meal === kind);
    if (!saved.length) continue;
    if (!on.has(kind)) { skipped.push({ recipeId: kind, name: `${MEAL_LABEL[kind].title}s`, why: `${MEAL_LABEL[kind].title.toLowerCase()} is switched off in the menu settings` }); continue; }
    const pool = new Set(mealPool(st, kind).map((r) => r.id));
    for (const m of saved) {
      const r = RECIPES.find((x) => x.id === m.recipeId);
      const name = r?.name ?? 'A dish';
      if (!r) skipped.push({ recipeId: m.recipeId, name, why: 'it is no longer in the recipe book' });
      else if (m.day < 0 || m.day >= st.settings.daysPerWeek) skipped.push({ recipeId: r.id, name, why: `your week now has ${st.settings.daysPerWeek} cooking days` });
      else if (!pool.has(r.id)) skipped.push({ recipeId: r.id, name, why: exclusionReasons(r, st.members).join('; ') || "it doesn't fit your family's rules or ratings now" });
      else if (!meals.some((x) => x.day === m.day && x.meal === kind)) meals.push({ recipeId: r.id, day: m.day, meal: kind });
    }
  }
  return { dishes, meals, skipped };
}

/** Puts a saved menu in as this week's menu, as a draft: the owner reviews it and confirms before the helper sees anything. The shopping list is worked out again from it. */
export function applySavedMenu(st: AppState, menu: SavedMenu): AppState {
  const { dishes, meals } = checkMenu(st, menu);
  if (!dishes.length) return st;
  return {
    ...st,
    plan: { weekNo: st.plan?.weekNo ?? 1, weekOf: st.plan?.weekOf ?? mondayOf(), dishes, ...(meals.length ? { meals } : {}), status: 'draft', cooked: [] },
    bought: [], shopSwaps: {}, fruitDays: [], lateItems: [], helperNotes: [],
  };
}
