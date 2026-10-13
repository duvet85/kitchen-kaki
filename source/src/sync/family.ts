import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SupabaseClient, createClient } from '@supabase/supabase-js';

/**
 * Family sharing through the owner's own Supabase project (free tier).
 * One "household" row holds the whole app state as JSON; every phone in the
 * family signs in anonymously and joins with an invite code.
 */
export type Role = 'owner' | 'parent' | 'helper';
export interface FamilyConfig {
  url: string;
  /** Supabase publishable (anon) key: designed to be public, safe on phones */
  key: string;
  householdId: string;
  role: Role;
  myName: string;
  userId: string;
}
export interface Member { user_id: string; name: string; role: Role }

export class FamilyError extends Error {}

const CFG = 'kitchenkaki.family';

export const loadConfig = async (): Promise<FamilyConfig | null> => {
  const raw = await AsyncStorage.getItem(CFG).catch(() => null);
  return raw ? JSON.parse(raw) : null;
};
const saveConfig = (c: FamilyConfig) => AsyncStorage.setItem(CFG, JSON.stringify(c));

let cached: { url: string; key: string; sb: SupabaseClient } | null = null;
export function client(url: string, key: string): SupabaseClient {
  if (cached && cached.url === url && cached.key === key) return cached.sb;
  const sb = createClient(url, key, {
    auth: { storage: AsyncStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: 'kitchenkaki.auth' },
  });
  cached = { url, key, sb };
  return sb;
}

/** Each phone gets its own anonymous sign-in, kept on the phone. */
export async function signedIn(sb: SupabaseClient): Promise<string> {
  const { data } = await sb.auth.getSession();
  if (data.session) return data.session.user.id;
  const { data: d, error } = await sb.auth.signInAnonymously();
  if (error || !d.user) {
    if (/anonymous/i.test(error?.message ?? '')) throw new FamilyError('Turn on "Allow anonymous sign-ins" in Supabase (Authentication > Sign In / Providers).');
    if (/fetch|network/i.test(error?.message ?? '')) throw new FamilyError("Couldn't reach Supabase. Check the project URL and the internet connection.");
    throw new FamilyError(error?.message ?? 'Sign-in failed.');
  }
  return d.user.id;
}

