/**
 * What Gemini is asked when Ask Kaki's own rules do not understand a message. The same text is in
 * supabase/functions/translate/index.ts (mode "understand"); change both together.
 * Only the message goes to Google. Gemini never changes the menu: it only reads the message, and the owner confirms any change.
 */
export const UNDERSTAND_INTENTS = ['adjust', 'add', 'remove', 'swap', 'guests', 'cheaper', 'spicier', 'festival', 'fasting', 'thanks', 'unclear'] as const;

export const understandPrompt = (text: string) => [
  "A family in Singapore sent this message to a meal-planning helper about the week's planned home dinners. Work out what they want.",
  'intent: "add" = they want a dish ADDED (e.g. "I want to add a prawn dish on Thursday", "can we have curry on Friday"); "adjust" = something changed and dishes may need swapping (someone unwell, short of time, an ingredient missing or not bought, no chilli, vegetarian); "remove" = they want a dish taken off; "swap" = they want one dish changed for something else; "guests" = extra people coming; "cheaper" = spend less; "spicier" = more chilli; "festival" = a festival or party meal; "fasting" = fasting; "thanks" = thanks or chit-chat; "unclear" = you cannot tell.',
  'want: for "add" or "swap", the foods they ask FOR, as short plain words (e.g. ["prawn"]). A food they want is NEVER put in missing.',
  'missing: ingredients they do not have or could not buy (e.g. "no prawns", "kangkong sold out"), as short plain words. Only for things they LACK.',
  'needs: any of "light" (someone is unwell or wants bland, easy-to-digest food), "quick" (short on time), "vegetarian", "mild" (no chilli).',
  'day: the weekday they name ("mon" to "sun"), or "none". If a weekday is named, only that day is meant.',
  'scope: "today", "tomorrow", "rest" (rest of the week) or "unspecified".',
  'Read the message literally. Do not invent needs or missing items that the message does not say.',
  '',
  `Message: ${JSON.stringify(text)}`,
].join('\n');

export const UNDERSTAND_SCHEMA = {
  type: 'OBJECT',
  properties: {
    intent: { type: 'STRING', enum: [...UNDERSTAND_INTENTS] },
    want: { type: 'ARRAY', items: { type: 'STRING' } },
    needs: { type: 'ARRAY', items: { type: 'STRING', enum: ['light', 'quick', 'vegetarian', 'mild'] } },
    missing: { type: 'ARRAY', items: { type: 'STRING' } },
    day: { type: 'STRING', enum: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun', 'none'] },
    scope: { type: 'STRING', enum: ['today', 'tomorrow', 'rest', 'unspecified'] },
  },
  required: ['intent', 'want', 'needs', 'missing', 'day', 'scope'],
};
