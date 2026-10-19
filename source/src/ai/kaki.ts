import { CATALOGUE } from '../data/store';
import { recipeById } from '../data/recipes';
import { mealFor } from '../data/categories';
import { eligibleRecipes, isCooked, isSoup, startDateOf, weekdayOfPlanDay } from '../engine/planner';
import { AppState } from '../types';
import { todayIndex } from '../engine/hiccup';

/**
 * "Ask Kitchen Kaki", the Gemini way: Gemini reads the message and the week's menu, writes Kaki's reply and proposes concrete edits.
 * The same prompt is in supabase/functions/translate/index.ts (mode "kaki"); change both together.
 * What is sent: the message, the dish names and ingredients on the menu, the dishes the app has already filtered as fine for the family,
 * and shop item names. Never names, allergies, health or religion. Gemini only proposes; the app checks every edit and the owner confirms.
 */
export const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

export interface KakiContext {
  today: string;
  menu: { day: string; dishes: { id: string; name: string; spice: number; ingredients: { item: string; name: string }[] }[] }[];
  candidates: { id: string; name: string; protein: string; cuisine: string; spice: number; minutes: number; soup: boolean; vegetarian: boolean }[];
  catalogue: string[];
  kitchen: string[];
}

export function kakiContext(state: AppState, now = new Date()): KakiContext {
  const plan = state.plan;
  const days = plan ? [...new Set(plan.dishes.map((d) => d.day))].sort((a, b) => a - b) : [];
  const ti = plan ? todayIndex(startDateOf(plan), now) : 0;
  return {
    today: DAY_KEYS[plan ? weekdayOfPlanDay(plan, Math.min(6, Math.max(0, ti))) : (now.getDay() + 6) % 7],
    menu: days.map((day) => ({
      day: DAY_KEYS[weekdayOfPlanDay(plan, day)],
      dishes: plan!.dishes.filter((d) => d.day === day && !isCooked(plan!, d)).map((d) => {
        const r = recipeById(d.recipeId);
        return { id: r.id, name: r.name, spice: r.spice, ingredients: r.ingredients.map((i) => ({ item: i.item, name: CATALOGUE[i.item]?.name ?? i.item })) };
      }),
    })).filter((m) => m.dishes.length),
    // Only dishes the app already allows for this family: the family's allergies and rules never leave the phone.
    candidates: eligibleRecipes(state).ok.filter((r) => !mealFor(r, state)).map((r) => ({
      id: r.id, name: r.name, protein: r.protein, cuisine: r.cuisine, spice: r.spice, minutes: r.minutes, soup: isSoup(r), vegetarian: r.vegetarian,
    })),
    catalogue: Object.entries(CATALOGUE).map(([k, v]) => `${k} = ${v.name}`),
    kitchen: state.bought.slice(0, 200),
  };
}

export const kakiPrompt = (text: string, ctx: KakiContext) => [
  "You are Kitchen Kaki, a warm, practical kitchen helper for a Singapore family and their domestic helper. They sent a message about this week's planned home dinners. Reply as Kaki and propose the exact edits the app should make.",
  'The menu lists only dishes not yet cooked, by day. Candidates are the dishes the app already knows are fine for this family. Use ONLY dish ids from these lists and ingredient keys from the catalogue. Never invent ids, keys or days.',
  'Edits (actions):',
  '- add: put a candidate dish (dish = its id) on a day.',
  '- swap: replace a dish on the menu (dish = its id on that day) with a candidate (to = its id).',
  '- remove: take a dish (dish = its id on that day) off the menu.',
  '- adapt: cook a dish on the menu differently, as the family\'s own adapted copy (dish = its id on that day). Use it for "less spicy", "no chilli", "no prawns in this dish", "lighter", "use tofu instead". Give: spice (0 none, 1 mild, 2 medium, 3 hot; use -1 for unchanged), replace (catalogue key from to catalogue key, for an ingredient to swap), drop (catalogue keys to leave out), steps (the full rewritten steps, 4 to 14 short plain steps, ONLY if the method changes, otherwise leave empty), note (one short line on what changed, e.g. "no chilli, steamed not fried").',
  'Rules: if someone names a weekday, change only that day. "today" and "tomorrow" are relative to the given today. Prefer changes that use ingredients already in the kitchen and need nothing extra to buy. Never put in a dish the person is avoiding. If someone WANTS an ingredient or dish, that is an add, not an avoidance. Keep to at most 6 edits. If you cannot or should not edit anything (thanks, a question, extra guests, cost), return no actions and say what to do in the reply.',
  'reply: 1 to 3 short, friendly sentences in Kaki\'s voice saying what you would change and why, for example "Can! I\'ll make Thursday\'s curry mild with the chilli on the side." The owner confirms before anything is changed, so never say it is already done.',
  '',
  `Today: ${ctx.today}`,
  `Menu: ${JSON.stringify(ctx.menu)}`,
  `Candidates: ${JSON.stringify(ctx.candidates)}`,
  `Already bought: ${JSON.stringify(ctx.kitchen)}`,
  `Catalogue (key = name):\n${ctx.catalogue.join('\n')}`,
  '',
  `Message: ${JSON.stringify(text)}`,
].join('\n');

export const KAKI_SCHEMA = {
  type: 'OBJECT',
  properties: {
    reply: { type: 'STRING' },
    actions: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          type: { type: 'STRING', enum: ['add', 'swap', 'remove', 'adapt'] },
          day: { type: 'STRING', enum: [...DAY_KEYS] },
          dish: { type: 'STRING' },
          to: { type: 'STRING' },
          spice: { type: 'INTEGER' },
          replace: { type: 'ARRAY', items: { type: 'OBJECT', properties: { from: { type: 'STRING' }, to: { type: 'STRING' } }, required: ['from', 'to'] } },
          drop: { type: 'ARRAY', items: { type: 'STRING' } },
          steps: { type: 'ARRAY', items: { type: 'STRING' } },
          note: { type: 'STRING' },
        },
        required: ['type', 'day', 'dish'],
      },
    },
  },
  required: ['reply', 'actions'],
};

export interface KakiRaw {
  reply?: unknown;
  actions?: { type?: unknown; day?: unknown; dish?: unknown; to?: unknown; spice?: unknown; replace?: unknown; drop?: unknown; steps?: unknown; note?: unknown }[];
}
