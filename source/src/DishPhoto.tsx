import React, { useState } from 'react';
import { Image, Text, View, ViewStyle } from 'react-native';
import { photoFor } from './data/photos';
import { usePhotoUri } from './sync/userPhotos';
import { Recipe } from './types';
import { Thumb } from './ui';

/**
 * A dish's photo. "banner" fills the top of a card edge to edge; a number gives a square thumbnail.
 * The family's own photo (added with "Add your photo") comes first. Otherwise the stock photo bundled in the app (assets/dishes), so it shows offline. An imported recipe with no bundled photo shows the website's own photo, linked from there (not copied). Falls back to the emoji tile when there is no photo.
 */
export default function DishPhoto({ recipe: r, size = 52, banner, height = 150, style, placeholder }: {
  recipe: Recipe; size?: number; banner?: boolean; height?: number; style?: ViewStyle;
  /** show a labelled "photo coming soon" tile when there is no photo (otherwise a banner is left out) */
  placeholder?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const photo = photoFor(r.id);
  const mine = usePhotoUri(r.id);
  const remote = !photo && r.imageUrl ? { uri: r.imageUrl } : null;
  if ((!mine && !photo && !remote) || failed) {
    if (!banner) return <Thumb emoji={r.emoji} cuisine={r.cuisine} size={size} />;
    if (!placeholder) return null;
    return (
      <View style={[{ height: Math.min(height, 110), borderRadius: 14, backgroundColor: '#F7EBDA', borderWidth: 1, borderColor: '#EEDFC9', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', marginBottom: 12, gap: 4 }, style]}
        accessibilityLabel={`No photo of ${r.name} yet`}>
        <Text style={{ fontSize: 30 }}>{r.emoji}</Text>
        <Text style={{ color: '#6A5646', fontSize: 12, fontWeight: '600' }}>Photo coming soon</Text>
      </View>
    );
  }
  const source = mine ? { uri: mine } : photo ? photo.src : remote!;
  if (banner) {
    return (
      <View style={[{ height, borderRadius: 14, overflow: 'hidden', backgroundColor: '#F3E7D4', marginBottom: 12 }, style]}>
        <Image source={source} onError={() => setFailed(true)} resizeMode="cover" style={{ width: '100%', height: '100%' }}
          accessibilityLabel={`Photo of ${r.name}`} />
      </View>
    );
  }
  return (
    <Image source={source} onError={() => setFailed(true)} resizeMode="cover"
      style={[{ width: size, height: size, borderRadius: size * 0.3, backgroundColor: '#F3E7D4' }, style as object]}
      accessibilityLabel={`Photo of ${r.name}`} />
  );
}
