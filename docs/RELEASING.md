# Releasing

Releases are automated. Tag a commit and CI builds, signs, and ships to both
stores' testing tracks.

```sh
npm run sync                       # pull the latest web build into www/
git add www && git commit -m "Sync web build"
git tag v1.2 && git push origin v1.2
```

That produces:

| | |
|---|---|
| Android | signed AAB → Play Console, **closed testing** (alpha) track |
| iOS | signed IPA → **TestFlight** |
| GitHub | a Release for the tag with both artifacts attached |

Promotion to production is **manual, on purpose**. Both stores hold the build in
a testing track until you promote it in their console. A Capacitor app has no
over-the-air update path, so a bad release can only be fixed by another binary
and another review — the human gate is worth keeping.

The tag sets the marketing version (`v1.2` → `1.2`). The build number is the
workflow run number **plus 100**, which only ever increases, satisfying both
stores. `scripts/set-version.mjs` stamps both native projects at build time, so
the versions committed in `build.gradle` and `project.pbxproj` are just
placeholders and no longer need hand-editing.

> **Why +100.** Builds up to versionCode 5 were uploaded by hand before this
> pipeline existed, but `github.run_number` starts at 1. Both stores reject a
> build number that is not strictly greater than what they already hold, so the
> run number is offset past the manual era. **Never lower this offset** — doing so
> produces build numbers the stores have already seen and every upload fails.

## Building without shipping

Use the **Actions → Release → Run workflow** button:

- **version** — e.g. `1.2` (no leading `v`)
- **platform** — `all`, `android`, or `ios`
- **submit** — untick to build signed artifacts without uploading to the stores

Artifacts are attached to the run either way, so this is the way to test the
pipeline end to end without touching a store.

## One-time setup

Nine repository secrets, at **Settings → Secrets and variables → Actions**.

