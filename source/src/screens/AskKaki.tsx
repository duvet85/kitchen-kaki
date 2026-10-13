import React, { useRef, useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAi } from '../ai/AiProvider';
import { kakiMessage, understandMessage } from '../ai/gemini';
import { kakiContext } from '../ai/kaki';
import { KakiAction, KakiPlan, applyKaki, describeKakiAction, kakiToBuy, resolveKaki } from '../engine/kakiPlan';
import { recipeById } from '../data/recipes';
import { CATALOGUE } from '../data/store';
import { ADAPT_LABEL, Ask, Change, NEED_LABEL, TOPIC_REPLY, addSuggestions, applyChanges, dayName, fromGemini, replan, understand } from '../engine/hiccup';
import { placeDish } from '../engine/balance';
import { groceryFit } from '../engine/grocery';
import { newId, useApp } from '../state';
import { kakiViaFamily, understandViaFamily } from '../sync/family';
import { Button, C, F, Icon, IconButton, Row, Text } from '../ui';
import DishPhoto from '../DishPhoto';
import { useTripGate } from './TripConfirm';

const QUICK = [
  { icon: 'medkit-outline', text: 'Someone is unwell and needs light food' },
  { icon: 'cart-outline', text: "We ran out of chicken" },
  { icon: 'time-outline', text: 'No time to cook tonight' },
  { icon: 'leaf-outline', text: 'Make tomorrow vegetarian' },
  { icon: 'flame-outline', text: 'No chilli today please' },
] as const;

type Msg =
  | { id: string; who: 'me'; text: string }
  | { id: string; who: 'kaki'; text: string }
  | { id: string; who: 'proposal'; changes: Change[]; status: 'open' | 'applied' | 'dismissed' }
  | { id: string; who: 'kplan'; plan: KakiPlan; status: 'open' | 'applied' | 'dismissed' }
  | { id: string; who: 'add'; ask: Ask; day: number | null; status: 'open' | 'done' | 'dismissed' };

const scopeText = (a: Ask) => (a.day != null ? dayName(a.day) : a.scope === 'today' ? 'today' : a.scope === 'tomorrow' ? 'tomorrow' : a.scope === 'rest' ? 'the rest of the week' : null);

/** Floating button that opens the chat. */
export function AskKakiButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel="Ask Kitchen Kaki"
        style={({ pressed }) => ({
          position: 'absolute', right: 16, bottom: 16, flexDirection: 'row', alignItems: 'center', gap: 8,
          backgroundColor: pressed ? C.brandDeep : C.brand, paddingHorizontal: 18, paddingVertical: 13, borderRadius: 28,
          shadowColor: '#3A2410', shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6,
        })}>
        <Icon name="chatbubble-ellipses" size={20} color="#fff" />
        <Text style={{ color: '#fff', fontWeight: '700' }}>Ask Kaki</Text>
      </Pressable>
      {open && <AskKaki onClose={() => setOpen(false)} />}
    </>
  );
}

