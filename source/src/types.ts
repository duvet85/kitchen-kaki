export type Lang = 'en' | 'tl' | 'id' | 'my' | 'zh';

export type Cuisine = 'chinese' | 'malay' | 'indian' | 'peranakan' | 'western' | 'japanese' | 'korean' | 'thai';
export type Protein = 'chicken' | 'pork' | 'beef' | 'fish' | 'seafood' | 'egg' | 'tofu' | 'veg';
export type Flavour = 'savoury' | 'sweet' | 'sour' | 'spicy' | 'herby';
export type Allergen = 'peanut' | 'shellfish' | 'fish' | 'egg' | 'dairy' | 'gluten' | 'soy' | 'treenut';
export type Condition = 'diabetes' | 'hypertension' | 'cholesterol' | 'gout';
export type Religion = 'none' | 'halal' | 'no-pork' | 'no-beef';
export type Level = 'low' | 'med' | 'high';
export type Spice = 0 | 1 | 2 | 3;

export interface TasteProfile {
  spice: Spice;
  cuisines: Cuisine[];
  proteins: Protein[];
  flavours: Flavour[];
  adventurous: 1 | 2 | 3;
}

export interface Member {
  id: string;
  name: string;
  ageGroup: 'child' | 'adult' | 'senior';
  vegetarian: boolean;
  religion: Religion;
  allergies: Allergen[];
  conditions: Condition[];
  taste?: TasteProfile;
}

export interface Ingredient {
  item: string; // key into the store catalogue
  qty: string;
}

export interface Translation {
  name: string;
  steps: string[];
  /** Ingredient names in the helper's language, in the same order as the recipe's ingredients. */
  ingredients?: string[];
}

export interface Recipe {
  id: string;
  name: string;
  emoji: string;
  cuisine: Cuisine;
  protein: Protein;
  flavours: Flavour[];
  spice: Spice;
  vegetarian: boolean;
  pork: boolean;
  beef: boolean;
  allergens: Allergen[];
  minutes: number;
  /** share of the dish that is vegetables vs protein vs carbs (sums to ~1) */
  plate: { veg: number; protein: number; carb: number };
  sodium: Level;
  sugar: Level;
  satFat: Level;
  purine: Level;
  ingredients: Ingredient[];
  steps: string[];
  /** dish names in each helper language (the steps are translated live with Gemini, not stored here) */
  i18n: Record<'tl' | 'id' | 'my', { name: string }> & { zh?: { name: string } };
  /** who the recipe comes from. Built-in recipes are "Kitchen Kaki original": written for this app, not copied from a site */
  source: string;
  /** web page the family says the recipe came from (only ever typed or pasted by a person, never made up by the AI) */
  sourceUrl?: string;
  /** site or channel the source link points to, from the search result */
  sourceName?: string;
  /** soups are planned separately from the day's dishes */
  course?: 'soup';
  /** breakfast, a drink or a dessert: kept in the recipe book but never planned into the week's dinners */
  meal?: Meal;
  /** simple food for someone unwell: only offered by Ask Kaki, never planned for the week */
  sickDay?: boolean;
  /** added by the family through Gemini; aiDrafted stays true so it keeps the "AI-drafted" mark */
  custom?: boolean;
  aiDrafted?: boolean;
  /** the family's own copy of a built-in or added dish, changed by Ask Kaki (less spice, another ingredient, lighter method); adaptedFrom is the dish it started as */
  aiAdapted?: boolean;
  adaptedFrom?: string;
  /** brought in from a web page's own recipe data (not written by AI); the page link stays as sourceUrl */
  imported?: boolean;
  importedAt?: string;
  /** the site's photo, linked (not copied) and credited to the site; shown when there is no bundled photo */
  imageUrl?: string;
  /** a YouTube video of this dish: from the page's own recipe data, a link on the page, a search result, or pasted by a person (never made up). Opened as a link, not copied */
  videoUrl?: string;
  /** how many the imported quantities serve, as the page states it */
  serves?: string;
  /** the family's own notes, typed in when they added the recipe by hand */
  notes?: string;
}

