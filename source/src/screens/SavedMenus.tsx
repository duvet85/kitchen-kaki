import { cookL } from '../cook';
import React, { useState } from 'react';
import { TextInput, View } from 'react-native';
import { recipeById } from '../data/recipes';
import { DAY_NAMES } from '../engine/planner';
import { MAX_SAVED, applySavedMenu, checkMenu, deleteMenu, nextMenuName, renameMenu, saveMenu } from '../engine/savedMenus';
import { newId, useApp } from '../state';
import { SavedMenu } from '../types';
import { Button, C, Card, Icon, Notice, Row, Text, F, Label } from '../ui';
import { Sheet } from './FamilyScreen';

const input = { backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, color: C.ink } as const;
const when = (iso: string) => new Date(iso).toLocaleDateString('en-SG', { day: 'numeric', month: 'short' });

/** Card on the Menu tab: save the whole week under a name, and bring a saved week back. */
export function SavedMenusCard() {
  const { state } = useApp();
  const [open, setOpen] = useState(false);
  const n = state.savedMenus?.length ?? 0;
  return (
    <Card>
      <Row style={{ flexWrap: 'nowrap', gap: 10 }}>
        <Icon name="bookmark-outline" size={20} color={C.brand} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: F.display, fontSize: 17 }}>Saved menus</Text>
          <Text style={{ color: C.muted, fontSize: 13 }}>{n ? `${n} saved. ` : ''}Save a whole week as “Menu A” and use it again any time.</Text>
        </View>
        <Button small label="Open" icon="chevron-forward" onPress={() => setOpen(true)} />
      </Row>
      {open && <SavedMenusSheet onClose={() => setOpen(false)} />}
    </Card>
  );
}

function SavedMenusSheet({ onClose }: { onClose: () => void }) {
  const { state, update } = useApp();
  const menus = state.savedMenus ?? [];
  const [name, setName] = useState(() => nextMenuName(menus));
  const [saved, setSaved] = useState<string | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);
  const canSave = !!state.plan && state.plan.dishes.length > 0 && name.trim().length > 0;
  const replaces = menus.some((m) => m.name.trim().toLowerCase() === name.trim().toLowerCase());

  return (
    <Sheet title="Saved menus" onClose={onClose}>
      <Label>Save this week's menu</Label>
      {state.plan
        ? <Text style={{ color: C.muted, fontSize: 13, marginBottom: 8 }}>{state.plan.dishes.length} dishes over {new Set(state.plan.dishes.map((d) => d.day)).size} days. Only the dishes and days are saved.</Text>
        : <Notice tone="warn" icon="calendar-outline">There is no menu this week yet. Make one on the Menu tab first, then save it here.</Notice>}
      <TextInput value={name} onChangeText={(v) => { setName(v); setSaved(null); }} maxLength={30} placeholder="Menu A" placeholderTextColor={C.faint} accessibilityLabel="Name for this menu" style={input} />
      {replaces && <Text style={{ color: C.amber, fontSize: 12, marginTop: 6 }}>A menu with this name is saved already. Saving replaces it.</Text>}
      <View style={{ marginTop: 10 }}>
        <Button icon="bookmark" label="Save this menu" disabled={!canSave || menus.length >= MAX_SAVED && !replaces} onPress={() => {
          update((st) => saveMenu(st, name, newId()));
          setSaved(name.trim());
          setName(nextMenuName([...menus, { id: 'x', name: name.trim(), savedAt: '', dishes: [] }]));
        }} />
      </View>
      {saved && <Notice tone="brand" icon="checkmark-circle">Saved as “{saved}”.</Notice>}

      <Label>Your saved menus</Label>
      {!menus.length && <Text style={{ color: C.muted, fontSize: 13 }}>Nothing saved yet.</Text>}
      {menus.map((m) => <MenuRow key={m.id} menu={m} open={viewing === m.id} onToggle={() => setViewing(viewing === m.id ? null : m.id)} onUsed={onClose} />)}
    </Sheet>
  );
}

