import React, { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { CATALOGUE, hasPaidPrice, paidTimes, priceOf } from '../data/store';
import { recipeById } from '../data/recipes';
import { dishCostInfo, money, roughMoney, shoppingList } from '../engine/grocery';
import { addPrices, entriesOf, removePrice } from '../engine/prices';
import { t } from '../i18n';
import { qtyLabel, shortDate } from '../i18n-units';
import { useApp } from '../state';
import { Lang } from '../types';
import { Button, C, Chip, Icon, Row, Text } from '../ui';
import { Sheet } from './FamilyScreen';
import ScanReceipt from './ScanReceipt';

/**
 * Everyone in the family (owner and cook) can record what they really paid, item by item, on top of scanning receipts.
 * Every price is kept, costs use the average of the latest few, and each dish's cost is worked out from them.
 */
export default function PricesSheet({ recipeIds, lang, onClose }: { recipeIds: string[]; lang: Lang; onClose: () => void }) {
  const { state, update, family } = useApp();
  const [open, setOpen] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [receipt, setReceipt] = useState(false);
  const names = state.shopNames ?? {};
  const nameOf = (k: string) => names[k] ?? CATALOGUE[k]?.name ?? k;
  const fresh = shoppingList(recipeIds).filter((l) => !l.pantry).map((l) => l.item);
  const onList = new Set(fresh);
  const others = Object.keys(state.prices ?? {}).filter((k) => !onList.has(k) && CATALOGUE[k]).sort((a, b) => nameOf(a).localeCompare(nameOf(b)));
  const real = fresh.filter(hasPaidPrice).length;
  const dishes = [...new Set(recipeIds)].map((id) => recipeById(id));

  const save = (item: string) => {
    const n = Number(text.replace(/[^0-9.]/g, ''));
    if (!text.trim() || !Number.isFinite(n) || n < 0) return;
    update((st) => ({ ...st, prices: addPrices(st.prices, [{ item, price: n, by: family?.myName, via: 'typed' }]) }));
    setText('');
  };

  const line = (k: string, i: number) => {
    const paid = hasPaidPrice(k);
    const list = entriesOf(state.prices?.[k]);
    const last = list[list.length - 1];
    const isOpen = open === k;
    return (
      <View key={k} style={{ paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderColor: C.line }}>
        <Pressable onPress={() => { setOpen(isOpen ? null : k); setText(''); }} accessibilityRole="button" accessibilityLabel={`${t('addPrice', lang)}: ${nameOf(k)}`}
          style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '700' }}>{nameOf(k)}</Text>
            <Text style={{ color: C.muted, fontSize: 12 }}>
              {qtyLabel(CATALOGUE[k]?.pack ?? '', lang)}
              {paid && last ? ` · ${t('avgOf', lang, { n: paidTimes(k) })} · ${t('lastPaid', lang, { p: money(last.price), d: shortDate(last.at.slice(0, 10), lang) })}${last.by ? ` (${last.by})` : ''}` : ''}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontWeight: '700', textDecorationLine: 'underline', textDecorationStyle: 'dotted' }}>{paid ? money(priceOf(k)) : roughMoney(priceOf(k))}</Text>
            <Text style={{ fontSize: 10, color: paid ? C.green : C.faint, fontWeight: '700' }}>{paid ? t('paidPrice', lang) : t('samplePrice', lang)}</Text>
          </View>
        </Pressable>
        {isOpen && (
          <View style={{ marginTop: 8, gap: 6 }}>
            <Text style={{ color: C.muted, fontSize: 13 }}>{t('whatPaid', lang)} ({qtyLabel(CATALOGUE[k]?.pack ?? '', lang)})</Text>
            <Row style={{ flexWrap: 'nowrap', gap: 6, alignItems: 'center' }}>
              <Text style={{ fontWeight: '700', fontSize: 16 }}>$</Text>
              <TextInput value={text} onChangeText={setText} autoFocus keyboardType="decimal-pad" inputMode="decimal" placeholder="0.00" maxLength={7}
                onSubmitEditing={() => save(k)} returnKeyType="done" accessibilityLabel={`Price paid for ${nameOf(k)}`}
                style={{ flex: 1, borderWidth: 1, borderColor: C.brand, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, fontSize: 16, color: C.ink, backgroundColor: '#fff' }} />
            </Row>
            <Row style={{ gap: 6 }}>
              <Chip tone="good" icon="checkmark" label={t('savePrice', lang)} onPress={() => save(k)} />
              <Chip label={t('cancel', lang)} onPress={() => setOpen(null)} />
            </Row>
            {list.length > 0 && (
              <View style={{ marginTop: 4, gap: 2 }}>
                {[...list].reverse().map((e) => (
                  <Row key={e.at + e.price} style={{ flexWrap: 'nowrap', gap: 8, alignItems: 'center' }}>
                    <Icon name={e.via === 'receipt' ? 'receipt-outline' : 'create-outline'} size={14} color={C.faint} />
                    <Text style={{ flex: 1, color: C.muted, fontSize: 12 }}>{shortDate(e.at.slice(0, 10), lang)}{e.by ? ` · ${e.by}` : ''}</Text>
                    <Text style={{ fontSize: 13, fontWeight: '700' }}>{money(e.price)}</Text>
                    <Pressable onPress={() => update((st) => ({ ...st, prices: removePrice(st.prices, k, e.at) }))} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Remove the ${money(e.price)} price`}>
                      <Icon name="close-circle-outline" size={18} color={C.faint} />
                    </Pressable>
                  </Row>
                ))}
                {list.length > 1 && <Chip icon="refresh" label={t('clearPrices', lang)} onPress={() => update((st) => ({ ...st, prices: removePrice(st.prices, k) }))} />}
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <Sheet title={t('realPrices', lang)} onClose={onClose}>
      <Text style={{ color: C.muted, marginTop: 8, lineHeight: 20 }}>{t('pricesIntro', lang)}</Text>
      <View style={{ marginTop: 12 }}><Button icon="receipt-outline" kind="ghost" label={t('scanReceipt', lang)} onPress={() => setReceipt(true)} /></View>

      <Text style={{ fontWeight: '800', fontSize: 16, marginTop: 18 }}>{t('dishCosts', lang)}</Text>
      {dishes.map((r, i) => {
        const d = dishCostInfo(r, recipeIds);
        return (
          <Row key={r.id} style={{ flexWrap: 'nowrap', gap: 10, paddingVertical: 8, borderTopWidth: i ? 1 : 0, borderColor: C.line }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '700' }}>{r.name}</Text>
              <Text style={{ color: d.paid ? C.green : C.faint, fontSize: 12 }}>{t('realOf', lang, { n: d.paid, m: d.items })}</Text>
            </View>
            <Text style={{ fontWeight: '700' }}>{d.items && d.paid === d.items ? money(d.cost) : roughMoney(d.cost)}</Text>
          </Row>
        );
      })}

      <Text style={{ fontWeight: '800', fontSize: 16, marginTop: 18 }}>{t('thisWeekItems', lang)}</Text>
      <Text style={{ color: C.muted, fontSize: 12, marginBottom: 4 }}>{t('pricesHint', lang, { n: real, m: fresh.length })}</Text>
      {fresh.map(line)}

      {others.length > 0 && <>
        <Text style={{ fontWeight: '800', fontSize: 16, marginTop: 18 }}>{t('otherPrices', lang)}</Text>
        {others.map(line)}
      </>}
      {receipt && <ScanReceipt items={fresh} lang={lang} onClose={() => setReceipt(false)} />}
    </Sheet>
  );
}
