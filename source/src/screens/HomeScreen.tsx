import React, { useState } from 'react';
import { Platform, TextInput, View } from 'react-native';
import { RECIPES, recipeById } from '../data/recipes';
import { DAY_NAMES, todayPlanDay } from '../engine/planner';
import { useApp } from '../state';
import { Recipe } from '../types';
import { Button, C, Card, Chip, F, Icon, Row, Screen, Text } from '../ui';
import { DishDetail } from './DishSheets';
import { AddRecipeFlow, RecipeBookSheet } from './RecipeBook';
import { useWebRecipes } from './WebRecipes';
import RecipeTiles from './RecipeTiles';
import ManualRecipe from './ManualRecipe';
import ScanRecipe from './ScanRecipe';

/** First page: today's dishes, then the whole recipe book as tiles of food photos. */
export default function HomeScreen() {
  const { state, family, update } = useApp();
  const [q, setQ] = useState('');
  const [viewing, setViewing] = useState<Recipe | null>(null);
  const [book, setBook] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [typing, setTyping] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [adding, setAdding] = useState<'import' | 'search' | 'gemini' | 'browse' | null>(null);
  const web = useWebRecipes();
  // a page sent here from the phone's Share button (an iPhone Shortcut or Android share opens ...?save=<link>)
  const [sharing, setSharing] = useState<string | null>(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
    const p = new URLSearchParams(window.location.search);
    const v = p.get('save') || p.get('url') || p.get('text');
    if (!v) return null;
    try { ['save', 'url', 'text', 'title'].forEach((k) => p.delete(k)); window.history.replaceState(null, '', window.location.pathname + (p.toString() ? `?${p}` : '') + window.location.hash); } catch { /* the address bar keeps the link: harmless */ }
    return v;
  });
  const term = q.trim().toLowerCase();
  const rows = RECIPES.filter((r) => !r.sickDay && !state.hiddenRecipes?.includes(r.id) && (!term || r.name.toLowerCase().includes(term) || r.cuisine.includes(term)))
    .sort((a, b) => a.name.localeCompare(b.name));
  const weekday = (new Date().getDay() + 6) % 7;
  const today = todayPlanDay(state.plan);
  const todays = (state.plan?.dishes ?? []).filter((d) => d.day === today).map((d) => recipeById(d.recipeId)).filter((r): r is Recipe => !!r);
  const todayMeals = (['breakfast', 'lunch'] as const).map((k) => ({ k, m: state.plan?.meals?.find((x) => x.day === today && x.meal === k) })).filter((x) => x.m)
    .map((x) => ({ label: x.k === 'breakfast' ? 'Breakfast' : 'Lunch', r: RECIPES.find((r) => r.id === x.m!.recipeId) })).filter((x): x is { label: string; r: Recipe } => !!x.r);
  const hello = family?.myName ? `Hello ${family.myName}` : 'Hello';

  return (
    <Screen eyebrow={hello} title="What's cooking?" subtitle="Tap a tile to see the dishes. Open one for its photo, ingredients and steps.">
      <View style={{ marginTop: 10, borderRadius: 28, backgroundColor: C.saffron, padding: 18, overflow: 'hidden' }}>
        <View style={{ position: 'absolute', right: -34, top: -34, width: 130, height: 130, borderRadius: 65, backgroundColor: 'rgba(255,255,255,0.35)' }} />
        <View style={{ position: 'absolute', right: 34, top: 30, width: 54, height: 54, borderRadius: 27, backgroundColor: C.accent }} />
        <View style={{ position: 'absolute', right: 14, top: 74, width: 30, height: 30, borderRadius: 15, backgroundColor: C.sage }} />
        <Text style={{ color: C.brandDeep, fontSize: 12, fontFamily: F.xbold, letterSpacing: 1.2 }}>{DAY_NAMES[weekday].toUpperCase()}, TODAY</Text>
        {todayMeals.length > 0 && (
          <View style={{ marginTop: 6, gap: 2, paddingRight: 90 }}>
            {todayMeals.map((x) => (
              <Text key={x.label} accessibilityRole="button" onPress={() => setViewing(x.r)} style={{ color: C.brandDeep, fontFamily: F.semi, fontSize: 15 }}>{x.label}: {x.r.name}</Text>
            ))}
          </View>
        )}
        {todays.length ? (
          <View style={{ marginTop: 6, gap: 4, paddingRight: 90 }}>
            {todays.map((r) => (
              <Text key={r.id} accessibilityRole="button" onPress={() => setViewing(r)} style={{ color: C.brandDeep, fontFamily: F.display, fontSize: 19 }}>{r.emoji} {r.name}</Text>
            ))}
          </View>
        ) : (
          <Text style={{ color: C.brandDeep, marginTop: 6, fontSize: 15, lineHeight: 21, paddingRight: 90, fontFamily: F.semi }}>No menu planned for today yet. Plan the week in the Menu tab.</Text>
        )}
      </View>

      <TextInput value={q} onChangeText={setQ} placeholder="Search recipes or cuisines" placeholderTextColor={C.faint} accessibilityLabel="Search recipes"
        style={{ marginTop: 14, backgroundColor: C.card, borderWidth: 2, borderColor: C.line, borderRadius: 26, paddingHorizontal: 18, paddingVertical: 13, fontSize: 15, color: C.ink, fontFamily: F.medium }} />
      <View style={{ marginTop: 12 }}>
        <Button icon={addOpen ? 'chevron-up' : 'add'} label="Add a recipe" onPress={() => setAddOpen(!addOpen)} />
        {addOpen && (
          <View style={{ marginTop: 8, gap: 8 }}>
            {web && <Button kind="ghost" icon="globe-outline" label="Browse a recipe website and save several" onPress={() => { setAddOpen(false); setAdding('browse'); }} />}
            {web && <Button kind="ghost" icon="search" label="Search for a recipe" onPress={() => { setAddOpen(false); setAdding('search'); }} />}
            <Button kind="ghost" icon="scan-outline" label="Scan a recipe from a photo or PDF" onPress={() => { setAddOpen(false); setScanning(true); }} />
            <Button kind="ghost" icon="create-outline" label="Type in my own recipe and photo" onPress={() => { setAddOpen(false); setTyping(true); }} />
            <Button kind="ghost" icon="sparkles" label="Type a dish or paste a recipe (Gemini)" onPress={() => { setAddOpen(false); setAdding('gemini'); }} />
          </View>
        )}
      </View>
      {rows.length > 0 ? <RecipeTiles allFirst recipes={rows} searching={term.length > 0} onOpen={setViewing} /> : <Text style={{ color: C.muted, marginTop: 14 }}>Nothing matches “{q}”.</Text>}
      {(state.hiddenRecipes ?? []).length > 0 && !term && family?.role !== 'helper' && (
        <View style={{ marginTop: 18, paddingTop: 12, borderTopWidth: 1, borderColor: C.line }}>
          <Text style={{ color: C.muted, fontSize: 13, lineHeight: 19 }}>Deleted recipes: {state.hiddenRecipes!.map((id) => recipeById(id)?.name).filter(Boolean).join(', ')}</Text>
          <View style={{ marginTop: 8, alignSelf: 'flex-start' }}>
            <Button small kind="ghost" icon="refresh" label={state.hiddenRecipes!.length === 1 ? 'Bring it back' : `Bring all ${state.hiddenRecipes!.length} back`} onPress={() => update((st) => ({ ...st, hiddenRecipes: [] }))} />
          </View>
        </View>
      )}

      {viewing && <DishDetail recipe={viewing} onClose={() => setViewing(null)} />}
      {adding && <AddRecipeFlow start={adding} onClose={() => setAdding(null)} />}
      {scanning && <ScanRecipe onClose={() => setScanning(false)} />}
      {typing && <ManualRecipe onClose={() => setTyping(false)} />}
      {sharing && <AddRecipeFlow start="browse" saveUrl={sharing} onClose={() => setSharing(null)} />}
      {book && <RecipeBookSheet onClose={() => setBook(false)} />}
    </Screen>
  );
}
