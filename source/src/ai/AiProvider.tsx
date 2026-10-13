import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { checkKey } from './gemini';

/**
 * The owner's Gemini key lives only on this device: the iOS Keychain / Android Keystore
 * on phones, browser storage in the web preview. It is kept out of the app state
 * (and out of any backup or sync of that state) and only ever sent to Google.
 */
const KEY = 'kitchenkaki.geminiKey';
const MODEL = 'kitchenkaki.geminiModel';
const web = Platform.OS === 'web';

const store = {
  get: (k: string) => (web ? AsyncStorage.getItem(k) : SecureStore.getItemAsync(k)),
  set: (k: string, v: string) => (web ? AsyncStorage.setItem(k, v) : SecureStore.setItemAsync(k, v)),
  del: (k: string) => (web ? AsyncStorage.removeItem(k) : SecureStore.deleteItemAsync(k)),
};

type Ai = {
  key: string | null;
  model: string | null;
  /** checks the key with Google, then saves it; throws GeminiError if it doesn't work */
  save: (key: string) => Promise<void>;
  remove: () => Promise<void>;
};

const Ctx = createContext<Ai>({ key: null, model: null, save: async () => {}, remove: async () => {} });

export function AiProvider({ children }: { children: React.ReactNode }) {
  const [key, setKey] = useState<string | null>(null);
  const [model, setModel] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([store.get(KEY), store.get(MODEL)])
      .then(([k, m]) => { setKey(k); setModel(m); })
      .catch(() => {});
  }, []);

  const save = async (raw: string) => {
    const k = raw.trim();
    const m = await checkKey(k);
    await store.set(KEY, k);
    await store.set(MODEL, m);
    setKey(k);
    setModel(m);
  };
  const remove = async () => {
    await Promise.all([store.del(KEY), store.del(MODEL)]).catch(() => {});
    setKey(null);
    setModel(null);
  };

  return <Ctx.Provider value={{ key, model, save, remove }}>{children}</Ctx.Provider>;
}

export const useAi = () => useContext(Ctx);

/** "AIza…x7Qk": enough to recognise the key without showing it. */
export const maskKey = (k: string) => (k.length > 10 ? `${k.slice(0, 4)}••••••••${k.slice(-4)}` : '••••••••');
