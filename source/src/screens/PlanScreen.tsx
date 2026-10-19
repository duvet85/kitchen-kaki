import { cook, cookL } from '../cook';
import { DishHistory } from './LearnCook';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, TextInput, View } from 'react-native';
import { recipeById } from '../data/recipes';
import { ballpark, dishCost, money, roughMoney, shoppingDone, shoppingProgress, weekCost } from '../engine/grocery';
import { CATALOGUE } from '../data/store';
import { healthFlags, mildTip } from '../engine/health';
import {
  DAY_NAMES, planDayName, dateOfPlanDay, startDateOf, withStart, weekdayOf, FAVOURITE_FROM, MEAL_KINDS, addDays, buildWeekPlan, eligibleRecipes, isCooked, isSoup, mealsOn, lovedBy, menuProgress, missingFavourite, mondayOf, pickedSoupDays, vegGap, soupDaysFor, soupsPerWeek, spiceRule, spreadSoupDays,
} from '../engine/planner';
import { StateLens, useApp } from '../state';
import { draftNextWeek, draftView, fromDraftView, restartWeeks, takeBackWeek } from '../engine/weeks';
import DishPhoto from '../DishPhoto';
import { photoFor } from '../data/photos';
import { AppState, PlannedDish, Recipe } from '../types';
import {
  Bar, Button, C, Card, Chip, F, Grid, H2, Icon, IconButton, Label, Notice, P, Row, Screen, Stepper, Text, Thumb, chillies, pots, useLayout,
  Mascot,
} from '../ui';
import { cap } from './FamilyScreen';
import { DishDetail, DishPicker } from './DishSheets';
import { moveDish, placeDish, removeDish } from '../engine/balance';
import { useDragMove } from './DragMove';
import { useTripGate } from './TripConfirm';
import { SavedMenusCard } from './SavedMenus';
import { mealOn } from '../engine/meals';
import { AddMealButton, MealRow, MealToggles } from './Meals';
import { PotRating } from './PotRating';
import { groceryFit, planRecipeIds } from '../engine/grocery';
import { newId } from '../state';

const fmtDate = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString('en-SG', { day: 'numeric', month: 'short' });
const fmtDay = (iso: string) => `${DAY_NAMES[weekdayOf(iso)]} ${fmtDate(iso)}`;
const langName = (l: string) => ({ en: 'English', tl: 'Tagalog', id: 'Bahasa Indonesia', my: 'Burmese', zh: 'Chinese' } as Record<string, string>)[l];

/**
 * The Menu tab. Once a week is sent the cook works from it while the owner drafts the next week beside it, so the owner can
 * switch between the two; sending the draft replaces the sent week.
 */
