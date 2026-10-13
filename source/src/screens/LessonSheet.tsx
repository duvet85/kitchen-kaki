import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, TextInput, View } from 'react-native';
import { useAi } from '../ai/AiProvider';
import { GeminiError } from '../ai/gemini';
import { LessonPlanAI, planLessonAI, toCandidate } from '../ai/lesson';
import { recipeText } from '../ai/text';
import DishPhoto from '../DishPhoto';
import { SLOTS, SLOT_ICON, SLOT_LABEL, Slot, methodOf, slotOf } from '../data/methods';
import { recipeById } from '../data/recipes';
import { CATALOGUE } from '../data/store';
import { roughMoney } from '../engine/grocery';
import {
  buildTimeline, candidates, cancelLesson, clock, completeLesson, lessonGroceries, moveLesson, pickTrio, planDayOf, rulesKept, saveLesson,
  teachScore, trioOf, trioProblems,
} from '../engine/lesson';
import { helperOf, isMastered, localDate } from '../engine/recognition';
import { DAY_NAMES } from '../engine/planner';
import { TIP_TEXT, tk } from '../i18n-kitchen';
import { LANGS } from '../i18n';
import { newId, useApp } from '../state';
import { FamilyError } from '../sync/family';
import { Lang, Lesson, LessonStep, Recipe } from '../types';
import { Button, C, Card, Chip, F, Icon, Label, Notice, Row, Text, chillies, s, useLayout } from '../ui';
import { Sheet } from './FamilyScreen';

const TIMES = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'];
const nextDays = (n: number) => Array.from({ length: n }, (_, i) => { const d = new Date(); d.setDate(d.getDate() + i); return d; });
export const lessonDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'short' });
};
const slotOfRecipe = (r: Recipe): Slot => slotOf(methodOf(r)) ?? 'slow';

/** Tips for a dish in the lesson: Gemini's when there are any, otherwise the hand-written ones for its kind of dish. */
function tipsFor(l: Pick<Lesson, 'tips' | 'tipsTr'>, r: Recipe, lang: Lang) {
  const slot = slotOfRecipe(r);
  const general = { knife: [tk(`${slot}Knife` as 'soupKnife', lang)], heat: [tk(`${slot}Heat` as 'soupHeat', lang)] };
  const ai = lang === 'en' ? l.tips?.[r.id] : l.tipsTr?.[r.id];
  const en = l.tips?.[r.id];
  if (ai && (ai.knife.length || ai.heat.length)) return { ...ai, en: lang !== 'en' ? en : undefined, byGemini: true };
  if (en && lang !== 'en' && (en.knife.length || en.heat.length)) return { ...en, en: undefined, byGemini: true, englishOnly: true };
  return { ...general, en: lang !== 'en' ? { knife: [tk(`${slot}Knife` as 'soupKnife', 'en')], heat: [tk(`${slot}Heat` as 'soupHeat', 'en')] } : undefined, byGemini: false };
}

const stepText = (st: LessonStep, lang: Lang, name: (id: string) => string) =>
  st.kind === 'teach' ? tk('stepTeach', lang) : st.kind === 'prep' ? tk('stepPrep', lang) : st.kind === 'taste' ? tk('stepTaste', lang)
    : st.kind === 'tidy' ? tk('stepTidy', lang) : st.kind === 'early' ? tk('stepEarly', lang, { dish: name(st.recipeId!) }) : tk('stepCook', lang, { dish: name(st.recipeId!) });

