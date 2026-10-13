import React from 'react';
import { Pressable, View } from 'react-native';
import { RECIPES, recipeById } from '../data/recipes';
import { DROP_BELOW, FAVOURITE_FROM } from '../engine/planner';
import { useApp } from '../state';
import DishPhoto from '../DishPhoto';
import { RecipeBookCard } from './RecipeBook';
import { Button, C, Card, Chip, F, Grid, H2, Icon, Label, P, Row, Screen, Text, Thumb, useLayout } from '../ui';

function Stars({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable key={n} onPress={() => onChange(n)} hitSlop={4} accessibilityLabel={`${n} stars`}>
          <Icon name={n <= value ? 'star' : 'star-outline'} size={28} color={n <= value ? C.gold : '#DCCDB8'} />
        </Pressable>
      ))}
    </View>
  );
}

const VERDICT = (v: number) =>
  v >= FAVOURITE_FROM ? { tone: 'good' as const, label: 'Favourite', icon: 'heart' as const }
    : v < DROP_BELOW ? { tone: 'bad' as const, label: 'Removed', icon: 'close' as const }
      : { tone: 'plain' as const, label: 'Kept', icon: 'remove' as const };

/** Step 5: the family gives each dish one star rating together. */
export default function RatingsScreen() {
  const { state, update } = useApp();
  const thisWeek = [...new Set(state.plan?.status === 'confirmed' ? state.plan.dishes.map((d) => d.recipeId) : [])];
  const rate = (id: string, stars: number) => update((st) => ({ ...st, ratings: { ...st.ratings, [id]: stars } }));
  const rated = RECIPES.filter((r) => state.ratings[r.id]).sort((a, b) => state.ratings[b.id] - state.ratings[a.id]);
  const kept = rated.filter((r) => state.ratings[r.id] >= DROP_BELOW);
  const dropped = rated.filter((r) => state.ratings[r.id] < DROP_BELOW);
  const left = thisWeek.filter((id) => !state.ratings[id]).length;
  const { cols } = useLayout();

  return (
    <Screen eyebrow="Step 5" title="Family ratings" subtitle="Rate each dish together. 4★ or 5★ makes it a favourite. 2★ or 3★ keeps it as it is. 1★ takes it off future menus.">
      {thisWeek.length === 0 ? (
        <Card style={{ alignItems: 'center', paddingVertical: 32, gap: 10 }}>
          <Icon name="star-half-outline" size={30} color={C.faint} />
          <P style={{ textAlign: 'center', color: C.muted }}>Once you confirm a weekly menu, its dishes show up here. Rate them together after makan!</P>
        </Card>
      ) : (
        <>
          <Row style={{ justifyContent: 'space-between', marginTop: 18 }}>
            <Text style={{ fontFamily: F.display, fontSize: 18 }}>This week</Text>
            <Text style={{ color: left ? C.accent : C.green, fontWeight: '700', fontSize: 13 }}>{left ? `${left} to rate` : 'All rated'}</Text>
          </Row>
          <Grid cols={Math.min(3, cols(300))}>
          {thisWeek.map((id) => {
            const r = recipeById(id);
            const v = state.ratings[id] ?? 0;
            const verdict = VERDICT(v);
            return (
              <Card key={id} style={{ marginTop: 8, padding: 14 }}>
                <Row style={{ flexWrap: 'nowrap', gap: 12 }}>
                  <DishPhoto recipe={r} size={52} />
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={{ fontFamily: F.display, fontSize: 15, lineHeight: 20 }}>{r.name}</Text>
                    <Row style={{ justifyContent: 'space-between' }}>
                      <Stars value={v} onChange={(n) => rate(id, n)} />
                      {v > 0 && <Chip tone={verdict.tone} icon={verdict.icon} label={verdict.label} />}
                    </Row>
                  </View>
                </Row>
              </Card>
            );
          })}
          </Grid>
        </>
      )}

      <Card style={{ marginTop: 22 }}>
        <Row>
          <Icon name="trophy" size={18} color={C.gold} />
          <H2 style={{ marginBottom: 0 }}>Family ranking</H2>
        </Row>
        {kept.length === 0 && <P style={{ color: C.muted, marginTop: 8 }}>No ratings yet.</P>}
        {kept.map((r, i) => (
          <Row key={r.id} style={{ paddingVertical: 8, flexWrap: 'nowrap', gap: 10, borderTopWidth: i ? 1 : 0, borderColor: C.line, marginTop: i ? 0 : 8 }}>
            <Text style={{ width: 22, fontFamily: F.display, color: i < 3 ? C.brand : C.faint, fontSize: 16 }}>{i + 1}</Text>
            <Text style={{ flex: 1 }}>{r.emoji}  {r.name}</Text>
            <Row style={{ gap: 1 }}>
              {Array.from({ length: state.ratings[r.id] }, (_, k) => <Icon key={k} name="star" size={13} color={C.gold} />)}
            </Row>
          </Row>
        ))}
      </Card>

      <RecipeBookCard />

      {dropped.length > 0 && (
        <>
          <Label>Off the menu</Label>
          <Card style={{ marginTop: 0 }}>
            {dropped.map((r, i) => (
              <Row key={r.id} style={{ justifyContent: 'space-between', paddingVertical: 6, flexWrap: 'nowrap', borderTopWidth: i ? 1 : 0, borderColor: C.line }}>
                <Text style={{ flex: 1, color: C.muted }}>{r.emoji}  {r.name}</Text>
                <Button small kind="ghost" icon="arrow-undo" label="Bring back" onPress={() => rate(r.id, DROP_BELOW)} />
              </Row>
            ))}
          </Card>
        </>
      )}
    </Screen>
  );
}
