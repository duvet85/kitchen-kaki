import React, { useState } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { CATALOGUE } from '../data/store';
import { addPrices } from '../engine/prices';
import { t } from '../i18n';
import { qtyLabel } from '../i18n-units';
import { useApp } from '../state';
import { FamilyError, RawReceipt, receiptViaFamily } from '../sync/family';
import { Lang } from '../types';
import { Button, C, Icon, Notice, Row, Text } from '../ui';
import { Sheet } from './FamilyScreen';
import { dataUrl, pickWeb, readable } from './ScanRecipe';

type Found = { item: string; text: string; price: number; on: boolean };

/** Keeps only lines that name an item on this list, once each, with a sensible price. Gemini's matching is checked, never trusted. */
export function receiptMatches(raw: RawReceipt, items: string[]): { found: Found[]; other: number } {
  const want = new Set(items);
  const seen = new Set<string>();
  const found: Found[] = [];
  let other = 0;
  for (const l of Array.isArray(raw.lines) ? raw.lines : []) {
    const item = typeof l.item === 'string' ? l.item.trim() : '';
    const price = typeof l.price === 'number' ? Math.round(l.price * 100) / 100 : NaN;
    const text = typeof l.text === 'string' ? l.text.slice(0, 60) : '';
    if (!want.has(item) || seen.has(item) || !Number.isFinite(price) || price <= 0 || price > 500) { other++; continue; }
    seen.add(item);
    found.push({ item, text, price, on: true });
  }
  return { found, other };
}

/** Scan a shop receipt: Gemini reads the printed prices, the app keeps the ones for items on this week's list, and the person checks them before saving. */
export default function ScanReceipt({ items, lang, onClose }: { items: string[]; lang: Lang; onClose: () => void }) {
  const { update, family } = useApp();
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ found: Found[]; other: number; shop?: string } | null>(null);

  const choose = async (camera: boolean) => {
    setError(null); setResult(null);
    try {
      if (Platform.OS === 'web') {
        const f = await pickWeb(camera);
        if (!f) return;
        if (!f.type.startsWith('image/')) { setError('Choose a photo of the receipt.'); return; }
        setPhoto(await readable(await dataUrl(f)));
        return;
      }
      const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1 };
      if (camera) { const p = await ImagePicker.requestCameraPermissionsAsync(); if (!p.granted) { setError('The camera is switched off for this app. Allow it in your phone settings.'); return; } }
      const res = camera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
      const a = res.canceled ? null : res.assets?.[0];
      if (a) setPhoto(await readable(a.uri, a.width, a.height));
    } catch {
      setError("Couldn't open that photo. Try another one.");
    }
  };

  const scan = async () => {
    if (!photo || !family) return;
    setBusy(true); setError(null);
    try {
      const lines = items.map((k) => `${k} = ${CATALOGUE[k]?.name ?? k}, ${CATALOGUE[k]?.pack ?? ''}`);
      const raw = await receiptViaFamily(family, photo, 'image/jpeg', lines);
      const m = receiptMatches(raw, items);
      setResult({ ...m, shop: typeof raw.shop === 'string' ? raw.shop.slice(0, 40) : undefined });
    } catch (e) {
      setError(e instanceof FamilyError ? e.message : "Couldn't read the receipt. Try again.");
    } finally { setBusy(false); }
  };

  const save = () => {
    if (!result) return;
    const picked = result.found.filter((f) => f.on);
    update((st) => ({ ...st, prices: addPrices(st.prices, picked.map((f) => ({ item: f.item, price: f.price, by: family?.myName, via: 'receipt' as const }))) }));
    onClose();
  };

  const toggle = (item: string) => setResult((r) => (r ? { ...r, found: r.found.map((f) => (f.item === item ? { ...f, on: !f.on } : f)) } : r));
  const n = result?.found.filter((f) => f.on).length ?? 0;

  return (
    <Sheet title={t('scanReceipt', lang)} onClose={onClose}>
      <Text style={{ color: C.muted, marginTop: 8, lineHeight: 20 }}>Gemini reads the prices printed on the receipt and matches them to this shopping list. You check them before anything is saved. Only the photo and the list's item names are sent.</Text>
      {!family && <Notice tone="warn" icon="people-outline">Scanning needs family sharing (Supabase) switched on, because Gemini reads the photo there.</Notice>}
      <Row style={{ gap: 8, marginTop: 12 }}>
        <Button icon="camera" label={t('takePhoto', lang)} disabled={!family} onPress={() => choose(true)} />
        <Button kind="ghost" icon="image-outline" label={t('choosePhoto', lang)} disabled={!family} onPress={() => choose(false)} />
      </Row>
      {photo && !result && (
        <View style={{ marginTop: 12 }}>
          <Image source={{ uri: `data:image/jpeg;base64,${photo}` }} accessibilityLabel="The receipt to scan" resizeMode="contain" style={{ width: '100%', height: 260, borderRadius: 12, backgroundColor: '#F3E7D4' }} />
          <View style={{ marginTop: 12 }}>
            {busy ? <Row style={{ gap: 10 }}><ActivityIndicator color={C.brand} /><Text style={{ color: C.muted }}>{t('readingReceipt', lang)}</Text></Row>
              : <Button icon="scan-outline" label={t('scanReceipt', lang)} onPress={scan} />}
          </View>
        </View>
      )}
      {result && (
        <View style={{ marginTop: 12, gap: 8 }}>
          {result.found.length === 0 ? <Notice tone="warn" icon="receipt-outline">{t('receiptNone', lang)}</Notice> : <>
            <Text style={{ fontWeight: '700' }}>{result.shop ? `${result.shop}: ` : ''}{t('receiptFound', lang)}</Text>
            {result.found.map((f) => (
              <Pressable key={f.item} onPress={() => toggle(f.item)} accessibilityRole="checkbox" accessibilityState={{ checked: f.on }}
                style={{ flexDirection: 'row', gap: 10, alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderColor: C.line }}>
                <Icon name={f.on ? 'checkbox' : 'square-outline'} size={22} color={f.on ? C.brand : C.faint} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '700' }}>{CATALOGUE[f.item]?.name ?? f.item}</Text>
                  <Text style={{ color: C.muted, fontSize: 12 }}>{qtyLabel(CATALOGUE[f.item]?.pack ?? '', lang)} · “{f.text}”</Text>
                </View>
                <Text style={{ fontWeight: '700' }}>${f.price.toFixed(2)}</Text>
              </Pressable>
            ))}
          </>}
          {result.other > 0 && <Text style={{ color: C.muted, fontSize: 12 }}>{t('notOnList', lang, { n: result.other })}</Text>}
          {n > 0 && <Button icon="checkmark" label={t('savePrices', lang, { n })} onPress={save} />}
        </View>
      )}
      {error && <Notice tone="bad" icon="alert-circle">{error}</Notice>}
    </Sheet>
  );
}
