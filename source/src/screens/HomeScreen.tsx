import React, { useState } from 'react';
import { TextInput, View } from 'react-native';
import { RECIPES, recipeById } from '../data/recipes';
import { DAY_NAMES } from '../engine/planner';
import { useApp } from '../state';
import { Recipe } from '../types';
import { Button, C, Card, Chip, F, Icon, Row, Screen, Text } from '../ui';
import { DishDetail } from './DishSheets';
import { AddRecipeFlow, RecipeBookSheet } from './RecipeBook';
import { useWebRecipes } from './WebRecipes';
import RecipeTiles from './RecipeTiles';

/** First page: today's dishes, then the whole recipe book as tiles of food photos. */
export default function HomeScreen() {
  const { state, family } = useApp();
  const [q, setQ] = useState('');
  const [viewing, setViewing] = useState<Recipe | null>(null);
  const [book, setBook] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [adding, setAdding] = useState<'import' | 'search' | 'gemini' | null>(null);
  const web = useWebRecipes();
  const term = q.trim().toLowerCase();
  const rows = RECIPES.filter((r) => !r.sickDay && (!term || r.name.toLowerCase().includes(term) || r.cuisine.includes(term)))
    .sort((a, b) => a.name.localeCompare(b.name));
  const today = (new Date().getDay() + 6) % 7;
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
        <Text style={{ color: C.brandDeep, fontSize: 12, fontFamily: F.xbold, letterSpacing: 1.2 }}>{DAY_NAMES[today].toUpperCase()}, TODAY</Text>
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
            {web && <Button kind="ghost" icon="link" label="Import from a website link" onPress={() => { setAddOpen(false); setAdding('import'); }} />}
            {web && <Button kind="ghost" icon="search" label="Search the web for a recipe" onPress={() => { setAddOpen(false); setAdding('search'); }} />}
            <Button kind="ghost" icon="sparkles" label="Type a dish or paste a recipe (Gemini)" onPress={() => { setAddOpen(false); setAdding('gemini'); }} />
            <Button kind="ghost" icon="book-outline" label="Open the recipe book" onPress={() => { setAddOpen(false); setBook(true); }} />
          </View>
        )}
      </View>
      {rows.length > 0 ? <RecipeTiles allFirst recipes={rows} searching={term.length > 0} onOpen={setViewing} /> : <Text style={{ color: C.muted, marginTop: 14 }}>Nothing matches “{q}”.</Text>}

      {viewing && <DishDetail recipe={viewing} onClose={() => setViewing(null)} />}
      {adding && <AddRecipeFlow start={adding} onClose={() => setAdding(null)} />}
      {book && <RecipeBookSheet onClose={() => setBook(false)} />}
    </Screen>
  );
}
