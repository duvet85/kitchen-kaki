import { recipeById } from '../data/recipes';
import { CATALOGUE } from '../data/store';
import { AppState, Recipe, WeekPlan } from '../types';
import { PANTRY } from './grocery';
import { DAY_NAMES, dayAfter, planDayName, planDayOfWeekday, startDateOf, dishKey, eligibleRecipes, familyScore, isCooked, isSoup, isVegDish, spiceRule } from './planner';

/**
 * "Ask Kitchen Kaki": last-minute changes to a confirmed week.
 * Works out what is needed from a short message, then swaps the affected dishes
 * for ones that fit, preferring dishes that use what's already in the kitchen.
 */
export type Need = 'light' | 'quick' | 'vegetarian' | 'mild';
export type Scope = 'today' | 'tomorrow' | 'rest';
/** Things people say that Kaki answers with a pointer, never a change: she won't guess at them. */
export type Topic = 'remove' | 'swap' | 'guests' | 'cheaper' | 'spicier' | 'festival' | 'fasting' | 'thanks';
export interface Ask {
  needs: Need[]; missing: string[]; scope: Scope | null;
  /** a weekday named in the message (Mon = 0): only that day is looked at */
  day?: number | null;
  /** the person wants a dish added: the food words they used, and the filters they asked for */
  add?: { words: string[] };
  topic?: Topic;
}

export const NEED_LABEL: Record<Need, string> = {
  light: 'light, easy-to-digest food',
  quick: 'quick dishes (30 min or less)',
  vegetarian: 'vegetarian dishes',
  mild: 'no chilli',
};

const has = (t: string, re: RegExp) => re.test(t);

