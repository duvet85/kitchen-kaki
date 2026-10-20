import { mergePrices } from './engine/prices';
import { setCookLabel } from './cook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState as AppStateRN } from 'react-native';
import { DEMO_STATE } from './data/demo';
import { applyCustomRecipes } from './data/recipes';
import { applyPrices } from './data/store';
import { FamilyConfig, client, loadConfig, signedIn, stableJson } from './sync/family';
import { AppState } from './types';
import { mergeKitchenLog } from './engine/recognition';

const KEY = 'makan-helper/state/v2';

export type SyncStatus = 'off' | 'connecting' | 'live' | 'offline';
type Updater = (s: AppState) => AppState;
type Ctx = {
  state: AppState;
  update: (fn: Updater) => void;
  reset: () => void;
  family: FamilyConfig | null;
  setFamily: (f: FamilyConfig | null) => void;
  sync: SyncStatus;
};
const Ctx = createContext<Ctx | null>(null);

const withDefaults = (s: Partial<AppState>): AppState => ({ ...DEMO_STATE, ...s });

/** On start-up the family's copy replaces this phone's. Recipes added here that never reached it (offline, or the save was cut short) are kept, so they are not lost. */
function keepLocalRecipes(local: AppState, server: AppState): AppState {
  const have = new Set((server.customRecipes ?? []).map((r) => r.id));
  const lost = (local.customRecipes ?? []).filter((r) => !have.has(r.id));
  if (!lost.length) return server;
  return { ...server, customRecipes: [...(server.customRecipes ?? []), ...lost], customItems: { ...(local.customItems ?? {}), ...(server.customItems ?? {}) } };
}

/**
 * Two phones changed the family copy: keep what this phone changed since it last saw the family's copy (by top-level part,
 * e.g. the cook's ticked shopping) and take everything else from the newer family copy (e.g. the menu the owner just sent).
 */
export function mergeChanges(mine: AppState, was: AppState | null, theirs: AppState): AppState {
  if (!was) return theirs;
  const out: Record<string, unknown> = { ...theirs };
  const m = mine as unknown as Record<string, unknown>, w = was as unknown as Record<string, unknown>;
  for (const k of Object.keys(m)) if (stableJson(m[k]) !== stableJson(w[k])) out[k] = m[k];
  // prices are added on several phones over the weeks: keep everyone's, not just the last phone's
  if (stableJson(mine.prices) !== stableJson(was.prices) && stableJson(theirs.prices) !== stableJson(was.prices)) out.prices = mergePrices(mine.prices, was.prices, theirs.prices);
  return out as unknown as AppState;
}

/**
 * Single app-wide store. Always saved on the phone; when the phone has joined a family,
 * also kept in step with everyone else's phones through Supabase (last change wins).
 */
