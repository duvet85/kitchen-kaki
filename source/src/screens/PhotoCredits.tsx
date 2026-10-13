import React, { useState } from 'react';
import { Linking, Pressable, View } from 'react-native';
import { PHOTOS } from '../data/photos';
import { RECIPES } from '../data/recipes';
import { C, Card, H2, Icon, Row, Text } from '../ui';

/** Collapsible list crediting each dish photo's photographer. */
export default function PhotoCredits() {
  const [open, setOpen] = useState(false);
  const credited = RECIPES.filter((r) => PHOTOS[r.id]);
  const missing = RECIPES.filter((r) => !PHOTOS[r.id] && !r.sickDay && !r.custom);
  if (!credited.length && !missing.length) return null;
  return (
    <Card style={{ marginTop: 16 }}>
      <Pressable onPress={() => setOpen(!open)} accessibilityRole="button">
        <Row style={{ flexWrap: 'nowrap', gap: 10 }}>
          <Icon name="camera-outline" size={18} color={C.brand} />
          <H2 style={{ marginBottom: 0, flex: 1 }}>Photo credits</H2>
          <Icon name={open ? 'chevron-up' : 'chevron-down'} size={20} color={C.muted} />
        </Row>
      </Pressable>
      {open && (
        <View style={{ marginTop: 10, gap: 8 }}>
          <Text style={{ color: C.muted, fontSize: 13 }}>Photos come from Unsplash, Pexels and Wikimedia Commons. We only use photos whose licence allows free use, including in a paid app: the Unsplash and Pexels licences, public domain (CC0) and Creative Commons Attribution (CC BY). CC BY photos are shown with the photographer, licence and licence link, as that licence asks. We credit every photographer (tap a line to open the photo page). Photos are examples; yours may look a little different. Each photo was looked at and only kept when it clearly shows the dish; the files are stored inside the app. Licences were checked on each photo page on 13 Oct 2026.</Text>
          {missing.length > 0 && (
            <Text style={{ color: C.amber, fontSize: 13, lineHeight: 19 }}>
              Still needs a real photo ({missing.length}): {missing.map((r) => r.name).join(', ')}.
            </Text>
          )}
          {credited.map((r) => {
            const p = PHOTOS[r.id]!;
            return (
              <Pressable key={r.id} onPress={() => Linking.openURL(p.page)}>
                <Text style={{ fontSize: 13, lineHeight: 19 }}>
                  <Text style={{ fontWeight: '700', fontSize: 13 }}>{r.name}</Text>
                  <Text style={{ color: C.muted, fontSize: 13 }}>{`  ${p.by}, ${p.site} (${p.license})`}</Text>
                </Text>
                {p.licenseUrl && (
                  <Text style={{ color: C.brand, fontSize: 12 }} onPress={() => Linking.openURL(p.licenseUrl!)} accessibilityRole="link">
                    {`Licence: ${p.license}, ${p.licenseUrl.replace('https://', '')}`}
                  </Text>
                )}
              </Pressable>
            );
          })}
        </View>
      )}
    </Card>
  );
}
