import { mealFor } from '../data/categories';
import { RECIPES, recipeById } from '../data/recipes';
import { AppState, Member, PlannedDish, Recipe, WeekPlan } from '../types';
import { dishCost } from './grocery';
import { healthFlags } from './health';

/** Family ratings below this are dropped from future menus. */
export const DROP_BELOW = 2;
/** Ratings at or above this put a dish in the family's favourites. */
export const FAVOURITE_FROM = 4;

export interface Exclusion {
  recipe: Recipe;
  reasons: string[];
}

/** Hard rules: allergies and religious restrictions apply to the whole household meal. */
export function exclusionReasons(r: Recipe, members: Member[]): string[] {
  const reasons: string[] = [];
  for (const m of members) {
    const hit = r.allergens.filter((a) => m.allergies.includes(a));
    if (hit.length) reasons.push(`${m.name}: ${hit.join(', ')} allergy`);
    if (r.pork && (m.religion === 'halal' || m.religion === 'no-pork')) reasons.push(`${m.name}: no pork`);
    if (r.beef && m.religion === 'no-beef') reasons.push(`${m.name}: no beef`);
  }
  return reasons;
}

export function eligibleRecipes(state: AppState, withSickDay = false) {
  const ok: Recipe[] = [];
  const excluded: Exclusion[] = [];
  const dropped: Recipe[] = [];
  for (const r of RECIPES) {
    if (r.sickDay && !withSickDay) continue; // only Ask Kaki offers these
    if (mealFor(r, state)) continue; // breakfast, drinks and desserts are never planned as dinner
    const reasons = exclusionReasons(r, state.members);
    if (reasons.length) excluded.push({ recipe: r, reasons });
    else if ((state.ratings[r.id] ?? 5) < DROP_BELOW) dropped.push(r);
    else ok.push(r);
  }
  return { ok, excluded, dropped };
}

/** How much one member is likely to enjoy a dish, from their quiz. */
export function memberScore(r: Recipe, m: Member): number {
  let s = 0;
  const t = m.taste;
  if (t) {
    if (t.cuisines.includes(r.cuisine)) s += 2;
    if (t.proteins.includes(r.protein)) s += 2;
    s += r.flavours.filter((f) => t.flavours.includes(f)).length;
    const over = r.spice - t.spice;
    if (over > 0) s -= 1.5 * over;
  }
  if (m.vegetarian && !r.vegetarian) s -= 1;
  s -= healthFlags(r, m).length;
  return s;
}

/** Stars a member would likely give a dish: their quiz match, nudged by the family's rating. Null without a quiz. */
export function predictedStars(r: Recipe, m: Member, state: AppState): number | null {
  if (!m.taste) return null;
  let stars = Math.min(5, Math.max(1, 2 + memberScore(r, m) * 0.6));
  const rating = state.ratings[r.id];
  if (rating) stars = (stars + rating) / 2;
  return Math.round(stars);
}

export const LOVED = 4;
/** Quizzed members who'd likely give this dish 4★ or more. */
export const lovedBy = (r: Recipe, state: AppState) =>
  state.members.filter((m) => (predictedStars(r, m, state) ?? 0) >= LOVED);
/** Quizzed members with nothing they'd rate 4★+ on a day of the plan. */
export function missingFavourite(plan: WeekPlan, state: AppState, day: number) {
  const recs = plan.dishes.filter((d) => d.day === day).map((d) => recipeById(d.recipeId));
  return state.members.filter((m) => m.taste && !recs.some((r) => (predictedStars(r, m, state) ?? 0) >= LOVED));
}

export function dishesPerWeek(state: AppState) {
  return state.settings.daysPerWeek * state.settings.dishesPerDay;
}

export const isSoup = (r: Recipe) => r.course === 'soup';

/**
 * A "vegetable dish": at least 60% of its share of the plate is vegetables (the same line the Health tab uses).
 * Rich vegetable soups count the same way (for example vegetable soup, rasam, spinach egg soup, winter melon soup);
 * a meaty soup with a few vegetables does not.
 */
export const isVegDish = (r: Recipe) => r.plate.veg >= 0.6;

/**
 * What one day looks like if `r` joins it (replacing `replace`, or added to the day). Judges the whole day, not the dish alone:
 * `blocks` are problems a swap must not cause (the day's only vegetable dish lost, a second spicy dish), `soft` are things worth
 * knowing (the same main as another dish that day, two salty dishes). `after` are the day's dishes once it is done.
 */
