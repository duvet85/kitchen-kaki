import { cook, cookL } from '../cook';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, TextInput, View } from 'react-native';
import { CATALOGUE } from '../data/store';
import { recipeById } from '../data/recipes';
import { recipeText, ingredientLabel, fullyTranslated, itemNames } from '../ai/text';
import GeminiTranslate from '../ai/GeminiTranslate';
import { ShoppingLine, planRecipeIds, ballpark, roughMoney, shoppingDone, shoppingList, shoppingProgress } from '../engine/grocery';
import { mildTip } from '../engine/health';
import { dayLabel } from '../i18n-units';
import { qtyLabel } from '../i18n-units';
import { DAY_NAMES, dishKey, householdSpiceCap, isCooked } from '../engine/planner';
import { LANGS, t } from '../i18n';
import { newId, useApp } from '../state';
import DishPhoto from '../DishPhoto';
import { KakiSays } from '../Kaki';
import { Lang } from '../types';
import { PANTRY } from '../engine/grocery';
import { Bar, Button, C, Card, Chip, F, Grid, Icon, Label, Notice, P, Row, Screen, Text, Thumb, chillies, useLayout } from '../ui';
import CookingMode, { TimerTray, useTimerTick } from './CookingMode';

const AISLES = ['Meat & Seafood', 'Fruit & Veg', 'Chilled', 'Pantry'] as const;
const AISLE_ICON = { 'Meat & Seafood': 'fish-outline', 'Fruit & Veg': 'nutrition-outline', Chilled: 'snow-outline', Pantry: 'cube-outline' } as const;

/** What the helper sees on their own phone once the owner confirms: recipes and one shopping list, translated. */
export default function HelperScreen() {
  const { state, update, family } = useApp();
  const lang = state.settings.helperLang;
  const [view, setView] = useState<'recipes' | 'shopping'>('recipes');
  const plan = state.plan?.status === 'confirmed' ? state.plan : null;
  const now = useTimerTick();

  return (
    <Screen eyebrow={family?.role === 'helper' ? undefined : `${cook()}'s phone`} title={t('title', lang)}>
      <TimerTray lang={lang} now={now} />
      <Text style={{ color: C.muted, fontSize: 14, lineHeight: 20, marginTop: 6 }}>{family?.role === 'helper' ? 'Pick your language:' : `The ${cookL()} only sees a menu after you confirm it. Pick their language:`}</Text>
      <Row style={{ marginTop: 10 }}>
        {LANGS.map((l) => (
          <Chip key={l.key} label={l.label} selected={lang === l.key} onPress={() => update((st) => ({ ...st, settings: { ...st.settings, helperLang: l.key } }))} />
        ))}
      </Row>

      {!plan ? (
        <KakiSays style={{ marginTop: 18 }}>{t('helloEmpty', lang)}</KakiSays>
      ) : (
        <>
          <KakiSays>{t('hello', lang)}</KakiSays>
          <ChangeNotes lang={lang} />
          {lang !== 'en' && <GeminiTranslate lang={lang} />}
          {lang !== 'en' && planRecipeIds(plan).some((id) => !fullyTranslated(recipeById(id), lang, state)) && (
            <View style={{ maxWidth: 520 }}><Notice tone="warn" icon="language-outline">{t('stepsEnglish', lang)}</Notice></View>
          )}
          <View style={{ flexDirection: 'row', marginTop: 16, backgroundColor: '#F3E7D4', borderRadius: 14, padding: 4, maxWidth: 520 }}>
            {(['recipes', 'shopping'] as const).map((v) => {
              const on = view === v;
              return (
                <Pressable key={v} onPress={() => setView(v)} style={{ flex: 1, paddingVertical: 10, borderRadius: 11, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6, backgroundColor: on ? C.card : 'transparent' }}>
                  <Icon name={v === 'recipes' ? 'book-outline' : 'cart-outline'} size={16} color={on ? C.brand : C.muted} />
                  <Text style={{ fontWeight: '700', color: on ? C.brandDeep : C.muted }}>{v === 'recipes' ? t('recipes', lang) : t('shopping', lang)}</Text>
                </Pressable>
              );
            })}
          </View>
          {view === 'recipes' ? <Recipes lang={lang} /> : <Shopping lang={lang} />}
          <Text style={{ color: C.faint, fontSize: 11, marginTop: 18, textAlign: 'center' }}>
            Prototype: Gemini translations are machine-made. Ask a native speaker to check them.
          </Text>
        </>
      )}
    </Screen>
  );
}

