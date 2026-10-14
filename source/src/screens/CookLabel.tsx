import React, { useState } from 'react';
import { TextInput, View } from 'react-native';
import { DEFAULT_COOK, cook, cookL, cookLangOf } from '../cook';
import { Lang } from '../types';
import { useApp } from '../state';
import { C, Card, Chip, H2, Label, Row, Text, s } from '../ui';

const PRESETS = ['Cook', 'Helper', 'Kaki'];
const HOME: { lang: Lang; label: string }[] = [
  { lang: 'tl', label: 'Philippines (Tagalog)' }, { lang: 'id', label: 'Indonesia' }, { lang: 'my', label: 'Myanmar (Burmese)' },
  { lang: 'zh', label: 'China (Chinese)' }, { lang: 'en', label: 'Other: English only' },
];

/** Settings: what the family calls the person who cooks. It shows in the tab, the notices and the messages. */
export default function CookLabel() {
  const { state, update } = useApp();
  const current = state.settings.cookLabel?.trim() || DEFAULT_COOK;
  const [custom, setCustom] = useState(PRESETS.includes(current) ? '' : current);
  const own = cookLangOf(state) ?? null;
  const pickLang = (l: Lang) => update((st) => ({ ...st, settings: { ...st.settings, cookLang: l, helperLang: l } }));
  const set = (v: string) => update((st) => ({ ...st, settings: { ...st.settings, cookLabel: v.trim() || undefined } }));
  return (
    <Card style={{ marginTop: 22 }}>
      <H2>{`About your ${cookL()}`}</H2>
      <Text style={{ color: C.muted, fontSize: 13, lineHeight: 19 }}>This word is used for the person who cooks, in the tab names, notices and invites. Pick one, or type your own. It is for your family's screens only.</Text>
      <Row style={{ marginTop: 10, gap: 6 }}>
        {PRESETS.map((p) => (
          <Chip key={p} label={p} selected={current === p} icon={current === p ? 'checkmark' : undefined} onPress={() => { setCustom(''); set(p === DEFAULT_COOK ? '' : p); }} />
        ))}
      </Row>
      <Label>Or your own word</Label>
      <View>
        <TextInput value={custom} onChangeText={(v) => { setCustom(v); set(v); }} placeholder="e.g. Auntie" placeholderTextColor={C.faint} style={s.input} maxLength={20} accessibilityLabel="Your own word for the person who cooks" />
      </View>
      <Text style={{ color: C.muted, fontSize: 12, marginTop: 8 }}>Shows as: “Sent to your {cookL()}” and the {cook()} tab.</Text>
      <Label>Where is she from?</Label>
      <Text style={{ color: C.muted, fontSize: 13, lineHeight: 19 }}>Recipes are translated into her language only, so Gemini isn't used for any other. The other languages are hidden.</Text>
      <Row style={{ marginTop: 10, gap: 6 }}>
        {HOME.map((h) => <Chip key={h.lang} label={h.label} selected={own === h.lang} icon={own === h.lang ? 'checkmark' : undefined} onPress={() => pickLang(h.lang)} />)}
      </Row>
    </Card>
  );
}
