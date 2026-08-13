# learn-quran-mobile

Capacitor wrapper around the `learn-quran` static web app. The web app is a
sibling repo (`../learn-quran`); this repo holds the native Android and iOS
projects and a committed copy of the web export in `www/`.

## Before any release: confirm www/ is current

**Always check whether `www/` needs re-syncing from the web repo, and report the
answer, before tagging a release.** Do not assume it is up to date and do not
re-sync unprompted — say what you found and let Rushan decide.

CI never rebuilds the web app; it ships exactly the `www/` that is committed. A
stale `www/` silently ships the previous web build under a new version number,
and nothing in the pipeline catches it.

Two independent staleness traps — check both:

```sh
git -C ../learn-quran log -1 --format='web HEAD: %h %ad %s' --date=short
stat -f '  out/ built: %Sm' ../learn-quran/out/index.html
git log -1 --format='www synced: %h %ad %s' --date=short -- www
```

1. `www/` here may lag `../learn-quran/out`
2. `../learn-quran/out` is a build output and may itself lag that repo's HEAD

If `out/` predates the web repo's HEAD it needs `npm run build` in
`../learn-quran` first. That is a production build in another repo — ask before
running it. Then `npm run sync` here, and verify a known recent change actually
appears in `www/` before committing.

## Releasing

```sh
npm run sync && git commit -am "Sync web build"
git tag v1.3 && git push origin v1.3
```

The tag drives everything: version stamped into both native projects, both
platforms built and signed, Android AAB to Play closed testing (alpha), iOS IPA
to TestFlight, GitHub Release with both artifacts. Promotion to production is
manual on purpose — a Capacitor app has no OTA path.

Build numbers are `github.run_number + 100` and the platforms drift apart; that
is expected. Never hand-edit the versions in `android/app/build.gradle` or
`ios/App/App.xcodeproj/project.pbxproj` — `scripts/set-version.mjs` overwrites
them at build time.

If one platform fails, dispatch just that platform (Actions → Release → Run
workflow) rather than re-pushing the tag, which would make the succeeded
platform rebuild and be rejected as a duplicate build number.

Full detail, including the nine repository secrets: `docs/RELEASING.md`.

## Gotchas

- `www/`, `android/` and `ios/` are committed. `npx cap sync` regenerates the
  copies inside the native projects, so those are gitignored.
- The signing keystore, `keystore.properties` and `.env.local` are gitignored and
  have never been committed. Keep it that way — this repo is public.
- iOS signing settings must live in the App target's build configurations, not on
  the `xcodebuild` command line: command-line settings apply to every target, and
  the CocoaPods framework targets reject a provisioning profile outright.
  `scripts/set-ios-signing.mjs` handles this.
