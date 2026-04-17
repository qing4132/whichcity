// Rebuild PPP-gross → nominal-net α table with dual-GT (Numbeo + Livingcost).
// Key change vs v1: each GT source = 1 observation, so a country with 2 cities
// × 2 sources qualifies at n≥3. This unlocks CH/FR/IT/CHE/GRC/etc.

import fs from 'node:fs';

const HIDDEN = new Set([38,54,56,77,79,80,81,83,84,91,92,94,95,96,97,99,100,105,107,109,110,114,115,116,118,119,120,127,128,131,135]);
const LOW_COST = new Set([52, 55, 112, 140, 147]);
const LOW_SAL = new Set([49, 50, 67, 68, 70, 112, 140, 147]);

const src = JSON.parse(fs.readFileSync('data/cities-source.json', 'utf8'));
const nbGT = JSON.parse(fs.readFileSync('data/sources/gt/numbeo-salary-gt.json', 'utf8'));
const lvGT = JSON.parse(fs.readFileSync('data/sources/gt/livingcost-salary-gt.json', 'utf8'));

function meanGrossPPP(c) {
  const e = Object.entries(c.professions || {}).filter(([k, v]) => k !== '数字游民' && typeof v === 'number' && v > 0);
  if (e.length < 10) return null;
  const vs = e.map(([, v]) => v).sort((a, b) => a - b);
  const t = vs.slice(2, -2);
  return t.reduce((s, v) => s + v, 0) / t.length;
}
const median = (a) => { const s = [...a].sort((x, y) => x - y), m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

const recs = [];
for (const c of src.cities) {
  if (HIDDEN.has(c.id) || LOW_COST.has(c.id) || LOW_SAL.has(c.id)) continue;
  const ours = meanGrossPPP(c);
  if (!ours) continue;
  const ourAnn = ours; // PPP-gross yearly USD
  const nb = nbGT[c.id]?.numbeoNetMonthlyUSD;
  const lv = lvGT[c.id]?.livingcostNetMonthlyUSD;
  if (nb) recs.push({ id: c.id, name: c.name, country: c.country, continent: c.continent, source: 'NB', logRatio: Math.log((nb * 12) / ourAnn) });
  if (lv) recs.push({ id: c.id, name: c.name, country: c.country, continent: c.continent, source: 'LV', logRatio: Math.log((lv * 12) / ourAnn) });
}

console.log(`Total observations (city × source): ${recs.length}`);

const byCountry = new Map();
for (const r of recs) {
  if (!byCountry.has(r.country)) byCountry.set(r.country, []);
  byCountry.get(r.country).push(r.logRatio);
}
const countries = {};
for (const [cc, arr] of byCountry) {
  if (arr.length >= 2) {
    countries[cc] = { alpha: Math.exp(median(arr)), n: arr.length, source: 'dual-GT-median' };
  }
}

const byContinent = new Map();
for (const r of recs) {
  if (!byContinent.has(r.continent)) byContinent.set(r.continent, []);
  byContinent.get(r.continent).push(r.logRatio);
}
const continents = {};
for (const [cont, arr] of byContinent) {
  continents[cont] = { alpha: Math.exp(median(arr)), n: arr.length };
}

const globalAlpha = Math.exp(median(recs.map((r) => r.logRatio)));

const out = {
  generatedAt: new Date().toISOString(),
  note: 'PPP-gross → nominal-net-USD α. Dual-GT method: each (city, source) pair = 1 observation. α_country = exp(median log ratio) when n≥3 observations.',
  observations: recs.length,
  global: { alpha: globalAlpha },
  continents,
  countries,
};

fs.writeFileSync('data/salary-research/calibration-ppp-to-nominal-net.json', JSON.stringify(out, null, 2));

console.log(`Global α = ${globalAlpha.toFixed(3)}`);
console.log(`Countries with α (n≥3): ${Object.keys(countries).length}`);
for (const [cc, v] of Object.entries(countries).sort()) {
  console.log(`  ${cc.padEnd(8,'　')} α=${v.alpha.toFixed(3)}  n=${v.n}`);
}
