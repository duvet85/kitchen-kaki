# Kitchen Kaki

Cooking app for Singapore families with a household helper: taste quiz, weekly menu the owner confirms and sends to the helper, shopping list with ballpark cost, translations (Tagalog, Indonesian, Burmese), cooking mode with timers, ratings, diet balance and the Kitchen tab.

**Work in progress.** This is a prototype and the source is a snapshot that keeps changing.

## What's in this repo

| Path | What it is |
|---|---|
| `source/` | The app's source code (Expo / React Native, TypeScript). **Start here.** |
| `source/src/` | Screens, planner engine, recipe data, AI and sync code |
| `source/supabase/` | Database schema and the Edge Function (Gemini relay) |
| `source/README.md` | Full feature notes and how each part works |
| everything else at the top level | The built web app served by GitHub Pages at https://duvet85.github.io/kitchen-kaki/ (generated, do not edit by hand) |

## Run it

```bash
cd source
npm install
npx expo start        # scan the QR code with Expo Go on Android or iPhone
npx expo start --web  # browser preview
```

Family sharing and the AI features need a free Supabase project; see `source/SETUP-FAMILY.md`. No keys are stored in this repo.
