import React, { useState } from 'react';
import { dishName } from '../ai/text';
import { Pressable, TextInput, View } from 'react-native';
import { useAi } from '../ai/AiProvider';
import { translateRecipe } from '../ai/gemini';
import { recipeById } from '../data/recipes';
import { BADGES, BadgeKey, PRAISE, TIPS, TIP_CHIP, TIP_TEXT, isPraise, tk } from '../i18n-kitchen';
import { LANGS } from '../i18n';
import { clearTweak, feedbackText, cookName, helperOf, openTips, points, rankOf, sendFeedback } from '../engine/recognition';
import { newId, useApp } from '../state';
import { translateViaFamily } from '../sync/family';
import { KitchenEvent, Lang, Recipe, TipTag } from '../types';
import { Bar, Button, C, Card, Chip, F, Icon, Label, Notice, Row, Text, s } from '../ui';
import { BadgeMedal, RankMedal } from '../KakiMedal';
import { KakiSticker, StickerKey, isSticker, randomSticker } from '../KakiScenes';
import { Sheet } from './FamilyScreen';

export const shortDate = (iso: string) => new Date(iso).toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'short' });

/** In cooking mode: what the family asked to remember for this dish, and any new tip, in the helper's language. */
export function FamilyTipBanner({ recipeId, lang }: { recipeId: string; lang: Lang }) {
  const { state } = useApp();
  const remembered = state.dishTweaks?.[recipeId] ?? [];
  const tip = openTips(state, recipeId)[0];
  const extra = (tip?.tags ?? []).filter((x) => !isPraise(x) && !remembered.includes(x));
  if (!remembered.length && !extra.length && !tip?.note) return null;
  const note = tip ? feedbackText(tip, lang).note : undefined;
  return (
    <View style={{ marginTop: 12, backgroundColor: C.accentSoft, borderRadius: 14, padding: 12, gap: 4 }}>
      <Row style={{ flexWrap: 'nowrap', gap: 6 }}>
        <Icon name="heart" size={15} color={C.accent} />
        <Text style={{ fontWeight: '800', fontSize: 13, color: C.accent }}>{tk('tipsHead', lang)}</Text>
      </Row>
      {[...remembered, ...extra].map((x) => <Text key={x} style={{ fontSize: 15, lineHeight: 21 }}>• {TIP_TEXT[x][lang]}</Text>)}
      {note ? <Text style={{ fontSize: 14, lineHeight: 20, fontStyle: 'italic' }}>“{note}”</Text> : null}
    </View>
  );
}

/** One thank-you note or tip, as the helper reads it: always opens with thanks. */
export function FeedbackNote({ e, lang, onGotIt, onRemove }: { e: KitchenEvent; lang: Lang; onGotIt?: () => void; onRemove?: () => void }) {
  const [english, setEnglish] = useState(false);
  const r = e.recipeId ? recipeById(e.recipeId) : null;
  const shown = english ? 'en' : lang;
  const txt = feedbackText(e, shown);
  const praise = (e.tags ?? []).filter(isPraise);
  const tips = (e.tags ?? []).filter((x) => !isPraise(x));
  const isTip = tips.length > 0;
  return (
    <View style={{ paddingVertical: 12, borderTopWidth: 1, borderColor: C.line, gap: 4 }}>
      <Row style={{ flexWrap: 'nowrap', alignItems: 'flex-start', gap: 10 }}>
        <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: isTip ? C.amberSoft : C.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={isTip ? 'bulb-outline' : 'heart'} size={17} color={isTip ? C.amber : C.accent} />
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          {r ? <Text style={{ fontWeight: '700' }}>{tk('tipThanks', shown, { dish: dishName(r, shown) })}</Text>
            : !praise.length && !e.note ? <Text style={{ fontWeight: '700' }}>{tk('thankYou', shown)}</Text> : null}
          {praise.map((x) => <Text key={x} style={{ lineHeight: 20 }}>{TIP_TEXT[x][shown]}</Text>)}
          {isTip && <Text style={{ fontWeight: '700', color: C.amber, marginTop: 2 }}>{tk('tipNext', shown)}</Text>}
          {tips.map((x) => <Text key={x} style={{ lineHeight: 20 }}>• {TIP_TEXT[x][shown]}</Text>)}
          {txt.note ? <Text style={{ lineHeight: 20, fontStyle: 'italic' }}>“{txt.note}”</Text> : null}
          {isSticker(e.sticker) ? <View style={{ alignSelf: 'flex-start', marginVertical: 6 }}><KakiSticker id={e.sticker} size={92} /></View> : null}
          <Text style={{ color: C.faint, fontSize: 12 }}>{e.by ? `${tk('from', shown, { who: e.by })} · ` : ''}{shortDate(e.at)}</Text>
          <Row style={{ gap: 12, marginTop: 2 }}>
            {lang !== 'en' && (
              <Pressable onPress={() => setEnglish(!english)} hitSlop={6} accessibilityRole="button">
                <Text style={{ color: C.brand, fontSize: 12, fontWeight: '700' }}>{english ? LANGS.find((l) => l.key === lang)?.label : tk('original', lang)}</Text>
              </Pressable>
            )}
            {e.note && lang !== 'en' && !txt.noteTranslated && !english && e.id !== 'preview' ? <Text style={{ color: C.faint, fontSize: 12 }}>Note in English</Text> : null}
            {e.note && txt.noteTranslated && !english ? <Text style={{ color: C.faint, fontSize: 12 }}>Note translated by Gemini</Text> : null}
          </Row>
        </View>
        {onGotIt && isTip && !e.seen && <Button small kind="ghost" icon="checkmark" label={tk('gotIt', lang)} onPress={onGotIt} />}
        {onRemove && <Pressable onPress={onRemove} hitSlop={8} accessibilityRole="button" accessibilityLabel="Remove"><Icon name="trash-outline" size={18} color={C.faint} /></Pressable>}
      </Row>
    </View>
  );
}