function AskKaki({ onClose }: { onClose: () => void }) {
  const { state, update, family } = useApp();
  const gate = useTripGate(state);
  const ai = useAi();
  const canGemini = !!family || !!(ai.key && ai.model);
  const [msgs, setMsgs] = useState<Msg[]>([{
    id: 'hello', who: 'kaki',
    text: state.plan
      ? `Hey ${family?.myName || 'kaki'}! 👋 Something come up? Tell me what's changed and I'll rework this week's menu, using what's already in the kitchen where I can.`
      : `Hey ${family?.myName || 'kaki'}! 👋 Make a weekly menu on the Menu tab first, then I can help when plans change.`,
  }]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const scroll = useRef<ScrollView>(null);
  const push = (...m: Msg[]) => { setMsgs((x) => [...x, ...m]); setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50); };

  const answer = (ask: Ask) => {
    if (ask.topic) return push({ id: newId(), who: 'kaki', text: TOPIC_REPLY[ask.topic] });
    if (ask.add) {
      if (!state.plan) return push({ id: newId(), who: 'kaki', text: 'Make and confirm a menu on the Menu tab first, then I can help add a dish.' });
      return push({ id: newId(), who: 'add', ask, day: ask.day ?? null, status: 'open' });
    }
    const parts = [
      ...ask.needs.map((n) => NEED_LABEL[n]),
      ...(ask.missing.length ? [`no ${[...new Set(ask.missing.map((k) => CATALOGUE[k].name.toLowerCase()))].join(', ')}`] : []),
    ];
    const when = scopeText(ask);
    const res = replan(state, ask);
    const got = `Can! Noted: ${parts.join('; ')}${when ? `, for ${when}` : ''}.`;
    if (res.note) return push({ id: newId(), who: 'kaki', text: `${got} ${res.note}` });
    push(
      {
        id: newId(), who: 'kaki',
        text: `${got} Here's what I'd do for ${res.days.map(dayName).join(' and ')}, ${
          res.changes.some((c) => c.toId && c.toBuy.length) ? 'using the groceries in the kitchen where I can (anything to buy is marked 🛒)' : 'all from the groceries already in the kitchen'}:`,
      },
      { id: newId(), who: 'proposal', changes: res.changes, status: 'open' },
    );
  };

  /** With Gemini available it reads every message (only the message text is sent). Without it, or if it fails, Kaki's own fixed rules read it. */
  const send = async (text: string) => {
    const t = text.trim();
    if (!t || busy) return;
    setDraft('');
    push({ id: newId(), who: 'me', text: t });
    if (canGemini && state.plan) {
      setBusy(true);
      try {
        // Gemini reads the message and the menu, writes the reply and proposes edits; the app checks them against the family's rules.
        const ctx = kakiContext(state);
        const raw = family ? await kakiViaFamily(family, t, ctx) : await kakiMessage(ai.key!, t, ctx);
        const plan = resolveKaki(state, raw);
        push({ id: newId(), who: 'kaki', text: [plan.reply, ...plan.dropped].join('\n') });
        if (plan.actions.length) push({ id: newId(), who: 'kplan', plan, status: 'open' });
        return;
      } catch (e) {
        const rules = understand(t);
        const why = (e as Error).message || 'Gemini is not available right now.';
        if (rules) {
          push({ id: newId(), who: 'kaki', text: `${why} I'll use my simple rules instead.` });
          return answer(rules);
        }
        push({ id: newId(), who: 'kaki', text: `${why} Try one of the suggestions below instead.` });
        return;
      } finally {
        setBusy(false);
      }
    }
    if (canGemini) {
      setBusy(true);
      try {
        const raw = family ? await understandViaFamily(family, t) : await understandMessage(ai.key!, t);
        const ask = fromGemini(raw);
        if (ask) return answer(ask);
        push({ id: newId(), who: 'kaki', text: "Hmm, I couldn't find a menu change in that. Try one of the suggestions below, or say what's missing (\"no prawns\"), what's needed (\"light food\", \"quick\") or a dish to add (\"add a chicken dish on Friday\")." });
        return;
      } catch (e) {
        const rules = understand(t);
        if (rules) {
          push({ id: newId(), who: 'kaki', text: `${(e as Error).message || 'Gemini is not available right now.'} I'll use my simple rules instead.` });
          return answer(rules);
        }
        push({ id: newId(), who: 'kaki', text: `${(e as Error).message || 'Gemini is not available right now.'} Try one of the suggestions below instead.` });
        return;
      } finally {
        setBusy(false);
      }
    }
    const ask = understand(t);
    if (ask) return answer(ask);
    push({ id: newId(), who: 'kaki', text: "Aiyah, sorry, I didn't catch that. Gemini is off, so I only know simple phrases. Try one of the suggestions below, or say what's missing (\"no prawns\") or what's needed (\"light food\", \"quick\", \"vegetarian\")." });
  };

  const applyPlan = (m: Extract<Msg, { who: 'kplan' }>) =>
    gate.ask(kakiToBuy(m.plan.actions), () => {
      update((st) => applyKaki(st, m.plan.actions, newId));
      setMsgs((x) => x.map((y) => (y.id === m.id ? { ...m, status: 'applied' } : y)));
      const copies = m.plan.actions.filter((a) => a.kind === 'adapt').length;
      push({ id: newId(), who: 'kaki', text: `Done, kaki! ${state.plan?.status === 'confirmed' ? "The helper's menu is updated and they'll see a note about it." : 'Your draft menu is updated.'}${copies ? ` I saved ${copies === 1 ? 'the changed dish' : `${copies} changed dishes`} in your recipe book as your own adapted ${copies === 1 ? 'copy' : 'copies'}, marked AI-adapted.` : ''}` });
    });

  const addDish = (m: Extract<Msg, { who: 'add' }>, day: number, id: string) =>
    gate.ask(groceryFit(state, recipeById(id)).toBuy, () => {
      update((st) => placeDish(st, day, id, undefined, newId));
      setMsgs((x) => x.map((y) => (y.id === m.id ? { ...m, status: 'done' } : y)));
      push({ id: newId(), who: 'kaki', text: `Done, kaki! ${recipeById(id).name} is added on ${dayName(day)}.${state.plan?.status === 'confirmed' ? " The helper will see a note about it." : ''}` });
    });

  const apply = (m: Extract<Msg, { who: 'proposal' }>) => gate.ask(m.changes.filter((c) => c.toId).flatMap((c) => c.toBuy), () => doApply(m));
  const doApply = (m: Extract<Msg, { who: 'proposal' }>) => {
    const real = m.changes.filter((c) => c.toId);
    const toBuy = new Set(real.flatMap((c) => c.toBuy));
    update((st) => applyChanges(st, m.changes, newId));
    setMsgs((x) => x.map((y) => (y.id === m.id ? { ...m, status: 'applied' } : y)));
    push({
      id: newId(), who: 'kaki',
      text: `Done, kaki! ${state.plan?.status === 'confirmed' ? "The helper's menu is updated and they'll see a note about the change." : 'Your draft menu is updated.'}`
        + (toBuy.size ? ` I added ${toBuy.size} item${toBuy.size > 1 ? 's' : ''} to the shopping run under "Other things to buy".` : ''),
    });
  };

  return (
    <Modal animationType="slide" onRequestClose={onClose} supportedOrientations={['portrait', 'landscape']}>
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={{ flex: 1, width: '100%', maxWidth: 720, alignSelf: 'center' }}>
            <Row style={{ paddingHorizontal: 16, paddingVertical: 10, flexWrap: 'nowrap', gap: 12, borderBottomWidth: 1, borderColor: C.line }}>
              <Image source={require('../../assets/logo.png')} style={{ width: 42, height: 42 }} accessibilityIgnoresInvertColors />
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: F.display, fontSize: 18 }}>Kitchen Kaki</Text>
                <Text style={{ color: C.muted, fontSize: 12 }}>Your kitchen buddy for last-minute changes</Text>
              </View>
              <IconButton icon="close" label="Close" onPress={onClose} />
            </Row>

            <ScrollView ref={scroll} contentContainerStyle={{ padding: 16, gap: 10 }}>
              {msgs.map((m) => {
                if (m.who === 'me' || m.who === 'kaki') return <Bubble key={m.id} me={m.who === 'me'} text={m.text} />;
                if (m.who === 'kplan') return <KakiCard key={m.id} m={m} onApply={() => applyPlan(m)} onDismiss={() => setMsgs((x) => x.map((y) => (y.id === m.id ? { ...m, status: 'dismissed' } : y)))} />;
                if (m.who === 'add') return <AddCard key={m.id} m={m} onDay={(d) => setMsgs((x) => x.map((y) => (y.id === m.id ? { ...m, day: d } : y)))} onPick={(d, id) => addDish(m, d, id)} onDismiss={() => setMsgs((x) => x.map((y) => (y.id === m.id ? { ...m, status: 'dismissed' } : y)))} />;
                return <Proposal key={m.id} m={m} onApply={() => apply(m)} onDismiss={() => setMsgs((x) => x.map((y) => (y.id === m.id ? { ...m, status: 'dismissed' } : y)))} />;
              })}
              {busy && <ActivityIndicator color={C.brand} style={{ alignSelf: 'flex-start' }} />}
            </ScrollView>

            {canGemini && <Text style={{ color: C.faint, fontSize: 11, paddingHorizontal: 16, paddingBottom: 6 }}>Gemini reads what you type. Only your message is sent to Google, so leave out names and medical details. Kaki never changes the menu until you confirm.</Text>}
            {state.plan && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: 8 }} style={{ flexGrow: 0 }}>
                {QUICK.map((q) => (
                  <Pressable key={q.text} onPress={() => void send(q.text)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, borderWidth: 1, borderColor: C.line, backgroundColor: C.card }}>
                    <Icon name={q.icon} size={15} color={C.brand} />
                    <Text style={{ fontSize: 13, fontWeight: '600' }}>{q.text}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}
            <Row style={{ flexWrap: 'nowrap', gap: 8, padding: 12, borderTopWidth: 1, borderColor: C.line, backgroundColor: C.card }}>
              <TextInput
                value={draft} onChangeText={setDraft} onSubmitEditing={() => void send(draft)} returnKeyType="send"
                placeholder="e.g. Dad has a fever, or no prawns at the shop" placeholderTextColor={C.faint} accessibilityLabel="Message to Kitchen Kaki"
                style={{ flex: 1, borderWidth: 1, borderColor: C.line, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, fontFamily: F.medium, color: C.ink, backgroundColor: C.bg }}
              />
              <Pressable onPress={() => void send(draft)} accessibilityLabel="Send" style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: draft.trim() ? C.brand : C.line, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="arrow-up" size={20} color="#fff" />
              </Pressable>
            </Row>
          </View>
        </KeyboardAvoidingView>
        {gate.sheet}
      </SafeAreaView>
    </Modal>
  );
}