export function dayAfter(state: AppState, day: number, r: Recipe, replace?: PlannedDish, dishes = state.plan?.dishes ?? []) {
  const before = dishes.filter((d) => d.day === day).map((d) => recipeById(d.recipeId));
  const rest = dishes.filter((d) => d.day === day && d !== replace).map((d) => recipeById(d.recipeId));
  const after = [...rest, r];
  const rule = spiceRule(state);
  const blocks: string[] = [], soft: string[] = [];
  if (before.some(isVegDish) && !after.some(isVegDish)) blocks.push(`Takes away ${DAY_NAMES[day]}'s only vegetable dish`);
  if (rule.isHot(r) && rest.some((x) => rule.isHot(x))) blocks.push(`A second spicy dish on ${DAY_NAMES[day]}`);
  const sameMain = rest.find((x) => !isSoup(x) && !isSoup(r) && r.protein !== 'veg' && x.protein === r.protein);
  if (sameMain) soft.push(`Same main as ${sameMain.name}`);
  const salty = rest.find((x) => x.sodium === 'high');
  if (r.sodium === 'high' && salty) soft.push(`Two salty dishes with ${salty.name}`);
  return { after, afterNames: after.map((x) => x.name), blocks, soft };
}

/**
 * Soft rule: a vegetable dish every cooking day. For a day without one, the vegetable dishes the family could still be given
 * (never repeating, never a second spicy dish, never one their allergy, religion or rating rules already left out).
 * `options` empty means the day cannot get one.
 */
export function vegGap(state: AppState, day: number, dishes = state.plan?.dishes ?? []): { options: Recipe[] } | null {
  const today = dishes.filter((d) => d.day === day);
  if (!today.length || today.some((d) => isVegDish(recipeById(d.recipeId)))) return null;
  const rule = spiceRule(state);
  const hot = today.some((d) => rule.isHot(recipeById(d.recipeId)));
  const inPlan = new Set(dishes.map((d) => d.recipeId));
  const options = eligibleRecipes(state).ok.filter((r) => isVegDish(r) && !inPlan.has(r.id) && !(hot && rule.isHot(r)));
  return { options };
}

/** One planned dish (a dish can be on the menu more than once a week): keys cooking progress and timers. */
export const dishKey = (d: PlannedDish) => `${d.recipeId}@${d.day}`;
export const isCooked = (plan: WeekPlan, d: PlannedDish) => plan.cooked.includes(dishKey(d)) || plan.cooked.includes(d.recipeId);

/** Soups spread over the week, on top of the day's dishes. */
export function soupsPerWeek(state: AppState) {
  return Math.min(state.settings.daysPerWeek, state.settings.soupsPerWeek ?? 2);
}

/** Soup days spread evenly over the cooking days. */
export const spreadSoupDays = (count: number, days: number) => Array.from({ length: count }, (_, i) => Math.floor(((i + 0.5) * days) / count));

/** The soup days the owner picked, still within the cooking days and no more than the soup count; undefined when they left it automatic. */
export function pickedSoupDays(state: AppState): number[] | undefined {
  const raw = state.settings.soupDays;
  if (!raw) return undefined;
  return [...new Set(raw)].filter((d) => Number.isInteger(d) && d >= 0 && d < state.settings.daysPerWeek).sort((a, b) => a - b).slice(0, soupsPerWeek(state));
}

/** The days the week's soups go on: the owner's picks, topped up with spread-out days if they picked fewer. */
export function soupDaysFor(state: AppState): number[] {
  const count = soupsPerWeek(state), days = state.settings.daysPerWeek;
  const picked = pickedSoupDays(state);
  if (!picked) return spreadSoupDays(count, days);
  const out = [...picked];
  for (const d of [...spreadSoupDays(count, days), ...Array.from({ length: days }, (_, i) => i)]) {
    if (out.length >= count) break;
    if (!out.includes(d)) out.push(d);
  }
  return out.sort((a, b) => a - b);
}

/**
 * When someone can't take much chilli, only one dish a day may be hotter than
 * they can eat (cooked mild for them, with chilli on the side).
 */
export function spiceRule(state: AppState) {
  const { cap, who } = householdSpiceCap(state.members);
  const isHot = (r: Recipe) => r.spice > cap;
  const hotOnDay = (plan: WeekPlan, day: number, except?: PlannedDish) =>
    plan.dishes.filter((d) => d.day === day && d !== except && isHot(recipeById(d.recipeId))).length;
  return { cap, who, active: cap < 3, isHot, hotOnDay };
}