/** meal types shown on the recipe book's Meals tab */
export type Meal = 'breakfast' | 'lunch' | 'drink' | 'dessert';

/** the meals that can be planned into the week besides dinner */
export type PlannedMealKind = 'breakfast' | 'lunch';

/** a breakfast or lunch on a day of the week (one per kind per day) */
export interface PlannedMeal { recipeId: string; day: number; meal: PlannedMealKind }

/** a category made by the family, shown on the recipe book's Mine tab */
export interface Collection { id: string; name: string; emoji: string; ids: string[] }

export interface PlannedDish {
  recipeId: string;
  day: number; // 0 = Monday
  isNew: boolean;
  /** added to the day by hand, on top of the usual dishes */
  added?: boolean;
  /** part of a cooking lesson (the lesson's id) */
  lesson?: string;
}

/** A whole week's menu the owner saved under a name ("Menu A") to bring back later. Only recipe ids and days: the rules are checked again when it is used. */
export interface SavedMenu {
  id: string;
  name: string;
  savedAt: string;
  dishes: { recipeId: string; day: number; added?: boolean }[];
  meals?: { recipeId: string; day: number; meal: 'breakfast' | 'lunch' }[];
}

export interface WeekPlan {
  weekNo: number;
  weekOf: string;
  dishes: PlannedDish[];
  /** breakfasts and lunches, when the owner switched them on (dinner and soups are in `dishes`) */
  meals?: PlannedMeal[];
  /** draft: owner is reviewing. confirmed: sent to the helper. */
  status: 'draft' | 'confirmed';
  confirmedAt?: string;
  cooked: string[];
  /** when each planned dish (dishKey) was marked cooked */
  cookedAt?: Record<string, string>;
}

export interface Settings {
  daysPerWeek: number;
  dishesPerDay: number;
  /** new dishes per day once the family menu has settled */
  newPerDay: number;
  /** 0 = no budget */
  weeklyBudget: number;
  /** soups spread over the week (older saved data has none set: see soupsPerWeek()) */
  soupsPerWeek?: number;
  /** the days the owner picked for soups (0 = Monday). Missing = spread out automatically; fewer than soupsPerWeek = the rest are spread out */
  soupDays?: number[];
  helperLang: Lang;
  /** What the family calls the person who cooks. Default "Cook". */
  cookLabel?: string;
  /** The language of the cook's home country. Only this language (plus English) is offered and translated. */
  cookLang?: Lang;
  /** breakfast and lunch to plan besides dinner (missing = dinner only) */
  meals?: { breakfast?: boolean; lunch?: boolean };
}