/** The 2-hour plan as lanes: one bar per dish, shaded bands for welcome/prep/taste/tidy. */
export function TimelineBars({ steps, start, trio }: { steps: LessonStep[]; start: string; trio: Recipe[] }) {
  const from = Math.min(0, ...steps.map((x) => x.at));
  const span = 120 - from;
  const pct = (m: number) => `${((m - from) / span) * 100}%` as const;
  const bands = steps.filter((x) => !x.recipeId);
  const COLORS: Record<Slot, string> = { soup: '#9AA64B', slow: C.gold, wok: C.accent };
  return (
    <View style={{ gap: 8 }}>
      {trio.map((r) => {
        const mine = steps.filter((x) => x.recipeId === r.id);
        const slot = slotOfRecipe(r);
        return (
          <View key={r.id}>
            <Text style={{ fontSize: 12, color: C.muted, marginBottom: 3 }}>{SLOT_ICON[slot]} {r.name}</Text>
            <View style={{ height: 14, backgroundColor: '#F6EBDA', borderRadius: 7, overflow: 'hidden' }}>
              {from < 0 && <View style={{ position: 'absolute', left: 0, width: pct(0), top: 0, bottom: 0, backgroundColor: '#EEDFC9' }} />}
              {mine.map((x, i) => (
                <View key={i} style={{ position: 'absolute', left: pct(x.at), width: `${((x.until - x.at) / span) * 100}%`, top: 2, bottom: 2, borderRadius: 5, backgroundColor: COLORS[slot], opacity: x.kind === 'early' ? 0.45 : 1 }} />
              ))}
            </View>
          </View>
        );
      })}
      <View style={{ height: 22, flexDirection: 'row', marginTop: 2 }}>
        {from < 0 && <View style={{ width: pct(0), justifyContent: 'center' }}><Text style={{ fontSize: 10, color: C.muted }}>before</Text></View>}
        {bands.map((b, i) => (
          <View key={i} style={{ position: 'absolute', left: pct(b.at), width: `${((b.until - b.at) / span) * 100}%`, top: 0, bottom: 0, borderRadius: 6, backgroundColor: C.brandSoft, alignItems: 'center', justifyContent: 'center', borderLeftWidth: 1, borderColor: C.card }}>
            <Text style={{ fontSize: 10, color: C.brandDeep, fontWeight: '700' }} numberOfLines={1}>{b.kind === 'teach' ? 'hello' : b.kind}</Text>
          </View>
        ))}
      </View>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 11, color: C.faint }}>{clock(start, from)}</Text>
        <Text style={{ fontSize: 11, color: C.faint }}>{clock(start, 120)}</Text>
      </Row>
    </View>
  );
}

