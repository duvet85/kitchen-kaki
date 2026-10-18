import { AppState, WeekPlan, WeekSnapshot } from '../types';
import { addDays, buildWeekPlan } from './planner';

const KEEP_WEEKS = 4;

/** The state as it will be once the sent week is done: its dishes count as had, for picking next week's. */
export function afterSentWeek(st: AppState): AppState {
  if (!st.plan) return st;
  const done = st.plan.dishes.map((d) => d.recipeId);
  return { ...st, history: [...new Set([...st.history, ...done])], lastWeek: done };
}

/** "Plan week N+1": drafts next week beside the sent one, so the cook keeps seeing this week's menu and shopping. */
export function draftNextWeek(st: AppState): AppState {
  if (!st.plan) return st;
  const next = { ...afterSentWeek(st), refreshCount: st.refreshCount + 1 };
  return { ...st, refreshCount: next.refreshCount, nextPlan: buildWeekPlan(next, st.plan.weekNo + 1, addDays(st.plan.weekOf, 7)) };
}

const snapshot = (st: AppState, plan: WeekPlan): WeekSnapshot => ({
  plan, history: st.history, lastWeek: st.lastWeek, bought: st.bought, shopSwaps: st.shopSwaps, shopNames: st.shopNames,
  fruitDays: st.fruitDays, lateItems: st.lateItems, helperNotes: st.helperNotes,
});

/** Sending next week's menu: it becomes the cook's menu with a fresh shopping list; the week before is kept so it can be taken back. */
export function sendNextWeek(st: AppState, sent: WeekPlan): AppState {
  const past = st.plan ? [...(st.pastWeeks ?? []), snapshot(st, st.plan)].slice(-KEEP_WEEKS) : st.pastWeeks;
  const after = afterSentWeek(st);
  return {
    ...st, history: after.history, lastWeek: after.lastWeek, pastWeeks: past, nextPlan: null,
    plan: { ...sent, status: 'confirmed', confirmedAt: sent.confirmedAt ?? new Date().toISOString() },
    bought: [], shopSwaps: {}, shopNames: {}, fruitDays: [], lateItems: [], helperNotes: [],
  };
}

/**
 * Take back the sent menu. With an earlier week kept, the cook goes back to that week (its menu and shopping as they were) and
 * this menu becomes next week's draft again. Week 1, or no earlier week: the menu turns back into a draft only the owner sees.
 */
export function takeBackWeek(st: AppState): AppState {
  if (!st.plan || st.plan.status !== 'confirmed') return st;
  const past = st.pastWeeks ?? [];
  const draft: WeekPlan = { ...st.plan, status: 'draft', confirmedAt: undefined };
  const prev = past[past.length - 1];
  if (!prev) return { ...st, plan: draft, nextPlan: null, helperNotes: [], lateItems: [] };
  return {
    ...st, plan: prev.plan, nextPlan: draft, pastWeeks: past.slice(0, -1),
    history: prev.history, lastWeek: prev.lastWeek, bought: prev.bought, shopSwaps: prev.shopSwaps ?? {}, shopNames: prev.shopNames ?? {},
    fruitDays: prev.fruitDays ?? [], lateItems: prev.lateItems ?? [], helperNotes: prev.helperNotes,
  };
}

/** Start again from week 1: every menu, shopping list and cooking progress goes, and new dishes are brought in from the start again.
 *  Family, ratings, recipes, photos, settings and the Kitchen tab are kept. */
export function restartWeeks(st: AppState): AppState {
  return {
    ...st, plan: null, nextPlan: null, pastWeeks: [], history: [], lastWeek: [], refreshCount: 0,
    bought: [], shopSwaps: {}, shopNames: {}, fruitDays: [], lateItems: [], helperNotes: [], cooking: {}, timers: [],
  };
}

/**
 * The owner's Menu tab while next week is a draft: the screen works on `nextPlan` as if it were the plan, with an empty
 * shopping list, and the sent week (and its shopping) is left alone. Sending the draft goes through sendNextWeek.
 */
export const draftView = (st: AppState): AppState => ({
  ...afterSentWeek(st), plan: st.nextPlan ?? null, bought: [], shopSwaps: {}, fruitDays: [], lateItems: [], helperNotes: [],
});
export function fromDraftView(st: AppState, v: AppState): AppState {
  const keep = { plan: st.plan, history: st.history, lastWeek: st.lastWeek, bought: st.bought, shopSwaps: st.shopSwaps, fruitDays: st.fruitDays, lateItems: st.lateItems, helperNotes: st.helperNotes, cooking: st.cooking, timers: st.timers };
  const merged = { ...v, ...keep };
  if (v.plan?.status === 'confirmed') return sendNextWeek(merged, v.plan);
  return { ...merged, nextPlan: v.plan };
}