/** Catalogue items a few words of text refer to, e.g. "chicken" -> both chicken cuts. */
export function itemsNamed(words: string): string[] {
  const w = words.toLowerCase().replace(/kailan|kai lan/g, 'kai lan').replace(/choy sum|chye sim|choysum/g, 'chye sim').replace(/[^a-z ]/g, ' ').trim();
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

const DAY_WORDS: [RegExp, number][] = [
  [/\bmon(day)?s?\b/, 0], [/\btue(s|sday)?s?\b/, 1], [/\bwed(nesday)?s?\b/, 2], [/\bthu(r|rs|rsday)?s?\b/, 3], [/\bfri(day)?s?\b/, 4],
  [/\bsaturdays?\b|\b(?:on|for|this|next) sat\b/, 5], [/\bsundays?\b|\b(?:on|for|this|next) sun\b/, 6],
];
/** The weekday named in a message (Mon = 0), or null. */
export function dayIn(text: string): number | null {
  const t = text.toLowerCase();
  return DAY_WORDS.find(([re]) => re.test(t))?.[1] ?? null;
}

const FOOD_STOP = new Set(('add added adding include put throw want wanna would like need needs the and for with can could please some any one more another extra additional dish dishes recipe recipes meal food ' +
  'make cook have get got give try new different nice good tasty something anything today tomorrow tonight dinner lunch this next week day days our my your their we you its it ' +
  'mon monday tue tues tuesday wed wednesday thu thur thurs thursday fri friday sat saturday sun sunday on to of in at a an is be too also really maybe instead rest').split(' '));
/** The food words in a message: what the person asked for, e.g. "prawn". */
export function foodWords(text: string): string[] {
  return [...new Set(text.toLowerCase().replace(/[^a-z ]/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !FOOD_STOP.has(w)))];
}

const ADD_RE = /\b(add|adding|include|put in|throw in|one more|another|extra|additional)\b|\bi (?:want|wanna|would like|'d like|feel like|need)\b|\b(?:can|could) (?:we|i) (?:have|get|cook|make|eat)\b|\blet'?s (?:have|cook|make|eat)\b|\b(?:cook|make) (?:us |me )?(?:some |a |an )?\w+ (?:dish|curry|soup)\b/;

/** Rule-based reading of a message. Returns null when nothing in it is recognised. */
export function understand(text: string): Ask | null {
  const t = ` ${text.toLowerCase()} `;
  const day = dayIn(t);
  const topic = topicOf(t);
  const needs = new Set<Need>();
  if (has(t, /sick|ill\b|unwell|fever|flu\b|cold\b|cough|stomach|diarrh|vomit|sore throat|light|bland|porridge|recover|not feeling well|food poison|gastric/)) needs.add('light');
  if (has(t, /quick|\bfast\b|no time|busy|late\b|rush|short on time|in a hurry/)) needs.add('quick');
  if (has(t, /vegetarian|meatless|no meat|veg only|vegan/)) needs.add('vegetarian');
  if (has(t, /(no|less|without|not) (spicy|chilli|chili)|mild|spice[- ]free|not spicy/)) needs.add('mild');

  const missing = new Set<string>();
  const re = /(?:no more|no|out of|ran out of|run out of|running out of|don'?t have|do not have|missing|couldn'?t (?:buy|find|get)|can'?t (?:buy|find|get)|cannot (?:buy|find|get)|sold out of|forgot(?: to buy)?|without)\s+(?:any\s+)?([a-z][a-z ,]{1,50})/g;
  for (const m of t.matchAll(re)) {
    const phrase = m[1].split(/\b(?:but|so|for|at|today|tomorrow|tonight|this|left|in|from|because|on|please)\b/)[0];
    for (const words of phrase.split(/,|\band\b|\bor\b/)) {
      if (/^(meat|time|spicy|chilli|chili)\b/.test(words.trim())) continue;
      for (const k of itemsNamed(words)) missing.add(k);
    }
  }
  const scope: Scope | null = has(t, /tomorrow/) ? 'tomorrow' : has(t, /rest of (the )?week|this week|all week|coming days|next few days/) ? 'rest' : has(t, /today|tonight|dinner|lunch|now/) ? 'today' : null;

  // "I want to add a prawn dish on Thursday": adding, not avoiding. The food words are what they WANT, never "missing".
  // Messages that are about spice, cost, guests, festivals, fasting or thanks get their pointer, unless they plainly say "add".
  if (topic && !needs.size && !missing.size && !['remove', 'swap'].includes(topic) && !has(t, /\b(add|include|one more|another|extra)\b/)) return { needs: [], missing: [], scope, day, topic };
  if (!missing.size && ADD_RE.test(t) && !has(t, /\bno more\b/)) {
    const words = foodWords(text).filter((w) => !/^(quick|fast|light|mild|vegetarian|spicy|chilli|chili)$/.test(w));
    if (words.length || /dish|soup|curry|recipe/.test(t)) return { needs: [...needs], missing: [], scope, day, add: { words } };
  }
  if (!needs.size && !missing.size) return topic ? { needs: [], missing: [], scope, day, topic } : null;
  return { needs: [...needs], missing: [...missing], scope, day };
}

/** Requests Kaki points to the right screen for, rather than guessing a change. */
function topicOf(t: string): Topic | undefined {
  if (has(t, /\b(thanks|thank you|thx|ty|appreciate|great job|well done)\b/)) return 'thanks';
  if (has(t, /\b(chinese new year|cny|lunar new year|deepavali|diwali|hari raya|christmas|festival|reunion|birthday|party)\b/)) return 'festival';
  if (has(t, /\b(fasting|fast on|ramadan|puasa|lent|no meat on)\b/)) return 'fasting';
  if (has(t, /\b(guests?|visitors?|relatives|friends coming|in-laws|extra people|more people|coming over)\b/)) return 'guests';
  if (has(t, /\b(cheaper|budget|save money|spend less|spend too much|spending|too expensive|less expensive|costs? too much|economical)\b/)) return 'cheaper';
  if (has(t, /\b(spicier|more spicy|hotter|more chilli|more chili|add chilli|add chili)\b/)) return 'spicier';
  if (has(t, /\b(remove|delete|cancel|take off|take out|skip|drop|don'?t want)\b/)) return 'remove';
  if (has(t, /\b(swap|change|replace|switch|something else|different dish|another dish instead)\b/)) return 'swap';
  return undefined;
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
  const ti = todayIndex(startDateOf(plan), now);
  const today = ti < planDays[0] || ti > last ? planDays[0] : ti;
  const scope = ask.scope ?? (ask.missing.length ? 'rest' : ask.needs.includes('light') ? 'tomorrow+' : 'today');
  // A weekday in the message means only that day, whatever else it says.
  const days = ask.day != null ? planDays.filter((d) => d === ask.day) : planDays.filter((d) =>
    scope === 'today' ? d === today : scope === 'tomorrow' ? d === today + 1 : scope === 'tomorrow+' ? d === today || d === today + 1 : d >= today);
  if (!days.length) return { changes: [], days, note: ask.day != null ? `There is no dinner on ${planDayName(plan, ask.day)} this week, so there is nothing to change.` : 'Nothing is left on this week\'s menu for that day. Make next week\'s menu on the Menu tab.' };

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

export const dayName = (d: number, plan?: WeekPlan | null) => planDayName(plan, d);
/** Ask Kaki reads weekdays (Thursday = 3); the menu counts days from its first day. Turns the one into the other. */
export const onPlanWeek = <A extends Ask | null>(a: A, plan?: WeekPlan | null): A => (a && a.day != null && plan ? { ...a, day: planDayOfWeekday(plan, a.day) } : a);

/** Dishes to offer when someone asks for one to be added on a day. Never changes anything; the owner taps one to add it. */
export function addSuggestions(state: AppState, ask: Ask) {
  const words = ask.add?.words ?? [];
  const day = ask.day ?? null;
  const { ok, excluded } = eligibleRecipes(state);
  const protein: Record<string, string[]> = { prawn: ['seafood'], shrimp: ['seafood'], seafood: ['seafood'], squid: ['seafood'], crab: ['seafood'], fish: ['fish'], chicken: ['chicken'], pork: ['pork'], beef: ['beef'], egg: ['egg'], eggs: ['egg'], tofu: ['tofu'], veg: ['veg'], vegetable: ['veg'], vegetables: ['veg'], veggie: ['veg'], veggies: ['veg'] };
  const match = (r: Recipe) => {
    let m = 0;
    for (const w of words) {
      const stem = w.replace(/(es|s)$/, '');
      const hit = r.name.toLowerCase().split(/\W+/).some((n) => n.startsWith(stem)) ? 3
        : r.cuisine === w ? 2
        : (protein[w] ?? protein[stem])?.includes(r.protein) ? 2
        : w === 'soup' && isSoup(r) ? 2
        : itemsNamed(w).some((k) => !PANTRY.has(k) && r.ingredients.some((i) => i.item === k)) ? 2 : 0;
      if (!hit) return 0; // every word they used has to fit
      m += hit;
    }
    return m;
  };
  const onDay = new Set(state.plan?.dishes.filter((d) => d.day === day).map((d) => d.recipeId));
  const wantsSoup = words.includes('soup');
  const pool = ok.filter((r) => !onDay.has(r.id) && (words.length ? match(r) > 0 : true) && fits(r, ask.needs) && (wantsSoup || !words.length ? true : !isSoup(r)));
  const ranked = pool.map((r) => {
    const chk = day != null && state.plan ? dayAfter(state, day, r) : null;
    return { r, score: match(r) + familyScore(r, state) * 0.2 - (chk ? chk.blocks.length * 4 + chk.soft.length * 1.5 : 0), notes: chk ? [...chk.blocks, ...chk.soft] : [] };
  }).sort((a, b) => b.score - a.score).slice(0, 3);
  const leftOut = words.length ? excluded.filter((e) => match(e.recipe) > 0 && fits(e.recipe, ask.needs)).slice(0, 3).map((e) => ({ name: e.recipe.name, reasons: e.reasons })) : [];
  return { day, words, picks: ranked, leftOut };
}

/** The wording Kaki uses for requests she points elsewhere. No change is ever made from these. */
export const TOPIC_REPLY: Record<Topic, string> = {
  remove: "To take a dish off, open the Menu tab and tap Remove on it. I won't remove dishes by myself.",
  swap: "To change one dish, open the Menu tab and tap Swap on it. Or tell me what's wrong with it (no prawns, too spicy, need something quick, someone unwell) and I'll suggest swaps.",
  guests: "I can't plan for extra people yet. On the Menu tab, tap +Dish on that day to add another dish. The shopping list will update.",
  cheaper: "I can't re-price the week yet. The Menu tab shows a ballpark cost for each dish and the week, and Swap shows the cost of each choice so you can pick cheaper ones.",
  spicier: "Spice follows what each person said in the quiz. Change it on the Family tab, or tap Swap on a dish to pick a spicier one.",
  festival: "Festival menus aren't built in yet. Tap +Dish on that day on the Menu tab to add the dishes you want.",
  fasting: "I don't plan around fasting yet. Tell me which dishes to change (for example \"no meat\" or \"vegetarian\" for a day) and I'll suggest swaps, or tap Swap on the Menu tab.",
  thanks: "Anytime, kaki! 😊",
};

const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
/** Gemini's reading of a message, checked and mapped onto our own needs, shop items and days. */
export function fromGemini(raw: { needs?: unknown; missing?: unknown; scope?: unknown; intent?: unknown; day?: unknown; want?: unknown }): Ask | null {
  const needs = [...new Set((Array.isArray(raw.needs) ? raw.needs : []).filter((n): n is Need => ['light', 'quick', 'vegetarian', 'mild'].includes(n as string)))];
  const intent = typeof raw.intent === 'string' ? raw.intent : 'adjust';
  const scope = (['today', 'tomorrow', 'rest'] as const).find((x) => x === raw.scope) ?? null;
  const di = DAY_KEYS.indexOf(typeof raw.day === 'string' ? raw.day.toLowerCase().slice(0, 3) : '');
  const day = di >= 0 ? di : null;
  const want = (Array.isArray(raw.want) ? raw.want : []).filter((w): w is string => typeof w === 'string').flatMap((w) => foodWords(w)).slice(0, 5);
  if (intent === 'add') return { needs, missing: [], scope, day, add: { words: want } };
  const topic = (['remove', 'swap', 'guests', 'cheaper', 'spicier', 'festival', 'fasting', 'thanks'] as const).find((x) => x === intent);
  if (topic) return { needs: [], missing: [], scope, day, topic };
  const missing = [...new Set((Array.isArray(raw.missing) ? raw.missing : []).flatMap((w) => (typeof w === 'string' ? itemsNamed(w) : [])))];
  return needs.length || missing.length ? { needs, missing, scope, day } : null;
}

/** A reading in plain words, for showing side by side. */
export function describeAsk(a: Ask | null): string {
  if (!a) return 'not understood';
  const bits: string[] = [];
  if (a.topic) bits.push(`${a.topic} (Kaki only points to the right screen)`);
  if (a.add) bits.push(`add a dish${a.add.words.length ? ` (${a.add.words.join(', ')})` : ''}`);
  if (a.needs.length) bits.push(`needs: ${a.needs.join(', ')}`);
  if (a.missing.length) bits.push(`missing: ${[...new Set(a.missing.map((k) => CATALOGUE[k]?.name.toLowerCase() ?? k))].join(', ')}`);
  if (a.day != null) bits.push(`only ${DAY_NAMES[a.day]}`); else if (a.scope) bits.push(a.scope === 'rest' ? 'rest of the week' : a.scope);
  return bits.join(' · ');
}

/** What Kaki would put on screen for a reading, in a line or two. Nothing is changed: this is only the proposal. */
export function describeKaki(state: AppState, raw: Ask | null): string {
  const a = onPlanWeek(raw, state.plan);
  if (!a) return 'Says she did not catch it and shows the suggestion chips.';
  if (a.topic) return TOPIC_REPLY[a.topic];
  if (!state.plan) return 'Asks for a menu to be made first.';
  if (a.add) {
    if (a.day == null) return 'Asks which day, with a button for each day. Nothing is added until you tap a dish.';
    const r = addSuggestions(state, a);
    return `${r.picks.length ? `Offers ${r.picks.map((p) => p.r.name).join(', ')} on ${planDayName(state.plan, a.day)}; you tap one to add it.` : `No dish to offer on ${planDayName(state.plan, a.day)}.`}${r.leftOut.length ? ` Left out for the family: ${r.leftOut.map((l) => `${l.name} (${l.reasons.join('; ')})`).join(', ')}.` : ''}`;
  }
  const res = replan(state, a);
  if (res.note) return res.note;
  return `Proposes, for ${res.days.map((d) => planDayName(state.plan, d)).join(' and ')}: ${res.changes.map((c) => `${c.fromId === c.toId ? `keep ${recipeById(c.fromId).name} cooked lighter` : `${recipeById(c.fromId).name} → ${c.toId ? recipeById(c.toId).name : 'no swap found'}`}`).join('; ')}. You confirm before anything changes.`;
}