/** The owner's lesson planner: three dishes, when, who teaches, the 2-hour plan, groceries and the menu choice. */
export function LessonPlanner({ onClose, editing }: { onClose: () => void; editing?: Lesson }) {
  const { state, update, family } = useApp();
  const { key, model } = useAi();
  const { isTablet } = useLayout();
  const gemini = !!(family || (key && model));
  const first = useMemo(() => pickTrio(state), []);
  const [picks, setPicks] = useState<Partial<Record<Slot, string>>>(
    editing ? Object.fromEntries(editing.dishes.map((d) => [slotOfRecipe(recipeById(d.recipeId)), d.recipeId])) : Object.fromEntries(SLOTS.map((s) => [s, first.picks[s]?.id]).filter(([, v]) => v)),
  );
  const [ai, setAi] = useState<LessonPlanAI | null>(null);
  const [pickedBy, setPickedBy] = useState<Lesson['pickedBy']>(editing?.pickedBy ?? 'rules');
  const [busy, setBusy] = useState(false);
  const [aiNote, setAiNote] = useState<string | null>(null);
  const [swapping, setSwapping] = useState<Slot | null>(null);
  const days = nextDays(14);
  const [date, setDate] = useState(editing?.date ?? localDate(days[(6 - new Date().getDay() + 7) % 7] ?? days[0]));
  const [start, setStart] = useState(editing?.start ?? '10:00');
  const [teacher, setTeacher] = useState(editing?.teacher ?? family?.myName ?? '');
  const [menuMode, setMenuMode] = useState<Lesson['menuMode']>(editing?.menuMode ?? 'dinner');
  const lang = state.settings.helperLang;
  const helper = helperOf(state);
  const pool = useMemo(() => candidates(state), [state]);
  const trio = SLOTS.map((s) => picks[s]).filter(Boolean).map((id) => recipeById(id!));
  const { steps, early } = buildTimeline(trio);
  const problems = trioProblems(state, trio);
  const groc = lessonGroceries(state, trio);
  const day = planDayOf(state, date);
  const rules = rulesKept(state);

  const suggest = async () => {
    setAiNote(null);
    if (!gemini) {
      const p = pickTrio(state, true);
      setPicks(Object.fromEntries(SLOTS.map((s) => [s, p.picks[s]?.id ?? picks[s]])));
      setPickedBy('rules');
      setAi(null);
      setAiNote('Picked by simple rules (Gemini is off). Turn on Gemini in Settings for picks with teaching tips.');
      return;
    }
    setBusy(true);
    try {
      const list = SLOTS.flatMap((s) => [...pool[s]].sort((a, b) => teachScore(state, b) - teachScore(state, a)).slice(0, 4).map((r) => toCandidate(r, s)));
      const plan = await planLessonAI(list, lang, { family, key });
      setPicks(plan.picks);
      setAi(plan);
      setPickedBy('gemini');
      if (problems.length) setAiNote(null);
    } catch (e) {
      const p = pickTrio(state, true);
      setPicks(Object.fromEntries(SLOTS.map((s) => [s, p.picks[s]?.id ?? picks[s]])));
      setPickedBy('rules');
      setAi(null);
      setAiNote(`${e instanceof GeminiError || e instanceof FamilyError ? e.message : "Gemini didn't answer."} Picked by simple rules instead.`);
    } finally {
      setBusy(false);
    }
  };

  const save = () => {
    const lesson: Lesson = {
      id: editing?.id ?? newId(), status: 'planned', date, start, teacher: teacher.trim() || 'the family',
      dishes: trio.map((r) => ({ recipeId: r.id, method: methodOf(r) })), lang, timeline: steps,
      tips: ai?.tips ?? (editing && trio.every((r) => editing.dishes.some((d) => d.recipeId === r.id)) ? editing.tips : undefined),
      tipsTr: ai?.tipsTr ?? (editing && trio.every((r) => editing.dishes.some((d) => d.recipeId === r.id)) ? editing.tipsTr : undefined),
      pickedBy, menuMode, createdAt: editing?.createdAt ?? new Date().toISOString(),
    };
    update((st) => {
      const base = editing ? cancelLesson(st, editing.id, false, newId) : st;
      return saveLesson({ ...base, lessons: (base.lessons ?? []).filter((l) => l.id !== lesson.id) }, lesson, newId);
    });
    onClose();
  };

  if (swapping) {
    const list = [...pool[swapping]].sort((a, b) => teachScore(state, b) - teachScore(state, a));
    return (
      <Sheet title={`Choose the ${SLOT_LABEL[swapping].toLowerCase()}`} onClose={() => setSwapping(null)}>
        <Text style={{ color: C.muted, marginTop: 6 }}>Only dishes that fit everyone's food rules. Best to teach first.</Text>
        {list.map((r) => {
          const bad = trioProblems(state, [...trio.filter((x) => slotOfRecipe(x) !== swapping), r]);
          return (
            <Pressable key={r.id} onPress={() => { setPicks({ ...picks, [swapping]: r.id }); setPickedBy('owner'); setSwapping(null); }} accessibilityRole="button"
              style={({ pressed }) => ({ flexDirection: 'row', gap: 12, alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderColor: C.line, backgroundColor: pressed ? C.brandSoft : 'transparent' })}>
              <DishPhoto recipe={r} size={52} />
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={{ fontFamily: F.display, fontSize: 15 }}>{r.name}</Text>
                <Text style={{ color: C.muted, fontSize: 12 }}>{r.minutes} min · {chillies(r.spice)}{r.sodium === 'high' ? ' · salty' : ''}</Text>
                <Row style={{ gap: 4 }}>
                  {picks[swapping] === r.id && <Chip tone="brand" icon="checkmark" label="Chosen" />}
                  {isMastered(state, r.id) && <Chip tone="good" icon="ribbon" label={`${helper} has mastered it`} />}
                  {state.plan?.dishes.some((d) => d.recipeId === r.id) && <Chip tone="plain" icon="calendar-outline" label="On this week's menu" />}
                  {bad.map((b) => <Chip key={b} tone="warn" icon="alert-circle-outline" label={b} />)}
                </Row>
              </View>
            </Pressable>
          );
        })}
        {!list.length && <Notice tone="warn" icon="alert-circle-outline">No {SLOT_LABEL[swapping].toLowerCase()} in the recipe book fits everyone's food rules.</Notice>}
      </Sheet>
    );
  }

  return (
    <Sheet title={editing ? 'Change the lesson' : 'Plan a cooking lesson'} onClose={onClose}>
      <Text style={{ color: C.muted, marginTop: 6, lineHeight: 20 }}>Anyone can teach: you, a relative, or a cook you know. Three dishes that cook side by side in 2 hours.</Text>
      <Row style={{ justifyContent: 'space-between', marginTop: 8 }}>
        <Label style={{ marginTop: 8 }}>Dishes</Label>
        {busy ? <ActivityIndicator color={C.brand} /> : <Button small kind="ghost" icon="sparkles" label="Suggest dishes" onPress={suggest} />}
      </Row>
      {SLOTS.map((slot) => {
        const id = picks[slot];
        const r = id ? recipeById(id) : null;
        return (
          <Card key={slot} style={{ marginTop: 8, padding: 12 }}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: C.brand, letterSpacing: 1 }}>{SLOT_ICON[slot]}  {SLOT_LABEL[slot].toUpperCase()}</Text>
            {r ? (
              <Row style={{ flexWrap: 'nowrap', gap: 12, marginTop: 8 }}>
                <DishPhoto recipe={r} size={56} />
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={{ fontFamily: F.display, fontSize: 16 }}>{r.name}</Text>
                  <Text style={{ color: C.muted, fontSize: 12 }}>{r.minutes} min · {chillies(r.spice)}</Text>
                  <Row style={{ gap: 4 }}>
                    {isMastered(state, r.id) ? <Chip tone="good" icon="ribbon" label="Already mastered" /> : !state.history.includes(r.id) ? <Chip tone="new" icon="sparkles" label="New dish" /> : null}
                    {state.plan?.dishes.some((d) => d.recipeId === r.id) && <Chip tone="plain" icon="calendar-outline" label={`On ${state.plan.dishes.filter((d) => d.recipeId === r.id).map((d) => DAY_NAMES[d.day]).join(', ')}'s menu`} />}
                  </Row>
                </View>
                <Button small kind="ghost" label="Swap" onPress={() => setSwapping(slot)} />
              </Row>
            ) : (
              <View style={{ marginTop: 8, gap: 8 }}>
                <Text style={{ color: C.amber }}>{pool[slot].length ? 'None chosen.' : `No ${SLOT_LABEL[slot].toLowerCase()} fits everyone's food rules. Two dishes is fine too.`}</Text>
                {pool[slot].length > 0 && <Button small kind="ghost" label="Choose" onPress={() => setSwapping(slot)} />}
              </View>
            )}
          </Card>
        );
      })}
      <Text style={{ color: C.muted, fontSize: 12, marginTop: 8, lineHeight: 18 }}>
        {pickedBy === 'gemini' ? 'Picked by Gemini from dishes that fit your family. ' : pickedBy === 'rules' ? 'Picked by Kitchen Kaki’s rules. ' : 'Your choice. '}
        {rules.length ? `Keeps to: ${rules.join(' · ')}.` : ''}
      </Text>
      {ai?.why ? <Text style={{ color: C.muted, fontSize: 12, marginTop: 4, fontStyle: 'italic' }}>Gemini: “{ai.why}”</Text> : null}
      {aiNote && <Notice tone="brand" icon="information-circle-outline">{aiNote}</Notice>}
      {problems.map((p) => <Notice key={p} tone="bad" icon="alert-circle">{p}. Swap one of the dishes.</Notice>)}

      <Label>When</Label>
      <Row>{days.slice(0, isTablet ? 14 : 10).map((d) => { const iso = localDate(d); return <Chip key={iso} label={lessonDate(iso)} selected={date === iso} onPress={() => setDate(iso)} />; })}</Row>
      <Row style={{ marginTop: 8 }}>{TIMES.map((t) => <Chip key={t} label={t} selected={start === t} onPress={() => setStart(t)} />)}</Row>
      <Label>Who teaches</Label>
      <TextInput value={teacher} onChangeText={setTeacher} maxLength={40} placeholder="Your name, Grandma, Auntie Lim…" placeholderTextColor={C.faint} style={s.input} accessibilityLabel="Who teaches" />
      <Label>{helper}'s language</Label>
      <Text>{LANGS.find((l) => l.key === lang)?.label}{lang !== 'en' ? ', shown with English underneath so you can follow together.' : ''}</Text>
      {lang !== 'en' && trio.some((r) => !recipeText(r, lang, state).stepsTranslated) && (
        <Notice tone="warn" icon="language-outline">Cooking steps for {trio.filter((r) => !recipeText(r, lang, state).stepsTranslated).map((r) => r.name).join(', ')} aren’t translated yet. Translate them on the Helper tab (Gemini). The lesson tips are already in {LANGS.find((l) => l.key === lang)?.label}.</Notice>
      )}

      {trio.length > 0 && (
        <>
          <Label>The 2-hour plan</Label>
          <Card style={{ marginTop: 0 }}><TimelineBars steps={steps} start={start} trio={trio} /></Card>
          {early.map((e) => (
            <Notice key={e.recipeId} tone="warn" icon="time-outline">
              {recipeById(e.recipeId).name} needs longer than the lesson: start it {e.minutes} min before ({clock(start, -e.minutes)}), or swap it for a quicker dish.
            </Notice>
          ))}
          <Label>Groceries</Label>
          <Card style={{ marginTop: 0, gap: 6 }}>
            {groc.have.length > 0 && <Text><Text style={{ fontWeight: '700', color: C.green }}>✓ {groc.have.length} already bought</Text></Text>}
            {groc.coming.length > 0 && <Text><Text style={{ fontWeight: '700' }}>{groc.coming.length} on this week's list</Text></Text>}
            {groc.toBuy.length > 0
              ? <Text style={{ lineHeight: 20 }}><Text style={{ fontWeight: '700', color: C.amber }}>{groc.toBuy.length} to buy: </Text>{groc.toBuy.map((k) => CATALOGUE[k]?.name ?? k).join(', ')}</Text>
              : <Text style={{ color: C.green, fontWeight: '600' }}>Nothing extra to buy.</Text>}
            {groc.toBuy.length > 0 && <Text style={{ color: C.muted, fontSize: 12 }}>About {roughMoney(groc.cost)} extra (sample prices, not real NTUC prices).</Text>}
            {day !== null && menuMode !== 'separate' && trio.filter((r) => state.plan?.dishes.some((d) => d.recipeId === r.id && d.day !== day)).map((r) => (
              <Text key={r.id} style={{ color: C.amber, fontSize: 12 }}>{r.name} is also on {state.plan!.dishes.filter((d) => d.recipeId === r.id && d.day !== day).map((d) => DAY_NAMES[d.day]).join(', ')}'s menu: buy enough for both days, or swap that day's dish.</Text>
            ))}
            {groc.pantry.length > 0 && <Text style={{ color: C.muted, fontSize: 12 }}>Check the kitchen for: {groc.pantry.map((k) => CATALOGUE[k]?.name ?? k).join(', ')}.</Text>}
          </Card>

          <Label>{day === null ? 'On the menu' : `On ${DAY_NAMES[day]}'s menu`}</Label>
          {([
            ['dinner', 'The lesson is that day’s dinner', 'The three dishes replace that day’s dishes. Nothing extra to cook.'],
            ['extra', 'Cook on top of the day’s dishes', 'The lesson dishes are added to that day.'],
            ['separate', 'Don’t change my menu', 'Lesson groceries are listed in the lesson only; buy them separately.'],
          ] as const).map(([k, title, sub]) => (
            <Pressable key={k} onPress={() => setMenuMode(k)} accessibilityRole="radio" accessibilityState={{ checked: menuMode === k }}
              style={{ flexDirection: 'row', gap: 10, paddingVertical: 10, alignItems: 'flex-start' }}>
              <Icon name={menuMode === k ? 'radio-button-on' : 'radio-button-off'} size={20} color={menuMode === k ? C.brand : C.faint} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700' }}>{title}{k === 'dinner' ? '  ·  recommended' : ''}</Text>
                <Text style={{ color: C.muted, fontSize: 13 }}>{sub}</Text>
              </View>
            </Pressable>
          ))}
          {day === null && menuMode !== 'separate' && <Notice tone="brand" icon="calendar-outline">{lessonDate(date)} isn’t in this week’s menu. When that week’s menu is ready, the Kitchen tab will ask before adding the dishes.</Notice>}
          {day !== null && state.plan?.status === 'confirmed' && menuMode !== 'separate' && <Notice tone="brand" icon="paper-plane-outline">The menu is already sent, so {helper} gets the usual “menu changed” note and any new items are marked NEW on the shopping list.</Notice>}
        </>
      )}
      <View style={{ marginTop: 18, gap: 8 }}>
        <Button icon="checkmark" label={editing ? 'Save changes' : 'Plan the lesson'} disabled={trio.length < 2 || problems.length > 0} onPress={save} />
        <Button kind="ghost" label="Cancel" onPress={onClose} />
      </View>
    </Sheet>
  );
}