const cleanUrl = (u: string) => {
  let url = u.trim().replace(/\/+$/, '').replace(/\/rest\/v1$/, '');
  if (/^[a-z0-9]{20}$/i.test(url)) url = `https://${url}.supabase.co`;
  if (!/^https?:\/\//.test(url)) url = `https://${url}`;
  return url;
};

function explain(e: { message?: string; code?: string } | null): FamilyError {
  const m = e?.message ?? '';
  if (/create_household|join_household|schema cache|does not exist/i.test(m)) return new FamilyError('The Kitchen Kaki tables are missing. Run schema.sql in the Supabase SQL Editor first.');
  if (/family exists/i.test(m)) return new FamilyError('This Supabase project already has a family. Join it with an invite instead.');
  if (/invalid code/i.test(m)) return new FamilyError("That invite code didn't work. Ask for a new one.");
  if (/Invalid API key|JWT|apikey/i.test(m)) return new FamilyError('Supabase rejected the key. Copy the publishable (anon) key again.');
  return new FamilyError(m || 'Something went wrong with Supabase.');
}

export async function createFamily(urlIn: string, key: string, familyName: string, myName: string, state: unknown): Promise<FamilyConfig> {
  const url = cleanUrl(urlIn);
  const sb = client(url, key.trim());
  const userId = await signedIn(sb);
  const { data, error } = await sb.rpc('create_household', { p_family: familyName, p_name: myName, p_state: state });
  if (error) throw explain(error);
  const cfg: FamilyConfig = { url, key: key.trim(), householdId: data as string, role: 'owner', myName, userId };
  await saveConfig(cfg);
  return cfg;
}

export async function joinFamily(inviteText: string, myName: string): Promise<FamilyConfig> {
  const inv = decodeInvite(inviteText);
  if (!inv) throw new FamilyError("That doesn't look like a Kitchen Kaki invite. Paste the whole message.");
  const sb = client(inv.u, inv.k);
  const userId = await signedIn(sb);
  const { data, error } = await sb.rpc('join_household', { p_code: inv.c, p_name: myName });
  if (error) throw explain(error);
  const row = (data as { household_id: string; role: Role }[])[0];
  const cfg: FamilyConfig = { url: inv.u, key: inv.k, householdId: row.household_id, role: row.role, myName, userId };
  await saveConfig(cfg);
  return cfg;
}

export async function leaveFamily(cfg: FamilyConfig) {
  const sb = client(cfg.url, cfg.key);
  const { data } = await sb.auth.getSession();
  if (data.session) await sb.from('household_members').delete().eq('household_id', cfg.householdId).eq('user_id', data.session.user.id);
  await sb.auth.signOut().catch(() => {});
  await AsyncStorage.removeItem(CFG);
}

export async function familyInfo(cfg: FamilyConfig) {
  const sb = client(cfg.url, cfg.key);
  const [h, m, i] = await Promise.all([
    sb.from('households').select('name').eq('id', cfg.householdId).maybeSingle(),
    sb.from('household_members').select('user_id,name,role').eq('household_id', cfg.householdId).order('joined_at'),
    cfg.role === 'helper' ? Promise.resolve({ data: null }) : sb.from('household_invites').select('parent_code,helper_code').eq('household_id', cfg.householdId).maybeSingle(),
  ]);
  return {
    name: (h.data?.name as string) ?? 'Our family',
    members: (m.data ?? []) as Member[],
    codes: i.data as { parent_code: string; helper_code: string } | null,
  };
}

export async function removeMember(cfg: FamilyConfig, userId: string) {
  const { error } = await client(cfg.url, cfg.key).rpc('remove_member', { p_household: cfg.householdId, p_user: userId });
  if (error) throw explain(error);
}

export async function resetInvites(cfg: FamilyConfig) {
  const { error } = await client(cfg.url, cfg.key).rpc('reset_invites', { p_household: cfg.householdId });
  if (error) throw explain(error);
}

/* Invites carry the project URL, the publishable key and the code, so a new phone needs nothing else. */
const b64 = (s: string) => btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64 = (s: string) => atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4));

export const encodeInvite = (cfg: FamilyConfig, code: string) => `KK1.${b64(JSON.stringify({ u: cfg.url, k: cfg.key, c: code }))}`;

export function decodeInvite(text: string): { u: string; k: string; c: string } | null {
  const m = text.match(/KK1\.([A-Za-z0-9_-]+)/);
  if (!m) return null;
  try {
    const v = JSON.parse(unb64(m[1]));
    return typeof v?.u === 'string' && typeof v?.k === 'string' && typeof v?.c === 'string' ? v : null;
  } catch {
    return null;
  }
}

/** JSON with sorted keys, so two copies of the same state compare equal whatever order Postgres stored them in. */
export function stableJson(v: unknown): string {
  return JSON.stringify(v, (_k, x) => (x && typeof x === 'object' && !Array.isArray(x)
    ? Object.keys(x).sort().reduce((o, k) => { o[k] = x[k]; return o; }, {} as Record<string, unknown>)
    : x));
}

/** Translation through the family's Edge Function; the Gemini key stays in Supabase. */
export const translateViaFamily = (cfg: FamilyConfig, body: { name: string; steps: string[]; lang: string }) =>
  callGemini<{ name: string; steps: string[] }>(cfg, body);

/** "Ask Kitchen Kaki": Gemini's reply and proposed edits for a message and the menu, through the same function. */
export const kakiViaFamily = (cfg: FamilyConfig, text: string, ctx: import('../ai/kaki').KakiContext) =>
  callGemini<import('../ai/kaki').KakiRaw>(cfg, { mode: 'kaki', text, ctx });

/** "Ask Kitchen Kaki": structured reading of a message, through the same function. */
export const understandViaFamily = (cfg: FamilyConfig, text: string) =>
  callGemini<import('../ai/gemini').UnderstandRaw>(cfg, { mode: 'understand', text });

