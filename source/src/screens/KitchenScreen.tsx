import React, { useMemo, useState } from 'react';
import { Pressable, Share, TextInput, View } from 'react-native';
import DishPhoto from '../DishPhoto';
import { recipeById } from '../data/recipes';
import { BADGES, RANKS, tk } from '../i18n-kitchen';
import { LANGS } from '../i18n';
import { overdueLessons, placeLesson, unplacedThisWeek } from '../engine/lesson';
import {
  POINTS, THANKS_PER_DAY, awaitingConfirm, badges, cookedSet, cookedThisWeek, helperName, helperOf, isThanks, logOf, markMastered, markSeen, masteredMap,
  newCelebrations, openTips, recognitionOn, recordText, setConfidence, tipSeen, undoEvent,
} from '../engine/recognition';
import { DAY_NAMES, eligibleRecipes } from '../engine/planner';
import { newId, useApp } from '../state';
import { Lang, Lesson, Recipe } from '../types';
import { Button, C, Card, Chip, F, Grid, Icon, Label, Notice, P, Row, Screen, Text, s, useLayout } from '../ui';
import { Sheet } from './FamilyScreen';
import { BadgeRow, FeedbackNote, FeedbackSheet, RankCard, shortDate } from './KitchenTips';
import { LessonActions, LessonPlanner, LessonRow, LessonView, Stars, lessonDate } from './LessonSheet';

/**
 * Kitchen tab. Owner: thank the helper, give kind tips, confirm dishes she has mastered, plan cooking lessons,
 * and see her progress. Helper: her rank, thanks, tips, lessons and dishes, in her language.
 */
export default function KitchenScreen() {
  const { family } = useApp();
  const [view, setView] = useState<'owner' | 'helper'>('owner');
  if (family?.role === 'helper') return <HelperKitchen />;
  return view === 'helper' ? <HelperKitchen preview={() => setView('owner')} /> : <OwnerKitchen preview={() => setView('helper')} />;
}

type Feedback = { recipe?: Recipe; mode: 'thanks' | 'tip' } | null;

