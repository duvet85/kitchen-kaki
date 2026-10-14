import React, { useEffect, useRef, useState } from 'react';
import { Linking, Modal, Pressable, ScrollView, Vibration, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CATALOGUE } from '../data/store';
import { recipeById } from '../data/recipes';
import { qtyLabel } from '../i18n-units';
import { recipeText, ingredientLabel } from '../ai/text';
import DishPhoto from '../DishPhoto';
import { t } from '../i18n';
import { newId, useApp } from '../state';
import { CookTimer, Lang } from '../types';
import { Bar, Button, C, F, Icon, IconButton, Label, Row, Text, useLayout } from '../ui';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { recordCooked } from '../engine/recognition';
import { FamilyTipBanner } from './KitchenTips';

/** Minutes mentioned in an English step ("40 minutes", "12 to 15 minutes", "2 hours"). Uses the upper bound. */
export function stepMinutes(step: string): number | null {
  const m = step.match(/(\d+)(?:\s*(?:to|-)\s*(\d+))?\s*(minutes?|mins?|hours?)\b/i);
  if (!m) return null;
  const n = Number(m[2] ?? m[1]);
  return /hour/i.test(m[3]) ? n * 60 : n;
}

export const fmtClock = (sec: number) => {
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const mm = String(Math.floor((s % 3600) / 60)).padStart(h ? 2 : 1, '0');
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
};

const fmtLen = (min: number) => (min >= 60 ? `${min / 60} h` : `${min} min`);

export const timeLeft = (tm: CookTimer, now: number) => (tm.endsAt === null ? tm.leftSec : (tm.endsAt - now) / 1000);