function Bubble({ text, me }: { text: string; me?: boolean }) {
  return (
    <View style={{ alignSelf: me ? 'flex-end' : 'flex-start', maxWidth: '85%', backgroundColor: me ? C.brand : C.card, borderRadius: 16, borderBottomRightRadius: me ? 4 : 16, borderBottomLeftRadius: me ? 16 : 4, paddingHorizontal: 14, paddingVertical: 10 }}>
      <Text style={{ color: me ? '#fff' : C.ink, lineHeight: 21 }}>{text}</Text>
    </View>
  );
}

function KakiCard({ m, onApply, onDismiss }: { m: Extract<Msg, { who: 'kplan' }>; onApply: () => void; onDismiss: () => void }) {
  const name = (k: string) => CATALOGUE[k]?.name.toLowerCase() ?? k;
  const line = (a: KakiAction) => {
    const day = dayName(a.day).toUpperCase();
    const to = a.kind === 'remove' ? null : a.recipe;
    return (
      <View key={describeKakiAction(a)} style={{ gap: 6 }}>
        <Text style={{ fontSize: 12, fontWeight: '800', color: C.accent, letterSpacing: 1 }}>{day} · {a.kind === 'add' ? 'ADD' : a.kind === 'swap' ? 'SWAP' : a.kind === 'remove' ? 'TAKE OFF' : 'COOK DIFFERENTLY'}</Text>
        <Row style={{ flexWrap: 'nowrap', gap: 10 }}>
          {to && <DishPhoto recipe={to} size={48} />}
          <View style={{ flex: 1 }}>
            {a.kind !== 'add' && <Text style={{ color: C.muted, textDecorationLine: a.kind === 'adapt' ? 'none' : 'line-through', fontSize: 13 }}>{recipeById(a.fromId).name}</Text>}
            {to && <Text style={{ fontFamily: F.display, fontSize: 16 }}>{to.name}</Text>}
            {a.kind === 'adapt' && <Text style={{ color: C.muted, fontSize: 12 }}>{a.changes.join(', ').replace(/^./, (x) => x.toUpperCase())}</Text>}
          </View>
        </Row>
        {a.kind === 'adapt' && <Text style={{ fontSize: 12, color: C.muted }}>Saved as your own adapted copy, marked AI-adapted. The original stays as it was.</Text>}
        {a.kind !== 'remove' && 'notes' in a && a.notes.map((n) => <Text key={n} style={{ fontSize: 12, color: C.amber }}>{n}</Text>)}
        {a.kind !== 'remove' && (a.toBuy.length === 0 ? <Text style={{ fontSize: 12, color: C.green, fontWeight: '700' }}>✓ Nothing extra to buy</Text>
          : <Text style={{ fontSize: 12, color: C.amber, fontWeight: '700' }}>🛒 Needs buying: {a.toBuy.map(name).join(', ')}</Text>)}
      </View>
    );
  };
  return (
    <View style={{ alignSelf: 'stretch', backgroundColor: C.card, borderRadius: 16, padding: 14, gap: 12, borderWidth: m.status === 'applied' ? 2 : 0, borderColor: C.green }}>
      {m.plan.actions.map(line)}
      {m.status === 'open' && (
        <Row style={{ gap: 8 }}>
          <Button icon="checkmark" label="Make these changes" onPress={onApply} />
          <Button kind="quiet" label="No change" onPress={onDismiss} />
        </Row>
      )}
      {m.status === 'applied' && <Text style={{ color: C.green, fontWeight: '700' }}>✓ Changed</Text>}
      {m.status === 'dismissed' && <Text style={{ color: C.muted }}>Left the menu as it was.</Text>}
    </View>
  );
}

