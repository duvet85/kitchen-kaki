import React, { useMemo, useState } from 'react';
import { Linking, Pressable, TextInput, View } from 'react-native';
import { recipeById } from '../data/recipes';
import { CATALOGUE } from '../data/store';
import DishPhoto from '../DishPhoto';
import { PHOTOS } from '../data/photos';
import { dishCost, groceryFit, roughMoney } from '../engine/grocery';
import { DAY_NAMES, dayAfter, exclusionReasons, eligibleRecipes, familyScore, isSoup, isVegDish, missingFavourite, predictedStars, spiceRule } from '../engine/planner';
import { useApp } from '../state';
import { PlannedDish, Recipe } from '../types';
import { Button, C, Chip, F, Icon, IconButton, Label, Notice, Row, Text, chillies } from '../ui';
import { Sheet, cap } from './FamilyScreen';
import PhotoControls from './PhotoControls';
import { CategorySheet } from './Categories';
import { MEALS, mealFor } from '../data/categories';

/** Stars each person who took the quiz would likely give a dish. */
export function StarsRow({ recipe }: { recipe: Recipe }) {
  const { state } = useApp();
  const people = state.members.filter((m) => m.taste);
  if (!people.length) return null;
  return (
    <Row style={{ gap: 4 }}>
      {people.map((m) => {
        const s = predictedStars(recipe, m, state)!;
        return <Chip key={m.id} tone={s >= 4 ? 'good' : s <= 2 ? 'bad' : 'plain'} label={`${m.name} ${'★'.repeat(s)}`} />;
      })}
    </Row>
  );
}

