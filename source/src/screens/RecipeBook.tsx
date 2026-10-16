import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, TextInput, View } from 'react-native';
import { CATALOGUE } from '../data/store';
import { RECIPES } from '../data/recipes';
import DishPhoto from '../DishPhoto';
import { useAi } from '../ai/AiProvider';
import { ALLERGENS, CUISINES, Draft, PROTEINS, catalogueLines, cleanUrl, firstUrl, instagramAccount, isInstagram, normaliseDraft, youtubeIn, youtubeUrl } from '../ai/draft';
import { GeminiError, draftRecipeText, searchRecipesGrounded } from '../ai/gemini';
import { localDate } from '../engine/recognition';
import { RecipeOption, parseOptions } from '../ai/search';
import { Imported, importedToDraft } from '../ai/importMap';
import { Browsed, FamilyError, browseViaFamily, draftViaFamily, importViaFamily, searchViaFamily } from '../sync/family';
import { newId, useApp } from '../state';
import { Allergen, Recipe, SavedLink } from '../types';
import { Button, C, Card, Chip, F, Icon, IconButton, Label, Notice, P, Row, Stepper, Text, chillies } from '../ui';
import { DishDetail } from './DishSheets';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Sheet, cap } from './FamilyScreen';
import RecipeTiles from './RecipeTiles';
import { useWebRecipes } from './WebRecipes';

const VIEW_KEY = 'kitchenkaki.recipeView';
const input = { backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, color: C.ink } as const;

/** Card on the Ratings tab that opens the recipe book. */
export function RecipeBookCard() {
  const { state } = useApp();
  const [open, setOpen] = useState(false);
  const own = state.customRecipes?.length ?? 0;
  return (
    <Card style={{ marginTop: 22 }}>
      <Row style={{ flexWrap: 'nowrap', gap: 10 }}>
        <Icon name="book-outline" size={20} color={C.brand} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: F.display, fontSize: 17 }}>Recipe book</Text>
          <Text style={{ color: C.muted, fontSize: 13 }}>{RECIPES.filter((r) => !r.sickDay).length} recipes{own ? `, ${own} added by you` : ''}. Add your own dish and Gemini drafts the recipe.</Text>
        </View>
        <Button small label="Open" icon="chevron-forward" onPress={() => setOpen(true)} />
      </Row>
      {open && <RecipeBookSheet onClose={() => setOpen(false)} />}
    </Card>
  );
}

export function RecipeBookSheet({ onClose }: { onClose: () => void }) {
  const { state, update } = useApp();
  const [q, setQ] = useState('');
  const [adding, setAdding] = useState<Recipe | 'new' | null>(null);
  const [searching, setSearching] = useState(false);
  const [browsing, setBrowsing] = useState(false);
  const [seed, setSeed] = useState<Seed | null>(null);
  const [importing, setImporting] = useState<{ url?: string; refresh?: Recipe } | null>(null);
  const [imported, setImported] = useState<{ draft: Draft; refresh?: Recipe } | null>(null);
  const [viewing, setViewing] = useState<Recipe | null>(null);
  const web = useWebRecipes();
  const [view, setView] = useState<'tiles' | 'list'>('tiles');
  useEffect(() => { AsyncStorage.getItem(VIEW_KEY).then((v) => (v === 'list' || v === 'tiles') && setView(v)).catch(() => undefined); }, []);
  const chooseView = (v: 'tiles' | 'list') => { setView(v); AsyncStorage.setItem(VIEW_KEY, v).catch(() => undefined); };
  const inPlan = new Set(state.plan?.dishes.map((d) => d.recipeId));
  const term = q.trim().toLowerCase();
  const rows = useMemo(() => [...RECIPES].filter((r) => !r.sickDay && (!term || r.name.toLowerCase().includes(term) || r.cuisine.includes(term)))
    .sort((a, b) => Number(!!b.custom) - Number(!!a.custom) || a.name.localeCompare(b.name)), [term, state.customRecipes]);
  const remove = (r: Recipe) => update((st) => ({ ...st, customRecipes: (st.customRecipes ?? []).filter((x) => x.id !== r.id) }));

  return (
    <Sheet title="Recipe book" onClose={onClose}>
      {web && (
        <View style={{ marginTop: 12 }}>
          <Button icon="link" label="Import a recipe from a website link" onPress={() => setImporting({})} />
        </View>
      )}
      {web && (
        <View style={{ marginTop: 8 }}>
          <Button kind="ghost" icon="globe-outline" label="Browse a recipe website and save several" onPress={() => setBrowsing(true)} />
        </View>
      )}
      {web && (
        <View style={{ marginTop: 8 }}>
          <Button kind="ghost" icon="search" label="Search the web for a new recipe" onPress={() => setSearching(true)} />
        </View>
      )}
      <View style={{ marginTop: 8 }}>
        <Button kind={web ? 'ghost' : 'primary'} icon="sparkles" label="Add a recipe with Gemini" onPress={() => setAdding('new')} />
      </View>
      <TextInput value={q} onChangeText={setQ} placeholder="Search recipes or cuisines" placeholderTextColor={C.faint} accessibilityLabel="Search recipes" style={[input, { marginTop: 12 }]} />
      <Row style={{ marginTop: 10, gap: 6 }}>
        <Chip icon="grid-outline" label="Tiles" selected={view === 'tiles'} onPress={() => chooseView('tiles')} />
        <Chip icon="list-outline" label="List" selected={view === 'list'} onPress={() => chooseView('list')} />
      </Row>
      {view === 'tiles' && !!rows.length && <RecipeTiles recipes={rows} searching={term.length > 0} onOpen={setViewing} />}
      {view === 'list' && rows.map((r) => (
        <View key={r.id} style={{ borderTopWidth: 1, borderColor: C.line, paddingVertical: 10 }}>
          <Row style={{ flexWrap: 'nowrap', gap: 12 }}>
            <DishPhoto recipe={r} size={48} />
            <Pressable style={{ flex: 1, gap: 2 }} onPress={() => setViewing(r)} accessibilityRole="link" accessibilityLabel={`See ingredients and steps of ${r.name}`}>
              <Text style={{ fontFamily: F.display, fontSize: 15 }}>{r.name}</Text>
              <Text style={{ color: C.muted, fontSize: 12 }}>{cap(r.cuisine)}{r.course === 'soup' ? ' · Soup' : ''} · {r.minutes} min · {chillies(r.spice)}</Text>
              {r.imported && <Chip tone="brand" icon="download-outline" label={`Imported from ${r.sourceName ?? 'a website'}`} />}
              {r.aiDrafted && <Chip tone="warn" icon="sparkles" label="AI-drafted, please check" />}
              {r.aiAdapted && <Chip tone="warn" icon="sparkles" label="Adapted by Gemini" />}
            </Pressable>
            {r.custom && <IconButton icon="create-outline" label={`Edit ${r.name}`} onPress={() => setAdding(r)} />}
          </Row>
          {r.custom && (
            <Row style={{ marginTop: 6, justifyContent: 'flex-end' }}>
              {web && r.imported && r.sourceUrl && !isInstagram(r.sourceUrl) && <Button small kind="ghost" icon="refresh" label="Refresh from source" onPress={() => setImporting({ url: r.sourceUrl, refresh: r })} />}
              {inPlan.has(r.id)
                ? <Text style={{ color: C.muted, fontSize: 12 }}>On this week's menu, so it can't be removed yet</Text>
                : <Button small kind="danger" icon="trash-outline" label="Remove" onPress={() => remove(r)} />}
            </Row>
          )}
        </View>
      ))}
      {!rows.length && <Text style={{ color: C.muted, marginTop: 10 }}>Nothing matches “{q}”.</Text>}
      {browsing && <BrowseSites onClose={() => setBrowsing(false)} />}
      {searching && <SearchRecipes onClose={() => setSearching(false)} onPick={(sd) => { setSearching(false); setSeed(sd); }} onDraftByName={(q) => { setSearching(false); setSeed({ text: q, auto: false }); }} />}
      {importing && (
        <ImportLink start={importing.url} refresh={importing.refresh} onClose={() => setImporting(null)}
          onDraft={(draft) => { setImported({ draft, refresh: importing.refresh }); setImporting(null); }}
          onSeed={(sd) => { setImporting(null); setSeed(sd); }} />
      )}
      {imported && <AddRecipe initial={imported.draft} existing={imported.refresh} onClose={() => setImported(null)} />}
      {seed && <AddRecipe seed={seed} onClose={() => setSeed(null)} />}
      {adding && !seed && <AddRecipe existing={adding === 'new' ? undefined : adding} onClose={() => setAdding(null)} />}
      {viewing && <DishDetail recipe={viewing} onClose={() => setViewing(null)} />}
    </Sheet>
  );
}

