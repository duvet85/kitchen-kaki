import { Condition, Member, Recipe } from '../types';

export const CONDITION_LABEL: Record<Condition, string> = {
  diabetes: 'Diabetes',
  hypertension: 'High blood pressure',
  cholesterol: 'High cholesterol',
  gout: 'Gout',
};

/** Dish features that matter for each condition. Rules of thumb only, not medical advice. */
export function healthFlags(r: Recipe, m: Member): string[] {
  const flags: string[] = [];
  for (const c of m.conditions) {
    if (c === 'diabetes' && (r.sugar === 'high' || r.plate.carb >= 0.5)) flags.push('high sugar/carbs');
    if (c === 'hypertension' && r.sodium === 'high') flags.push('high salt');
    if (c === 'cholesterol' && r.satFat === 'high') flags.push('high saturated fat');
    if (c === 'gout' && r.purine === 'high') flags.push('high purine (seafood/organ)');
  }
  return flags;
}

export function mildTip(r: Recipe, spiceCap: number): string | null {
  if (r.spice <= spiceCap) return null;
  return 'Cook it mild and serve chilli on the side';
}

/** Deep-fried or pan-fried in plenty of oil. */
export const isFried = (r: Recipe) => /fried|goreng/i.test(r.name);
const isRich = (r: Recipe) => r.satFat === 'high' || r.sugar === 'high' || isFried(r);
const isPlantProtein = (r: Recipe) => r.protein === 'tofu' || r.ingredients.some((i) => ['lentils', 'chickpeas'].includes(i.item));
const isRedMeat = (r: Recipe) => r.protein === 'pork' || r.protein === 'beef';
const isFish = (r: Recipe) => r.protein === 'fish' || r.protein === 'seafood';

/**
 * Balanced-diet score, built on Singapore HPB's "My Healthy Plate" and its dietary guidelines.
 * Rice or noodles are served alongside, so the dishes are scored on:
 *  - Veg per meal (35): each day's dishes should be about two parts vegetables to one part protein
 *    (the plate's half veg and quarter protein). Scored day by day, then averaged.
 *  - Protein mix over the week (25): fish or seafood at least twice a week (HPB), red meat (pork, beef)
 *    no more than 3 times a week (HPB: limit red meat; WCRF: under ~500g cooked a week), and tofu,
 *    lentils or beans at least twice.
 *  - Salt per day (20): HPB/WHO cap salt at 5g (one teaspoon) a day, so no more than one salty
 *    (sauce-heavy) dish in a day.
 *  - Fat and sugar (20): rich dishes (coconut milk, fatty cuts, sweet sauces, fried) at most about
 *    2 a week.
 * The score covers the cooked dishes only and assumes no fruit (the recipes contain none), so a week
 * without fruit is never marked down. Fruit is tracked separately on the Health tab.
 * Rules of thumb from public guidance, not a dietitian's individual advice.
 */
export function balanceScore(dishes: { recipe: Recipe; day: number }[]) {
  if (!dishes.length) return null;
  const dayNums = [...new Set(dishes.map((d) => d.day))].sort((a, b) => a - b);
  const target = 2 / 3;
  const days = dayNums.map((day) => {
    const rs = dishes.filter((d) => d.day === day).map((d) => d.recipe);
    const veg = rs.reduce((a, r) => a + r.plate.veg, 0);
    const protein = rs.reduce((a, r) => a + r.plate.protein, 0);
    const vegShare = veg / Math.max(0.01, veg + protein);
    const salty = rs.filter((r) => r.sodium === 'high').length;
    return { day, vegShare, vegPts: Math.max(0, 1 - Math.abs(vegShare - target) / target), salty };
  });
  const recipes = dishes.map((d) => d.recipe);

  const vegPts = (days.reduce((a, d) => a + d.vegPts, 0) / days.length) * 35;

  const fish = recipes.filter(isFish).length;
  const red = recipes.filter(isRedMeat).length;
  const plant = recipes.filter(isPlantProtein).length;
  const proteinPts = Math.min(1, fish / 2) * 10 + (red <= 3 ? 1 : Math.max(0, 1 - (red - 3) / 3)) * 8 + Math.min(1, plant / 2) * 7;

  const saltyDays = days.filter((d) => d.salty > 1).length;
  const saltPts = (1 - saltyDays / days.length) * 20;

  const rich = recipes.filter(isRich).length;
  const richPts = Math.max(0, 1 - Math.max(0, rich - 2) / 4) * 20;

  const total = Math.round(vegPts + proteinPts + saltPts + richPts);
  const grade = total >= 85 ? 'A' : total >= 70 ? 'B' : total >= 55 ? 'C' : 'D';
  const lowVeg = days.filter((d) => d.vegShare < 0.5);

  const tips: string[] = [];
  if (fish < 2) tips.push('Have fish at least twice a week (HPB). Oily fish like salmon or batang is best.');
  if (red > 3) tips.push(`Red meat (pork, beef) ${red} times this week. Keep it to about 3.`);
  if (plant < 2) tips.push('Add tofu, lentils or beans at least twice a week.');
  if (saltyDays) tips.push(`${saltyDays} day(s) have two salty dishes. Keep salt to one teaspoon a day: halve the sauce or use low-sodium soy.`);
  if (rich > 2) tips.push(`${rich} rich or fried dishes. About 2 a week is plenty.`);
  tips.push('Serve brown rice or mixed grains for the quarter plate of carbs.');

  return {
    total,
    grade,
    days,
    lowVeg,
    parts: [
      { label: 'Veg per meal', pts: Math.round(vegPts), max: 35, detail: lowVeg.length ? `${lowVeg.length} day(s) under half veg` : 'every day about half veg' },
      { label: 'Protein mix', pts: Math.round(proteinPts), max: 25, detail: `fish ${fish}× · red meat ${red}× · tofu/beans ${plant}×` },
      { label: 'Salt per day', pts: Math.round(saltPts), max: 20, detail: saltyDays ? `${saltyDays} salty day(s)` : 'at most 1 salty dish a day' },
      { label: 'Fat & sugar', pts: Math.round(richPts), max: 20, detail: `${rich} rich or fried dish(es)` },
    ],
    tips,
  };
}
