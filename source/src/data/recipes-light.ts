import { Recipe } from '../types';

const SOURCE = 'Kitchen Kaki original';

/**
 * Simple food for someone unwell. Never planned for the week: Ask Kaki offers these
 * when someone needs light food, made from what's already in the kitchen
 * (the chicken or fish can be any cut that was bought). Draft translations.
 */
export const LIGHT_RECIPES: Recipe[] = [
  {
    id: 'chicken-porridge', name: 'Chicken Porridge', emoji: '🥣', sickDay: true,
    cuisine: 'chinese', protein: 'chicken', flavours: ['savoury'], spice: 0,
    vegetarian: false, pork: false, beef: false, allergens: [], minutes: 60,
    plate: { veg: 0.1, protein: 0.3, carb: 0.6 }, sodium: 'low', sugar: 'low', satFat: 'low', purine: 'low',
    ingredients: [{ item: 'rice', qty: '1 cup' }, { item: 'chicken-thigh', qty: '2 pieces' }, { item: 'ginger', qty: '4 slices' }, { item: 'spring-onion', qty: '1 stalk' }],
    steps: [
      "Wash the rice in a bowl, rubbing gently and changing the water 2 or 3 times until it is less cloudy. Drain well.",
      "Peel the ginger. Cut 2 slices into thin matchsticks for the topping and keep the other 2 slices whole for the pot.",
      "Rinse the chicken thighs and pat dry. Rub with a pinch of salt and set aside.",
      "Put the rice, 8 cups of water and the whole ginger slices into a large pot. Bring to the boil on high heat.",
      "Lower the heat to low, put the lid on slightly open, and simmer for 30 minutes. Stir from the bottom every 5 minutes so the rice does not stick.",
      "Add the chicken thighs whole, submerging them in the porridge. Keep the heat low and cook for 15 minutes until cooked through.",
      "Take out the chicken and check that there is no pink in the centre. Let it cool for a few minutes, then shred the meat with 2 forks, discarding the bones and skin.",
      "Return the shredded chicken to the pot and stir. If the porridge is too thick, add a little hot water.",
      "Season with salt and a pinch of ground pepper. Wash the spring onion and slice thinly.",
      "Ladle into bowls. Top with the ginger matchsticks, spring onion and a drizzle of cooking oil if you like. Serve hot.",
    ],
    i18n: {
      tl: { name: 'Lugaw na may Manok' },
      id: { name: 'Bubur Ayam' },
      my: { name: 'ကြက်သားဆန်ပြုတ်' },
    },
    source: SOURCE,
  },
  {
    id: 'fish-porridge', name: 'Fish Porridge', emoji: '🥣', sickDay: true,
    cuisine: 'chinese', protein: 'fish', flavours: ['savoury'], spice: 0,
    vegetarian: false, pork: false, beef: false, allergens: ['fish'], minutes: 45,
    plate: { veg: 0.1, protein: 0.3, carb: 0.6 }, sodium: 'low', sugar: 'low', satFat: 'low', purine: 'med',
    ingredients: [{ item: 'rice', qty: '1 cup' }, { item: 'fish-seabass', qty: '200g' }, { item: 'ginger', qty: '4 slices' }],
    steps: [
      "Wash the rice in a bowl, rubbing gently and changing the water 2 or 3 times until it is less cloudy. Drain well.",
      "Peel the ginger. Cut 2 slices into thin matchsticks for the topping and keep the other 2 slices whole for the pot.",
      "Put the rice, 8 cups of water and the whole ginger slices into a large pot. Bring to the boil on high heat.",
      "Lower the heat to low, put the lid on slightly open, and simmer for 30 minutes. Stir from the bottom every 5 minutes so the rice does not stick.",
      "While it cooks, rinse the sea bass fillet and pat dry. Check for small bones with your fingers and remove any.",
      "Slice the fish thinly, about 5mm thick. Mix with a pinch of salt, a pinch of ground pepper and the ginger matchsticks.",
      "The porridge should be thick and creamy. If it is too thick, add a little hot water. Bring it back to a gentle boil.",
      "Add the fish slices one by one and stir gently. Cook for 3 minutes until the fish turns white all the way through.",
      "Season with salt and ground pepper to taste. Serve hot in bowls, topped with a drizzle of cooking oil if you like.",
    ],
    i18n: {
      tl: { name: 'Lugaw na may Isda' },
      id: { name: 'Bubur Ikan' },
      my: { name: 'ငါးဆန်ပြုတ်' },
    },
    source: SOURCE,
  },
  {
    id: 'egg-porridge', name: 'Plain Porridge with Steamed Egg', emoji: '🥚', sickDay: true,
    cuisine: 'chinese', protein: 'egg', flavours: ['savoury'], spice: 0,
    vegetarian: true, pork: false, beef: false, allergens: ['egg'], minutes: 45,
    plate: { veg: 0.05, protein: 0.3, carb: 0.65 }, sodium: 'low', sugar: 'low', satFat: 'low', purine: 'low',
    ingredients: [{ item: 'rice', qty: '1 cup' }, { item: 'egg', qty: '3' }],
    steps: [
      "Wash the rice in a bowl, rubbing gently and changing the water 2 or 3 times until it is less cloudy. Drain well.",
      "Put the rice and 8 cups of water into a large pot. Bring to the boil on high heat.",
      "Lower the heat to low, put the lid on slightly open, and simmer for 30 minutes. Stir from the bottom every 5 minutes so the rice does not stick.",
      "While the porridge cooks, crack the 3 eggs into a heatproof bowl and beat gently with a fork. Avoid making too many bubbles.",
      "Measure the same amount of warm water as the beaten egg, using the egg-filled cup as a guide. Mix it in with a pinch of salt.",
      "Pour the egg mixture through a sieve into a shallow heatproof dish to remove bubbles and make the egg smooth.",
      "Set up a steamer or a large pot with a rack and 3cm of water. Bring the water to a gentle boil on medium heat.",
      "Cover the dish loosely with a plate or foil and place it in the steamer. Steam on low heat for 10 minutes until the egg is just set and wobbles slightly.",
      "Check by pressing the middle: it should be firm with no liquid egg. Season the porridge with a pinch of salt and stir.",
      "Ladle the porridge into bowls, spoon the steamed egg on top, and add a tiny pinch of ground pepper. Serve hot.",
    ],
    i18n: {
      tl: { name: 'Lugaw na may Steamed na Itlog' },
      id: { name: 'Bubur Putih dan Telur Kukus' },
      my: { name: 'ဆန်ပြုတ်နှင့် ကြက်ဥပေါင်း' },
    },
    source: SOURCE,
  },
];
