import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { DEMO_STATE } from './data/demo';
import { applyCustomRecipes } from './data/recipes';
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
 * Single app-wide store. Always saved on the phone; when the phone has joined a family,
 * also kept in step with everyone else's phones through Supabase (last change wins).
 */
export function StateProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(DEMO_STATE);
  const [family, setFamily] = useState<FamilyConfig | null>(null);
  const [sync, setSync] = useState<SyncStatus>('off');
  const loaded = useRef(false);
  /** the last state we know the server has, as stable JSON */
  const serverJson = useRef<string | null>(null);
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const me = useRef<string | null>(null);
  /** true once this phone has loaded the family's copy, so it never overwrites it with stale local data */
  const ready = useRef(false);

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

    const pull = async (first: boolean) => {
      const { data, error } = await sb.from('households').select('state, updated_by').eq('id', family.householdId).maybeSingle();
      if (gone) return;
      if (error || !data) { setSync('offline'); return; }
      if (data.state) {
        const json = stableJson(data.state);
        if (first || data.updated_by !== me.current) {
          serverJson.current = json;
          setState((prev) => (first ? keepLocalRecipes(prev, withDefaults(data.state)) : mergeKitchenLog(prev, withDefaults(data.state))));
        }
      } else {
        serverJson.current = null; // brand-new family: our next save fills it
      }
    };

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
            const row = p.new as { state: AppState | null; updated_by: string | null };
            if (!row.state || row.updated_by === me.current) return; // our own save coming back
            const json = stableJson(row.state);
            if (json === serverJson.current) return;
            serverJson.current = json;
            setState((prev) => mergeKitchenLog(prev, withDefaults(row.state!)));
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
    return () => {
      gone = true;
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
      const { error } = await sb.from('households')
        .update({ state: JSON.parse(json), updated_at: new Date().toISOString(), updated_by: me.current })
        .eq('id', family.householdId);
      if (!error) serverJson.current = json;
      setSync(error ? 'offline' : 'live');
    }, 600);
  }, [state, family, sync]);

  applyCustomRecipes(state.customRecipes, state.customItems);
  return (
    <Ctx.Provider value={{ state, update: (fn) => setState(fn), reset: () => setState(DEMO_STATE), family, setFamily, sync }}>
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
