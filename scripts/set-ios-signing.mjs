// Switches the App target to manual signing with an explicit provisioning
// profile, editing only that target's build configurations.
//
//   node scripts/set-ios-signing.mjs --profile "Learn Quran App Store"
//
// This exists because the settings CANNOT be passed on the xcodebuild command
// line. Command-line build settings apply to every target in the workspace,
// including the CocoaPods framework targets, and frameworks reject a
// provisioning profile outright:
//
//   error: Capacitor does not support provisioning profiles, but provisioning
//   profile Learn Quran App Store has been manually specified.
//
// Writing the settings into the App target's own build configurations scopes
// them to the one target that should be signed. The Pods targets keep their own
// signing settings and build untouched.
import {readFile, writeFile} from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function arg(flag) {
  const i = process.argv.indexOf(flag);
  return i === -1 ? undefined : process.argv[i + 1];
}

const profile = arg("--profile");
const identity = arg("--identity") || "Apple Distribution";
const team = arg("--team") || "A3QCZ7J62Q";

if (!profile) {
  console.error('Usage: node scripts/set-ios-signing.mjs --profile "<profile name>" [--identity "..."] [--team "..."]');
  process.exit(1);
}

// The profile name comes from a decoded .mobileprovision and is written into a
// quoted pbxproj string, so reject the characters that would break out of it.
if (/["\\\n]/.test(profile)) {
  console.error(`--profile contains characters that cannot be quoted safely: ${JSON.stringify(profile)}`);
  process.exit(1);
}

const pbxPath = path.join(root, "ios", "App", "App.xcodeproj", "project.pbxproj");
let pbx = await readFile(pbxPath, "utf8");

// Only the App target's configurations carry INFOPLIST_FILE = App/Info.plist;
// the Pods targets are in a separate .xcodeproj entirely. Anchoring on it means
// this cannot accidentally rewrite another target's settings.
const APP_CONFIG = /(INFOPLIST_FILE = App\/Info\.plist;)/g;
const found = pbx.match(APP_CONFIG);
if (!found || found.length !== 2) {
  console.error(`Expected 2 App target build configurations (Debug + Release), found ${found ? found.length : 0}.`);
  process.exit(1);
}

// Drop any signing settings from a previous run so re-running is idempotent
// rather than appending duplicate keys.
pbx = pbx.replace(/^\t*(CODE_SIGN_STYLE|PROVISIONING_PROFILE_SPECIFIER|CODE_SIGN_IDENTITY|DEVELOPMENT_TEAM) = [^;]*;\n/gm, "");

pbx = pbx.replace(
  APP_CONFIG,
  `$1
\t\t\t\tCODE_SIGN_STYLE = Manual;
\t\t\t\tDEVELOPMENT_TEAM = ${team};
\t\t\t\tPROVISIONING_PROFILE_SPECIFIER = "${profile}";
\t\t\t\tCODE_SIGN_IDENTITY = "${identity}";`,
);

await writeFile(pbxPath, pbx);
console.log(`App target set to manual signing: identity "${identity}", profile "${profile}", team ${team}`);