function Recipes({ lang }: { lang: Lang }) {
  const { state, update } = useApp();
  const [open, setOpen] = useState<string | null>(null);
  const [cookingId, setCookingId] = useState<string | null>(null);
  const plan = state.plan!;
  const spiceCap = householdSpiceCap(state.members).cap;
  const { cols } = useLayout();
  const renderDish = (d: (typeof plan.dishes)[number], meal?: 'breakfast' | 'lunch') => {
        const r = recipeById(d.recipeId);
        const tr = recipeText(r, lang, state);
        const cooked = isCooked(plan, d);
        const key = `${d.day}-${r.id}`;
        const expanded = open === key;
        const prog = state.cooking[dishKey(d)] ?? state.cooking[r.id];
        const inProgress = !cooked && prog && prog.step >= 0;
        return (
          <View key={key}>
            {meal && <Text style={{ marginTop: 10, color: C.muted, fontSize: 12, fontFamily: F.xbold, letterSpacing: 1 }}>{t(meal, lang).toUpperCase()}</Text>}
            <Card style={{ marginTop: meal ? 2 : 8, padding: 14 }}>
              <Pressable onPress={() => setOpen(expanded ? null : key)}>
                <Row style={{ flexWrap: 'nowrap', gap: 12 }}>
                  <DishPhoto recipe={r} size={60} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: F.display, fontSize: 16, lineHeight: 21 }}>{tr.name}</Text>
                    <Text style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>
                      {r.minutes} {t('minutes', lang)} · {chillies(r.spice)}
                    </Text>
                    {!cooked && (() => {
                      const missing = r.ingredients.filter((i) => !PANTRY.has(i.item) && !state.bought.includes(i.item) && !state.shopSwaps?.[i.item]);
                      return (
                        <View style={{ marginTop: 4, alignSelf: 'flex-start' }}>
                          {missing.length === 0
                            ? <Chip tone="good" icon="cart-outline" label={t('groceriesReady', lang)} />
                            : <Chip tone="warn" icon="cart" label={t('stillToBuy', lang, { n: missing.length })} />}
                        </View>
                      );
                    })()}
                    {tr.byGemini && (
                      <Row style={{ gap: 4, marginTop: 3 }}>
                        <Icon name="sparkles" size={11} color={C.brand} />
                        <Text style={{ color: C.brand, fontSize: 11, fontWeight: '700' }}>Gemini</Text>
                      </Row>
                    )}
                  </View>
                  {cooked ? <Icon name="checkmark-circle" size={24} color={C.green} /> : <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={C.muted} />}
                </Row>
              </Pressable>
              {inProgress && (
                <View style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ flex: 1 }}><Bar value={prog.done.length / tr.steps.length} color={C.accent} /></View>
                  <Text style={{ color: C.accent, fontWeight: '700', fontSize: 12 }}>{t('stepOf', lang, { n: prog.step + 1, m: tr.steps.length })}</Text>
                </View>
              )}
              {mildTip(r, spiceCap) && <Notice tone="warn" icon="flame-outline">{t('mild', lang)}</Notice>}
              {!cooked && !expanded && (
                <View style={{ marginTop: 10 }}>
                  <Button small={!inProgress} icon={inProgress ? 'play' : 'flame'} label={inProgress ? t('resume', lang) : t('startCooking', lang)} onPress={() => setCookingId(dishKey(d))} />
                </View>
              )}
              {expanded && (
                <View>
                  <DishPhoto recipe={r} banner height={190} placeholder style={{ marginTop: 12, marginBottom: 0 }} />
                  <Label>{t('ingredients', lang)}</Label>
                  {r.ingredients.map((i, ix) => (
                    <Row key={i.item} style={{ flexWrap: 'nowrap', paddingVertical: 3 }}>
                      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.brand }} />
                      <Text style={{ flex: 1 }}>{ingredientLabel(r, ix, lang, state)}</Text>
                      <Text style={{ color: C.muted }}>{qtyLabel(i.qty, lang)}</Text>
                    </Row>
                  ))}
                  <Label>{t('steps', lang)}</Label>
                  <View style={{ gap: 12 }}>
                    {tr.steps.map((st, k) => (
                      <Row key={k} style={{ flexWrap: 'nowrap', alignItems: 'flex-start', gap: 10 }}>
                        <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: C.brandSoft, alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ color: C.brandDeep, fontWeight: '800', fontSize: 13 }}>{k + 1}</Text>
                        </View>
                        <Text style={{ flex: 1, fontSize: 15, lineHeight: 23 }}>{st}</Text>
                      </Row>
                    ))}
                  </View>
                  <View style={{ marginTop: 16 }}>
                    {cooked
                      ? <Notice tone="good" icon="checkmark-circle">{t('cooked', lang)}</Notice>
                      : <Button icon={inProgress ? 'play' : 'flame'} label={inProgress ? t('resume', lang) : t('startCooking', lang)} onPress={() => setCookingId(dishKey(d))} />}
                  </View>
                </View>
              )}
            </Card>
          </View>
        );
  };
  const days = [...new Set([...plan.dishes.map((d) => d.day), ...(plan.meals ?? []).map((m) => m.day)])].sort((a, b) => a - b);
  const hasMeals = (plan.meals ?? []).length > 0;

  return (
    <>
      {cookingId && <CookingMode recipeId={cookingId} lang={lang} onClose={() => setCookingId(null)} />}
      <Grid cols={Math.min(3, cols(300))}>
        {days.map((day) => (
          <View key={day}>
            <Text style={{ fontFamily: F.display, fontSize: 18, marginTop: 22 }}>{dayLabel(day, lang, DAY_NAMES)}</Text>
            {(plan.meals ?? []).filter((m) => m.day === day).sort((a, b) => (a.meal === 'breakfast' ? 0 : 1) - (b.meal === 'breakfast' ? 0 : 1)).map((m) => renderDish({ recipeId: m.recipeId, day: m.day, isNew: false }, m.meal))}
            {hasMeals && plan.dishes.some((d) => d.day === day) && <Text style={{ marginTop: 10, color: C.muted, fontSize: 12, fontFamily: F.xbold, letterSpacing: 1 }}>{t('dinner', lang).toUpperCase()}</Text>}
            {plan.dishes.filter((d) => d.day === day).map((d) => renderDish(d))}
          </View>
        ))}
      </Grid>
    </>
  );
}