/** Photo, ingredients and steps of one dish. */
export function DishDetail({ recipe: r, onClose }: { recipe: Recipe; onClose: () => void }) {
  const [showSteps, setShowSteps] = useState(false);
  const [cats, setCats] = useState(false);
  const { state, update } = useApp();
  const meal = mealFor(r, state);
  const mine2 = (state.collections ?? []).filter((c) => c.ids.includes(r.id));
  const mine = state.userPhotos?.[r.id];
  const mineShown = !!mine && !mine.stock;
  const photo = mineShown ? undefined : PHOTOS[r.id];
  const fav = !!state.favourites?.includes(r.id);
  return (
    <Sheet title={r.name} onClose={onClose}>
      {cats && <CategorySheet recipe={r} onClose={() => setCats(false)} />}
      {exclusionReasons(r, state.members).length > 0 && (
        <Notice tone="warn" icon="alert-circle-outline">Not planned for your family: {exclusionReasons(r, state.members).join('; ')}. It stays in the recipe book but is never put on the menu or offered as a swap.</Notice>
      )}
      <View style={{ marginTop: 12 }}>
        <DishPhoto recipe={r} banner height={210} placeholder />
        {photo && (
          <Pressable onPress={() => Linking.openURL(photo.licenseUrl ?? photo.page)} accessibilityRole="link">
            <Text style={{ color: C.faint, fontSize: 11, marginTop: 4 }}>
              Photo: {photo.by} on {photo.site} ({photo.license}{photo.licenseUrl ? `, ${photo.licenseUrl.replace('https://', '')}` : ''})
            </Text>
          </Pressable>
        )}
        {mineShown && <Text style={{ color: C.faint, fontSize: 11, marginTop: 4 }}>Photo: added by your family{mine?.by ? ` (${mine.by})` : ''}</Text>}
        {!photo && !mineShown && r.imageUrl && (
          <Pressable disabled={!r.sourceUrl} onPress={() => r.sourceUrl && Linking.openURL(r.sourceUrl)} accessibilityRole="link">
            <Text style={{ color: C.faint, fontSize: 11, marginTop: 4 }}>Photo: {r.sourceName ?? 'the recipe site'}, shown from their page (not copied). Tap to open it.</Text>
          </Pressable>
        )}
        <PhotoControls recipe={r} />
      </View>
      <Text style={{ color: C.muted, fontSize: 14 }}>{cap(r.cuisine)} · {r.minutes} min · {chillies(r.spice)} · {roughMoney(dishCost(r))}</Text>
      <Row style={{ marginTop: 8 }}>
        <Chip tone={fav ? 'brand' : 'plain'} icon={fav ? 'heart' : 'heart-outline'} label={fav ? 'In your favourites' : 'Add to favourites'} selected={fav}
          onPress={() => update((st) => ({ ...st, favourites: fav ? (st.favourites ?? []).filter((x) => x !== r.id) : [...(st.favourites ?? []), r.id] }))} />
        <Chip icon="albums-outline" label="Categories" onPress={() => setCats(true)} />
        {meal && <Chip tone="brand" label={MEALS.find((m) => m.id === meal)!.title} />}
        {mine2.map((c) => <Chip key={c.id} tone="brand" label={`${c.emoji} ${c.name}`} />)}
        {r.imported && <Chip tone="brand" icon="download-outline" label={`Imported from ${r.sourceName ?? 'a website'}`} />}
        {r.aiDrafted && <Chip tone="warn" icon="sparkles" label="AI-drafted, please check" />}
        {r.aiAdapted && <Chip tone="warn" icon="sparkles" label="Adapted by Gemini, please check" />}
        {isSoup(r) && <Chip tone="brand" icon="water-outline" label="Soup" />}
        {r.vegetarian && <Chip tone="good" icon="leaf" label="Vegetarian" />}
        {r.pork && <Chip tone="warn" label="Pork" />}
        {r.beef && <Chip tone="warn" label="Beef" />}
        {r.allergens.map((a) => <Chip key={a} tone="bad" label={`Contains ${a}`} />)}
      </Row>
      <Pressable disabled={!r.sourceUrl} onPress={() => r.sourceUrl && Linking.openURL(r.sourceUrl)} accessibilityRole={r.sourceUrl ? 'link' : 'text'} accessibilityLabel={r.sourceUrl ? `Open source of ${r.name}` : undefined}
        style={{ marginTop: 8, flexDirection: 'row', gap: 6, alignItems: 'center' }}>
        <Icon name={r.sourceUrl ? 'link' : 'document-text-outline'} size={14} color={r.sourceUrl ? C.brand : C.muted} />
        <Text style={{ flex: 1, fontSize: 13, color: r.sourceUrl ? C.brand : C.muted, textDecorationLine: r.sourceUrl ? 'underline' : 'none' }}>
          {r.sourceUrl ? `Source: ${r.sourceName ? `${r.sourceName} (open the page)` : r.sourceUrl}` : `Source: ${r.source}${r.custom ? '' : '. Written for this app from common home methods, not copied from a website.'}`}
        </Text>
      </Pressable>
      {r.videoUrl && <View style={{ marginTop: 10, alignSelf: 'flex-start' }}><Button small icon="logo-youtube" label="Watch the video" onPress={() => Linking.openURL(r.videoUrl!)} /></View>}
      <Label>How each person would likely rate it</Label>
      <StarsRow recipe={r} />
      <Label>Ingredients</Label>
      {r.ingredients.map((i) => (
        <Row key={i.item} style={{ flexWrap: 'nowrap', paddingVertical: 4, borderBottomWidth: 1, borderColor: C.line }}>
          <Text style={{ flex: 1 }}>{CATALOGUE[i.item]?.name ?? i.item}</Text>
          <Text style={{ color: C.muted }}>{i.qty}</Text>
        </Row>
      ))}
      <Pressable onPress={() => setShowSteps(!showSteps)} accessibilityRole="button" accessibilityState={{ expanded: showSteps }} accessibilityLabel={`${showSteps ? 'Hide' : 'Show'} cooking steps of ${r.name}`}
        style={{ marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: C.line, backgroundColor: C.card }}>
        <Icon name="list-outline" size={18} color={C.brand} />
        <Text style={{ flex: 1, fontWeight: '700' }}>Cooking steps ({r.steps.length})</Text>
        <Icon name={showSteps ? 'chevron-up' : 'chevron-down'} size={18} color={C.muted} />
      </Pressable>
      {showSteps && (
        <View style={{ gap: 10, marginTop: 12 }}>
          {r.steps.map((st, k) => (
            <Row key={k} style={{ flexWrap: 'nowrap', alignItems: 'flex-start', gap: 10 }}>
              <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: C.brandSoft, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: C.brandDeep, fontWeight: '800', fontSize: 12 }}>{k + 1}</Text>
              </View>
              <Text style={{ flex: 1, lineHeight: 21 }}>{st}</Text>
            </Row>
          ))}
        </View>
      )}
    </Sheet>
  );
}

