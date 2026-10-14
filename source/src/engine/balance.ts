import { recipeById } from '../data/recipes';
import { AppState, PlannedDish, Recipe } from '../types';
import { groceryFit, planRecipeIds, shoppingList } from './grocery';
import { balanceScore, isFried } from './health';
import { applyChanges } from './hiccup';
import { DAY_NAMES, dayAfter, dishKey, eligibleRecipes, familyScore, isCooked, isSoup, missingFavourite, spiceRule } from './planner';

/** A way to make the week more balanced. The owner picks one of the options, picks a dish themselves, or leaves it. */
export interface Fix {
  key: string;
  /** what's wrong and what the options do */
  text: string;
  day: number;
  /** the dish the options would replace; none means the options are added to the day */
  replace?: PlannedDish;
  /** best few dishes, with how many points the diet score goes up */
  options: { r: Recipe; gain: number; /** the day's dishes once this is done */ after: string[]; /** things worth knowing about the day afterwards */ notes: string[] }[];
}

const vegDish = (r: Recipe) => r.plate.veg >= 0.6;
const isRedMeat = (r: Recipe) => r.protein === 'pork' || r.protein === 'beef';
const isFish = (r: Recipe) => r.protein === 'fish' || r.protein === 'seafood';
const isPlant = (r: Recipe) => r.protein === 'tofu' || r.ingredients.some((i) => ['lentils', 'chickpeas'].includes(i.item));
const isRich = (r: Recipe) => r.satFat === 'high' || r.sugar === 'high' || isFried(r);

export const scoreOf = (dishes: PlannedDish[]) => balanceScore(dishes.map((d) => ({ recipe: recipeById(d.recipeId), day: d.day })));

export function balanceFixes(state: AppState): Fix[] {
  const plan = state.plan;
  if (!plan || !plan.dishes.length) return [];
  const rule = spiceRule(state);
  const total = (dishes: PlannedDish[]) => scoreOf(dishes)!.total;
  const base = total(plan.dishes);
  const pool = eligibleRecipes(state).ok.filter((r) => !isSoup(r));
  const missingNow = (dishes: PlannedDish[], day: number) => missingFavourite({ ...plan, dishes }, state, day).length;
  const open = (d: PlannedDish) => !isSoup(recipeById(d.recipeId)) && !isCooked(plan, d);

  // Keeps the day's rules: no repeats that day, one spicy dish at most, nobody loses their 4★ dish.
  const fits = (dishes: PlannedDish[], day: number, r: Recipe, except?: PlannedDish) =>
    !dishes.some((d) => d.day === day && d !== except && d.recipeId === r.id)
    && !(rule.isHot(r) && dishes.some((d) => d.day === day && d !== except && rule.isHot(recipeById(d.recipeId))));
  // Judge the whole day: drop options that cost the day its only vegetable dish or add a second spicy dish; prefer ones with
  // no "same main" or "two salty dishes" note, and keep a noted one only when nothing cleaner exists.
  const top = (xs: { r: Recipe; gain: number; sc: number; day: number; replace?: PlannedDish }[]) => {
    const judged = xs.filter((x) => x.gain > 0).flatMap((x) => {
      const c = dayAfter(state, x.day, x.r, x.replace);
      return c.blocks.length ? [] : [{ r: x.r, gain: x.gain, sc: x.sc, after: c.afterNames, notes: c.soft }];
    });
    const clean = judged.filter((x) => !x.notes.length);
    return (clean.length ? clean : judged).sort((a, b) => b.sc - a.sc).slice(0, 3).map(({ r, gain, after, notes }) => ({ r, gain, after, notes }));
  };

  const swapFix = (key: string, targets: PlannedDish[], ok: (r: Recipe) => boolean, text: (from: Recipe, day: string) => string): Fix | null => {
    for (const d of targets) {
      const from = recipeById(d.recipeId);
      const options = top(pool
        .filter((r) => r.id !== from.id && ok(r) && fits(plan.dishes, d.day, r, d))
        .flatMap((r) => {
          const dishes = plan.dishes.map((x) => (x === d ? { ...x, recipeId: r.id } : x));
          if (missingNow(dishes, d.day) > missingNow(plan.dishes, d.day)) return [];
          const gain = total(dishes) - base;
          return [{ r, gain, day: d.day, replace: d, sc: gain * 2 + familyScore(r, state) + (r.protein === from.protein ? 1 : 0) }];
        }));
      if (options.length) return { key, text: text(from, DAY_NAMES[d.day]), day: d.day, replace: d, options };
    }
    return null;
  };

  const fixes: Fix[] = [];
  const sc = scoreOf(plan.dishes)!;
  const recipes = plan.dishes.map((d) => recipeById(d.recipeId));
  const push = (f: Fix | null | undefined) => { if (f) fixes.push(f); };

  // 1. The day with the least veg.
  const low = [...sc.lowVeg].sort((a, b) => a.vegShare - b.vegShare)[0];
  if (low) {
    const day = low.day;
    if (plan.status === 'draft') {
      const options = top(pool.filter((r) => vegDish(r) && fits(plan.dishes, day, r)).map((r) => {
        const gain = total([...plan.dishes, { recipeId: r.id, day, isNew: true }]) - base;
        return { r, gain, day, sc: gain * 2 + familyScore(r, state) };
      }));
      if (options.length) fixes.push({ key: 'veg', text: `${DAY_NAMES[day]} is only ${Math.round(low.vegShare * 100)}% vegetables (aim for about two thirds). Add a vegetable dish?`, day, options });
    } else {
      const meaty = plan.dishes.filter((d) => d.day === day && open(d)).sort((a, b) => recipeById(a.recipeId).plate.veg - recipeById(b.recipeId).plate.veg);
      push(swapFix('veg', meaty, vegDish, (f, dn) => `${dn} is light on vegetables. Swap ${f.name} for a vegetable dish?`));
    }
  }
  // 2. Protein mix.
  const fish = recipes.filter(isFish).length;
  const red = plan.dishes.filter((d) => open(d) && isRedMeat(recipeById(d.recipeId)));
  const meatAndPoultry = plan.dishes.filter((d) => open(d) && ['pork', 'beef', 'chicken'].includes(recipeById(d.recipeId).protein));
  if (fish < 2) push(swapFix('fish', [...red, ...meatAndPoultry], isFish, (f, dn) => `Only ${fish} fish dish(es) this week; HPB suggests at least 2. Swap ${f.name} (${dn}) for fish?`));
  if (red.length > 3) push(swapFix('red', red.slice(3), (r) => !isRedMeat(r), (f, dn) => `Red meat ${red.length} times this week; keep it to about 3. Swap ${f.name} (${dn})?`));
  if (recipes.filter(isPlant).length < 2) push(swapFix('plant', meatAndPoultry, isPlant, (f, dn) => `Not much tofu, lentils or beans this week. Swap ${f.name} (${dn}) for one?`));
  // 3. Salt per day.
  const saltyDay = sc.days.find((x) => x.salty > 1);
  if (saltyDay) {
    const salty = plan.dishes.filter((d) => d.day === saltyDay.day && open(d) && recipeById(d.recipeId).sodium === 'high');
    push(swapFix('salt', salty, (r) => r.sodium !== 'high', (f, dn) => `${dn} has two salty dishes (salt limit is one teaspoon a day). Swap ${f.name}, or ask the helper to halve the sauce?`));
  }
  // 4. Fat and sugar.
  const rich = plan.dishes.filter((d) => open(d) && isRich(recipeById(d.recipeId)));
  if (rich.length > 2) push(swapFix('rich', rich, (r) => !isRich(r), (f, dn) => `${rich.length} rich or fried dishes this week; about 2 is plenty. Swap ${f.name} (${dn}) for a lighter dish?`));
  return fixes;
}