const input = [s.input, { minHeight: 70, textAlignVertical: 'top' as const }];

/**
 * The owner's "Say thanks" / "Tip for next time" sheet. Praise and tips are ready-made sentences translated by hand;
 * a typed note is translated by Gemini when it is on. Tips always arrive with a thank-you, and never cost points.
 */
export function FeedbackSheet({ recipe: r, mode, onClose }: { recipe?: Recipe; mode: 'thanks' | 'tip'; onClose: () => void }) {
  const { state, update, family } = useApp();
  const { key, model } = useAi();
  const [tags, setTags] = useState<TipTag[]>(mode === 'thanks' ? ['delicious'] : ['thanks']);
  const [note, setNote] = useState('');
  const [remember, setRemember] = useState(true);
  const [sticker, setSticker] = useState<StickerKey | null>(null);
  const [busy, setBusy] = useState(false);
  const lang = state.settings.helperLang;
  const langName = LANGS.find((l) => l.key === lang)?.label ?? '';
  const helper = cookName(state);
  const gemini = !!(family || (key && model));
  const toggle = (k: TipTag) => setTags((t) => (t.includes(k) ? t.filter((x) => x !== k) : [...t, k]));
  const fixes = tags.filter((x) => !isPraise(x));
  const saved = r ? state.dishTweaks?.[r.id] ?? [] : [];
  const canSend = tags.some(isPraise) && (mode === 'thanks' || fixes.length > 0 || note.trim().length > 0);

  const send = async () => {
    setBusy(true);
    const text = note.trim();
    let noteTr: Partial<Record<Lang, string>> | undefined;
    // Only the note's own words are sent to Gemini.
    if (text && lang !== 'en' && gemini) {
      try {
        const tr = family
          ? await translateViaFamily(family, { name: 'Note', steps: [text], lang })
          : await translateRecipe(key!, { name: 'Note', steps: [text] } as Recipe, lang);
        if (tr.steps[0]) noteTr = { [lang]: tr.steps[0] };
      } catch { /* she sees the English note */ }
    }
    update((st) => sendFeedback(st, { recipeId: r?.id, tags, note: text || undefined, noteTr, by: family?.myName || 'The family', remember, sticker: sticker ?? undefined }, newId));
    setBusy(false);
    onClose();
  };

  const preview: KitchenEvent = { id: 'preview', at: new Date().toISOString(), helper, kind: fixes.length ? 'tip' : 'thanks', recipeId: r?.id, tags, note: note.trim() || undefined, by: family?.myName || 'The family', sticker: sticker ?? undefined };

  return (
    <Sheet title={mode === 'thanks' ? (r ? `Thank ${helper} for ${r.name}` : `Thank ${helper}`) : `Tip for next time: ${r?.name ?? ''}`} onClose={onClose}>
      <Text style={{ color: C.muted, marginTop: 8, lineHeight: 20 }}>
        {mode === 'thanks'
          ? `${helper} reads this in ${langName}. One tap is enough; a note is optional.`
          : `Tips always arrive with a thank-you, framed as how your family likes it. They never take away points or badges.`}
      </Text>
      <Label>{mode === 'thanks' ? 'Say' : 'Start with thanks'}</Label>
      <Row>{PRAISE.map((p) => <Chip key={p} label={TIP_CHIP[p]} selected={tags.includes(p)} onPress={() => toggle(p)} />)}</Row>
      {(mode === 'tip' || fixes.length > 0) && r && (
        <>
          <Label>Next time</Label>
          <Row>{TIPS.map((p) => <Chip key={p} label={TIP_CHIP[p]} selected={tags.includes(p)} onPress={() => toggle(p)} />)}</Row>
        </>
      )}
      <Label>A short note (optional)</Label>
      <TextInput value={note} onChangeText={setNote} maxLength={140} multiline placeholder={mode === 'thanks' ? 'e.g. Ah Ma had a second bowl!' : 'e.g. Ethan likes the chilli on the side'}
        placeholderTextColor={C.faint} accessibilityLabel="Note" style={input} />
      {note.trim() && lang !== 'en' ? (
        <Text style={{ color: C.muted, fontSize: 12, marginTop: 6 }}>
          {gemini ? `Your note is translated into ${langName} by Gemini (only the note is sent). The quick phrases above are already translated.` : `Gemini is off, so your note arrives in English. The quick phrases above are already in ${langName}.`}
        </Text>
      ) : null}
      <Label>A sticker (optional)</Label>
      {sticker ? (
        <Row style={{ gap: 14, alignItems: 'center' }}>
          <KakiSticker id={sticker} size={96} />
          <View style={{ gap: 8 }}>
            <Button small kind="ghost" icon="shuffle" label="Another one" onPress={() => setSticker(randomSticker(sticker))} />
            <Button small kind="quiet" icon="close" label="No sticker" onPress={() => setSticker(null)} />
          </View>
        </Row>
      ) : (
        <Row><Chip icon="sparkles" label="Add a surprise sticker" onPress={() => setSticker(randomSticker())} /></Row>
      )}
      {fixes.length > 0 && r && (
        <>
          <Label>Remember it</Label>
          <Row><Chip label="Show this each time she cooks this dish" selected={remember} onPress={() => setRemember(!remember)} /></Row>
        </>
      )}
      {saved.length > 0 && r && (
        <>
          <Label>Already shown each time</Label>
          <Row>{saved.map((k) => <Chip key={k} icon="close" tone="warn" label={TIP_CHIP[k]} onPress={() => update((st) => clearTweak(st, r.id, k))} />)}</Row>
          <Text style={{ color: C.muted, fontSize: 12, marginTop: 6 }}>Tap one to stop showing it.</Text>
        </>
      )}
      {canSend && (
        <>
          <Label>{helper} will see</Label>
          <Card style={{ marginTop: 0, paddingVertical: 4 }}><FeedbackNote e={preview} lang={lang} /></Card>
        </>
      )}
      {!tags.some(isPraise) && <Notice tone="brand" icon="heart-outline">Pick at least one thank-you phrase.</Notice>}
      {mode === 'tip' && tags.some(isPraise) && !fixes.length && !note.trim() && <Notice tone="brand" icon="bulb-outline">Pick a tip, or write a note.</Notice>}
      <View style={{ marginTop: 18, gap: 8 }}>
        <Button icon={mode === 'thanks' ? 'heart' : 'paper-plane'} label={busy ? 'Sending…' : mode === 'thanks' ? 'Send thanks' : 'Send tip'} disabled={busy || !canSend} onPress={send} />
        <Button kind="ghost" label="Cancel" onPress={onClose} />
      </View>
    </Sheet>
  );
}

