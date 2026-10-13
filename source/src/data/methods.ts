import { CookMethod, Recipe } from '../types';

/**
 * How each built-in dish is mainly cooked, tagged by hand from its steps.
 * Lessons teach one soup, one steamed or braised dish and one stir-fry, because the three
 * use the stove in different ways and can cook side by side in two hours.
 */
const METHOD: Record<string, CookMethod> = {
  // soups
  'kimchi-tofu-soup': 'soup', 'tom-yum-soup': 'soup', 'abc-soup': 'soup', 'old-cucumber-soup': 'soup', 'lotus-root-soup': 'soup',
  'watercress-soup': 'soup', 'winter-melon-soup': 'soup', 'spinach-egg-soup': 'soup', 'sup-sayur': 'soup', rasam: 'soup',
  'fish-tofu-soup': 'soup', 'sup-ayam': 'soup',
  // steamed
  'steamed-fish': 'steam', 'steamed-pork-tofu': 'steam',
  // braised, simmered, curries
  dakjjim: 'braise', 'ayam-serai': 'braise', 'chap-chye': 'braise', 'fish-curry': 'braise', 'chana-masala': 'braise', 'dhal-curry': 'braise',
  'ayam-masak-merah': 'braise', 'beef-rendang': 'braise', 'assam-fish': 'braise', 'chicken-curry': 'braise', 'tau-yew-bak': 'braise',
  'sayur-lodeh': 'braise', 'teriyaki-chicken': 'braise',
  // stir-fried in a wok
  japchae: 'stirfry', 'pad-krapow': 'stirfry', 'tomato-egg': 'stirfry', 'black-pepper-chicken': 'stirfry', 'garlic-kailan': 'stirfry',
  'garlic-brinjal': 'stirfry', 'sambal-kangkong': 'stirfry', 'egg-tofu-veg': 'stirfry', 'garlic-broccoli': 'stirfry', 'prawn-chye-sim': 'stirfry',
  // pan-fried, baked or other
  'gyeran-mari': 'fry', 'ikan-goreng-kunyit': 'fry', 'chicken-chop': 'fry', 'sweet-sour-pork': 'fry', 'miso-salmon': 'other',
  'chicken-rice': 'other', 'spaghetti-bolognese': 'other', 'chicken-porridge': 'other', 'fish-porridge': 'other', 'egg-porridge': 'other',
};

/** A family-added recipe has no tag, so it is guessed from its steps (soups are always soups). */
export function methodOf(r: Recipe): CookMethod {
  if (r.course === 'soup') return 'soup';
  const m = METHOD[r.id];
  if (m) return m;
  const text = `${r.name} ${r.steps.join(' ')}`.toLowerCase();
  if (/\bsteam/.test(text)) return 'steam';
  if (/stir-fry|stir fry|\bwok\b/.test(text)) return 'stirfry';
  if (/simmer|braise|stew|curry/.test(text)) return 'braise';
  if (/\bfry|fried|goreng|bake|grill/.test(text)) return 'fry';
  return 'other';
}

/** The three lesson slots. */
export type Slot = 'soup' | 'slow' | 'wok';
export const SLOTS: Slot[] = ['soup', 'slow', 'wok'];
export const slotOf = (m: CookMethod): Slot | null => (m === 'soup' ? 'soup' : m === 'steam' || m === 'braise' ? 'slow' : m === 'stirfry' ? 'wok' : null);
export const SLOT_LABEL: Record<Slot, string> = { soup: 'Soup', slow: 'Steam or braise', wok: 'Stir-fry' };
export const SLOT_ICON: Record<Slot, string> = { soup: '🍲', slow: '♨️', wok: '🔥' };
