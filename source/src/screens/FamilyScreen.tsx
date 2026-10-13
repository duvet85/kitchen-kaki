import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, TextInput, View } from 'react-native';
import { CONDITION_LABEL } from '../engine/health';
import { newId, useApp } from '../state';
import { KakiSays, partOfDay } from '../Kaki';
import { Allergen, Condition, Member, Religion, TasteProfile } from '../types';
import {
  Avatar, Bar, Button, C, Card, Chip, F, Grid, H2, Icon, IconButton, Label, P, Row, Screen, Text, chillies, s, useLayout,
} from '../ui';

const ALLERGENS: Allergen[] = ['peanut', 'shellfish', 'fish', 'egg', 'dairy', 'gluten', 'soy', 'treenut'];
const CONDITIONS: Condition[] = ['diabetes', 'hypertension', 'cholesterol', 'gout'];
const RELIGIONS: { key: Religion; label: string }[] = [
  { key: 'none', label: 'None' }, { key: 'halal', label: 'Halal' },
  { key: 'no-pork', label: 'No pork' }, { key: 'no-beef', label: 'No beef' },
];
const AGE_LABEL = { child: 'Child', adult: 'Adult', senior: 'Senior' };
export const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);

const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

export default function FamilyScreen() {
  const { state, update, family } = useApp();
  const [editing, setEditing] = useState<Member | null>(null);
  const [quizFor, setQuizFor] = useState<Member | null>(null);
  const done = state.members.filter((m) => m.taste).length;
  const { cols } = useLayout();

  const save = (m: Member) =>
    update((st) => ({
      ...st,
      members: st.members.some((x) => x.id === m.id) ? st.members.map((x) => (x.id === m.id ? m : x)) : [...st.members, m],
    }));

  return (
    <Screen eyebrow="Steps 1 & 2" title="Your family" subtitle="Add everyone who eats at home, then ask each person to take the taste quiz.">
      <KakiSays>
        {`Hey ${family?.myName || 'kaki'}! 👋 Good ${partOfDay()}. `}
        {state.plan ? "I'm your kitchen buddy. Tap \"Ask Kaki\" any time plans change and I'll sort out the menu." : "I'm Kitchen Kaki, your kitchen buddy. Tell me who's eating, and I'll plan the week's menu for you."}
      </KakiSays>
      <Card style={{ backgroundColor: C.brand }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Text style={{ color: '#fff', fontFamily: F.display, fontSize: 17 }}>Taste quizzes</Text>
          <Text style={{ color: '#fff', fontFamily: F.display, fontSize: 17 }}>{done}/{state.members.length}</Text>
        </Row>
        <View style={{ marginTop: 10 }}>
          <Bar value={state.members.length ? done / state.members.length : 0} color="#fff" />
        </View>
        <Text style={{ color: '#D9E4F7', marginTop: 8, fontSize: 13 }}>
          {done === state.members.length ? 'Everyone has taken the quiz.' : 'Menus get better as more people take the quiz.'}
        </Text>
      </Card>

      <Grid cols={Math.min(3, cols(300))}>
      {state.members.map((m, i) => (
        <Card key={m.id}>
          <Row style={{ flexWrap: 'nowrap', gap: 12, alignItems: 'flex-start' }}>
            <Avatar name={m.name} index={i} />
            <View style={{ flex: 1, gap: 6 }}>
              <Row style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
                <View style={{ flex: 1 }}>
                  <H2 style={{ marginBottom: 0 }}>{m.name}</H2>
                  <Text style={{ color: C.muted, fontSize: 13 }}>
                    {AGE_LABEL[m.ageGroup]}{m.taste ? ` · ${chillies(m.taste.spice)}` : ''}
                  </Text>
                </View>
                <IconButton icon="create-outline" label={`Edit ${m.name}`} onPress={() => setEditing(m)} />
              </Row>
              {(m.vegetarian || m.religion !== 'none' || m.allergies.length > 0 || m.conditions.length > 0) && (
                <Row>
                  {m.vegetarian && <Chip tone="good" icon="leaf" label="Vegetarian" />}
                  {m.religion !== 'none' && <Chip tone="brand" label={RELIGIONS.find((r) => r.key === m.religion)!.label} />}
                  {m.allergies.map((a) => <Chip key={a} tone="bad" icon="alert-circle" label={`${cap(a)} allergy`} />)}
                  {m.conditions.map((c) => <Chip key={c} tone="warn" icon="medkit" label={CONDITION_LABEL[c]} />)}
                </Row>
              )}
              {m.taste ? (
                <Text style={{ color: C.muted, fontSize: 13, lineHeight: 19 }}>
                  {m.taste.cuisines.length ? `Enjoys ${m.taste.cuisines.map(cap).join(', ')} · ` : ''}
                  Loves {m.taste.proteins.map(cap).join(', ') || 'anything'}
                </Text>
              ) : null}
              <View style={{ marginTop: 4, alignSelf: 'flex-start' }}>
                <Button small kind={m.taste ? 'ghost' : 'primary'} icon={m.taste ? 'refresh' : 'sparkles'} label={m.taste ? 'Retake quiz' : 'Take taste quiz'} onPress={() => setQuizFor(m)} />
              </View>
            </View>
          </Row>
        </Card>
      ))}
      </Grid>

      <View style={{ marginTop: 16, alignSelf: 'flex-start', minWidth: 280 }}>
        <Button
          kind="ghost"
          icon="person-add-outline"
          label="Add family member"
          onPress={() => setEditing({ id: newId(), name: '', ageGroup: 'adult', vegetarian: false, religion: 'none', allergies: [], conditions: [] })}
        />
      </View>

      {editing && (
        <MemberForm
          member={editing}
          isNew={!state.members.some((x) => x.id === editing.id)}
          onClose={() => setEditing(null)}
          onSave={(m) => { save(m); setEditing(null); }}
          onRemove={() => { update((st) => ({ ...st, members: st.members.filter((x) => x.id !== editing.id) })); setEditing(null); }}
        />
      )}
      {quizFor && (
        <TasteQuiz member={quizFor} onClose={() => setQuizFor(null)} onDone={(taste) => { save({ ...quizFor, taste }); setQuizFor(null); }} />
      )}
    </Screen>
  );
}

export function Sheet({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <Modal animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(20,33,28,0.45)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: C.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%', width: '100%', maxWidth: 520, alignSelf: 'center' }}>
          <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: C.line, marginTop: 10 }} />
          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 36 }}>
            <Row style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
              <Text style={[s.h1, { fontSize: 24, flex: 1 }]}>{title}</Text>
              <IconButton icon="close" label="Close" onPress={onClose} />
            </Row>
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function MemberForm({
  member, isNew, onSave, onClose, onRemove,
}: { member: Member; isNew: boolean; onSave: (m: Member) => void; onClose: () => void; onRemove: () => void }) {
  const [m, setM] = useState(member);
  return (
    <Sheet title={isNew ? 'New family member' : `Edit ${member.name}`} onClose={onClose}>
      <Label>Name</Label>
      <TextInput style={s.input} value={m.name} onChangeText={(name) => setM({ ...m, name })} placeholder="e.g. Mum, Ethan, Ah Gong" placeholderTextColor={C.faint} />
      <Label>Age group</Label>
      <Row>
        {(['child', 'adult', 'senior'] as const).map((a) => (
          <Chip key={a} label={AGE_LABEL[a]} selected={m.ageGroup === a} onPress={() => setM({ ...m, ageGroup: a })} />
        ))}
      </Row>
      <Label>Diet</Label>
      <Row>
        <Chip label="Vegetarian" selected={m.vegetarian} onPress={() => setM({ ...m, vegetarian: !m.vegetarian })} />
      </Row>
      <Label>Religious food rules</Label>
      <Row>
        {RELIGIONS.map((r) => <Chip key={r.key} label={r.label} selected={m.religion === r.key} onPress={() => setM({ ...m, religion: r.key })} />)}
      </Row>
      <Label>Food allergies</Label>
      <Row>
        {ALLERGENS.map((a) => <Chip key={a} label={a === 'treenut' ? 'Tree nut' : cap(a)} selected={m.allergies.includes(a)} onPress={() => setM({ ...m, allergies: toggle(m.allergies, a) })} />)}
      </Row>
      <Label>Health conditions</Label>
      <Row>
        {CONDITIONS.map((c) => <Chip key={c} label={CONDITION_LABEL[c]} selected={m.conditions.includes(c)} onPress={() => setM({ ...m, conditions: toggle(m.conditions, c) })} />)}
      </Row>
      <View style={{ marginTop: 24, gap: 10 }}>
        <Button label="Save" icon="checkmark" disabled={!m.name.trim()} onPress={() => onSave({ ...m, name: m.name.trim() })} />
        {!isNew && <Button kind="danger" icon="trash-outline" label="Remove from family" onPress={onRemove} />}
      </View>
    </Sheet>
  );
}