/** The lesson as the helper (and teacher) use it: her language first, English underneath. */
export function LessonView({ lesson, onClose }: { lesson: Lesson; onClose: () => void }) {
  const { state, update, family } = useApp();
  const [finishing, setFinishing] = useState(false);
  const [notes, setNotes] = useState(lesson.notes ?? '');
  const lang = state.settings.helperLang;
  const trio = trioOf(lesson);
  const name = (id: string) => { const r = recipeById(id); return lang === 'en' ? r.name : r.i18n?.[lang]?.name ?? r.name; };
  const enName = (id: string) => recipeById(id).name;
  const steps = lesson.timeline;
  const both = (a: string, b: string) => (
    <View>
      <Text style={{ fontSize: 15, lineHeight: 21 }}>{a}</Text>
      {lang !== 'en' && a !== b && <Text style={{ color: C.muted, fontSize: 12, lineHeight: 17 }}>{b}</Text>}
    </View>
  );
  const saveNotes = () => update((st) => ({ ...st, lessons: (st.lessons ?? []).map((l) => (l.id === lesson.id ? { ...l, notes: notes.trim() } : l)) }));

  if (finishing) return <FinishLesson lesson={lesson} notes={notes} onClose={() => { setFinishing(false); onClose(); }} owner={family?.role !== 'helper'} />;
  return (
    <Sheet title={tk('lesson', lang)} onClose={() => { saveNotes(); onClose(); }}>
      <Text style={{ color: C.muted }}>{tk('lessonWhen', lang, { date: lessonDate(lesson.date), time: lesson.start, teacher: lesson.teacher })}</Text>
      <Label>{tk('plan2h', lang)}</Label>
      <Card style={{ marginTop: 0, gap: 10 }}>
        {steps.map((x, i) => (
          <Row key={i} style={{ flexWrap: 'nowrap', alignItems: 'flex-start', gap: 10 }}>
            <Text style={{ width: 48, fontWeight: '800', color: x.kind === 'early' ? C.amber : C.brand }}>{clock(lesson.start, x.at)}</Text>
            <View style={{ flex: 1 }}>{both(stepText(x, lang, name), stepText(x, 'en', enName))}</View>
          </Row>
        ))}
      </Card>
      {trio.map((r) => {
        const tips = tipsFor(lesson, r, lang);
        const slot = slotOfRecipe(r);
        return (
          <Card key={r.id}>
            <Row style={{ flexWrap: 'nowrap', gap: 12 }}>
              <DishPhoto recipe={r} size={56} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: C.brand, letterSpacing: 1 }}>{SLOT_ICON[slot]}  {SLOT_LABEL[slot].toUpperCase()}</Text>
                <Text style={{ fontFamily: F.display, fontSize: 17 }}>{name(r.id)}</Text>
                {lang !== 'en' && <Text style={{ color: C.muted, fontSize: 12 }}>{r.name}</Text>}
              </View>
            </Row>
            <Label>{tk('knife', lang)}</Label>
            {tips.knife.map((x, i) => <View key={i} style={{ marginBottom: 6 }}>{both(`• ${x}`, tips.en?.knife[i] ? `• ${tips.en.knife[i]}` : '')}</View>)}
            <Label>{tk('heat', lang)}</Label>
            {tips.heat.map((x, i) => <View key={i} style={{ marginBottom: 6 }}>{both(`• ${x}`, tips.en?.heat[i] ? `• ${tips.en.heat[i]}` : '')}</View>)}
            {tips.byGemini && <Text style={{ color: C.faint, fontSize: 11, marginTop: 4 }}>{tk('byGemini', lang)}</Text>}
            <FamilyTipLine recipeId={r.id} lang={lang} />
          </Card>
        );
      })}
      <Label>{tk('notes', lang)}</Label>
      <TextInput value={notes} onChangeText={setNotes} onBlur={saveNotes} multiline maxLength={600} placeholder="e.g. Less water for the rice, Grandma's way" placeholderTextColor={C.faint}
        style={[s.input, { minHeight: 80, textAlignVertical: 'top' }]} accessibilityLabel={tk('notes', lang)} />
      {lesson.status === 'planned' && <View style={{ marginTop: 16 }}><Button icon="checkmark-done" label={tk('finish', lang)} onPress={() => { saveNotes(); setFinishing(true); }} /></View>}
      {lesson.status === 'done' && <Notice tone="good" icon="checkmark-circle">{tk('done', lang)} · {lesson.doneAt ? lessonDate(localDate(new Date(lesson.doneAt))) : ''}</Notice>}
    </Sheet>
  );
}