/** Recipe draft through the same function. Only the dish text and the grocery list are sent. */
export const draftViaFamily = async (cfg: FamilyConfig, text: string, catalogue: string[], caption = false) => {
  const out = await callGemini<import('../ai/draft').RawDraft & { captionMode?: boolean }>(cfg, { mode: 'draft', text, catalogue, ...(caption ? { caption: true } : {}) });
  // an older function ignores "caption" and would write steps of its own, so refuse its answer
  if (caption && !out.captionMode) throw new FamilyError('The translate function in Supabase is an older version, and it would make up steps the caption does not have. Paste the new code into it and Deploy again.');
  return out;
};

/** Reads a recipe from a web link (the function fetches the page; no Gemini needed). Only the link is sent. */
export const importViaFamily = (cfg: FamilyConfig, url: string) =>
  callGemini<import('../ai/importMap').Imported>(cfg, { mode: 'import', url });

/** Web recipe search through the same function (Google Search grounding). Only the search text is sent. */
export const searchViaFamily = (cfg: FamilyConfig, query: string) =>
  callGemini<import('../ai/search').Grounded>(cfg, { mode: 'search', query });

/** "Test Gemini": which models the key in Supabase can call, and whether text and web search work. Sends only fixed test prompts. */
export const testViaFamily = (cfg: FamilyConfig) =>
  callGemini<import('../ai/modelPick').GeminiReport>(cfg, { mode: 'check' });

/** Cooking lesson picks and tips through the same function. Only dish text (already filtered on the phone) is sent. */
export const lessonViaFamily = (cfg: FamilyConfig, dishes: import('../ai/lessonPlan').LessonCandidate[], lang: string) =>
  callGemini<import('../ai/lessonPlan').RawLessonPlan>(cfg, { mode: 'lesson', dishes, lang });

async function callGemini<T>(cfg: FamilyConfig, body: object): Promise<T> {
  const sb = client(cfg.url, cfg.key);
  const { data, error } = await sb.functions.invoke('translate', { body });
  if (!error) return data;
  let code = '', detail = '';
  try { const j = await (error as { context?: Response }).context?.json(); code = j?.error ?? ''; detail = j?.detail ?? ''; } catch { /* not JSON */ }
  const status = (error as { context?: Response }).context?.status;
  const msg: Record<string, string> = {
    no_key: 'Add the Gemini key in Supabase: Edge Functions > Secrets > GEMINI_API_KEY.',
    gemini_key: 'Google rejected the Gemini key saved in Supabase.',
    search_unavailable: "Web search needs billing on your Google key. Google Search isn't included in the free Gemini plan (with billing on, a monthly allowance is free, then it costs). Drafting a recipe from its name works on the free plan.",
    quota: 'The free Gemini limit is used up on every model for now. Try again later.',
    bad_url: "That doesn't look like a public web page link. Paste the full address, starting with https://",
    site_blocked: "That website doesn't let apps read its pages. Open the page, copy the recipe text and paste it into \"Add a recipe\" instead.",
    page_not_found: "That page wasn't found. Check the link and try again.",
    page_unreachable: "Couldn't reach that website. Check the link, or try again in a moment.",
    not_html: "That link isn't a web page (it may be a PDF or a video). Paste the recipe text instead.",
    too_big: "That page is too big to read. Paste the recipe text instead.",
    not_in_family: 'This phone is not in the family any more.',
    not_signed_in: 'Sign-in expired. Reopen the app and try again.',
  };
  if (msg[code]) throw new FamilyError(msg[code]);
  if (status === 404 || /FunctionsRelayError|not found/i.test(error.message)) throw new FamilyError('The "translate" function isn\'t set up in Supabase yet.');
  if (status === 401) throw new FamilyError('Supabase refused the call. Untick "Verify JWT" on the translate function.');
  if (code === 'gemini' && detail) throw new FamilyError(`No Gemini model answered (${detail}). Tap "Test Gemini" in Settings to see what the key can do.`);
  if ((body as { mode?: string }).mode === 'import' && (status === 400 || code === 'bad_request' || code === 'no_key')) throw new FamilyError('The translate function in Supabase is an older version and cannot import links yet. Paste the new code into it and Deploy again.');
  if ((code === 'bad_request' || status === 400) && ['check', 'kaki'].includes((body as { mode?: string }).mode ?? '')) throw new FamilyError('The translate function in Supabase is an older version. Paste the new code into it and Deploy again.');
  throw new FamilyError('Gemini call failed. Try again.');
}