type Option = { v: string | number; label: string; hint?: string };
const QUESTIONS: { key: keyof TasteProfile; q: string; hint?: string; multi: boolean; options: Option[] }[] = [
  { key: 'spice', q: 'How spicy can you go?', multi: false, options: [
    { v: 0, label: 'No chilli please' }, { v: 1, label: '🌶️  A little' }, { v: 2, label: '🌶️🌶️  Medium' }, { v: 3, label: '🌶️🌶️🌶️  Bring it on' },
  ] },
  { key: 'cuisines', q: 'Which kinds of dishes do you enjoy?', hint: 'Pick as many as you like. Nothing is assumed: only what you choose counts.', multi: true, options: [
    { v: 'chinese', label: '🥢  Chinese dishes' }, { v: 'malay', label: '🍛  Malay dishes' }, { v: 'indian', label: '🫓  Indian dishes' },
    { v: 'peranakan', label: '🌺  Peranakan dishes' }, { v: 'western', label: '🍝  Western dishes' }, { v: 'japanese', label: '🍱  Japanese dishes' },
    { v: 'korean', label: '🇰🇷  Korean dishes' }, { v: 'thai', label: '🌿  Thai dishes' },
  ] },
  { key: 'proteins', q: 'What do you enjoy eating most?', multi: true, options: [
    { v: 'chicken', label: '🍗  Chicken' }, { v: 'pork', label: '🥓  Pork' }, { v: 'beef', label: '🥩  Beef' }, { v: 'fish', label: '🐟  Fish' },
    { v: 'seafood', label: '🦐  Seafood' }, { v: 'egg', label: '🍳  Egg' }, { v: 'tofu', label: '🧈  Tofu' }, { v: 'veg', label: '🥦  Vegetables' },
  ] },
  { key: 'flavours', q: 'Which flavours make you happy?', multi: true, options: [
    { v: 'savoury', label: '🧂  Savoury' }, { v: 'sweet', label: '🍯  Sweet' }, { v: 'sour', label: '🍋  Sour' },
    { v: 'spicy', label: '🔥  Spicy' }, { v: 'herby', label: '🌿  Herby and fragrant' },
  ] },
  { key: 'adventurous', q: 'How do you feel about new dishes?', multi: false, options: [
    { v: 1, label: 'I like my usual favourites' }, { v: 2, label: 'Sometimes, if it looks good' }, { v: 3, label: 'I love trying new things' },
  ] },
];