function FamilyTipLine({ recipeId, lang }: { recipeId: string; lang: Lang }) {
  const { state } = useApp();
  const t = state.dishTweaks?.[recipeId] ?? [];
  if (!t.length) return null;
  return <Notice tone="brand" icon="heart-outline">{tk('remember', lang)} {t.map((x) => TIP_TEXT[x][lang]).join(' ')}</Notice>;
}

/** After the lesson: she rates how sure she feels per dish; the owner may also confirm a dish as mastered. */
function FinishLesson({ lesson, notes, onClose, owner }: { lesson: Lesson; notes: string; onClose: () => void; owner: boolean }) {
  const { state, update, family } = useApp();
  const lang = state.settings.helperLang;
  const trio = trioOf(lesson);
  const [conf, setConf] = useState<Record<string, number>>(Object.fromEntries(trio.map((r) => [r.id, state.confidence?.[r.id] ?? 0])));
  const [mastered, setMastered] = useState<string[]>([]);
  const helper = helperOf(state);
  const done = () => {
    update((st) => completeLesson(st, lesson.id, Object.fromEntries(Object.entries(conf).filter(([, n]) => n > 0)), notes, mastered, family?.myName, newId));
    onClose();
  };
  return (
    <Sheet title={tk('finish', lang)} onClose={onClose}>
      <Text style={{ color: C.muted, marginTop: 6 }}>{tk('howSure', lang)}{lang !== 'en' ? `\n${tk('howSure', 'en')}` : ''}</Text>
      {trio.map((r) => (
        <Card key={r.id} style={{ padding: 12 }}>
          <Text style={{ fontFamily: F.display, fontSize: 16 }}>{lang === 'en' ? r.name : r.i18n?.[lang]?.name ?? r.name}</Text>
          <Stars value={conf[r.id]} onChange={(n) => setConf({ ...conf, [r.id]: n })} lang={lang} />
          {owner && !isMastered(state, r.id) && (
            <View style={{ marginTop: 8 }}>
              <Chip label={`Owner: ${helper} has mastered it`} selected={mastered.includes(r.id)} onPress={() => setMastered(mastered.includes(r.id) ? mastered.filter((x) => x !== r.id) : [...mastered, r.id])} />
            </View>
          )}
        </Card>
      ))}
      {owner && <Text style={{ color: C.muted, fontSize: 12, marginTop: 8 }}>The stars are {helper}'s own rating; let her choose them. Mastery is your call, now or later from the Kitchen tab.</Text>}
      <View style={{ marginTop: 16, gap: 8 }}>
        <Button icon="checkmark-done" label={tk('done', lang)} onPress={done} />
      </View>
    </Sheet>
  );
}

/** 1 to 5 stars: how sure she feels cooking a dish alone. */
export function Stars({ value, onChange, lang }: { value?: number; onChange: (n: number) => void; lang: Lang }) {
  return (
    <View style={{ marginTop: 8 }}>
      <Row style={{ gap: 4 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable key={n} onPress={() => onChange(n === value ? 0 : n)} hitSlop={4} accessibilityRole="button" accessibilityLabel={`${n} of 5`}>
            <Icon name={(value ?? 0) >= n ? 'star' : 'star-outline'} size={30} color={(value ?? 0) >= n ? C.gold : C.faint} />
          </Pressable>
        ))}
      </Row>
      <Row style={{ justifyContent: 'space-between', width: 170 }}>
        <Text style={{ fontSize: 11, color: C.faint }}>{tk('sure1', lang)}</Text>
        <Text style={{ fontSize: 11, color: C.faint }}>{tk('sure5', lang)}</Text>
      </Row>
    </View>
  );
}