/** The best dish (or soup) to add to a day, or to swap in for `replacing`. */
export function bestFor(state: AppState, day: number, course: 'dish' | 'soup', replacing?: PlannedDish): Recipe | null {
  const plan = state.plan;
  if (!plan) return null;
  const rule = spiceRule(state);
  const inPlan = new Set(plan.dishes.map((d) => d.recipeId));
  const sameDay = plan.dishes.filter((d) => d.day === day && d !== replacing).map((d) => recipeById(d.recipeId));
  const dayHasHot = rule.hotOnDay(plan, day, replacing) > 0;
  const pool = eligibleRecipes(state).ok.filter((r) =>
    !inPlan.has(r.id) && (course === 'soup') === isSoup(r) && !(dayHasHot && rule.isHot(r)));
  const wantNew = replacing ? replacing.isNew : null;
  const scored = pool.map((r) => {
    let sc = familyScore(r, state);
    if (state.lastWeek.includes(r.id)) sc -= 3;
    if (wantNew !== null && state.history.includes(r.id) === wantNew) sc -= 4;
    sc -= 1.5 * sameDay.filter((x) => x.protein === r.protein).length;
    // soft rule: a vegetable dish every day
    const dayHasVeg = sameDay.some(isVegDish);
    if (!dayHasVeg && isVegDish(r)) sc += 3;
    return { r, sc };
  });
  return scored.sort((a, b) => b.sc - a.sc)[0]?.r ?? null;
}

/** Quiz match for everyone, the family's star rating, and the budget. */
export function familyScore(r: Recipe, state: AppState): number {
  let s = state.members.length
    ? state.members.reduce((a, m) => a + memberScore(r, m), 0) / state.members.length
    : 0;
  const rating = state.ratings[r.id];
  if (rating) s += (rating - 3) * 1.5;
  if (state.settings.weeklyBudget > 0) {
    const perDish = state.settings.weeklyBudget / dishesPerWeek(state);
    const cost = dishCost(r);
    if (cost > perDish) s -= Math.min(4, (cost / perDish - 1) * 3);
  }
  return s;
}

/**
 * How settled the family menu is. Early on every dish is new. As the family
 * rates dishes 4★ or more they join the favourites, and each week reuses up to
 * half of them (so favourites still rotate). Once there are enough favourites,
 * the week settles at `newPerDay` new dishes per day.
 */
export function menuProgress(state: AppState) {
  const ok = eligibleRecipes(state).ok.filter((r) => !isSoup(r));
  const total = Math.min(dishesPerWeek(state), ok.length);
  const newWhenSettled = Math.min(total, state.settings.daysPerWeek * state.settings.newPerDay);
  const favCap = total - newWhenSettled;
  const favourites = ok.filter((r) => state.history.includes(r.id) && (state.ratings[r.id] ?? 0) >= FAVOURITE_FROM);
  const target = favCap * 2;
  const favsThisWeek = Math.min(favCap, Math.floor(favourites.length / 2));
  const fresh = ok.filter((r) => !state.history.includes(r.id));
  return {
    total,
    newWhenSettled,
    favCap,
    favourites,
    target,
    favsThisWeek,
    newThisWeek: total - favsThisWeek,
    freshLeft: fresh.length,
    settled: favourites.length >= target,
  };
}

