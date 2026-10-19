import { AppState, BookType, Meal, Recipe } from '../types';

export interface Group { id: string; title: string; emoji: string; recipes: Recipe[] }
export const TABS = ['Types', 'Meals', 'Mine', 'Cuisines', 'Favourites', 'Recent'] as const;
export type Tab = (typeof TABS)[number];

export const MEALS: { id: Meal; title: string; emoji: string }[] = [
  { id: 'breakfast', title: 'Breakfast', emoji: '🍳' },
  { id: 'lunch', title: 'Lunch', emoji: '🍱' },
  { id: 'drink', title: 'Drinks', emoji: '🥤' },
  { id: 'dessert', title: 'Desserts', emoji: '🍮' },
];

/** A dish's meal type: the family's own choice first, else the recipe's own. undefined = a normal dinner dish. */
export function mealFor(r: Recipe, state: Pick<AppState, 'mealOf'>): Meal | undefined {
  const m = state.mealOf?.[r.id];
  return m === 'none' ? undefined : m ?? r.meal;
}

/** The recipe book group of a dish: the family's own choice first, else the recipe's main ingredient. */
type TypeState = Pick<AppState, 'typeOf'> & Partial<Pick<AppState, 'customItems'>>;
const MUSHROOM = /mushroom|shiitake|enoki|shimeji|fungus|portobello/i;
/** the groups a dish shows under before the family changes anything: its main ingredient, plus Mushroom when it uses mushrooms */
export function defaultTypes(r: Recipe, state: TypeState): BookType[] {
  const mush = r.ingredients.some((i) => MUSHROOM.test(i.item) || MUSHROOM.test(state.customItems?.[i.item]?.name ?? ''));
  return mush ? [r.protein, 'mushroom'] : [r.protein];
}
/** the groups a dish shows under: the family's choice (one or several), else its defaults */
export function typesFor(r: Recipe, state: TypeState): BookType[] {
  const t = state.typeOf?.[r.id];
  return t == null ? defaultTypes(r, state) : Array.isArray(t) ? (t.length ? t : defaultTypes(r, state)) : [t];
}
const isType = (r: Recipe, state: TypeState, p: BookType) => typesFor(r, state).includes(p);
export const TYPES: { id: BookType; title: string; emoji: string }[] = [
  { id: 'chicken', title: 'Chicken', emoji: '🍗' }, { id: 'pork', title: 'Pork', emoji: '🥓' }, { id: 'beef', title: 'Beef', emoji: '🥩' },
  { id: 'fish', title: 'Fish', emoji: '🐟' }, { id: 'seafood', title: 'Seafood', emoji: '🦐' }, { id: 'egg', title: 'Eggs', emoji: '🥚' },
  { id: 'tofu', title: 'Tofu', emoji: '🧈' }, { id: 'veg', title: 'Vegetables', emoji: '🥦' },
  { id: 'mushroom', title: 'Mushroom', emoji: '🍄' },
];

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const CUISINE_EMOJI: Record<string, string> = { chinese: '🥢', malay: '🍛', indian: '🫓', peranakan: '🍲', western: '🍝', japanese: '🍱', korean: '🥘', thai: '🌶️' };

/** The tiles of one tab of the recipe book. Groups with no recipes are left out. */
export function groupsFor(tab: Tab, recipes: Recipe[], state: AppState): Group[] {
  const by = (pred: (r: Recipe) => boolean) => recipes.filter(pred);
  const mk = (id: string, title: string, emoji: string, list: Recipe[]): Group => ({ id, title, emoji, recipes: list });
  let groups: Group[] = [];
  if (tab === 'Types') {
    const dish = (r: Recipe) => r.course !== 'soup' && !mealFor(r, state);
    groups = [
      mk('all', 'All recipes', '📖', recipes),
      mk('soups', 'Soups', '🍜', by((r) => r.course === 'soup' && !mealFor(r, state))),
      mk('breakfast', 'Breakfast', '🍳', by((r) => mealFor(r, state) === 'breakfast')),
      mk('lunch', 'Lunch', '🍱', by((r) => mealFor(r, state) === 'lunch')),
      mk('chicken', 'Chicken', '🍗', by((r) => dish(r) && isType(r, state, 'chicken'))),
      mk('pork', 'Pork', '🥓', by((r) => dish(r) && isType(r, state, 'pork'))),
      mk('beef', 'Beef', '🥩', by((r) => dish(r) && (isType(r, state, 'beef') || (!state.typeOf?.[r.id] && r.beef && r.protein === 'veg')))),
      mk('fish', 'Fish', '🐟', by((r) => dish(r) && isType(r, state, 'fish'))),
      mk('seafood', 'Seafood', '🦐', by((r) => dish(r) && isType(r, state, 'seafood'))),
      mk('eggtofu', 'Eggs & tofu', '🥚', by((r) => dish(r) && (isType(r, state, 'egg') || isType(r, state, 'tofu')))),
      mk('veg', 'Vegetables', '🥦', by((r) => dish(r) && isType(r, state, 'veg') && (!!state.typeOf?.[r.id] || (!r.beef && !r.pork)))),
      mk('mushroom', 'Mushroom', '🍄', by((r) => dish(r) && isType(r, state, 'mushroom'))),
    ];
  } else if (tab === 'Meals') {
    // always shown, even when empty, so the family can see where to put things
    return MEALS.map((m) => mk(m.id, m.title, m.emoji, by((r) => mealFor(r, state) === m.id)));
  } else if (tab === 'Mine') {
    const ids = new Set(recipes.map((r) => r.id));
    return (state.collections ?? []).map((c) => mk(c.id, c.name, c.emoji, c.ids.filter((id) => ids.has(id)).map((id) => recipes.find((r) => r.id === id)!)));
  } else if (tab === 'Cuisines') {
    const names = [...new Set(recipes.map((r) => r.cuisine))].sort();
    groups = names.map((c) => mk(c, cap(c), CUISINE_EMOJI[c] ?? '🍽️', by((r) => r.cuisine === c)));
  } else if (tab === 'Favourites') {
    const hearted = new Set(state.favourites ?? []);
    groups = [
      mk('hearted', 'Our favourites', '❤️', by((r) => hearted.has(r.id))),
      mk('loved', 'Loved by the family', '⭐', by((r) => (state.ratings[r.id] ?? 0) >= 4)),
    ];
  } else {
    const inPlan = new Set(state.plan?.dishes.map((d) => d.recipeId));
    const added = [...(state.customRecipes ?? [])].reverse();
    groups = [
      mk('week', "This week's menu", '📅', by((r) => inPlan.has(r.id))),
      mk('added', 'Added by you', '➕', added.filter((r) => recipes.includes(r))),
      mk('own', 'With our own photo', '📷', by((r) => !!state.userPhotos?.[r.id])),
    ];
  }
  return groups.filter((g) => g.recipes.length > 0);
}

/** The recipe whose photo covers a tile: the first one with any photo, else the first one. */
export function coverOf(g: Group, state: AppState, hasStock: (r: Recipe) => boolean): Recipe | undefined {
  if (g.id === 'all') { const fav = g.recipes.find((r) => r.id === 'chicken-rice'); if (fav) return fav; }
  return g.recipes.find((r) => state.userPhotos?.[r.id] || hasStock(r)) ?? g.recipes[0];
}