/** Owner: move or cancel a lesson. */
export function LessonActions({ lesson, onClose }: { lesson: Lesson; onClose: () => void }) {
  const { state, update } = useApp();
  const [date, setDate] = useState(lesson.date);
  const [start, setStart] = useState(lesson.start);
  const [mode, setMode] = useState<'move' | 'cancel'>('move');
  const onMenu = !!state.plan?.dishes.some((d) => d.lesson === lesson.id);
  return (
    <Sheet title="Move or cancel" onClose={onClose}>
      <Row style={{ marginTop: 10 }}>
        <Chip label="Move it" selected={mode === 'move'} onPress={() => setMode('move')} />
        <Chip label="Cancel it" selected={mode === 'cancel'} onPress={() => setMode('cancel')} />
      </Row>
      {mode === 'move' ? (
        <>
          <Label>New day</Label>
          <Row>{nextDays(14).map((d) => { const iso = localDate(d); return <Chip key={iso} label={lessonDate(iso)} selected={date === iso} onPress={() => setDate(iso)} />; })}</Row>
          <Row style={{ marginTop: 8 }}>{TIMES.map((t) => <Chip key={t} label={t} selected={start === t} onPress={() => setStart(t)} />)}</Row>
          {onMenu && <Notice tone="brand" icon="swap-horizontal">The lesson dishes move with it, and your helper gets the usual “menu changed” note. Groceries already bought stay ticked.</Notice>}
          <View style={{ marginTop: 16 }}><Button icon="calendar" label="Move the lesson" onPress={() => { update((st) => moveLesson(st, lesson.id, date, start, newId)); onClose(); }} /></View>
        </>
      ) : (
        <View style={{ marginTop: 12, gap: 8 }}>
          {onMenu ? (
            <>
              <Text style={{ color: C.muted }}>The lesson dishes are on the menu. The food may already be bought.</Text>
              <Button kind="ghost" label="Cancel, but keep the dishes on the menu" onPress={() => { update((st) => cancelLesson(st, lesson.id, true, newId)); onClose(); }} />
              <Button kind="danger" label="Cancel and take the dishes off the menu" onPress={() => { update((st) => cancelLesson(st, lesson.id, false, newId)); onClose(); }} />
            </>
          ) : (
            <Button kind="danger" label="Cancel the lesson" onPress={() => { update((st) => cancelLesson(st, lesson.id, false, newId)); onClose(); }} />
          )}
        </View>
      )}
    </Sheet>
  );
}

