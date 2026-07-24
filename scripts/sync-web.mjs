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
let viewports = 0;
for await (const file of htmlFiles(www)) {
  const html = await readFile(file, "utf8");
  const next = html.replace(
    /(<meta name="viewport" content=")([^"]*)(")/g,
    (m, pre, content, post) => (/viewport-fit=/.test(content) ? m : `${pre}${content}, viewport-fit=cover${post}`),
  );
  if (next !== html) {
    await writeFile(file, next);
    viewports++;
  }
}

console.log(`Synced ${webOut} -> www (${rewrites} CSS file(s) rewired to local fonts, ${viewports} HTML viewport(s) set to cover)`);
