import { cookL } from '../cook';
import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { RECIPES, recipeById } from '../data/recipes';
import { CATALOGUE } from '../data/store';
import DishPhoto from '../DishPhoto';
import { mealFor } from '../data/categories';
import { MEAL_LABEL, mealChoices, mealKey, mealOn, placeMeal, removeMeal, setMealPlanned } from '../engine/meals';
import { dishCost, groceryFit, roughMoney } from '../engine/grocery';
import { planDayName, MEAL_KINDS, exclusionReasons, familyScore, isCooked } from '../engine/planner';
import { newId, useApp } from '../state';
import { PlannedMealKind, Recipe } from '../types';
import { Button, C, Chip, F, Icon, IconButton, Row, Text, chillies } from '../ui';
import { DishDetail } from './DishSheets';
import { PotRating } from './PotRating';
import { Sheet, cap } from './FamilyScreen';
import { useTripGate } from './TripConfirm';

/** Menu settings: which meals besides dinner to plan. */
export function MealToggles() {
  const { state, update } = useApp();
  return (
    <View style={{ marginTop: 12 }}>
      <Text style={{ fontFamily: F.display, fontSize: 14 }}>Meals to plan</Text>
      <Text style={{ color: C.muted, fontSize: 12, marginTop: 2, lineHeight: 17 }}>Dinner is always planned. Switch on breakfast or lunch to get one for each day, picked by the same rules (allergies, religion, ratings). You can swap any of them.</Text>
      <Row style={{ marginTop: 8, gap: 6 }}>
        <Chip label="Dinner" selected icon="restaurant-outline" />
        {MEAL_KINDS.map((k) => (
          <Chip key={k} label={MEAL_LABEL[k].title} icon={state.settings.meals?.[k] ? 'checkmark' : undefined} selected={!!state.settings.meals?.[k]}
            onPress={() => update((st) => setMealPlanned(st, k, !st.settings.meals?.[k], newId))} />
        ))}
      </Row>
      {MEAL_KINDS.some((k) => state.settings.meals?.[k] && mealChoices(state, k).length === 0) && (
        <Text style={{ color: C.amber, fontSize: 12, marginTop: 6 }}>No {MEAL_KINDS.filter((k) => state.settings.meals?.[k] && mealChoices(state, k).length === 0).join(' or ')} recipe fits your family's rules yet, so nothing was planned for it.</Text>
      )}
    </View>
  );
}

/** One breakfast or lunch on a day of the Menu tab. */
export function MealRow({ day, kind }: { day: number; kind: PlannedMealKind }) {
  const { state, update } = useApp();
  const plan = state.plan!;
  const gate = useTripGate(state);
  const [picking, setPicking] = useState(false);
  const [detail, setDetail] = useState<Recipe | null>(null);
  const m = mealOn(plan, day, kind);
  const r = m ? RECIPES.find((x) => x.id === m.recipeId) : undefined;
  const cooked = !!m && isCooked(plan, { recipeId: m.recipeId, day: m.day, isNew: false });
  const L = MEAL_LABEL[kind];
  return (
    <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 16, backgroundColor: C.card, borderWidth: 1, borderColor: C.line }}>
      {r ? <DishPhoto recipe={r} size={44} /> : <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: C.brandSoft, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 20 }}>{L.emoji}</Text></View>}
      <View style={{ flex: 1 }}>
        <Text style={{ color: C.muted, fontSize: 11, fontFamily: F.xbold, letterSpacing: 1 }}>{L.title.toUpperCase()}</Text>
        {r
          ? <Pressable onPress={() => setDetail(r)} accessibilityRole="button" accessibilityLabel={`See ${r.name}`}><Text style={{ fontFamily: F.display, fontSize: 15 }}>{r.name}</Text></Pressable>
          : <Text style={{ color: C.muted, fontSize: 13 }}>Nothing planned</Text>}
        {r && <Text style={{ color: C.muted, fontSize: 12 }}>{r.minutes} min · {roughMoney(dishCost(r))}{cooked ? ' · cooked' : ''}</Text>}
        {r && <PotRating recipe={r} size={14} />}
      </View>
      {!cooked && (r
        ? <Row style={{ gap: 4, flexWrap: 'nowrap' }}>
            <IconButton icon="swap-horizontal" label={`Swap ${r.name}`} onPress={() => setPicking(true)} />
            <IconButton icon="close" label={`Remove ${r.name}`} onPress={() => update((st) => removeMeal(st, day, kind, newId))} />
          </Row>
        : <Button small kind="ghost" icon="add" label="Add" onPress={() => setPicking(true)} />)}
      {picking && (
        <MealPicker day={day} kind={kind} current={m?.recipeId} onClose={() => setPicking(false)}
          onPick={(id) => gate.ask(groceryFit(state, recipeById(id)).toBuy, () => { update((st) => placeMeal(st, day, kind, id, newId)); setPicking(false); })} />
      )}
      {detail && <DishDetail recipe={detail} onClose={() => setDetail(null)} />}
    </View>
  );
}

