// Stamps one version across both native projects so Android and iOS can never
// drift apart again. Before this existed they were hand-edited separately and
// had already diverged (Android 5/1.1 vs iOS 4/1.0).
//
//   node scripts/set-version.mjs --name 1.2 --code 6
//
// --name  marketing version, the "1.2" users see   -> versionName / MARKETING_VERSION
// --code  monotonic build number the stores require -> versionCode / CURRENT_PROJECT_VERSION
//
// In CI the name comes from the git tag and the code from the run number, but
// both are plain arguments so a release can always be reproduced by hand.
import {readFile, writeFile} from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function arg(flag) {
  const i = process.argv.indexOf(flag);
  return i === -1 ? undefined : process.argv[i + 1];
}

const versionName = arg("--name");
const versionCode = arg("--code");

if (!versionName || !versionCode) {
  console.error("Usage: node scripts/set-version.mjs --name <1.2> --code <6>");
  process.exit(1);
}

// Guard the formats the stores enforce, so a malformed tag fails here with a
// clear message rather than deep inside Gradle or xcodebuild.
if (!/^\d+(\.\d+){0,2}$/.test(versionName)) {
  console.error(`--name must look like 1, 1.2 or 1.2.3 (got "${versionName}")`);
  process.exit(1);
}
if (!/^\d+$/.test(versionCode)) {
  console.error(`--code must be a positive integer (got "${versionCode}")`);
  process.exit(1);
}

// Replace exactly one occurrence and fail loudly otherwise: a silent no-op here
// would ship a build carrying the previous version, which the stores reject as
// a duplicate and which is confusing to debug after the fact.
function replaceOnce(source, pattern, replacement, label, file) {
  const matches = source.match(pattern);
  if (!matches || matches.length !== 1) {
    console.error(`Expected exactly 1 ${label} in ${file}, found ${matches ? matches.length : 0}.`);
    process.exit(1);
  }
  return source.replace(pattern, replacement);
}

// --- Android -------------------------------------------------------------
const gradlePath = path.join(root, "android", "app", "build.gradle");
let gradle = await readFile(gradlePath, "utf8");
gradle = replaceOnce(gradle, /versionCode\s+\d+/g, `versionCode ${versionCode}`, "versionCode", "build.gradle");
gradle = replaceOnce(gradle, /versionName\s+"[^"]*"/g, `versionName "${versionName}"`, "versionName", "build.gradle");
await writeFile(gradlePath, gradle);

// --- iOS -----------------------------------------------------------------
// Xcode writes these settings once per build configuration (Debug + Release),
// so unlike Gradle both occurrences are expected and both must be updated.
const pbxPath = path.join(root, "ios", "App", "App.xcodeproj", "project.pbxproj");
let pbx = await readFile(pbxPath, "utf8");

function replaceAllExpecting(source, pattern, replacement, expected, label) {
  const matches = source.match(pattern);
  if (!matches || matches.length !== expected) {
    console.error(`Expected ${expected} ${label} entries in project.pbxproj, found ${matches ? matches.length : 0}.`);
    process.exit(1);
  }
  return source.replaceAll(pattern, replacement);
}

pbx = replaceAllExpecting(pbx, /CURRENT_PROJECT_VERSION = \d+;/g, `CURRENT_PROJECT_VERSION = ${versionCode};`, 2, "CURRENT_PROJECT_VERSION");
pbx = replaceAllExpecting(pbx, /MARKETING_VERSION = [^;]+;/g, `MARKETING_VERSION = ${versionName};`, 2, "MARKETING_VERSION");
await writeFile(pbxPath, pbx);

console.log(`Set version ${versionName} (build ${versionCode}) across android/ and ios/`);
