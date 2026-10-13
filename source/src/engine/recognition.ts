import { BADGES, BadgeKey, OPPOSITE, RANKS, TIP_TEXT, isPraise, tk } from '../i18n-kitchen';
import { methodOf } from '../data/methods';
import { RECIPES, recipeById } from '../data/recipes';
import { AppState, KitchenEvent, Lang, Recipe, TipTag } from '../types';
import { dishKey } from './planner';

/*
 * Recognition for the helper: thanks, tips, mastered dishes, points, ranks and badges.
 * Points are never stored, only worked out from the kitchen log, so taking back an event
 * (undone) fixes the total by itself. Nothing ever takes points away.
 */

export const POINTS = { mastered: 50, lesson: 30, newDish: 10, onTime: 2, fullWeek: 15, thanks: 5 } as const;
/** thank-you notes that count for points per day; more still arrive, without points */
export const THANKS_PER_DAY = 3;
const LOG_MAX = 1500;

export const helperOf = (st: AppState) => st.recognition?.helper?.trim() || 'Helper';
/** "Aini", or "your helper" before the owner has given her name. */
export const helperName = (st: AppState) => st.recognition?.helper?.trim() || 'your helper';
export const recognitionOn = (st: AppState) => !!st.recognition?.on;

/** This helper's events that still count. */
export const logOf = (st: AppState): KitchenEvent[] => {
  const h = helperOf(st);
  return (st.kitchenLog ?? []).filter((e) => e.helper === h && !e.undone);
};

export const isThanks = (e: KitchenEvent) => e.kind === 'thanks' || (e.kind === 'tip' && (e.tags ?? []).some(isPraise));

export function points(st: AppState): number {
  const perDay = new Map<string, number>();
  let total = 0;
  for (const e of [...logOf(st)].sort((a, b) => a.at.localeCompare(b.at))) {
    if (isThanks(e)) {
      const d = e.at.slice(0, 10);
      const n = perDay.get(d) ?? 0;
      perDay.set(d, n + 1);
      if (n < THANKS_PER_DAY) total += POINTS.thanks;
    } else if (e.kind in POINTS) {
      total += POINTS[e.kind as keyof typeof POINTS];
    }
  }
  return total;
}

export function rankOf(pts: number) {
  let i = 0;
  while (i + 1 < RANKS.length && pts >= RANKS[i + 1].from) i++;
  const next = RANKS[i + 1];
  return {
    index: i, rank: RANKS[i], next,
    toNext: next ? next.from - pts : 0,
    progress: next ? (pts - RANKS[i].from) / (next.from - RANKS[i].from) : 1,
  };
}

/** Mastered dishes: recipe id -> the event that confirmed it. */
export function masteredMap(st: AppState): Map<string, KitchenEvent> {
  const out = new Map<string, KitchenEvent>();
  for (const e of logOf(st)) if (e.kind === 'mastered' && e.recipeId && RECIPES.some((r) => r.id === e.recipeId)) out.set(e.recipeId, e);
  return out;
}
export const isMastered = (st: AppState, recipeId: string) => masteredMap(st).has(recipeId);

/** Dishes she has cooked: past menus, this week's ticked dishes, lessons and anything already logged. */
export function cookedSet(st: AppState): Set<string> {
  const ids = new Set<string>(st.history);
  for (const k of st.plan?.cooked ?? []) ids.add(k.split('@')[0]);
  for (const e of logOf(st)) if (e.recipeId && e.kind !== 'thanks' && e.kind !== 'tip') ids.add(e.recipeId);
  return new Set([...ids].filter((id) => RECIPES.some((r) => r.id === id)));
}

export function badges(st: AppState): BadgeKey[] {
  const log = logOf(st);
  const mastered = [...masteredMap(st).keys()].map(recipeById);
  const count = (f: (r: Recipe) => boolean) => mastered.filter(f).length;
  const has: Record<BadgeKey, boolean> = {
    firstLesson: log.some((e) => e.kind === 'lesson'),
    soups: count((r) => methodOf(r) === 'soup') >= 3,
    slow: count((r) => ['steam', 'braise'].includes(methodOf(r))) >= 3,
    wok: count((r) => methodOf(r) === 'stirfry') >= 3,
    favourite: mastered.some((r) => st.ratings[r.id] === 5),
    explorer: log.filter((e) => e.kind === 'newDish').length >= 10,
    steady: log.filter((e) => e.kind === 'fullWeek').length >= 4,
    cuisines: new Set(mastered.map((r) => r.cuisine)).size >= 3,
    thanked: log.filter(isThanks).length >= 25,
  };
  return (Object.keys(BADGES) as BadgeKey[]).filter((k) => has[k]);
}

