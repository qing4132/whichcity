/**
 * Translate city intros from Chinese to en/ja/es using free Google Translate API.
 * Usage: node scripts/translate-intros.mjs
 * Output: lib/cityIntros.ts (overwritten with multilingual data)
 */

import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// Parse existing Chinese intros from the TS file
const tsContent = readFileSync(join(ROOT, "lib/cityIntros.ts"), "utf-8");
const zhIntros = {};
const regex = /(\d+):\s*"([^"]+)"/g;
let match;
while ((match = regex.exec(tsContent)) !== null) {
  zhIntros[parseInt(match[1])] = match[2];
}
console.log(`Parsed ${Object.keys(zhIntros).length} Chinese intros`);

// Google Translate free API
async function translate(text, targetLang) {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=zh-CN&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${targetLang}`);
  const data = await res.json();
  return data[0].map((s) => s[0]).join("");
}

// Translate with retry and rate limiting
async function translateWithRetry(text, lang, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await translate(text, lang);
    } catch (e) {
      console.warn(`  Retry ${i + 1}/${retries} for ${lang}: ${e.message}`);
      await sleep(2000 * (i + 1));
    }
  }
  return ""; // fallback to empty on failure
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// Main
const LANGS = ["en", "ja", "es"];
const results = {}; // { id: { zh, en, ja, es } }

const ids = Object.keys(zhIntros).map(Number).sort((a, b) => a - b);
console.log(`Translating ${ids.length} cities × ${LANGS.length} languages...`);

for (let i = 0; i < ids.length; i++) {
  const id = ids[i];
  const zh = zhIntros[id];
  results[id] = { zh };

  for (const lang of LANGS) {
    const translated = await translateWithRetry(zh, lang);
    results[id][lang] = translated;
    // Rate limit: small delay between requests
    await sleep(100);
  }

  if ((i + 1) % 10 === 0 || i === ids.length - 1) {
    console.log(`  ${i + 1}/${ids.length} done`);
  }
}

// Generate output TS file
let output = `/**
 * Multilingual city introductions for the city detail page.
 * Auto-translated from Chinese originals via Google Translate.
 * Structure: Record<cityId, Record<locale, introText>>
 */

export const CITY_INTROS: Record<number, Record<string, string>> = {\n`;

for (const id of ids) {
  const r = results[id];
  output += `  ${id}: {\n`;
  output += `    zh: ${JSON.stringify(r.zh)},\n`;
  output += `    en: ${JSON.stringify(r.en)},\n`;
  output += `    ja: ${JSON.stringify(r.ja)},\n`;
  output += `    es: ${JSON.stringify(r.es)},\n`;
  output += `  },\n`;
}

output += `};\n`;

writeFileSync(join(ROOT, "lib/cityIntros.ts"), output, "utf-8");
console.log(`\nDone! Written to lib/cityIntros.ts`);