/** One way of adding a recipe, opened straight from the Home page (no recipe book behind it). */
export function AddRecipeFlow({ start, url, onClose }: { start: 'import' | 'search' | 'gemini' | 'browse'; url?: string; onClose: () => void }) {
  const [seed, setSeed] = useState<Seed | null>(null);
  const [imported, setImported] = useState<Draft | null>(null);
  return (
    <>
      {start === 'search' && !seed && <SearchRecipes onClose={onClose} onPick={setSeed} onDraftByName={(q) => setSeed({ text: q, auto: false })} />}
      {start === 'import' && !seed && !imported && <ImportLink start={url} onClose={onClose} onDraft={setImported} onSeed={setSeed} />}
      {start === 'browse' && <BrowseSites onClose={onClose} />}
      {start === 'gemini' && !seed && <AddRecipe onClose={onClose} />}
      {imported && <AddRecipe initial={imported} onClose={onClose} />}
      {seed && <AddRecipe seed={seed} onClose={onClose} />}
    </>
  );
}

const SEARCH_LIMIT = 20;
/** The dish out of a request like "Search for new recipes for chicken rice". */
const dishOf = (q: string) => q.replace(/^\s*(please\s+)?(search|find|look)( for)?( me)?( some)?( new)?( recipes?)?( for| of)?\s*/i, '').trim() || q.trim();