export default function PlanScreen() {
  const { state } = useApp();
  const [view, setView] = useState<'sent' | 'next'>('next');
  const hasNext = !!state.nextPlan;
  useEffect(() => { if (hasNext) setView('next'); }, [hasNext]);
  const both = !!state.plan && !!state.nextPlan;
  const onNext = both && view === 'next';
  const switcher = both ? (
    <View style={{ flexDirection: 'row', marginTop: 4, marginBottom: 6, backgroundColor: '#F3E7D4', borderRadius: 14, padding: 4, maxWidth: 520 }}>
      {([['sent', `Week ${state.plan!.weekNo} · sent`, 'checkmark-circle'], ['next', `Week ${state.nextPlan!.weekNo} · draft`, 'eye-off-outline']] as const).map(([k, label, icon]) => {
        const on = (k === 'next') === onNext;
        return (
          <Pressable key={k} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => setView(k)} style={{ flex: 1, paddingVertical: 10, borderRadius: 11, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6, backgroundColor: on ? C.card : 'transparent' }}>
            <Icon name={icon} size={16} color={on ? C.brand : C.muted} />
            <Text style={{ fontWeight: '700', color: on ? C.brandDeep : C.muted }}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  ) : null;
  return onNext
    ? <StateLens key="next" view={draftView} back={fromDraftView}><PlanBody switcher={switcher} draftOfNext sentWeek={state.plan!.weekNo} /></StateLens>
    : <PlanBody key="sent" switcher={switcher} onOpenNext={() => setView('next')} />;
}

function PlanBody({ switcher, draftOfNext, sentWeek, onOpenNext }: { switcher: React.ReactNode; draftOfNext?: boolean; sentWeek?: number; onOpenNext?: () => void }) {
  const { state, update } = useApp();
  const [asking, setAsking] = useState<'takeBack' | 'restart' | 'discard' | null>(null);
  const [searching, setSearching] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showExcluded, setShowExcluded] = useState(false);
  const { isTablet, cols } = useLayout();
  const { settings, plan } = state;
  const { excluded, dropped } = eligibleRecipes(state);
  const progress = menuProgress(state);
  const spice = spiceRule(state);
  const ids = plan?.dishes.map((d) => d.recipeId) ?? [];
  const cost = weekCost(plan ? planRecipeIds(plan) : []);
  const soupIds = new Set(ids.filter((id) => isSoup(recipeById(id))));

  const search = (fn: (st: AppState) => AppState) => {
    setSearching(true);
    // Simulates the weekly online search. Swap for a real API call later.
    setTimeout(() => {
      update(fn);
      setSearching(false);
      setShowSettings(false);
    }, 900);
  };

  const findRecipes = () =>
    search((st) => {
      const next = { ...st, refreshCount: st.refreshCount + 1 };
      return { ...next, plan: buildWeekPlan(next, st.plan?.weekNo ?? 1, st.plan ? startDateOf(st.plan) : mondayOf()), bought: [], shopSwaps: {}, fruitDays: [], lateItems: [], helperNotes: [] };
    });

  const nextWeek = () => {
    if (state.nextPlan) { onOpenNext?.(); return; }
    search(draftNextWeek);
    onOpenNext?.();
  };

  // Adding or swapping opens a list to choose from (the owner decides; nothing changes by itself).
  const [picker, setPicker] = useState<{ day: number; course: 'dish' | 'soup'; replace?: PlannedDish } | null>(null);
  const [detail, setDetail] = useState<Recipe | null>(null);
  const gate = useTripGate(state);
  const swap = (target: PlannedDish) => setPicker({ day: target.day, course: isSoup(recipeById(target.recipeId)) ? 'soup' : 'dish', replace: target });
  const add = (day: number, course: 'dish' | 'soup') => setPicker({ day, course });

  const remove = (target: PlannedDish) => update((st) => removeDish(st, target, newId));
  const mover = useDragMove<PlannedDish>(
    Array.from({ length: settings.daysPerWeek }, (_, day) => ({
      day, label: planDayName(state.plan, day).slice(0, 3), sub: plan ? fmtDate(dateOfPlanDay(plan, day)) : '',
      blocked: (d: PlannedDish) => d.day === day || !!plan?.dishes.some((x) => x.day === day && x.recipeId === d.recipeId),
    })),
    (d, day) => update((st) => moveDish(st, st.plan?.dishes.find((x) => x.day === d.day && x.recipeId === d.recipeId) ?? d, day, newId)),
  );

  const confirm = () => update((st) => ({ ...st, plan: st.plan && { ...st.plan, status: 'confirmed', confirmedAt: new Date().toISOString() } }));
  const setSettings = (patch: Partial<typeof settings>) => update((st) => ({ ...st, settings: { ...st.settings, ...patch } }));
  const unrated = plan?.status === 'confirmed' ? ids.filter((id) => !state.ratings[id]).length : 0;
  const newCount = plan?.dishes.filter((d) => d.isNew).length ?? 0;
  const soups = soupsPerWeek(state);
  const overBudget = settings.weeklyBudget > 0 && cost.fresh * 0.9 > settings.weeklyBudget;

  return (
    <Screen eyebrow="Step 3" title="Weekly menu" subtitle={`We suggest the week's dishes. You check them, then your ${cookL()} gets the recipes and one shopping list.`}>
      {switcher}
      {draftOfNext && <Notice tone="brand" icon="eye-off-outline">Your {cookL()} still sees week {sentWeek} until you send this one. Sending it starts a fresh shopping list.</Notice>}
      {plan && !searching && <WeekStart />}
      <Grid cols={isTablet ? 2 : 1}>
      {plan && !searching && (
        <Card style={{ backgroundColor: C.brand, padding: 18 }}>
          <Row style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#C9D3A0', fontSize: 12, fontWeight: '700', letterSpacing: 1.2 }}>WEEK {plan.weekNo} · {fmtDay(startDateOf(plan)).toUpperCase()} TO {fmtDay(addDays(startDateOf(plan), 6)).toUpperCase()}</Text>
              <Text style={{ color: '#fff', fontFamily: F.displayX, fontSize: 32, marginTop: 4, letterSpacing: -1 }}>{ballpark(cost.fresh)}</Text>
              <Text style={{ color: '#E4E8CF', fontSize: 13 }}>a rough guide only: prices change and these are not real NTUC prices · {roughMoney(cost.fresh / Math.max(1, ids.length))} a dish</Text>
            </View>
            <View style={{ backgroundColor: plan.status === 'draft' ? '#FFF0D2' : '#E9EDCF', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, flexDirection: 'row', gap: 4, alignItems: 'center' }}>
              <Icon name={plan.status === 'draft' ? 'eye-off-outline' : 'checkmark-circle'} size={13} color={plan.status === 'draft' ? C.amber : C.green} />
              <Text style={{ fontSize: 12, fontWeight: '700', color: plan.status === 'draft' ? C.amber : C.green }}>{plan.status === 'draft' ? 'Draft' : 'Sent'}</Text>
            </View>
          </Row>
          <Row style={{ marginTop: 14, gap: 8 }}>
            <Stat value={ids.length - soupIds.size} label="dishes" />
            {soupIds.size > 0 && <Stat value={soupIds.size} label={soupIds.size === 1 ? 'soup' : 'soups'} />}
            <Stat value={newCount} label="new" />
            <Stat value={ids.length - newCount} label="favourites" />
          </Row>
          {plan.status === 'confirmed' && (() => {
            const { got, total } = shoppingProgress(state);
            const swaps = Object.entries(state.shopSwaps ?? {});
            return (
              <View>
                <Row style={{ marginTop: 12, gap: 6 }}>
                  <Icon name="cart-outline" size={15} color="#E4E8CF" />
                  <Text style={{ color: '#E4E8CF', fontSize: 13, fontWeight: '600' }}>Shopping: {got} of {total} ticked off</Text>
                </Row>
                {(state.lateItems ?? []).filter((k) => !state.bought.includes(k)).length > 0 && (
                  <View style={{ marginTop: 8, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: 10, gap: 4 }}>
                    <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>New to buy after the change</Text>
                    <Text style={{ color: '#E4E8CF', fontSize: 13 }}>{(state.lateItems ?? []).filter((k) => !state.bought.includes(k)).map((k) => CATALOGUE[k]?.name ?? k).join(', ')}</Text>
                    {shoppingDone(state, state.lateItems) && <Text style={{ color: '#FFE3A8', fontSize: 12, fontWeight: '700' }}>Shopping was already done, so your {cookL()} needs to go to the shop again.</Text>}
                  </View>
                )}
                {swaps.length > 0 && (
                  <View style={{ marginTop: 8, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: 10, gap: 4 }}>
                    <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>Not in the shop</Text>
                    {swaps.map(([item, s]) => (
                      <Text key={item} style={{ color: '#E4E8CF', fontSize: 13 }}>
                        {CATALOGUE[item]?.name ?? item}: {s.to ? `bought ${s.to} instead` : 'skipped'}{s.by ? ` (${s.by})` : ''}
                      </Text>
                    ))}
                    {swaps.some(([, s]) => s.to === null) && <Text style={{ color: '#C9D3A0', fontSize: 12, marginTop: 2 }}>Ask Kaki can change a dish that needs a skipped item.</Text>}
                  </View>
                )}
              </View>
            );
          })()}
          {settings.weeklyBudget > 0 && (
            <Text style={{ marginTop: 12, color: overBudget ? '#FFD9D4' : '#E4E8CF', fontWeight: '600', fontSize: 13 }}>
              {overBudget
                ? `Likely over your $${settings.weeklyBudget} budget. Swap a pricey dish.`
                : cost.fresh * 1.15 > settings.weeklyBudget ? `Close to your $${settings.weeklyBudget} budget.` : `Likely within your $${settings.weeklyBudget} budget.`}
            </Text>
          )}
        </Card>
      )}

      <FamilyMenuCard progress={progress} newPerDay={settings.newPerDay} plan={plan} />
      </Grid>

      <Card>
        <Pressable onPress={() => setShowSettings(!showSettings)}>
          <Row style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
            <View style={{ flex: 1 }}>
              <H2>Menu settings</H2>
              <Text style={{ color: C.muted, fontSize: 13, lineHeight: 19 }}>
                {settings.daysPerWeek} days × {settings.dishesPerDay} dishes · {mealsOn(state).length ? `with ${mealsOn(state).join(' and ')} · ` : ''}{soups ? `${soups} soup${soups === 1 ? '' : 's'} a week` : 'no soups'} · {settings.newPerDay} new a day when settled ·{' '}
                {settings.weeklyBudget ? `$${settings.weeklyBudget} budget` : 'no budget'}
              </Text>
            </View>
            <Icon name={showSettings ? 'chevron-up' : 'chevron-down'} size={20} color={C.muted} />
          </Row>
        </Pressable>
        {showSettings && (
          <View>
            <Setting label="Cooking days per week">
              <Stepper value={settings.daysPerWeek} min={3} max={7} onChange={(v) => setSettings({ daysPerWeek: v, ...(settings.soupDays ? { soupDays: settings.soupDays.filter((d) => d < v) } : {}) })} />
            </Setting>
            <Setting label="Dishes per day">
              <Stepper value={settings.dishesPerDay} min={1} max={4} onChange={(v) => setSettings({ dishesPerDay: v, newPerDay: Math.min(settings.newPerDay, v) })} />
            </Setting>
            <Setting label="Soups per week" hint="Spread over the week, on top of the dishes. You can also add a soup or dish to any day on the draft menu.">
              <Stepper value={soups} min={0} max={settings.daysPerWeek} format={(v) => (v ? `${v}` : 'None')} onChange={(v) => setSettings({ soupsPerWeek: v, soupDays: v === 0 ? undefined : (pickedSoupDays(state) ?? []).slice(0, v) })} />
            </Setting>
            {soups > 0 && <SoupDays state={state} setSettings={setSettings} />}
            <Setting label="New dishes per day, once settled" hint="The rest of each day's dishes come from your favourites.">
              <Stepper value={settings.newPerDay} min={0} max={Math.min(2, settings.dishesPerDay)} onChange={(v) => setSettings({ newPerDay: v })} />
            </Setting>
            <MealToggles />
            <Setting label="Weekly grocery budget" hint="With a budget, cheaper dishes are preferred.">
              <Stepper value={settings.weeklyBudget / 10} min={0} max={40} format={(v) => (v ? `$${v * 10}` : 'No limit')} onChange={(v) => setSettings({ weeklyBudget: v * 10 })} />
            </Setting>
          </View>
        )}
        <Notice tone="brand" icon="flame-outline">
          {spice.active
            ? `At most 1 spicy dish a day, because ${spice.who.join(', ')} ${spice.cap === 0 ? `can't take chilli` : `can only take ${chillies(spice.cap)}`}. The rest are ${spice.cap === 0 ? 'not spicy' : `${chillies(spice.cap)} or milder`}, and the spicy one is cooked mild with chilli on the side.`
            : 'Everyone is fine with spicy food, so there is no chilli limit.'}
        </Notice>
      </Card>

      <SavedMenusCard />

      {(excluded.length > 0 || dropped.length > 0) && (
        <Pressable onPress={() => setShowExcluded(!showExcluded)}>
          <Card style={{ paddingVertical: 12 }}>
            <Row style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
              <Row style={{ flex: 1 }}>
                <Icon name="shield-checkmark" size={18} color={C.green} />
                <Text style={{ fontWeight: '600' }}>{excluded.length + dropped.length} recipes left out for your family</Text>
              </Row>
              <Icon name={showExcluded ? 'chevron-up' : 'chevron-down'} size={18} color={C.muted} />
            </Row>
            {showExcluded && (
              <View style={{ marginTop: 8, gap: 4 }}>
                {excluded.map((e) => <Text key={e.recipe.id} style={{ color: C.muted, fontSize: 13 }}>{e.recipe.name}: {e.reasons.join('; ')}</Text>)}
                {dropped.map((r) => <Text key={r.id} style={{ color: C.muted, fontSize: 13 }}>{r.name}: family rated it {pots(state.ratings[r.id])}</Text>)}
              </View>
            )}
          </Card>
        </Pressable>
      )}

      {!plan && !searching && (
        <View style={{ marginTop: 20 }}>
          <View style={isTablet ? { maxWidth: 400 } : undefined}><Button icon="search" label="Find this week's recipes" onPress={findRecipes} /></View>
        </View>
      )}
      {searching && (
        <Card style={{ alignItems: 'center', paddingVertical: 28 }}>
          <ActivityIndicator color={C.brand} size="large" />
          <Text style={{ marginTop: 10, color: C.muted }}>Finding recipes your family will like…</Text>
        </Card>
      )}

      {plan && !searching && (
        <>
          <Grid cols={Math.min(4, cols(300))}>
          {Array.from({ length: settings.daysPerWeek }, (_, day) => {
            const dishes = plan.dishes.filter((d) => d.day === day);
            const dayMeals = MEAL_KINDS.filter((k) => mealsOn(state).includes(k) || mealOn(plan, day, k));
            if (!dishes.length && plan.status === 'draft' && !(plan.meals ?? []).some((m) => m.day === day)) return null;
            return (
              <View key={day}>
                <Row style={{ marginTop: 22, marginBottom: 2, gap: 8 }}>
                  <Text style={{ fontFamily: F.display, fontSize: 18 }}>{planDayName(state.plan, day)}</Text>
                  <Text style={{ color: C.faint, fontSize: 13 }}>{fmtDate(dateOfPlanDay(plan, day))}</Text>
                </Row>
                {dayMeals.map((k) => <MealRow key={k} day={day} kind={k} />)}
                {(() => {
                  const gap = missingFavourite(plan, state, day);
                  return gap.length ? <Notice tone="warn" icon="heart-dislike-outline">No 4-pot dish for {gap.map((m) => m.name).join(', ')} today. Swap or add one they'd love.</Notice> : null;
                })()}
                {(() => {
                  const gap = dishes.every((d) => isCooked(plan, d)) ? null : vegGap(state, day);
                  if (!gap) return null;
                  return gap.options.length
                    ? <Notice tone="warn" icon="leaf-outline">No vegetable dish on {planDayName(state.plan, day)}. {gap.options.length === 1 ? 'There is 1 you could add' : `There are ${gap.options.length} you could add`}: tap Dish below and the vegetable ones come first. Nothing changes unless you pick one.</Notice>
                    : <Notice tone="warn" icon="leaf-outline">No vegetable dish on {planDayName(state.plan, day)}, and there are no more suitable ones left for your family's rules (allergies, spice, ratings), so none was added.</Notice>;
                })()}
                {dishes.map((d) => (
                  <DishCard key={`${d.day}-${d.recipeId}`} recipe={recipeById(d.recipeId)} dish={d} weekIds={ids} spiceCap={spice.cap} onOpen={() => setDetail(recipeById(d.recipeId))}
                    onSwap={plan.status === 'draft' || !isCooked(plan, d) ? () => swap(d) : undefined}
                    onRemove={(plan.status === 'draft' ? dishes.length > 1 : !isCooked(plan, d)) ? () => remove(d) : undefined}
                    handle={plan.status === 'draft' || !isCooked(plan, d) ? mover.handle(d, recipeById(d.recipeId).name) : undefined} />
                ))}
                {!dishes.length && <Text style={{ color: C.muted, fontSize: 13, marginTop: 6 }}>No dishes planned for this day.</Text>}
                <Row style={{ marginTop: 8, gap: 8 }}>
                  <Button small kind="ghost" icon="add" label="Dish" onPress={() => add(day, 'dish')} />
                  <Button small kind="ghost" icon="add" label="Soup" onPress={() => add(day, 'soup')} />
                  {MEAL_KINDS.filter((k) => !dayMeals.includes(k)).map((k) => <AddMealButton key={k} day={day} kind={k} />)}
                </Row>
              </View>
            );
          })}
          </Grid>

          {picker && (
            <DishPicker day={picker.day} course={picker.course} replace={picker.replace} onClose={() => setPicker(null)}
              onPick={(id) => { const pk = picker; gate.ask(groceryFit(state, recipeById(id)).toBuy, () => { update((st) => placeDish(st, pk.day, id, pk.replace, newId)); setPicker(null); }); }} />
          )}
          {gate.sheet}
          {detail && <DishDetail recipe={detail} onClose={() => setDetail(null)} />}

          <Card style={{ marginTop: 22, ...(isTablet ? { maxWidth: 560 } : {}) }}>
            {plan.status === 'draft' ? (
              <View style={{ gap: 10 }}>
                <H2>Happy with this menu?</H2>
                <P style={{ color: C.muted }}>Only you can see it for now. Once you confirm, your {cookL()} gets the recipes in {langName(settings.helperLang)} and one shopping list for the week.</P>
                <Button icon="paper-plane" label={`Confirm and send to ${cookL()}`} onPress={confirm} />
                <Button kind="quiet" icon="shuffle" label="Suggest a different set" onPress={findRecipes} />
                {draftOfNext && <Button kind="quiet" icon="trash-outline" label={`Throw away the week ${plan.weekNo} draft`} onPress={() => setAsking('discard')} />}
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                <Row style={{ gap: 12, flexWrap: 'nowrap' }}>
                  <Mascot size={64} />
                  <View style={{ flex: 1 }}>
                    <Row style={{ flexWrap: 'nowrap', gap: 6 }}><Icon name="checkmark-circle" size={22} color={C.green} /><H2 style={{ marginBottom: 0 }}>Sent to your {cookL()}</H2></Row>
                  </View>
                </Row>
                <P style={{ color: C.muted }}>{new Date(plan.confirmedAt!).toLocaleString('en-SG', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}. See what they see on the {cook()} tab.</P>
                <Notice tone="brand" icon="create-outline">Plans change, so you can still swap, add or remove a dish that isn't cooked yet. Your {cookL()} is told, and anything new to buy is marked NEW on their list.</Notice>
                {unrated > 0 && <Notice tone="warn" icon="kaki-pot-off">{unrated} dishes still to rate. Ratings decide what comes back next week.</Notice>}
                <Button icon="arrow-forward" label={state.nextPlan ? `Open the week ${state.nextPlan.weekNo} draft` : `Plan week ${plan.weekNo + 1}`} onPress={nextWeek} />
                <Button kind="quiet" icon="arrow-undo-outline" label="Take back this menu" onPress={() => setAsking('takeBack')} />
              </View>
            )}
          </Card>
          {asking && (
            <ResetAsk kind={asking} state={state} onCancel={() => setAsking(null)}
              onYes={() => { const k = asking; setAsking(null); update(k === 'takeBack' ? takeBackWeek : k === 'restart' ? restartWeeks : (st) => ({ ...st, plan: null })); }} />
          )}
          {!asking && !draftOfNext && (state.history.length > 0 || plan.weekNo > 1 || plan.status === 'confirmed') && (
            <Pressable accessibilityRole="button" onPress={() => setAsking('restart')} style={{ marginTop: 14, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6 }}>
              <Icon name="refresh" size={15} color={C.muted} />
              <Text style={{ color: C.muted, fontWeight: '700', textDecorationLine: 'underline' }}>Start again from week 1</Text>
            </Pressable>
          )}
        </>
      )}
      {mover.bar}
    </Screen>
  );
}

/** The confirm step for taking back a menu, throwing away a draft or starting again: says exactly what changes and what stays. */
function ResetAsk({ kind, state, onYes, onCancel }: { kind: 'takeBack' | 'restart' | 'discard'; state: AppState; onYes: () => void; onCancel: () => void }) {
  const plan = state.plan!;
  const prev = state.pastWeeks?.[state.pastWeeks.length - 1];
  const cooked = plan.cooked.length;
  const text = kind === 'discard'
    ? { title: `Throw away the week ${plan.weekNo} draft?`, body: [`Your ${cookL()} never saw it. Week ${plan.weekNo - 1} stays as it is.`], yes: 'Throw it away' }
    : kind === 'takeBack'
      ? prev
        ? { title: `Take back week ${plan.weekNo}?`, body: [`Your ${cookL()} goes back to the week ${prev.plan.weekNo} menu and its shopping list, as they were.`, `The week ${plan.weekNo} menu becomes a draft again, so you can change it and send it later.`, ...(cooked ? [`${cooked} dish${cooked === 1 ? ' was' : 'es were'} already marked cooked this week.`] : [])], yes: `Go back to week ${prev.plan.weekNo}` }
        : { title: `Take back week ${plan.weekNo}?`, body: [`Your ${cookL()} won't see this menu any more. It becomes a draft again, so you can change it and send it later.`, `Notes about changes to this menu are cleared.`], yes: 'Take it back' }
      : { title: 'Start again from week 1?', body: [`This clears every menu (week ${plan.weekNo}${state.nextPlan ? ` and the week ${state.nextPlan.weekNo} draft` : ''}), the shopping list, cooking progress and timers, on your ${cookL()}'s phone too.`, 'New dishes are brought in slowly again, as in week 1.', 'Your family, ratings, recipes, photos, settings and the Kitchen tab are kept.'], yes: 'Start again from week 1' };
  return (
    <Card style={{ marginTop: 14, borderWidth: 1.5, borderColor: C.amber, maxWidth: 560 }}>
      <H2>{text.title}</H2>
      {text.body.map((b) => <P key={b} style={{ color: C.muted, marginTop: 4 }}>{b}</P>)}
      <View style={{ gap: 8, marginTop: 12 }}>
        <Button icon={kind === 'restart' ? 'refresh' : kind === 'discard' ? 'trash-outline' : 'arrow-undo-outline'} label={text.yes} onPress={onYes} />
        <Button kind="quiet" label="Cancel" onPress={onCancel} />
      </View>
    </Card>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={{ backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12, flexGrow: 1 }}>
      <Text style={{ color: '#fff', fontFamily: F.display, fontSize: 20 }}>{value}</Text>
      <Text style={{ color: '#E4E8CF', fontSize: 12 }}>{label}</Text>
    </View>
  );
}

/** Which days the soups go on: tap days to choose exactly the soup count, or let the menu spread them out. */
function SoupDays({ state, setSettings }: { state: AppState; setSettings: (p: Partial<AppState['settings']>) => void }) {
  const count = soupsPerWeek(state), days = state.settings.daysPerWeek;
  const picked = pickedSoupDays(state);
  const [hint, setHint] = useState('');
  const shown = picked ?? spreadSoupDays(count, days);
  const toggle = (d: number) => {
    const base = picked ?? spreadSoupDays(count, days);
    if (base.includes(d)) { setHint(''); setSettings({ soupDays: base.filter((x) => x !== d) }); return; }
    if (base.length >= count) { setHint(`Already ${count} chosen. Tap a chosen day to take it off first.`); return; }
    setHint('');
    setSettings({ soupDays: [...base, d].sort((a, b) => a - b) });
  };
  const left = count - (picked?.length ?? count);
  return (
    <View style={{ marginTop: 4, marginBottom: 16 }}>
      <Text style={{ fontWeight: '700', fontSize: 14, marginBottom: 6 }}>Which days for soup?</Text>
      <Row>
        {[0, 1, 2, 3, 4, 5, 6].map((d) => planDayName(state.plan, d)).map((n, d) => d < days
          ? <Chip key={n} label={n} selected={shown.includes(d)} onPress={() => toggle(d)} />
          : <View key={n} style={{ opacity: 0.4 }} accessibilityLabel={`${n} is not a cooking day`}><Chip label={`${n} off`} /></View>)}
      </Row>
      <Text style={{ color: !picked ? C.muted : left > 0 ? C.amber : C.brandDeep, fontSize: 13, marginTop: 8, fontWeight: '600' }}>
        {!picked ? `Spread out for you: ${shown.map((d) => planDayName(state.plan, d)).join(', ')}`
          : `${picked.length} of ${count} chosen${left > 0 ? `. Pick ${left} more day${left === 1 ? '' : 's'}, or the menu spreads the rest out` : ''}`}
      </Text>
      {hint !== '' && <Text style={{ color: C.amber, fontSize: 12, marginTop: 4 }}>{hint}</Text>}
      <Row style={{ marginTop: 8 }}>
        <Chip icon="shuffle" label="Spread them out for me" selected={!picked} onPress={() => { setHint(''); setSettings({ soupDays: undefined }); }} />
      </Row>
      <Text style={{ color: C.faint, fontSize: 12, marginTop: 6, lineHeight: 17 }}>Used when the next menu is planned. On a menu already planned you can still add or swap a soup on any day.</Text>
    </View>
  );
}

function Setting({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: 6 }}>
      <Label>{label}</Label>
      {children}
      {hint && <Text style={{ color: C.muted, fontSize: 12, marginTop: 6 }}>{hint}</Text>}
    </View>
  );
}

function FamilyMenuCard({ progress: p, newPerDay, plan }: { progress: ReturnType<typeof menuProgress>; newPerDay: number; plan: AppState['plan'] }) {
  const have = Math.min(p.favourites.length, p.target);
  const draftNew = plan?.status === 'draft' ? plan.dishes.filter((d) => d.isNew).length : null;
  const counts = draftNew !== null && plan
    ? { label: `Week ${plan.weekNo}`, isNew: draftNew, fav: plan.dishes.length - draftNew }
    : { label: 'Next week', isNew: p.newThisWeek, fav: p.favsThisWeek };
  return (
    <Card>
      <Row style={{ justifyContent: 'space-between' }}>
        <H2 style={{ marginBottom: 0 }}>Family favourites</H2>
        <Chip tone={p.settled ? 'good' : 'new'} icon={p.settled ? 'checkmark' : 'compass-outline'} label={p.settled ? 'Settled' : 'Discovering'} />
      </Row>
      <View style={{ marginTop: 12 }}><Bar value={p.target ? have / p.target : 1} color={p.settled ? C.green : C.accent} height={10} /></View>
      <Text style={{ color: C.muted, fontSize: 12, marginTop: 6 }}>{have} of {p.target} favourites found (dishes rated 4 or 5 pots)</Text>
      <P style={{ marginTop: 10 }}>
        {p.favourites.length === 0
          ? `Everything is new at the start, so ${counts.label.toLowerCase()} is ${counts.isNew} new dishes. Rate them after you eat and the ones you like become favourites.`
          : p.settled
            ? `Settled at ${newPerDay} new dish${newPerDay === 1 ? '' : 'es'} a day; the rest rotate through your favourites. ${counts.label}: ${counts.isNew} new, ${counts.fav} favourites.`
            : `${counts.label}: ${counts.isNew} new, ${counts.fav} favourites. New dishes go down each week until you reach ${newPerDay} a day.`}
      </P>
      {p.freshLeft < p.newWhenSettled && <Notice tone="warn" icon="information-circle-outline">The sample recipe pool is running low ({p.freshLeft} untried left). The real app searches online for more.</Notice>}
    </Card>
  );
}

/** The family's note for this dish on this day only (the same dish on another day has its own). Shown on the cook's phone. */
function DayNote({ dish }: { dish: PlannedDish }) {
  const { state, update } = useApp();
  const [text, setText] = useState<string | null>(null);
  const sent = state.plan?.status === 'confirmed';
  const save = (v: string) => {
    const note = v.trim().slice(0, 300) || undefined;
    update((st) => st.plan ? { ...st, plan: { ...st.plan, dishes: st.plan.dishes.map((d) => d.day === dish.day && d.recipeId === dish.recipeId ? { ...d, note } : d) } } : st);
    setText(null);
  };
  if (text !== null) {
    return (
      <View style={{ marginTop: 10, gap: 8 }}>
        <TextInput value={text} onChangeText={setText} autoFocus multiline maxLength={300} placeholder={`For example: less salt today, or cook it by 5pm`} placeholderTextColor={C.faint}
          accessibilityLabel={`Note for ${planDayName(state.plan, dish.day)}`} style={{ borderWidth: 1, borderColor: C.line, borderRadius: 12, padding: 10, fontSize: 15, minHeight: 64, color: C.ink, backgroundColor: '#fff', fontFamily: F.regular, textAlignVertical: 'top' }} />
        <Row style={{ gap: 8 }}>
          <Button small icon="checkmark" label="Save note" onPress={() => save(text)} />
          {!!dish.note && <Button small kind="quiet" icon="trash-outline" label="Remove note" onPress={() => save('')} />}
          <Button small kind="quiet" label="Cancel" onPress={() => setText(null)} />
        </Row>
        {sent && <Text style={{ color: C.muted, fontSize: 12 }}>Your {cookL()} sees the change straight away.</Text>}
      </View>
    );
  }
  return dish.note ? (
    <Pressable onPress={() => setText(dish.note ?? '')} accessibilityRole="button" accessibilityLabel={`Edit the ${planDayName(state.plan, dish.day)} note`}
      style={{ marginTop: 10, padding: 10, borderRadius: 12, backgroundColor: '#FFF0D2', flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
      <Icon name="chatbox-ellipses-outline" size={16} color={C.amber} />
      <Text style={{ flex: 1, lineHeight: 20 }}>{dish.note}</Text>
      <Icon name="create-outline" size={16} color={C.muted} />
    </Pressable>
  ) : (
    <Pressable onPress={() => setText('')} accessibilityRole="button" style={{ marginTop: 8, flexDirection: 'row', gap: 6, alignItems: 'center', alignSelf: 'flex-start', paddingVertical: 4 }}>
      <Icon name="chatbox-ellipses-outline" size={15} color={C.brand} />
      <Text style={{ color: C.brand, fontWeight: '700', fontSize: 13 }}>Add a note for {planDayName(state.plan, dish.day)}</Text>
    </Pressable>
  );
}

function DishCard({ recipe: r, dish, weekIds, spiceCap, onSwap, onRemove, onOpen, handle }: { recipe: Recipe; dish: PlannedDish; weekIds: string[]; spiceCap: number; onSwap?: () => void; onRemove?: () => void; onOpen: () => void; handle?: React.ReactNode }) {
  const { state } = useApp();
  const rating = state.ratings[r.id];
  const hasPhoto = !!(photoFor(r.id) || r.imageUrl || state.userPhotos?.[r.id]);
  const tip = mildTip(r, spiceCap);
  const warnings = state.members.map((m) => ({ m, flags: healthFlags(r, m) })).filter((x) => x.flags.length);
  const vegOnly = state.members.filter((m) => m.vegetarian && !r.vegetarian);

  return (
    <Card style={{ marginTop: 8, padding: 14 }}>
      {hasPhoto && <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={`See photo and ingredients of ${r.name}`}><DishPhoto recipe={r} banner height={140} /></Pressable>}
      <Row style={{ flexWrap: 'nowrap', gap: 12, alignItems: 'flex-start' }}>
        {!hasPhoto && <Thumb emoji={r.emoji} cuisine={r.cuisine} />}
        <View style={{ flex: 1, gap: 2 }}>
          <Row style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
            <Pressable style={{ flex: 1 }} onPress={onOpen} accessibilityRole="link" accessibilityLabel={`See ingredients and steps of ${r.name}`}>
              <Text style={{ fontFamily: F.display, fontSize: 16, lineHeight: 21, color: C.brandDeep, textDecorationLine: 'underline', textDecorationColor: C.line }}>{r.name}</Text>
            </Pressable>
            <Text style={{ fontWeight: '700', fontSize: 15 }}>{roughMoney(dishCost(r, weekIds))}</Text>
          </Row>
          <Text style={{ color: C.muted, fontSize: 13 }}>{cap(r.cuisine)} · {r.minutes} min · {chillies(r.spice)}</Text>
          <View style={{ marginTop: 6 }}><PotRating recipe={r} /></View>
          <DishHistory recipeId={r.id} lang="en" />
          <Row style={{ marginTop: 6 }}>
            {isSoup(r) && <Chip tone="brand" icon="water-outline" label="Soup" />}
            {dish.added && <Chip tone="plain" icon="add" label="Added" />}
            <Chip tone={dish.isNew ? 'new' : rating && rating < FAVOURITE_FROM ? 'plain' : 'good'} icon={dish.isNew ? 'sparkles' : rating && rating < FAVOURITE_FROM ? 'remove' : 'heart'} label={dish.isNew ? 'New' : rating && rating < FAVOURITE_FROM ? `Kept ${pots(rating)}` : `Favourite${rating ? ` ${pots(rating)}` : ''}`} />
            {r.vegetarian && <Chip tone="good" icon="leaf" label="Vegetarian" />}
            {r.pork && <Chip tone="warn" label="Pork" />}
            {r.beef && <Chip tone="warn" label="Beef" />}
            {tip && <Chip tone="warn" icon="flame-outline" label="Chilli on the side" />}
          </Row>
        </View>
        <View style={{ gap: 6 }}>
          {handle}
          {onSwap && <IconButton icon="swap-horizontal" label={`Swap ${r.name}`} onPress={onSwap} />}
          {onRemove && <IconButton icon="close" label={`Remove ${r.name}`} onPress={onRemove} />}
        </View>
      </Row>
      {(() => {
        const fans = lovedBy(r, state);
        return fans.length ? <Text style={{ color: C.green, fontSize: 12, marginTop: 8, fontWeight: '600' }}>♥ 4+ pots for {fans.map((m) => m.name).join(', ')}</Text> : null;
      })()}
      <DayNote dish={dish} />
      {vegOnly.length > 0 && <Notice tone="brand" icon="leaf-outline">Not for {vegOnly.map((m) => m.name).join(', ')} (vegetarian)</Notice>}
      {warnings.map(({ m, flags }) => (
        <Notice key={m.id} tone="bad" icon="medkit-outline">{m.name}: {flags.join(', ')}. Serve a small portion.</Notice>
      ))}
    </Card>
  );
}

/** "Week starts": the family's shopping day can be any day, so a week can start on any of the dates around the usual one. */
function WeekStart() {
  const { state, update } = useApp();
  const plan = state.plan!;
  const start = startDateOf(plan);
  // the choices stay put while one is picked, so the row doesn't jump
  const [base] = useState(start);
  const [open, setOpen] = useState(false);
  const days = [-3, -2, -1, 0, 1, 2, 3].map((n) => addDays(base, n));
  const cooked = plan.cooked.length > 0;
  return (
    <View style={{ marginTop: 10, maxWidth: 560 }}>
      <Pressable onPress={() => setOpen(!open)} accessibilityRole="button" accessibilityLabel={`Week runs ${fmtDay(start)} to ${fmtDay(addDays(start, 6))}. Change the start`}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 6 }}>
        <Icon name="calendar-outline" size={16} color={C.brand} />
        <Text style={{ fontWeight: '700' }}>{fmtDay(start)} to {fmtDay(addDays(start, 6))}</Text>
        <Text style={{ color: C.brand, fontWeight: '700' }}>{open ? 'Done' : 'Change'}</Text>
      </Pressable>
      {open && (
        <View style={{ gap: 8 }}>
          <Text style={{ color: C.muted, fontSize: 13, lineHeight: 18 }}>Pick the day the week begins, for example your shopping day. The week ends 6 days later, the day before the next week starts. The dishes keep their order: the first day's dishes move to the new first day.</Text>
          <Text style={{ color: C.muted, fontSize: 13, lineHeight: 18 }}>Cooking days: {planDayName(plan, 0)} to {planDayName(plan, state.settings.daysPerWeek - 1)} ({state.settings.daysPerWeek} days). To cook fewer or more days, change "Cooking days per week" in Menu settings below.</Text>
          <Row>{days.map((d) => <Chip key={d} label={fmtDay(d)} selected={d === start} onPress={() => update((st) => (st.plan ? { ...st, plan: withStart(st.plan, d) } : st))} />)}</Row>
          {plan.status === 'confirmed' && <Text style={{ color: C.amber, fontSize: 12, lineHeight: 17 }}>This menu is already sent: your {cookL()} sees the new days and dates straight away{cooked ? ', and dishes already cooked stay ticked' : ''}.</Text>}
        </View>
      )}
    </View>
  );
}
