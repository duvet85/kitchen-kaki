
## Logo and intro
Original artwork (a steaming kuali with a K, a chilli and a saffron rim) drawn as SVG in `brand/`. `node brand/render.js` (needs Playwright with Chromium) redraws every PNG in `assets/`: app icon, favicon, Android adaptive icon (foreground, background, monochrome), the intro image and the in-app logo. `src/Splash.tsx` is the intro (about 1.5 seconds, once per app open, again after joining a family; Settings has "Replay the intro"). app.json has the native splash (blue background, same image); check it on the first native build.