function OwnerKitchen({ preview }: { preview: () => void }) {
  const { state, update, family } = useApp();
  const { isTablet } = useLayout();
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [planning, setPlanning] = useState<Lesson | true | null>(null);
  const [viewing, setViewing] = useState<Lesson | null>(null);
  const [acting, setActing] = useState<Lesson | null>(null);
  const [checking, setChecking] = useState(false);
  const [settings, setSettings] = useState(false);
  const helper = helperName(state);
  const Helper = helper.charAt(0).toUpperCase() + helper.slice(1);
  const on = recognitionOn(state);
  const cooked = cookedThisWeek(state);
  const mastered = masteredMap(state);
  const waiting = awaitingConfirm(state).filter((r) => !(state.recognition?.seen ?? []).includes(`notyet:${r.id}`));
  const lessons = (state.lessons ?? []).filter((l) => l.status !== 'cancelled');
  const upcoming = lessons.filter((l) => l.status === 'planned').sort((a, b) => a.date.localeCompare(b.date));
  const past = lessons.filter((l) => l.status === 'done').sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);
  const overdue = overdueLessons(state);
  const unplaced = unplacedThisWeek(state);
  const thanks = logOf(state).filter((e) => e.kind === 'thanks' || e.kind === 'tip').reverse().slice(0, 6);
  const by = family?.myName;
  const master = (id: string, via: 'cooked' | 'lesson' | 'check') => update((st) => markMastered(st, id, via, by, newId));

  return (
    <Screen eyebrow="Kitchen" title={`${Helper}'s kitchen`} subtitle="Thank her, share how your family likes a dish, confirm what she has mastered, and plan cooking lessons.">
      <Row style={{ marginTop: 6 }}>
        <Button small kind="ghost" icon="phone-portrait-outline" label={`See what ${helper} sees`} onPress={preview} />
        <Button small kind="quiet" icon="settings-outline" label="Recognition settings" onPress={() => setSettings(true)} />
      </Row>

      {!on && (
        <Card style={{ backgroundColor: C.brandSoft, shadowOpacity: 0 }}>
          <Text style={{ fontFamily: F.display, fontSize: 17 }}>Turn on ranks and badges?</Text>
          <P style={{ marginTop: 4, color: C.muted }}>Helpers are seldom thanked. With this on, {Helper} earns kitchen points for dishes she masters, new dishes she tries and your thank-yous, and moves up kitchen ranks. Points only go up. Thanks and tips work either way.</P>
          <View style={{ marginTop: 10, alignSelf: 'flex-start' }}><Button small icon="ribbon-outline" label="Set it up" onPress={() => setSettings(true)} /></View>
        </Card>
      )}

      {overdue.map((l) => (
        <Card key={`o-${l.id}`} style={{ backgroundColor: C.amberSoft, shadowOpacity: 0 }}>
          <Text style={{ fontWeight: '700' }}>Did the lesson on {lessonDate(l.date)} happen?</Text>
          <Row style={{ marginTop: 10 }}>
            <Button small icon="checkmark-done" label="Yes, finish it" onPress={() => setViewing(l)} />
            <Button small kind="ghost" label="Move or cancel" onPress={() => setActing(l)} />
          </Row>
        </Card>
      ))}
      {unplaced.map((l) => (
        <Card key={`u-${l.id}`} style={{ backgroundColor: C.brandSoft, shadowOpacity: 0 }}>
          <Text style={{ fontWeight: '700' }}>Put {lessonDate(l.date)}'s lesson on this week's menu?</Text>
          <Text style={{ color: C.muted, fontSize: 13, marginTop: 2 }}>{l.dishes.map((d) => recipeById(d.recipeId).name).join(', ')} · {l.menuMode === 'dinner' ? "as that day's dinner" : 'on top of that day’s dishes'}</Text>
          <Row style={{ marginTop: 10 }}>
            <Button small icon="calendar" label="Add to the menu" onPress={() => update((st) => placeLesson(st, l.id, newId))} />
            <Button small kind="ghost" label="Keep it separate" onPress={() => update((st) => ({ ...st, lessons: (st.lessons ?? []).map((x) => (x.id === l.id ? { ...x, menuMode: 'separate' as const } : x)) }))} />
          </Row>
        </Card>
      ))}
      {waiting.map((r) => (
        <Card key={`w-${r.id}`} style={{ backgroundColor: '#FFF6DC', shadowOpacity: 0 }}>
          <Row style={{ flexWrap: 'nowrap', gap: 10 }}>
            <DishPhoto recipe={r} size={44} />
            <Text style={{ flex: 1, fontWeight: '600', lineHeight: 20 }}>{Helper} feels confident cooking {r.name} ({state.confidence?.[r.id]}★). Agree she has mastered it?</Text>
          </Row>
          <Row style={{ marginTop: 10 }}>
            <Button small icon="ribbon" label="Yes, she has" onPress={() => master(r.id, 'cooked')} />
            <Button small kind="ghost" label="Not yet" onPress={() => update((st) => markSeen(st, [`notyet:${r.id}`]))} />
          </Row>
          <Text style={{ color: C.faint, fontSize: 11, marginTop: 6 }}>“Not yet” isn't shown to {helper}.</Text>
        </Card>
      ))}

      <Grid cols={isTablet ? 2 : 1}>
        <View>
          <Label style={{ marginTop: 22 }}>This week's cooking</Label>
          {cooked.length === 0 ? (
            <Card><P style={{ color: C.muted }}>Dishes show here once {helper} marks them cooked on the Helper tab.</P></Card>
          ) : cooked.map(({ dish, recipe: r, at }) => {
            const m = mastered.get(r.id);
            const conf = state.confidence?.[r.id];
            return (
              <Card key={`${dish.recipeId}@${dish.day}`} style={{ padding: 12, marginTop: 8 }}>
                <Row style={{ flexWrap: 'nowrap', gap: 12 }}>
                  <DishPhoto recipe={r} size={52} />
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={{ fontFamily: F.display, fontSize: 15 }}>{r.name}</Text>
                    <Text style={{ color: C.muted, fontSize: 12 }}>{DAY_NAMES[dish.day]}{at ? ` · cooked ${shortDate(at)}` : ''}{dish.lesson ? ' · lesson' : ''}</Text>
                    <Row style={{ gap: 4 }}>
                      {m ? <Chip tone="good" icon="ribbon" label="Mastered" /> : conf && conf >= 4 ? <Chip tone="brand" icon="star" label={`Confident ${conf}★`} /> : null}
                      {(state.dishTweaks?.[r.id] ?? []).length > 0 && <Chip tone="warn" icon="bulb-outline" label="Has a tip" />}
                    </Row>
                  </View>
                </Row>
                <Row style={{ marginTop: 10 }}>
                  <Button small icon="heart" label="Say thanks" onPress={() => setFeedback({ recipe: r, mode: 'thanks' })} />
                  <Button small kind="ghost" icon="bulb-outline" label="Tip for next time" onPress={() => setFeedback({ recipe: r, mode: 'tip' })} />
                  {!m && <Button small kind="ghost" icon="ribbon-outline" label="She's mastered it" onPress={() => master(r.id, 'cooked')} />}
                </Row>
              </Card>
            );
          })}
          <View style={{ marginTop: 10, alignSelf: 'flex-start' }}><Button small kind="quiet" icon="heart-outline" label={`Thank ${helper} for the week`} onPress={() => setFeedback({ mode: 'thanks' })} /></View>

          <Label style={{ marginTop: 22 }}>Already cooks well?</Label>
          <Card>
            <P>Many helpers already cook well from a recipe. Tick the dishes {helper} already cooks the way your family likes, so they count as mastered without a lesson.</P>
            <View style={{ marginTop: 10, alignSelf: 'flex-start' }}><Button small kind="ghost" icon="checkbox-outline" label={`Tick dishes ${helper} cooks well`} onPress={() => setChecking(true)} /></View>
          </Card>
        </View>

        <View>
          <Label style={{ marginTop: 22 }}>Cooking lessons</Label>
          {upcoming.map((l) => (
            <LessonRow key={l.id} lesson={l} lang="en" onOpen={() => setViewing(l)}
              actions={<Row style={{ marginTop: 10 }}><Button small kind="ghost" icon="create-outline" label="Change dishes" onPress={() => setPlanning(l)} /><Button small kind="ghost" icon="calendar-outline" label="Move or cancel" onPress={() => setActing(l)} /></Row>} />
          ))}
          <Card style={{ backgroundColor: C.brand }}>
            <Text style={{ fontFamily: F.display, fontSize: 17, color: '#fff' }}>Teach {helper} 3 dishes in 2 hours</Text>
            <Text style={{ color: '#E4E8CF', marginTop: 4, lineHeight: 20 }}>A soup, a steamed or braised dish and a stir-fry that fit your family's food rules, with a 2-hour plan and the groceries. You, a relative or a cook you know can teach.</Text>
            <View style={{ marginTop: 12, alignSelf: 'flex-start' }}><Button small kind="ghost" icon="school-outline" label="Plan a lesson" onPress={() => setPlanning(true)} /></View>
          </Card>
          {past.map((l) => <LessonRow key={l.id} lesson={l} lang="en" onOpen={() => setViewing(l)} />)}

          <Label style={{ marginTop: 22 }}>{Helper}'s progress</Label>
          <Card>
            {on && !state.recognition?.hidePoints ? <RankCard lang="en" />
              : on ? <P style={{ color: C.muted }}>{Helper} has chosen to keep her points private.</P>
                : <P style={{ color: C.muted }}>Ranks and badges are off.</P>}
            <Label>Mastered dishes ({mastered.size})</Label>
            {mastered.size ? (
              <Row>{[...mastered.entries()].map(([id, e]) => (
                <Chip key={id} tone="good" icon="ribbon" label={`${recipeById(id).name}${e.via === 'check' ? ' (already cooked well)' : ''}`} />
              ))}</Row>
            ) : <Text style={{ color: C.muted }}>None yet.</Text>}
            {on && !state.recognition?.hidePoints && (
              <>
                <Label>Badges</Label>
                <BadgeRow keys={badges(state)} lang="en" />
                {!badges(state).length && <Text style={{ color: C.muted }}>None yet.</Text>}
              </>
            )}
          </Card>
          {thanks.length > 0 && (
            <Card>
              <Text style={{ fontFamily: F.display, fontSize: 16 }}>Thanks and tips you sent</Text>
              {thanks.map((e) => <FeedbackNote key={e.id} e={e} lang="en" onRemove={() => update((st) => undoEvent(st, e.id))} />)}
              <Text style={{ color: C.faint, fontSize: 11, marginTop: 6 }}>Removing one takes it off {helper}'s screen{on ? ' and takes back its points' : ''}.</Text>
            </Card>
          )}
        </View>
      </Grid>

      {feedback && <FeedbackSheet recipe={feedback.recipe} mode={feedback.mode} onClose={() => setFeedback(null)} />}
      {planning && <LessonPlanner editing={planning === true ? undefined : planning} onClose={() => setPlanning(null)} />}
      {viewing && <LessonView lesson={viewing} onClose={() => setViewing(null)} />}
      {acting && <LessonActions lesson={acting} onClose={() => setActing(null)} />}
      {checking && <SkillsCheck onClose={() => setChecking(false)} />}
      {settings && <RecognitionSettings onClose={() => setSettings(false)} />}
    </Screen>
  );
}