/** Ranks and badges she hasn't been congratulated on yet (shown once, on her screen). */
export function newCelebrations(st: AppState) {
  const seen = new Set(st.recognition?.seen ?? []);
  const r = rankOf(points(st));
  const out: { key: string; rank?: number; badge?: BadgeKey }[] = [];
  if (r.index > 0 && !seen.has(`rank:${r.index}`)) out.push({ key: `rank:${r.index}`, rank: r.index });
  for (const b of badges(st)) if (!seen.has(`badge:${b}`)) out.push({ key: `badge:${b}`, badge: b });
  return out;
}
export const markSeen = (st: AppState, keys: string[]): AppState =>
  ({ ...st, recognition: { ...(st.recognition ?? { on: false, helper: '' }), seen: [...new Set([...(st.recognition?.seen ?? []), ...keys])] } });

function push(st: AppState, e: Omit<KitchenEvent, 'helper' | 'at'> & { at?: string }): AppState {
  const ev: KitchenEvent = { at: new Date().toISOString(), helper: helperOf(st), ...e };
  return { ...st, kitchenLog: [...(st.kitchenLog ?? []), ev].slice(-LOG_MAX) };
}

/** Owner confirms she has mastered a dish. Only for dishes she has cooked (a finished lesson counts). */
export function markMastered(st: AppState, recipeId: string, via: 'lesson' | 'cooked' | 'check', by: string | undefined, newId: () => string): AppState {
  if (isMastered(st, recipeId)) return st;
  return push(st, { id: newId(), kind: 'mastered', recipeId, via, by });
}

/** Takes back one event (thanks sent by mistake, mastery confirmed too early). */
export const undoEvent = (st: AppState, id: string): AppState =>
  ({ ...st, kitchenLog: (st.kitchenLog ?? []).map((e) => (e.id === id ? { ...e, undone: true } : e)) });

/** The helper's own rating of how sure she feels; 0 clears it. */
export const setConfidence = (st: AppState, recipeId: string, n: number): AppState => {
  const { [recipeId]: _old, ...rest } = st.confidence ?? {};
  return { ...st, confidence: n ? { ...rest, [recipeId]: n } : rest };
};

/**
 * Thanks and tips about a dish (or general thanks, without a dish). The helper reads it in her language.
 * "Remember" keeps the tips on the dish so she sees them each time she cooks it; a new tip replaces its opposite.
 */
export function sendFeedback(st: AppState, f: { recipeId?: string; tags: TipTag[]; note?: string; noteTr?: Partial<Record<Lang, string>>; by?: string; remember?: boolean }, newId: () => string): AppState {
  const fixes = f.tags.filter((x) => !isPraise(x));
  let next = push(st, { id: newId(), kind: fixes.length ? 'tip' : 'thanks', recipeId: f.recipeId, tags: f.tags, note: f.note, noteTr: f.noteTr, by: f.by });
  if (f.recipeId && f.remember && fixes.length) {
    const old = (next.dishTweaks?.[f.recipeId] ?? []).filter((x) => !fixes.some((n) => OPPOSITE[n] === x));
    next = { ...next, dishTweaks: { ...(next.dishTweaks ?? {}), [f.recipeId]: [...new Set([...old, ...fixes])] } };
  }
  return next;
}

export function clearTweak(st: AppState, recipeId: string, tag: TipTag): AppState {
  const left = (st.dishTweaks?.[recipeId] ?? []).filter((x) => x !== tag);
  const { [recipeId]: _gone, ...rest } = st.dishTweaks ?? {};
  return { ...st, dishTweaks: left.length ? { ...rest, [recipeId]: left } : rest };
}

export const tipSeen = (st: AppState, id: string): AppState =>
  ({ ...st, kitchenLog: (st.kitchenLog ?? []).map((e) => (e.id === id ? { ...e, seen: true } : e)) });

/** Open tips about a dish she hasn't tapped "Got it" on, newest first. */
export const openTips = (st: AppState, recipeId?: string) =>
  logOf(st).filter((e) => e.kind === 'tip' && !e.seen && (!recipeId || e.recipeId === recipeId)).reverse();

/** What a thanks or tip says, in her language. */
export function feedbackText(e: KitchenEvent, lang: Lang) {
  return {
    lines: (e.tags ?? []).map((x) => TIP_TEXT[x][lang]),
    note: e.note ? (lang !== 'en' && e.noteTr?.[lang]) || e.note : undefined,
    noteTranslated: !!(e.note && lang !== 'en' && e.noteTr?.[lang]),
  };
}

/** YYYY-MM-DD in the phone's own time zone (toISOString would give the UTC date, a day early in Singapore before 8am). */
export const localDate = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
/**
 * True when `now` is the planned weekday of this menu's week. Compares weekdays rather than dates, because
 * weekOf can be a day off in time zones ahead of UTC (it is built with toISOString).
 */