/** "+ Breakfast" / "+ Lunch" button on one day: adds that meal to just this day, even when the weekly switch is off. */
export function AddMealButton({ day, kind }: { day: number; kind: PlannedMealKind }) {
  const { state, update } = useApp();
  const gate = useTripGate(state);
  const [picking, setPicking] = useState(false);
  return (
    <>
      <Button small kind="ghost" icon="add" label={MEAL_LABEL[kind].title} onPress={() => setPicking(true)} />
      {picking && (
        <MealPicker day={day} kind={kind} onClose={() => setPicking(false)}
          onPick={(id) => gate.ask(groceryFit(state, recipeById(id)).toBuy, () => { update((st) => placeMeal(st, day, kind, id, newId)); setPicking(false); })} />
      )}
    </>
  );
}

/** Choose a breakfast or lunch for a day: the dishes that pass the family's rules, best liked first, and what was left out and why. */
function MealPicker({ day, kind, current, onPick, onClose }: { day: number; kind: PlannedMealKind; current?: string; onPick: (id: string) => void; onClose: () => void }) {
  const { state } = useApp();
  const plan = state.plan!;
  const sent = plan.status === 'confirmed';
  const rows = useMemo(() => mealChoices(state, kind).filter((r) => r.id !== current)
    .map((r) => ({ r, fit: sent ? groceryFit(state, r) : null, sc: familyScore(r, state) - (state.lastWeek.includes(r.id) ? 1 : 0) }))
    .sort((a, b) => b.sc - a.sc), [state, kind, current, sent]);
  const leftOut = useMemo(() => RECIPES.filter((r) => mealFor(r, state) === kind).map((r) => ({ r, why: exclusionReasons(r, state.members) })).filter((x) => x.why.length), [state, kind]);
  const [preview, setPreview] = useState<Recipe | null>(null);
  const L = MEAL_LABEL[kind];
  const elsewhere = (id: string) => (plan.meals ?? []).filter((m) => m.meal === kind && m.recipeId === id && m.day !== day).map((m) => planDayName(plan, m.day));
  return (
    <Sheet title={`${current ? 'Swap' : 'Add'} ${L.title.toLowerCase()} on ${planDayName(plan, day)}`} onClose={onClose}>
      {current && (
        <Pressable onPress={onClose} accessibilityRole="button" style={{ marginTop: 10, flexDirection: 'row', gap: 8, alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: C.line, backgroundColor: C.card }}>
          <Icon name="close-circle-outline" size={18} color={C.muted} />
          <Text style={{ fontWeight: '600' }}>No change: keep {recipeById(current).name}</Text>
        </Pressable>
      )}
      {sent && <Text style={{ color: C.muted, fontSize: 13, marginTop: 10, lineHeight: 19 }}>The menu has been sent, so each one shows whether it needs anything beyond the groceries already on the list. Your {cookL()} is told about the change.</Text>}
      {rows.length === 0 && <Text style={{ color: C.muted, marginTop: 12 }}>No {L.title.toLowerCase()} recipe fits your family's rules.</Text>}
      {rows.map(({ r, fit }) => (
        <Pressable key={r.id} onPress={() => onPick(r.id)} accessibilityRole="button" accessibilityLabel={`Choose ${r.name}`}
          style={({ pressed }) => ({ flexDirection: 'row', gap: 12, alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderColor: C.line, backgroundColor: pressed ? C.brandSoft : 'transparent' })}>
          <DishPhoto recipe={r} size={56} />
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={{ fontFamily: F.display, fontSize: 15 }}>{r.name}</Text>
            <Text style={{ color: C.muted, fontSize: 12 }}>{cap(r.cuisine)} · {r.minutes} min · {chillies(r.spice)} · {roughMoney(dishCost(r))}</Text>
            <PotRating recipe={r} />
            <Row style={{ gap: 4 }}>
              {fit && (fit.toBuy.length === 0
                ? <Chip tone="good" icon="cart-outline" label={fit.coming.length ? 'Nothing extra to buy' : 'Uses groceries already bought'} />
                : <Chip tone="warn" icon="cart" label={`Need to buy: ${fit.toBuy.map((k) => CATALOGUE[k]?.name ?? k).join(', ')}${fit.extraTrip ? ' (another trip)' : ''}`} />)}
              {elsewhere(r.id).length > 0 && <Chip tone="plain" icon="repeat" label={`Also on ${elsewhere(r.id).join(', ')}`} />}
            </Row>
          </View>
          <IconButton icon="eye-outline" label={`Preview ${r.name}`} onPress={() => setPreview(r)} />
        </Pressable>
      ))}
      {leftOut.length > 0 && (
        <View style={{ marginTop: 14 }}>
          <Text style={{ fontFamily: F.display, fontSize: 14 }}>Left out for your family</Text>
          {leftOut.map((x) => <Text key={x.r.id} style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>{x.r.name}: {x.why.join('; ')}</Text>)}
        </View>
      )}
      {preview && <DishDetail recipe={preview} onClose={() => setPreview(null)} />}
    </Sheet>
  );
}

export { mealKey };