/**
 * Choose a dish (or soup) for a day: the best matches first, then every dish A to Z.
 * A dish already on another day can be picked again, for families who like it every few days.
 */
export function DishPicker({ day, course, replace, onPick, onClose }: {
  day: number; course: 'dish' | 'soup'; replace?: PlannedDish; onPick: (recipeId: string) => void; onClose: () => void;
}) {
  const { state } = useApp();
  const [q, setQ] = useState('');
  const [preview, setPreview] = useState<Recipe | null>(null);
  const [onlyHave, setOnlyHave] = useState(false);
  const plan = state.plan!;
  const rule = spiceRule(state);
  const today = plan.dishes.filter((d) => d.day === day && d !== replace);
  const dayHasHot = today.some((d) => rule.isHot(recipeById(d.recipeId)));
  const missing = missingFavourite({ ...plan, dishes: today }, state, day);

  const rows = useMemo(() => eligibleRecipes(state).ok
    .filter((r) => (course === 'soup') === isSoup(r) && r.id !== replace?.recipeId)
    .map((r) => {
      const blocked = today.some((d) => d.recipeId === r.id) ? 'Already on this day'
        : dayHasHot && rule.isHot(r) ? `${DAY_NAMES[day]} already has a spicy dish` : null;
      const other = plan.dishes.filter((d) => d.recipeId === r.id && d.day !== day).map((d) => DAY_NAMES[d.day]);
      const fills = missing.filter((m) => (predictedStars(r, m, state) ?? 0) >= 4);
      const fit = plan.status === 'confirmed' ? groceryFit(state, r) : null;
      const needVeg = course === 'dish' && !today.some((d) => isVegDish(recipeById(d.recipeId)));
      const sc = (needVeg && isVegDish(r) ? 3 : 0) + familyScore(r, state) + fills.length * 3 - (state.lastWeek.includes(r.id) ? 1 : 0) - (fit ? fit.toBuy.length * 2 : 0)
        - today.filter((d) => recipeById(d.recipeId).protein === r.protein).length * 1.5;
      const chk = course === 'dish' ? dayAfter(state, day, r, replace) : null;
      return { r, blocked, other, fills, sc: sc - (chk ? chk.blocks.length * 4 + chk.soft.length * 1.5 : 0), fit, needVeg: needVeg && isVegDish(r), warn: chk ? [...chk.blocks, ...chk.soft] : [], after: chk?.afterNames ?? [] };
    }), [state, day, course, replace]);

  const term = q.trim().toLowerCase();
  const sent = plan.status === 'confirmed';
  const byTerm = term ? rows.filter((x) => x.r.name.toLowerCase().includes(term) || x.r.cuisine.includes(term)) : rows;
  const shown = onlyHave ? byTerm.filter((x) => !x.fit || x.fit.toBuy.length === 0) : byTerm;
  const best = term ? [] : [...shown].filter((x) => !x.blocked).sort((a, b) => b.sc - a.sc).slice(0, 5);
  const all = [...shown].sort((a, b) => a.r.name.localeCompare(b.r.name));
  const from = replace ? recipeById(replace.recipeId) : null;
  const leftOut = useMemo(() => eligibleRecipes(state).excluded
    .filter((e) => (course === 'soup') === isSoup(e.recipe) && (!term || e.recipe.name.toLowerCase().includes(term) || e.recipe.cuisine.includes(term))), [state, course, term]);
  const [groupBy, setGroupBy] = useState<'type' | 'cuisine'>('type');
  const [open, setOpen] = useState<string[]>([]);
  const TYPE_GROUPS: [string, string, string, (r: Recipe) => boolean][] = [
    ['chicken', 'Chicken', '🍗', (r) => r.protein === 'chicken'], ['pork', 'Pork', '🥓', (r) => r.protein === 'pork'],
    ['beef', 'Beef', '🥩', (r) => r.protein === 'beef' || (r.beef && r.protein === 'veg')], ['fish', 'Fish', '🐟', (r) => r.protein === 'fish'],
    ['seafood', 'Seafood', '🦐', (r) => r.protein === 'seafood'], ['eggtofu', 'Eggs & tofu', '🥚', (r) => r.protein === 'egg' || r.protein === 'tofu'],
    ['veg', 'Vegetables', '🥦', (r) => r.protein === 'veg' && !r.beef && !r.pork],
  ];
  const CUIS: Record<string, string> = { chinese: '🥢', malay: '🍛', indian: '🫓', peranakan: '🍲', western: '🍝', japanese: '🍱', korean: '🥘', thai: '🌶️' };
  /** Collapsible groups of the rows left after search and filters. Dishes the family added are always listed first. */
  const groupsOf = (list: typeof rows) => {
    const mine = list.filter((x) => x.r.custom);
    const out: { key: string; title: string; emoji: string; rows: typeof rows }[] = mine.length ? [{ key: 'mine', title: 'Added by you', emoji: '➕', rows: mine }] : [];
    if (groupBy === 'type' && course === 'dish') {
      const used = new Set<string>();
      for (const [key, title, emoji, test] of TYPE_GROUPS) {
        const g = list.filter((x) => test(x.r));
        g.forEach((x) => used.add(x.r.id));
        if (g.length) out.push({ key, title, emoji, rows: g });
      }
      const rest = list.filter((x) => !used.has(x.r.id));
      if (rest.length) out.push({ key: 'other', title: 'Other', emoji: '🍽️', rows: rest });
    } else {
      for (const c of [...new Set(list.map((x) => x.r.cuisine))].sort()) out.push({ key: c, title: cap(c), emoji: CUIS[c] ?? '🍽️', rows: list.filter((x) => x.r.cuisine === c) });
    }
    return out;
  };

  const row = (x: (typeof rows)[number]) => (
    <Pressable key={x.r.id} disabled={!!x.blocked} onPress={() => onPick(x.r.id)} accessibilityRole="button" accessibilityLabel={`Choose ${x.r.name}`}
      style={({ pressed }) => ({ flexDirection: 'row', gap: 12, alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderColor: C.line, opacity: x.blocked ? 0.45 : 1, backgroundColor: pressed ? C.brandSoft : 'transparent' })}>
      <DishPhoto recipe={x.r} size={56} />
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={{ fontFamily: F.display, fontSize: 15 }}>{x.r.name}</Text>
        <Text style={{ color: C.muted, fontSize: 12 }}>{cap(x.r.cuisine)} · {x.r.minutes} min · {chillies(x.r.spice)} · {roughMoney(dishCost(x.r))}</Text>
        {!x.blocked && x.after.length > 0 && <Text style={{ color: C.muted, fontSize: 12 }}>{DAY_NAMES[day]} would be: {x.after.join(' · ')}</Text>}
        {x.blocked ? <Text style={{ color: C.amber, fontSize: 12 }}>{x.blocked}</Text> : (
          <Row style={{ gap: 4 }}>
            {x.needVeg && <Chip tone="good" icon="leaf" label={`A vegetable dish for ${DAY_NAMES[day]}`} />}
            {x.fills.length > 0 && <Chip tone="good" icon="heart" label={`4★+ for ${x.fills.map((m) => m.name).join(', ')}`} />}
            {x.fit && (x.fit.toBuy.length === 0
              ? <Chip tone="good" icon="cart-outline" label={x.fit.coming.length ? 'Nothing extra to buy' : 'Uses groceries already bought'} />
              : <Chip tone="warn" icon="cart" label={`Need to buy: ${x.fit.toBuy.map((k) => CATALOGUE[k]?.name ?? k).join(', ')}${x.fit.extraTrip ? ' (another trip)' : ''}`} />)}
            {x.other.length > 0 && <Chip tone="plain" icon="repeat" label={`Also on ${x.other.join(', ')}`} />}
            {x.warn.map((w) => <Chip key={w} tone="warn" icon="alert-circle-outline" label={w} />)}
          </Row>
        )}
      </View>
      <IconButton icon="eye-outline" label={`Preview ${x.r.name}`} onPress={() => setPreview(x.r)} />
    </Pressable>
  );

  return (
    <Sheet title={replace ? `Swap ${from!.name}` : `Add a ${course} on ${DAY_NAMES[day]}`} onClose={onClose}>
      {replace && (
        <Pressable onPress={onClose} accessibilityRole="button" style={{ marginTop: 10, flexDirection: 'row', gap: 8, alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: C.line, backgroundColor: C.card }}>
          <Icon name="close-circle-outline" size={18} color={C.muted} />
          <Text style={{ fontWeight: '600' }}>No change: keep {from!.name}</Text>
        </Pressable>
      )}
      <TextInput value={q} onChangeText={setQ} placeholder={`Search ${course === 'soup' ? 'soups' : 'dishes'} or cuisines`} placeholderTextColor={C.faint}
        accessibilityLabel="Search dishes"
        style={{ marginTop: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, color: C.ink }} />
      {sent && (
        <>
          <Text style={{ color: C.muted, fontSize: 13, marginTop: 10, lineHeight: 19 }}>The menu has been sent. Each dish shows whether it needs anything beyond the groceries already on the list. Your helper is told about the change.</Text>
          <Row style={{ marginTop: 8 }}><Chip label="Only dishes that need no extra shopping" selected={onlyHave} onPress={() => setOnlyHave(!onlyHave)} /></Row>
        </>
      )}
      {missing.length > 0 && !term && <Text style={{ color: C.muted, fontSize: 13, marginTop: 8 }}>{missing.map((m) => m.name).join(', ')} {missing.length === 1 ? "doesn't" : "don't"} have a 4★ dish on {DAY_NAMES[day]} yet.</Text>}
      {best.length > 0 && <Label>Best for {DAY_NAMES[day]}</Label>}
      {best.map(row)}
      {term ? <><Label>Matches</Label>{all.map(row)}</> : (
        <>
          <Label>{`All ${course === 'soup' ? 'soups' : 'dishes'}, by`}</Label>
          <Row>
            <Chip label="Main ingredient" selected={groupBy === 'type'} onPress={() => setGroupBy('type')} />
            <Chip label="Cuisine" selected={groupBy === 'cuisine'} onPress={() => setGroupBy('cuisine')} />
          </Row>
          {groupsOf(all).map((g) => {
            const isOpen = open.includes(g.key);
            return (
              <View key={g.key} style={{ marginTop: 8 }}>
                <Pressable onPress={() => setOpen(isOpen ? open.filter((k) => k !== g.key) : [...open, g.key])} accessibilityRole="button" accessibilityState={{ expanded: isOpen }}
                  accessibilityLabel={`${g.title}, ${g.rows.length}`}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.line }}>
                  <Text style={{ fontSize: 18 }}>{g.emoji}</Text>
                  <Text style={{ flex: 1, fontFamily: F.display, fontSize: 15 }}>{g.title}</Text>
                  <Text style={{ color: C.muted, fontSize: 13 }}>{g.rows.length}</Text>
                  <Icon name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color={C.muted} />
                </Pressable>
                {isOpen && g.rows.map(row)}
              </View>
            );
          })}
        </>
      )}
      {leftOut.length > 0 && (
        <View style={{ marginTop: 14 }}>
          <Pressable onPress={() => setOpen(open.includes('left') ? open.filter((k) => k !== 'left') : [...open, 'left'])} accessibilityRole="button" accessibilityState={{ expanded: open.includes('left') }}
            accessibilityLabel={`Left out for your family, ${leftOut.length}`}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.line }}>
            <Icon name="ban-outline" size={18} color={C.muted} />
            <Text style={{ flex: 1, fontFamily: F.display, fontSize: 15 }}>Left out for your family</Text>
            <Text style={{ color: C.muted, fontSize: 13 }}>{leftOut.length}</Text>
            <Icon name={open.includes('left') ? 'chevron-up' : 'chevron-down'} size={18} color={C.muted} />
          </Pressable>
          {(open.includes('left') || !!term) && leftOut.map((e) => (
            <Pressable key={e.recipe.id} onPress={() => setPreview(e.recipe)} accessibilityRole="button" accessibilityLabel={`Preview ${e.recipe.name}`}
              style={{ paddingVertical: 10, borderTopWidth: 1, borderColor: C.line, opacity: 0.8 }}>
              <Text style={{ fontFamily: F.display, fontSize: 15 }}>{e.recipe.name}</Text>
              <Text style={{ color: C.amber, fontSize: 12 }}>{e.reasons.join('; ')}</Text>
            </Pressable>
          ))}
        </View>
      )}
      {!all.length && !leftOut.length && <Text style={{ color: C.muted, marginTop: 8 }}>Nothing matches “{q}”.</Text>}
      {preview && <DishDetail recipe={preview} onClose={() => setPreview(null)} />}
    </Sheet>
  );
}