export function onPlannedDay(weekOf: string, day: number, now = new Date()) {
  const [y, m, d] = weekOf.split('-').map(Number);
  const days = (now.getTime() - new Date(y, m - 1, d).getTime()) / 86400000;
  return (now.getDay() + 6) % 7 === day && days > -2 && days < 9;
}
/** The date of day n (0 = Monday) of the week starting on `weekOf`, worked out in local time. */
export function dateOfDay(weekOf: string, n: number) {
  const [y, m, d] = weekOf.split('-').map(Number);
  return localDate(new Date(y, m - 1, d + n));
}

/**
 * Called when a planned dish is marked cooked (key = recipe@day). Saves the time, and logs
 * a first-time dish, a dish cooked on its planned day, and a whole week cooked.
 */
export function recordCooked(st: AppState, key: string, newId: () => string, now = new Date()): AppState {
  if (!st.plan) return st;
  const recipeId = key.split('@')[0];
  const day = Number(key.split('@')[1]);
  let next: AppState = { ...st, plan: { ...st.plan, cookedAt: { ...(st.plan.cookedAt ?? {}), [key]: now.toISOString() } } };
  const log = logOf(st);
  if (!st.history.includes(recipeId) && !log.some((e) => e.kind === 'newDish' && e.recipeId === recipeId)) {
    next = push(next, { id: newId(), kind: 'newDish', recipeId, dish: key, weekOf: st.plan.weekOf });
  }
  if (!Number.isNaN(day) && onPlannedDay(st.plan.weekOf, day, now)
    && !log.some((e) => e.kind === 'onTime' && e.dish === key && e.weekOf === st.plan!.weekOf)) {
    next = push(next, { id: newId(), kind: 'onTime', recipeId, dish: key, weekOf: st.plan.weekOf });
  }
  const plan = next.plan!;
  const cooked = new Set([...plan.cooked, key]);
  const all = plan.status === 'confirmed' && plan.dishes.length > 0 && plan.dishes.every((d) => cooked.has(dishKey(d)) || cooked.has(d.recipeId));
  if (all && !log.some((e) => e.kind === 'fullWeek' && e.weekOf === plan.weekOf)) {
    next = push(next, { id: newId(), kind: 'fullWeek', weekOf: plan.weekOf });
  }
  return next;
}

/** Dishes on this week's menu that are cooked, newest first. */
export function cookedThisWeek(st: AppState) {
  const plan = st.plan;
  if (!plan) return [];
  return plan.dishes
    .filter((d) => plan.cooked.includes(dishKey(d)) || plan.cooked.includes(d.recipeId))
    .map((d) => ({ dish: d, recipe: recipeById(d.recipeId), at: plan.cookedAt?.[dishKey(d)] }))
    .sort((a, b) => (b.at ?? '').localeCompare(a.at ?? '') || b.dish.day - a.dish.day);
}

/** Dishes she rated 4 or 5 that nobody has confirmed as mastered yet. */
export const awaitingConfirm = (st: AppState) =>
  Object.entries(st.confidence ?? {}).filter(([id, n]) => n >= 4 && !isMastered(st, id) && RECIPES.some((r) => r.id === id)).map(([id]) => recipeById(id));

/** A plain-text record she can keep when she moves on. */
export function recordText(st: AppState, lang: Lang) {
  const pts = points(st);
  const r = rankOf(pts);
  const mastered = [...masteredMap(st).keys()].map((id) => recipeById(id));
  const b = badges(st).map((k) => `${BADGES[k].icon} ${BADGES[k].name[lang]}`);
  return [
    `${helperOf(st)} · Kitchen Kaki`,
    `${r.rank.name[lang]} · ${pts} ${tk('points', lang)}`,
    '',
    `${tk('mastered', lang)}: ${mastered.map((m) => (lang === 'en' ? m.name : m.i18n?.[lang]?.name ?? m.name)).join(', ') || '-'}`,
    `${tk('badges', lang)}: ${b.join(', ') || '-'}`,
    `${tk('thanksHead', lang)}: ${logOf(st).filter(isThanks).length}`,
    '',
    localDate(),
  ].join('\n');
}

/**
 * Two phones can add thanks or tips at the same moment. The rest of the family state is "last change wins",
 * but the kitchen log only ever grows, so a copy arriving from another phone keeps this phone's newer events.
 */
export function mergeKitchenLog(mine: AppState, theirs: AppState): AppState {
  const a = mine.kitchenLog ?? [];
  if (!a.length) return theirs;
  const byId = new Map((theirs.kitchenLog ?? []).map((e) => [e.id, e]));
  for (const e of a) {
    const t = byId.get(e.id);
    byId.set(e.id, t ? { ...t, undone: t.undone || e.undone, seen: t.seen || e.seen } : e);
  }
  return { ...theirs, kitchenLog: [...byId.values()].sort((x, y) => x.at.localeCompare(y.at)).slice(-LOG_MAX) };
}
