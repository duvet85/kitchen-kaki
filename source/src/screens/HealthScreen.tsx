import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { recipeById } from '../data/recipes';
import { CONDITION_LABEL, healthFlags } from '../engine/health';
import { DAY_NAMES, householdSpiceCap } from '../engine/planner';
import { Fix, balanceFixes, placeDish, scoreOf } from '../engine/balance';
import { newId } from '../state';
import DishPhoto from '../DishPhoto';
import { DishDetail, DishPicker } from './DishSheets';
import { Recipe } from '../types';
import { useApp } from '../state';
import { Avatar, Bar, Button, C, Card, Chip, EmptyState, F, Grid, H2, Icon, Label, Notice, P, Row, Screen, Text, chillies, useLayout } from '../ui';
import { cap } from './FamilyScreen';
import { useTripGate } from './TripConfirm';
import { groceryFit } from '../engine/grocery';

/** Steps 6–8: balanced diet score, health/diet/religion watch-outs, spice levels. */
export default function HealthScreen() {
  const { state, update } = useApp();
  const recipes = state.plan?.dishes.map((d) => recipeById(d.recipeId)) ?? [];
  const score = state.plan ? scoreOf(state.plan.dishes) : null;
  const fixes = balanceFixes(state);
  const [skipped, setSkipped] = useState<string[]>([]);
  const [preview, setPreview] = useState<Recipe | null>(null);
  const [picking, setPicking] = useState<Fix | null>(null);
  const fixKey = (f: Fix) => `${f.key}:${f.day}:${f.replace?.recipeId ?? ''}`;
  const shown = fixes.filter((f) => !skipped.includes(fixKey(f)));
  const gate = useTripGate(state);
  const choose = (f: Fix, recipeId: string) => gate.ask(groceryFit(state, recipeById(recipeId)).toBuy, () => update((st) => placeDish(st, f.day, recipeId, f.replace, newId)));
  const hasFruit = (state.extras ?? []).some((e) => /fruit/i.test(e.name));
  const addFruit = () => update((st) => ({ ...st, extras: [...(st.extras ?? []), { id: newId(), name: 'Fruit for the week', note: 'about 2 servings a day per person', done: false }] }));
  const fruitDays = state.fruitDays ?? [];
  const toggleFruit = (day: number) => update((st) => ({ ...st, fruitDays: (st.fruitDays ?? []).includes(day) ? (st.fruitDays ?? []).filter((x) => x !== day) : [...(st.fruitDays ?? []), day] }));
  const planDays = [...new Set(state.plan?.dishes.map((d) => d.day) ?? [])].sort((x, y) => x - y);
  const spice = householdSpiceCap(state.members);
  const { isTablet, cols } = useLayout();
  const gradeColor = score ? ({ A: C.green, B: C.green, C: C.amber, D: C.red } as Record<string, string>)[score.grade] : C.muted;

  return (
    <Screen eyebrow="Steps 6 to 8" title="Health check" subtitle="Is the week balanced, and what should each person watch out for?">
      <Grid cols={isTablet ? 2 : 1}>
      {!score ? (
        <EmptyState title="Nothing to check yet">Make a weekly menu and I'll tell you how balanced it is, kaki.</EmptyState>
      ) : (
        <Card>
          <Row style={{ flexWrap: 'nowrap', gap: 14 }}>
            <View style={{ width: 76, height: 76, borderRadius: 38, borderWidth: 6, borderColor: gradeColor, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontFamily: F.displayX, fontSize: 32, color: gradeColor }}>{score.grade}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <H2 style={{ marginBottom: 0 }}>Balanced diet score</H2>
              <Text style={{ fontFamily: F.display, fontSize: 22 }}>{score.total}<Text style={{ color: C.faint, fontSize: 14 }}> / 100</Text></Text>
              <Text style={{ color: C.muted, fontSize: 12 }}>Week {state.plan?.weekNo} menu</Text>
            </View>
          </Row>
          <View style={{ gap: 12, marginTop: 16 }}>
            {score.parts.map((p) => (
              <View key={p.label}>
                <Row style={{ justifyContent: 'space-between', marginBottom: 5 }}>
                  <Text style={{ fontWeight: '600' }}>{p.label}</Text>
                  <Text style={{ color: C.muted, fontSize: 12 }}>{p.detail} · {p.pts}/{p.max}</Text>
                </Row>
                <Bar value={p.pts / p.max} color={p.pts / p.max >= 0.75 ? C.brand : C.gold} />
              </View>
            ))}
          </View>
          <Label>Day by day</Label>
          <View style={{ gap: 6 }}>
            {score.days.map((d) => (
              <Row key={d.day} style={{ flexWrap: 'nowrap', gap: 10 }}>
                <Text style={{ width: 36, fontWeight: '700' }}>{DAY_NAMES[d.day]}</Text>
                <View style={{ flex: 1 }}><Bar value={d.vegShare} color={d.vegShare >= 0.5 ? C.brand : C.gold} /></View>
                <Text style={{ width: 92, color: C.muted, fontSize: 12 }}>{Math.round(d.vegShare * 100)}% veg{d.salty > 1 ? ' · salty' : ''}</Text>
              </Row>
            ))}
            <Text style={{ color: C.faint, fontSize: 11 }}>Bar: vegetables vs protein in that day's dishes. Aim for about two thirds veg.</Text>
          </View>
          <Label>Tips</Label>
          <View style={{ gap: 6 }}>
            {score.tips.map((tip) => (
              <Row key={tip} style={{ flexWrap: 'nowrap', alignItems: 'flex-start', gap: 8 }}>
                <Icon name="bulb-outline" size={16} color={C.brand} />
                <Text style={{ flex: 1, lineHeight: 20 }}>{tip}</Text>
              </Row>
            ))}
          </View>
          <Text style={{ color: C.muted, fontSize: 12, marginTop: 12 }}>This score is for the cooked dishes only and assumes no fruit, so having no fruit never lowers it. Fruit is tracked in its own card below.</Text>
          <Text style={{ color: C.faint, fontSize: 11, marginTop: 6 }}>Based on HPB's "My Healthy Plate" and dietary guidelines (fish twice a week, limit red meat, salt under 5g a day). General guidance, not a dietitian's advice for any one person.</Text>
        </Card>
      )}

      {shown.length > 0 && (
        <Card>
          <Row><Icon name="options-outline" size={18} color={C.brand} /><H2 style={{ marginBottom: 0 }}>Make it more balanced</H2></Row>
          <Text style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>Pick a dish, choose one yourself, or leave it as it is. {state.plan?.status === 'confirmed' ? 'The menu is already sent, so the helper gets a note about any change.' : ''}</Text>
          {shown.map((f) => (
            <View key={fixKey(f)} style={{ marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderColor: C.line, gap: 8 }}>
              <Text style={{ fontWeight: '700', lineHeight: 20 }}>{f.text}</Text>
              {f.options.map((o) => (
                <Row key={o.r.id} style={{ flexWrap: 'nowrap', gap: 10 }}>
                  <DishPhoto recipe={o.r} size={44} />
                  <Pressable style={{ flex: 1 }} onPress={() => setPreview(o.r)} accessibilityRole="link" accessibilityLabel={`See ${o.r.name}`}>
                    <Text style={{ fontWeight: '600', color: C.brandDeep, textDecorationLine: 'underline' }}>{o.r.name}</Text>
                    <Text style={{ color: C.muted, fontSize: 12 }}>Score +{o.gain}</Text>
                    <Text style={{ color: C.muted, fontSize: 12 }}>{DAY_NAMES[f.day]} would be: {o.after.join(' · ')}</Text>
                    {o.notes.map((n) => <Text key={n} style={{ color: C.amber, fontSize: 12 }}>{n}</Text>)}
                  </Pressable>
                  <Button small kind="ghost" label={f.replace ? 'Swap' : 'Add'} onPress={() => choose(f, o.r.id)} />
                </Row>
              ))}
              <Row style={{ gap: 8 }}>
                <Button small kind="quiet" icon="list-outline" label="Pick myself" onPress={() => setPicking(f)} />
                <Button small kind="quiet" icon="close" label="No change" onPress={() => setSkipped([...skipped, fixKey(f)])} />
              </Row>
            </View>
          ))}
        </Card>
      )}
      {preview && <DishDetail recipe={preview} onClose={() => setPreview(null)} />}
      {picking && (
        <DishPicker day={picking.day} course="dish" replace={picking.replace} onClose={() => setPicking(null)}
          onPick={(id) => { choose(picking, id); setPicking(null); }} />
      )}
      {gate.sheet}

      {state.plan && planDays.length > 0 && (
        <Card>
          <Row><Icon name="nutrition-outline" size={18} color={C.accent} /><H2 style={{ marginBottom: 0 }}>Fruit (optional, not in the score)</H2></Row>
          <Text style={{ color: C.muted, fontSize: 13, marginTop: 4, lineHeight: 19 }}>HPB suggests about 2 servings of fruit a day. The recipes have none, so tick the days fruit is served (a banana, papaya, or cut fruit after dinner).</Text>
          <Row style={{ marginTop: 10, gap: 6 }}>
            {planDays.map((d) => <Chip key={d} label={DAY_NAMES[d]} selected={fruitDays.includes(d)} onPress={() => toggleFruit(d)} />)}
          </Row>
          <Text style={{ color: fruitDays.length >= planDays.length ? C.green : C.muted, fontSize: 13, marginTop: 8, fontWeight: '600' }}>
            Fruit on {fruitDays.filter((d) => planDays.includes(d)).length} of {planDays.length} days
          </Text>
          {!hasFruit && <View style={{ marginTop: 8, alignSelf: 'flex-start' }}><Button small kind="ghost" icon="cart-outline" label="Add fruit to the shopping run" onPress={addFruit} /></View>}
        </Card>
      )}

      <Card>
        <Row><Icon name="flame" size={18} color={C.accent} /><H2 style={{ marginBottom: 0 }}>Spice levels</H2></Row>
        <View style={{ marginTop: 8 }}>
          {state.members.map((m, i) => (
            <Row key={m.id} style={{ justifyContent: 'space-between', paddingVertical: 7, borderTopWidth: i ? 1 : 0, borderColor: C.line }}>
              <Text style={{ fontWeight: '600' }}>{m.name}</Text>
              <Text style={{ color: C.muted }}>{m.taste ? chillies(m.taste.spice) : 'Quiz not done'}</Text>
            </Row>
          ))}
        </View>
        <Notice tone="brand" icon="information-circle-outline">
          {spice.cap === 0
            ? 'Shared dishes are cooked without chilli, with chilli served on the side.'
            : `Shared dishes are cooked at ${chillies(spice.cap)} or milder; hotter dishes get chilli on the side.`}
        </Notice>
      </Card>
      </Grid>

      <Label style={{ marginTop: 24 }}>Watch-outs by person</Label>
      <Grid cols={Math.min(3, cols(300))}>
      {state.members.map((m, idx) => {
        const flagged = recipes.map((r) => ({ r, flags: healthFlags(r, m) })).filter((x) => x.flags.length);
        const notVeg = m.vegetarian ? recipes.filter((r) => !r.vegetarian) : [];
        const rules = [
          ...(m.vegetarian ? ['Vegetarian'] : []),
          ...(m.religion !== 'none' ? [m.religion === 'halal' ? 'Halal' : m.religion === 'no-pork' ? 'No pork' : 'No beef'] : []),
          ...m.allergies.map((a) => `${cap(a)} allergy`),
        ];
        if (!rules.length && !m.conditions.length) return null;
        return (
          <Card key={m.id} style={{ marginTop: 8 }}>
            <Row style={{ flexWrap: 'nowrap', gap: 12, alignItems: 'flex-start' }}>
              <Avatar name={m.name} index={idx} />
              <View style={{ flex: 1, gap: 6 }}>
                <H2 style={{ marginBottom: 0 }}>{m.name}</H2>
                <Row>
                  {rules.map((x) => <Chip key={x} tone={x.endsWith('allergy') ? 'bad' : 'brand'} label={x} />)}
                  {m.conditions.map((c) => <Chip key={c} tone="warn" icon="medkit" label={CONDITION_LABEL[c]} />)}
                </Row>
              </View>
            </Row>
            {rules.length > 0 && <Notice tone="good" icon="shield-checkmark">Dishes that break these rules are left out of the menu automatically.</Notice>}
            {notVeg.length > 0 && <Notice tone="brand" icon="leaf-outline">Skip: {notVeg.map((r) => r.name).join(', ')}</Notice>}
            {flagged.map(({ r, flags }) => <Notice key={r.id} tone="bad" icon="medkit-outline">{r.name}: {flags.join(', ')}</Notice>)}
            {m.conditions.length > 0 && !flagged.length && recipes.length > 0 && <Notice tone="good" icon="checkmark-circle">Nothing to watch this week.</Notice>}
          </Card>
        );
      })}
      </Grid>
    </Screen>
  );
}
