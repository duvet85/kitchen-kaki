import React, { useRef, useState } from 'react';
import { KakiBadge } from '../Kaki';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAi } from '../ai/AiProvider';
import { understandMessage } from '../ai/gemini';
import { recipeById } from '../data/recipes';
import { CATALOGUE } from '../data/store';
import { ADAPT_LABEL, Ask, Change, NEED_LABEL, applyChanges, dayName, fromGemini, replan, understand } from '../engine/hiccup';
import { newId, useApp } from '../state';
import { understandViaFamily } from '../sync/family';
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
  | { id: string; who: 'gemini-offer'; text: string; status: 'open' | 'used' };

const scopeText = (a: Ask) => (a.scope === 'today' ? 'today' : a.scope === 'tomorrow' ? 'tomorrow' : a.scope === 'rest' ? 'the rest of the week' : null);

/** Floating button that opens the chat. */
export function AskKakiButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel="Ask Kitchen Kaki"
        style={({ pressed }) => ({
          position: 'absolute', right: 16, bottom: 16, flexDirection: 'row', alignItems: 'center', gap: 8,
          backgroundColor: pressed ? C.gold : C.saffron, paddingLeft: 12, paddingRight: 18, paddingVertical: 9, borderRadius: 30,
          shadowColor: '#2F4030', shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6,
        })}>
        <KakiBadge size={38} />
        <Text style={{ color: C.brandDeep, fontWeight: '800' }}>Ask Kaki</Text>
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

  const send = (text: string) => {
    const t = text.trim();
    if (!t || busy) return;
    setDraft('');
    push({ id: newId(), who: 'me', text: t });
    const ask = understand(t);
    if (ask) return answer(ask);
    if (canGemini) {
      push({ id: newId(), who: 'gemini-offer', text: t, status: 'open' });
    } else {
      push({ id: newId(), who: 'kaki', text: "Aiyah, sorry, I didn't catch that. Try one of the suggestions below, or say what's missing (\"no prawns\") or what's needed (\"light food\", \"quick\", \"vegetarian\")." });
    }
  };

  const askGemini = async (m: Extract<Msg, { who: 'gemini-offer' }>) => {
    setMsgs((x) => x.map((y) => (y.id === m.id ? { ...m, status: 'used' } : y)));
    setBusy(true);
    try {
      const raw = family ? await understandViaFamily(family, m.text) : await understandMessage(ai.key!, m.text);
      const ask = fromGemini(raw);
      if (ask) answer(ask);
      else push({ id: newId(), who: 'kaki', text: "Hmm, Gemini couldn't find a menu change in that either. Try one of the suggestions below." });
    } catch (e) {
      push({ id: newId(), who: 'kaki', text: `${(e as Error).message || 'Gemini is not available right now.'} Try one of the suggestions below instead.` });
    } finally {
      setBusy(false);
    }
  };

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
              <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: C.brand, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#fff', fontFamily: F.displayX, fontSize: 18 }}>K</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: F.display, fontSize: 18 }}>Kitchen Kaki</Text>
                <Text style={{ color: C.muted, fontSize: 12 }}>Your kitchen buddy for last-minute changes</Text>
              </View>
              <IconButton icon="close" label="Close" onPress={onClose} />
            </Row>

            <ScrollView ref={scroll} contentContainerStyle={{ padding: 16, gap: 10 }}>
              {msgs.map((m) => {
                if (m.who === 'me' || m.who === 'kaki') return <Bubble key={m.id} me={m.who === 'me'} text={m.text} />;
                if (m.who === 'gemini-offer') {
                  return (
                    <View key={m.id} style={{ alignSelf: 'flex-start', maxWidth: '88%', backgroundColor: C.card, borderRadius: 16, padding: 12, gap: 10 }}>
                      <Text style={{ lineHeight: 20 }}>I'm not sure what you need. I can ask Gemini to read your message. Only the message is sent to Google, so leave out names or medical details.</Text>
                      {m.status === 'open' && (
                        <Row style={{ gap: 8 }}>
                          <Button small icon="sparkles" label="Ask Gemini" onPress={() => askGemini(m)} />
                          <Button small kind="quiet" label="No thanks" onPress={() => setMsgs((x) => x.map((y) => (y.id === m.id ? { ...m, status: 'used' } : y)))} />
                        </Row>
                      )}
                    </View>
                  );
                }
                return <Proposal key={m.id} m={m} onApply={() => apply(m)} onDismiss={() => setMsgs((x) => x.map((y) => (y.id === m.id ? { ...m, status: 'dismissed' } : y)))} />;
              })}
              {busy && <ActivityIndicator color={C.brand} style={{ alignSelf: 'flex-start' }} />}
            </ScrollView>

            {state.plan && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: 8 }} style={{ flexGrow: 0 }}>
                {QUICK.map((q) => (
                  <Pressable key={q.text} onPress={() => send(q.text)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, borderWidth: 1, borderColor: C.line, backgroundColor: C.card }}>
                    <Icon name={q.icon} size={15} color={C.brand} />
                    <Text style={{ fontSize: 13, fontWeight: '600' }}>{q.text}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}
            <Row style={{ flexWrap: 'nowrap', gap: 8, padding: 12, borderTopWidth: 1, borderColor: C.line, backgroundColor: C.card }}>
              <TextInput
                value={draft} onChangeText={setDraft} onSubmitEditing={() => send(draft)} returnKeyType="send"
                placeholder="e.g. Dad has a fever, or no prawns at the shop" placeholderTextColor={C.faint} accessibilityLabel="Message to Kitchen Kaki"
                style={{ flex: 1, borderWidth: 1, borderColor: C.line, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, fontFamily: F.medium, color: C.ink, backgroundColor: C.bg }}
              />
              <Pressable onPress={() => send(draft)} accessibilityLabel="Send" style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: draft.trim() ? C.brand : C.line, alignItems: 'center', justifyContent: 'center' }}>
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
