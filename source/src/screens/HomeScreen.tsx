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
      <View style={{ marginTop: 10, borderRadius: 28, backgroundColor: C.saffron, padding: 18, overflow: 'hidden' }}>
        <View style={{ position: 'absolute', right: -34, top: -34, width: 130, height: 130, borderRadius: 65, backgroundColor: 'rgba(255,255,255,0.35)' }} />
        <View style={{ position: 'absolute', right: 34, top: 30, width: 54, height: 54, borderRadius: 27, backgroundColor: C.accent }} />
        <View style={{ position: 'absolute', right: 14, top: 74, width: 30, height: 30, borderRadius: 15, backgroundColor: C.sage }} />
        <Text style={{ color: C.brandDeep, fontSize: 12, fontFamily: F.xbold, letterSpacing: 1.2 }}>{DAY_NAMES[today].toUpperCase()}, TODAY</Text>
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
