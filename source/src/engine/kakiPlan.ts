import { DAY_KEYS, KakiRaw } from '../ai/kaki';
import { HINTS, MEAT } from '../ai/draft';
import { applyCustomRecipes, recipeById, RECIPES } from '../data/recipes';
import { CATALOGUE } from '../data/store';
import { AppState, PlannedDish, Protein, Recipe, Spice } from '../types';
import { placeDish, removeDish } from './balance';
import { groceryFit } from './grocery';
import { DAY_NAMES, dayAfter, eligibleRecipes, exclusionReasons, householdSpiceCap, isCooked } from './planner';

/** One edit Gemini proposed that passed the app's own checks. Nothing is applied until the owner confirms. */
export type KakiAction =
  | { kind: 'add'; day: number; recipe: Recipe; notes: string[]; toBuy: string[] }
  | { kind: 'swap'; day: number; fromId: string; recipe: Recipe; notes: string[]; toBuy: string[] }
  | { kind: 'remove'; day: number; fromId: string }
  | { kind: 'adapt'; day: number; fromId: string; recipe: Recipe; changes: string[]; toBuy: string[] };

export interface KakiPlan { reply: string; actions: KakiAction[]; dropped: string[] }

const str = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const strs = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').map((x) => x.trim()).filter(Boolean) : []);
const name = (k: string) => CATALOGUE[k]?.name.toLowerCase() ?? k;

function guessProtein(names: string, fallback: Protein): Protein {
  return MEAT.beef.test(names) ? 'beef' : MEAT.pork.test(names) ? 'pork' : /chicken|duck/i.test(names) ? 'chicken'
    : /prawn|shrimp|crab|squid|clam|mussel|scallop/i.test(names) ? 'seafood' : /fish|salmon|anchov/i.test(names) ? 'fish'
    : /tofu|tempeh|bean curd/i.test(names) ? 'tofu' : /\begg/i.test(names) ? 'egg' : fallback === 'chicken' || fallback === 'pork' || fallback === 'beef' || fallback === 'fish' || fallback === 'seafood' ? 'veg' : fallback;
}

/**
 * The family's own copy of a dish with Gemini's changes. Null (with the reason in `why`) if the result is not allowed:
 * an unknown ingredient, a hotter dish than the household takes, or an allergy or religion rule broken by the new ingredients.
 */