**Status: 8 of 9 set.** Android, Play, and App Store Connect are done. Only the
three iOS signing secrets remain, and they need a distribution certificate that
does not exist yet — see [iOS signing](#ios-signing-3-secrets--not-yet-set).

Until those three are set, **Android releases work and iOS releases fail** at the
signing step. Use `platform: android` in a manual run to ship Android alone in the
meantime.

```sh
gh secret list    # check what is set
```

### Android (4 secrets) — already set

Set from `android/keystore.properties` and `android/upload-keystore.jks`. The
keystore was verified to open with these credentials before upload.

The upload keystore is at `android/upload-keystore.jks` and is gitignored — it
has never been committed, and it must stay that way. **Back it up somewhere
safe.** If you lose it you cannot ship an update to the existing Play listing,
ever; recovery means asking Google to reset the upload key.

```sh
base64 -i android/upload-keystore.jks | pbcopy
```

| Secret | Value |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | the base64 blob just copied |
| `ANDROID_KEYSTORE_PASSWORD` | `storePassword` from `android/keystore.properties` |
| `ANDROID_KEY_ALIAS` | `upload` |
| `ANDROID_KEY_PASSWORD` | `keyPassword` from `android/keystore.properties` |

### Play Console API (1 secret)

Lets CI upload to the closed testing track.

**Already set.** This reuses the same `play-console@halogen-parser-505119-t7`
service account as Hayya, which has access to Learn Quran too. The JSON lives at
`../hayya/play-console-service-account.json` (gitignored in that repo — keep it
that way).

| Secret | Value |
|---|---|
| `PLAY_SERVICE_ACCOUNT_JSON` | the entire JSON file contents |

If it ever needs recreating: [Play Console → Setup → API access](https://play.google.com/console/developers/api-access),
create a service account, grant it **Release apps to testing tracks** for Learn
Quran, then download a JSON key.

> The very first upload of an app must be done by hand — Google requires one
> manual release before the API will accept uploads for that package. You have
> already shipped, so this is satisfied.

> The workflow uploads to `track: alpha`, which is Play's built-in **closed
> testing** track. If you use a custom-named closed track instead, put its exact
> name in `release.yml`. The track must already exist in the Play Console with at
> least one tester list attached, or the upload is rejected.

### iOS signing (3 secrets) — not yet set

**You do not currently have a distribution certificate.** `security find-identity
-v -p codesigning` lists only *Apple Development: Rushanshah Saiyed*, which
cannot sign App Store builds. There is nothing on this machine to export yet, so
the certificate has to be created first.

Team ID is `A3QCZ7J62Q`. Bundle ID is `app.learnquran.mobile`.

> **Where Keychain Access actually is.** It is not in Applications or Utilities on
> this macOS version — it lives at
> `/System/Library/CoreServices/Applications/Keychain Access.app`. Open it with:
> ```sh
> open "/System/Library/CoreServices/Applications/Keychain Access.app"
> ```
> Spotlight often will not find it; ⌘-Space then typing the name may fail.

#### Easiest route: let Xcode create the certificate

Xcode can generate and install the distribution certificate without any manual
CSR handling.

1. Open `ios/App/App.xcworkspace` in Xcode.
2. **Xcode → Settings → Accounts**, sign in with your Apple ID if not already.
3. Select the team, click **Manage Certificates…**
4. Click **+** in the bottom-left → **Apple Distribution**.
5. Confirm it worked — this should now list a second identity:
   ```sh
   security find-identity -v -p codesigning
   ```

#### Then export it to a .p12

1. Open Keychain Access (path above), select **login** keychain → **My
   Certificates**.
2. Right-click **Apple Distribution: Rushanshah Saiyed** → **Export…**
3. Save as `Certificates.p12` and **set a password** — remember it, it becomes
   `IOS_DIST_CERT_PASSWORD`. An empty password will not work in CI.

```sh
base64 -i Certificates.p12 | pbcopy
gh secret set IOS_DIST_CERT_P12_BASE64          # paste, then Ctrl-D
gh secret set IOS_DIST_CERT_PASSWORD            # type the export password, Ctrl-D
```

#### And create the provisioning profile

At [Certificates, Identifiers & Profiles → Profiles](https://developer.apple.com/account/resources/profiles/list),
**+** → **App Store Connect** under Distribution → select the
`app.learnquran.mobile` App ID → select the distribution certificate you just
made → name it (e.g. `Learn Quran App Store`) → Generate → Download.

```sh
base64 -i ~/Downloads/Learn_Quran_App_Store.mobileprovision | pbcopy
gh secret set IOS_PROVISIONING_PROFILE_BASE64   # paste, then Ctrl-D
```

| Secret | Value |
|---|---|
| `IOS_DIST_CERT_P12_BASE64` | base64 of the `.p12` |
| `IOS_DIST_CERT_PASSWORD` | the password set during export |
| `IOS_PROVISIONING_PROFILE_BASE64` | base64 of the `.mobileprovision` |

Certificates expire annually and profiles alongside them. When the iOS job starts
failing with a signing error, redo this section and update all three.

### App Store Connect API (3 secrets)

Uploads to TestFlight without an Apple ID or 2FA prompt.

[App Store Connect → Users and Access → Integrations → App Store Connect API](https://appstoreconnect.apple.com/access/integrations/api),
generate a key with the **App Manager** role. The `.p8` downloads **once only**.

| Secret | Value |
|---|---|
| `APPSTORE_API_KEY_ID` | the Key ID, e.g. `A1B2C3D4E5` |
| `APPSTORE_API_ISSUER_ID` | the Issuer ID (UUID at the top of that page) |
| `APPSTORE_API_PRIVATE_KEY` | entire `.p8` contents, including the BEGIN/END lines |

## How it fits together

`.github/workflows/ci.yml` runs on every PR: a debug Android build and an
unsigned iOS build. No secrets are exposed, so a fork's PR can never reach the
signing material.

`.github/workflows/release.yml` runs on a `v*` tag. It plans the release, then
builds Android and iOS in parallel, then creates the GitHub Release.

`www/` is committed and CI builds exactly what is in the tagged commit — it does
**not** rebuild the web app. Run `npm run sync` and commit before tagging, or you
will ship the previous web build. This keeps a release reproducible: the tag
fully determines the binary.

## When one platform fails

Each store tracks its own build numbers, so the two platforms are free to
diverge — v1.2 shipped as Android build 103 and iOS build 104 because iOS needed
a second run. That is fine and needs no correction.

To retry just the failed half, dispatch that one platform (**Actions → Release →
Run workflow**, pick `android` or `ios`). Do **not** re-push the tag: the
succeeded platform would rebuild and its store would reject the duplicate build
number.

A dispatched run creates no GitHub Release — there is no tag attached to it. If a
tag run half-failed, create the release by hand once both platforms are up:

```sh
gh run download <run-id> -n android-release-<version> -D rel
gh run download <run-id> -n ios-release-<version> -D rel
gh release create v<version> --title "Learn Quran <version>" --generate-notes rel/*
```

## Troubleshooting

**TestFlight rejects the build with an SDK version error** — the runner defaulted
to an older Xcode. The workflow selects the newest installed Xcode 26.x; if the
image ever stops shipping one, the job fails early with a clear message rather
than at upload time.

**`scheme App is not configured`** — the shared scheme at
`ios/App/App.xcodeproj/xcshareddata/xcschemes/App.xcscheme` was deleted. Recreate
it in Xcode via *Product → Scheme → Manage Schemes* and tick **Shared**.

**Play rejects the versionCode as already used** — a re-run of a release reuses
its run number. Push a new tag rather than re-running the old job.

**`No profiles for 'app.learnquran.mobile' were found`** — the provisioning
profile secret is missing, expired, or is a Development rather than App Store
profile.

**AAB reported as unsigned** — `keystore.properties` was not written, meaning one
of the four Android secrets is empty.
