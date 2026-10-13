import React, { useState } from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, TextInput, View } from 'react-native';
import { maskKey, useAi } from '../ai/AiProvider';
import { GeminiError } from '../ai/gemini';
import { GEMINI_MODELS } from '../ai/models';
import { useApp } from '../state';
import FamilyShare from './FamilyShare';
import PhotoCredits from './PhotoCredits';
import WebRecipes from './WebRecipes';
import TestGemini from './TestGemini';
import { Button, C, Card, Chip, Grid, H2, Icon, Label, Notice, Row, Screen, Text, s, useLayout } from '../ui';

/** Settings: family sharing through Supabase, the Gemini key when not sharing, demo data reset. */
export default function SettingsScreen() {
  const { key, model, save, remove } = useAi();
  const { reset, family } = useApp();
  const { isTablet } = useLayout();
  const [draft, setDraft] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const onSave = async () => {
    setBusy(true);
    setError(null);
    try {
      await save(draft);
      setDraft('');
      setEditing(false);
    } catch (e) {
      setError(e instanceof GeminiError ? e.message : "Couldn't save the key on this device.");
    } finally {
      setBusy(false);
    }
  };

  const form = (
    <View>
      <Label>Gemini API key</Label>
      <Row style={{ flexWrap: 'nowrap', gap: 8 }}>
        <TextInput
          style={[s.input, { flex: 1 }]}
          value={draft}
          onChangeText={setDraft}
          placeholder="Paste your key (starts with AIza)"
          placeholderTextColor={C.faint}
          secureTextEntry={!show}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="off"
          accessibilityLabel="Gemini API key"
        />
        <Pressable onPress={() => setShow(!show)} hitSlop={6} accessibilityLabel={show ? 'Hide key' : 'Show key'}
          style={{ padding: 10, borderRadius: 12, backgroundColor: C.brandSoft }}>
          <Icon name={show ? 'eye-off-outline' : 'eye-outline'} size={20} color={C.brand} />
        </Pressable>
      </Row>
      {error && <Text style={{ color: C.red, fontSize: 13, marginTop: 8 }}>{error}</Text>}
      <Row style={{ marginTop: 12, gap: 8 }}>
        {busy
          ? <Row style={{ gap: 8 }}><ActivityIndicator color={C.brand} /><Text style={{ color: C.muted }}>Checking the key with Google…</Text></Row>
          : <Button icon="checkmark" label="Check and save" onPress={onSave} disabled={draft.trim().length < 20} />}
        {key && !busy && <Button kind="quiet" label="Cancel" onPress={() => { setEditing(false); setDraft(''); setError(null); }} />}
      </Row>
    </View>
  );

  const helper = family?.role === 'helper';
  return (
    <Screen eyebrow={helper ? 'This phone' : 'Owner only'} title="Settings" subtitle={helper ? undefined : 'Share the family menu across phones, and translate recipes with Gemini.'}>
      <Grid cols={isTablet && !helper ? 2 : 1}>
        <FamilyShare />
        {family ? (helper ? null : (
          <Card>
            <Row style={{ flexWrap: 'nowrap', gap: 12 }}>
              <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: C.brandSoft, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="sparkles" size={22} color={C.brand} />
              </View>
              <View style={{ flex: 1 }}>
                <H2 style={{ marginBottom: 0 }}>Google Gemini</H2>
                <Text style={{ color: C.muted, fontSize: 13 }}>Translates recipes for your helper</Text>
              </View>
            </Row>
            <View style={{ gap: 10, marginTop: 14 }}>
              {[
                ['lock-closed-outline', 'The Gemini key is saved once in your Supabase project (Edge Functions > Secrets > GEMINI_API_KEY). No phone holds it, so your wife and helper never need it.'],
                ['medkit-outline', 'Only recipe text is sent to Google. Family names, allergies and health details are never sent.'],
                ['wallet-outline', 'The free Gemini tier is enough for a weekly menu. If it runs out, the built-in translations are used.'],
              ].map(([icon, text]) => (
                <Row key={text} style={{ flexWrap: 'nowrap', alignItems: 'flex-start', gap: 10 }}>
                  <Icon name={icon as 'lock-closed-outline'} size={18} color={C.brand} />
                  <Text style={{ flex: 1, lineHeight: 20 }}>{text}</Text>
                </Row>
              ))}
            </View>
            <TestGemini />
          </Card>
        )) : (
        <Card>
          <Row style={{ flexWrap: 'nowrap', gap: 12 }}>
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: C.brandSoft, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="sparkles" size={22} color={C.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <H2 style={{ marginBottom: 0 }}>Google Gemini</H2>
              <Text style={{ color: C.muted, fontSize: 13 }}>Translates recipes for your helper</Text>
            </View>
            <Chip tone={key ? 'good' : 'plain'} icon={key ? 'checkmark' : 'remove'} label={key ? 'Connected' : 'Not set'} />
          </Row>

          {key && !editing ? (
            <View style={{ marginTop: 14, gap: 10 }}>
              <View style={{ backgroundColor: C.bg, borderRadius: 12, padding: 12, gap: 4 }}>
                <Text style={{ fontWeight: '700', letterSpacing: 1 }}>{maskKey(key)}</Text>
                <Text style={{ color: C.muted, fontSize: 12 }}>Tries the models this key can use, best first (starting with {GEMINI_MODELS[0]} if the key has it). If one is over its limit, the next one is used.</Text>
              </View>
              <Row style={{ gap: 8 }}>
                <Button kind="ghost" icon="create-outline" label="Change key" onPress={() => setEditing(true)} />
                <Button kind="danger" icon="trash-outline" label="Remove key" onPress={remove} />
              </Row>
              <TestGemini />
            </View>
          ) : (
            <View style={{ marginTop: 6 }}>{form}</View>
          )}
        </Card>
        )}
      </Grid>
      {!family && (
        <Grid cols={isTablet ? 2 : 1}>
        <Card>
          <H2>How your key is kept</H2>
          <View style={{ gap: 10 }}>
            {[
              ['phone-portrait-outline', Platform.OS === 'web'
                ? 'Stored only in this browser. In the phone app it goes in the phone\'s secure keychain. It is never put in the app\'s code or synced anywhere.'
                : 'Stored only on this device, in the phone\'s secure keychain. It is never put in the app\'s code or synced anywhere.'],
              ['lock-closed-outline', 'Sent only to Google, when you tap Translate. Kitchen Kaki has no server that sees it.'],
              ['medkit-outline', 'Only recipe text is sent. Family names, allergies and health details never leave the phone.'],
              ['wallet-outline', 'The free Gemini tier is enough for a family\'s weekly menu. If the limit runs out, the built-in translations are used.'],
            ].map(([icon, text]) => (
              <Row key={text} style={{ flexWrap: 'nowrap', alignItems: 'flex-start', gap: 10 }}>
                <Icon name={icon as 'lock-closed-outline'} size={18} color={C.brand} />
                <Text style={{ flex: 1, lineHeight: 20 }}>{text}</Text>
              </Row>
            ))}
          </View>
          <Pressable onPress={() => Linking.openURL('https://aistudio.google.com/app/apikey')} style={{ marginTop: 14 }}>
            <Text style={{ color: C.brand, fontWeight: '700' }}>Get a free key from Google AI Studio ↗</Text>
          </Pressable>
          <Notice tone="brand" icon="information-circle-outline">Free-tier requests may be used by Google to improve its models, which is another reason only recipe text is sent.</Notice>
        </Card>
        </Grid>
      )}

      {!helper && <WebRecipes />}
      <PhotoCredits />

      {!family && (
        <View style={{ marginTop: 28, alignSelf: 'flex-start' }}>
          <Button kind="quiet" icon="refresh" label="Reset demo data" onPress={reset} />
        </View>
      )}
    </Screen>
  );
}
