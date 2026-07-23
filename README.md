# Learn Quran — Mobile

Offline Android & iOS app for [Learn Quran](https://learn-quran.app), built with
[Capacitor](https://capacitorjs.com). It wraps the static export of the
`learn-quran` Next.js site in native shells, so every guide, drill, and dua works
with **no internet connection**:

- All Quran text, translations, transliterations, and guides are bundled in the app.
- Fonts (Amiri Quran, Scheherazade New, Inter) are bundled locally instead of
  loading from Google Fonts.
- Progress, settings, and onboarding state persist in the WebView's localStorage.
- Only the contact form and outbound hadith citation links need a connection
  (external links open in the system browser).

## Layout

```
capacitor.config.json   App id/name, webDir
fonts/                  Bundled font files + fonts.css (committed)
scripts/bundle-fonts.mjs  Re-downloads fonts if the web app's font list changes
scripts/sync-web.mjs    Copies ../learn-quran/out -> www/, rewires CSS to local fonts
www/                    The synced web build (committed, so the repo builds standalone)
android/                Native Android project (Gradle)
ios/                    Native iOS project (Xcode)
```

## Updating the app after web changes

From the `learn-quran` repo, build the static export, then sync it in here:

```sh
cd ../learn-quran && npx next build   # writes out/
cd ../learn-quran-mobile
npm run sync                          # sync-web.mjs + npx cap sync
```

(`WEB_OUT=/path/to/out npm run sync` if the web repo isn't a sibling directory.)

## Building

- **Android**: `npm run android` opens the project in Android Studio — run on a
  device/emulator or `Build > Generate Signed App Bundle`. CLI:
  `cd android && ./gradlew assembleDebug` (requires JDK 21 + Android SDK).
- **iOS**: requires a Mac with Xcode. `npm run ios` opens the Xcode workspace;
  set your signing team, then run/archive as usual.

## Notes

- App id: `app.learnquran.mobile`, display name **Learn Quran**.
- `npx cap sync` copies `www/` into each native project and updates native deps;
  it runs automatically as part of `npm run sync`.
- App icons/splash screens currently use Capacitor defaults — generate branded
  ones with [`@capacitor/assets`](https://github.com/ionic-team/capacitor-assets)
  (needs a 1024x1024 `assets/logo.png`).
