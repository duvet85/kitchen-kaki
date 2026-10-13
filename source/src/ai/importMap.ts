import { CATALOGUE } from '../data/store';
import { Draft, RawDraft, cleanUrl, normaliseDraft, youtubeUrl } from './draft';

/** What the "import" mode of the Supabase function sends back (see supabase/functions/translate/index.ts). */
export interface Imported {
  found: boolean;
  url: string;
  site: string;
  name: string;
  image?: string;
  description?: string;
  ingredients?: string[];
  steps?: string[];
  minutes?: number | null;
  serves?: string | null;
  author?: string | null;
  /** a YouTube video: from the recipe's own data ("recipe") or just found on the page ("page", may not be this dish) */
  video?: string | null;
  videoFrom?: 'recipe' | 'page' | null;
  /** only when found is false: the page's readable text */
  text?: string;
}

const UNIT = '(?:cups?|tbsp|tsp|tablespoons?|teaspoons?|grams?|g|kg|ml|l|litres?|liters?|oz|ounces?|lbs?|pounds?|cloves?|pieces?|stalks?|stems?|slices?|cans?|tins?|packs?|packets?|bunch(?:es)?|sprigs?|pinch(?:es)?|dash(?:es)?|inch(?:es)?|cm)';
const QTY = new RegExp(`^\\s*((?:about\\s+|~)?[\\d¼½¾⅓⅔⅛.,/–-]+(?:\\s+[\\d¼½¾⅓⅔⅛/]+)?\\s*(?:${UNIT}\\b\\.?)?(?:\\s*\\([^)]*\\))?)\\s*(?:of\\s+)?(.*)$`, 'i');
const SIZE = /\b(large|medium|small|big|fresh|freshly|ripe|whole|bone-in|skin-on|boneless|skinless|thinly|thickly|finely|roughly|lightly|coarsely|peeled|chopped|sliced|diced|minced|smashed|crushed|cut into [^,]*|divided|optional|to taste|for serving|for garnish)\b/gi;

/** "4 large bone-in, skin-on whole chicken legs" becomes { qty: "4", name: "chicken legs" }. */
export function splitIngredient(line: string): { qty: string; name: string } {
  const text = line.replace(/\s+/g, ' ').trim();
  const m = text.match(QTY);
  let qty = (m?.[1] ?? '').trim();
  let rest = (m?.[2] ?? text).trim();
  if (!qty && !m) rest = text;
  rest = rest.replace(/\([^)]*\)/g, ' ').replace(SIZE, ' ');
  const seg = rest.split(/,| - | – | or /).map((x) => x.replace(/\s+/g, ' ').replace(/^[\s;:-]+|[\s;:.-]+$/g, '')).find((x) => /[a-z]/i.test(x)) ?? '';
  let name = seg.toLowerCase().slice(0, 60);
  const tail = name.match(/^(.+?)\s+(cloves?|stalks?|sprigs?|slices?|pieces?|stems?)$/);
  if (tail && qty) { name = tail[1]; qty = `${qty} ${tail[2]}`; }
  if (qty.length > 30) qty = qty.slice(0, 30);
  return { qty: qty || 'as needed', name: name || text.toLowerCase().slice(0, 60) };
}

const words = (s: string) => s.toLowerCase().replace(/\([^)]*\)/g, ' ').split(/[^a-z]+/).filter((w) => w.length > 2).map((w) => w.replace(/(es|s)$/, ''));

const FORM = new Set(['powder', 'dried', 'ground', 'flake', 'past', 'sauc', 'oil', 'salt', 'cube', 'extract', 'seed']);

/** Best catalogue item whose name's words all appear in the ingredient's name, or '' when none does. */
export function matchCatalogue(name: string): string {
  if (/onion/.test(name) && !/spring|green|powder|red|shallot|dried|flakes|salt/.test(name)) return 'onion';
  const have = new Set(words(name));
  let best = '', bestLen = 0;
  for (const [k, v] of Object.entries(CATALOGUE)) {
    const w = words(v.name);
    // "garlic powder" is not the catalogue's "Garlic": a form word the catalogue name lacks rules it out
    if (w.length && w.every((x) => have.has(x)) && ![...have].some((x) => FORM.has(x) && !w.includes(x)) && v.name.length > bestLen) { best = k; bestLen = v.name.length; }
  }
  return best;
}