function AddCard({ m, onDay, onPick, onDismiss }: { m: Extract<Msg, { who: 'add' }>; onDay: (d: number) => void; onPick: (day: number, id: string) => void; onDismiss: () => void }) {
  const { state } = useApp();
  const days = [...new Set(state.plan?.dishes.map((d) => d.day) ?? [])].sort((a, b) => a - b);
  const asked = m.ask.add?.words ?? [];
  const what = asked.length ? `a ${asked.join(' ')} dish` : 'a dish';
  const res = m.day != null ? addSuggestions(state, { ...m.ask, day: m.day }) : null;
  return (
    <View style={{ alignSelf: 'stretch', backgroundColor: C.card, borderRadius: 16, padding: 14, gap: 10, borderWidth: m.status === 'done' ? 2 : 0, borderColor: C.green }}>
      <Text style={{ lineHeight: 21 }}>{m.day == null ? `Can! Which day do you want ${what} on?` : `Can! Here are some choices for ${what} on ${dayName(m.day)}. Nothing is added until you tap one.`}</Text>
      {m.day == null && m.status === 'open' && <Row style={{ gap: 8 }}>{days.map((d) => <Button key={d} small kind="ghost" label={dayName(d)} onPress={() => onDay(d)} />)}</Row>}
      {res && res.picks.map(({ r, notes }) => (
        <View key={r.id} style={{ gap: 6, borderTopWidth: 1, borderColor: C.line, paddingTop: 10 }}>
          <Row style={{ flexWrap: 'nowrap', gap: 10 }}>
            <DishPhoto recipe={r} size={48} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.display, fontSize: 16 }}>{r.name}</Text>
              <Text style={{ color: C.muted, fontSize: 12 }}>{r.minutes} min</Text>
              {notes.map((n) => <Text key={n} style={{ color: C.amber, fontSize: 12 }}>{n}</Text>)}
              {(() => { const b = groceryFit(state, r).toBuy; return b.length ? <Text style={{ color: C.amber, fontSize: 12, fontWeight: '700' }}>🛒 Needs buying: {b.map((k) => CATALOGUE[k]?.name.toLowerCase() ?? k).join(', ')}</Text> : <Text style={{ color: C.green, fontSize: 12, fontWeight: '700' }}>✓ Nothing extra to buy</Text>; })()}
            </View>
          </Row>
          {m.status === 'open' && <Button small icon="add" label={`Add on ${dayName(m.day!)}`} onPress={() => onPick(m.day!, r.id)} />}
        </View>
      ))}
      {res && !res.picks.length && <Text style={{ color: C.muted }}>I couldn't find a matching dish that suits your family.</Text>}
      {res && res.leftOut.length > 0 && <Text style={{ color: C.amber, fontSize: 13, lineHeight: 19 }}>Left out for your family: {res.leftOut.map((l) => `${l.name} (${l.reasons.join('; ')})`).join(', ')}.</Text>}
      {res && !res.picks.length && !res.leftOut.length && <Text style={{ color: C.muted, fontSize: 13 }}>You can also add your own recipe in the Recipe book on the Ratings tab.</Text>}
      {m.status === 'open' && <Button small kind="quiet" label="No change" onPress={onDismiss} />}
      {m.status === 'done' && <Text style={{ color: C.green, fontWeight: '700' }}>✓ Added</Text>}
      {m.status === 'dismissed' && <Text style={{ color: C.muted }}>Left the menu as it was.</Text>}
    </View>
  );
}