/** "Already cooks well": the owner ticks dishes she already cooks to the family's taste; they count as mastered. */
function SkillsCheck({ onClose }: { onClose: () => void }) {
  const { state, update, family } = useApp();
  const [q, setQ] = useState('');
  const mastered = masteredMap(state);
  const [picked, setPicked] = useState<string[]>([]);
  const helper = helperName(state);
  const list = useMemo(() => [...eligibleRecipes(state).ok].sort((a, b) => a.name.localeCompare(b.name)), [state]);
  const term = q.trim().toLowerCase();
  const shown = term ? list.filter((r) => r.name.toLowerCase().includes(term)) : list;
  const save = () => {
    update((st) => picked.reduce((acc, id) => markMastered(acc, id, 'check', family?.myName, newId), st));
    onClose();
  };
  return (
    <Sheet title={`Dishes ${helper} already cooks well`} onClose={onClose}>
      <Text style={{ color: C.muted, marginTop: 6, lineHeight: 20 }}>Tick only dishes she has cooked for you, the way your family likes them. You can add more any time, and undo any of them.</Text>
      <TextInput value={q} onChangeText={setQ} placeholder="Search dishes" placeholderTextColor={C.faint} style={[s.input, { marginTop: 12 }]} accessibilityLabel="Search dishes" />
      {shown.map((r) => {
        const done = mastered.has(r.id);
        const on = picked.includes(r.id);
        return (
          <Pressable key={r.id} disabled={done} onPress={() => setPicked(on ? picked.filter((x) => x !== r.id) : [...picked, r.id])} accessibilityRole="checkbox" accessibilityState={{ checked: done || on }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, borderTopWidth: 1, borderColor: C.line, opacity: done ? 0.6 : 1 }}>
            <Icon name={done || on ? 'checkbox' : 'square-outline'} size={22} color={done || on ? C.brand : C.faint} />
            <DishPhoto recipe={r} size={40} />
            <Text style={{ flex: 1, fontWeight: '600' }}>{r.name}</Text>
            {done && <Chip tone="good" icon="ribbon" label="Mastered" />}
          </Pressable>
        );
      })}
      <View style={{ marginTop: 16, gap: 8 }}>
        <Button icon="ribbon" label={picked.length ? `Confirm ${picked.length} dish${picked.length > 1 ? 'es' : ''} as mastered` : 'Tick some dishes'} disabled={!picked.length} onPress={save} />
        <Text style={{ color: C.muted, fontSize: 12 }}>Each counts as mastered ({POINTS.mastered} points), so an experienced helper starts at the rank her cooking deserves.</Text>
      </View>
    </Sheet>
  );
}