function adaptRecipe(state: AppState, base: Recipe, a: NonNullable<KakiRaw['actions']>[number], newId: string): { recipe?: Recipe; changes: string[]; why?: string } {
  const changes: string[] = [];
  let ingredients = base.ingredients.map((i) => ({ ...i }));
  const drop = strs(a.drop).filter((k) => CATALOGUE[k] && ingredients.some((i) => i.item === k));
  for (const k of drop) { ingredients = ingredients.filter((i) => i.item !== k); changes.push(`leave out the ${name(k)}`); }
  const reps = (Array.isArray(a.replace) ? a.replace : []) as { from?: unknown; to?: unknown }[];
  for (const r of reps) {
    const from = str(r.from), to = str(r.to);
    if (!CATALOGUE[to] || !ingredients.some((i) => i.item === from)) continue;
    const had = ingredients.some((i) => i.item === to);
    ingredients = ingredients.flatMap((i) => (i.item === from ? (had ? [] : [{ ...i, item: to }]) : [i]));
    changes.push(`${name(to)} instead of ${name(from)}`);
  }
  if (ingredients.length < 2) return { changes, why: 'that would leave too few ingredients' };

  const asked = Number(a.spice);
  const spice = (Number.isFinite(asked) && asked >= 0 ? Math.min(3, Math.round(asked)) : base.spice) as Spice;
  if (spice > base.spice && spice > householdSpiceCap(state.members).cap) return { changes, why: 'it would be hotter than your family takes' };
  if (spice < base.spice) changes.push(spice === 0 ? 'no chilli' : 'milder');

  const stepsIn = strs(a.steps).map((x) => x.slice(0, 500));
  const steps = stepsIn.length >= 3 && stepsIn.length <= 20 ? stepsIn : base.steps;
  if (stepsIn.length >= 3 && stepsIn.length <= 20) changes.push('rewritten steps');
  const note = str(a.note, 160);
  if (!changes.length && !note) return { changes, why: 'nothing would actually change' };

  const names = ingredients.map((i) => CATALOGUE[i.item]?.name ?? i.item).join(', ');
  // An allergen is only taken off when an ingredient that carried it was removed and nothing left carries it; otherwise it stays.
  const gone = base.ingredients.filter((i) => !ingredients.some((x) => x.item === i.item)).map((i) => CATALOGUE[i.item]?.name ?? i.item).join(', ');
  const carried = (al: string, text: string) => !!HINTS.find(([x]) => x === al)?.[1].test(text);
  const allergens = [...new Set([...base.allergens.filter((al) => !(carried(al, gone) && !carried(al, names))), ...HINTS.filter(([, re]) => re.test(names)).map(([al]) => al)])];
  const protein = guessProtein(names, base.protein);
  const baseName = base.name.replace(/ \(adapted\)$/, '');
  const recipe: Recipe = {
    ...base,
    id: newId,
    name: `${baseName} (adapted)`,
    ingredients,
    spice,
    flavours: spice === 0 ? base.flavours.filter((f) => f !== 'spicy') : base.flavours,
    allergens,
    pork: MEAT.pork.test(names),
    beef: MEAT.beef.test(names),
    protein,
    vegetarian: !MEAT.pork.test(names) && !MEAT.beef.test(names) && !MEAT.other.test(names) && ['veg', 'tofu', 'egg'].includes(protein),
    steps: stepsIn.length >= 3 && stepsIn.length <= 20 ? steps : [`Changed for this week: ${note || changes.join(', ')}.`, ...base.steps],
    i18n: { tl: { name: `${baseName} (adapted)` }, id: { name: `${baseName} (adapted)` }, my: { name: `${baseName} (adapted)` } },
    source: `Adapted by Gemini from "${baseName}" (${base.source}); please check`,
    custom: true, aiAdapted: true, adaptedFrom: base.adaptedFrom ?? base.id,
  };
  delete recipe.sickDay;
  delete recipe.videoUrl;
  const bad = exclusionReasons(recipe, state.members);
  if (bad.length) return { changes, why: `it would break a family rule (${bad.join('; ')})` };
  if (note && !changes.includes(note)) changes.unshift(note.replace(/\.$/, ''));
  return { recipe, changes: [...new Set(changes)].filter((c) => !(c === 'no chilli' && /no chilli/i.test(note))) };
}