function Proposal({ m, onApply, onDismiss }: { m: Extract<Msg, { who: 'proposal' }>; onApply: () => void; onDismiss: () => void }) {
  const real = m.changes.filter((c) => c.toId);
  return (
    <View style={{ alignSelf: 'stretch', backgroundColor: C.card, borderRadius: 16, padding: 14, gap: 12, borderWidth: m.status === 'applied' ? 2 : 0, borderColor: C.green }}>
      {m.changes.map((c) => {
        const from = recipeById(c.fromId);
        const to = c.toId ? recipeById(c.toId) : null;
        const name = (k: string) => CATALOGUE[k].name.toLowerCase();
        if (c.adapt) {
          return (
            <View key={`${c.day}-${c.fromId}`} style={{ gap: 6 }}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: C.accent, letterSpacing: 1 }}>{dayName(c.day).toUpperCase()}</Text>
              <Row style={{ flexWrap: 'nowrap', gap: 10 }}>
                <DishPhoto recipe={from} size={48} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: F.display, fontSize: 16 }}>Keep {from.name}, cooked lighter</Text>
                  <Text style={{ color: C.muted, fontSize: 12 }}>{c.adapt.map((a) => ADAPT_LABEL[a]).join(', ').replace(/^./, (x) => x.toUpperCase())}</Text>
                </View>
              </Row>
              <Text style={{ fontSize: 12, color: C.green }}>✓ Nothing to buy: uses what's already for this dish</Text>
            </View>
          );
        }
        return (
          <View key={`${c.day}-${c.fromId}`} style={{ gap: 6 }}>
            <Text style={{ fontSize: 12, fontWeight: '800', color: C.accent, letterSpacing: 1 }}>{dayName(c.day).toUpperCase()}</Text>
            <Row style={{ flexWrap: 'nowrap', gap: 10 }}>
              {to && <DishPhoto recipe={to} size={48} />}
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.muted, textDecorationLine: 'line-through', fontSize: 13 }}>{from.name}</Text>
                <Text style={{ fontFamily: F.display, fontSize: 16 }}>{to ? to.name : 'No good swap found'}</Text>
                <Text style={{ color: C.muted, fontSize: 12 }}>{c.why ? `Because it ${c.why}` : ''}</Text>
              </View>
            </Row>
            {to && c.toBuy.length === 0 && <Text style={{ fontSize: 12, color: C.green, fontWeight: '700' }}>✓ Nothing to buy</Text>}
            {to && c.uses.length > 0 && <Text style={{ fontSize: 12, color: C.green }}>Uses {c.uses.map(name).join(', ')} from the kitchen</Text>}
            {to && (c.subs ?? []).map((x) => <Text key={x.need} style={{ fontSize: 12, color: C.muted }}>↪ {name(x.use)} instead of {name(x.need)}</Text>)}
            {to && c.toBuy.length > 0 && <Text style={{ fontSize: 12, color: C.amber, fontWeight: '700' }}>🛒 Needs buying: {c.toBuy.map(name).join(', ')} (goes on the shopping list)</Text>}
            {!to && <Text style={{ fontSize: 12, color: C.muted }}>Nothing on file fits. You could skip this dish or cook something simple.</Text>}
          </View>
        );
      })}
      {m.status === 'open' && real.length > 0 && (
        <Row style={{ gap: 8 }}>
          <Button icon="checkmark" label="Make these changes" onPress={onApply} />
          <Button kind="quiet" label="Not now" onPress={onDismiss} />
        </Row>
      )}
      {m.status === 'applied' && <Text style={{ color: C.green, fontWeight: '700' }}>✓ Changed</Text>}
      {m.status === 'dismissed' && <Text style={{ color: C.muted }}>Left the menu as it was.</Text>}
    </View>
  );
}
