# Store Listing — Learn Quran

Copy-paste source for the App Store (App Store Connect) and Google Play Console
listings. Character limits are noted; current text is within them.

- **App name:** Learn Quran
- **Bundle / App ID:** `app.learnquran.mobile`
- **Apple Team ID:** `A3QCZ7J62Q`
- **Category:** Education (secondary: Reference)
- **Price:** Free (no ads, no in-app purchases)
- **Website:** https://learn-quran.app
- **Privacy policy URL:** https://learn-quran.app/privacy/
- **Support URL:** https://learn-quran.app/contact/
- **Support email:** rushan52@gmail.com

> **Heads up — App Store Connect rejects some characters.** Pasting text
> containing `ā` (U+0101) or `ʿ` (U+02BF) into a metadata field fails with
> "field contains one or more invalid characters". The Apple copy below is
> already cleaned: `Tabārak` → `Tabarak`, `Juz ʿAmma` → `Juz Amma`. Em dashes
> (`—`) and bullets (`•`) are fine. **Google Play accepts all of them**, so the
> Play copy further down keeps the proper transliteration — don't "fix" it.

---

## Apple App Store

### Subtitle (max 30 chars — this is exactly 30, do not add to it)
> Memorize the Quran, Juz by Juz

### Promotional text (max 170 chars, editable anytime without review)
> Free, ad-free, and fully offline. Section-by-section guides, memory hooks, key vocabulary, prayer duas, and drills for Juz 29 & 30 — no account, ever.

### Copyright
> 2026 Rushanshah Saiyed

### Description (max 4000 chars; this is ~2020)

Paste the block below verbatim — it is already unwrapped into flowing
paragraphs (App Store Connect preserves hard line breaks, so markdown-wrapped
text renders ragged).

```
Learn Quran helps you memorize and actually understand the short surahs you recite every day. No more repeating Arabic you don't understand — every surah is broken into small, themed sections, each with a plain-English explanation and a memory hook, so what you memorize genuinely means something.

Covers Juz 29 (Tabarak) and Juz 30 (Juz Amma), the surahs most of us use in daily prayer, and grows from there.

FULLY OFFLINE
Everything is bundled in the app. All Quran text, translations, transliterations, guides, duas, and drills work with no internet connection.

WHAT'S INSIDE
• Section-by-section guides — each surah split into small, themed parts with an overview, the key themes, and a memory hook for each.
• Memorize mode — a guided drill that removes one crutch at a time: read, Arabic-only, recall from the meaning, fill in the blanks, then a blank slate, with letter and word peeks when you get stuck.
• Arabic vocabulary — the key words of each surah with transliteration and meaning, so you understand what you're reciting.
• Recitation guide — natural stopping points and practical tips, verse by verse.
• Drills, solo or vs a friend — a fill-in-the-blanks quiz, a guess-the-translation drill, and an order-the-verses puzzle, with challenge links that hand a friend the exact same puzzle and your score to beat.
• Prayer duas — the supplications of the salah with transliteration and meaning.
• Progress that stays with you — mark sections and surahs as learned and watch your progress fill in.

PRIVATE BY DESIGN
No account, no sign-in, no ads. Your progress is saved only on your own device and never uploaded. The app collects no personal information.

WHERE THE CONTENT COMES FROM
The Arabic (Uthmani script) and the Sahih International translation come from the verified AlQuran Cloud API — never hand-typed or AI-generated. The teaching commentary is an educational aid; please confirm any point of religious ruling with a trusted teacher.

Free forever. Feedback and corrections are always welcome.
```

If the above ever errors again, the culprit is smart-quoted apostrophes
(`'` U+2019). Replace `—` with `-`, `•` with `-`, and all curly quotes with
straight ones for a pure-ASCII fallback.

### Keywords (max 100 chars, comma-separated, no spaces after commas)
> hifz,amma,tabarak,surah,islam,muslim,tajweed,recite,dua,arabic,offline,ayah,verse,prayer,salah

Apple already indexes the **app name and subtitle**, so `quran`, `memorize`, and
`juz` are deliberately omitted here — repeating them wastes the 100 characters.

### Notes for App Review (private — this is the defense against Guideline 4.2)
> Learn Quran is a fully offline educational app, not a web viewer. All Quran text, translations, guides, duas, and interactive content are bundled in the binary and work with no internet connection — please test in airplane mode. It includes interactive memorization drills (fill-in-the-blanks, guess-the-translation, order-the-verses) and a step-by-step Memorize mode, which is functionality beyond a website. No account or login is required, so no demo credentials are needed. No personal data is collected; progress is stored only in on-device local storage.

### Other App Store Connect answers
- **Sign-in required:** No (leave the demo-account fields empty)
- **App Privacy:** Data Not Collected
- **Export Compliance** ("Does your app use encryption?"): No
- **Age Rating:** all questions None/No → results in 4+
- **Content Rights:** the app displays the Sahih International translation, which
  is third-party copyrighted content sourced via the AlQuran Cloud API. Answer
  this one deliberately rather than clicking through.
- **What's New:** not shown for a first release (1.0) — skip it.

---

## Google Play Console

### Short description (max 80 chars)
> Offline, ad-free guides & drills to memorize and understand the Quran.

### Full description (max 4000 chars)
Same as the App Store description above, except Play accepts the proper
transliteration — use `Tabārak` and `Juz ʿAmma` here.

### Data safety form answers
- **Does your app collect or share any user data?** No.
  - No account, no personal information, no advertising or tracking.
  - Progress and settings are stored only on the device (local storage) and are
    not transmitted off the device. On-device-only storage does not count as
    "collection" for the Data safety form.
  - The mobile app contains no analytics SDK. (The website uses anonymous,
    cookieless Vercel Analytics; the app does not.)
- **Is data encrypted in transit?** N/A (no data collected). External links open
  in the system browser over HTTPS.
- **Can users request data deletion?** Users can clear all local data by clearing
  app storage or uninstalling.

### Content rating (IARC questionnaire)
- Category: Reference / Education.
- No violence, no user-to-user free-form chat, no purchases, no location.
  Expected result: Everyone / PEGI 3.

---

## Assets

### Apple App Store
- [x] App icon 1024×1024 (in the Xcode asset catalog)
- [x] iPhone 6.9" screenshots (1290×2796) — `store-assets/ios/iphone-6.9/` (8)
- [x] iPad 13" screenshots (2048×2732) — `store-assets/ios/ipad-13/` (8)
- [x] Support & privacy URLs (above)

Apple derives the smaller presentation sizes from the 6.9" and 13" sets, so the
older 6.7" / 6.5" / 12.9" slots do **not** need separate uploads. iPad
screenshots are required because the build is universal
(`TARGETED_DEVICE_FAMILY = "1,2"`).

The iOS screenshots are generated from the offline `www/` build rather than
captured by hand — headless Chrome renders each route at Apple's exact pixel
sizes, so no cropping is involved and the status bar never appears. The drill
screens are captured mid-play (the script clicks "Start"), and the first-run
tour is suppressed by pre-setting `lq:onboarded:v1`.

### Google Play
- [x] App icon 512×512 (PNG, 32-bit)
- [x] Feature graphic 1024×500
- [x] Phone screenshots — `store-assets/screenshots/`
- [x] 7"/10" tablet screenshots — `store-assets/screenshots-tablet/`
- [x] Data safety form + content rating (above)

---

## Release log

- **iOS 1.0 (build 4)** — uploaded to App Store Connect 2026-07-24, signed by
  `Apple Distribution: Rushanshah Saiyed (A3QCZ7J62Q)`, arm64, 8.3 MB.
