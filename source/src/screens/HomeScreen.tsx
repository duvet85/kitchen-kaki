import React, { useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { RECIPES, recipeById } from '../data/recipes';
import { DAY_NAMES, dateOfPlanDay, todayPlanDay, weekdayOfPlanDay } from '../engine/planner';
import { shortDate } from '../i18n-units';
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
  const hello = family?.myName ? `Hello ${family.myName}` : 'Hello';

  return (
    <Screen eyebrow={hello} title="What's cooking?" subtitle="Tap a tile to see the dishes. Open one for its photo, ingredients and steps.">
      <DayCards onOpen={setViewing} />

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

/** The day's menu as a yellow card. Swipe sideways for the other days of the week (today shows first); the dots show where you are. */
function DayCards({ onOpen }: { onOpen: (r: Recipe) => void }) {
  const { state } = useApp();
  const plan = state.plan;
  const today = plan ? todayPlanDay(plan) : 0;
  const [width, setWidth] = useState(0);
  const [at, setAt] = useState(today);
  const ref = useRef<ScrollView>(null);
  const placed = useRef(false);
  // every page is as tall as the tallest day, so the dots stay right under the card
  const [tall, setTall] = useState<Record<number, number>>({});
  const maxH = Math.max(0, ...Object.values(tall));
  const days = plan ? [0, 1, 2, 3, 4, 5, 6] : [today];
  const go = (d: number) => { setAt(d); ref.current?.scrollTo({ x: d * width, animated: true }); };

  const label = (d: number) => {
    const weekday = plan ? weekdayOfPlanDay(plan, d) : (new Date().getDay() + 6) % 7;
    const name = DAY_NAMES[weekday].toUpperCase();
    const off = d - today;
    if (off === 0) return `${name}, TODAY`;
    if (off === 1) return `${name}, TOMORROW`;
    if (off === -1) return `${name}, YESTERDAY`;
    return plan ? `${name}, ${shortDate(dateOfPlanDay(plan, d), 'en').toUpperCase()}` : name;
  };

  const card = (d: number) => {
    const dishes = (plan?.dishes ?? []).filter((x) => x.day === d).map((x) => recipeById(x.recipeId)).filter((r): r is Recipe => !!r);
    const meals = (['breakfast', 'lunch'] as const).map((k) => ({ k, m: plan?.meals?.find((x) => x.day === d && x.meal === k) })).filter((x) => x.m)
      .map((x) => ({ label: x.k === 'breakfast' ? 'Breakfast' : 'Lunch', r: RECIPES.find((r) => r.id === x.m!.recipeId) })).filter((x): x is { label: string; r: Recipe } => !!x.r);
    return (
      <View key={d} style={{ width: width || undefined }}>
        <View style={{ borderRadius: 28, backgroundColor: C.saffron, padding: 18, overflow: 'hidden', minHeight: Math.max(150, maxH + 36) }}>
          <View style={{ position: 'absolute', right: -34, top: -34, width: 130, height: 130, borderRadius: 65, backgroundColor: 'rgba(255,255,255,0.35)' }} />
          <View style={{ position: 'absolute', right: 34, top: 30, width: 54, height: 54, borderRadius: 27, backgroundColor: C.accent }} />
          <View style={{ position: 'absolute', right: 14, top: 74, width: 30, height: 30, borderRadius: 15, backgroundColor: C.sage }} />
          <View onLayout={(e) => { const h = Math.ceil(e.nativeEvent.layout.height); if (tall[d] !== h) setTall((t) => ({ ...t, [d]: h })); }}>
          <Text style={{ color: C.brandDeep, fontSize: 12, fontFamily: F.xbold, letterSpacing: 1.2 }}>{label(d)}</Text>
          {meals.length > 0 && (
            <View style={{ marginTop: 6, gap: 2, paddingRight: 90 }}>
              {meals.map((x) => (
                <Text key={x.label} accessibilityRole="button" onPress={() => onOpen(x.r)} style={{ color: C.brandDeep, fontFamily: F.semi, fontSize: 15 }}>{x.label}: {x.r.name}</Text>
              ))}
            </View>
          )}
          {dishes.length ? (
            <View style={{ marginTop: 6, gap: 4, paddingRight: 90 }}>
              {dishes.map((r) => (
                <Text key={r.id} accessibilityRole="button" onPress={() => onOpen(r)} style={{ color: C.brandDeep, fontFamily: F.display, fontSize: 19 }}>{r.emoji} {r.name}</Text>
              ))}
            </View>
          ) : (
            <Text style={{ color: C.brandDeep, marginTop: 6, fontSize: 15, lineHeight: 21, paddingRight: 90, fontFamily: F.semi }}>
              {plan ? 'Nothing planned for this day.' : 'No menu planned for today yet. Plan the week in the Menu tab.'}
            </Text>
          )}
          </View>
        </View>
      </View>
    );
  };

  if (!plan) return <View style={{ marginTop: 10 }}>{card(today)}</View>;
  return (
    <View style={{ marginTop: 10 }} onLayout={(e) => setWidth(Math.round(e.nativeEvent.layout.width))}>
      {width > 0 && (
        <ScrollView ref={ref} horizontal pagingEnabled showsHorizontalScrollIndicator={false} decelerationRate="fast" snapToInterval={width} snapToAlignment="start"
          contentContainerStyle={{ alignItems: 'stretch' }} accessibilityLabel="This week's menu, one day at a time"
          onContentSizeChange={() => { if (!placed.current) { placed.current = true; ref.current?.scrollTo({ x: today * width, animated: false }); } }}
          onScroll={(e) => { const d = Math.round(e.nativeEvent.contentOffset.x / width); if (d !== at && d >= 0 && d < 7) setAt(d); }} scrollEventThrottle={50}>
          {days.map(card)}
        </ScrollView>
      )}
      <Row style={{ justifyContent: 'center', gap: 6, marginTop: 8 }}>
        {days.map((d) => (
          <Pressable key={d} onPress={() => go(d)} hitSlop={6} accessibilityRole="button" accessibilityLabel={`Show ${label(d).toLowerCase()}`} accessibilityState={{ selected: d === at }}>
            <View style={{ width: d === at ? 18 : 7, height: 7, borderRadius: 4, backgroundColor: d === at ? C.brandDeep : d === today ? C.saffron : C.line }} />
          </Pressable>
        ))}
      </Row>
    </View>
  );
}
