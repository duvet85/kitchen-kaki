import { AppState } from '../types';

/** A sample household so the prototype has something to show on first launch. */
export const DEMO_STATE: AppState = {
  members: [
    {
      id: 'm1', name: 'Dad', ageGroup: 'adult', vegetarian: false, religion: 'none', allergies: [], conditions: ['cholesterol'],
      taste: { spice: 3, cuisines: ['malay', 'peranakan', 'korean'], proteins: ['beef', 'fish', 'chicken'], flavours: ['spicy', 'savoury'], adventurous: 3 },
    },
    {
      id: 'm2', name: 'Mum', ageGroup: 'adult', vegetarian: false, religion: 'no-beef', allergies: [], conditions: [],
      taste: { spice: 2, cuisines: ['japanese', 'indian', 'thai'], proteins: ['fish', 'tofu', 'veg'], flavours: ['savoury', 'herby', 'sour'], adventurous: 2 },
    },
    {
      id: 'm3', name: 'Ethan (8)', ageGroup: 'child', vegetarian: false, religion: 'none', allergies: ['shellfish'], conditions: [],
      taste: { spice: 0, cuisines: ['western', 'japanese', 'korean'], proteins: ['chicken', 'pork'], flavours: ['sweet', 'savoury'], adventurous: 1 },
    },
    {
      id: 'm4', name: 'Ah Ma', ageGroup: 'senior', vegetarian: false, religion: 'none', allergies: [], conditions: ['hypertension', 'diabetes'],
    },
  ],
  ratings: {},
  history: [],
  lastWeek: [],
  settings: { daysPerWeek: 5, dishesPerDay: 2, newPerDay: 1, weeklyBudget: 0, soupsPerWeek: 2, helperLang: 'tl' },
  plan: null,
  bought: [],
  cooking: {},
  timers: [],
  refreshCount: 0,
  aiTranslations: {},
  extras: [],
  helperNotes: [],
};
