import { recipeById } from '../data/recipes';
import { CATALOGUE } from '../data/store';
import { AppState, Recipe } from '../types';
import { PANTRY } from './grocery';
import { DAY_NAMES, dishKey, eligibleRecipes, familyScore, isCooked, isSoup, isVegDish, spiceRule } from './planner';

/**
 * "Ask Kitchen Kaki": last-minute changes to a confirmed week.
 * Works out what is needed from a short message, then swaps the affected dishes
 * for ones that fit, preferring dishes that use what's already in the kitchen.
 */
export type Need = 'light' | 'quick' | 'vegetarian' | 'mild';
export type Scope = 'today' | 'tomorrow' | 'rest';
export interface Ask { needs: Need[]; missing: string[]; scope: Scope | null }

export const NEED_LABEL: Record<Need, string> = {
  light: 'light, easy-to-digest food',
  quick: 'quick dishes (30 min or less)',
  vegetarian: 'vegetarian dishes',
  mild: 'no chilli',
};

const has = (t: string, re: RegExp) => re.test(t);

/** Catalogue items a few words of text refer to, e.g. "chicken" -> both chicken cuts. */
export function itemsNamed(words: string): string[] {
  const w = words.toLowerCase().replace(/[^a-z ]/g, ' ').trim();
  if (!w) return [];
  const tokens = w.split(/\s+/).filter((x) => x.length > 2 && !['the', 'any', 'some', 'fresh', 'for', 'and', 'today', 'tomorrow', 'tonight', 'left'].includes(x));
  if (!tokens.length) return [];
  return Object.entries(CATALOGUE)
    .filter(([key, it]) => tokens.some((tok) => {
      const stem = tok.replace(/(es|s)$/, '');
      return key.split('-').some((k) => k.startsWith(stem)) || it.name.toLowerCase().split(/\W+/).some((n) => n.startsWith(stem));
    }))
    .map(([key]) => key);
}

