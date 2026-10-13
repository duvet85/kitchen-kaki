import React, { useState } from 'react';
import { LayoutChangeEvent, Pressable, View } from 'react-native';
import { Group, TABS, Tab, coverOf, groupsFor } from '../data/categories';
import { photoFor } from '../data/photos';
import DishPhoto from '../DishPhoto';
import { useApp } from '../state';
import { Recipe } from '../types';
import { Button, C, Chip, F, Icon, Row, Text } from '../ui';
import { Sheet } from './FamilyScreen';
import { CollectionTools, NewCategory } from './Categories';

const GAP = 8;
/** Category bars take turns in blue, chilli, saffron-brown and pink (white text passes contrast on all four). */
const BARS = ['rgba(47,64,48,0.93)', 'rgba(201,74,37,0.93)', 'rgba(92,104,48,0.93)', 'rgba(154,91,0,0.94)'];

/** Measures its own width and lays square tiles out 3 across (2 when very narrow). */
function TileGrid({ children }: { children: (size: number) => React.ReactNode[] }) {
  const [w, setW] = useState(0);
  const cols = w && w < 300 ? 2 : Math.max(3, Math.min(6, Math.floor((w + GAP) / (170 + GAP))));
  const size = w ? Math.floor((w - GAP * (cols - 1)) / cols) : 0;
  return (
    <View onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)} style={{ marginTop: 12 }}>
      {size > 0 && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GAP }}>{children(size)}</View>}
    </View>
  );
}

function Tile({ recipe, size, label, count, heart, onPress, a11y, bar = 0 }: { recipe: Recipe; size: number; label: string; count?: number; heart?: boolean; onPress: () => void; a11y: string; bar?: number }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={a11y} style={{ width: size, height: size, borderRadius: 20, overflow: 'hidden', backgroundColor: C.brandSoft }}>
      <DishPhoto recipe={recipe} banner height={size} style={{ marginBottom: 0, borderRadius: 0 }} placeholder={false} />
      <CoverFallback recipe={recipe} size={size} />
      {heart && <View style={{ position: 'absolute', top: 6, right: 6 }}><Icon name="heart" size={16} color="#fff" /></View>}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: count != null ? BARS[bar % BARS.length] : 'rgba(36,24,16,0.66)', paddingHorizontal: 8, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Text numberOfLines={1} style={{ flex: 1, color: '#fff', fontSize: 12.5, fontFamily: F.display }}>{label}</Text>
        {count != null && <Text style={{ color: '#fff', fontSize: 12.5, fontWeight: '800' }}>{count}</Text>}
      </View>
    </Pressable>
  );
}

/** A category with nothing in it yet: its picture on a plain tile. */
function EmptyTile({ group, size, bar, onPress }: { group: Group; size: number; bar: number; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${group.title}, no recipes yet`} style={{ width: size, height: size, borderRadius: 20, overflow: 'hidden', backgroundColor: C.brandSoft }}>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', paddingBottom: 18 }}>
        <Text style={{ fontSize: size * 0.34 }}>{group.emoji}</Text>
      </View>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: BARS[bar % BARS.length], paddingHorizontal: 8, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Text numberOfLines={1} style={{ flex: 1, color: '#fff', fontSize: 12.5, fontFamily: F.display }}>{group.title}</Text>
        <Text style={{ color: '#fff', fontSize: 12.5, fontWeight: '800' }}>0</Text>
      </View>
    </Pressable>
  );
}

/** Behind the photo: the dish's emoji, shown when the dish has no photo (the photo covers it when there is one). */
function CoverFallback({ recipe: r, size }: { recipe: Recipe; size: number }) {
  const { state } = useApp();
  if (state.userPhotos?.[r.id] || photoFor(r.id) || r.imageUrl) return null;
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', paddingBottom: 18 }}>
      <Text style={{ fontSize: size * 0.34 }}>{r.emoji}</Text>
    </View>
  );
}

/** Instagram-style view of the recipe book: category tiles, then a photo grid of the dishes in a category. */
export default function RecipeTiles({ recipes, searching, onOpen }: { recipes: Recipe[]; searching: boolean; onOpen: (r: Recipe) => void }) {
  const { state } = useApp();
  const [tab, setTab] = useState<Tab>('Types');
  const [open, setOpen] = useState<Group | null>(null);
  const [making, setMaking] = useState(false);
  const hasStock = (r: Recipe) => !!(photoFor(r.id) || r.imageUrl);
  const favs = new Set(state.favourites ?? []);

  if (searching) {
    return (
      <TileGrid>{(size) => recipes.map((r) => <Tile key={r.id} recipe={r} size={size} label={r.name} heart={favs.has(r.id)} a11y={`Open ${r.name}`} onPress={() => onOpen(r)} />)}</TileGrid>
    );
  }
  const groups = groupsFor(tab, recipes, state);
  // keep an open category up to date (a photo or heart can change while it is open)
  const live = open ? groups.find((g) => g.id === open.id) ?? open : null;
  return (
    <View>
      <Row style={{ marginTop: 12, gap: 6 }}>{TABS.map((t) => <Chip key={t} label={t} selected={tab === t} onPress={() => setTab(t)} />)}</Row>
      {groups.length === 0 && (
        <Text style={{ color: C.muted, marginTop: 14, lineHeight: 20 }}>
          {tab === 'Favourites' ? 'Nothing here yet. Open a dish and tap "Add to favourites", or rate dishes 4 stars or more.'
            : tab === 'Mine' ? 'Make your own categories, like "Kids\' favourites" or "Weekend". Then open any dish and tap Categories to put it in one.' : 'Nothing here yet.'}
        </Text>
      )}
      {tab === 'Meals' && <Text style={{ color: C.muted, fontSize: 12.5, marginTop: 10, lineHeight: 18 }}>Breakfast, drinks and desserts. Open any dish and tap Categories to put it here. They are never put on the week's dinner menu.</Text>}
      {tab === 'Mine' && <View style={{ marginTop: 12, alignSelf: 'flex-start' }}><Button small icon="add" kind="ghost" label="New category" onPress={() => setMaking(true)} /></View>}
      <TileGrid>
        {(size) => groups.map((g, i) => {
          const cover = coverOf(g, state, hasStock);
          return !cover ? <EmptyTile key={g.id} group={g} size={size} bar={i} onPress={() => setOpen(g)} /> : (
          <Tile key={g.id} bar={i} recipe={cover} size={size} label={g.title} count={g.recipes.length} a11y={`${g.title}, ${g.recipes.length} recipes`} onPress={() => setOpen(g)} />
          );
        })}
      </TileGrid>
      {making && <NewCategory onClose={() => setMaking(false)} onDone={() => setMaking(false)} />}
      {live && (
        <Sheet title={`${live.title} (${live.recipes.length})`} onClose={() => setOpen(null)}>
          {live.recipes.length === 0 && <Text style={{ color: C.muted, marginTop: 12, lineHeight: 20 }}>Nothing here yet. Open any dish and tap Categories to put it here.</Text>}
          <TileGrid>
            {(size) => live.recipes.map((r) => <Tile key={r.id} recipe={r} size={size} label={r.name} heart={favs.has(r.id)} a11y={`Open ${r.name}`} onPress={() => onOpen(r)} />)}
          </TileGrid>
          {tab === 'Mine' && <CollectionTools id={live.id} onGone={() => setOpen(null)} />}
        </Sheet>
      )}
    </View>
  );
}