/** One lesson as a row in a list. */
export function LessonRow({ lesson, lang, onOpen, actions }: { lesson: Lesson; lang: Lang; onOpen: () => void; actions?: React.ReactNode }) {
  const trio = trioOf(lesson);
  return (
    <Card style={{ padding: 14 }}>
      <Pressable onPress={onOpen} accessibilityRole="button">
        <Row style={{ flexWrap: 'nowrap', gap: 10 }}>
          <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: lesson.status === 'done' ? C.greenSoft : C.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={lesson.status === 'done' ? 'school' : 'school-outline'} size={22} color={lesson.status === 'done' ? C.green : C.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: F.display, fontSize: 16 }}>{tk('lesson', lang)}{lesson.status === 'done' ? ` · ${tk('done', lang)}` : ''}</Text>
            <Text style={{ color: C.muted, fontSize: 13 }}>{tk('lessonWhen', lang, { date: lessonDate(lesson.date), time: lesson.start, teacher: lesson.teacher })}</Text>
          </View>
          <Icon name="chevron-forward" size={18} color={C.faint} />
        </Row>
        <Row style={{ gap: 8, marginTop: 10 }}>
          {trio.map((r) => (
            <Row key={r.id} style={{ gap: 6, flexWrap: 'nowrap' }}>
              <DishPhoto recipe={r} size={30} />
              <Text style={{ fontSize: 13, fontWeight: '600' }}>{lang === 'en' ? r.name : r.i18n?.[lang]?.name ?? r.name}</Text>
            </Row>
          ))}
        </Row>
      </Pressable>
      {actions}
    </Card>
  );
}
