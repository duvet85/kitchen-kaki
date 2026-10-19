import { SLOTS, Slot, methodOf, slotOf } from '../data/methods';
import { recipeById } from '../data/recipes';
import { CATALOGUE } from '../data/store';
import { AppState, Lesson, LessonStep, PlannedDish, Recipe } from '../types';
import { placeDish, removeDish } from './balance';
import { groceryFit, PANTRY } from './grocery';
import { dishKey, planDayName, planDayOfWeekday, eligibleRecipes, familyScore, householdSpiceCap } from './planner';
import { isMastered, localDate, markMastered, recordCooked } from './recognition';

/*
 * Cooking lessons: one soup, one steamed or braised dish and one stir-fry, taught in two hours.
 * Everything here is rules only; Gemini (src/ai/lesson.ts) may only choose among `candidates`.
 */

export const LESSON_MINUTES = 120;

/** Dishes that pass the family's hard rules (allergies, religion, dropped dishes), grouped by lesson slot. */
export function candidates(st: AppState): Record<Slot, Recipe[]> {
  const out: Record<Slot, Recipe[]> = { soup: [], slow: [], wok: [] };
  for (const r of eligibleRecipes(st).ok) {
    const s = slotOf(methodOf(r));
    if (s) out[s].push(r);
  }
  return out;
}

const saltWatch = (st: AppState) => st.members.filter((m) => m.conditions.includes('hypertension'));

/** How good a dish is to teach now: the family likes it, it's on this week's menu, she hasn't mastered it yet. */
export function teachScore(st: AppState, r: Recipe, practise = false) {
  let s = familyScore(r, st);
  if (st.plan?.dishes.some((d) => d.recipeId === r.id)) s += 2;
  const conf = st.confidence?.[r.id];
  if (isMastered(st, r.id)) s -= practise ? 0 : 4;
  else if (conf && conf <= 3) s += 2; // she asked to practise it
  if (practise && conf && conf <= 3) s += 3;
  return s;
}

/** The family rules a trio must keep, beyond the hard rules already applied: salt and chilli. */
export function trioProblems(st: AppState, trio: Recipe[]): string[] {
  const out: string[] = [];
  const salt = saltWatch(st);
  if (salt.length && trio.filter((r) => r.sodium === 'high').length > 1) out.push(`More than one salty dish (${salt.map((m) => m.name).join(', ')}: blood pressure)`);
  const { cap, who } = householdSpiceCap(st.members);
  if (cap < 3 && trio.filter((r) => r.spice > cap).length > 1) out.push(`More than one dish too spicy for ${who.join(', ')}`);
  return out;
}

/** Rule-based pick, one per slot: best teach scores that keep the salt and chilli rules and vary the main ingredient. */
export function pickTrio(st: AppState, practise = false): { picks: Partial<Record<Slot, Recipe>>; empty: Slot[] } {
  const pool = candidates(st);
  const top = Object.fromEntries(SLOTS.map((s) => [s, [...pool[s]].sort((a, b) => teachScore(st, b, practise) - teachScore(st, a, practise)).slice(0, 6)])) as Record<Slot, Recipe[]>;
  const empty = SLOTS.filter((s) => !top[s].length);
  let best: { sc: number; picks: Partial<Record<Slot, Recipe>> } = { sc: -Infinity, picks: {} };
  const opts = (s: Slot) => (top[s].length ? top[s] : [undefined]);
  for (const a of opts('soup')) for (const b of opts('slow')) for (const c of opts('wok')) {
    const trio = [a, b, c].filter(Boolean) as Recipe[];
    let sc = trio.reduce((x, r) => x + teachScore(st, r, practise), 0);
    sc -= 50 * trioProblems(st, trio).length;
    sc -= 2 * (trio.length - new Set(trio.map((r) => r.protein)).size);
    const early = buildTimeline(trio).early.length;
    sc -= 3 * early;
    if (sc > best.sc) best = { sc, picks: { soup: a, slow: b, wok: c } };
  }
  return { picks: best.picks, empty };
}

/** Plain words for the rules a pick keeps, for the owner. */
export function rulesKept(st: AppState): string[] {
  const out: string[] = [];
  for (const m of st.members) {
    if (m.allergies.length) out.push(`no ${m.allergies.join(', ')} (${m.name})`);
    if (m.religion === 'halal') out.push(`halal (${m.name})`);
    else if (m.religion === 'no-pork') out.push(`no pork (${m.name})`);
    else if (m.religion === 'no-beef') out.push(`no beef (${m.name})`);
  }
  const salt = saltWatch(st);
  if (salt.length) out.push(`at most 1 salty dish (${salt.map((m) => m.name).join(', ')})`);
  const { cap, who } = householdSpiceCap(st.members);
  if (cap < 3) out.push(`at most 1 spicy dish (${who.join(', ')})`);
  return out;
}

const active = (r: Recipe, slot: Slot) => Math.max(slot === 'wok' ? 8 : 10, r.minutes - (slot === 'wok' ? 10 : 15));

