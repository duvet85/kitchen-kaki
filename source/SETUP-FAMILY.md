# Sharing Kitchen Kaki with your family

Everyone in the family gets the same menu, shopping list and cooking progress on their own phone. Your Gemini key is saved once in Supabase, so your wife and helper never need it. Everything here runs on free tiers.

## 1. Set up Supabase (about 10 minutes, once)

Do all of this in your Supabase project at supabase.com. Don't paste any keys into chat.

1. **Create the tables.** Go to **SQL Editor**, then **New query**. Paste everything in `supabase/schema.sql` and press **Run**. It's safe to run again.
2. **Let phones sign in without a password.** Go to **Authentication > Sign In / Providers** and turn on **Allow anonymous sign-ins**, then save. Each phone gets its own sign-in. Only phones with an invite can see your family.
3. **Add the translate function.**
   - Go to **Edge Functions**, then **Deploy a new function > Via Editor**.
   - Name it `translate`.
   - Replace the sample code with everything in `supabase/functions/translate/index.ts`, then press **Deploy**.
   - Open the function's **Details** and turn **off** "Verify JWT with legacy secret". The function checks who is calling by itself.
4. **Save your Gemini key.** Go to **Edge Functions > Secrets**. Add a secret named `GEMINI_API_KEY` and paste your key as its value.
5. **Find two values for the app.** Go to **Project Settings > Data API** and copy the **Project URL**. Then go to **Project Settings > API Keys** and copy the **publishable** key (older projects call it the `anon` key). This key is meant to be public, and the table rules protect your data. Never use the **secret** or `service_role` key in the app.

## 2. Create your family in the app (on your phone)

1. Open the app and go to **Settings**, then **Set up our family**.
2. Paste the Project URL and the publishable key, and type your family name and your name. Tap **Create family**.
3. The family, menu and ratings already on your phone become the shared copy. One family per Supabase project, so strangers can't create their own and use up your Gemini quota.

## 3. Invite your wife and helper

1. In **Settings**, tap **Invite a parent** (for your wife) or **Invite the helper**, then send the message by WhatsApp.
2. They open the app, go to **Settings > Join with an invite**, paste the whole message, type their name, and tap **Join family**. With the web version they can simply tap the link in the message.
3. A parent sees everything. The helper only sees the Helper tab (confirmed menu, shopping list and cooking mode) and Settings.
4. If a helper leaves, remove them in Settings and tap **Make new codes** so old invites stop working.

## 4. Getting the app onto three phones (free)

**For everyday use: the web version, added to the home screen.** It works without your computer staying on.

1. Unzip `kitchen-kaki-web.zip`.
2. Go to app.netlify.com/drop and sign in free. Then drag the unzipped folder onto the page. You get a link like `https://something.netlify.app`.
3. On each phone, open that link in Safari (iPhone) or Chrome (Android). Use **Share > Add to Home Screen** on iPhone, or **⋮ > Add to Home screen** on Android. It then opens like an app.
4. Invites sent from the web version include a tap-to-join link.

Limits: timers can't vibrate on iPhone in a browser (the "Time's up" banner still shows), and alerts only appear while the app is open.

**For trying it quickly: Expo Go.** This needs your computer running.

1. Install Node.js on your computer, unzip `makan-helper.zip`, and in that folder run `npm install` then `npx expo start --tunnel`.
2. Each phone installs **Expo Go** from the App Store or Play Store and scans the QR code.
3. It stops working when your computer sleeps, so it's better for testing than for daily cooking.

**Later, a real installable app:**

- **Android:** a free EAS Build gives an APK you can send by WhatsApp.
- **iPhone:** needs an Apple Developer account (USD 99 a year) for TestFlight.

## Good to know

- **Simultaneous changes:** if two people change the menu at the same moment, the last change wins.
- **Offline use:** the app keeps working offline and catches up when it's back online.
- **What goes to Google:** only recipe text, never names, allergies or health details.
- **Free limits:** Supabase's free tier pauses a project after a week with no use. Open the Supabase dashboard to wake it.

## Letting a friend try it with their own family

Many families can share one Supabase project. Each family only sees its own menu, recipes, photos and members (row level security), and all of them use the one Gemini key through the same `translate` function.

1. Run the newest `supabase/schema.sql` once in the SQL Editor (safe to run again; your family and its data stay as they are).
2. In the app, open Settings > "Let a friend try it" > "Invite a friend to start their own family". Send them the message.
3. Your friend opens the link, chooses a family name and types their name. They never see a URL or key.

Each link works once and expires after 14 days; you can have 10 waiting at a time. Without a link, nobody can start a second family in your project. Their Gemini use counts against your free Gemini limit.