export function StateProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(DEMO_STATE);
  setCookLabel(state.settings.cookLabel);
  const [family, setFamily] = useState<FamilyConfig | null>(null);
  const [sync, setSync] = useState<SyncStatus>('off');
  const loaded = useRef(false);
  /** the last state we know the server has, as stable JSON */
  const serverJson = useRef<string | null>(null);
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const me = useRef<string | null>(null);
  /** the family copy as we last saw it (the base for merging) and its updated_at stamp */
  const base = useRef<AppState | null>(null);
  const stamp = useRef<string | null>(null);
  /** true once this phone has loaded the family's copy, so it never overwrites it with stale local data */
  const ready = useRef(false);
  const pullRef = useRef<(() => Promise<boolean>) | null>(null);

  useEffect(() => {
    Promise.all([AsyncStorage.getItem(KEY).catch(() => null), loadConfig().catch(() => null)])
      .then(([raw, cfg]) => {
        if (raw) setState(withDefaults(JSON.parse(raw)));
        if (cfg) setFamily(cfg);
      })
      .finally(() => (loaded.current = true));
  }, []);

  // Connect to the family's shared copy and listen for changes from other phones.
  useEffect(() => {
    if (!family) { setSync('off'); serverJson.current = null; return; }
    let gone = false;
    ready.current = false;
    const sb = client(family.url, family.key);
    setSync('connecting');

    /** true when the family copy had changed */
    const pull = async (first: boolean): Promise<boolean> => {
      if (!first && stamp.current) {
        // a cheap look first: only download the whole copy when someone saved since
        const { data: s } = await sb.from('households').select('updated_at').eq('id', family.householdId).maybeSingle();
        if (gone || (s && s.updated_at === stamp.current)) return false;
      }
      const { data, error } = await sb.from('households').select('state, updated_by, updated_at').eq('id', family.householdId).maybeSingle();
      if (gone) return false;
      if (error || !data) { setSync('offline'); return false; }
      if (!first && data.updated_at === stamp.current) return false; // nothing new
      stamp.current = data.updated_at ?? null;
      if (data.state) {
        const server = withDefaults(data.state);
        const was = base.current;
        serverJson.current = stableJson(data.state);
        base.current = server;
        setState((prev) => (first ? keepLocalRecipes(prev, server) : mergeKitchenLog(prev, mergeChanges(prev, was, server))));
      } else {
        serverJson.current = null; // brand-new family: our next save fills it
      }
      return true;
    };
    pullRef.current = () => pull(false);

    let channel: ReturnType<typeof sb.channel> | null = null;
    (async () => {
      try {
        me.current = await signedIn(sb);
        await pull(true);
        if (gone) return;
        ready.current = true;
        setState((s) => ({ ...s }));
        channel = sb
          .channel(`household-${family.householdId}`)
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'households', filter: `id=eq.${family.householdId}` }, (p) => {
            const row = p.new as { updated_at?: string };
            // Read the row again rather than trusting the message: Supabase leaves big values out of it.
            if (row.updated_at !== stamp.current) void pull(false);
          })
          .subscribe((status) => {
            if (gone) return;
            if (status === 'SUBSCRIBED') { setSync('live'); pull(false); }
            else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') setSync('offline');
          });
      } catch {
        if (!gone) setSync('offline');
      }
    })();
    // A phone that was asleep, or a Safari tab in the background, misses live updates: look again when the app is back on screen,
    // and every 30 seconds while it is open.
    const onShow = () => { if (ready.current && (typeof document === 'undefined' || document.visibilityState !== 'hidden')) void pull(false); };
    const tick = setInterval(onShow, 30000);
    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('focus', onShow); window.addEventListener('online', onShow); document.addEventListener('visibilitychange', onShow);
    }
    const appSub = AppStateRN.addEventListener('change', (s) => { if (s === 'active') onShow(); });
    return () => {
      gone = true;
      clearInterval(tick); appSub.remove();
      if (typeof window !== 'undefined' && window.removeEventListener) {
        window.removeEventListener('focus', onShow); window.removeEventListener('online', onShow); document.removeEventListener('visibilitychange', onShow);
      }
      if (channel) sb.removeChannel(channel);
    };
  }, [family]);

  useEffect(() => {
    if (!loaded.current) return;
    AsyncStorage.setItem(KEY, JSON.stringify(state)).catch(() => {});
    if (!family || !me.current || !ready.current) return;
    const json = stableJson(state);
    if (json === serverJson.current) return;
    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(async () => {
      const sb = client(family.url, family.key);
      const at = new Date().toISOString();
      // Only save over the copy this phone last saw. If another phone saved in between (the owner sent a menu while the cook's
      // app was open), fetch theirs and merge first, so an old copy never wipes out a newer one.
      let q = sb.from('households').update({ state: JSON.parse(json), updated_at: at, updated_by: me.current }).eq('id', family.householdId);
      if (stamp.current) q = q.eq('updated_at', stamp.current);
      const { data, error } = await q.select('updated_at');
      if (error) { setSync('offline'); return; }
      if (!data?.length) {
        // someone else saved first: merging their copy changes the state, which saves again
        const changed = await pullRef.current?.();
        if (!changed) setSync('offline');
        return;
      }
      serverJson.current = json;
      stamp.current = (data[0] as { updated_at?: string }).updated_at ?? at;
      base.current = JSON.parse(json);
      setSync('live');
    }, 600);
  }, [state, family, sync]);

  applyCustomRecipes(state.customRecipes, state.customItems);
  applyPrices(state.prices);
  return (
    <Ctx.Provider value={{ state, update: (fn) => setState(fn), reset: () => setState(DEMO_STATE), family, setFamily, sync }}>
      {children}
    </Ctx.Provider>
  );
}

/** Shows the screens inside it a different view of the state (`view`), and folds their changes back in (`back`). */
export function StateLens({ view, back, children }: { view: (s: AppState) => AppState; back: (s: AppState, v: AppState) => AppState; children: React.ReactNode }) {
  const outer = useApp();
  return (
    <Ctx.Provider value={{ ...outer, state: view(outer.state), update: (fn) => outer.update((s) => back(s, fn(view(s)))) }}>
      {children}
    </Ctx.Provider>
  );
}

export function useApp() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useApp outside StateProvider');
  return c;
}

export const newId = () => Math.random().toString(36).slice(2, 9);