/**
 * The two-hour plan, worked out from each recipe's own minutes (never written by Gemini):
 * welcome, prep for all three, the longest-cooking dish on first, the stir-fry last so it's served hot,
 * then tasting and tidying up. A dish that can't finish in time gets an "start before the lesson" step.
 */
export function buildTimeline(trio: Recipe[]): { steps: LessonStep[]; early: { recipeId: string; minutes: number }[] } {
  const steps: LessonStep[] = [{ at: 0, until: 10, kind: 'teach' }, { at: 10, until: 35, kind: 'prep' }];
  const early: { recipeId: string; minutes: number }[] = [];
  const COOK_END = 100;
  const slotted = trio.map((r) => ({ r, slot: slotOf(methodOf(r)) ?? 'slow' as Slot }));
  const wok = slotted.filter((x) => x.slot === 'wok');
  // the stir-fry is cooked last, so it reaches the table hot; everything else should be done before it starts
  const wokStart = wok.length ? Math.max(40, COOK_END - Math.max(...wok.map((x) => active(x.r, x.slot)))) : COOK_END;
  for (const { r, slot } of slotted.filter((x) => x.slot !== 'wok').sort((a, b) => active(b.r, b.slot) - active(a.r, a.slot))) {
    const len = active(r, slot);
    // soups go on early and simmer; a steamed or braised dish finishes just before the stir-fry starts
    let at = slot === 'soup' ? 20 : Math.max(30, Math.min(90, wokStart) - len);
    if (at + len > COOK_END) at = COOK_END - len;
    if (at < 0) {
      early.push({ recipeId: r.id, minutes: -at });
      steps.push({ at, until: 0, recipeId: r.id, kind: 'early' }, { at: 0, until: COOK_END, recipeId: r.id, kind: 'cook' });
    } else {
      steps.push({ at, until: at + len, recipeId: r.id, kind: 'cook' });
    }
  }
  for (const { r } of wok) steps.push({ at: wokStart, until: COOK_END, recipeId: r.id, kind: 'cook' });
  steps.push({ at: 100, until: 110, kind: 'taste' }, { at: 110, until: 120, kind: 'tidy' });
  return { steps: steps.sort((a, b) => a.at - b.at || a.until - b.until), early };
}

/** Clock time of a minute offset from the start, e.g. ("10:00", 35) -> "10:35". */
export function clock(start: string, offset: number) {
  const [h, m] = start.split(':').map(Number);
  const t = (((h * 60 + m + offset) % 1440) + 1440) % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}

/** Groceries for the three dishes against what the menu already has: bought, on the list, or to buy. */
export function lessonGroceries(st: AppState, trio: Recipe[]) {
  const have = new Set<string>(), coming = new Set<string>(), toBuy = new Set<string>();
  for (const r of trio) {
    const fit = groceryFit(st, r);
    fit.have.forEach((x) => have.add(x));
    fit.coming.forEach((x) => coming.add(x));
    fit.toBuy.forEach((x) => toBuy.add(x));
  }
  for (const x of have) { coming.delete(x); toBuy.delete(x); }
  for (const x of coming) toBuy.delete(x);
  const cost = [...toBuy].reduce((a, k) => a + (CATALOGUE[k]?.price ?? 0), 0);
  const pantry = [...new Set(trio.flatMap((r) => r.ingredients.map((i) => i.item)).filter((k) => PANTRY.has(k)))];
  return { have: [...have], coming: [...coming], toBuy: [...toBuy], cost, pantry };
}

/** Day of the current menu a date falls on (0 = Monday), or null when the menu is for another week. */
export function planDayOf(st: AppState, date: string): number | null {
  if (!st.plan) return null;
  const [y, m, d] = st.plan.weekOf.split('-').map(Number);
  const [y2, m2, d2] = date.split('-').map(Number);
  const diff = Math.round((new Date(y2, m2 - 1, d2).getTime() - new Date(y, m - 1, d).getTime()) / 86400000);
  // weekOf may be the Sunday before (see recognition.onPlannedDay), so match on the weekday within that week
  if (diff < -1 || diff > 7) return null;
  return planDayOfWeekday(st.plan, (new Date(y2, m2 - 1, d2).getDay() + 6) % 7);
}

const lessonDishes = (st: AppState, id: string) => st.plan?.dishes.filter((d) => d.lesson === id) ?? [];

/**
 * Puts the lesson's dishes on that day's menu, the way the owner chose:
 * dinner = they replace the day's dishes, extra = added on top, separate = menu untouched.
 * On a menu already sent this goes through the usual change notes and NEW shopping items.
 */
