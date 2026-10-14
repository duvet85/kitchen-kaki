# Kitchen Kaki (prototype)

Cooking app for Singapore households with a domestic helper. Expo / React Native, so one codebase builds for Android and iOS (and web for previews).

## Run it
```bash
npm install
npx expo start        # scan the QR code with the Expo Go app on Android or iPhone
npx expo start --web  # browser preview
```

## What's in it (maps to the 8 steps)
| Step | Where | Prototype behaviour |
|---|---|---|
| 1 Add family | Family tab | Name, age group, vegetarian, halal / no pork / no beef, allergies, health conditions |
| 2 Taste quiz | Family tab → Take taste quiz | 5 questions: spice, cuisines, proteins, flavours, appetite for new dishes |
| 3 Weekly menu | Menu tab | Settings: cooking days, dishes per day, soups per week (spread over the week, 0 to one a day), new dishes per day once settled, optional weekly budget. The app drafts the week day by day; only the owner sees the draft. Owner swaps or removes dishes, adds a dish or soup to any day, then confirms. Swaps keep a soup a soup |
| 3b Helper | Helper tab | After confirmation only: recipes by day and one combined shopping list, translated to Tagalog / Bahasa Indonesia / Burmese |
| Cooking mode | Helper tab → Start cooking | One step at a time in the helper's language: ingredient check, step tracker bar, Back/Next, one-tap timers for any step that mentions a time (several can run at once, pause/dismiss), vibration and a "Time's up" banner, progress saved so the helper can leave and resume; Finish marks the dish cooked |
| 4 Grocery run | Helper tab → Shopping list | Grouped by aisle, tick-off, estimated total, a "Not available" tick on each item (the helper ticks it and the alternatives show straight away); pantry items listed separately |
| Cost | Menu tab | Estimated cost per dish (shared items split) and per week, compared against the budget; with a budget, cheaper dishes are preferred |
| 5 Ratings + new-dish rotation | Ratings tab, Menu tab | One family star rating per dish. 4-5★ = favourite, 2-3★ = kept as is, 1★ = removed from future menus (can be brought back). Week 1 is all new; each week reuses up to half of the favourites found so far, until there are 2 weeks' worth, then it settles at N new dishes per day |
| 6 Balanced diet | Health tab | Score out of 100 based on HPB "My Healthy Plate" |
| 7 Illness / veg / allergy / religion | Menu, Health tabs | Allergies and religious rules remove dishes automatically; health conditions flag dishes per person |
| 8 Spice level | Everywhere | Chilli rating per dish; shared dishes capped at the lowest tolerance, with "chilli on the side" tips. When someone can't take the heat, at most one dish a day (soups included) is spicier than they can eat; planning, swaps, added dishes and Ask Kaki all keep to this |
| Tablets and rotation | iPad and Android tablets, phones held sideways | Portrait and landscape on both phones and tablets. Left navigation rail instead of bottom tabs on tablets and on phones held sideways (compact there), 2 to 4 column layouts, larger type; cooking mode splits into two panes in landscape on tablets and phones (ingredients and step list on the left, current step and timers on the right); screen stays awake while cooking; rotation allowed |
| Gemini key | Settings tab | Owner pastes their own Gemini API key; it is checked with Google, then kept only on the device (Keychain/Keystore via expo-secure-store; browser storage in the web preview), shown masked, removable. Models are hardcoded in one list (`src/ai/models.ts`, same list in the Edge Function): the app tries them best first and moves to the next on unavailable, over-quota or busy errors. With a key, the Helper tab offers "Translate" to translate the week's recipes live (only recipe text is sent); translations are cached and marked "Gemini". Without a key the built-in sample translations are used |
| Family sharing | Settings tab | One family shared across phones through the owner's free Supabase project (`supabase/schema.sql`, anonymous sign-in, row-level security). Invite a parent or the helper by WhatsApp; the helper's phone only shows the Helper and Settings tabs. Live updates via Supabase Realtime, last change wins. With sharing on, translations go through the `translate` Edge Function, which holds the Gemini key as a secret. Setup steps: SETUP-FAMILY.md |
| Ask Kitchen Kaki | "Ask Kaki" button (owner and parents) | Chat for last-minute hiccups: someone unwell (light food), an ingredient missing, no time, vegetarian day, no chilli. Reads the message with simple rules on the phone; if it can't, offers to ask Gemini (only the message is sent, after the user taps). Swaps the affected dishes for ones that fit, preferring what's already bought, adds anything new to the shopping run, and shows the helper a "Menu changed" note in their language |
| Taste quiz | Family tab | Starts straight from preferences, with no assumptions: spice, "Which kinds of dishes do you enjoy?" (Chinese, Malay, Indian, Peranakan, Western, Japanese, Korean, Thai dishes, pick any), proteins, flavours, appetite for new dishes |
| 4★ dish per person per day | Menu tab | Each day tries to include at least one dish every quizzed member would likely rate 4★ or 5★ (quiz match nudged by family ratings). Dish cards show who it suits; a day with a gap is flagged |
| Choose dishes yourself | Menu tab | Tap a dish name or photo for photo, ingredients, steps and likely stars per person. "+ Dish", "+ Soup" and swap open a list (best matches first, then A to Z, with search and a preview eye). Any dish can repeat on other days. Swap offers "No change" |
| Balanced diet score | Health tab | Fruit-free score of the cooked dishes, based on HPB's "My Healthy Plate" (no penalty when there is no fruit): veg vs protein per day (35), protein mix over the week (25: fish 2x+, red meat 3x or fewer, tofu or beans 2x+), salt per day (20: one salty dish a day, 5g salt limit), fat and sugar (20). Day-by-day veg bars. "Make it more balanced" offers up to 3 dishes per suggestion, "Pick myself" and "No change"; nothing changes without a tap. Fruit has its own optional card (tick the days fruit is served; add fruit to the shopping run). Not reviewed by a dietitian |
| Light food from what's bought | Ask Kaki | Swaps are ranked so that nothing new to buy comes first. Order: one porridge a day for whoever is unwell (chicken, fish or egg porridge, never planned for the week), then the planned dish cooked lighter (no chilli, steam instead of fry, less salt or oil), then another dish from the kitchen, and only then a dish that needs buying (marked 🛒). Meat and fish bought for a changed dish are reused; similar items stand in for each other (drumsticks for thigh, any fish, any leafy greens). The helper's "Menu changed" card says what to cook lighter and which stand-ins to use, in her language |
| Not available at the shop | Helper tab > Shopping list | Each fresh item has "Not available" (in the helper's language). It shows that item's alternatives to tap, or "Skip it": ticking it opens the choices straight away. There is no stock check, and nothing guesses what a shop has. The owner's Menu tab lists what was bought instead or skipped, and Ask Kaki treats skipped items as not in the kitchen. Alternative names stay in English, as on the shop shelves |
| Extra shopping items | Helper tab > Shopping list | "Other things to buy" for anything beyond the recipes (dish soap, fruit). Anyone can add, tick or remove. Ticks for groceries and extras sync across phones; the owner's Menu tab shows "Shopping: x of y ticked off" |
| Recipe photos | Menu, Helper, cooking mode, Ratings | Free-licence photos (Unsplash License / Pexels License) loaded from the photo sites; falls back to the emoji tile offline. Credits under Settings > Photo credits and below |
| Kitchen tab: thanks, tips, mastery | Kitchen tab (owner); helper's phone shows Helper, Kitchen and Settings | Owner thanks the helper for a cooked dish (ready-made phrases hand-translated into Tagalog / Bahasa Indonesia / Burmese, optional note translated by Gemini), sends a kind "Tip for next time" (always opens with thanks; can be shown each time she cooks the dish, in cooking mode), confirms "She's mastered it", and ticks dishes an experienced helper "already cooks well". The helper rates her own confidence (1 to 5); dishes she rates 4+ prompt the owner to confirm. Ranks and badges are opt-in (Recognition settings): points from mastered dishes, lessons, new dishes, dishes cooked on their day, a whole week cooked and thank-yous (max 3 a day); points never go down; she can hide them; no leaderboards; not for pay. Ranks: Home Cook, Trusted Cook, Skilled Cook, Senior Cook, Head Cook of the House. A new helper name starts fresh |
| Cooking lessons | Kitchen tab > Plan a lesson | 3 dishes in 2 hours (soup, steamed or braised, stir-fry) from dishes that pass the family's allergy, religion, salt and chilli rules. Picked by rules, or by Gemini from that pre-filtered list (dish text only; answers outside the list are rejected). The 2-hour timeline is computed, never written by Gemini; long dishes get a "start before the lesson" step. Groceries checked against the week's list. The owner picks: lesson is that day's dinner (default), on top of the day's dishes, or menu untouched. Bilingual lesson view with knife and heat tips, teacher's notes, move/cancel, and "Lesson finished" with her confidence ratings. Design: ../cooking-lessons-stage1-design.md |
| Kaki persona | Everywhere | Friendly "Hey kaki!" voice in greetings, empty states and the chat; the helper's greeting is in their language |

## What is mocked (and what would replace it)
- **Gemini key on the device**: fine for a prototype with your own key. For a shipped app, the key should sit on a small backend relay so it never lives on users' phones.
- **Online recipe search**: 47 hand-written recipes (31 dishes, 12 soups, 3 sick-day porridges, incl. Korean and Thai) in `src/data/recipes.ts`, `recipes-more.ts`, `recipes-soups.ts`, `recipes-asian.ts` and `recipes-light.ts`. Real version: a recipe API or curated SG recipe sources, plus an LLM step to tag cuisine, spice, allergens and nutrition.
- **Translation**: only dish names (and the app's fixed words) are translated by hand. Cooking steps are translated by Gemini, because a fixed word list cannot translate every step; that needs the family-sharing function or a Gemini key. With it off, the helper's steps stay in English and the app says so. Gemini translations are machine-made and should be checked by a native speaker (Burmese especially).
- **Prices**: NOT connected to NTUC or any shop and not verified. `src/data/store.ts` is a fixed catalogue with made-up prices, used only for the rough "about $" costs. There is no stock check: whether the shop has an item is told by the helper's "Not available" tick. FairPrice has no public API, so real prices would need a partnership or another grocery data source.
- **Timer alerts**: in-app banner and vibration only. Real version: scheduled local notifications with sound (expo-notifications) so timers ring with the phone locked.
- **Push to helper**: same phone, separate tab. Real version: helper account + push notifications.
- **Storage**: on-device only (AsyncStorage). Real version: a backend so owner and helper phones sync.

Health flags are rules of thumb, not medical advice.

## Code map
- `App.tsx`: tab bar
- `src/screens/*`: one file per tab
- `src/engine/planner.ts`: safety filters, scoring and the weekly menu builder
- `src/engine/grocery.ts`: shopping list and cost estimates
- `src/engine/health.ts`: health flags and balanced-diet score
- `src/sync/family.ts`: Supabase family sharing (create, join, invites, translate call); sync loop in `src/state.tsx`
- `supabase/`: database schema and the `translate` Edge Function
- **Gemini models** (checked against ai.google.dev on 2026-10-13): `gemini-3.8-flash`, `gemini-3.6-flash`, `gemini-3.5-flash-lite`, `gemini-3.1-flash-lite`, then the legacy `gemini-2.5-flash` and `gemini-2.5-flash-lite`. The free tier covers these for text. Google Search grounding (web recipe search) is NOT on the free tier: it needs billing, with 5,000 free searches a month shared across Gemini 3 and newer, then $14 per 1,000. Free-tier rate limits are not published on the docs page; they are in the Google AI Studio rate-limit dashboard and were not checked. Re-check the list when Google retires models; edit `src/ai/models.ts` and the `MODELS` constant in `supabase/functions/translate/index.ts` together.
- `src/ai/`: Gemini key storage (`AiProvider.tsx`), API calls (`gemini.ts`), translate card on the Helper tab
- Kitchen tab: `src/screens/KitchenScreen.tsx` (owner and helper views), `KitchenTips.tsx` (thanks/tip sheet, rank card), `LessonSheet.tsx` (lesson planner, lesson view); rules in `src/engine/lesson.ts` and `src/engine/recognition.ts`; Gemini lesson picks in `src/ai/lesson.ts` (pure parts in `lessonPlan.ts`, same prompt as the Edge Function's `lesson` mode); helper words in `src/i18n-kitchen.ts`; cooking method per recipe in `src/data/methods.ts`
- `src/data/demo.ts`: sample family loaded on first launch ("Reset demo data" on the Settings tab when not sharing)

## Photo credits

Photos are free to use under the Unsplash License or the Pexels License. A photo is used only when its source page names the same dish; close matches were removed. **Nobody has looked at these images yet:** the build sandbox can't load image hosts, so they were matched from the photo pages' own titles. Please check each one by eye. Dishes without a photo show a labelled "Photo coming soon" tile.

**Still need a real photo (30):** Steamed Fish with Ginger & Soy, Ayam Masak Merah, Egg Tofu with Vegetables, Assam Pedas Fish, Garlic Prawns with Chye Sim, Baked Miso Salmon, Sayur Lodeh (vegetarian), Old Cucumber Pork Rib Soup, Lotus Root Pork Rib Soup, Watercress Pork Rib Soup, Winter Melon Chicken Soup, Spinach and Egg Soup, Fish Slice Soup with Tomato and Tofu, Sup Ayam (Malay Chicken Soup), Chicken Porridge, Fish Porridge, Plain Porridge with Steamed Egg, Japchae (Korean Glass Noodles), Andong Jjimdak (Korean Soy-Braised Chicken), Gyeran-mari (Korean Rolled Omelette), Kimchi Tofu Soup, Pad Krapow Gai (Thai Basil Chicken), Tom Yum Soup with Prawns, Lemongrass Chicken (Ayam Serai), Black Pepper Chicken, Chap Chye (Nonya Mixed Vegetables), Turmeric Fried Fish (Ikan Goreng Kunyit), Steamed Minced Pork with Tofu, ABC Soup with Chicken, Baked Chicken Chop with Potatoes (the three sick-day porridges are not listed in the menu).

| Dish | Photo | Licence |
|---|---|---|
| chicken-rice | [Annie Hatuanh on Unsplash](https://unsplash.com/photos/hainanese-chicken-rice-lunch-meal-vg3mQlbHyks) — Hainanese chicken rice with chilli sauce | Unsplash License |
| sambal-kangkong | [Likeboss lertpongsaporn on Pexels](https://www.pexels.com/photo/cooked-vegetables-in-a-plate-7361029/) — Stir-fried water spinach with chilli | Pexels License |
| dhal-curry | [Anil Sharma on Unsplash](https://unsplash.com/photos/a-bowl-of-yellow-dal-with-garnishes-and-bread-O_MFjbig3hA) — Yellow dal | Unsplash License |
| sweet-sour-pork | [Polina Tankilevitch on Pexels](https://www.pexels.com/photo/sweet-and-sour-pork-with-wooden-chopsticks-on-white-ceramic-bowl-5848495/) — Sweet and sour pork | Pexels License |
| beef-rendang | [qaz farid on Unsplash](https://unsplash.com/photos/a-close-up-of-a-bowl-of-food-on-a-table-bX7UPKH1vxs) — Malaysian rendang | Unsplash License |
| garlic-broccoli | [Abhijit Biswas on Unsplash](https://unsplash.com/photos/stir-fried-broccoli-with-chili-flakes-and-garlic-twJcB5sLvkw) — Stir-fried broccoli with garlic | Unsplash License |
| chicken-curry | [Kalindu Waranga on Unsplash](https://unsplash.com/photos/chicken-curry-in-a-white-bowl-with-sauce-VtNLbOAeO68) — Chicken curry | Unsplash License |
| tau-yew-bak | [Nguyen Mazic on Unsplash](https://unsplash.com/photos/braised-pork-belly-with-eggs-and-side-dishes-_luSs5lUkjA) — Soy-braised pork belly with eggs | Unsplash License |
| spaghetti-bolognese | [Sofia Ciravegna on Unsplash](https://unsplash.com/photos/a-plate-of-spaghetti-with-meat-and-tomato-sauce-khQeenz99H0) — Spaghetti with meat sauce | Unsplash License |
| sup-sayur | [Inna Safa on Unsplash](https://unsplash.com/photos/a-white-bowl-filled-with-soup-on-top-of-a-wooden-table-A9yU-38cNS8) — Indonesian vegetable soup (sup sayur) | Unsplash License |
| rasam | [Zoshua Colah on Unsplash](https://unsplash.com/photos/a-glass-filled-with-liquid-and-a-straw-sticking-out-of-it-DpjrEXTJZ44) — South Indian rasam (tamarind, tomato, pepper) served in a glass at Cafe Mysore, Mumbai | Unsplash License |
| tomato-egg | [Helen Van on Unsplash](https://unsplash.com/photos/cooked-food-on-white-ceramic-plate-6QE9lltiDvc) — Egg tomato stir-fry | Unsplash License |
| fish-curry | [Diego Arenas de Rodrigo on Unsplash](https://unsplash.com/photos/fish-curry-with-rice-lime-and-nuts-7v9U94719TE) — Fish curry with rice | Unsplash License |
| teriyaki-chicken | [Tomoyo S on Unsplash](https://unsplash.com/photos/cooked-food-on-white-ceramic-plate-VhuC3z2o8vQ) — Teriyaki chicken | Unsplash License |
| garlic-kailan | [You Le on Unsplash](https://unsplash.com/photos/a-plate-of-cooked-green-chinese-broccoli-7mlApdLeHF0) — Cooked Chinese broccoli | Unsplash License |
| chana-masala | [Zoshua Colah on Unsplash](https://unsplash.com/photos/chana-masala-with-fried-bhatura-bread-Idh9dnG2v8w) — Chana masala | Unsplash License |
| garlic-brinjal | [Sukwoo (Your Boyhood) Hong on Unsplash](https://unsplash.com/photos/fried-eggplant-dish-with-red-chopsticks-and-drink-7Nx-ZR8xgBM) — Chinese fried eggplant | Unsplash License |

## Before selling the app

Instagram imports (a pasted caption plus the post link) are flagged as imported, so "Remove all" in Settings > Recipes from websites deletes them too.


Two features copy or rewrite other people's recipes: **Import from a website link** (copies the page's ingredients, steps and a link to its photo) and **Search the web for a new recipe** (an AI rewrite of a web page). They are fine for your family's private use. Before the app is sold:

1. **Delete the imported content.** Settings > Recipes from websites > **Remove all**. Removing only the link is **not enough**: the copied text and steps would still be in the recipe. The imported text has to be deleted, or rewritten in your own words.
2. **Hide the features.** In `src/config.ts` set `WEB_RECIPES = false` and build. The import, web-search and refresh buttons are gone for good in that build. (The same screen has an on/off switch for a running app.)
3. **Check what is left.** YouTube links you pasted by hand stay (they are links, not copies). The 47 built-in recipes were written for this app. Dish photos are credited under Settings > Photo credits.
4. Consider licensed recipe content, or link-and-summarise, if you want web recipes in the paid app.
