import React, { useState } from 'react';
import { View } from 'react-native';
import { CATALOGUE } from '../data/store';
import { shoppingDone } from '../engine/grocery';
import { AppState } from '../types';
import { Button, Notice, P, Text } from '../ui';
import { Sheet } from './FamilyScreen';

/** True when the menu was sent, the helper has finished the supermarket run, and this change needs items that are not already bought. */
export function needsExtraTrip(st: AppState, toBuy: string[]) {
  return st.plan?.status === 'confirmed' && toBuy.length > 0 && shoppingDone(st, st.lateItems);
}

/**
 * Before the supermarket run is done the owner changes the menu freely. After it, a change that needs extra
 * ingredients first asks the owner to confirm another trip. `ask(toBuy, go)` runs `go` straight away when no
 * confirmation is needed; `sheet` is the confirmation to render.
 */
export function useTripGate(state: AppState) {
  const [pending, setPending] = useState<{ toBuy: string[]; go: () => void } | null>(null);
  const ask = (toBuy: string[], go: () => void) => {
    if (needsExtraTrip(state, toBuy)) setPending({ toBuy: [...new Set(toBuy)], go });
    else go();
  };
  const sheet = pending ? (
    <Sheet title="Another trip to the supermarket" onClose={() => setPending(null)}>
      <Notice tone="warn" icon="cart">
        Your helper has already done the supermarket run. This change needs more ingredients, so they will have to go again.
      </Notice>
      <Text style={{ fontWeight: '700', marginTop: 12 }}>Extra items to pick up</Text>
      {pending.toBuy.map((k) => <P key={k} style={{ marginTop: 4 }}>• {CATALOGUE[k]?.name ?? k}</P>)}
      <View style={{ gap: 8, marginTop: 16 }}>
        <Button label="Yes, change it and add them to the next run" icon="checkmark" onPress={() => { const g = pending.go; setPending(null); g(); }} />
        <Button kind="ghost" label="No change" icon="close-circle-outline" onPress={() => setPending(null)} />
      </View>
    </Sheet>
  ) : null;
  return { ask, sheet };
}