function MenuRow({ menu, open, onToggle, onUsed }: { menu: SavedMenu; open: boolean; onToggle: () => void; onUsed: () => void }) {
  const { state, update } = useApp();
  const [renaming, setRenaming] = useState(false);
  const [text, setText] = useState(menu.name);
  const [confirm, setConfirm] = useState<'use' | 'delete' | null>(null);
  const check = open ? checkMenu(state, menu) : null;
  const sent = state.plan?.status === 'confirmed';
  const days = [...new Set(menu.dishes.map((d) => d.day))].sort((a, b) => a - b);

  return (
    <View style={{ borderTopWidth: 1, borderColor: C.line, paddingVertical: 10 }}>
      <Row style={{ flexWrap: 'nowrap', gap: 8 }}>
        <View style={{ flex: 1 }}>
          {renaming
            ? <TextInput value={text} onChangeText={setText} maxLength={30} autoFocus accessibilityLabel={`New name for ${menu.name}`} style={[input, { paddingVertical: 7 }]} />
            : <Text style={{ fontFamily: F.display, fontSize: 16 }}>{menu.name}</Text>}
          <Text style={{ color: C.muted, fontSize: 12 }}>{menu.dishes.length} dishes · {days.length} days · saved {when(menu.savedAt)}</Text>
        </View>
        {renaming
          ? <Button small label="Save name" onPress={() => { update((st) => renameMenu(st, menu.id, text)); setRenaming(false); }} />
          : <Button small kind="ghost" label={open ? 'Hide' : 'Look'} icon={open ? 'chevron-up' : 'chevron-down'} onPress={onToggle} />}
      </Row>
      {open && check && (
        <View style={{ marginTop: 8, gap: 4 }}>
          {days.map((d) => (
            <Text key={d} style={{ fontSize: 13 }}>
              <Text style={{ fontFamily: F.display, fontSize: 13 }}>{DAY_NAMES[d]}: </Text>
              {menu.dishes.filter((x) => x.day === d).map((x) => recipeById(x.recipeId)?.name ?? 'A dish').join(', ')}
            </Text>
          ))}
          {check.skipped.length > 0 && (
            <Notice tone="warn" icon="shield-checkmark">
              {check.skipped.length === 1 ? '1 dish would be left out' : `${check.skipped.length} dishes would be left out`} when you use this menu now: {check.skipped.map((s) => `${s.name} (${s.why})`).join('; ')}.
            </Notice>
          )}
          {!check.dishes.length
            ? <Notice tone="bad" icon="alert-circle">None of these dishes can be used now, so this menu can't be loaded.</Notice>
            : confirm === 'use'
              ? (
                <View style={{ gap: 8 }}>
                  <Notice tone="warn" icon="swap-horizontal">{sent ? `This week's menu was already sent, so this becomes next week's draft. Your ${cookL()} keeps this week's menu until you send it.` : "This replaces the draft you have for this week. The shopping list is worked out again from the new menu."}</Notice>
                  <Row style={{ gap: 8 }}>
                    <Button label="Yes, use it" icon="checkmark" onPress={() => { update((st) => applySavedMenu(st, menu)); onUsed(); }} />
                    <Button kind="ghost" label="No change" onPress={() => setConfirm(null)} />
                  </Row>
                </View>
              )
              : <Row style={{ gap: 8, marginTop: 4 }}>
                  <Button small icon="download-outline" label="Use this menu" onPress={() => setConfirm('use')} />
                  <Button small kind="ghost" icon="create-outline" label="Rename" onPress={() => { setText(menu.name); setRenaming(true); }} />
                  {confirm === 'delete'
                    ? <Button small kind="danger" icon="trash-outline" label="Yes, delete" onPress={() => update((st) => deleteMenu(st, menu.id))} />
                    : <Button small kind="danger" icon="trash-outline" label="Delete" onPress={() => setConfirm('delete')} />}
                </Row>}
        </View>
      )}
    </View>
  );
}
