/**
 * The Gemini models the app prefers, best first. The app reads the key's own models list and only tries ids the key
 * really has (src/ai/modelPick.ts), then any other stable flash models the key lists, newest first, so an id that does
 * not exist for the key is never called. If the list can't be read, these well-known ids are tried as they are; the
 * "latest" names are aliases Google keeps pointing at a current model. If one is over its quota (429), busy (5xx, retried
 * first) or not allowed for the key, the next one is tried. Update this list in ONE place, and keep the same list in
 * supabase/functions/translate/index.ts (it can't import this file).
 */
export const GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-flash-latest',
  'gemini-2.5-flash-lite',
  'gemini-flash-lite-latest',
] as const;

export const MODELS_CHECKED = '2026-10-13';