/** Owner: turn ranks and badges on or off, the helper's name, and the ground rules. */
function RecognitionSettings({ onClose }: { onClose: () => void }) {
  const { state, update } = useApp();
  const rec = state.recognition ?? { on: false, helper: '' };
  const [name, setName] = useState(rec.helper);
  const [fresh, setFresh] = useState(false);
  const old = rec.helper.trim();
  const renamed = name.trim() && old && name.trim() !== old;
  const save = (on: boolean) => {
    update((st) => ({ ...st, recognition: { ...(st.recognition ?? { helper: '' }), on, helper: name.trim(), ...(renamed ? { seen: [], hidePoints: false } : {}) }, ...(renamed ? { confidence: {}, dishTweaks: {} } : {}) }));
    onClose();
  };
  return (
    <Sheet title="Recognition" onClose={onClose}>
      <Label>Your helper's name</Label>
      <TextInput value={name} onChangeText={(v) => { setName(v); setFresh(false); }} placeholder="e.g. Aini" placeholderTextColor={C.faint} style={s.input} maxLength={30} accessibilityLabel="Helper's name" />
      {renamed && (
        <Notice tone="warn" icon="person-add-outline">
          A new name starts fresh for a new helper: Home Cook, no badges, no tips. {old}'s record is kept but hidden, and comes back if you change the name back. Ask {old} if she'd like to keep her record first (her Kitchen tab has “{tk('saveRecord', 'en')}”).
        </Notice>
      )}
      <Label>Ground rules</Label>
      <Card style={{ marginTop: 0, gap: 6 }}>
        {[
          'It is a thank-you, not a performance review. Points only go up: nothing takes them away.',
          'No leaderboards and no comparing helpers. Only your family sees it.',
          'Not tied to pay, bonuses or her contract. Please never use it that way.',
          'She can hide her points. Your thank-you notes still reach her.',
          'When she moves on, she can keep a copy of her record.',
        ].map((x) => <Row key={x} style={{ flexWrap: 'nowrap', alignItems: 'flex-start', gap: 8 }}><Icon name="checkmark-circle" size={16} color={C.brand} /><Text style={{ flex: 1, lineHeight: 20 }}>{x}</Text></Row>)}
      </Card>
      <Label>How she earns points</Label>
      <Card style={{ marginTop: 0, gap: 4 }}>
        <Text>Dish mastered (you confirm it): {POINTS.mastered}</Text>
        <Text>Cooking lesson finished: {POINTS.lesson}</Text>
        <Text>A new dish cooked for the first time: {POINTS.newDish}</Text>
        <Text>A dish cooked on its planned day: {POINTS.onTime}</Text>
        <Text>A whole week's menu cooked: {POINTS.fullWeek}</Text>
        <Text>A thank-you from the family: {POINTS.thanks} (up to {THANKS_PER_DAY} a day)</Text>
      </Card>
      <Label>Ranks</Label>
      <Card style={{ marginTop: 0, gap: 4 }}>
        {RANKS.map((r) => <Text key={r.from}><Text style={{ fontWeight: '700' }}>{r.name.en}</Text> · from {r.from} · {r.meaning}</Text>)}
      </Card>
      <Label>Badges</Label>
      <Card style={{ marginTop: 0, gap: 4 }}>
        {Object.values(BADGES).map((b) => <Text key={b.name.en}>{b.icon} <Text style={{ fontWeight: '700' }}>{b.name.en}</Text> · {b.how}</Text>)}
      </Card>
      <View style={{ marginTop: 18, gap: 8 }}>
        <Button icon="ribbon" label={rec.on ? 'Save' : 'Turn on ranks and badges'} disabled={!name.trim()} onPress={() => save(true)} />
        {rec.on && <Button kind="ghost" label="Turn off (everything is kept)" onPress={() => save(false)} />}
        {!name.trim() && <Text style={{ color: C.muted, fontSize: 12 }}>Add her name first.</Text>}
      </View>
    </Sheet>
  );
}