const aisleOf = (n: string) =>
  /powder|dried|ground|salt|peppercorn|black pepper|sauce|oil\b|vinegar|sugar|flour|stock|paste|spice|seasoning|cumin|paprika|oregano|thyme|cinnamon|turmeric|rice|noodle|pasta|honey|syrup/i.test(n) ? 'Pantry'
    : /chicken|beef|pork|lamb|mutton|duck|fish|salmon|cod|prawn|shrimp|crab|squid|bacon|sausage|ribs|mince/i.test(n) ? 'Meat & Seafood'
    : /onion|garlic|lemon|lime|ginger|chilli|chili|carrot|potato|tomato|cabbage|spinach|lettuce|broccoli|cucumber|mushroom|pepper|celery|coriander|cilantro|basil|parsley|mint|scallion|herb|bean|corn|pumpkin|zucchini|eggplant|avocado|apple|orange|banana|cauliflower/i.test(n) ? 'Fruit & Veg'
      : /milk|cheese|cream|yogh?urt|butter|egg|tofu|paneer/i.test(n) ? 'Chilled' : 'Pantry';

const has = (re: RegExp, s: string) => re.test(s);

/** Fills in what a recipe page doesn't state (cuisine, spice, health levels) from keywords. These are guesses; the owner checks them in the review screen. */
export function guessDetails(name: string, ing: string[]): Omit<RawDraft, 'name' | 'ingredients' | 'steps' | 'minutes'> {
  const t = ing.join(' ; ').toLowerCase();
  const all = `${name} ${t}`.toLowerCase();
  const order: [string, RegExp][] = [['pork', /pork|bacon|\bham\b|sausage|char siew/], ['beef', /beef|steak|brisket|oxtail/], ['seafood', /prawn|shrimp|crab|squid|scallop|clam|mussel|lobster/],
    ['fish', /\bfish\b|salmon|cod\b|snapper|seabass|tuna|mackerel|tilapia|barramundi/], ['chicken', /chicken|duck|turkey/]];
  const found = order.map(([p, re]) => [p, t.search(re)] as const).filter(([, i]) => i >= 0).sort((a, b) => a[1] - b[1]);
  const protein = found[0]?.[0] ?? (has(/tofu|tempeh/, t) ? 'tofu' : has(/\begg/, t) ? 'egg' : 'veg');
  const cuisine = has(/gochujang|kimchi|gochugaru/, all) ? 'korean'
    : has(/miso|mirin|dashi|sake\b|teriyaki|panko|nori/, all) ? 'japanese'
      : has(/fish sauce|thai basil|lemongrass.*coconut|coconut.*lime|galangal|pad |tom yum/, all) ? 'thai'
        : has(/sambal|belacan|kecap|rendang|lengkuas|kerisik|nasi |laksa/, all) ? 'malay'
          : has(/garam masala|curry leaves|paneer|dhal|dal\b|masala|ghee|tandoori|curry powder|turmeric.*cumin|cumin.*turmeric/, all) ? 'indian'
            : has(/soy sauce|oyster sauce|shaoxing|sesame oil|five.spice|hoisin|white pepper|stir.fry|wok/, all) ? 'chinese'
              : 'western';
  const chilli = /chil+i|cayenne|sambal|jalape|sriracha|gochujang|curry paste|tabasco|habanero|bird.?s? eye|chili flakes|red pepper flakes/;
  const spice = has(/bird.?s? eye|habanero|padi/, t) ? 3 : has(chilli, t) ? (has(/flakes|cayenne|jalape|paprika/, t) && !has(/fresh chil|sambal|gochujang|paste/, t) ? 1 : 2) : 0;
  const salty = (t.match(/soy sauce|fish sauce|oyster sauce|miso|salt\b|stock cube|bouillon|chicken powder|worcestershire|anchov|olives|capers|bacon|ham\b/g) ?? []).length;
  const sweet = (t.match(/sugar|honey|syrup|ketchup|jam|mirin|molasses|condensed/g) ?? []).length;
  const fat = (t.match(/butter|cream|cheese|coconut milk|ghee|bacon|pork belly|lard|skin-on|sausage/g) ?? []).length;
  const flavours = ['savoury', ...(spice ? ['spicy'] : []), ...(sweet ? ['sweet'] : []), ...(has(/lemon|lime|vinegar|tamarind|yogh?urt/, t) ? ['sour'] : []), ...(has(/thyme|rosemary|oregano|parsley|basil|dill|mint|coriander/, t) ? ['herby'] : [])].slice(0, 3);
  const carb = has(/rice|pasta|spaghetti|noodle|bread|potato|flour|tortilla|couscous|quinoa/, t);
  const vegCount = (t.match(/onion|carrot|broccoli|cabbage|spinach|kale|tomato|pepper|zucchini|mushroom|beans|peas|corn|cucumber|lettuce|eggplant|cauliflower|bok choy|choy sum|celery/g) ?? []).length;
  const veg = Math.min(0.5, 0.15 + vegCount * 0.08);
  const pr = protein === 'veg' ? 0.15 : 0.35;
  const plate = { veg, protein: pr, carb: Math.max(0.1, carb ? 1 - veg - pr : 0.12) };
  const course = /\bsoup\b|\bbroth\b/.test(name.toLowerCase()) ? 'soup' : 'dish';
  return {
    cuisine, protein, course, flavours, spice, plate,
    vegetarian: protein === 'veg' || protein === 'tofu' || protein === 'egg',
    sodium: salty >= 3 ? 'high' : salty >= 1 ? 'med' : 'low', sugar: sweet >= 2 ? 'high' : sweet ? 'med' : 'low',
    satFat: fat >= 2 ? 'high' : fat ? 'med' : 'low', purine: protein === 'seafood' || has(/anchov|sardine|liver|offal|tripe/, t) ? 'high' : ['beef', 'pork', 'fish', 'chicken'].includes(protein) ? 'med' : 'low',
    emoji: protein === 'chicken' ? '🍗' : protein === 'pork' ? '🥓' : protein === 'beef' ? '🥩' : protein === 'fish' ? '🐟' : protein === 'seafood' ? '🦐' : protein === 'egg' ? '🥚' : '🍽️',
  };
}

