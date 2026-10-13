import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { useApp } from '../state';
import { FamilyConfig, client } from './family';

/**
 * The family's own photos of dishes. Each photo is shrunk on the phone first (about 900px wide, JPEG, roughly 100 KB).
 * With a family set up it goes to the family's private Supabase Storage bucket "recipe-photos" (folder = the family's id,
 * readable only by family members) and every phone shows it through a short-lived signed link. Without a family it stays
 * on this phone only. The app state keeps just a small pointer (state.userPhotos).
 */
const BUCKET = 'recipe-photos';
const LOCAL = (id: string) => `kitchenkaki.photo.${id}`;
export const LOCAL_LIMIT = 40;
const MAX_BYTES = 450_000;

export class PhotoError extends Error {}

export interface Shrunk { base64: string; bytes: number }

/** Resizes and compresses a picked picture. Aims for under 450 KB, usually about 100 KB. */
export async function shrink(uri: string, width?: number): Promise<Shrunk> {
  let target = 900, quality = 0.7;
  for (let i = 0; i < 3; i++) {
    const actions = width && width <= target ? [] : [{ resize: { width: target } }];
    const out = await ImageManipulator.manipulateAsync(uri, actions, { compress: quality, format: ImageManipulator.SaveFormat.JPEG, base64: true });
    const base64 = out.base64 ?? '';
    const bytes = Math.round(base64.length * 0.75);
    if (base64 && bytes <= MAX_BYTES) return { base64, bytes };
    target = Math.round(target * 0.75);
    quality = Math.max(0.4, quality - 0.15);
  }
  throw new PhotoError('That picture is too big to shrink. Try another one.');
}

/** Opens the camera or the gallery and returns the shrunk picture, or null if the person cancelled. */
export async function pickPhoto(source: 'camera' | 'library'): Promise<Shrunk | null> {
  if (source === 'camera') {
    const p = await ImagePicker.requestCameraPermissionsAsync();
    if (!p.granted) throw new PhotoError('The camera is switched off for this app. Allow it in your phone settings, or choose from the gallery.');
  } else {
    const p = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!p.granted && p.accessPrivileges !== 'limited') throw new PhotoError('Photos are switched off for this app. Allow them in your phone settings.');
  }
  const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 1 };
  const res = source === 'camera' ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
  if (res.canceled || !res.assets?.[0]) return null;
  const a = res.assets[0];
  return shrink(a.uri, a.width);
}

const bytesOf = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
const signed = new Map<string, { url: string; exp: number }>();
const memo = new Map<string, string>();

/** Stores the photo (family storage if there is a family, else this phone) and returns the pointer to keep in the app state. */
export async function savePhoto(recipeId: string, b: Shrunk, family: FamilyConfig | null, old?: { path?: string }): Promise<{ path?: string }> {
  if (!family) {
    const keys = (await AsyncStorage.getAllKeys().catch(() => [] as readonly string[])).filter((k) => k.startsWith('kitchenkaki.photo.') && k !== LOCAL(recipeId));
    if (keys.length >= LOCAL_LIMIT) throw new PhotoError(`This phone keeps up to ${LOCAL_LIMIT} of your own photos. Remove one first, or set up family sharing to keep them online.`);
    await AsyncStorage.setItem(LOCAL(recipeId), `data:image/jpeg;base64,${b.base64}`);
    memo.delete(recipeId);
    return {};
  }
  const sb = client(family.url, family.key);
  const path = `${family.householdId}/${recipeId}-${Date.now()}.jpg`;
  const { error } = await sb.storage.from(BUCKET).upload(path, bytesOf(b.base64), { contentType: 'image/jpeg', upsert: false });
  if (error) {
    if (/bucket.*not found/i.test(error.message)) throw new PhotoError('The photo storage isn\'t set up in Supabase yet. Run the new schema.sql (SQL Editor) once, then try again.');
    throw new PhotoError('The photo could not be saved online. Check your connection and try again.');
  }
  if (old?.path) void sb.storage.from(BUCKET).remove([old.path]);
  return { path };
}

export async function deletePhoto(recipeId: string, family: FamilyConfig | null, old?: { path?: string }) {
  memo.delete(recipeId);
  await AsyncStorage.removeItem(LOCAL(recipeId)).catch(() => undefined);
  if (family && old?.path) await client(family.url, family.key).storage.from(BUCKET).remove([old.path]).catch(() => undefined);
}

/** The picture to show for a dish: the family's own photo (when one is set and not switched to stock), else null. */
export function usePhotoUri(recipeId: string): string | null {
  const { state, family } = useApp();
  const meta = state.userPhotos?.[recipeId];
  const [uri, setUri] = useState<string | null>(null);
  const key = meta && !meta.stock ? `${meta.path ?? 'local'}|${meta.at}` : '';
  useEffect(() => {
    let live = true;
    if (!key || !meta) { setUri(null); return; }
    (async () => {
      if (meta.path) {
        const hit = signed.get(meta.path);
        if (hit && hit.exp > Date.now()) { setUri(hit.url); return; }
        if (!family) { setUri(null); return; }
        const { data } = await client(family.url, family.key).storage.from(BUCKET).createSignedUrl(meta.path, 3600);
        if (data?.signedUrl) { signed.set(meta.path, { url: data.signedUrl, exp: Date.now() + 50 * 60 * 1000 }); if (live) setUri(data.signedUrl); } else if (live) setUri(null);
      } else {
        const cached = memo.get(recipeId) ?? (await AsyncStorage.getItem(LOCAL(recipeId))) ?? undefined;
        if (cached) memo.set(recipeId, cached);
        if (live) setUri(cached ?? null);
      }
    })().catch(() => live && setUri(null));
    return () => { live = false; };
  }, [key, family?.householdId]); // eslint-disable-line react-hooks/exhaustive-deps
  return key ? uri : null;
}
