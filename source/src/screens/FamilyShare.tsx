import { cook, cookL } from '../cook';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, Share, TextInput, View } from 'react-native';
import { useApp } from '../state';
import {
  FamilyConfig, FamilyError, Member, checkConnection, createFamily, decodeInvite, encodeInvite, familyInfo, joinFamily, leaveFamily, removeMember, resetInvites,
} from '../sync/family';
import { Avatar, Button, C, Card, Chip, H2, Icon, Label, Notice, Row, Text, s } from '../ui';

const roleLabel = (r: 'owner' | 'parent' | 'helper') => (r === 'helper' ? cook() : r === 'owner' ? 'Owner' : 'Parent');
const webInvite = () => (Platform.OS === 'web' && typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('join') : null);

/** Settings card: set up a family in Supabase, join one with an invite, or manage it. */
export default function FamilyShare() {
  const { family } = useApp();
  return family ? <Connected family={family} /> : <NotConnected />;
}

function Field(props: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; multiline?: boolean }) {
  return (
    <>
      <Label>{props.label}</Label>
      <TextInput
        style={[s.input, props.multiline && { minHeight: 70, textAlignVertical: 'top' }]}
        value={props.value} onChangeText={props.onChange} placeholder={props.placeholder} placeholderTextColor={C.faint}
        autoCapitalize="none" autoCorrect={false} multiline={props.multiline} accessibilityLabel={props.label}
      />
    </>
  );
}