/** Checks everything Gemini proposed against the menu and the family's rules. Drops what does not pass and says why. */
export function resolveKaki(state: AppState, raw: KakiRaw, idGen: () => string = () => Math.random().toString(36).slice(2, 6)): KakiPlan {
  const reply = str(raw.reply, 600) || "Sorry, I couldn't think of a change for that.";
  const plan = state.plan;
  const actions: KakiAction[] = [];
  const dropped: string[] = [];
  if (!plan) return { reply, actions, dropped };
  const { ok, excluded } = eligibleRecipes(state);
  const okIds = new Set(ok.map((r) => r.id));
  const find = (id: string) => RECIPES.find((r) => r.id === id);
  const left = (id: string) => excluded.find((e) => e.recipe.id === id);
  const used = new Set<string>();

  for (const a of (Array.isArray(raw.actions) ? raw.actions : []).slice(0, 6)) {
    const type = str(a.type);
    const day = DAY_KEYS.indexOf(str(a.day).toLowerCase().slice(0, 3) as (typeof DAY_KEYS)[number]);
    const dishId = str(a.dish), toId = str(a.to);
    const target = plan.dishes.find((d) => d.day === day && d.recipeId === dishId);
    const where = day >= 0 ? DAY_NAMES[day] : 'that day';
    // adding is fine on a day with no dish yet; the other edits need a dish on that day
    if (day < 0 || (type !== 'add' && !plan.dishes.some((d) => d.day === day))) { dropped.push(day < 0 ? 'I could not tell which day you meant.' : `There is no dinner on ${where}.`); continue; }
    const candidate = (id: string) => {
      const r = find(id);
      if (!r) { dropped.push('Gemini named a dish that is not in the recipe book, so I skipped it.'); return null; }
      if (left(id)) { dropped.push(`${r.name} is left out for your family (${left(id)!.reasons.join('; ')}).`); return null; }
      if (!okIds.has(id)) { dropped.push(`${r.name} isn't one I plan for dinner.`); return null; }
      return r;
    };
    if (type === 'add') {
      const r = candidate(dishId);
      if (!r) continue;
      if (plan.dishes.some((d) => d.day === day && d.recipeId === r.id)) { dropped.push(`${r.name} is already on ${where}.`); continue; }
      const chk = dayAfter(state, day, r);
      actions.push({ kind: 'add', day, recipe: r, notes: [...chk.blocks, ...chk.soft], toBuy: groceryFit(state, r).toBuy });
    } else if (type === 'swap') {
      if (!target || isCooked(plan, target)) { dropped.push(`I can't change ${where}'s ${find(dishId)?.name ?? 'dish'}: it isn't on the menu or is already cooked.`); continue; }
      const r = candidate(toId);
      if (!r) continue;
      if (plan.dishes.some((d) => d.day === day && d.recipeId === r.id)) { dropped.push(`${r.name} is already on ${where}.`); continue; }
      const chk = dayAfter(state, day, r, target);
      actions.push({ kind: 'swap', day, fromId: dishId, recipe: r, notes: [...chk.blocks, ...chk.soft], toBuy: groceryFit(state, r).toBuy });
    } else if (type === 'remove') {
      if (!target || isCooked(plan, target)) { dropped.push(`I can't take ${find(dishId)?.name ?? 'that dish'} off ${where}: it isn't on the menu or is already cooked.`); continue; }
      actions.push({ kind: 'remove', day, fromId: dishId });
    } else if (type === 'adapt') {
      if (!target || isCooked(plan, target)) { dropped.push(`I can't change ${find(dishId)?.name ?? 'that dish'} on ${where}: it isn't on the menu or is already cooked.`); continue; }
      const r = adaptRecipe(state, recipeById(dishId), a, `adapted-${dishId.replace(/^(adapted|custom)-/, '').slice(0, 30)}-${idGen()}`);
      if (!r.recipe) { dropped.push(`I couldn't adapt ${recipeById(dishId).name}: ${r.why}.`); continue; }
      actions.push({ kind: 'adapt', day, fromId: dishId, recipe: r.recipe, changes: r.changes, toBuy: groceryFit(state, r.recipe).toBuy });
    } else continue;
    const key = `${type}-${day}-${dishId}`;
    if (used.has(key)) actions.pop(); else used.add(key);
  }
  // Gemini's wording must never promise what the app can't do: if nothing survived the checks, say so instead.
  if (!actions.length && dropped.length && (Array.isArray(raw.actions) ? raw.actions : []).length) {
    return { reply: "I couldn't make that change:", actions, dropped };
  }
  return { reply, actions, dropped };
}

/** Everything the owner would have to buy extra if all the edits go ahead. */
export const kakiToBuy = (actions: KakiAction[]) => [...new Set(actions.flatMap((a) => (a.kind === 'remove' ? [] : a.toBuy)))];

/** Applies the confirmed edits, one by one, to the menu. Adapted dishes are saved as the family's own copies. */
export function applyKaki(st: AppState, actions: KakiAction[], newId: () => string): AppState {
  let s = st;
  for (const a of actions) {
    if (!s.plan) break;
    const target = (id: string): PlannedDish | undefined => s.plan!.dishes.find((d) => d.day === a.day && d.recipeId === id);
    if (a.kind === 'add') s = placeDish(s, a.day, a.recipe.id, undefined, newId);
    else if (a.kind === 'swap') { const t = target(a.fromId); if (t) s = placeDish(s, a.day, a.recipe.id, t, newId); }
    else if (a.kind === 'remove') { const t = target(a.fromId); if (t) s = removeDish(s, t, newId); }
    else {
      const t = target(a.fromId);
      if (!t) continue;
      s = { ...s, customRecipes: [...(s.customRecipes ?? []), a.recipe] };
      applyCustomRecipes(s.customRecipes, s.customItems); // the new copy has to be in the recipe book before it can be placed
      s = placeDish(s, a.day, a.recipe.id, t, newId);
    }
  }
  return s;
}

/** One line per edit, for the tester and the card. */
export function describeKakiAction(a: KakiAction): string {
  const day = DAY_NAMES[a.day];
  if (a.kind === 'add') return `Add ${a.recipe.name} on ${day}`;
  if (a.kind === 'swap') return `${day}: ${recipeById(a.fromId).name} → ${a.recipe.name}`;
  if (a.kind === 'remove') return `Take ${recipeById(a.fromId).name} off ${day}`;
  return `${day}: ${recipeById(a.fromId).name} → ${a.recipe.name} (${a.changes.join(', ')})`;
}