function Shopping({ lang }: { lang: Lang }) {
  const { state, update, family } = useApp();
  const [picking, setPicking] = useState<string | null>(null);
  const swaps = state.shopSwaps ?? {};
  const plan = state.plan!;
  const itemTr = itemNames(lang, state, planRecipeIds(plan).map((id) => recipeById(id)));
  const dishTr = Object.fromEntries(planRecipeIds(plan).map((id) => [recipeById(id).name, recipeText(recipeById(id), lang, state).name]));
  const lines = shoppingList(planRecipeIds(plan));
  const fresh = lines.filter((l) => !l.pantry);
  const pantry = lines.filter((l) => l.pantry);
  const total = fresh.reduce((a, l) => a + l.info.price, 0);
  const { isTablet, cols } = useLayout();
  const extras = state.extras ?? [];
  const { got: boughtCount, total: toGet } = shoppingProgress(state);

  const toggle = (item: string) => update((st) => ({ ...st, bought: st.bought.includes(item) ? st.bought.filter((x) => x !== item) : [...st.bought, item] }));
  // Not in the shop: buy one of the alternatives instead (null = skip it). Synced, so the owner sees it too.
  const choose = (item: string, to: string | null) => {
    update((st) => ({
      ...st,
      shopSwaps: { ...(st.shopSwaps ?? {}), [item]: { to, by: family?.myName, at: new Date().toISOString() } },
      bought: to === null ? st.bought.filter((x) => x !== item) : st.bought,
    }));
    setPicking(null);
  };
  const undo = (item: string) => update((st) => {
    const { [item]: _, ...rest } = st.shopSwaps ?? {};
    return { ...st, shopSwaps: rest };
  });

  const renderLine = (l: ShoppingLine, i: number) => {
    const swap = swaps[l.item];
    const skipped = swap?.to === null;
    const done = state.bought.includes(l.item) || skipped;
    const showPicker = picking === l.item && !swap && !state.bought.includes(l.item);
    return (
      <Pressable key={l.item} onPress={() => !skipped && toggle(l.item)} accessibilityRole="checkbox" accessibilityState={{ checked: done }} style={{ paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderColor: C.line }}>
        <Row style={{ flexWrap: 'nowrap', alignItems: 'flex-start', gap: 10 }}>
          <Icon name={skipped ? 'remove-circle-outline' : done ? 'checkbox' : 'square-outline'} size={22} color={skipped ? C.faint : done ? C.brand : C.faint} />
          <View style={{ flex: 1 }}>
            <Row style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
              <Text style={{ flex: 1, fontWeight: '700', color: done || swap ? C.faint : C.ink, textDecorationLine: done || swap ? 'line-through' : 'none' }}>{itemTr[l.item] ?? l.info.name}</Text>
              {(state.lateItems ?? []).includes(l.item) && !done && <View style={{ marginRight: 8 }}><Chip tone="new" icon="sparkles" label={t('newItem', lang)} /></View>}
              <Text style={{ fontWeight: '600', color: done ? C.faint : C.ink }}>{roughMoney(l.info.price)}</Text>
            </Row>
            <Text style={{ color: C.muted, fontSize: 12, marginTop: 1 }}>{qtyLabel(l.info.pack, lang)} · {l.uses.map((u) => dishTr[u.dish] ?? u.dish).join(', ')}</Text>
            {swap && (
              <Row style={{ marginTop: 6, flexWrap: 'nowrap', alignItems: 'flex-start' }}>
                <Text style={{ flex: 1, color: swap.to ? C.amber : C.muted, fontSize: 13, fontWeight: '700' }}>
                  {swap.to ? `↪ ${t('buyingInstead', lang)}: ${swap.to}` : t('skipped', lang)}
                </Text>
                <Pressable onPress={() => undo(l.item)} hitSlop={8} accessibilityRole="button">
                  <Text style={{ color: C.brand, fontSize: 13, fontWeight: '700' }}>{t('undo', lang)}</Text>
                </Pressable>
              </Row>
            )}
            {!swap && !l.pantry && !state.bought.includes(l.item) && (
              <Pressable onPress={() => setPicking(showPicker ? null : l.item)} accessibilityRole="checkbox" accessibilityState={{ checked: showPicker }} accessibilityLabel={`${t('notAvailable', lang)}: ${l.info.name}`} hitSlop={6}
                style={{ marginTop: 6, alignSelf: 'flex-start', flexDirection: 'row', gap: 6, alignItems: 'center', borderWidth: 1, borderColor: showPicker ? C.amber : C.line, backgroundColor: showPicker ? C.amberSoft : 'transparent', borderRadius: 10, paddingHorizontal: 9, paddingVertical: 5 }}>
                <Icon name={showPicker ? 'checkbox' : 'square-outline'} size={16} color={showPicker ? C.amber : C.muted} />
                <Text style={{ color: showPicker ? C.amber : C.muted, fontSize: 12, fontWeight: '700' }}>{t('notAvailable', lang)}</Text>
              </Pressable>
            )}
            {!swap && showPicker && (
              <View style={{ marginTop: 8, backgroundColor: C.amberSoft, borderRadius: 12, padding: 10, gap: 8 }}>
                <Text style={{ color: C.amber, fontSize: 13, fontWeight: '700' }}>{t('pickInstead', lang)}</Text>
                <Row style={{ gap: 6 }}>
                  {l.info.alternatives.map((a) => <Chip key={a} label={a} onPress={() => choose(l.item, a)} />)}
                  <Chip label={t('skipIt', lang)} onPress={() => choose(l.item, null)} />
                </Row>
              </View>
            )}
          </View>
        </Row>
      </Pressable>
    );
  };

  return (
    <>
      <Card style={{ backgroundColor: C.brand, ...(isTablet ? { maxWidth: 520 } : {}) }}>
        <Text style={{ color: '#C9D3A0', fontSize: 12, fontWeight: '700', letterSpacing: 1.2 }}>{t('estTotal', lang).toUpperCase()}</Text>
        <Text style={{ color: '#fff', fontFamily: F.displayX, fontSize: 30, letterSpacing: -1 }}>{ballpark(total)}</Text>
        <Text style={{ color: '#E4E8CF', fontSize: 13, marginBottom: 6 }}>{boughtCount}/{toGet} {t('bought', lang)}</Text>
        <View style={{ height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.25)', marginBottom: 12, overflow: 'hidden' }}>
          <View style={{ width: `${toGet ? (boughtCount / toGet) * 100 : 0}%`, height: '100%', backgroundColor: '#fff' }} />
        </View>
      </Card>
      <Grid cols={Math.min(3, cols(300))}>
      <Extras lang={lang} />
      {AISLES.map((aisle) => {
        const items = fresh.filter((l) => l.info.aisle === aisle);
        if (!items.length) return null;
        return (
          <Card key={aisle}>
            <Row style={{ marginBottom: 4 }}>
              <Icon name={AISLE_ICON[aisle]} size={16} color={C.brand} />
              <Text style={{ fontFamily: F.display, fontSize: 15 }}>{t(aisle, lang)}</Text>
            </Row>
            {items.map(renderLine)}
          </Card>
        );
      })}
      {pantry.length > 0 && (
        <Card style={{ backgroundColor: '#F7EBDA', shadowOpacity: 0 }}>
          <Row style={{ marginBottom: 4, flexWrap: 'nowrap' }}>
            <Icon name="home-outline" size={16} color={C.muted} />
            <Text style={{ fontFamily: F.display, fontSize: 15, flex: 1 }}>{t('pantry', lang)}</Text>
          </Row>
          {pantry.map(renderLine)}
        </Card>
      )}
      </Grid>
    </>
  );
}

/** Anything else for the shopping run: dish soap, fruit, batteries. Owner or helper can add. */
function Extras({ lang }: { lang: Lang }) {
  const { state, update } = useApp();
  const [draft, setDraft] = useState('');
  const extras = state.extras ?? [];
  const add = () => {
    const name = draft.trim();
    if (!name) return;
    update((st) => ({ ...st, extras: [...(st.extras ?? []), { id: newId(), name, done: false }] }));
    setDraft('');
  };
  const toggle = (id: string) => update((st) => ({ ...st, extras: (st.extras ?? []).map((e) => (e.id === id ? { ...e, done: !e.done } : e)) }));
  const remove = (id: string) => update((st) => ({ ...st, extras: (st.extras ?? []).filter((e) => e.id !== id) }));
  return (
    <Card>
      <Row style={{ marginBottom: 4 }}>
        <Icon name="bag-add-outline" size={16} color={C.accent} />
        <Text style={{ fontFamily: F.display, fontSize: 15 }}>{t('otherThings', lang)}</Text>
      </Row>
      {extras.map((e, i) => (
        <Row key={e.id} style={{ flexWrap: 'nowrap', gap: 10, paddingVertical: 9, borderTopWidth: i ? 1 : 0, borderColor: C.line }}>
          <Pressable onPress={() => toggle(e.id)} style={{ flexDirection: 'row', gap: 10, flex: 1, alignItems: 'flex-start' }} accessibilityRole="checkbox" accessibilityState={{ checked: e.done }}>
            <Icon name={e.done ? 'checkbox' : 'square-outline'} size={22} color={e.done ? C.brand : C.faint} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '700', color: e.done ? C.faint : C.ink, textDecorationLine: e.done ? 'line-through' : 'none' }}>{e.name}</Text>
              {e.note ? <Text style={{ color: C.muted, fontSize: 12 }}>{e.note}</Text> : null}
            </View>
          </Pressable>
          <Pressable onPress={() => remove(e.id)} hitSlop={6} accessibilityLabel={`Remove ${e.name}`}>
            <Icon name="close" size={18} color={C.faint} />
          </Pressable>
        </Row>
      ))}
      <Row style={{ flexWrap: 'nowrap', gap: 8, marginTop: 8 }}>
        <TextInput value={draft} onChangeText={setDraft} onSubmitEditing={add} returnKeyType="done" placeholder={t('addItem', lang)} placeholderTextColor={C.faint}
          accessibilityLabel={t('addItem', lang)}
          style={{ flex: 1, borderWidth: 1, borderColor: C.line, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: F.medium, color: C.ink }} />
        <Button small icon="add" label={t('add', lang)} onPress={add} disabled={!draft.trim()} />
      </Row>
    </Card>
  );
}