export interface AppState {
  members: Member[];
  /** one collective family rating per dish, 1..5 */
  ratings: Record<string, number>;
  /** dishes the family has had on a confirmed menu */
  history: string[];
  lastWeek: string[];
  settings: Settings;
  plan: WeekPlan | null;
  bought: string[];
  /** helper's cooking progress per dish (recipeId -> steps ticked off) */
  cooking: Record<string, { step: number; done: number[] }>;
  timers: CookTimer[];
  refreshCount: number;
  /** translations made with the owner's Gemini key: recipeId -> lang -> text */
  aiTranslations: Record<string, Partial<Record<Exclude<Lang, 'en'>, Translation>>>;
  /** things to pick up on the shopping run beyond the recipes (dish soap, batteries, fruit…) */
  extras: ExtraItem[];
  /** recent last-minute menu changes, shown to the helper */
  helperNotes: HelperNote[];
  /** items not in the shop: catalogue key -> what was bought instead (null = skipped) */
  shopSwaps?: Record<string, ShopSwap>;
  /** shopping list names the family typed over the app's own ("Whole seabass" for "Seabass fillet"), by shop item key; synced so the cook sees them */
  shopNames?: Record<string, string>;
  /** days of this week's menu that fruit was served (tracked apart from the diet score) */
  fruitDays?: number[];
  /** shop items needed because the menu changed after it was sent (catalogue keys); shown as NEW to the helper until bought */
  lateItems?: string[];
  /** web recipe searches made today, to keep Google Search use small */
  searchLog?: { day: string; n: number };
  /** recipes the family added to the recipe book */
  customRecipes?: Recipe[];
  /** shop items those recipes need that the catalogue doesn't have: key -> item */
  customItems?: Record<string, { name: string; price: number; pack: string; aisle: string; alternatives: string[] }>;
  /** the family's own photo of a dish. path = file in the family's private Supabase Storage (otherwise kept on this phone only);
   *  stock = show the stock photo instead (the family photo is kept) */
  userPhotos?: Record<string, { path?: string; at: string; by?: string; stock?: boolean }>;
  /** the owner switched off the web-recipe features (import from a link, web search, refresh) */
  webRecipesOff?: boolean;
  /** dishes someone hearted in the recipe book */
  favourites?: string[];
  /** the family's own meal type for a dish (overrides the recipe's own); 'none' = a normal dinner dish */
  mealOf?: Record<string, Meal | 'none'>;
  /** categories the family made themselves, with the dishes in each */
  collections?: Collection[];
  /** whole-week menus the owner saved by name, to use again */
  savedMenus?: SavedMenu[];
  /** Kitchen tab: cooking lessons for the helper */
  lessons?: Lesson[];
  /** Kitchen tab: thanks, tips, mastered dishes and cooking milestones (points are worked out from this) */
  kitchenLog?: KitchenEvent[];
  /** Kitchen tab: tips the family asked to show each time a dish is cooked (recipeId -> tip keys) */
  dishTweaks?: Record<string, TipTag[]>;
  /** Kitchen tab: how sure the helper feels cooking each dish alone, 1 to 5 (her own rating) */
  confidence?: Record<string, number>;
  /** Recipe book > Browse: the family's own list of recipe websites (the suggested ones can be hidden or renamed too) and which opened last time */
  recipeSites?: RecipeSites;
  /** Recipe book > Browse and save: links saved from a recipe website, waiting for the owner to check them */
  savedLinks?: SavedLink[];
  /** Learn While You Cook: what happened each time she cooked a dish (her own words, never a score) */
  learning?: Learning;
  /** Kitchen tab: recognition settings */
  recognition?: { on: boolean; helper: string; hidePoints?: boolean; seen?: string[] };
  /** next week's menu while the owner drafts it; the cook keeps working from `plan` (the sent week) until this one is sent */
  nextPlan?: WeekPlan | null;
  /** app recipes the family deleted: gone from the recipe book and never planned (their own recipes are removed outright) */
  hiddenRecipes?: string[];
  /** the recipe book group the family chose for a dish (Chicken, Pork, Vegetables…), over the recipe's own main ingredient */
  typeOf?: Record<string, Protein>;
  /** the weeks before the current one, as they were when the next week was sent, newest last, so a sent week can be taken back */
  pastWeeks?: WeekSnapshot[];
}

/** Everything that belongs to one sent week (the menu and its shopping), kept so the owner can go back to it. */
export interface WeekSnapshot {
  plan: WeekPlan;
  history: string[];
  lastWeek: string[];
  bought: string[];
  shopSwaps?: Record<string, ShopSwap>;
  shopNames?: Record<string, string>;
  fruitDays?: number[];
  lateItems?: string[];
  helperNotes: HelperNote[];
}

/** How a dish is mainly cooked; a lesson teaches one soup, one steamed or braised dish and one stir-fry. */
export type CookMethod = 'soup' | 'steam' | 'braise' | 'stirfry' | 'fry' | 'other';

export interface LessonStep {
  /** minutes from the start of the lesson (negative: before the lesson) */
  at: number;
  until: number;
  recipeId?: string;
  kind: 'teach' | 'prep' | 'cook' | 'taste' | 'tidy' | 'early';
}

