// Downloads the Google Fonts used by the web app and generates a local
// fonts/fonts.css with @font-face rules pointing at the bundled files, so the
// app renders correctly with no internet connection. Run once (results are
// committed); re-run only if the web app's font list changes.
import {mkdir, writeFile} from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";

const GOOGLE_CSS_URL =
  "https://fonts.googleapis.com/css2?family=Amiri+Quran&family=Scheherazade+New:wght@400;700&family=Inter:wght@400;500;600;700&display=swap";

// A modern browser UA so Google serves woff2 with unicode-range subsets.
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

const outDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "fonts");
await mkdir(outDir, {recursive: true});

const res = await fetch(GOOGLE_CSS_URL, {headers: {"User-Agent": UA}});
if (!res.ok) throw new Error(`Failed to fetch font CSS: ${res.status}`);
let css = await res.text();

const urls = [...new Set([...css.matchAll(/url\((https:[^)]+)\)/g)].map((m) => m[1]))];
console.log(`Downloading ${urls.length} font files...`);

let i = 0;
for (const url of urls) {
  const ext = path.extname(new URL(url).pathname) || ".woff2";
  const name = `font-${String(i++).padStart(2, "0")}${ext}`;
  const r = await fetch(url, {headers: {"User-Agent": UA}});
  if (!r.ok) throw new Error(`Failed to download ${url}: ${r.status}`);
  await writeFile(path.join(outDir, name), Buffer.from(await r.arrayBuffer()));
  css = css.replaceAll(url, name);
}

await writeFile(path.join(outDir, "fonts.css"), css);
console.log(`Wrote ${urls.length} files + fonts.css to ${outDir}`);
