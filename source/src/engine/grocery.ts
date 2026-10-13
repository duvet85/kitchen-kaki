import { recipeById } from '../data/recipes';
import { CATALOGUE, StoreItem } from '../data/store';
import { AppState, Recipe } from '../types';

/** Bottles, jars and dry goods that last for weeks; only bought when the kitchen runs out. */
export const PANTRY = new Set([
  'rice', 'soy-sauce', 'dark-soy', 'oyster-sauce', 'veg-oyster-sauce', 'sesame-oil', 'curry-powder',
  'fish-curry-powder', 'garam-masala', 'turmeric', 'star-anise', 'honey', 'tamarind', 'belacan',
  'dried-shrimp', 'dried-chilli', 'cornflour', 'ketchup', 'miso', 'lentils', 'kerisik', 'tomato-puree',
  'black-pepper', 'mirin', 'taucheo', 'red-dates', 'peanuts', 'gochujang', 'fish-sauce',
]);

export interface ShoppingLine {
  item: string;
  info: StoreItem;
  pantry: boolean;
  uses: { dish: string; qty: string }[];
}

export function shoppingList(recipeIds: string[]): ShoppingLine[] {
  const lines = new Map<string, ShoppingLine>();
  for (const id of recipeIds) {
    const r = recipeById(id);
    for (const ing of r.ingredients) {
      const line = lines.get(ing.item) ?? { item: ing.item, info: CATALOGUE[ing.item], pantry: PANTRY.has(ing.item), uses: [] };
      line.uses.push({ dish: r.name, qty: ing.qty });
      lines.set(ing.item, line);
    }
  }
  return [...lines.values()];
}

/**
 * Rough cost of one dish: fresh items only, with an item shared by several
 * dishes this week (garlic, onions, a pack of thighs) split between them.
 */
export function dishCost(r: Recipe, weekIds: string[] = [r.id]): number {
  let total = 0;
  for (const ing of r.ingredients) {
    if (PANTRY.has(ing.item)) continue;
    const sharedBy = weekIds.filter((id) => recipeById(id).ingredients.some((i) => i.item === ing.item)).length || 1;
    total += CATALOGUE[ing.item].price / sharedBy;
  }
  return total;
}

export function weekCost(recipeIds: string[]) {
  const lines = shoppingList(recipeIds);
  const fresh = lines.filter((l) => !l.pantry).reduce((a, l) => a + l.info.price, 0);
  const pantry = lines.filter((l) => l.pantry).reduce((a, l) => a + l.info.price, 0);
  return { fresh, pantry };
}

export const money = (n: number) => `$${n.toFixed(2)}`;

/** Prices are sample prices and shift all the time, so show a ballpark, never cents. */
export const roughMoney = (n: number) => `~$${n < 20 ? Math.max(1, Math.round(n)) : Math.round(n / 2) * 2}`;
/** A range around the estimate, in round steps: "$85 to $100". */
export function ballpark(n: number) {
  const step = n < 20 ? 2 : n < 100 ? 5 : 10;
  const lo = Math.max(0, Math.floor((n * 0.9) / step) * step);
  const hi = Math.ceil((n * 1.15) / step) * step;
  return lo === hi ? `~$${hi}` : `$${lo} to $${hi}`;
}

/** Ticked-off count for the week's fresh items and extras. Items skipped at the shop no longer count. */
export function shoppingProgress(state: AppState) {
  const fresh = state.plan ? shoppingList(state.plan.dishes.map((d) => d.recipeId)).filter((l) => !l.pantry) : [];
  const swaps = state.shopSwaps ?? {};
  const open = fresh.filter((l) => !(swaps[l.item] && swaps[l.item].to === null));
  const extras = state.extras ?? [];
  return {
    got: open.filter((l) => state.bought.includes(l.item)).length + extras.filter((e) => e.done).length,
    total: open.length + extras.length,
  };
}

const isBought = (st: AppState, item: string) => st.bought.includes(item) || !!st.shopSwaps?.[item];

/** True once the helper has done the shopping run: every fresh item ticked off or skipped. */
export function shoppingDone(st: AppState, ignore: string[] = []) {
  if (!st.plan) return false;
  const fresh = shoppingList(st.plan.dishes.map((d) => d.recipeId)).filter((l) => !l.pantry && !ignore.includes(l.item));
  return fresh.length > 0 && fresh.every((l) => isBought(st, l.item));
}

/**
 * How a dish fits the groceries of a menu that was already sent:
 * have = on the list and already bought, coming = on the list but not bought yet,
 * toBuy = not on the list (or skipped at the shop), so someone must buy it.
 */
export function groceryFit(st: AppState, r: Recipe) {
  const onList = new Set(st.plan ? shoppingList(st.plan.dishes.map((d) => d.recipeId)).map((l) => l.item) : []);
  const have: string[] = [], coming: string[] = [], toBuy: string[] = [];
  for (const ing of r.ingredients) {
    if (PANTRY.has(ing.item)) continue;
    if (st.shopSwaps?.[ing.item]?.to === null) toBuy.push(ing.item);
    else if (!onList.has(ing.item)) toBuy.push(ing.item);
    else (isBought(st, ing.item) ? have : coming).push(ing.item);
  }
  return { have, coming, toBuy, extraTrip: toBuy.length > 0 && shoppingDone(st, st.lateItems) };
}
