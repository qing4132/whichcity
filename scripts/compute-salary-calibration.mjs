// Offline-only: compute country-level PPP-gross → nominal-net calibration factor.
// GT source: Numbeo avgMonthlyNetSalary. GT never reaches the running server —
// this script writes a static JSON that's committed to the repo.
//
// Method: M2 variant (country + continent fallback, Huber-trimmed).
//   α_country = exp( median_log_ratio )    for countries with ≥ 3 trusted cities
//   α_continent = exp( median_log_ratio )  fallback per continent
//   α_global = exp( median )               final fallback
//
// Applied at render time:   nominalNetUSD ≈ α × oursPPPgross
// Excluded from fitting: hidden + LOW_CONFIDENCE_COST + LOW_CONFIDENCE_SALARY cities.

import fs from 'node:fs';

const HIDDEN = new Set([38,54,56,77,79,80,81,83,84,91,92,94,95,96,97,99,100,105,107,109,110,114,115,116,118,119,120,127,128,131,135]);
const LOW_CONF_COST = new Set([52, 55, 112, 140, 147]);
const LOW_CONF_SAL = new Set([49, 50, 67, 68, 70, 112, 140, 147]);

const src = JSON.parse(fs.readFileSync('data/cities-source.json', 'utf8'));
const gt = JSON.parse(fs.readFileSync('data/sources/gt/numbeo-salary-gt.json', 'utf8'));

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
  const g = gt[c.id];
  if (!g) continue;
  if (HIDDEN.has(c.id) || LOW_CONF_COST.has(c.id) || LOW_CONF_SAL.has(c.id)) continue;
  const ours = meanGrossPPP(c);
  if (!ours) continue;
  const gtAnn = g.numbeoNetMonthlyUSD * 12;
  recs.push({ id: c.id, name: c.name, country: c.country, continent: c.continent, logRatio: Math.log(gtAnn / ours) });
}

console.log(`Trusted calibration pool: ${recs.length} cities`);

const countries = {};
const byCountry = new Map();
for (const r of recs) {
  if (!byCountry.has(r.country)) byCountry.set(r.country, []);
  byCountry.get(r.country).push(r.logRatio);
}
for (const [cc, arr] of byCountry) {
  if (arr.length >= 3) {
    countries[cc] = { alpha: Math.exp(median(arr)), n: arr.length, source: 'country-median' };
  }
}

const continents = {};
const byContinent = new Map();
for (const r of recs) {
  if (!byContinent.has(r.continent)) byContinent.set(r.continent, []);
  byContinent.get(r.continent).push(r.logRatio);
}
for (const [cont, arr] of byContinent) {
  continents[cont] = { alpha: Math.exp(median(arr)), n: arr.length };
}

const globalAlpha = Math.exp(median(recs.map((r) => r.logRatio)));

const out = {
  generatedAt: new Date().toISOString(),
  note: 'PPP-gross → nominal-net-USD calibration factor. α = median(numbeoNetAnnualUSD / meanGrossPPP) over trusted cities. Numbeo data used ONLY offline for calibration; never at runtime.',
  trustedPoolSize: recs.length,
  global: { alpha: globalAlpha },
  continents,
  countries,
};

fs.mkdirSync('data/salary-research', { recursive: true });
fs.writeFileSync('data/salary-research/calibration-ppp-to-nominal-net.json', JSON.stringify(out, null, 2));

console.log(`Global α = ${globalAlpha.toFixed(3)}`);
console.log(`\nContinent factors:`);
for (const [k, v] of Object.entries(continents)) console.log(`  ${k.padEnd(8)} α=${v.alpha.toFixed(3)}  n=${v.n}`);
console.log(`\nCountry factors (≥ 3 cities): ${Object.keys(countries).length}`);
Object.entries(countries).sort((a, b) => b[1].n - a[1].n).slice(0, 10).forEach(([k, v]) => console.log(`  ${k.padEnd(10)} α=${v.alpha.toFixed(3)}  n=${v.n}`));
console.log('\nSaved → data/salary-research/calibration-ppp-to-nominal-net.json');
