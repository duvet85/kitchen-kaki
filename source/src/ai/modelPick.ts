/**
 * Which Gemini models to try, worked out from the models the key can actually see (Google's models list),
 * so ids that don't exist for the key are never tried. Pure, so it can be tested; the Edge Function keeps
 * a copy of the same rules (it can't import this file).
 */

/** Stable text models only: gemini-<version>-flash or -flash-lite. Previews and experiments are left out. */
export const STABLE_FLASH = /^gemini-\d+(\.\d+)?-flash(-lite)?$/;
export const MAX_TRIED = 6;

const version = (id: string) => parseFloat(id.match(/^gemini-(\d+(?:\.\d+)?)/)?.[1] ?? '0');

/**
 * The order to try models in. `available` is the key's models list (null if it couldn't be read).
 * Preferred models the key has come first, in the preferred order; then any other stable flash models the key
 * has, newest first, full flash before lite. If the list couldn't be read, or has nothing usable, the preferred
 * list is used as it is, so a real error from Google still comes back.
 */
export function orderModels(preferred: readonly string[], available: string[] | null): string[] {
  if (!available) return [...preferred].slice(0, MAX_TRIED);
  const have = new Set(available);
  const known = preferred.filter((m) => have.has(m));
  const extra = available
    .filter((m) => STABLE_FLASH.test(m) && !preferred.includes(m))
    .sort((a, b) => version(b) - version(a) || Number(a.endsWith('-lite')) - Number(b.endsWith('-lite')) || a.localeCompare(b));
  const out = [...known, ...extra].slice(0, MAX_TRIED);
  return out.length ? out : [...preferred].slice(0, MAX_TRIED);
}

/** The model ids in a models-list reply that can generate text. */
export function textModels(list: { models?: { name: string; supportedGenerationMethods?: string[] }[] }): string[] {
  return (list.models ?? [])
    .filter((m) => m.supportedGenerationMethods?.includes('generateContent'))
    .map((m) => m.name.replace(/^models\//, ''))
    .filter((m) => m.startsWith('gemini-'));
}

/** Google's own reason for a failed call, short enough to show. */
export function googleReason(status: number, body: string): string {
  let msg = '';
  try {
    const e = JSON.parse(body)?.error;
    msg = [e?.status, e?.message].filter(Boolean).join(': ');
  } catch { msg = body; }
  msg = msg.replace(/\s+/g, ' ').replace(/AIza[0-9A-Za-z_-]{10,}/g, '[key]').trim();
  return `${status}${msg ? ` ${msg.slice(0, 160)}` : ''}`;
}

/** Busy or temporarily unavailable on Google's side: worth another try on the same model. */
export const isBusy = (status: number) => status === 500 || status === 502 || status === 503 || status === 504;

/** One model's result in a "Test Gemini" run. */
export interface ModelTry { model: string; ok: boolean; status: number; why?: string }

/** What "Test Gemini" found. */
export interface GeminiReport {
  /** text models the key can see, or null if Google's list couldn't be read */
  available: string[] | null;
  /** why the list couldn't be read, when it couldn't */
  listError?: string;
  /** the order the app will try */
  order: string[];
  text: ModelTry[];
  /** web search (Google Search grounding), tried on the first model that answered text; null if none did */
  search: (ModelTry & { links: number }) | null;
}

/** Plain words for one result, for the Settings screen. */
export function statusWords(t: ModelTry): string {
  if (t.ok) return 'works';
  if (t.status === 404) return 'not available for this key';
  if (t.status === 429) return 'over its limit right now';
  if (t.status === 400 || t.status === 403) return 'not allowed for this key';
  if (t.status >= 500) return 'Google was busy';
  if (t.status === 0) return "couldn't reach Google";
  return `error ${t.status}`;
}

/** The one-line verdict for web search. */
export function searchWords(r: GeminiReport): string {
  if (!r.text.some((t) => t.ok)) return "Not tested, because no model answered a plain text request.";
  if (!r.search) return 'Not tested.';
  if (r.search.ok && r.search.links > 0) return `Works (${r.search.model}, ${r.search.links} links found).`;
  if (r.search.ok) return `Answered, but sent back no web links (${r.search.model}). Try a search in the recipe book.`;
  if (r.search.status === 429 || r.search.status === 400 || r.search.status === 403) {
    return 'Needs billing. Web search (Google Search grounding) isn\'t in the free Gemini plan, so turn on billing for the key in Google AI Studio to use it. Drafting a recipe from a dish name still works.';
  }
  return `Failed: ${statusWords(r.search)}.`;
}
