// Copies the static export of the learn-quran web app into www/ and swaps the
// Google Fonts @import for the locally bundled fonts, making the app fully
// offline. Expects the web repo built (`next build`) as a sibling directory,
// or set WEB_OUT to the export directory.
import {cp, mkdir, readdir, readFile, rm, stat, writeFile} from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const webOut = process.env.WEB_OUT || path.join(root, "..", "learn-quran", "out");
const www = path.join(root, "www");
const fontsDir = path.join(root, "fonts");

try {
  await stat(path.join(webOut, "index.html"));
} catch {
  console.error(`No web export found at ${webOut}. Run \`next build\` in the web repo first, or set WEB_OUT.`);
  process.exit(1);
}

await rm(www, {recursive: true, force: true});
await cp(webOut, www, {recursive: true});
await mkdir(path.join(www, "fonts"), {recursive: true});
await cp(fontsDir, path.join(www, "fonts"), {recursive: true});

// Point the compiled CSS at the bundled fonts instead of fonts.googleapis.com,
// and append the app-only style overrides so they win the cascade.
const overrides = await readFile(path.join(root, "overrides", "mobile.css"), "utf8");
const cssDir = path.join(www, "_next", "static", "css");
let rewrites = 0;
for (const file of await readdir(cssDir)) {
  if (!file.endsWith(".css")) continue;
  const p = path.join(cssDir, file);
  const css = await readFile(p, "utf8");
  const next = css.replace(/@import url\((["']?)https:\/\/fonts\.googleapis\.com[^)]*\1\);?/g, '@import url("/fonts/fonts.css");');
  if (next !== css) {
    await writeFile(p, next + "\n" + overrides);
    rewrites++;
  }
}

// The website loads Vercel Analytics; the app must not. In a production export
// the script src is the relative "/_vercel/insights/script.js", which has no
// counterpart in the bundle, so inside the app it only ever 404s against
// capacitor://localhost — it never loads and never reports. Point it at an empty
// data: URI so the app makes no request at all and ships no analytics loader.
const ANALYTICS_SRC = '"/_vercel/insights/script.js"';
const chunkDir = path.join(www, "_next", "static", "chunks");
let analyticsStripped = 0;
for (const file of await readdir(chunkDir, {recursive: true})) {
  const p = path.join(chunkDir, file);
  if (!file.endsWith(".js") || !(await stat(p)).isFile()) continue;
  const js = await readFile(p, "utf8");
  if (!js.includes(ANALYTICS_SRC)) continue;
  await writeFile(p, js.replaceAll(ANALYTICS_SRC, '"data:text/javascript,"'));
  analyticsStripped++;
}

// The update notice is app-only code with no counterpart on the website, so it
// is copied in here rather than living in the web source. It is served from an
// underscore-prefixed directory for the same reason /_next is: no exported
// route can ever collide with it.
//
// app-version.json is what the notice compares against the published manifest.
// It is written empty on purpose — scripts/set-version.mjs fills it in during a
// release build, and a build that never went through set-version (a local
// `npm run sync` and Run in Xcode) has no version to compare and shows nothing.
await mkdir(path.join(www, "_app"), {recursive: true});
await cp(path.join(root, "overrides", "update-notice.js"), path.join(www, "_app", "update-notice.js"));
await writeFile(path.join(www, "app-version.json"), JSON.stringify({version: null, build: null}) + "\n");

// The native app draws edge-to-edge under the iOS status bar / notch, so the
// web export's viewport meta needs `viewport-fit=cover` for env(safe-area-inset-*)
// to report real values. Inject it into every exported HTML file's viewport tag;
// the header padding in overrides/mobile.css consumes the inset. (Harmless on the
// website itself, but this is app-only since it only touches www.)
async function* htmlFiles(dir) {
  for (const entry of await readdir(dir, {withFileTypes: true})) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* htmlFiles(p);
    else if (entry.name.endsWith(".html")) yield p;
  }
}
// The same pass loads the update notice on every page. It goes at the end of
// <head> rather than <body>: <body> is the App Router's hydration root, and an
// extra child there is one more thing for React to reconcile, while <head> is
// already full of injected script tags and is where React expects third-party
// ones. `defer` keeps it off the critical path — it does not touch the DOM
// until DOMContentLoaded either way.
const UPDATE_NOTICE_TAG = '<script defer src="/_app/update-notice.js"></script>';
let viewports = 0;
let notices = 0;
for await (const file of htmlFiles(www)) {
  const html = await readFile(file, "utf8");
  let next = html.replace(
    /(<meta name="viewport" content=")([^"]*)(")/g,
    (m, pre, content, post) => (/viewport-fit=/.test(content) ? m : `${pre}${content}, viewport-fit=cover${post}`),
  );
  if (next !== html) viewports++;
  if (!next.includes(UPDATE_NOTICE_TAG) && next.includes("</head>")) {
    next = next.replace("</head>", `${UPDATE_NOTICE_TAG}</head>`);
    notices++;
  }
  if (next !== html) await writeFile(file, next);
}

console.log(
  `Synced ${webOut} -> www (${rewrites} CSS file(s) rewired to local fonts, ` +
    `${viewports} HTML viewport(s) set to cover, ${notices} page(s) wired to the update notice, ` +
    `${analyticsStripped} chunk(s) de-analyticsed)`,
);