/** Web search for recipes. Needs Gemini with Google Search; the links come from the search results themselves. */
function SearchRecipes({ onClose, onPick, onDraftByName }: { onClose: () => void; onPick: (s: Seed) => void; onDraftByName: (dish: string) => void }) {
  const { state, update, family } = useApp();
  const { key, model } = useAi();
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ msg: string; offer: boolean } | null>(null);
  const [options, setOptions] = useState<RecipeOption[] | null>(null);
  const on = !!family || (!!key && !!model);
  const today = localDate();
  const used = state.searchLog?.day === today ? state.searchLog.n : 0;

  const run = async () => {
    setError(null);
    setOptions(null);
    if (used >= SEARCH_LIMIT) { setError({ msg: `That's ${SEARCH_LIMIT} searches today, which keeps Google Search use small. Try again tomorrow, or draft a recipe from a dish name.`, offer: true }); return; }
    setBusy(true);
    try {
      const g = family ? await searchViaFamily(family, q.trim()) : await searchRecipesGrounded(key!, q.trim());
      // Only searches Google actually ran count towards the daily limit.
      update((st) => ({ ...st, searchLog: { day: today, n: (st.searchLog?.day === today ? st.searchLog.n : 0) + 1 } }));
      const found = parseOptions(g);
      if (!found.length) setError({ msg: 'No page came back with a full recipe, ingredient amounts and steps. Try different words, such as the dish and "recipe".', offer: true });
      else setOptions(found);
    } catch (e) {
      const msg = e instanceof GeminiError || e instanceof FamilyError ? e.message : 'The search failed. Try again.';
      // Drafting from the name works on the free plan, so offer it whatever went wrong with the search.
      setError({ msg, offer: true });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet title="Search for a recipe" onClose={onClose}>
      <P style={{ color: C.muted, marginTop: 10 }}>Type what you're after, like "Search for new recipes for chicken rice". You get up to 3 recipes from real web pages or YouTube, each with a link. Pick one and check it before it joins the book.</P>
      {!on && <Notice tone="warn" icon="sparkles-outline">Gemini is OFF, so searching isn't possible. Turn it on in Settings (family sharing is best), then come back.</Notice>}
      <TextInput value={q} onChangeText={setQ} editable={on} onSubmitEditing={() => on && q.trim().length > 1 && !busy && run()} returnKeyType="search" maxLength={200}
        placeholder="Search for new recipes for…" placeholderTextColor={C.faint} accessibilityLabel="Recipe search" style={[input, { marginTop: 12 }]} />
      <Text style={{ color: C.faint, fontSize: 12, marginTop: 6 }}>Only what you type here goes to Gemini and Google Search. Nothing about your family does. Searches today: {used} of {SEARCH_LIMIT}.</Text>
      <View style={{ marginTop: 12 }}>
        {busy ? <Row style={{ gap: 10 }}><ActivityIndicator color={C.brand} /><Text style={{ color: C.muted }}>Searching the web…</Text></Row>
          : <Button icon="search" label="Search" disabled={!on || q.trim().length < 2} onPress={run} />}
      </View>
      {error && (
        <View>
          <Notice tone="bad" icon="alert-circle">{error.msg}</Notice>
          {error.offer && q.trim().length > 1 && <View style={{ marginTop: 8 }}><Button kind="ghost" icon="sparkles" label={`Draft "${dishOf(q)}" from its name instead`} onPress={() => onDraftByName(dishOf(q))} /></View>}
        </View>
      )}
      {options?.map((o) => (
        <Card key={o.url + o.title} style={{ marginTop: 14, padding: 14 }}>
          <Text style={{ fontFamily: F.display, fontSize: 17 }}>{o.title}</Text>
          <Row style={{ marginTop: 6 }}><Chip tone="brand" icon="globe-outline" label={o.site} /><Chip tone="plain" label={`${o.steps.length} steps`} /></Row>
          <Text style={{ marginTop: 8, lineHeight: 20 }}>{o.summary}</Text>
          <Text style={{ color: C.muted, fontSize: 13, marginTop: 6, lineHeight: 19 }}>
            {o.ingredients.slice(0, 4).join(', ')}{o.ingredients.length > 4 ? ` and ${o.ingredients.length - 4} more` : ''}
          </Text>
          <Row style={{ marginTop: 12, gap: 8 }}>
            <Button small kind="ghost" icon="open-outline" label={`Open ${o.site}`} onPress={() => Linking.openURL(o.url)} />
            <Button small icon="add" label="Use this recipe" onPress={() => onPick({ text: o.text, url: o.url, name: o.site, auto: true, ...(/youtube\.com|youtu\.be/i.test(o.site) ? { video: o.url } : {}) })} />
          </Row>
        </Card>
      ))}
      {options && <Text style={{ color: C.faint, fontSize: 12, marginTop: 12 }}>The AI rewrote these in its own words from the pages it found. Open the link to compare.</Text>}
    </Sheet>
  );
}

/** Ask Gemini for a draft, then let the owner check and edit everything before it joins the book. */
type Seed = { text: string; url?: string; name?: string; auto: boolean; image?: string; video?: string; /** a caption pasted from an Instagram post: written up faithfully, never filled in */ instagram?: { account?: string } };

function AddRecipe({ existing, seed, initial, onClose, onSaved }: { existing?: Recipe; seed?: Seed; initial?: Draft; onClose: () => void; onSaved?: () => void }) {
  const { state, update, family } = useApp();
  const { key, model } = useAi();
  const [text, setText] = useState(seed?.text ?? '');
  const [link, setLink] = useState(seed?.url ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(initial ?? (existing ? { recipe: existing, newItems: {} } : null));
  const on = !!family || (!!key && !!model);

  const ask = async () => {
    setError(null);
    setBusy(true);
    try {
      const ig = !!seed?.instagram;
      const raw = family ? await draftViaFamily(family, text.trim(), catalogueLines(), ig) : await draftRecipeText(key!, text.trim(), ig);
      const d = normaliseDraft(raw, cleanUrl(link) ?? firstUrl(text), seed?.url && seed.name ? seed.name : undefined, seed?.video ?? youtubeIn(text) ?? youtubeUrl(link), ig);
      if (!d) setError(ig ? 'Gemini could not find a recipe in that caption (it needs a name and at least 2 ingredients). Check you pasted the whole caption, or add the recipe yourself.' : 'Gemini did not send back a complete recipe. Try again, or add more detail about the dish.');
      else if (ig) {
        const acct = seed?.instagram?.account;
        setDraft({ ...d, recipe: { ...d.recipe, imported: true, importedAt: new Date().toISOString(), sourceName: 'Instagram', source: acct ? `Imported from Instagram (${acct})` : 'Imported from Instagram (caption pasted by the family)' } });
      } else setDraft(seed?.image && cleanUrl(seed.image) ? { ...d, recipe: { ...d.recipe, imageUrl: seed.image } } : d);
    } catch (e) {
      setError(e instanceof GeminiError || e instanceof FamilyError ? e.message : 'Drafting failed. Try again.');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { if (seed?.auto && !existing && !initial) void ask(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!draft && seed?.auto && !error) {
    return (
      <Sheet title="Getting the recipe ready" onClose={onClose}>
        <Row style={{ gap: 10, marginTop: 16 }}><ActivityIndicator color={C.brand} /><Text style={{ color: C.muted }}>Writing it up in the app's format…</Text></Row>
      </Sheet>
    );
  }
  if (!draft) {
    return (
      <Sheet title="Add a recipe" onClose={onClose}>
        <P style={{ color: C.muted, marginTop: 10 }}>Type a dish name, or paste a recipe. Gemini drafts the full recipe in this app's format and you check it before it joins the book.</P>
        {!on && <Notice tone="warn" icon="sparkles-outline">Gemini is OFF, so recipes can't be drafted. Turn it on in Settings (family sharing is best), then come back.</Notice>}
        <TextInput value={text} onChangeText={setText} multiline editable={on} placeholder="e.g. Hokkien mee, or paste a recipe" placeholderTextColor={C.faint}
          accessibilityLabel="Dish name or recipe text" maxLength={4000}
          style={[input, { marginTop: 12, minHeight: 110, textAlignVertical: 'top' }]} />
        <Label>Source link (optional)</Label>
        <TextInput value={link} onChangeText={setLink} placeholder="https://… the page the recipe came from" placeholderTextColor={C.faint} autoCapitalize="none" autoCorrect={false}
          accessibilityLabel="Source link" style={input} />
        <Text style={{ color: C.muted, fontSize: 12, marginTop: 6 }}>Gemini can't open web pages, so paste the recipe text above. The link is only saved so the recipe shows where it came from. Without one it shows "No source given".</Text>
        <Text style={{ color: C.faint, fontSize: 12, marginTop: 6 }}>Only this text and the grocery list go to Gemini. Nothing about your family does.</Text>
        {error && <Notice tone="bad" icon="alert-circle">{error}</Notice>}
        <View style={{ marginTop: 14 }}>
          {busy ? <Row style={{ gap: 10 }}><ActivityIndicator color={C.brand} /><Text style={{ color: C.muted }}>Drafting the recipe…</Text></Row>
            : <Button icon="sparkles" label="Draft recipe" disabled={!on || text.trim().length < 2} onPress={ask} />}
        </View>
      </Sheet>
    );
  }
  return (
    <Review draft={draft} isEdit={!!existing} refreshing={!!initial && !!existing} onClose={onClose} onDiscard={existing || initial ? onClose : () => setDraft(null)}
      onSave={(d) => {
        update((st) => ({
          ...st,
          customRecipes: existing ? (st.customRecipes ?? []).map((x) => (x.id === d.recipe.id ? d.recipe : x)) : [...(st.customRecipes ?? []), d.recipe],
          customItems: { ...st.customItems, ...d.newItems },
          // a changed recipe needs fresh translations
          aiTranslations: Object.fromEntries(Object.entries(st.aiTranslations ?? {}).filter(([id]) => id !== d.recipe.id)),
        }));
        onSaved?.();
        onClose();
      }} />
  );
}

const stripVideo = (r: Recipe): Recipe => { const { videoUrl: _v, ...rest } = r; return rest; };

function Review({ draft, isEdit, refreshing, onSave, onDiscard, onClose }: { draft: Draft; isEdit: boolean; refreshing?: boolean; onSave: (d: Draft) => void; onDiscard: () => void; onClose: () => void }) {
  const [r, setR] = useState<Recipe>(draft.recipe);
  const [linkText, setLinkText] = useState(draft.recipe.sourceUrl ?? '');
  const [videoText, setVideoText] = useState(draft.recipe.videoUrl ?? '');
  // a link that came with the draft (like a search result's) is kept as it is; anything typed must be a YouTube video link
  const videoUrl = videoText.trim() === (draft.recipe.videoUrl ?? '') ? draft.recipe.videoUrl : youtubeUrl(videoText);
  const set = (p: Partial<Recipe>) => setR((x) => ({ ...x, ...p, i18n: p.name !== undefined ? { tl: { name: p.name }, id: { name: p.name }, my: { name: p.name } } : x.i18n }));
  const items = { ...CATALOGUE, ...draft.newItems };
  const toggleAllergen = (a: Allergen) => set({ allergens: r.allergens.includes(a) ? r.allergens.filter((x) => x !== a) : [...r.allergens, a] });
  const okSteps = r.steps.filter((s) => s.trim());
  const valid = r.name.trim().length > 0 && r.ingredients.length >= 2 && okSteps.length >= 3;

  return (
    <Sheet title={isEdit ? `Edit ${r.name}` : 'Check the recipe'} onClose={onClose}>
      {draft.recipe.imported && isInstagram(draft.recipe.sourceUrl) ? (
        <Notice tone="warn" icon="logo-instagram">From an Instagram caption pasted by your family{draft.recipe.source.includes('(@') ? ` (${draft.recipe.source.match(/\((@[^)]+)\)/)?.[1]})` : ''}. Gemini only organised what the caption says and was told not to add anything. Cuisine, spice, allergens and the health levels are guesses, so check them.{draft.recipe.steps.filter((x) => x.trim()).length < 3 ? ' The caption had few or no cooking steps (the method may only be in the video). Add the steps yourself below before saving. Nothing has been made up for you.' : ''}</Notice>
      ) : draft.recipe.imported ? (
        <Notice tone="warn" icon="download-outline">{refreshing
          ? `This is ${draft.recipe.sourceName ?? 'the site'}'s page as it is now. Saving replaces your ingredients, steps, time and photo with it; your cuisine, spice and allergen choices stay. Choose "No change" to keep what you have.`
          : `Imported from ${draft.recipe.sourceName ?? 'the website'}${draft.recipe.serves ? `. Amounts are for ${draft.recipe.serves}` : ''}. The ingredients and steps are the page's own words. Cuisine, spice, allergens and the health levels are only guesses from the ingredient list, so check them before anyone cooks this.`}</Notice>
      ) : (
        <Notice tone="warn" icon="sparkles">AI-drafted, please check. Read the ingredients, steps and allergens before anyone cooks this. Everything below can be edited.</Notice>
      )}
      {draft.recipe.sourceName && !draft.recipe.imported && <Notice tone="brand" icon="link">Found online at {draft.recipe.sourceName}. The AI rewrote the steps in its own words, so compare them with the page (the link is kept as the source) before you trust them.</Notice>}

      <Label>Name</Label>
      <TextInput value={r.name} onChangeText={(name) => set({ name })} style={input} accessibilityLabel="Recipe name" />

      <Label>Source link</Label>
      <TextInput value={linkText} autoCapitalize="none" autoCorrect={false} placeholder="https://… (leave empty if none)" placeholderTextColor={C.faint} accessibilityLabel="Source link"
        onChangeText={(v) => { setLinkText(v); setR((x) => { const { sourceUrl: _u, ...rest } = x; const u = cleanUrl(v); const { sourceName: _n, ...bare } = rest; return u ? { ...(u === draft.recipe.sourceUrl ? rest : bare), sourceUrl: u, source: u === draft.recipe.sourceUrl ? draft.recipe.source : (draft.recipe.imported ? `Imported from ${draft.recipe.sourceName ?? 'a website'} (link changed by the family)` : 'Supplied by the family (AI-drafted from it)') } : { ...rest, source: 'No source given (AI-drafted)' }; }); }} style={input} />
      <Text style={{ color: C.muted, fontSize: 12, marginTop: 6 }}>{r.sourceUrl ? 'Shown as a clickable link on the recipe.' : linkText.trim() ? 'That is not a web link yet. It needs to start with https://' : 'Shows "No source given" until you add a real link.'}</Text>

      <Label>YouTube video (optional)</Label>
      <TextInput value={videoText} autoCapitalize="none" autoCorrect={false} placeholder="https://www.youtube.com/watch?v=…" placeholderTextColor={C.faint} accessibilityLabel="YouTube link" onChangeText={setVideoText} style={input} />
      <Text style={{ color: videoText.trim() && !videoUrl ? C.amber : C.muted, fontSize: 12, marginTop: 6 }}>
        {videoUrl ? 'Shows a "Watch the video" button on the recipe and in cooking mode. It opens on YouTube. Check it is the right dish.' : videoText.trim() ? 'That is not a YouTube video link yet. Paste the address of the video.' : 'Paste a YouTube link if there is a video of this dish. Nothing is added unless you do.'}
      </Text>

      <Label>Cuisine</Label>
      <Row>{CUISINES.map((c) => <Chip key={c} label={cap(c)} selected={r.cuisine === c} onPress={() => set({ cuisine: c })} />)}</Row>
      <Label>Main protein</Label>
      <Row>{PROTEINS.map((p) => <Chip key={p} label={cap(p)} selected={r.protein === p} onPress={() => set({ protein: p })} />)}</Row>
      <Label>Served as</Label>
      <Row>
        <Chip label="A dish" selected={r.course !== 'soup'} onPress={() => setR((x) => { const { course: _c, ...rest } = x; return rest; })} />
        <Chip label="A soup" selected={r.course === 'soup'} onPress={() => set({ course: 'soup' })} />
      </Row>
      <Label>Meal type</Label>
      <Row>
        <Chip label="Dinner dish" selected={!r.meal} onPress={() => setR((x) => { const { meal: _m, ...rest } = x; return rest; })} />
        {([['breakfast', '🍳 Breakfast'], ['lunch', '🍱 Lunch'], ['drink', '🥤 Drink'], ['dessert', '🍮 Dessert']] as const).map(([m, l]) => <Chip key={m} label={l} selected={r.meal === m} onPress={() => set({ meal: m })} />)}
      </Row>
      <Label>Spice</Label>
      <Row>{[0, 1, 2, 3].map((n) => <Chip key={n} label={n === 0 ? 'Not spicy' : chillies(n)} selected={r.spice === n} onPress={() => set({ spice: n as Recipe['spice'] })} />)}</Row>
      <Label>Cooking time</Label>
      <Stepper value={r.minutes} onChange={(minutes) => set({ minutes })} min={5} max={240} format={(v) => `${v} min`} />

      <Label>Allergens (tap to change)</Label>
      <Row>{ALLERGENS.map((a) => <Chip key={a} label={cap(a)} selected={r.allergens.includes(a)} onPress={() => toggleAllergen(a)} />)}</Row>
      <Text style={{ color: C.muted, fontSize: 12, marginTop: 6 }}>Members with these allergies will never be offered this dish. Add any that are missing.</Text>
      <Label>Diet flags</Label>
      <Row>
        <Chip label="Vegetarian" selected={r.vegetarian} onPress={() => set({ vegetarian: !r.vegetarian })} />
        <Chip label="Has pork" selected={r.pork} onPress={() => set({ pork: !r.pork })} />
        <Chip label="Has beef" selected={r.beef} onPress={() => set({ beef: !r.beef })} />
      </Row>

      <Label>Ingredients</Label>
      {r.ingredients.map((i, k) => (
        <Row key={i.item} style={{ flexWrap: 'nowrap', gap: 8, marginBottom: 6 }}>
          <Text style={{ flex: 1 }}>{items[i.item]?.name ?? i.item}</Text>
          <TextInput value={i.qty} onChangeText={(qty) => set({ ingredients: r.ingredients.map((x, j) => (j === k ? { ...x, qty } : x)) })}
            accessibilityLabel={`Amount of ${items[i.item]?.name ?? i.item}`} style={[input, { width: 110, paddingVertical: 7 }]} />
          <IconButton icon="close" label={`Remove ${items[i.item]?.name ?? i.item}`} onPress={() => set({ ingredients: r.ingredients.filter((_, j) => j !== k) })} />
        </Row>
      ))}

      <Label>Steps</Label>
      {r.steps.map((st, k) => (
        <Row key={k} style={{ flexWrap: 'nowrap', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
          <Text style={{ width: 22, paddingTop: 11, fontWeight: '800', color: C.brandDeep }}>{k + 1}</Text>
          <TextInput value={st} multiline onChangeText={(v) => set({ steps: r.steps.map((x, j) => (j === k ? v : x)) })} accessibilityLabel={`Step ${k + 1}`}
            style={[input, { flex: 1, paddingVertical: 8, textAlignVertical: 'top' }]} />
          <IconButton icon="close" label={`Remove step ${k + 1}`} onPress={() => set({ steps: r.steps.filter((_, j) => j !== k) })} />
        </Row>
      ))}
      <Button small kind="ghost" icon="add" label="Add a step" onPress={() => set({ steps: [...r.steps, ''] })} />

      {!valid && <Notice tone="bad" icon="alert-circle">A recipe needs a name, at least 2 ingredients and at least 3 steps.</Notice>}
      <View style={{ marginTop: 18, gap: 8 }}>
        <Button icon="checkmark" label={isEdit ? 'Save changes' : 'Add to recipe book'} disabled={!valid}
          onPress={() => onSave({ recipe: { ...stripVideo(r), ...(videoUrl ? { videoUrl } : {}), name: r.name.trim(), steps: okSteps, minutes: r.minutes }, newItems: Object.fromEntries(Object.entries(draft.newItems).filter(([k]) => r.ingredients.some((i) => i.item === k))) })} />
        <Button kind="ghost" label={isEdit ? 'No change' : 'Discard this draft'} onPress={onDiscard} />
      </View>
    </Sheet>
  );
}

/** Paste a recipe link: the Supabase function reads the page, and the owner checks the result before it joins the book. */
function ImportLink({ start, refresh, onClose, onDraft, onSeed }: { start?: string; refresh?: Recipe; onClose: () => void; onDraft: (d: Draft) => void; onSeed: (s: Seed) => void }) {
  const { family } = useApp();
  const { key, model } = useAi();
  const [url, setUrl] = useState(start ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<Imported | null>(null);
  const geminiOn = !!family || (!!key && !!model);
  const link = cleanUrl(url);
  const insta = isInstagram(link);
  const [caption, setCaption] = useState('');
  const [account, setAccount] = useState('');
  const acct = instagramAccount(account);
  const [pasted, setPasted] = useState('');

  const run = async () => {
    if (!family || !link) return;
    setError(null);
    setPage(null);
    setBusy(true);
    try {
      const imp = await importViaFamily(family, link);
      const noMarkup = (p: Imported) => {
        // the page has no recipe data this app can read: hand its text to Gemini straight away, if there is enough of it
        if (!refresh && geminiOn && p.text && p.text.length >= 400) {
          onSeed({ text: p.text, url: p.url, name: p.site, auto: true, image: p.image, ...(youtubeUrl(p.video ?? undefined) ? { video: youtubeUrl(p.video ?? undefined) } : {}) });
        } else setPage({ ...p, found: false });
      };
      if (!imp.found) { noMarkup(imp); return; }
      const d = importedToDraft(imp);
      if (!d) { noMarkup({ ...imp, found: false }); return; }
      if (refresh) {
        // keep what the owner already checked (cuisine, spice, allergens, flags); take the page's fresh ingredients, steps, time and photo
        const r = d.recipe;
        onDraft({ newItems: d.newItems, recipe: { ...refresh, name: refresh.name, ingredients: r.ingredients, steps: r.steps, minutes: r.minutes, serves: r.serves, imageUrl: r.imageUrl, importedAt: r.importedAt, videoUrl: r.videoUrl ?? refresh.videoUrl,
          allergens: [...new Set([...refresh.allergens, ...r.allergens])] } });
      } else onDraft(d);
    } catch (e) {
      setError(e instanceof FamilyError ? e.message : 'Importing failed. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet title={refresh ? `Refresh ${refresh.name}` : 'Import from a link'} onClose={onClose}>
      <P style={{ color: C.muted, marginTop: 10 }}>Paste the link of a recipe page (or an Instagram post, see below). The ingredients, steps, time and photo come in by themselves, and you check them before they join the book. Nothing is added without your OK.</P>
      {!family && !insta && <Notice tone="warn" icon="people-outline">Importing needs family sharing (Supabase) switched on, because a phone or browser can't read other websites by itself. You can still paste the recipe text into "Add a recipe with Gemini".</Notice>}
      <TextInput value={url} onChangeText={setUrl} editable={!refresh} autoCapitalize="none" autoCorrect={false} keyboardType="url" placeholder="https://… link of the recipe page" placeholderTextColor={C.faint}
        accessibilityLabel="Recipe link" onSubmitEditing={() => !busy && run()} style={[input, { marginTop: 12 }]} />
      {url.trim() !== '' && !link && <Text style={{ color: C.amber, fontSize: 12, marginTop: 6 }}>That isn't a web link yet. It needs to start with https://</Text>}
      {!insta && <Text style={{ color: C.faint, fontSize: 12, marginTop: 6 }}>Only the link is sent. Nothing about your family is. The recipe stays linked to its website and credits it; the photo is shown from their page, not copied.</Text>}
      {insta && (
        <View>
          <Notice tone="warn" icon="logo-instagram">This app can't read Instagram. It needs a login and doesn't allow apps to copy its pages. So open the post in Instagram, copy its caption, and paste it below. Gemini will organise it into a recipe. The link is saved as the source.</Notice>
          <Label>Paste the caption</Label>
          <TextInput value={caption} onChangeText={setCaption} multiline maxLength={4000} editable={geminiOn} placeholder="Paste the whole caption here: the ingredients and, if it has them, the steps" placeholderTextColor={C.faint}
            accessibilityLabel="Instagram caption" style={[input, { minHeight: 140, textAlignVertical: 'top' }]} />
          <Label>Account (optional)</Label>
          <TextInput value={account} onChangeText={setAccount} autoCapitalize="none" autoCorrect={false} maxLength={31} placeholder="@name of the account, if you want it shown" placeholderTextColor={C.faint}
            accessibilityLabel="Instagram account" style={input} />
          {account.trim() !== '' && !acct && <Text style={{ color: C.amber, fontSize: 12, marginTop: 6 }}>Use only letters, numbers, dots and underscores.</Text>}
          <Text style={{ color: C.muted, fontSize: 12, marginTop: 8, lineHeight: 17 }}>Many reels only show the method in the video, with just a list of ingredients in the caption. Then the draft will have no steps and you add them yourself. Gemini is told not to make any up, and nothing about the post is invented, including the account.</Text>
          <Text style={{ color: C.faint, fontSize: 12, marginTop: 6 }}>Only the caption goes to Gemini, plus the grocery list. Nothing about your family does. Only use captions you may copy: keep this to your family's own book.</Text>
          {!geminiOn && <Notice tone="warn" icon="sparkles-outline">Gemini is OFF, so the caption can't be organised. Turn it on in Settings (family sharing is best), then come back.</Notice>}
          <View style={{ marginTop: 14 }}>
            <Button icon="sparkles" label="Turn the caption into a recipe" disabled={!geminiOn || caption.trim().length < 20 || (account.trim() !== '' && !acct)}
              onPress={() => onSeed({ text: caption.trim(), url: link, name: 'Instagram', auto: true, instagram: { account: acct } })} />
          </View>
        </View>
      )}
      {error && <Notice tone="bad" icon="alert-circle">{error}</Notice>}
      {page && !page.found && (
        <View>
          <Notice tone="warn" icon="document-text-outline">{page.text && page.text.length >= 400 ? "That page doesn't list a recipe in a form this app can read by itself, but it has text." : "That page has almost no readable text: it probably loads the recipe with scripts, which this app can't run."}{geminiOn ? (page.text && page.text.length >= 400 ? ' Gemini can try to find the recipe in the page text. It will rewrite it in its own words, so compare it with the page.' : ' Open the page, copy the recipe text and paste it below.') : ' Copy the recipe text and paste it into "Add a recipe with Gemini".'}</Notice>
          {geminiOn && page.text && page.text.length >= 400 && <View style={{ marginTop: 8 }}><Button icon="sparkles" label="Read the page with Gemini" onPress={() => onSeed({ text: page.text!, url: page.url, name: page.site, auto: true, image: page.image, ...(youtubeUrl(page.video ?? undefined) ? { video: youtubeUrl(page.video ?? undefined) } : {}) })} /></View>}
        </View>
      )}
      {!insta && link && (!!error || (!!page && !page.found && !(page.text && page.text.length >= 400))) && (
        <View>
          <Label>Or paste the recipe text from the page</Label>
          <TextInput value={pasted} onChangeText={setPasted} multiline maxLength={4000} editable={geminiOn} placeholder="Open the page, copy the ingredients and steps, and paste them here"
            placeholderTextColor={C.faint} accessibilityLabel="Recipe text from the page" style={[input, { minHeight: 120, textAlignVertical: 'top' }]} />
          <Text style={{ color: C.faint, fontSize: 12, marginTop: 6 }}>Only this text goes to Gemini, plus the grocery list. The link is saved as the source.</Text>
          <View style={{ marginTop: 8 }}>
            <Button icon="sparkles" label="Turn the text into a recipe" disabled={!geminiOn || pasted.trim().length < 20}
              onPress={() => onSeed({ text: pasted.trim(), url: link, auto: true })} />
          </View>
        </View>
      )}
      {!insta && <View style={{ marginTop: 14 }}>
        {busy ? <Row style={{ gap: 10 }}><ActivityIndicator color={C.brand} /><Text style={{ color: C.muted }}>Reading the page…</Text></Row>
          : <Button icon="download-outline" label={refresh ? 'Check the page again' : 'Import recipe'} disabled={!family || !link} onPress={run} />}
      </View>}
    </Sheet>
  );
}

const SITES = [
  { name: 'Tiffy Cooks', url: 'https://tiffycooks.com/recipes/' },
  { name: 'Rasa Malaysia', url: 'https://rasamalaysia.com/recipes/' },
  { name: 'Nyonya Cooking', url: 'https://www.nyonyacooking.com/recipes' },
  { name: 'RecipeTin Eats', url: 'https://www.recipetineats.com/recipes/' },
];
const SITE_TAB = 'kitchenkaki-recipe-site';
/** The page as shown in the window: the function's simple copy plus one small script that tells the app which link was tapped. */
const readerDoc = (html: string) => `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
body{font:16px/1.5 system-ui,sans-serif;margin:12px;color:#222;overflow-wrap:anywhere}img{max-width:100%;height:auto;border-radius:8px}a{color:#1f6f4a;cursor:pointer;text-decoration:underline}
nav,header,footer,aside{background:#f6f1e7;border-radius:8px;padding:6px 10px;margin:8px 0;font-size:14px}nav a,header a,footer a{margin-right:8px;display:inline-block}li{margin:4px 0}table{border-collapse:collapse}td,th{border:1px solid #ddd;padding:4px}
</style><body>${html}<script>document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a');if(a&&a.dataset.h){e.preventDefault();parent.postMessage({kk:1,go:a.dataset.h},'*')}});</script></body>`;

const hostOf = (u: string) => u.replace(/^https?:\/\/(www\.)?/i, '').replace(/[/?#].*$/, '');
const WEB = Platform.OS === 'web';

/**
 * Browse a recipe site in its own tab, copy a recipe's link, come back and save it in one tap, then carry on browsing.
 * Most recipe sites don't allow other apps to show their pages inside the app, so the site stays in its own tab.
 * Each saved link is read in the background and waits in a list: nothing joins the recipe book until the owner has checked it.
 */
function BrowseSites({ onClose }: { onClose: () => void }) {
  const { state, update, family } = useApp();
  const [url, setUrl] = useState('');
  const [site, setSite] = useState('');
  const [offer, setOffer] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [opened, setOpened] = useState(false);
  const [checking, setChecking] = useState<SavedLink | null>(null);
  const [manual, setManual] = useState<string | null>(null);
  const [lookAt, setLookAt] = useState<string | null>(null);
  const field = React.useRef<TextInput>(null);
  const [page, setPage] = useState<Browsed | null>(null);
  const [trail, setTrail] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [tried, setTried] = useState('');
  const frame = React.useRef<HTMLIFrameElement | null>(null);
  const goRef = React.useRef<(u: string, back?: boolean) => void>(() => undefined);
  const saved = state.savedLinks ?? [];
  const link = cleanUrl(url);
  const patch = (id: string, p: Partial<SavedLink>) => update((st) => ({ ...st, savedLinks: (st.savedLinks ?? []).map((x) => (x.id === id ? { ...x, ...p } : x)) }));

  // the window inside the app: the function fetches the page, the app shows a simple copy and decides what opens next
  const go = async (raw: string, back = false) => {
    const u = cleanUrl(raw);
    if (!u || !family) return;
    setLoading(true); setPageError(null); setNote(null); setTried(u);
    try {
      const b = await browseViaFamily(family, u);
      setPage(b);
      setTrail((t) => (back ? t.slice(0, -1) : [...t, b.url]));
    } catch (e) {
      setPageError(e instanceof FamilyError ? e.message : "Couldn't open that page here. Open it in a new tab instead.");
    } finally { setLoading(false); }
  };
  goRef.current = go;
  const inApp = WEB && !!family;
  useEffect(() => {
    if (!inApp || typeof window === 'undefined') return;
    const on = (e: MessageEvent) => {
      if (e.source !== frame.current?.contentWindow || !e.data || e.data.kk !== 1 || typeof e.data.go !== 'string') return;
      goRef.current(e.data.go);
    };
    window.addEventListener('message', on);
    return () => window.removeEventListener('message', on);
  }, [inApp]);
  const back = () => { const prev = trail[trail.length - 2]; if (prev) go(prev, true); };
  const openSite = (u: string) => (inApp ? go(u) : open(u));

  const open = (u: string) => {
    setOpened(true);
    if (WEB && typeof window !== 'undefined') window.open(u, SITE_TAB);
    else Linking.openURL(u).catch(() => undefined);
  };

  // coming back from the site tab: offer the link that was just copied there
  const looksNew = (u: string) => !saved.some((x) => x.url === u) && !(state.customRecipes ?? []).some((r) => r.sourceUrl === u);
  const readClipboard = () => {
    try {
      const nav = typeof navigator !== 'undefined' ? navigator : undefined;
      nav?.clipboard?.readText?.().then((t) => { const u = cleanUrl(t); if (u && looksNew(u)) setOffer(u); }).catch(() => undefined);
    } catch { /* clipboard not allowed: the Paste button and the link box still work */ }
  };
  useEffect(() => {
    if (!WEB || !opened || typeof window === 'undefined') return;
    const on = () => { if (document.visibilityState === 'visible') readClipboard(); };
    window.addEventListener('focus', on);
    document.addEventListener('visibilitychange', on);
    return () => { window.removeEventListener('focus', on); document.removeEventListener('visibilitychange', on); };
  });

  const save = async (raw: string) => {
    const u = cleanUrl(raw);
    setNote(null);
    if (!u) { setNote("That isn't a web link yet. It needs to start with https://"); return; }
    if (isInstagram(u)) { setNote("Instagram can't be read this way. Use Import from a link and paste the caption."); return; }
    if (!looksNew(u)) { setNote('You already saved that one.'); setUrl(''); setOffer(null); return; }
    if (!family) { setNote('Reading a page needs family sharing (Supabase) switched on.'); return; }
    const id = newId();
    update((st) => ({ ...st, savedLinks: [{ id, url: u, at: new Date().toISOString(), status: 'reading' as const }, ...(st.savedLinks ?? [])].slice(0, 40) }));
    setUrl(''); setOffer(null);
    setTimeout(() => field.current?.focus(), 50);
    try {
      const imp = await importViaFamily(family, u);
      const d = imp.found ? importedToDraft(imp) : null;
      if (d) patch(id, { status: 'ready', name: d.recipe.name, draft: d });
      else patch(id, { status: 'look', name: imp.name || imp.site || hostOf(u) });
    } catch (e) {
      patch(id, { status: 'failed', error: e instanceof FamilyError ? e.message : 'Reading the page failed.' });
    }
  };
  const drop = (id: string) => update((st) => ({ ...st, savedLinks: (st.savedLinks ?? []).filter((x) => x.id !== id) }));
  const paste = () => {
    try {
      navigator.clipboard.readText().then((t) => { const u = cleanUrl(t); if (u) setUrl(u); else setNote('Nothing that looks like a web link was copied.'); }).catch(() => setNote("This browser didn't allow pasting. Paste into the box instead."));
    } catch { setNote("This browser didn't allow pasting. Paste into the box instead."); }
  };
  const waiting = saved.filter((x) => x.status === 'ready').length;

  return (
    <Sheet title="Browse and save recipes" onClose={onClose}>
      <P style={{ color: C.muted, marginTop: 10 }}>Open a recipe website, find a recipe, copy its link, then come back here and save it. Open the site again and carry on from where you were. Saved recipes wait below until you check them.</P>
      <Notice tone="brand" icon="information-circle-outline">{inApp
        ? "Pages open in a simple window here: text, pictures and links, without ads, videos or scripts. Tap a link to move around the site, and Save recipe when you find one. If a site won't open, use \"Open in a new tab\"."
        : "Most recipe websites don't let other apps show their pages inside the app, so the site opens in its own browser tab and stays open there."}</Notice>
      <Label>1. Pick a website</Label>
      <Row style={{ gap: 6 }}>
        {SITES.map((x) => <Chip key={x.name} label={x.name} selected={site === x.url} onPress={() => { setSite(x.url); openSite(x.url); }} />)}
      </Row>
      <Row style={{ marginTop: 8, gap: 8, flexWrap: 'nowrap' }}>
        <TextInput value={manual ?? ''} onChangeText={setManual} autoCapitalize="none" autoCorrect={false} keyboardType="url" placeholder="Or any other website, https://…" placeholderTextColor={C.faint}
          accessibilityLabel="Other website" style={[input, { flex: 1 }]} onSubmitEditing={() => cleanUrl(manual ?? '') && openSite(cleanUrl(manual ?? '')!)} />
        <Button small kind="ghost" icon="open-outline" label="Open" disabled={!cleanUrl(manual ?? '')} onPress={() => openSite(cleanUrl(manual ?? '')!)} />
      </Row>
      {inApp && (loading || page || pageError) && (
        <View style={{ marginTop: 12, borderWidth: 1, borderColor: C.line, borderRadius: 16, overflow: 'hidden', backgroundColor: C.card }}>
          <Row style={{ gap: 6, flexWrap: 'nowrap', padding: 8, borderBottomWidth: 1, borderColor: C.line }}>
            <IconButton icon="arrow-back" label="Back" onPress={back} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, fontWeight: '700' }} numberOfLines={1}>{page ? page.title || hostOf(page.url) : ' '}</Text>
              <Text style={{ fontSize: 11, color: C.faint }} numberOfLines={1}>{page ? hostOf(page.url) + page.url.replace(/^https?:\/\/[^/]+/, '') : loading ? 'Opening…' : ''}</Text>
            </View>
            {loading && <ActivityIndicator color={C.brand} />}
            {page && <IconButton icon="open-outline" label="Open this page in a new tab" onPress={() => open(page.url)} />}
          </Row>
          {pageError && <View style={{ padding: 12 }}><Notice tone="warn" icon="alert-circle-outline">{pageError}</Notice>{tried !== '' && <View style={{ marginTop: 8, alignSelf: 'flex-start' }}><Button small kind="ghost" icon="open-outline" label="Open in a new tab instead" onPress={() => open(tried)} /></View>}</View>}
          {page && React.createElement('iframe', {
            ref: frame, title: 'Recipe website', sandbox: 'allow-scripts', srcDoc: readerDoc(page.html), style: { width: '100%', height: 420, border: 0, display: 'block', backgroundColor: '#fff' },
          })}
          {page && (
            <Row style={{ gap: 8, flexWrap: 'nowrap', padding: 10, borderTopWidth: 1, borderColor: C.line }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: page.hasRecipe ? C.green : C.faint, fontWeight: '700' }}>{page.hasRecipe ? 'This page has a recipe' : "This doesn't look like a recipe page"}</Text>
              </View>
              {saved.some((x) => x.url === page.url) || (state.customRecipes ?? []).some((r) => r.sourceUrl === page.url)
                ? <Chip tone="good" icon="checkmark" label="Saved" />
                : <Button small icon="bookmark" label="Save recipe" onPress={() => save(page.url)} />}
            </Row>
          )}
        </View>
      )}
      <Label>{inApp ? 'Or paste a link to save' : "2. Copy the recipe's link, then save it here"}</Label>
      {offer && (
        <View style={{ backgroundColor: C.brandSoft, borderRadius: 14, padding: 12, marginBottom: 8 }}>
          <Text style={{ fontWeight: '700' }}>Link you just copied</Text>
          <Text style={{ color: C.muted, fontSize: 13 }} numberOfLines={2}>{hostOf(offer)}{offer.replace(/^https?:\/\/[^/]+/, '')}</Text>
          <Row style={{ marginTop: 8 }}>
            <Button small icon="bookmark" label="Save this recipe" onPress={() => save(offer)} />
            <Button small kind="ghost" label="Not this one" onPress={() => setOffer(null)} />
          </Row>
        </View>
      )}
      <Row style={{ gap: 8, flexWrap: 'nowrap' }}>
        <TextInput ref={field} value={url} onChangeText={setUrl} autoCapitalize="none" autoCorrect={false} keyboardType="url" placeholder="https://… link of the recipe" placeholderTextColor={C.faint}
          accessibilityLabel="Recipe link to save" onSubmitEditing={() => save(url)} style={[input, { flex: 1 }]} />
        {WEB && <Button small kind="ghost" icon="clipboard-outline" label="Paste" onPress={paste} />}
      </Row>
      <View style={{ marginTop: 8 }}>
        <Button icon="bookmark" label={inApp ? "Save pasted link" : "Save recipe"} disabled={!link} onPress={() => save(url)} />
      </View>
      {note && <Notice tone="warn" icon="alert-circle-outline">{note}</Notice>}
      {!family && <Notice tone="warn" icon="people-outline">Reading a page needs family sharing (Supabase) switched on, because a browser can't read other websites by itself.</Notice>}
      <Text style={{ color: C.faint, fontSize: 12, marginTop: 8, lineHeight: 17 }}>Only the link is sent. Each recipe stays linked to its website and credits it. Keep to recipes you may copy: for your own family.</Text>

      {saved.length > 0 && <Label>{waiting ? `Saved, ${waiting} to check` : 'Saved from websites'}</Label>}
      {saved.map((x) => (
        <View key={x.id} style={{ borderTopWidth: 1, borderColor: C.line, paddingVertical: 10 }}>
          <Row style={{ flexWrap: 'nowrap', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '700' }} numberOfLines={2}>{x.name ?? hostOf(x.url)}</Text>
              <Text style={{ color: C.faint, fontSize: 12 }} numberOfLines={1}>{hostOf(x.url)}</Text>
            </View>
            {x.status === 'reading' && <ActivityIndicator color={C.brand} />}
            {x.status === 'added' && <Chip tone="good" icon="checkmark" label="Added" />}
            {x.status === 'ready' && <Button small icon="checkmark-circle-outline" label="Check and add" onPress={() => setChecking(x)} />}
            {x.status === 'look' && <Button small kind="ghost" icon="document-text-outline" label="Open it" onPress={() => setLookAt(x.url)} />}
          </Row>
          {x.status === 'look' && <Text style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>This page has no recipe this app can read by itself. Open it to paste the text, or let Gemini read it.</Text>}
          {x.status === 'failed' && <Text style={{ color: C.red, fontSize: 12, marginTop: 4 }}>{x.error}</Text>}
          {(x.status !== 'reading') && (
            <Pressable onPress={() => drop(x.id)} accessibilityRole="button" accessibilityLabel={`Remove ${x.name ?? hostOf(x.url)} from the list`} style={{ alignSelf: 'flex-start', marginTop: 4 }}>
              <Text style={{ color: C.faint, fontSize: 12, textDecorationLine: 'underline' }}>{x.status === 'ready' ? 'Skip this one' : 'Remove from list'}</Text>
            </Pressable>
          )}
        </View>
      ))}
      {checking?.draft && <AddRecipe initial={checking.draft} onClose={() => setChecking(null)} onSaved={() => patch(checking.id, { status: 'added', draft: undefined })} />}
      {lookAt && <AddRecipeFlow start="import" url={lookAt} onClose={() => setLookAt(null)} />}
    </Sheet>
  );
}