function TasteQuiz({ member, onDone, onClose }: { member: Member; onDone: (t: TasteProfile) => void; onClose: () => void }) {
  const [i, setI] = useState(0);
  const [ans, setAns] = useState<TasteProfile>(member.taste ?? { spice: 1, cuisines: [], proteins: [], flavours: [], adventurous: 2 });
  const q = QUESTIONS[i];
  const value = ans[q.key] as unknown;
  const isOn = (v: Option['v']) => (q.multi ? ((value ?? []) as unknown[]).includes(v) : value === v);
  const choose = (v: Option['v']) =>
    setAns({ ...ans, [q.key]: q.multi ? toggle((value ?? []) as Option['v'][], v) : v } as TasteProfile);
  const last = i === QUESTIONS.length - 1;

  return (
    <Sheet title={`${member.name}'s taste quiz`} onClose={onClose}>
      <View style={{ marginTop: 12 }}><Bar value={(i + 1) / QUESTIONS.length} /></View>
      <Text style={{ color: C.muted, fontSize: 12, marginTop: 6 }}>Question {i + 1} of {QUESTIONS.length}</Text>
      <Text style={{ fontFamily: F.display, fontSize: 22, marginTop: 16 }}>{q.q}</Text>
      {(q.hint || q.multi) && <P style={{ color: C.muted, marginTop: 2 }}>{q.hint ?? 'Pick as many as you like.'}</P>}
      <View style={{ gap: 8, marginTop: 14 }}>
        {q.options.map((o) => {
          const on = isOn(o.v);
          return (
            <Pressable
              key={String(o.v)}
              onPress={() => choose(o.v)}
              style={{ flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, backgroundColor: on ? C.brandSoft : C.card, borderWidth: 1.5, borderColor: on ? C.brand : C.line }}
            >
              <Text style={{ flex: 1, fontSize: 15, fontWeight: on ? '700' : '500', color: on ? C.brandDeep : C.ink }}>{o.label}</Text>
              <Icon name={on ? (q.multi ? 'checkbox' : 'radio-button-on') : q.multi ? 'square-outline' : 'radio-button-off'} size={20} color={on ? C.brand : C.faint} />
            </Pressable>
          );
        })}
      </View>
      <Row style={{ marginTop: 20, flexWrap: 'nowrap' }}>
        <View style={{ flex: 1 }}><Button kind="ghost" label="Back" disabled={i === 0} onPress={() => setI(i - 1)} /></View>
        <View style={{ flex: 2 }}><Button label={last ? 'Finish' : 'Next'} icon={last ? 'checkmark' : 'arrow-forward'} onPress={() => (last ? onDone(ans) : setI(i + 1))} /></View>
      </Row>
    </Sheet>
  );
}
