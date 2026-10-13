import React, { useState } from 'react';
import { View } from 'react-native';
import { WEB_RECIPES } from '../config';
import { useApp } from '../state';
import { deletePhoto } from '../sync/userPhotos';
import { Recipe } from '../types';
import { Button, C, Card, Chip, H2, Icon, Notice, Row, Text } from '../ui';

/** A recipe whose text or photo link came from another website: imported from a link, or found by web search and rewritten by AI. */
export const fromWeb = (r: Recipe) => !!r.imported || !!(r.sourceUrl && r.sourceName && r.aiDrafted);

/** Whether the web-recipe features (import, web search, refresh) are shown: the build allows it and the owner hasn't switched it off. */
export function useWebRecipes(): boolean {
  const { state } = useApp();
  return WEB_RECIPES && !state.webRecipesOff;
}

/** Settings card: see every recipe taken from a website, remove them all, and hide the import and web-search buttons. */
export default function WebRecipes() {
  const { state, update, family } = useApp();
  const [confirm, setConfirm] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const list = (state.customRecipes ?? []).filter(fromWeb);
  const onMenu = new Set(state.plan?.dishes.map((d) => d.recipeId));
  const removable = list.filter((r) => !onMenu.has(r.id));
  const stuck = list.length - removable.length;
  const off = !WEB_RECIPES || !!state.webRecipesOff;

  const removeAll = async () => {
    const ids = new Set(removable.map((r) => r.id));
    for (const r of removable) { const m = state.userPhotos?.[r.id]; if (m) await deletePhoto(r.id, family, m); }
    update((st) => {
      const keep = (st.customRecipes ?? []).filter((r) => !ids.has(r.id));
      const used = new Set(keep.flatMap((r) => r.ingredients.map((i) => i.item)));
      const photos = Object.fromEntries(Object.entries(st.userPhotos ?? {}).filter(([id]) => !ids.has(id)));
      return {
        ...st,
        customRecipes: keep,
        customItems: Object.fromEntries(Object.entries(st.customItems ?? {}).filter(([k]) => used.has(k))),
        userPhotos: photos,
        favourites: (st.favourites ?? []).filter((id) => !ids.has(id)),
        aiTranslations: Object.fromEntries(Object.entries(st.aiTranslations ?? {}).filter(([id]) => !ids.has(id))),
      };
    });
    setConfirm(false);
    setDone(`Removed ${ids.size} recipe${ids.size === 1 ? '' : 's'}, with their steps, ingredient lists, photo links and your photos of them.${stuck ? ` ${stuck} stayed because ${stuck === 1 ? 'it is' : 'they are'} on this week's menu. Take ${stuck === 1 ? 'it' : 'them'} off the menu, then remove again.` : ''}`);
  };

  return (
    <Card style={{ marginTop: 16 }}>
      <Row style={{ flexWrap: 'nowrap', gap: 10 }}>
        <Icon name="globe-outline" size={20} color={C.brand} />
        <H2 style={{ marginBottom: 0, flex: 1 }}>Recipes from websites</H2>
      </Row>
      <Text style={{ color: C.muted, marginTop: 8, lineHeight: 20 }}>
        Importing from a link and searching the web copy or rewrite other people's recipes. That is fine for your own family. Before you sell the app, remove them here.
      </Text>
      <Notice tone="warn" icon="alert-circle-outline">Removing only the link is not enough. The copied text and steps would stay in the recipe. They must be deleted, or rewritten in your own words, before selling.</Notice>

      <Row style={{ marginTop: 12, gap: 8 }}>
        <Chip label={off ? 'Web recipes: off' : 'Web recipes: on'} selected={!off} onPress={WEB_RECIPES ? () => update((st) => ({ ...st, webRecipesOff: !st.webRecipesOff })) : undefined} icon={off ? 'eye-off-outline' : 'eye-outline'} />
      </Row>
      <Text style={{ color: C.faint, fontSize: 12, marginTop: 6 }}>
        {!WEB_RECIPES ? 'This build has web recipes switched off for good (src/config.ts).' : off ? 'The import, web-search and refresh buttons are hidden. Recipes already added stay.' : 'Off hides the "Import from a link", "Search the web" and "Refresh from source" buttons. Recipes already added stay until you remove them below.'}
      </Text>

      <View style={{ marginTop: 14 }}>
        <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13 }}>{list.length ? `${list.length} recipe${list.length === 1 ? '' : 's'} taken from websites` : 'No recipes taken from websites.'}</Text>
        {list.map((r) => (
          <Row key={r.id} style={{ flexWrap: 'nowrap', gap: 8, paddingVertical: 6, borderBottomWidth: 1, borderColor: C.line }}>
            <Text style={{ flex: 1 }}>{r.emoji} {r.name}</Text>
            <Text style={{ color: C.muted, fontSize: 12 }}>{r.imported ? 'Imported' : 'Found online, AI-rewritten'}{r.sourceName ? ` · ${r.sourceName}` : ''}{onMenu.has(r.id) ? ' · on this week\'s menu' : ''}</Text>
          </Row>
        ))}
      </View>
      {done && <Notice tone="good" icon="checkmark-circle-outline">{done}</Notice>}
      {list.length > 0 && !confirm && <View style={{ marginTop: 12, alignSelf: 'flex-start' }}><Button kind="danger" icon="trash-outline" label={`Remove all ${list.length}`} onPress={() => { setDone(null); setConfirm(true); }} /></View>}
      {confirm && (
        <View style={{ marginTop: 12 }}>
          <Notice tone="bad" icon="alert-circle">
            Remove {removable.length} recipe{removable.length === 1 ? '' : 's'}? Their ingredients, steps, source links, photo links and your own photos of them are deleted from every phone in the family. This cannot be undone.{stuck ? ` ${stuck} on this week's menu will stay.` : ''}
          </Notice>
          <Row style={{ marginTop: 10, gap: 8 }}>
            <Button kind="danger" icon="trash-outline" label="Yes, remove them" disabled={!removable.length} onPress={removeAll} />
            <Button kind="ghost" label="No change" onPress={() => setConfirm(false)} />
          </Row>
        </View>
      )}
    </Card>
  );
}