/** Rank, points and the way to the next rank. */
export function RankCard({ lang, dark }: { lang: Lang; dark?: boolean }) {
  const { state } = useApp();
  const pts = points(state);
  const r = rankOf(pts);
  const fg = dark ? '#FFFFFF' : C.ink;
  const sub = dark ? '#E4E8CF' : C.muted;
  return (
    <View>
      <Row style={{ flexWrap: 'nowrap', gap: 12 }}>
        <RankMedal index={r.index} size={64} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: F.displayX, fontSize: 22, color: fg }}>{r.rank.name[lang]}</Text>
          {lang !== 'en' && <Text style={{ color: sub, fontSize: 12 }}>{r.rank.name.en}</Text>}
          <Text style={{ color: sub, fontSize: 13, marginTop: 2 }}>{pts} {tk('points', lang)}</Text>
        </View>
      </Row>
      <View style={{ marginTop: 12 }}><Bar value={r.progress} color={dark ? '#FFE3A8' : C.gold} height={10} /></View>
      <Text style={{ color: sub, fontSize: 12, marginTop: 6 }}>{r.next ? tk('toNext', lang, { n: r.toNext, rank: r.next.name[lang] }) : tk('topRank', lang)}</Text>
    </View>
  );
}

export function BadgeRow({ keys, lang, all }: { keys: BadgeKey[]; lang: Lang; all?: boolean }) {
  const list = all ? (Object.keys(BADGES) as BadgeKey[]) : keys;
  return (
    <Row style={{ gap: 14, alignItems: 'flex-start' }}>
      {list.map((k) => {
        const got = keys.includes(k);
        return (
          <View key={k} style={{ width: 92, alignItems: 'center', gap: 6 }}
            accessibilityLabel={`${BADGES[k].name.en}${got ? '' : ' (not yet)'}: ${BADGES[k].how}`}>
            <BadgeMedal kind={k} earned={got} size={60} />
            <Text style={{ fontWeight: '700', fontSize: 12.5, textAlign: 'center', lineHeight: 16, color: got ? C.ink : C.muted }}>{BADGES[k].name[lang]}</Text>
            {all && <Text style={{ color: C.muted, fontSize: 11, textAlign: 'center', lineHeight: 14 }}>{BADGES[k].how}</Text>}
          </View>
        );
      })}
    </Row>
  );
}