export function placeLesson(st: AppState, lessonId: string, newId: () => string): AppState {
  const lesson = st.lessons?.find((l) => l.id === lessonId);
  if (!lesson || lesson.status !== 'planned' || lesson.menuMode === 'separate' || !st.plan) return st;
  const day = planDayOf(st, lesson.date);
  if (day === null || lessonDishes(st, lessonId).length) return st;
  let next = st;
  if (lesson.menuMode === 'dinner') {
    for (;;) {
      const old = next.plan!.dishes.find((d) => d.day === day && !d.lesson && !next.plan!.cooked.includes(dishKey(d)));
      if (!old) break;
      next = removeDish(next, old, newId);
    }
  }
  for (const { recipeId } of lesson.dishes) {
    if (next.plan!.dishes.some((d) => d.day === day && d.recipeId === recipeId)) continue;
    next = placeDish(next, day, recipeId, undefined, newId);
  }
  const ids = new Set(lesson.dishes.map((d) => d.recipeId));
  return {
    ...next,
    plan: { ...next.plan!, dishes: next.plan!.dishes.map((d) => (d.day === day && ids.has(d.recipeId) && !d.lesson ? { ...d, lesson: lessonId } : d)) },
    lessons: (next.lessons ?? []).map((l) => (l.id === lessonId ? { ...l, placed: { weekOf: next.plan!.weekOf, day } } : l)),
  };
}

/** Takes the lesson's (uncooked) dishes off the menu. */
export function unplaceLesson(st: AppState, lessonId: string, newId: () => string): AppState {
  let next = st;
  for (;;) {
    const d = lessonDishes(next, lessonId).find((x) => !next.plan!.cooked.includes(dishKey(x)));
    if (!d) break;
    next = removeDish(next, d, newId);
  }
  return { ...next, lessons: (next.lessons ?? []).map((l) => (l.id === lessonId ? { ...l, placed: undefined } : l)) };
}

export function saveLesson(st: AppState, lesson: Lesson, newId: () => string): AppState {
  const others = (st.lessons ?? []).filter((l) => l.id !== lesson.id);
  return placeLesson({ ...st, lessons: [...others, lesson] }, lesson.id, newId);
}

/** New date or time. If its dishes are on the menu they move with it, with the usual note to the helper. */
export function moveLesson(st: AppState, id: string, date: string, start: string, newId: () => string): AppState {
  let next = unplaceLesson(st, id, newId);
  next = { ...next, lessons: (next.lessons ?? []).map((l) => (l.id === id ? { ...l, date, start } : l)) };
  return placeLesson(next, id, newId);
}

/** Cancels a lesson. keepDishes leaves them on the menu as ordinary dishes (the food may be bought already). */
export function cancelLesson(st: AppState, id: string, keepDishes: boolean, newId: () => string): AppState {
  const next = keepDishes
    ? { ...st, plan: st.plan && { ...st.plan, dishes: st.plan.dishes.map((d) => (d.lesson === id ? { ...d, lesson: undefined } : d)) } }
    : unplaceLesson(st, id, newId);
  return { ...next, lessons: (next.lessons ?? []).map((l) => (l.id === id ? { ...l, status: 'cancelled' as const } : l)) };
}

/**
 * Lesson finished: her confidence ratings are saved, the lesson's dishes on the menu count as cooked,
 * and the lesson is logged (points). Mastery stays the owner's call, except when the owner finishes it
 * and ticks "she's mastered it" for a dish.
 */
export function completeLesson(st: AppState, id: string, confidence: Record<string, number>, notes: string, masteredNow: string[], by: string | undefined, newId: () => string): AppState {
  const lesson = st.lessons?.find((l) => l.id === id);
  if (!lesson || lesson.status === 'done') return st;
  let next: AppState = {
    ...st,
    confidence: { ...(st.confidence ?? {}), ...confidence },
    lessons: (st.lessons ?? []).map((l) => (l.id === id ? { ...l, status: 'done' as const, doneAt: new Date().toISOString(), confidence, notes: notes.trim() || l.notes } : l)),
  };
  for (const d of lessonDishes(next, id)) {
    const key = dishKey(d);
    if (next.plan!.cooked.includes(key)) continue;
    next = recordCooked(next, key, newId);
    next = { ...next, plan: { ...next.plan!, cooked: [...next.plan!.cooked, key] } };
  }
  next = { ...next, kitchenLog: [...(next.kitchenLog ?? []), { id: newId(), at: new Date().toISOString(), helper: next.recognition?.helper?.trim() || 'Helper', kind: 'lesson', lessonId: id }] };
  for (const r of masteredNow) next = markMastered(next, r, 'lesson', by, newId);
  return next;
}

/** Planned lessons whose day has passed without being finished. */
export const overdueLessons = (st: AppState, today = localDate()) =>
  (st.lessons ?? []).filter((l) => l.status === 'planned' && l.date < today);

/** Planned lessons that fall in the current menu's week but aren't on it yet (the owner is asked first). */
export const unplacedThisWeek = (st: AppState) =>
  (st.lessons ?? []).filter((l) => l.status === 'planned' && l.menuMode !== 'separate' && !lessonDishes(st, l.id).length && planDayOf(st, l.date) !== null);

/** A lesson dish someone is about to remove or swap on the menu. */
export const lessonOf = (st: AppState, d: PlannedDish) => (d.lesson ? st.lessons?.find((l) => l.id === d.lesson) : undefined);

export const describeDay = (st: AppState, date: string) => {
  const day = planDayOf(st, date);
  return day === null ? date : planDayName(st.plan, day);
};

export const trioOf = (l: Lesson) => l.dishes.map((d) => recipeById(d.recipeId));
