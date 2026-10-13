/**
 * The Gemini models the app prefers, best first. Only the ones that appear in the key's own models list are
 * tried, followed by any other stable flash models the key has, newest first (src/ai/modelPick.ts), so an id
 * that doesn't exist for the key is never called. If one is over its quota (429), busy (5xx) or not allowed
 * for the key, the next one is tried. Update this list in ONE place, and keep
 * the same list in supabase/functions/translate/index.ts (it can't import this file).
 *
 * Checked on 2026-10-13 against ai.google.dev (models and pricing pages): these are the stable text models
 * with a free tier. The older 2.5 models are kept as last resorts; the page calls them legacy but not
 * deprecated. Preview models are left out because Google shuts them down without much notice, and the
 * 2.0 models are listed as shut down.
 */
export const GEMINI_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
] as const;

export const MODELS_CHECKED = '2026-10-13';