function NotConnected() {
  const { state, setFamily } = useApp();
  const fromLink = webInvite();
  const [mode, setMode] = useState<'join' | 'create'>(fromLink ? 'join' : 'create');
  const [invite, setInvite] = useState(fromLink ? `KK1.${fromLink.replace(/^KK1\./, '')}` : '');
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [myName, setMyName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const go = async () => {
    setBusy(true);
    setError(null);
    try {
      const cfg = mode === 'create'
        ? await createFamily(url, key, familyName, myName, state)
        : await joinFamily(invite, myName);
      if (Platform.OS === 'web' && fromLink) window.history.replaceState(null, '', window.location.pathname);
      setFamily(cfg);
    } catch (e) {
      setError(e instanceof FamilyError ? e.message : `Something went wrong${e instanceof Error && e.message ? `: ${e.message}` : ''}. Tap "Check connection" to see what Supabase says.`);
    } finally {
      setBusy(false);
    }
  };
  const [checked, setChecked] = useState<string | null>(null);
  const check = async () => {
    setBusy(true); setError(null); setChecked(null);
    try { await checkConnection(url, key); setChecked('Connected to your Supabase project. Now fill in the names and tap Create family.'); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not connect.'); }
    finally { setBusy(false); }
  };
  const ok = myName.trim() && (mode === 'create' ? url.trim() && key.trim().length > 20 : decodeInvite(invite));

  return (
    <Card>
      <Row style={{ flexWrap: 'nowrap', gap: 12 }}>
        <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: C.brandSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="people" size={22} color={C.brand} />
        </View>
        <View style={{ flex: 1 }}>
          <H2 style={{ marginBottom: 0 }}>Family sharing</H2>
          <Text style={{ color: C.muted, fontSize: 13 }}>Same menu on every phone in the house</Text>
        </View>
        <Chip label="This phone only" />
      </Row>
      <View style={{ flexDirection: 'row', marginTop: 14, backgroundColor: '#F3E7D4', borderRadius: 12, padding: 3 }}>
        {(['create', 'join'] as const).map((m) => (
          <Pressable key={m} onPress={() => { setMode(m); setError(null); }} accessibilityRole="tab" accessibilityState={{ selected: mode === m }}
            style={{ flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center', backgroundColor: mode === m ? C.card : 'transparent' }}>
            <Text style={{ fontWeight: '700', color: mode === m ? C.brandDeep : C.muted }}>{m === 'create' ? 'Set up our family' : 'Join with an invite'}</Text>
          </Pressable>
        ))}
      </View>
      {mode === 'create' ? (
        <>
          <Text style={{ color: C.muted, fontSize: 13, marginTop: 10, lineHeight: 19 }}>
            Uses your own free Supabase project. Find both values in Supabase under Project Settings &gt; API Keys and Data API.
          </Text>
          <Field label="Supabase project URL" value={url} onChange={setUrl} placeholder="https://abcd1234.supabase.co" />
          <Field label="Publishable (anon) key" value={key} onChange={setKey} placeholder="sb_publishable_… or eyJ…" />
          <Field label="Family name" value={familyName} onChange={setFamilyName} placeholder="e.g. The Tans" />
        </>
      ) : (
        <Field label="Invite" value={invite} onChange={setInvite} placeholder="Paste the invite message you were sent" multiline />
      )}
      <Field label="Your name" value={myName} onChange={setMyName} placeholder={mode === 'create' ? 'e.g. Jack' : 'e.g. Mum, Maria'} />
      {mode === 'create' && <Text style={{ color: C.faint, fontSize: 12, marginTop: 8 }}>The menu and family already on this phone become the shared copy.</Text>}
      {mode === 'join' && <Text style={{ color: C.faint, fontSize: 12, marginTop: 8 }}>The family's shared menu replaces what is on this phone.</Text>}
      {error && <Text style={{ color: C.red, fontSize: 13, marginTop: 10 }}>{error}</Text>}
      {checked && <Text style={{ color: C.green, fontSize: 13, marginTop: 10, fontWeight: '600' }}>{checked}</Text>}
      {mode === 'create' && url.trim() && key.trim() ? <View style={{ marginTop: 10, alignSelf: 'flex-start' }}><Button small kind="ghost" icon="pulse-outline" label="Check connection" onPress={check} disabled={busy} /></View> : null}
      <View style={{ marginTop: 14, alignSelf: 'flex-start' }}>
        {busy
          ? <Row style={{ gap: 8 }}><ActivityIndicator color={C.brand} /><Text style={{ color: C.muted }}>Connecting…</Text></Row>
          : <Button icon={mode === 'create' ? 'cloud-upload-outline' : 'enter-outline'} label={mode === 'create' ? 'Create family' : 'Join family'} onPress={go} disabled={!ok} />}
      </View>
    </Card>
  );
}

function Connected({ family }: { family: FamilyConfig }) {
  const { setFamily, sync } = useApp();
  const [info, setInfo] = useState<{ name: string; members: Member[]; codes: { parent_code: string; helper_code: string } | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [shown, setShown] = useState<string | null>(null);
  const parent = family.role !== 'helper';

  useEffect(() => {
    familyInfo(family).then(setInfo).catch(() => setError("Couldn't load the family. Check the internet connection."));
  }, [family, tick]);

  const share = async (code: string, who: 'parent' | 'helper') => {
    const inv = encodeInvite(family, code);
    const link = Platform.OS === 'web' && typeof window !== 'undefined' ? `\n${window.location.origin}${window.location.pathname}?join=${inv.slice(4)}` : '';
    const message = `Join ${info?.name ?? 'our family'} on Kitchen Kaki${who === 'helper' ? ` (${cookL()})` : ''}. Open the app, go to Settings > Join with an invite, and paste this whole message:\n${inv}${link}`;
    setShown(message);
    try { await Share.share({ message }); } catch { /* user closed the sheet, or no share on this browser: the text is shown below */ }
  };
  const dot = { live: C.green, connecting: C.amber, offline: C.red, off: C.faint }[sync];

  return (
    <Card>
      <Row style={{ flexWrap: 'nowrap', gap: 12 }}>
        <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: C.brandSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="people" size={22} color={C.brand} />
        </View>
        <View style={{ flex: 1 }}>
          <H2 style={{ marginBottom: 0 }}>{info?.name ?? 'Family sharing'}</H2>
          <Row style={{ gap: 6 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dot }} />
            <Text style={{ color: C.muted, fontSize: 13 }}>{sync === 'live' ? 'In sync' : sync === 'connecting' ? 'Connecting…' : 'Offline, will catch up'}</Text>
          </Row>
        </View>
        <Chip tone="brand" label={`You: ${roleLabel(family.role)}`} />
      </Row>

      {error && <Notice tone="bad" icon="cloud-offline-outline">{error}</Notice>}
      <Label>In this family</Label>
      {!info && !error && <ActivityIndicator color={C.brand} style={{ alignSelf: 'flex-start' }} />}
      {info?.members.map((m, i) => (
        <Row key={m.user_id} style={{ flexWrap: 'nowrap', gap: 10, paddingVertical: 6, borderTopWidth: i ? 1 : 0, borderColor: C.line }}>
          <Avatar name={m.name || '?'} index={i} />
          <Text style={{ flex: 1, fontWeight: '600' }}>{m.name || 'No name'}</Text>
          <Text style={{ color: C.muted, fontSize: 13 }}>{roleLabel(m.role)}</Text>
          {parent && m.role !== 'owner' && m.user_id !== family.userId && (
            <Pressable onPress={() => removeMember(family, m.user_id).then(() => setTick(tick + 1)).catch((e) => setError(e.message))}
              accessibilityLabel={`Remove ${m.name}`} hitSlop={6}>
              <Icon name="close-circle-outline" size={20} color={C.faint} />
            </Pressable>
          )}
        </Row>
      ))}

      {parent && info?.codes && (
        <>
          <Label>Invite someone</Label>
          <Text style={{ color: C.muted, fontSize: 13, lineHeight: 19, marginBottom: 8 }}>
            Send the invite by WhatsApp. A parent sees everything; the {cookL()} only sees the confirmed menu, shopping list and cooking mode.
          </Text>
          <Row style={{ gap: 8 }}>
            <Button icon="person-add-outline" label="Invite a parent" onPress={() => share(info.codes!.parent_code, 'parent')} />
            <Button kind="ghost" icon="restaurant-outline" label={`Invite the ${cookL()}`} onPress={() => share(info.codes!.helper_code, 'helper')} />
          </Row>
          {shown && (
            <View style={{ marginTop: 10, backgroundColor: C.bg, borderRadius: 12, padding: 12 }}>
              <Text style={{ color: C.muted, fontSize: 12, marginBottom: 4 }}>If the share sheet didn't open, copy this:</Text>
              <Text selectable style={{ fontSize: 12, lineHeight: 17 }}>{shown}</Text>
            </View>
          )}
          <Text selectable style={{ color: C.faint, fontSize: 12, marginTop: 10 }}>
            Codes: parent {info.codes.parent_code} · {cookL()} {info.codes.helper_code}
          </Text>
          <Pressable onPress={() => resetInvites(family).then(() => setTick(tick + 1)).catch((e) => setError(e.message))} style={{ marginTop: 6 }}>
            <Text style={{ color: C.brand, fontWeight: '700', fontSize: 13 }}>Make new codes (old invites stop working)</Text>
          </Pressable>
        </>
      )}

      <View style={{ marginTop: 16, alignSelf: 'flex-start' }}>
        <Button kind="quiet" icon="log-out-outline" label="Leave family on this phone" onPress={async () => { await leaveFamily(family).catch(() => {}); setFamily(null); }} />
      </View>
    </Card>
  );
}