function seededRandom(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

/** Local calendar date as YYYY-MM-DD (toISOString shifts the day in UTC+8). */
function localIso(d: Date) {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function mondayOf(d = new Date()): string {
  const x = new Date(d);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return localIso(x);
}

export function addDays(iso: string, n: number) {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return localIso(d);
}

export const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Builds a draft menu for the owner to review. */
export function buildWeekPlan(state: AppState, weekNo: number, weekOf: string): WeekPlan {
  const rand = seededRandom(`${weekOf}|${state.refreshCount}`);
  const all = eligibleRecipes(state).ok;
  const ok = all.filter((r) => !isSoup(r));
  const p = menuProgress(state);
  const rule = spiceRule(state);
  const days = state.settings.daysPerWeek;
  const hasVegetarian = state.members.some((m) => m.vegetarian);

  const fresh = ok.filter((r) => !state.history.includes(r.id));
  const favourites = p.favourites;
  const others = ok.filter((r) => state.history.includes(r.id) && !favourites.includes(r));

  const chosen: { recipe: Recipe; isNew: boolean }[] = [];
  const pick = (pool: Recipe[], count: number, isNew: boolean) => {
    const remaining = pool.filter((r) => !chosen.some((c) => c.recipe.id === r.id));
    for (let k = 0; k < count && remaining.length; k++) {
      // At most one hot dish a day, so no more hot dishes than days.
      if (chosen.filter((c) => rule.isHot(c.recipe)).length >= days) {
        for (let i = remaining.length - 1; i >= 0; i--) if (rule.isHot(remaining[i])) remaining.splice(i, 1);
        if (!remaining.length) break;
      }
      let best = 0;
      let bestScore = -Infinity;
      remaining.forEach((r, i) => {
        let s = familyScore(r, state) + rand() * 1.5;
        if (state.lastWeek.includes(r.id)) s -= 3; // rotate favourites week to week
        s -= 1.5 * chosen.filter((c) => c.recipe.protein === r.protein).length;
        s -= 0.75 * chosen.filter((c) => c.recipe.cuisine === r.cuisine).length;
        if (hasVegetarian && r.vegetarian && chosen.filter((c) => c.recipe.vegetarian).length < Math.ceil(p.total / 3)) s += 3;
        const vegShare = chosen.length ? chosen.reduce((a, c) => a + c.recipe.plate.veg, 0) / chosen.length : 0.5;
        if (vegShare < 0.4 && r.plate.veg >= 0.5) s += 1.5;
        if (s > bestScore) {
          bestScore = s;
          best = i;
        }
      });
      chosen.push({ recipe: remaining[best], isNew });
      remaining.splice(best, 1);
    }
  };

  pick(favourites, p.favsThisWeek, false);
  pick(fresh, p.total - chosen.length, true);
  // Ran out of new recipes: lean on favourites, then anything not dropped.
  pick(favourites, p.total - chosen.length, false);
  pick(others, p.total - chosen.length, false);

  const dishes = assignDays(chosen, state, rule.isHot);

  // Soups: spread evenly, mild ones first, rotating week to week.
  const soupDays = soupDaysFor(state);
  const soups = all.filter(isSoup);
  const used = new Set<string>();
  for (const day of soupDays) {
    const hotToday = dishes.some((d) => d.day === day && rule.isHot(recipeById(d.recipeId)));
    const best = soups
      .filter((r) => !used.has(r.id) && !(hotToday && rule.isHot(r)))
      .map((r) => ({ r, sc: familyScore(r, state) + rand() * 1.5 - (state.lastWeek.includes(r.id) ? 3 : 0) - (rule.isHot(r) ? 2 : 0) }))
      .sort((a, b) => b.sc - a.sc)[0]?.r;
    if (!best) continue;
    used.add(best.id);
    dishes.push({ recipeId: best.id, day, isNew: !state.history.includes(best.id) });
  }
  // Soft rule: a vegetable dish every day. A day without one swaps its least wanted dish for a vegetable dish nobody has ruled out.
  // The pool already holds only dishes that pass allergy, religion and rating rules, and a spicy dish never joins a day that has one.
  for (let day = 0; day < days; day++) {
    const today = dishes.filter((d) => d.day === day);
    if (today.some((d) => isVegDish(recipeById(d.recipeId)))) continue;
    const inPlan = new Set(dishes.map((d) => d.recipeId));
    for (const target of today.filter((d) => !isSoup(recipeById(d.recipeId))).sort((a, b) => familyScore(recipeById(a.recipeId), state) - familyScore(recipeById(b.recipeId), state))) {
      const otherHot = today.some((d) => d !== target && rule.isHot(recipeById(d.recipeId)));
      const alt = ok.filter((r) => isVegDish(r) && !inPlan.has(r.id) && !(otherHot && rule.isHot(r)))
        .map((r) => ({ r, sc: familyScore(r, state) + rand() }))
        .sort((a, b) => b.sc - a.sc)[0]?.r;
      if (!alt) continue;
      dishes[dishes.indexOf(target)] = { ...target, recipeId: alt.id, isNew: !state.history.includes(alt.id) };
      break;
    }
  }
  // Every day, each person gets at least one dish they'd likely rate 4★ or more.
  const loves = (r: Recipe, m: Member) => (predictedStars(r, m, state) ?? 0) >= LOVED;
  const quizzed = state.members.filter((m) => m.taste);
  for (let day = 0; day < days; day++) {
    for (let guard = 0; guard < quizzed.length; guard++) {
      const today = dishes.filter((d) => d.day === day);
      const recs = today.map((d) => recipeById(d.recipeId));
      const missing = quizzed.filter((m) => !recs.some((r) => loves(r, m)));
      if (!missing.length) break;
      // Replace a dish nobody depends on for their favourite.
      const spare = today.filter((d) => {
        const r = recipeById(d.recipeId);
        return !isSoup(r) && quizzed.every((q) => !loves(r, q) || recs.some((x) => x !== r && loves(x, q)))
          && !(isVegDish(r) && !recs.some((x) => x !== r && isVegDish(x))); // keep the day's only vegetable dish
      }).sort((a, b) => familyScore(recipeById(a.recipeId), state) - familyScore(recipeById(b.recipeId), state));
      const target = spare[0];
      if (!target) break;
      const otherHot = today.some((d) => d !== target && rule.isHot(recipeById(d.recipeId)));
      const inPlan = new Set(dishes.map((d) => d.recipeId));
      const alt = ok
        .filter((r) => !inPlan.has(r.id) && !(otherHot && rule.isHot(r)) && missing.some((m) => loves(r, m)))
        .map((r) => ({ r, sc: missing.filter((m) => loves(r, m)).length * 3 + familyScore(r, state) + rand() + (state.history.includes(r.id) === !target.isNew ? 1 : 0) }))
        .sort((a, b) => b.sc - a.sc)[0]?.r;
      if (!alt) break;
      const i = dishes.indexOf(target);
      dishes[i] = { ...target, recipeId: alt.id, isNew: !state.history.includes(alt.id) };
    }
  }
  dishes.sort((a, b) => a.day - b.day || Number(isSoup(recipeById(a.recipeId))) - Number(isSoup(recipeById(b.recipeId))));

  return { weekNo, weekOf, dishes, status: 'draft', cooked: [] };
}

/** Spread new dishes evenly across days, then fill with favourites, keeping veg spread out. */
function assignDays(chosen: { recipe: Recipe; isNew: boolean }[], state: AppState, isHot: (r: Recipe) => boolean): PlannedDish[] {
  const days = state.settings.daysPerWeek;
  const cap = state.settings.dishesPerDay;
  const buckets: { recipe: Recipe; isNew: boolean }[][] = Array.from({ length: days }, () => []);
  const byVeg = (a: { recipe: Recipe }, b: { recipe: Recipe }) => b.recipe.plate.veg - a.recipe.plate.veg;
  const place = (item: { recipe: Recipe; isNew: boolean }, key: (b: typeof buckets[number]) => number) => {
    const open = buckets.map((b, i) => ({ b, i })).filter((x) => x.b.length < cap);
    open.sort((x, y) => key(x.b) - key(y.b) || x.i - y.i);
    open[0]?.b.push(item);
  };
  for (const c of chosen.filter((c) => c.isNew).sort(byVeg)) place(c, (b) => b.filter((x) => x.isNew).length * 10 + b.length);
  for (const c of chosen.filter((c) => !c.isNew).sort(byVeg)) place(c, (b) => b.length * 10 + b.reduce((a, x) => a + x.recipe.plate.veg, 0));
  // No day gets two hot dishes: trade the extra one for a mild dish from a day without any.
  const hot = (b: typeof buckets[number]) => b.filter((x) => isHot(x.recipe)).length;
  for (const b of buckets) {
    while (hot(b) > 1) {
      const other = buckets.find((o) => o !== b && hot(o) === 0 && o.some((x) => !isHot(x.recipe)));
      if (!other) break;
      const i = b.findIndex((x) => isHot(x.recipe));
      const j = other.findIndex((x) => !isHot(x.recipe));
      [b[i], other[j]] = [other[j], b[i]];
    }
  }
  return buckets.flatMap((b, day) => b.map((c) => ({ recipeId: c.recipe.id, day, isNew: c.isNew })));
}

/** The household's spice ceiling: the lowest tolerance among members who took the quiz. */
export function householdSpiceCap(members: Member[]): { cap: number; who: string[] } {
  const quizzed = members.filter((m) => m.taste);
  if (!quizzed.length) return { cap: 3, who: [] };
  const cap = Math.min(...quizzed.map((m) => m.taste!.spice));
  return { cap, who: quizzed.filter((m) => m.taste!.spice === cap).map((m) => m.name) };
}
