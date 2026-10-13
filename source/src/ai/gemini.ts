import { Platform } from 'react-native';
import { KAKI_SCHEMA, KakiContext, KakiRaw, kakiPrompt } from './kaki';
import { UNDERSTAND_SCHEMA, understandPrompt } from './understand';
import { Lang, Recipe, Translation } from '../types';
import { DRAFT_PROMPT, DRAFT_SCHEMA, RawDraft, catalogueLines } from './draft';
import { GEMINI_MODELS } from './models';
import { GeminiReport, ModelTry, googleReason, orderModels, textModels } from './modelPick';
import { Grounded, SEARCH_PROMPT } from './search';

/**
 * Direct calls to Google's Gemini API with the owner's own key.
 * Only recipe text is sent: never names, health conditions or allergies.
 * A shipped app should route these through a small backend that holds the key.
 */
const API = 'https://generativelanguage.googleapis.com/v1beta';

export const LANG_NAME: Record<Exclude<Lang, 'en'>, string> = {
  tl: 'Tagalog (Filipino)',
  id: 'Bahasa Indonesia',
  my: 'Burmese (Myanmar script, Unicode)',
};

export class GeminiError extends Error {}

async function call<T>(key: string, path: string, body?: unknown, rejected = 'Google rejected this key. Check it was copied in full.'): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API}/${path}`, {
      method: body ? 'POST' : 'GET',
      headers: { 'x-goog-api-key': key, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new GeminiError(Platform.OS === 'web'
      ? "Couldn't reach Google. Check the internet connection. Some browser previews block outside calls; the phone app doesn't."
      : "Couldn't reach Google. Check the internet connection.");
  }
  if (res.status === 400 || res.status === 401 || res.status === 403) throw new GeminiError(rejected);
  if (res.status === 429) throw new GeminiError('The free Gemini limit is used up for now. Try again later.');
  if (!res.ok) throw new GeminiError(`Gemini returned an error (${res.status}).`);
  return res.json() as Promise<T>;
}


/** Models that just failed for quota or availability are skipped for a while, so every call doesn't wait on them. */
const cooling = new Map<string, number>();

/** The key's own models list, read once and kept for half an hour, so ids the key can't use are never tried. */
let listed: { key: string; at: number; ids: string[] | null } | null = null;
async function modelOrder(key: string): Promise<string[]> {
  if (!listed || listed.key !== key || Date.now() - listed.at > 30 * 60 * 1000) {
    let ids: string[] | null = null;
    try {
      const res = await fetch(`${API}/models?pageSize=1000`, { headers: { 'x-goog-api-key': key } });
      if (res.ok) ids = textModels(await res.json());
    } catch { /* offline: fall back to the fixed list */ }
    listed = { key, at: Date.now(), ids };
  }
  return orderModels(GEMINI_MODELS, listed.ids);
}

const unreachable = () => new GeminiError(Platform.OS === 'web'
  ? "Couldn't reach Google. Check the internet connection. Some browser previews block outside calls; the phone app doesn't."
  : "Couldn't reach Google. Check the internet connection.");

async function post(key: string, model: string, body: unknown): Promise<Response> {
  try {
    return await fetch(`${API}/models/${model}:generateContent`, {
      method: 'POST', headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
  } catch {
    throw unreachable();
  }
}

const isKeyRejected = (status: number, text: string) => status === 401 || (status === 400 && /API key not valid|API_KEY_INVALID/i.test(text));

/**
 * Runs one generateContent request against the models the key has, best first.
 * Unavailable, over quota, busy or not allowed for this key: try the next model.
 * A key Google rejects outright stops at once. `cool` is off for web search, whose limits are separate
 * from plain text, so a search refusal doesn't hold back translations.
 */
export async function generateAny<T>(key: string, body: unknown, rejected?: string, cool = true): Promise<{ data: T; model: string }> {
  const now = Date.now();
  const all = await modelOrder(key);
  const live = all.filter((m) => (cooling.get(m) ?? 0) < now);
  const order = live.length ? live : all;
  const seen: number[] = [];
  const why: string[] = [];
  for (const m of order) {
    const res = await post(key, m, body);
    if (res.ok) return { data: (await res.json()) as T, model: m };
    const text = await res.text().catch(() => '');
    if (isKeyRejected(res.status, text)) throw new GeminiError('Google rejected this key. Check it was copied in full.');
    seen.push(res.status);
    why.push(`${m}: ${googleReason(res.status, text)}`);
    if (cool && (res.status === 429 || res.status === 404)) cooling.set(m, Date.now() + 10 * 60 * 1000);
  }
  if (rejected && seen.every((c) => c === 400 || c === 403)) throw new GeminiError(rejected);
  if (seen.every((c) => c === 429)) throw new GeminiError('The free Gemini limit is used up on every model for now. Try again later.');
  console.warn('Gemini: no model answered', why);
  throw new GeminiError(`No Gemini model answered (tried ${order.join(', ')}; Google said ${[...new Set(seen)].join(', ')}). Tap "Test Gemini" in Settings to see what this key can do.`);
}

const PING = { contents: [{ role: 'user', parts: [{ text: 'Reply with the single word OK.' }] }], generationConfig: { temperature: 0, maxOutputTokens: 20 } };
const SEARCH_PING = {
  contents: [{ role: 'user', parts: [{ text: 'Use Google Search to find one recipe page for Hainanese chicken rice. Reply with its title only.' }] }],
  tools: [{ google_search: {} }], generationConfig: { temperature: 0 },
};

/** "Test Gemini": which models this key can call, and whether plain text and web search each work. Sends only the fixed test prompts. */
export async function testGemini(key: string): Promise<GeminiReport> {
  let available: string[] | null = null;
  const res = await fetch(`${API}/models?pageSize=1000`, { headers: { 'x-goog-api-key': key } }).catch(() => { throw unreachable(); });
  const listText = await res.text().catch(() => '');
  if (isKeyRejected(res.status, listText) || res.status === 403) throw new GeminiError('Google rejected this key. Check it was copied in full.');
  if (res.ok) { try { available = textModels(JSON.parse(listText)); } catch { /* unreadable list */ } }
  listed = { key, at: Date.now(), ids: available };
  const order = orderModels(GEMINI_MODELS, available);
  const text: ModelTry[] = [];
  for (const m of order) {
    const r = await post(key, m, PING);
    const body = r.ok ? '' : await r.text().catch(() => '');
    text.push(r.ok ? { model: m, ok: true, status: 200 } : { model: m, ok: false, status: r.status, why: googleReason(r.status, body) });
    if (r.ok) cooling.delete(m);
  }
  const first = text.find((t) => t.ok);
  let search: GeminiReport['search'] = null;
  if (first) {
    const r = await post(key, first.model, SEARCH_PING);
    if (r.ok) {
      const d = await r.json().catch(() => ({}));
      const links = (d?.candidates?.[0]?.groundingMetadata?.groundingChunks ?? []).length;
      search = { model: first.model, ok: true, status: 200, links };
    } else {
      search = { model: first.model, ok: false, status: r.status, why: googleReason(r.status, await r.text().catch(() => '')), links: 0 };
    }
  }
  return { available, order, text, search };
}

type ModelList = { models?: { name: string; supportedGenerationMethods?: string[] }[] };

/** Checks the key with Google and returns the first model the app will try (from the key's own models list). */
export async function checkKey(key: string): Promise<string> {
  const data = await call<ModelList>(key, 'models?pageSize=1000');
  const ids = textModels(data);
  if (!ids.length) throw new GeminiError('This key has no Gemini text models available.');
  listed = { key, at: Date.now(), ids };
  return orderModels(GEMINI_MODELS, ids)[0];
}

type GenerateResponse = { candidates?: { content?: { parts?: { text?: string }[] } }[] };

/** Translates a recipe's name and steps for the helper. */
export async function translateRecipe(key: string, r: Recipe, lang: Exclude<Lang, 'en'>): Promise<Translation> {
  const prompt = [
    `Translate this home-cooking recipe into ${LANG_NAME[lang]} for a domestic helper in Singapore.`,
    'Use simple everyday words. Keep local dish and ingredient names that helpers already know (for example "tau pok", "kangkung", "belacan"), adding a short explanation in brackets if needed.',
    `Return exactly ${r.steps.length} steps, in the same order, one per input step. Keep every number, time and quantity.`,
    '',
    JSON.stringify({ name: r.name, steps: r.steps }),
  ].join('\n');
  const { data } = await generateAny<GenerateResponse>(key, {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: { name: { type: 'STRING' }, steps: { type: 'ARRAY', items: { type: 'STRING' } } },
        required: ['name', 'steps'],
      },
    },
  });
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
  let out: Translation;
  try {
    out = JSON.parse(text);
  } catch {
    throw new GeminiError('Gemini sent back something unreadable. Try again.');
  }
  if (!out?.name || !Array.isArray(out.steps) || out.steps.length !== r.steps.length) {
    throw new GeminiError('Gemini skipped some steps. Try again.');
  }
  return { name: String(out.name), steps: out.steps.map(String) };
}

export type UnderstandRaw = { intent?: string; want?: string[]; needs: string[]; missing: string[]; day?: string; scope: string };

/** "Ask Kitchen Kaki": turn a message into what is wanted (see ./understand). Only the message is sent. */
export async function understandMessage(key: string, text: string): Promise<UnderstandRaw> {
  const { data } = await generateAny<GenerateResponse>(key, {
    contents: [{ role: 'user', parts: [{ text: understandPrompt(text) }] }],
    generationConfig: { temperature: 0.1, responseMimeType: 'application/json', responseSchema: UNDERSTAND_SCHEMA },
  });
  const text2 = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
  try {
    return JSON.parse(text2);
  } catch {
    throw new GeminiError('Gemini sent back something unreadable. Try again.');
  }
}

/** "Ask Kitchen Kaki": Gemini reads the message and the menu, writes Kaki's reply and proposes edits (see ./kaki). The app checks them and the owner confirms. */
export async function kakiMessage(key: string, text: string, ctx: KakiContext): Promise<KakiRaw> {
  const { data } = await generateAny<GenerateResponse>(key, {
    contents: [{ role: 'user', parts: [{ text: kakiPrompt(text, ctx) }] }],
    generationConfig: { temperature: 0.2, responseMimeType: 'application/json', responseSchema: KAKI_SCHEMA },
  });
  const out = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
  try {
    return JSON.parse(out);
  } catch {
    throw new GeminiError('Gemini sent back something unreadable. Try again.');
  }
}

/** Drafts a recipe from a dish name or pasted recipe text. Only that text and the grocery list go to Google. */
export async function draftRecipeText(key: string, text: string, caption = false): Promise<RawDraft> {
  const { data } = await generateAny<GenerateResponse>(key, {
    contents: [{ role: 'user', parts: [{ text: DRAFT_PROMPT(text, catalogueLines(), caption) }] }],
    generationConfig: { temperature: 0.3, responseMimeType: 'application/json', responseSchema: DRAFT_SCHEMA },
  });
  const out = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
  try {
    return JSON.parse(out);
  } catch {
    throw new GeminiError('Gemini sent back something unreadable. Try again.');
  }
}

export const SEARCH_OFF = "Web search needs billing on your Google key. Google Search isn't included in the free Gemini plan (with billing on, a monthly allowance is free, then it costs). Drafting a recipe from its name works on the free plan.";

/** Searches the web for recipe pages. The links come from Google's grounding data, not from the model's text. */
export async function searchRecipesGrounded(key: string, query: string): Promise<Grounded> {
  type Res = { candidates?: { content?: { parts?: { text?: string }[] }; groundingMetadata?: {
    groundingChunks?: { web?: { uri?: string; title?: string } }[];
    groundingSupports?: { segment?: { startIndex?: number; endIndex?: number }; groundingChunkIndices?: number[] }[];
  } }[] };
  let data: Res;
  try {
    ({ data } = await generateAny<Res>(key, {
      contents: [{ role: 'user', parts: [{ text: SEARCH_PROMPT(query) }] }],
      tools: [{ google_search: {} }],
      generationConfig: { temperature: 0.3 },
    }, SEARCH_OFF, false));
  } catch (e) {
    // Every model refused the search. If plain text still works, the refusal is web search itself (not in the free plan).
    if (e instanceof GeminiError && e.message !== SEARCH_OFF && !/rejected this key|reach Google/.test(e.message)) {
      const textWorks = await generateAny(key, PING).then(() => true, () => false);
      if (textWorks) throw new GeminiError(SEARCH_OFF);
    }
    throw e;
  }
  const cand = data.candidates?.[0];
  const meta = cand?.groundingMetadata;
  return {
    text: cand?.content?.parts?.map((p) => p.text ?? '').join('') ?? '',
    chunks: (meta?.groundingChunks ?? []).map((c) => ({ uri: c.web?.uri ?? '', title: c.web?.title ?? '' })),
    supports: (meta?.groundingSupports ?? []).map((s) => ({ start: s.segment?.startIndex ?? 0, end: s.segment?.endIndex ?? 0, indices: s.groundingChunkIndices ?? [] })),
  };
}
