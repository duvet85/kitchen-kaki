import React, { useState } from 'react';
import { ActivityIndicator, Image, Modal, ScrollView, TextInput, View } from 'react-native';
import { ALLERGENS, CUISINES, PROTEINS, cleanUrl, normaliseDraft, youtubeUrl } from '../ai/draft';
import { guessDetails, matchCatalogue, splitIngredient } from '../ai/importMap';
import { useApp } from '../state';
import { PhotoError, Shrunk, pickPhoto, savePhoto } from '../sync/userPhotos';
import { Allergen, Cuisine, Level, Meal, Protein, Recipe } from '../types';
import { Button, C, Chip, F, IconButton, Label, Notice, Row, Text } from '../ui';
import { NewCategory } from './Categories';
import { cap } from './FamilyScreen';

const TABS = ['Overview', 'Ingredients', 'Directions', 'Notes', 'Health', 'Photo & video'] as const;
type Tab = typeof TABS[number];
type Kind = 'dish' | 'soup' | Meal;
const KINDS: { k: Kind; label: string }[] = [
  { k: 'dish', label: 'Dinner dish' }, { k: 'soup', label: 'Soup' }, { k: 'breakfast', label: 'Breakfast' },
  { k: 'lunch', label: 'Lunch' }, { k: 'dessert', label: 'Dessert' }, { k: 'drink', label: 'Drink' },
];
const LEVELS: Level[] = ['low', 'med', 'high'];
const lines = (t: string) => t.split('\n').map((l) => l.replace(/^\s*(\d+[.)]|[-•*])\s*/, '').trim()).filter(Boolean);
const mins = (t: string) => { const n = parseInt(t, 10); return Number.isFinite(n) && n > 0 ? Math.min(n, 600) : 0; };