/** Tells the helper when the owner changed the menu at the last minute. */
function ChangeNotes({ lang }: { lang: Lang }) {
  const { state, update } = useApp();
  const notes = state.helperNotes ?? [];
  const lateOpen = (state.lateItems ?? []).filter((k) => !state.bought.includes(k) && !state.shopSwaps?.[k]);
  if (!notes.length) {
    return lateOpen.length ? (
      <View style={{ maxWidth: 560 }}>
        <Notice tone="warn" icon="cart">
          {t('lateNote', lang, { names: lateOpen.map((k) => CATALOGUE[k]?.name ?? k).join(', ') })}
          {shoppingDone(state, state.lateItems) ? ` ${t('extraTrip', lang)}` : ''}
        </Notice>
      </View>
    ) : null;
  }
  const changes = notes.flatMap((n) => n.changes).reverse()
    .filter((c, i, all) => all.findIndex((x) => x.day === c.day && x.to === c.to && x.kind === c.kind) === i);
  const late = (state.lateItems ?? []).filter((k) => !state.bought.includes(k) && !state.shopSwaps?.[k]);
  return (
    <Card style={{ backgroundColor: C.accentSoft, shadowOpacity: 0, maxWidth: 560 }}>
      <Row style={{ flexWrap: 'nowrap', gap: 8 }}>
        <Icon name="swap-horizontal" size={18} color={C.accent} />
        <Text style={{ fontFamily: F.display, fontSize: 16, flex: 1 }}>{t('menuChanged', lang)}</Text>
      </Row>
      <View style={{ gap: 4, marginTop: 8 }}>
        {changes.map((c) => (
          <View key={`${c.day}-${c.to}-${c.kind ?? ''}`}>
            {c.kind ? (
              <Text style={{ lineHeight: 20 }}>
                <Text style={{ fontWeight: '800' }}>{dayLabel(c.day, lang, DAY_NAMES)}: </Text>
                <Text style={{ fontWeight: '700', ...(c.kind === 'remove' ? { color: C.muted, textDecorationLine: 'line-through' as const } : {}) }}>{recipeText(recipeById(c.to), lang, state).name}</Text>
                {`  ·  ${c.kind === 'add' ? t('dishAdded', lang) : t('dishCancelled', lang)}`}
              </Text>
            ) : c.to === c.from ? (
              <Text style={{ lineHeight: 20 }}>
                <Text style={{ fontWeight: '800' }}>{dayLabel(c.day, lang, DAY_NAMES)}: </Text>
                <Text style={{ fontWeight: '700' }}>{recipeText(recipeById(c.to), lang, state).name}</Text>
                {` · ${t('cookLighter', lang)}: ${(c.how ?? []).map((h) => t(h, lang)).join(', ')}`}
              </Text>
            ) : (
              <Text style={{ lineHeight: 20 }}>
                <Text style={{ fontWeight: '800' }}>{dayLabel(c.day, lang, DAY_NAMES)}: </Text>
                <Text style={{ color: C.muted, textDecorationLine: 'line-through' }}>{recipeText(recipeById(c.from), lang, state).name}</Text>
                {'  →  '}
                <Text style={{ fontWeight: '700' }}>{recipeText(recipeById(c.to), lang, state).name}</Text>
              </Text>
            )}
            {(c.subs ?? []).map((x) => (
              <Text key={x.need} style={{ color: C.muted, fontSize: 13, marginLeft: 12 }}>↪ {t('useInstead', lang, { use: CATALOGUE[x.use].name, need: CATALOGUE[x.need].name })}</Text>
            ))}
          </View>
        ))}
      </View>
      {late.length > 0 && (
        <Notice tone="warn" icon="cart">
          {t('lateNote', lang, { names: late.map((k) => CATALOGUE[k]?.name ?? k).join(', ') })}
          {shoppingDone(state, state.lateItems) ? ` ${t('extraTrip', lang)}` : ''}
        </Notice>
      )}
      <View style={{ marginTop: 10, alignSelf: 'flex-start' }}>
        <Button small kind="ghost" icon="checkmark" label={t('gotIt', lang)} onPress={() => update((st) => ({ ...st, helperNotes: [] }))} />
      </View>
    </Card>
  );
}
