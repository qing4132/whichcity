// Fit v4 models using OSM POI features alongside v3 ones.
// Produces data/sources/cost-models/trained-v4.json

import fs from 'node:fs';

const src = JSON.parse(fs.readFileSync('data/cities-source.json', 'utf8'));
const nb = JSON.parse(fs.readFileSync('_archive/scripts-numbeo/numbeo-audit/fetched-data.json', 'utf8'));
const cmi = JSON.parse(fs.readFileSync('data/sources/cost-model-inputs.json', 'utf8'));
const ap = JSON.parse(fs.readFileSync('data/sources/airbnb-prices.json', 'utf8'));
const fx = JSON.parse(fs.readFileSync('public/data/exchange-rates.json', 'utf8')).rates;
const poi = JSON.parse(fs.readFileSync('data/sources/osm/poi-counts.json', 'utf8'));

const { countryToISO, eurostatPLI: pli, usRPP: rpp } = cmi;

function gt(id) {
  const p = nb.cityPages[id]; if (!p) return null;
  const { singlePersonMonthlyCost: sp, rent1BRCenter: rc, rent1BROutside: ro } = p;
  if (sp == null || rc == null || ro == null) return null;
  return { gtCost: 1.04 * sp + 0.88 * (0.05 * rc + 0.95 * ro), gtRent: 0.68 * (0.55 * rc + 0.45 * ro) };
}
function meanWage(c) {
  const vs = Object.values(c.professions || {}).filter((v) => typeof v === 'number' && v > 0).sort((a, b) => a - b);
  if (vs.length < 5) return null;
  const t = vs.slice(2, -2);
  return t.reduce((s, v) => s + v, 0) / t.length;
}
function airbnbUSD(id) {
  const r = ap.data?.[id]; if (!r?.medianNightly) return null;
  const rate = fx[r.localCurrency]; return rate ? r.medianNightly / rate : null;
}
function osmFeats(id) {
  const r = poi[id]; if (!r || !r.r2000) return null;
  const p = r.r2000;
  const total = (p.dining || 0) + (p.culture || 0) + (p.health || 0) + (p.edu || 0) + (p.retail || 0) + (p.finance || 0) + (p.transit || 0) + (p.tourism || 0);
  if (total < 5) return null;  // severe OSM coverage gap
  return {
    total, dining: p.dining || 0, culture: p.culture || 0, health: p.health || 0,
    edu: p.edu || 0, retail: p.retail || 0, finance: p.finance || 0, transit: p.transit || 0, tourism: p.tourism || 0,
  };
}

const recs = [];
for (const c of src.cities) {
  const g = gt(c.id); if (!g) continue;
  const w = meanWage(c); if (!w) continue;
  recs.push({
    id: c.id, name: c.name, country: c.country, continent: c.continent,
    wage: w, bigMac: c.bigMacPrice || 4.5, gni: c.gniPerCapita || 15000,
    gdp: c.gdpPppPerCapita || 25000, hdi: c.hdi || 0.7, flights: c.directFlightCities || 50,
    airbnbUSD: airbnbUSD(c.id), pli: countryToISO[c.country] ? pli[countryToISO[c.country]] : null,
    rpp: rpp[c.name] || null,
    osm: osmFeats(c.id),
    ...g,
  });
}
const withOsm = recs.filter((r) => r.osm).length;
console.log(`records=${recs.length}, countries=${new Set(recs.map((r) => r.country)).size}, withOSM=${withOsm}`);

// ---- Correlation audit: OSM features vs GT (non-log Pearson in log space) ----
function corr(a, b) {
  const n = a.length, ma = a.reduce((s, v) => s + v, 0) / n, mb = b.reduce((s, v) => s + v, 0) / n;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) { num += (a[i] - ma) * (b[i] - mb); da += (a[i] - ma) ** 2; db += (b[i] - mb) ** 2; }
  return num / Math.sqrt(da * db);
}
if (withOsm > 0) {
  const o = recs.filter((r) => r.osm);
  const lc = o.map((r) => Math.log(r.gtCost));
  const lr = o.map((r) => Math.log(r.gtRent));
  console.log('\n--- Log-log Pearson r vs ground truth (OSM subset) ---');
  for (const k of ['total', 'dining', 'culture', 'health', 'edu', 'retail', 'finance', 'transit', 'tourism']) {
    const lx = o.map((r) => Math.log((r.osm[k] || 0) + 1));
    console.log(`  log(${k}+1)  r(cost)=${corr(lx, lc).toFixed(3)}  r(rent)=${corr(lx, lr).toFixed(3)}`);
  }
  // Composition: log(total) vs log(wage) — orthogonality check
  const lwage = o.map((r) => Math.log(r.wage));
  const ltotal = o.map((r) => Math.log(r.osm.total + 1));
  console.log(`\n  log(total) vs log(wage) r=${corr(ltotal, lwage).toFixed(3)}  (lower is more independent)`);
}
process.exit(0);