/** Rule-based reading of a message. Returns null when nothing in it is recognised. */
export function understand(text: string): Ask | null {
  const t = ` ${text.toLowerCase()} `;
  const needs = new Set<Need>();
  if (has(t, /sick|ill\b|unwell|fever|flu\b|cold\b|cough|stomach|diarrh|vomit|sore throat|light|bland|porridge|recover|not feeling well|food poison|gastric/)) needs.add('light');
  if (has(t, /quick|fast|no time|busy|late\b|rush|short on time|in a hurry/)) needs.add('quick');
  if (has(t, /vegetarian|meatless|no meat|veg only|vegan/)) needs.add('vegetarian');
  if (has(t, /(no|less|without|not) (spicy|chilli|chili)|mild|spice[- ]free|not spicy/)) needs.add('mild');

  const missing = new Set<string>();
  const re = /(?:no more|no|out of|ran out of|run out of|running out of|don'?t have|do not have|missing|couldn'?t (?:buy|find|get)|can'?t (?:buy|find|get)|cannot (?:buy|find|get)|sold out of|forgot(?: to buy)?|without)\s+(?:any\s+)?([a-z][a-z ,]{1,50})/g;
  for (const m of t.matchAll(re)) {
    const phrase = m[1].split(/\b(?:but|so|for|at|today|tomorrow|tonight|this|left|in|from|because)\b/)[0];
    for (const words of phrase.split(/,|\band\b|\bor\b/)) {
      if (/^(meat|time|spicy|chilli|chili)\b/.test(words.trim())) continue;
      for (const k of itemsNamed(words)) missing.add(k);
    }
  }
  const scope: Scope | null = has(t, /tomorrow/) ? 'tomorrow' : has(t, /rest of (the )?week|this week|all week|coming days|next few days/) ? 'rest' : has(t, /today|tonight|dinner|lunch|now/) ? 'today' : null;
  if (!needs.size && !missing.size) return null;
  return { needs: [...needs], missing: [...missing], scope };
}

export const isLight = (r: Recipe) => r.spice === 0 && r.satFat === 'low' && r.sodium !== 'high' && !/fried|goreng/i.test(r.name);
const fits = (r: Recipe, needs: Need[]) => needs.every((n) =>
  n === 'light' ? isLight(r) : n === 'quick' ? r.minutes <= 30 : n === 'vegetarian' ? r.vegetarian : r.spice === 0);

/** Ways to cook a planned dish lighter, so the groceries already bought still get used. */
export type Adapt = 'noChilli' | 'steam' | 'lessSalt' | 'lessOil';

export interface Change {
  day: number;
  fromId: string;
  /** the new dish; the same as fromId when the planned dish is just cooked lighter */
  toId: string | null;
  why: string;
  /** fresh items already in the kitchen that the new dish uses */
  uses: string[];
  /** catalogue keys still to buy for the new dish */
  toBuy: string[];
  /** kitchen items standing in for what the recipe lists (e.g. drumsticks for thighs) */
  subs?: { need: string; use: string }[];
  /** set when the planned dish stays, cooked differently */
  adapt?: Adapt[];
}

/** Items that can stand in for each other in a recipe. */
const SWAPPABLE = [
  ['chicken-whole', 'chicken-thigh', 'chicken-drumstick'],
  ['fish-seabass', 'fish-snapper', 'fish-batang', 'salmon'],
  ['pork-mince', 'pork-shoulder'],
  ['xiao-bai-cai', 'chye-sim', 'kai-lan', 'kangkong', 'spinach', 'watercress'],
  ['silken-tofu', 'egg-tofu'],
];

/** A planned dish that can simply be cooked lighter, or null if it can't be made to fit. */
export function adaptation(r: Recipe, needs: Need[]): Adapt[] | null {
  if (needs.includes('vegetarian') && !r.vegetarian) return null;
  if (needs.includes('quick') && r.minutes > 30) return null;
  const how: Adapt[] = [];
  if ((needs.includes('light') || needs.includes('mild')) && r.spice > 0) how.push('noChilli');
  if (needs.includes('light')) {
    if (r.satFat === 'high' || r.flavours.includes('spicy') && r.spice >= 2) return null; // rich or chilli-based: not fixable
    if (/fried|goreng/i.test(r.name)) how.push('steam');
    if (r.sodium === 'high') how.push('lessSalt');
    if (r.satFat === 'med') how.push('lessOil');
  }
  return how.length ? how : null;
}

export const ADAPT_LABEL: Record<Adapt, string> = {
  noChilli: 'leave out the chilli',
  steam: 'steam or boil instead of frying',
  lessSalt: 'use half the sauce and salt',
  lessOil: 'use less oil and take off the skin and fat',
};

/** Monday = 0 relative to the plan's week; clamped to the plan. */
export function todayIndex(weekOf: string, now = new Date()) {
  const start = new Date(`${weekOf}T00:00:00`);
  return Math.floor((now.getTime() - start.getTime()) / 86400000);
}

export function replan(state: AppState, ask: Ask, now = new Date()): { changes: Change[]; days: number[]; note?: string } {
  const plan = state.plan;
  if (!plan) return { changes: [], days: [], note: 'There is no menu yet. Make and confirm one on the Menu tab first.' };
  const planDays = [...new Set(plan.dishes.map((d) => d.day))].sort((a, b) => a - b);
  const last = planDays[planDays.length - 1];
  const ti = todayIndex(plan.weekOf, now);
  const today = ti < planDays[0] || ti > last ? planDays[0] : ti;
  const scope = ask.scope ?? (ask.missing.length ? 'rest' : ask.needs.includes('light') ? 'tomorrow+' : 'today');
  const days = planDays.filter((d) =>
    scope === 'today' ? d === today : scope === 'tomorrow' ? d === today + 1 : scope === 'tomorrow+' ? d === today || d === today + 1 : d >= today);
  if (!days.length) return { changes: [], days, note: 'Nothing is left on this week\'s menu for that day. Make next week\'s menu on the Menu tab.' };

  const uncooked = plan.dishes.filter((d) => !isCooked(plan, d));
  const affected = uncooked.filter((d) => {
    if (!days.includes(d.day)) return false;
    const r = recipeById(d.recipeId);
    return !fits(r, ask.needs) || r.ingredients.some((i) => ask.missing.includes(i.item));
  });
  if (!affected.length) {
    return { changes: [], days, note: 'Good news: the dishes planned for then already fit, so no need to change anything. Steady!' };
  }

  // What's in the kitchen: bought items (or the whole list if shopping hasn't started), plus pantry, minus what's missing.
  const weekItems = new Set(plan.dishes.flatMap((d) => recipeById(d.recipeId).ingredients.map((i) => i.item)));
  const inKitchen = new Set([...(state.bought.length ? state.bought : [...weekItems])].filter((k) => !ask.missing.includes(k) && state.shopSwaps?.[k]?.to !== null));
  // Fresh items still needed by dishes we keep are spoken for.
  const keep = uncooked.filter((d) => !affected.includes(d));
  // (Only meat and fish: a bit of garlic or a few vegetables can be shared between dishes.)
  const mainItem = (k: string) => CATALOGUE[k]?.aisle === 'Meat & Seafood';
  // Meat and fish come in one dish's portion each: what was bought for a dish being changed is free to reuse.
  const portions = new Map<string, number>();
  const count = (ds: typeof plan.dishes, by: number) => ds.forEach((d) => recipeById(d.recipeId).ingredients
    .filter((i) => mainItem(i.item)).forEach((i) => portions.set(i.item, (portions.get(i.item) ?? 0) + by)));
  count(uncooked, 1);
  count(keep, -1);
  const spare = (k: string) => (portions.get(k) ?? 1) > 0;

  const inPlan = new Set(plan.dishes.map((d) => d.recipeId));
  const pool = eligibleRecipes(state, ask.needs.includes('light')).ok.filter((r) => !inPlan.has(r.id) && fits(r, ask.needs) && !r.ingredients.some((i) => ask.missing.includes(i.item)));
  const taken = new Set<string>();
  const changes: Change[] = [];
  const rule = spiceRule(state);
  // Hot dishes per day once the swaps so far are made (at most one a day when someone can't take chilli).
  const hotOn = (day: number, except: typeof affected[number]) =>
    plan.dishes.filter((x) => x.day === day && x !== except).map((x) => changes.find((c) => c.day === x.day && c.fromId === x.recipeId)?.toId ?? x.recipeId)
      .filter((id) => rule.isHot(recipeById(id))).length;

  /** The kitchen item that covers `k`: itself, or one that can stand in for it (meat and fish only once). */
  const cover = (k: string, already: string[]) => {
    const free = (x: string) => inKitchen.has(x) && !already.includes(x) && (!mainItem(x) || spare(x));
    if (free(k)) return k;
    return SWAPPABLE.find((g) => g.includes(k))?.find((x) => x !== k && free(x)) ?? null;
  };

  for (const d of affected) {
    const from = recipeById(d.recipeId);
    const dayHasHot = hotOn(d.day, d) > 0;
    const ranked = pool
      .filter((r) => !(taken.has(r.id) && !r.sickDay) && !(r.sickDay && changes.some((c) => c.day === d.day && c.toId && recipeById(c.toId).sickDay)) && isSoup(r) === isSoup(from) && !(dayHasHot && rule.isHot(r)))
      .map((r) => {
        const fresh = r.ingredients.filter((i) => !PANTRY.has(i.item)).map((i) => i.item);
        const uses: string[] = [];
        const toBuy: string[] = [];
        const subs: { need: string; use: string }[] = [];
        for (const k of fresh) {
          const c = cover(k, uses);
          if (!c) toBuy.push(k);
          else {
            uses.push(c);
            if (c !== k) subs.push({ need: k, use: c });
          }
        }
        // Keep the meal balanced: swap a main for a main and a vegetable dish for a vegetable dish.
        let similar = r.protein === from.protein ? 5 : r.vegetarian === from.vegetarian ? 4 : 0;
        // soft rule: keep a vegetable dish on the day
        const others = plan.dishes.filter((x) => x.day === d.day && x !== d).map((x) => recipeById(x.recipeId));
        if (!others.some(isVegDish)) similar += isVegDish(r) ? 3 : isVegDish(from) ? -3 : 0;
        // Nothing to buy beats everything else: the groceries are already in the kitchen.
        const score = (toBuy.length ? 0 : 50) - toBuy.length * 4 + (fresh.length ? uses.length / fresh.length : 1) * 10
          - subs.length * 0.5 + similar + familyScore(r, state) + (r.sickDay ? (taken.has(r.id) ? -2 : 3) : 0); // one porridge a day is enough for whoever is unwell
        return { r, uses, toBuy, subs, score };
      })
      .sort((a, b) => b.score - a.score);
    let best = ranked[0];
    const reasons = [
      ...ask.needs.filter((n) => !fits(from, [n])).map((n) => (n === 'light' ? 'is too heavy or spicy for someone unwell' : n === 'quick' ? `takes ${from.minutes} min` : n === 'vegetarian' ? 'has meat or fish' : 'has chilli')),
      ...from.ingredients.filter((i) => ask.missing.includes(i.item)).map((i) => `needs ${CATALOGUE[i.item].name.toLowerCase()}`),
    ];
    // No swap from what's in the kitchen? Cooking the planned dish lighter uses what was bought.
    const adapt = !ask.missing.length || !from.ingredients.some((i) => ask.missing.includes(i.item)) ? adaptation(from, ask.needs) : null;
    // Order: one porridge for whoever is unwell, then the planned dish cooked lighter (keeps the family's meal),
    // then another dish from the kitchen, and only then a dish that needs buying.
    const porridge = best && best.r.sickDay && !best.toBuy.length;
    if (adapt && !porridge) {
      changes.push({ day: d.day, fromId: from.id, toId: from.id, why: reasons.join(', '), uses: [], toBuy: [], adapt });
      continue;
    }
    if (!best) {
      changes.push({ day: d.day, fromId: from.id, toId: null, why: reasons.join(', '), uses: [], toBuy: [] });
      continue;
    }
    taken.add(best.r.id);
    best.uses.filter(mainItem).forEach((k) => portions.set(k, (portions.get(k) ?? 1) - 1));
    changes.push({ day: d.day, fromId: from.id, toId: best.r.id, why: reasons.join(', '), uses: best.uses, toBuy: best.toBuy, subs: best.subs });
  }
  return { changes, days };
}

/** Puts the swaps into the confirmed menu, adds anything to buy, and leaves a note for the helper. */
export function applyChanges(st: AppState, changes: Change[], newId: () => string): AppState {
  if (!st.plan) return st;
  const real = changes.filter((c) => c.toId);
  const swapped = real.filter((c) => c.toId !== c.fromId);
  const dishes = st.plan.dishes.map((d) => {
    const c = real.find((x) => x.day === d.day && x.fromId === d.recipeId);
    return c ? { ...d, recipeId: c.toId!, isNew: !st.history.includes(c.toId!) } : d;
  });
  const late = [...new Set([...(st.lateItems ?? []), ...swapped.flatMap((c) => c.toBuy)])];
  const cooking = { ...st.cooking };
  swapped.forEach((c) => delete cooking[dishKey({ recipeId: c.fromId, day: c.day, isNew: false })]);
  return {
    ...st,
    plan: { ...st.plan, dishes },
    lateItems: late,
    cooking,
    timers: st.timers.filter((x) => !swapped.some((c) => x.recipeId === dishKey({ recipeId: c.fromId, day: c.day, isNew: false }))),
    helperNotes: [{
      id: newId(),
      at: new Date().toISOString(),
      changes: real.map((c) => ({ day: c.day, from: c.fromId, to: c.toId!, ...(c.adapt ? { how: c.adapt } : {}), ...(c.subs?.length ? { subs: c.subs } : {}) })),
    }, ...(st.helperNotes ?? [])].slice(0, 5),
  };
}

export const dayName = (d: number) => DAY_NAMES[d] ?? `Day ${d + 1}`;

/** Gemini's reading of a message, checked and mapped onto our own needs and shop items. */
export function fromGemini(raw: { needs?: unknown; missing?: unknown; scope?: unknown }): Ask | null {
  const needs = (Array.isArray(raw.needs) ? raw.needs : []).filter((n): n is Need => ['light', 'quick', 'vegetarian', 'mild'].includes(n as string));
  const missing = [...new Set((Array.isArray(raw.missing) ? raw.missing : []).flatMap((w) => (typeof w === 'string' ? itemsNamed(w) : [])))];
  const scope = (['today', 'tomorrow', 'rest'] as const).find((x) => x === raw.scope) ?? null;
  return needs.length || missing.length ? { needs: [...new Set(needs)], missing, scope } : null;
}
