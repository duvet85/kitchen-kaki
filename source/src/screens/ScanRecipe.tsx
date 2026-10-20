import React, { useState } from 'react';
import { ActivityIndicator, Image, Platform, View } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Draft, catalogueLines, normaliseDraft } from '../ai/draft';
import { useApp } from '../state';
import { FamilyError, scanViaFamily } from '../sync/family';
import { PhotoError, savePhoto } from '../sync/userPhotos';
import { Button, C, Chip, Notice, P, Row, Text } from '../ui';
import { Sheet } from './FamilyScreen';
import { AddRecipe } from './RecipeBook';

type Picked = { base64: string; mime: string; name: string; bytes: number; image: boolean };
const MAX_PDF = 5 * 1024 * 1024;
const WEB = Platform.OS === 'web';

/** Shrinks a picture so its text stays readable but the upload stays small (longest side 2000 px). */
export async function readable(uri: string, width?: number, height?: number): Promise<string> {
  const long = Math.max(width ?? 0, height ?? 0);
  const resize = long > 2000 ? [{ resize: (width ?? 0) >= (height ?? 0) ? { width: 2000 } : { height: 2000 } }] : [];
  const out = await ImageManipulator.manipulateAsync(uri, resize, { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG, base64: true });
  return out.base64 ?? '';
}

/** Web: the browser's own file picker (on a phone it offers the camera, photos and files). */
export const pickWeb = (camera: boolean) => new Promise<File | null>((done) => {
  const el = document.createElement('input');
  el.type = 'file';
  el.accept = camera ? 'image/*' : 'image/*,application/pdf';
  if (camera) el.setAttribute('capture', 'environment');
  el.onchange = () => done(el.files?.[0] ?? null);
  el.click();
});
export const dataUrl = (f: Blob) => new Promise<string>((ok, bad) => { const r = new FileReader(); r.onload = () => ok(String(r.result)); r.onerror = () => bad(r.error); r.readAsDataURL(f); });

/** Scan a recipe from a photo or a PDF: Gemini copies what it shows (never makes up steps), then the owner checks it before it joins the book. */
export default function ScanRecipe({ onClose }: { onClose: () => void }) {
  const { update, family } = useApp();
  const [file, setFile] = useState<Picked | null>(null);
  const [keep, setKeep] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);

  const choose = async (camera: boolean) => {
    setError(null);
    try {
      if (WEB) {
        const f = await pickWeb(camera);
        if (!f) return;
        const pdf = f.type === 'application/pdf' || /\.pdf$/i.test(f.name);
        if (pdf) {
          if (f.size > MAX_PDF) { setError('That PDF is over 5 MB. Scan or screenshot just the recipe page instead.'); return; }
          const b64 = (await dataUrl(f)).split(',')[1] ?? '';
          setFile({ base64: b64, mime: 'application/pdf', name: f.name, bytes: f.size, image: false });
        } else if (f.type.startsWith('image/')) {
          const b64 = await readable(await dataUrl(f));
          setFile({ base64: b64, mime: 'image/jpeg', name: f.name, bytes: Math.round(b64.length * 0.75), image: true });
        } else setError('Choose a photo or a PDF.');
        return;
      }
      const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1 };
      if (camera) { const p = await ImagePicker.requestCameraPermissionsAsync(); if (!p.granted) { setError('The camera is switched off for this app. Allow it in your phone settings.'); return; } }
      const res = camera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
      const a = res.canceled ? null : res.assets?.[0];
      if (!a) return;
      const b64 = await readable(a.uri, a.width, a.height);
      setFile({ base64: b64, mime: 'image/jpeg', name: 'photo', bytes: Math.round(b64.length * 0.75), image: true });
    } catch {
      setError("Couldn't open that file. Try another photo or PDF.");
    }
  };

  const scan = async () => {
    if (!file || !family) return;
    setBusy(true); setError(null);
    try {
      const raw = await scanViaFamily(family, file.base64, file.mime, catalogueLines());
      const d = normaliseDraft(raw, undefined, undefined, undefined, true);
      if (!d) { setError("No recipe with at least 2 ingredients was found in it. Try a clearer photo, with the whole recipe in view."); return; }
      setDraft({ ...d, recipe: { ...d.recipe, source: `Scanned from ${file.image ? 'a photo' : 'a PDF'} by the family (read by AI)` } });
    } catch (e) {
      setError(e instanceof FamilyError ? e.message : 'Reading the recipe failed. Try again.');
    } finally { setBusy(false); }
  };

  const saved = async (id: string) => {
    if (!keep || !file?.image) return;
    try {
      const pic = await savePhoto(id, { base64: file.base64, bytes: file.bytes }, family);
      update((st) => ({ ...st, userPhotos: { ...(st.userPhotos ?? {}), [id]: { ...pic, at: new Date().toISOString(), by: family?.myName } } }));
    } catch (e) { if (!(e instanceof PhotoError)) throw e; /* the recipe is saved; the photo can be added on the recipe later */ }
  };

  if (draft) return <AddRecipe initial={draft} onClose={onClose} onSaved={(id) => { void saved(id); }} />;

  return (
    <Sheet title="Scan a recipe" onClose={onClose}>
      <P style={{ color: C.muted, marginTop: 10 }}>Take a photo of a cookbook page or a handwritten recipe, or choose a screenshot or a PDF. Gemini copies the ingredients and steps it shows (and translates them to English), then you check everything before it joins the book.</P>
      {!family && <Notice tone="warn" icon="people-outline">Scanning needs family sharing (Supabase) switched on, because Gemini reads the picture there.</Notice>}
      <Row style={{ gap: 8, marginTop: 12 }}>
        <Button icon="camera" label="Take a photo" disabled={!family} onPress={() => choose(true)} />
        <Button kind="ghost" icon="document-attach-outline" label={WEB ? 'Choose a photo or PDF' : 'Choose a photo'} disabled={!family} onPress={() => choose(false)} />
      </Row>
      {file && (
        <View style={{ marginTop: 12 }}>
          {file.image
            ? <Image source={{ uri: `data:image/jpeg;base64,${file.base64}` }} accessibilityLabel="The picture to scan" resizeMode="contain" style={{ width: '100%', height: 260, borderRadius: 12, backgroundColor: C.line }} />
            : <Notice tone="brand" icon="document-text-outline">{`${file.name} (${Math.max(1, Math.round(file.bytes / 1024))} KB)`}</Notice>}
          {file.image && <Row style={{ marginTop: 8 }}><Chip icon={keep ? 'checkbox' : 'square-outline'} label="Also use this picture as the dish photo" selected={keep} onPress={() => setKeep(!keep)} /></Row>}
          <View style={{ marginTop: 12 }}>
            {busy ? <Row style={{ gap: 10 }}><ActivityIndicator color={C.brand} /><Text style={{ color: C.muted }}>Reading the recipe…</Text></Row>
              : <Button icon="scan-outline" label="Scan this recipe" onPress={scan} />}
          </View>
        </View>
      )}
      {error && <Notice tone="bad" icon="alert-circle">{error}</Notice>}
      <Text style={{ color: C.faint, fontSize: 12, marginTop: 10, lineHeight: 17 }}>Only the picture or PDF is sent to Gemini, nothing about your family. It never adds steps the page doesn't show. PDFs up to 5 MB; for a whole cookbook, scan just the recipe page.</Text>
    </Sheet>
  );
}