/** What the helper sees: her rank, thanks, tips, lessons and dishes, in her language. */
function HelperKitchen({ preview }: { preview?: () => void }) {
  const { state, update } = useApp();
  const lang = state.settings.helperLang;
  const { isTablet } = useLayout();
  const [viewing, setViewing] = useState<Lesson | null>(null);
  const on = recognitionOn(state);
  const hidden = !!state.recognition?.hidePoints;
  const celebrate = on && !hidden ? newCelebrations(state) : [];
  const tips = openTips(state);
  const notes = logOf(state).filter(isThanks).reverse().slice(0, 8);
  const lessons = (state.lessons ?? []).filter((l) => l.status === 'planned').sort((a, b) => a.date.localeCompare(b.date));
  const mastered = masteredMap(state);
  const cooked = [...cookedSet(state)].map(recipeById).sort((a, b) => Number(mastered.has(b.id)) - Number(mastered.has(a.id)) || a.name.localeCompare(b.name));
  const [rating, setRating] = useState<string | null>(null);
  const nm = (r: Recipe) => (lang === 'en' ? r.name : r.i18n?.[lang]?.name ?? r.name);
  const share = async () => { try { await Share.share({ message: recordText(state, lang) }); } catch { /* sharing not available */ } };

  return (
    <Screen eyebrow={preview ? `${helperOf(state)}'s phone` : undefined} title={tk('myKitchen', lang)}>
      {preview && <View style={{ marginTop: 6, alignSelf: 'flex-start' }}><Button small kind="ghost" icon="arrow-back" label="Back to your view" onPress={preview} /></View>}
      {preview && (
        <Row style={{ marginTop: 10 }}>
          {LANGS.map((l) => <Chip key={l.key} label={l.label} selected={lang === l.key} onPress={() => update((st) => ({ ...st, settings: { ...st.settings, helperLang: l.key } }))} />)}
        </Row>
      )}
      {celebrate.map((c) => (
        <Card key={c.key} style={{ backgroundColor: '#FFF6DC', shadowOpacity: 0 }}>
          <Text style={{ fontSize: 30 }}>{c.badge ? BADGES[c.badge].icon : '🎉'}</Text>
          <Text style={{ fontFamily: F.display, fontSize: 18, marginTop: 4 }}>
            {c.badge ? tk('newBadge', lang, { badge: BADGES[c.badge].name[lang] }) : tk('nowRank', lang, { rank: RANKS[c.rank!].name[lang] })}
          </Text>
          <View style={{ marginTop: 10, alignSelf: 'flex-start' }}><Button small icon="heart" label={tk('thankYou', lang)} onPress={() => update((st) => markSeen(st, [c.key]))} /></View>
        </Card>
      ))}

      <Grid cols={isTablet ? 2 : 1}>
        <View>
          {on && (
            <Card style={{ backgroundColor: C.brand }}>
              {hidden ? <Text style={{ color: '#fff' }}>{tk('hidden', lang)}</Text> : <RankCard lang={lang} dark />}
              <Pressable onPress={() => update((st) => ({ ...st, recognition: { ...st.recognition!, hidePoints: !hidden } }))} accessibilityRole="button" hitSlop={6} style={{ marginTop: 10, alignSelf: 'flex-start' }}>
                <Text style={{ color: '#FFE3A8', fontWeight: '700', fontSize: 13 }}>{hidden ? tk('show', lang) : tk('hide', lang)}</Text>
              </Pressable>
            </Card>
          )}
          {lessons.map((l) => <LessonRow key={l.id} lesson={l} lang={lang} onOpen={() => setViewing(l)} />)}
          {tips.length > 0 && (
            <Card>
              <Text style={{ fontFamily: F.display, fontSize: 17 }}>{tk('tipsHead', lang)}</Text>
              {tips.map((e) => <FeedbackNote key={e.id} e={e} lang={lang} onGotIt={() => update((st) => tipSeen(st, e.id))} />)}
            </Card>
          )}
          <Card>
            <Text style={{ fontFamily: F.display, fontSize: 17 }}>{tk('thanksHead', lang)}</Text>
            {notes.length ? notes.map((e) => <FeedbackNote key={e.id} e={e} lang={lang} />) : <Text style={{ color: C.muted, marginTop: 6 }}>{tk('noThanks', lang)}</Text>}
          </Card>
        </View>
        <View>
          {on && !hidden && (
            <Card>
              <Text style={{ fontFamily: F.display, fontSize: 17, marginBottom: 8 }}>{tk('badges', lang)}</Text>
              {badges(state).length ? <BadgeRow keys={badges(state)} lang={lang} /> : <Text style={{ color: C.muted }}>{tk('noBadges', lang)}</Text>}
            </Card>
          )}
          <Card>
            <Text style={{ fontFamily: F.display, fontSize: 17 }}>{tk('myDishes', lang)}</Text>
            {!cooked.length && <Text style={{ color: C.muted, marginTop: 6 }}>{tk('noDishes', lang)}</Text>}
            {cooked.map((r) => {
              const conf = state.confidence?.[r.id];
              return (
                <View key={r.id} style={{ paddingVertical: 10, borderTopWidth: 1, borderColor: C.line }}>
                  <Pressable onPress={() => setRating(rating === r.id ? null : r.id)} accessibilityRole="button">
                    <Row style={{ flexWrap: 'nowrap', gap: 10 }}>
                      <DishPhoto recipe={r} size={40} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: '700' }}>{nm(r)}</Text>
                        {lang !== 'en' && nm(r) !== r.name && <Text style={{ color: C.muted, fontSize: 12 }}>{r.name}</Text>}
                      </View>
                      {mastered.has(r.id) ? <Chip tone="good" icon="ribbon" label={tk('mastered', lang)} />
                        : conf && conf >= 4 ? <Chip tone="brand" icon="star" label={tk('confident', lang)} />
                          : conf ? <Chip tone="plain" label={tk('practise', lang)} />
                            : <Chip tone="plain" icon="star-outline" label={tk('rateDishes', lang)} />}
                    </Row>
                  </Pressable>
                  {rating === r.id && (
                    <View style={{ marginLeft: 50 }}>
                      <Text style={{ color: C.muted, fontSize: 13, marginTop: 6 }}>{tk('howSure', lang)}</Text>
                      <Stars value={conf} lang={lang} onChange={(n) => update((st) => setConfidence(st, r.id, n))} />
                    </View>
                  )}
                </View>
              );
            })}
          </Card>
          <Text style={{ color: C.muted, fontSize: 12, marginTop: 14, lineHeight: 18 }}>{tk('private', lang)}</Text>
          {on && <View style={{ marginTop: 10, alignSelf: 'flex-start' }}><Button small kind="ghost" icon="share-outline" label={tk('saveRecord', lang)} onPress={share} /></View>}
        </View>
      </Grid>
      {viewing && <LessonView lesson={viewing} onClose={() => setViewing(null)} />}
    </Screen>
  );
}