/** Add a recipe by typing it all in: the family's own dish, their own photo and video. No AI. */
export default function ManualRecipe({ onClose }: { onClose: () => void }) {
  const { state, update, family } = useApp();
  const [tab, setTab] = useState<Tab>('Overview');
  const [name, setName] = useState('');
  const [kind, setKind] = useState<Kind>('dish');
  const [cuisine, setCuisine] = useState<Cuisine | null>(null);
  const [protein, setProtein] = useState<Protein | null>(null);
  const [cols, setCols] = useState<string[]>([]);
  const [making, setMaking] = useState(false);
  const [source, setSource] = useState('');
  const [serves, setServes] = useState('');
  const [prep, setPrep] = useState('');
  const [cook, setCook] = useState('');
  const [stars, setStars] = useState(0);
  const [ing, setIng] = useState('');
  const [dir, setDir] = useState('');
  const [notes, setNotes] = useState('');
  const [spice, setSpice] = useState<number | null>(null);
  const [levels, setLevels] = useState<{ sodium?: Level; sugar?: Level; satFat?: Level }>({});
  const [allergens, setAllergens] = useState<Allergen[] | null>(null);
  const [photo, setPhoto] = useState<Shrunk | null>(null);
  const [video, setVideo] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ingLines = lines(ing), steps = lines(dir);
  const vid = youtubeUrl(video);
  const link = cleanUrl(source.trim());
  const missing = !name.trim() ? 'Give the recipe a title (Overview).' : ingLines.length < 2 ? 'Add at least 2 ingredients, one per line (Ingredients).' : !steps.length ? 'Add at least one step (Directions).' : video.trim() && !vid ? "The video link isn't a YouTube link (Photo & video)." : null;

  const choose = async (from: 'camera' | 'library') => {
    setError(null);
    try { const p = await pickPhoto(from); if (p) setPhoto(p); } catch (e) { setError(e instanceof PhotoError ? e.message : 'Could not open the photo. Try again.'); }
  };

  const save = async () => {
    if (missing) { setError(missing); return; }
    const parts = ingLines.map(splitIngredient);
    const d = normaliseDraft({
      ...guessDetails(name, ingLines), name: name.trim(), minutes: mins(prep) + mins(cook) || 30,
      ingredients: parts.map((p) => ({ item: matchCatalogue(p.name), name: p.name.replace(/^./, (c) => c.toUpperCase()), qty: p.qty })),
      steps, ...(protein ? { protein } : {}), ...(cuisine ? { cuisine } : {}), ...(spice !== null ? { spice } : {}), ...levels,
      course: kind === 'soup' ? 'soup' : undefined,
    }, link, undefined, vid, true);
    if (!d) { setError('Check the ingredients: at least 2 different ones are needed.'); return; }
    const { aiDrafted: _a, ...rest } = d.recipe;
    const recipe: Recipe = {
      ...rest,
      source: link ? 'Supplied by the family' : source.trim() ? `${source.trim().slice(0, 80)} (typed in by the family)` : 'Family recipe (typed in by the family)',
      ...(allergens ? { allergens } : {}),
      ...(kind !== 'dish' && kind !== 'soup' ? { meal: kind } : {}),
      ...(serves.trim() ? { serves: serves.trim().slice(0, 40) } : {}),
      ...(notes.trim() ? { notes: notes.trim().slice(0, 2000) } : {}),
      custom: true,
    };
    setBusy(true); setError(null);
    let pic: { path?: string } | null = null;
    if (photo) {
      try { pic = await savePhoto(recipe.id, photo, family); } catch (e) { setBusy(false); setError(`${e instanceof PhotoError ? e.message : 'The photo could not be saved.'} Remove the photo to save the recipe without it.`); return; }
    }
    update((st) => ({
      ...st,
      customRecipes: [...(st.customRecipes ?? []), recipe],
      customItems: { ...st.customItems, ...d.newItems },
      ratings: stars ? { ...st.ratings, [recipe.id]: stars } : st.ratings,
      collections: (st.collections ?? []).map((c) => (cols.includes(c.id) ? { ...c, ids: [...c.ids, recipe.id] } : c)),
      ...(pic ? { userPhotos: { ...(st.userPhotos ?? {}), [recipe.id]: { ...pic, at: new Date().toISOString(), by: family?.myName } } } : {}),
    }));
    setBusy(false);
    onClose();
  };

  const field = { borderBottomWidth: 1, borderColor: C.line, paddingVertical: 12, paddingHorizontal: 4, fontSize: 16, color: C.ink, fontFamily: F.regular } as const;
  const box = { borderWidth: 1, borderColor: C.line, borderRadius: 12, padding: 12, fontSize: 15, color: C.ink, backgroundColor: '#fff', fontFamily: F.regular, minHeight: 220, textAlignVertical: 'top' as const };

  return (
    <Modal animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <Row style={{ flexWrap: 'nowrap', padding: 10, gap: 8, backgroundColor: C.card, borderBottomWidth: 1, borderColor: C.line }}>
          <IconButton icon="close" label="Cancel" onPress={onClose} />
          <Text style={{ flex: 1, textAlign: 'center', fontFamily: F.display, fontSize: 18 }}>New recipe</Text>
          {busy ? <ActivityIndicator color={C.brand} /> : <Button small label="Save" onPress={save} />}
        </Row>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, backgroundColor: C.card }} contentContainerStyle={{ gap: 6, padding: 8 }}>
          {TABS.map((t) => <Chip key={t} label={t} selected={tab === t} onPress={() => setTab(t)} />)}
        </ScrollView>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, width: '100%', maxWidth: 640, alignSelf: 'center' }} keyboardShouldPersistTaps="handled">
          {error && <Notice tone="bad" icon="alert-circle">{error}</Notice>}
          {tab === 'Overview' && (
            <>
              <TextInput value={name} onChangeText={setName} placeholder="Title" placeholderTextColor={C.faint} maxLength={80} accessibilityLabel="Title" style={[field, { fontSize: 18 }]} />
              <Label>Course</Label>
              <Row>{KINDS.map((x) => <Chip key={x.k} label={x.label} selected={kind === x.k} onPress={() => setKind(x.k)} />)}</Row>
              <Label>Cuisine</Label>
              <Row>{CUISINES.map((c) => <Chip key={c} label={cap(c)} selected={cuisine === c} onPress={() => setCuisine(cuisine === c ? null : c)} />)}</Row>
              <Label>Main protein</Label>
              <Row>{PROTEINS.map((p) => <Chip key={p} label={cap(p)} selected={protein === p} onPress={() => setProtein(protein === p ? null : p)} />)}</Row>
              <Text style={{ color: C.faint, fontSize: 12, marginTop: 4 }}>Left empty, the app works these out from the title and ingredients.</Text>
              <Label>Categories</Label>
              <Row>
                {(state.collections ?? []).map((c) => <Chip key={c.id} label={`${c.emoji} ${c.name}`} selected={cols.includes(c.id)} onPress={() => setCols(cols.includes(c.id) ? cols.filter((x) => x !== c.id) : [...cols, c.id])} />)}
                <Chip icon="add" label="New category" onPress={() => setMaking(true)} />
              </Row>
              <TextInput value={source} onChangeText={setSource} placeholder="Source, e.g. Grandma, a book or a website link" placeholderTextColor={C.faint} autoCapitalize="none" maxLength={300} accessibilityLabel="Source" style={field} />
              <TextInput value={serves} onChangeText={setServes} placeholder="Serving size, e.g. 4 people" placeholderTextColor={C.faint} maxLength={40} accessibilityLabel="Serving size" style={field} />
              <Row style={{ gap: 12, flexWrap: 'nowrap' }}>
                <TextInput value={prep} onChangeText={(v) => setPrep(v.replace(/\D/g, ''))} keyboardType="number-pad" placeholder="Prep time (min)" placeholderTextColor={C.faint} accessibilityLabel="Prep time in minutes" style={[field, { flex: 1, minWidth: 0 }]} />
                <TextInput value={cook} onChangeText={(v) => setCook(v.replace(/\D/g, ''))} keyboardType="number-pad" placeholder="Cook time (min)" placeholderTextColor={C.faint} accessibilityLabel="Cook time in minutes" style={[field, { flex: 1, minWidth: 0 }]} />
              </Row>
              <Row style={{ marginTop: 14, gap: 4 }}>
                <Text style={{ color: C.muted, marginRight: 8 }}>Rating</Text>
                {[1, 2, 3, 4, 5].map((n) => <IconButton key={n} icon={n <= stars ? 'star' : 'star-outline'} label={`${n} star${n > 1 ? 's' : ''}`} onPress={() => setStars(stars === n ? 0 : n)} />)}
              </Row>
            </>
          )}
          {tab === 'Ingredients' && (
            <>
              <Text style={{ color: C.muted, marginBottom: 8 }}>One ingredient per line, amount first. For example "500 g chicken thighs" or "2 tbsp light soy sauce".</Text>
              <TextInput value={ing} onChangeText={setIng} multiline placeholder={'500 g chicken thighs\n2 tbsp light soy sauce\n3 cloves garlic'} placeholderTextColor={C.faint} accessibilityLabel="Ingredients" style={box} />
              <Text style={{ color: C.faint, fontSize: 12, marginTop: 6 }}>{ingLines.length} ingredient{ingLines.length === 1 ? '' : 's'}. They go on the shopping list.</Text>
            </>
          )}
          {tab === 'Directions' && (
            <>
              <Text style={{ color: C.muted, marginBottom: 8 }}>One step per line. Keep each step short, so the cook can follow it one at a time.</Text>
              <TextInput value={dir} onChangeText={setDir} multiline placeholder={'Cut the chicken into pieces.\nMix with soy sauce and garlic.\nFry for 8 minutes until cooked through.'} placeholderTextColor={C.faint} accessibilityLabel="Directions" style={box} />
              <Text style={{ color: C.faint, fontSize: 12, marginTop: 6 }}>{steps.length} step{steps.length === 1 ? '' : 's'}.</Text>
            </>
          )}
          {tab === 'Notes' && (
            <TextInput value={notes} onChangeText={setNotes} multiline maxLength={2000} placeholder="Anything else: tips, what the kids like, how Grandma makes it…" placeholderTextColor={C.faint} accessibilityLabel="Notes" style={box} />
          )}
          {tab === 'Health' && (
            <>
              <Text style={{ color: C.muted }}>Used for the menu's health balance. Left empty, the app makes a rough guess.</Text>
              <Label>Spice</Label>
              <Row>{['None', 'Mild', 'Medium', 'Hot'].map((l, n) => <Chip key={l} label={l} selected={spice === n} onPress={() => setSpice(spice === n ? null : n)} />)}</Row>
              {([['sodium', 'Salt'], ['sugar', 'Sugar'], ['satFat', 'Fat']] as const).map(([k, l]) => (
                <View key={k}>
                  <Label>{l}</Label>
                  <Row>{LEVELS.map((v) => <Chip key={v} label={v === 'med' ? 'Medium' : cap(v)} selected={levels[k] === v} onPress={() => setLevels({ ...levels, [k]: levels[k] === v ? undefined : v })} />)}</Row>
                </View>
              ))}
              <Label>Allergens</Label>
              <Row>{ALLERGENS.map((a) => <Chip key={a} label={cap(a)} selected={!!allergens?.includes(a)} onPress={() => { const cur = allergens ?? []; setAllergens(cur.includes(a) ? cur.filter((x) => x !== a) : [...cur, a]); }} />)}</Row>
              <Text style={{ color: C.faint, fontSize: 12, marginTop: 6 }}>{allergens ? 'Only the allergens you ticked are shown.' : 'Not ticked: the app flags common allergens from the ingredients (peanut, prawns, egg and so on).'}</Text>
            </>
          )}
          {tab === 'Photo & video' && (
            <>
              <Label>Your photo</Label>
              {photo && <Image source={{ uri: `data:image/jpeg;base64,${photo.base64}` }} accessibilityLabel="Your photo of the dish" style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: 16, backgroundColor: C.line, marginBottom: 8 }} />}
              <Row style={{ gap: 8 }}>
                <Button small icon="camera" label="Take a photo" onPress={() => choose('camera')} />
                <Button small kind="ghost" icon="image-outline" label="Choose from gallery" onPress={() => choose('library')} />
                {photo && <Button small kind="ghost" icon="trash-outline" label="Remove" onPress={() => setPhoto(null)} />}
              </Row>
              <Text style={{ color: C.faint, fontSize: 12, marginTop: 6 }}>{family ? 'Saved to your family\'s private photo storage, so everyone in the family sees it.' : 'Kept on this phone.'}</Text>
              <Label>YouTube video (optional)</Label>
              <TextInput value={video} onChangeText={setVideo} autoCapitalize="none" autoCorrect={false} placeholder="https://www.youtube.com/watch?v=…" placeholderTextColor={C.faint} accessibilityLabel="YouTube link" style={field} />
              <Text style={{ color: video.trim() && !vid ? C.amber : C.faint, fontSize: 12, marginTop: 6 }}>{vid ? 'Shows a "Watch the video" button on the recipe and in cooking mode.' : video.trim() ? "That isn't a YouTube video link yet." : 'Paste a YouTube link if there is a video of this dish.'}</Text>
            </>
          )}
          {missing && <Text style={{ color: C.faint, fontSize: 12, marginTop: 16 }}>To save: {missing}</Text>}
        </ScrollView>
        {making && <NewCategory onClose={() => setMaking(false)} onDone={(c) => { setMaking(false); setCols([...cols, c.id]); }} />}
      </View>
    </Modal>
  );
}
