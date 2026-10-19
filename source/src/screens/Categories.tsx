import React, { useState } from 'react';
import { TextInput, View } from 'react-native';
import { MEALS, TYPES, mealFor, typeFor } from '../data/categories';
import { useApp } from '../state';
import { Collection, Recipe } from '../types';
import { Button, C, Chip, F, Label, Row, Text } from '../ui';
import { Sheet } from './FamilyScreen';

const EMOJIS = ['⭐', '🍲', '🥗', '🍜', '🎂', '🥪', '🧁', '🍱', '🌶️', '👶', '🎉', '⏱️'];
const input = { borderWidth: 1, borderColor: C.line, borderRadius: 12, padding: 12, fontSize: 15, color: C.ink, backgroundColor: '#fff', fontFamily: F.regular } as const;

/** Make a category of your own (a name and a little picture). */
export function NewCategory({ onDone, onClose }: { onDone: (c: Collection) => void; onClose: () => void }) {
  const { update } = useApp();
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState(EMOJIS[0]);
  const clean = name.trim().slice(0, 30);
  const make = () => {
    if (!clean) return;
    const c: Collection = { id: `c${Date.now().toString(36)}`, name: clean, emoji, ids: [] };
    update((st) => ({ ...st, collections: [...(st.collections ?? []), c] }));
    onDone(c);
  };
  return (
    <Sheet title="New category" onClose={onClose}>
      <Label>Name</Label>
      <TextInput value={name} onChangeText={setName} maxLength={30} placeholder="For example: Kids' favourites, Weekend, Quick lunch" placeholderTextColor={C.faint} accessibilityLabel="Category name" style={input} />
      <Label>Picture</Label>
      <Row>{EMOJIS.map((e) => <Chip key={e} label={e} selected={emoji === e} onPress={() => setEmoji(e)} />)}</Row>
      <View style={{ marginTop: 16 }}><Button label="Create category" onPress={make} disabled={!clean} /></View>
    </Sheet>
  );
}

/** Where a dish shows in the recipe book: its meal type, and any categories of your own. Nothing changes until you tap. */
export function CategorySheet({ recipe: r, onClose }: { recipe: Recipe; onClose: () => void }) {
  const { state, update } = useApp();
  const [making, setMaking] = useState(false);
  const meal = mealFor(r, state);
  const cols = state.collections ?? [];
  const setMeal = (m: typeof meal) => update((st) => ({ ...st, mealOf: { ...(st.mealOf ?? {}), [r.id]: m ?? 'none' } }));
  const toggle = (c: Collection) => update((st) => ({
    ...st, collections: (st.collections ?? []).map((x) => x.id !== c.id ? x : { ...x, ids: x.ids.includes(r.id) ? x.ids.filter((i) => i !== r.id) : [...x.ids, r.id] }),
  }));
  return (
    <Sheet title="Categories" onClose={onClose}>
      <Text style={{ color: C.muted, marginTop: 4, lineHeight: 20 }}>{r.name}</Text>
      <Label>Shows under</Label>
      <Row>
        {TYPES.map((t) => <Chip key={t.id} label={`${t.emoji} ${t.title}`} selected={typeFor(r, state) === t.id}
          onPress={() => update((st) => { const o = { ...(st.typeOf ?? {}) }; if (t.id === r.protein) delete o[r.id]; else o[r.id] = t.id; return { ...st, typeOf: o }; })} />)}
      </Row>
      <Text style={{ color: C.muted, fontSize: 12, marginTop: 6, lineHeight: 17 }}>Which group the dish shows under in the recipe book (Types tab). Soups stay under Soups.</Text>
      <Label>Meal type</Label>
      <Row>
        <Chip label="Dinner dish" selected={!meal} onPress={() => setMeal(undefined)} />
        {MEALS.map((m) => <Chip key={m.id} label={`${m.emoji} ${m.title}`} selected={meal === m.id} onPress={() => setMeal(m.id)} />)}
      </Row>
      <Text style={{ color: C.muted, fontSize: 12, marginTop: 6, lineHeight: 17 }}>Breakfast, drinks and desserts stay in your recipe book but are never put on the week's dinner menu. "Dinner dish" is the usual choice.</Text>
      <Label>Your own categories</Label>
      {cols.length === 0 && <Text style={{ color: C.muted, fontSize: 13 }}>You have none yet.</Text>}
      <Row>{cols.map((c) => <Chip key={c.id} label={`${c.emoji} ${c.name}`} selected={c.ids.includes(r.id)} onPress={() => toggle(c)} />)}</Row>
      <View style={{ marginTop: 14 }}><Button label="Make a new category" kind="ghost" onPress={() => setMaking(true)} /></View>
      {making && <NewCategory onClose={() => setMaking(false)} onDone={(c) => { setMaking(false); update((st) => ({ ...st, collections: (st.collections ?? []).map((x) => x.id === c.id ? { ...x, ids: [...x.ids, r.id] } : x) })); }} />}
    </Sheet>
  );
}

/** Rename or delete one of your own categories (the dishes in it are not deleted). */
export function CollectionTools({ id, onGone }: { id: string; onGone: () => void }) {
  const { state, update } = useApp();
  const c = state.collections?.find((x) => x.id === id);
  const [name, setName] = useState(c?.name ?? '');
  const [sure, setSure] = useState(false);
  if (!c) return null;
  return (
    <View style={{ marginTop: 16 }}>
      <Label>Rename this category</Label>
      <TextInput value={name} maxLength={30} accessibilityLabel="Category name" style={input}
        onChangeText={(v) => { setName(v); if (v.trim()) update((st) => ({ ...st, collections: (st.collections ?? []).map((x) => x.id === id ? { ...x, name: v.trim() } : x) })); }} />
      <Row style={{ marginTop: 10 }}>
        {!sure
          ? <Chip tone="plain" icon="trash-outline" label="Delete this category" onPress={() => setSure(true)} />
          : <><Chip tone="bad" label="Yes, delete it (dishes stay)" onPress={() => { update((st) => ({ ...st, collections: (st.collections ?? []).filter((x) => x.id !== id) })); onGone(); }} /><Chip label="No change" onPress={() => setSure(false)} /></>}
      </Row>
    </View>
  );
}
