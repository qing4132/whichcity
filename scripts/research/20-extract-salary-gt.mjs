// Extract "Average Monthly Net Salary (After Tax)" from Numbeo raw HTML.
// Numbeo exposes this in USD (nominal) on the cost-of-living page.
// Output: data/sources/numbeo-salary-gt.json  { cityId: { nameSlug, numbeoNetMonthlyUSD } }

import fs from 'node:fs';
import path from 'node:path';

const DIR = '_archive/scripts-numbeo/numbeo-audit/raw/cost';
const src = JSON.parse(fs.readFileSync('data/cities-source.json', 'utf8'));

const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.html'));
const re = /Average Monthly Net Salary[^<]*<\/td>\s*<td[^>]*>\s*<span[^>]*>([\d,.\s]+)&nbsp;&#36;/;

const out = {};
let ok = 0, miss = 0;
for (const f of files) {
  const html = fs.readFileSync(path.join(DIR, f), 'utf8');
  const m = html.match(re);
  const idMatch = f.match(/^(\d{3})-/);
  if (!idMatch) continue;
  const cityId = parseInt(idMatch[1], 10);
  const city = src.cities.find((c) => c.id === cityId);
  if (!city) continue;
  if (m) {
    const usd = parseFloat(m[1].replace(/[,\s]/g, ''));
    if (usd > 0 && usd < 20000) {
      out[cityId] = { name: city.name, country: city.country, numbeoNetMonthlyUSD: usd };
      ok++;
    } else {
      miss++;
    }
  } else {
    miss++;
  }
}

console.log(`Extracted ${ok} / ${ok + miss} cities`);
console.log('Sample:');
Object.entries(out).slice(0, 5).forEach(([id, v]) => console.log(`  ${id} ${v.name.padEnd(16)} ${v.country.padEnd(10)} $${v.numbeoNetMonthlyUSD}/mo (net, USD)`));

fs.mkdirSync('data/sources/gt', { recursive: true });
fs.writeFileSync('data/sources/gt/numbeo-salary-gt.json', JSON.stringify(out, null, 2));
console.log('\nSaved → data/sources/gt/numbeo-salary-gt.json');