/** Imported page data to a draft recipe in the app's format. No AI involved. The owner reviews it before it joins the book. */
export function importedToDraft(imp: Imported): Draft | null {
  const lines = imp.ingredients ?? [];
  if (!imp.name || lines.length < 2 || (imp.steps?.length ?? 0) < 3) return null;
  const parts = lines.map(splitIngredient);
  const raw: RawDraft = {
    ...guessDetails(imp.name, lines),
    name: imp.name,
    minutes: imp.minutes ?? 30,
    ingredients: parts.map((p) => ({ item: matchCatalogue(p.name), name: p.name.replace(/^./, (c) => c.toUpperCase()), qty: p.qty, aisle: aisleOf(p.name) })),
    steps: imp.steps,
  };
  const d = normaliseDraft(raw, cleanUrl(imp.url), imp.site);
  if (!d) return null;
  const { aiDrafted: _a, ...rest } = d.recipe;
  const image = cleanUrl(imp.image);
  const recipe = {
    ...rest,
    source: `Imported from ${imp.site}`,
    imported: true, importedAt: new Date().toISOString(),
    ...(image ? { imageUrl: image } : {}),
    ...(youtubeUrl(imp.video ?? undefined) ? { videoUrl: youtubeUrl(imp.video ?? undefined) } : {}),
    ...(imp.serves ? { serves: imp.serves } : {}),
  };
  return { recipe, newItems: d.newItems };
}