/** Re-renders every second while any timer exists, and buzzes once when one runs out. */
export function useTimerTick() {
  const { state } = useApp();
  const [now, setNow] = useState(Date.now());
  const rung = useRef(new Set<string>());
  useEffect(() => {
    if (!state.timers.length) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [state.timers.length]);
  useEffect(() => {
    for (const tm of state.timers) {
      if (timeLeft(tm, now) <= 0 && !rung.current.has(tm.id)) {
        rung.current.add(tm.id);
        Vibration.vibrate([0, 600, 300, 600, 300, 600]);
      }
    }
  }, [now, state.timers]);
  return now;
}

/** Running timers, shown on top of the helper's screens so nothing is forgotten. */
export function TimerTray({ lang, now }: { lang: Lang; now: number }) {
  const { state, update } = useApp();
  if (!state.timers.length) return null;
  const setTimers = (fn: (ts: CookTimer[]) => CookTimer[]) => update((st) => ({ ...st, timers: fn(st.timers) }));
  return (
    <View style={{ gap: 8, marginTop: 12 }}>
      {state.timers.map((tm) => {
        const left = timeLeft(tm, now);
        const up = left <= 0;
        const paused = tm.endsAt === null;
        return (
          <View key={tm.id} style={{ backgroundColor: up ? C.accent : C.brandDeep, borderRadius: 16, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Icon name={up ? 'alarm' : 'timer-outline'} size={26} color="#fff" />
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#fff', fontFamily: F.displayX, fontSize: 26, letterSpacing: -0.5 }}>{up ? t('timesUp', lang) : fmtClock(left)}</Text>
              <Text style={{ color: '#EEF1DC', fontSize: 12 }} numberOfLines={1}>{tm.label}</Text>
              {!up && <View style={{ marginTop: 6 }}><Bar value={1 - left / tm.totalSec} color="#fff" height={4} /></View>}
            </View>
            {!up && (
              <Pressable
                accessibilityLabel={paused ? 'Resume timer' : 'Pause timer'}
                onPress={() => setTimers((ts) => ts.map((x) => x.id !== tm.id ? x : paused
                  ? { ...x, endsAt: Date.now() + x.leftSec * 1000 }
                  : { ...x, endsAt: null, leftSec: timeLeft(x, Date.now()) }))}
                style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' }}
              >
                <Icon name={paused ? 'play' : 'pause'} size={18} color="#fff" />
              </Pressable>
            )}
            <Pressable
              accessibilityLabel="Dismiss timer"
              onPress={() => setTimers((ts) => ts.filter((x) => x.id !== tm.id))}
              style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: up ? '#fff' : 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' }}
            >
              <Icon name={up ? 'checkmark' : 'close'} size={20} color={up ? C.accent : '#fff'} />
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

/** Keeps the screen on while cooking (kitchen tablets dim fast). Ignored where not allowed. */
function useScreenAwake() {
  useEffect(() => {
    const tag = 'cooking';
    activateKeepAwakeAsync(tag).catch(() => {});
    return () => { deactivateKeepAwake(tag).catch(() => {}); };
  }, []);
}

/** Full-screen, one-step-at-a-time cooking view with progress and timers. Two panes on tablets. */
/** `recipeId` is the planned dish's key (recipe@day), so a dish on the menu twice keeps separate progress. */
export default function CookingMode({ recipeId, lang, onClose }: { recipeId: string; lang: Lang; onClose: () => void }) {
  const { state, update } = useApp();
  const now = useTimerTick();
  useScreenAwake();
  const { isTablet, landscape, width, short } = useLayout();
  // Side by side whenever there is width to spare: tablets in landscape, and phones held sideways.
  const twoPane = (isTablet && (landscape || width >= 900)) || (landscape && width >= 640);
  const r = recipeById(recipeId.split('@')[0]);
  const { steps, name, stepsTranslated } = recipeText(r, lang, state);
  const prog = state.cooking[recipeId] ?? { step: -1, done: [] };
  const i = prog.step; // -1 = ingredients check
  const setProg = (p: { step: number; done: number[] }) => update((st) => ({ ...st, cooking: { ...st.cooking, [recipeId]: p } }));
  const mins = i >= 0 ? stepMinutes(r.steps[i]) : null;
  const timerForStep = state.timers.find((x) => x.recipeId === recipeId && x.step === i);
  const big = isTablet ? 1.35 : 1;

  const startTimer = (min: number) =>
    update((st) => ({
      ...st,
      timers: [...st.timers, {
        id: newId(), recipeId, step: i, label: `${name} · ${t('stepOf', lang, { n: i + 1, m: steps.length })}`,
        totalSec: min * 60, endsAt: Date.now() + min * 60 * 1000, leftSec: min * 60,
      }],
    }));

  const next = () => {
    const done = i >= 0 && !prog.done.includes(i) ? [...prog.done, i] : prog.done;
    setProg({ step: i + 1, done });
  };
  const finish = () => {
    update((st) => {
      // Kitchen tab: remember when it was cooked (a first-time dish, cooked on its day) before ticking it off.
      const was = st.plan && !st.plan.cooked.includes(recipeId) ? recordCooked(st, recipeId, newId) : st;
      return {
        ...was,
        cooking: { ...was.cooking, [recipeId]: { step: steps.length - 1, done: steps.map((_, k) => k) } },
        timers: was.timers.filter((x) => x.recipeId !== recipeId),
        plan: was.plan && { ...was.plan, cooked: was.plan.cooked.includes(recipeId) ? was.plan.cooked : [...was.plan.cooked, recipeId] },
      };
    });
    onClose();
  };
  const last = i === steps.length - 1;

  const header = (
    <Row style={{ paddingHorizontal: twoPane ? 28 : 16, paddingTop: 8, flexWrap: 'nowrap', gap: 12 }}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 11, fontWeight: '700', color: C.brand, letterSpacing: 1.2 }}>{r.emoji}  {r.minutes} {t('minutes', lang).toUpperCase()}</Text>
        <Text style={{ fontFamily: F.displayX, fontSize: 22 * (isTablet ? 1.2 : 1), lineHeight: 28 * (isTablet ? 1.2 : 1) }} numberOfLines={2}>{name}</Text>
        {lang !== 'en' && !stepsTranslated && <Text style={{ color: C.amber, fontSize: 12, fontWeight: '600', marginTop: 4, lineHeight: 17 }}>{t('stepsEnglish', lang)}</Text>}
      </View>
      <IconButton icon="close" label={t('close', lang)} onPress={onClose} />
    </Row>
  );

  // Step tracker: one segment per step, filled when ticked off
  const tracker = (
    <View style={{ flexDirection: 'row', gap: 4, paddingHorizontal: twoPane ? 28 : 16, marginTop: 12 }}>
      {steps.map((_, k) => (
        <Pressable key={k} onPress={() => setProg({ ...prog, step: k })} accessibilityLabel={t('stepOf', lang, { n: k + 1, m: steps.length })}
          style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: prog.done.includes(k) ? C.brand : k === i ? C.accent : C.line }} />
      ))}
    </View>
  );

  const ingredients = (
    <View style={{ backgroundColor: C.card, borderRadius: 18, padding: 16, marginTop: 12 }}>
      {r.ingredients.map((ing, k) => (
        <Row key={ing.item} style={{ flexWrap: 'nowrap', paddingVertical: 9, borderTopWidth: k ? 1 : 0, borderColor: C.line }}>
          <Icon name="ellipse" size={8} color={C.brand} />
          <Text style={{ flex: 1, fontSize: 16 }}>{ingredientLabel(r, k, lang, state)}</Text>
          <Text style={{ color: C.muted, fontSize: 15 }}>{qtyLabel(ing.qty, lang)}</Text>
        </Row>
      ))}
    </View>
  );

  const stepList = (
    <View>
      {steps.map((st, k) => (
        <Pressable key={k} onPress={() => setProg({ ...prog, step: k })}
          style={{ flexDirection: 'row', gap: 10, paddingVertical: twoPane ? 10 : 6, paddingHorizontal: twoPane ? 10 : 0, borderRadius: 12, backgroundColor: twoPane && k === i ? C.accentSoft : 'transparent' }}>
          <Icon name={prog.done.includes(k) ? 'checkmark-circle' : k === i ? 'radio-button-on' : 'ellipse-outline'} size={20} color={prog.done.includes(k) ? C.brand : k === i ? C.accent : C.faint} />
          <Text style={{ flex: 1, color: k === i ? C.ink : C.muted, textDecorationLine: prog.done.includes(k) && k !== i ? 'line-through' : 'none' }} numberOfLines={twoPane ? 3 : 1}>{st}</Text>
        </Pressable>
      ))}
    </View>
  );

  const current = i < 0 ? (
    <View style={{ marginTop: 16 }}>
      {!twoPane && <DishPhoto recipe={r} banner height={short ? 120 : 200} />}
      <Text style={{ fontFamily: F.display, fontSize: 24 * big }}>{t('ingredientsReady', lang)}</Text>
      {!twoPane && ingredients}
    </View>
  ) : (
    <View style={{ marginTop: 16 }}>
      <Text style={{ color: C.accent, fontWeight: '800', fontSize: 13 * big, letterSpacing: 1 }}>
        {t('stepOf', lang, { n: i + 1, m: steps.length }).toUpperCase()}
      </Text>
      <Text style={{ fontSize: 24 * big, lineHeight: 34 * big, fontWeight: '600', marginTop: 8 }}>{steps[i]}</Text>
      {mins !== null && !timerForStep && (
        <View style={{ marginTop: 20, alignSelf: twoPane ? 'flex-start' : 'stretch', minWidth: twoPane ? 320 : undefined }}>
          <Button icon="timer-outline" label={t('startTimer', lang, { t: fmtLen(mins) })} kind="ghost" onPress={() => startTimer(mins)} />
        </View>
      )}
    </View>
  );

  const footer = (
    <View style={{ flexDirection: 'row', gap: 10, padding: short ? 10 : 16, borderTopWidth: 1, borderColor: C.line, backgroundColor: C.card }}>
      {i >= 0 && <View style={{ flex: 1 }}><Button kind="ghost" icon="arrow-back" label={t('back', lang)} onPress={() => setProg({ ...prog, step: i - 1 })} /></View>}
      <View style={{ flex: 2 }}>
        {last
          ? <Button icon="checkmark-done" label={t('finish', lang)} onPress={finish} />
          : <Button icon={i < 0 ? 'flame' : 'arrow-forward'} label={i < 0 ? t('startCooking', lang) : t('next', lang)} onPress={next} />}
      </View>
    </View>
  );

  return (
    <Modal animationType="slide" onRequestClose={onClose} supportedOrientations={['portrait', 'landscape']}>
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
        {twoPane ? (
          <View style={{ flex: 1, flexDirection: 'row' }}>
            <View style={{ width: '36%', maxWidth: 420, backgroundColor: '#F7EBDA', borderRightWidth: 1, borderColor: C.line }}>
              <ScrollView contentContainerStyle={{ padding: short ? 14 : 20 }}>
                <DishPhoto recipe={r} banner height={short ? 130 : 220} style={{ marginBottom: 4 }} />
                <Label style={{ marginTop: 4 }}>{t('ingredients', lang)}</Label>
                {ingredients}
                <Label>{t('steps', lang)}</Label>
                {stepList}
              </ScrollView>
            </View>
            <View style={{ flex: 1 }}>
              {header}
              {tracker}
              <ScrollView contentContainerStyle={{ paddingHorizontal: 28, paddingBottom: 24 }}>
                <TimerTray lang={lang} now={now} />
                <FamilyTipBanner recipeId={r.id} lang={lang} />
                {r.videoUrl && <View style={{ marginTop: 10, alignSelf: 'flex-start' }}><Button small kind="ghost" icon="logo-youtube" label={t('watchVideo', lang)} onPress={() => Linking.openURL(r.videoUrl!)} /></View>}
                {current}
              </ScrollView>
              {footer}
            </View>
          </View>
        ) : (
          <View style={{ width: '100%', maxWidth: 640, alignSelf: 'center', flex: 1 }}>
            {header}
            {tracker}
            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
              <TimerTray lang={lang} now={now} />
              <FamilyTipBanner recipeId={r.id} lang={lang} />
                {r.videoUrl && <View style={{ marginTop: 10, alignSelf: 'flex-start' }}><Button small kind="ghost" icon="logo-youtube" label={t('watchVideo', lang)} onPress={() => Linking.openURL(r.videoUrl!)} /></View>}
              {current}
              {prog.done.length > 0 && i >= 0 && (
                <View style={{ marginTop: 24 }}>
                  <Label>{t('steps', lang)}</Label>
                  {stepList}
                </View>
              )}
            </ScrollView>
            {footer}
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}
