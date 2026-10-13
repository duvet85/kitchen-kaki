import React, { useState } from 'react';
import { TextInput, View } from 'react-native';
import { RECIPES, recipeById } from '../data/recipes';
import { DAY_NAMES } from '../engine/planner';
import { useApp } from '../state';
import { Recipe } from '../types';
import { Button, C, Card, Chip, F, Icon, Row, Screen, Text } from '../ui';
import { DishDetail } from './DishSheets';
import { RecipeBookSheet } from './RecipeBook';
import { useWebRecipes } from './WebRecipes';
import RecipeTiles from './RecipeTiles';

/** First page: today's dishes, then the whole recipe book as tiles of food photos. */
export default function HomeScreen() {
  const { state, family } = useApp();
  const [q, setQ] = useState('');
  const [viewing, setViewing] = useState<Recipe | null>(null);
  const [book, setBook] = useState(false);
  const web = useWebRecipes();
  const term = q.trim().toLowerCase();
  const rows = RECIPES.filter((r) => !r.sickDay && (!term || r.name.toLowerCase().includes(term) || r.cuisine.includes(term)))
    .sort((a, b) => a.name.localeCompare(b.name));
  const today = (new Date().getDay() + 6) % 7;
  const todays = (state.plan?.dishes ?? []).filter((d) => d.day === today).map((d) => recipeById(d.recipeId)).filter((r): r is Recipe => !!r);
  const hello = family?.myName ? `Hello ${family.myName}` : 'Hello';

  return (
    <Screen eyebrow={hello} title="What's cooking?" subtitle="Tap a tile to see the dishes. Open one for its photo, ingredients and steps.">
      <View style={{ marginTop: 10, borderRadius: 20, backgroundColor: C.brand, padding: 16, overflow: 'hidden' }}>
        <View style={{ position: 'absolute', right: -26, top: -26, width: 110, height: 110, borderRadius: 55, backgroundColor: C.chilli, opacity: 0.9 }} />
        <View style={{ position: 'absolute', right: 48, top: 44, width: 46, height: 46, borderRadius: 23, backgroundColor: C.saffron, opacity: 0.95 }} />
        <View style={{ position: 'absolute', right: 8, top: 70, width: 30, height: 30, borderRadius: 15, backgroundColor: C.accent, opacity: 0.95 }} />
        <Text style={{ color: '#FFE3A8', fontSize: 12, fontFamily: F.bold, letterSpacing: 1.2 }}>{DAY_NAMES[today].toUpperCase()}, TODAY</Text>
        {todays.length ? (
          <View style={{ marginTop: 6, gap: 4, paddingRight: 90 }}>
            {todays.map((r) => (
              <Text key={r.id} accessibilityRole="button" onPress={() => setViewing(r)} style={{ color: '#fff', fontFamily: F.display, fontSize: 18 }}>{r.emoji} {r.name}</Text>
            ))}
          </View>
        ) : (
          <Text style={{ color: '#fff', marginTop: 6, fontSize: 15, lineHeight: 21, paddingRight: 90 }}>No menu planned for today yet. Plan the week in the Menu tab.</Text>
        )}
      </View>

      <TextInput value={q} onChangeText={setQ} placeholder="Search recipes or cuisines" placeholderTextColor={C.faint} accessibilityLabel="Search recipes"
        style={{ marginTop: 14, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: C.ink }} />
      {rows.length > 0 ? <RecipeTiles recipes={rows} searching={term.length > 0} onOpen={setViewing} /> : <Text style={{ color: C.muted, marginTop: 14 }}>Nothing matches “{q}”.</Text>}

      <Card style={{ marginTop: 18, backgroundColor: C.saffronSoft, shadowOpacity: 0 }}>
        <Row style={{ flexWrap: 'nowrap', gap: 10 }}>
          <Icon name="add-circle" size={22} color={C.chilli} />
          <Text style={{ flex: 1, fontFamily: F.display, fontSize: 15 }}>{web ? 'Add your own dish: import from a link, search the web, or write it up with Gemini.' : 'Add your own dish and let Gemini write it up.'}</Text>
        </Row>
        <View style={{ marginTop: 10 }}><Button label="Open the recipe book" icon="book-outline" onPress={() => setBook(true)} /></View>
      </Card>
      {viewing && <DishDetail recipe={viewing} onClose={() => setViewing(null)} />}
      {book && <RecipeBookSheet onClose={() => setBook(false)} />}
    </Screen>
  );
}