export interface Lesson {
  id: string;
  status: 'planned' | 'done' | 'cancelled';
  /** YYYY-MM-DD */
  date: string;
  /** "10:00" */
  start: string;
  teacher: string;
  dishes: { recipeId: string; method: CookMethod }[];
  lang: Lang;
  timeline: LessonStep[];
  /** per recipe; English, then the helper's language */
  tips?: Record<string, { knife: string[]; heat: string[] }>;
  tipsTr?: Record<string, { knife: string[]; heat: string[] }>;
  pickedBy: 'gemini' | 'rules' | 'owner';
  menuMode: 'dinner' | 'extra' | 'separate';
  placed?: { weekOf: string; day: number };
  notes?: string;
  /** helper's own confidence per recipe, 1 to 5 */
  confidence?: Record<string, number>;
  createdAt: string;
  doneAt?: string;
}

/** Feedback chips: praise, and small things to adjust next time. */
export type TipTag = 'delicious' | 'justright' | 'kidsloved' | 'thanks' | 'salty' | 'bland' | 'spicy' | 'mild' | 'oily' | 'sweet' | 'undercooked' | 'overcooked' | 'smaller';

export interface KitchenEvent {
  id: string;
  at: string;
  /** the helper's name, so a new helper starts fresh */
  helper: string;
  kind: 'mastered' | 'lesson' | 'newDish' | 'onTime' | 'fullWeek' | 'thanks' | 'tip';
  recipeId?: string;
  lessonId?: string;
  /** mastered: how it was confirmed */
  via?: 'lesson' | 'cooked' | 'check';
  /** onTime / newDish: the planned dish (dishKey) and week, so un-ticking can take it back */
  dish?: string;
  weekOf?: string;
  tags?: TipTag[];
  note?: string;
  noteTr?: Partial<Record<Lang, string>>;
  by?: string;
  /** thanks and tips: a Kitchen Kaki sticker the family added (see KakiScenes) */
  sticker?: string;
  /** tips: the helper tapped "Got it" */
  seen?: boolean;
  /** removed by the owner: no points, hidden from the helper */
  undone?: boolean;
}

export interface ShopSwap {
  to: string | null;
  by?: string;
  at: string;
}

export interface ExtraItem {
  id: string;
  name: string;
  note?: string;
  done: boolean;
}

export interface HelperNote {
  id: string;
  at: string;
  /** how: cook the same dish lighter (to === from). subs: use one kitchen item in place of another. */
  changes: { day: number; from: string; to: string; kind?: 'add' | 'remove'; how?: ('noChilli' | 'steam' | 'lessSalt' | 'lessOil')[]; subs?: { need: string; use: string }[] }[];
}

export interface CookTimer {
  id: string;
  recipeId: string;
  step: number;
  label: string;
  totalSec: number;
  /** epoch ms when it ends; null while paused */
  endsAt: number | null;
  /** seconds left, kept while paused */
  leftSec: number;
}

export type Difficulty = 'cutting' | 'heat' | 'flavour' | 'timing' | 'words';
export interface Learning {
  /** times cooked with the app, the latest difficulties she ticked, and when */
  tries?: Record<string, { n: number; hard: Difficulty[]; last: string }>;
}

export interface SavedLink {
  id: string;
  url: string;
  at: string;
  /** reading the page; ready to check (draft); the page has no recipe data this app can read (look); failed; added to the book */
  status: 'reading' | 'ready' | 'look' | 'failed' | 'added';
  name?: string;
  /** the family's category (Collection id) it joins once added */
  collection?: string;
  error?: string;
  draft?: { recipe: Recipe; newItems: NonNullable<AppState['customItems']> };
}

export interface RecipeSites {
  custom?: { id: string; name: string; url: string }[];
  /** suggested sites the owner removed (their addresses) */
  hidden?: string[];
  /** new names for suggested sites (address -> name) */
  renamed?: Record<string, string>;
  /** whether the window opened the site last time, by host */
  works?: Record<string, 'ok' | 'fail'>;
}
