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

// Point the compiled CSS at the bundled fonts instead of fonts.googleapis.com.
const cssDir = path.join(www, "_next", "static", "css");
let rewrites = 0;
for (const file of await readdir(cssDir)) {
  if (!file.endsWith(".css")) continue;
  const p = path.join(cssDir, file);
  const css = await readFile(p, "utf8");
  const next = css.replace(/@import url\((["']?)https:\/\/fonts\.googleapis\.com[^)]*\1\);?/g, '@import url("/fonts/fonts.css");');
  if (next !== css) {
    await writeFile(p, next);
    rewrites++;
  }
}

console.log(`Synced ${webOut} -> www (${rewrites} CSS file(s) rewired to local fonts)`);
