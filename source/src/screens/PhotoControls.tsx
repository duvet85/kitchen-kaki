import React, { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { photoFor } from '../data/photos';
import { useApp } from '../state';
import { PhotoError, deletePhoto, pickPhoto, savePhoto } from '../sync/userPhotos';
import { Recipe } from '../types';
import { Button, C, Notice, Row, Text } from '../ui';

/** "Add your photo" / "Change photo" / stock-or-ours / remove, shown under a dish's photo. */
export default function PhotoControls({ recipe: r }: { recipe: Recipe }) {
  const { state, update, family } = useApp();
  const meta = state.userPhotos?.[r.id];
  const hasStock = !!(photoFor(r.id) || r.imageUrl);
  const [choosing, setChoosing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (next: NonNullable<typeof meta> | null) => update((st) => {
    const photos = { ...(st.userPhotos ?? {}) };
    if (next) photos[r.id] = next; else delete photos[r.id];
    return { ...st, userPhotos: photos };
  });

  const add = async (source: 'camera' | 'library') => {
    setError(null);
    setBusy(true);
    try {
      const shrunk = await pickPhoto(source);
      if (shrunk) {
        const saved = await savePhoto(r.id, shrunk, family, meta);
        set({ ...saved, at: new Date().toISOString(), by: family?.myName });
        setChoosing(false);
      }
    } catch (e) {
      setError(e instanceof PhotoError ? e.message : 'Could not add the photo. Try again.');
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    setBusy(true);
    await deletePhoto(r.id, family, meta);
    set(null);
    setBusy(false);
  };

  return (
    <View style={{ marginTop: 8 }}>
      <Row style={{ gap: 8 }}>
        <Button small kind="ghost" icon="camera-outline" label={meta ? 'Change photo' : 'Add your photo'} onPress={() => setChoosing(!choosing)} />
        {meta && hasStock && <Button small kind="ghost" icon="images-outline" label={meta.stock ? 'Use our photo' : 'Use the stock photo'} onPress={() => set({ ...meta, stock: !meta.stock })} />}
        {meta && <Button small kind="ghost" icon="trash-outline" label="Remove our photo" onPress={remove} />}
      </Row>
      {choosing && (
        <Row style={{ gap: 8, marginTop: 8 }}>
          <Button small icon="camera" label="Take a photo" disabled={busy} onPress={() => add('camera')} />
          <Button small kind="ghost" icon="image-outline" label="Choose from gallery" disabled={busy} onPress={() => add('library')} />
        </Row>
      )}
      {busy && <Row style={{ gap: 8, marginTop: 8 }}><ActivityIndicator color={C.brand} /><Text style={{ color: C.muted, fontSize: 13 }}>Shrinking and saving the photo…</Text></Row>}
      {error && <Notice tone="bad" icon="alert-circle">{error}</Notice>}
      {(choosing || meta) && <Text style={{ color: C.faint, fontSize: 12, marginTop: 6 }}>{family ? 'Your photo is shrunk first, then saved in your family\'s private storage, so only your family sees it.' : 'Your photo is shrunk first and kept on this phone only. Set up family sharing to share it.'}</Text>}
    </View>
  );
}