/**
 * Puts a chosen dish on a day, either in place of `replace` or as an extra dish.
 * On a menu already sent, the helper gets a note and anything new goes on the shopping run.
 */
export function placeDish(st: AppState, day: number, recipeId: string, replace: PlannedDish | undefined, newId: () => string): AppState {
  if (!st.plan) return st;
  const isNew = !st.history.includes(recipeId);
  const target = replace && st.plan.dishes.find((x) => x.day === replace.day && x.recipeId === replace.recipeId);
  const sortDishes = (dishes: PlannedDish[]) =>
    dishes.sort((a, b) => a.day - b.day || Number(isSoup(recipeById(a.recipeId))) - Number(isSoup(recipeById(b.recipeId))));
  if (st.plan.status === 'draft') {
    const dishes = target
      ? st.plan.dishes.map((x) => (x === target ? { ...x, recipeId, isNew } : x))
      : [...st.plan.dishes, { recipeId, day, isNew, added: true }];
    return { ...st, plan: { ...st.plan, dishes: sortDishes(dishes) } };
  }
  // Menu already sent: the helper gets a note, and anything not already on the shopping list is flagged as new.
  const toBuy = groceryFit(st, recipeById(recipeId)).toBuy;
  if (target) return applyChanges(st, [{ day: target.day, fromId: target.recipeId, toId: recipeId, why: '', uses: [], toBuy }], newId);
  return {
    ...st,
    plan: { ...st.plan, dishes: sortDishes([...st.plan.dishes, { recipeId, day, isNew, added: true }]) },
    lateItems: [...new Set([...(st.lateItems ?? []), ...toBuy])],
    helperNotes: [{ id: newId(), at: new Date().toISOString(), changes: [{ day, from: recipeId, to: recipeId, kind: 'add' as const }] }, ...(st.helperNotes ?? [])].slice(0, 5),
  };
}

/** Takes a dish off a day. On a menu already sent the helper is told it is cancelled. */
export function removeDish(st: AppState, target: PlannedDish, newId: () => string): AppState {
  if (!st.plan) return st;
  const dishes = st.plan.dishes.filter((d) => d !== target);
  if (st.plan.status === 'draft') return { ...st, plan: { ...st.plan, dishes } };
  const key = dishKey(target);
  const stillNeeded = new Set(shoppingList(planRecipeIds({ dishes, meals: st.plan.meals })).map((l) => l.item));
  const { [key]: _gone, ...cooking } = st.cooking;
  return {
    ...st,
    plan: { ...st.plan, dishes },
    cooking,
    timers: st.timers.filter((x) => x.recipeId !== key),
    lateItems: (st.lateItems ?? []).filter((k) => stillNeeded.has(k)),
    helperNotes: [{ id: newId(), at: new Date().toISOString(), changes: [{ day: target.day, from: target.recipeId, to: target.recipeId, kind: 'remove' as const }] }, ...(st.helperNotes ?? [])].slice(0, 5),
  };
}
