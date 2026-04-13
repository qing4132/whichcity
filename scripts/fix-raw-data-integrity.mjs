#!/usr/bin/env node
/**
 * fix-raw-data-integrity.mjs
 * 
 * 1. Fill in found raw values from primary sources
 * 2. Recalculate all homicideRateInv from homicideRate (min-max norm, inverted)
 * 3. Recalculate all gpiScoreInv from gpiScore (linear (5-x)/4*100)
 * 4. Clear inv values where raw is null
 * 5. Recalculate safetyIndex using only raw-backed data
 * 6. Recalculate confidence numbers (strict: raw only)
 * 7. Verify all existing inv values match recalculation
 */
import { readFileSync, writeFileSync } from "fs";

const CITIES_PATH = "public/data/cities.json";
const data = JSON.parse(readFileSync(CITIES_PATH, "utf-8"));
const cities = data.cities;

console.log(`Loaded ${cities.length} cities\n`);

// ═══════════════════════════════════════════════════════════════
// Step 1: Fill in newly researched raw values
// ═══════════════════════════════════════════════════════════════
const FILLS = [
  // Uruguay homicide rate: 11.245 per 100k (UNODC 2023)
  { name: "蒙得维的亚", field: "homicideRate", value: 11.2, source: "UNODC 2023" },
  // Taiwan GPI: 1.730 (IEP GPI 2025)
  { name: "台北", field: "gpiScore", value: 1.730, source: "IEP GPI 2025" },
  // Uruguay GPI: 1.784 (IEP GPI 2025)
  { name: "蒙得维的亚", field: "gpiScore", value: 1.784, source: "IEP GPI 2025" },
  // Taiwan WPS: 0.854 (Georgetown WPS 2025/26)
  { name: "台北", field: "wpsIndex", value: 0.854, source: "Georgetown WPS 2025/26" },
  // Yangon Numbeo Safety: 50.8 (Numbeo 2025)
  { name: "仰光", field: "numbeoSafetyIndex", value: 51, source: "Numbeo 2025 (rounded)" },
];

console.log("── Step 1: Fill raw values ──");
for (const f of FILLS) {
  const city = cities.find(c => c.name === f.name);
  if (!city) { console.error(`  ✗ City not found: ${f.name}`); continue; }
  const old = city[f.field];
  city[f.field] = f.value;
  console.log(`  ${f.name}.${f.field}: ${old} → ${f.value} (${f.source})`);
}

// ═══════════════════════════════════════════════════════════════
// Step 2: Recalculate homicideRateInv from homicideRate
// Formula: min-max normalize all homicideRate values, then 100 - norm
// ═══════════════════════════════════════════════════════════════
console.log("\n── Step 2: Recalculate homicideRateInv ──");

const allHomicideRates = cities.map(c => c.homicideRate).filter(v => v != null);
const hMin = Math.min(...allHomicideRates);
const hMax = Math.max(...allHomicideRates);
console.log(`  Homicide rate range: ${hMin} – ${hMax} (n=${allHomicideRates.length})`);

let hChanged = 0, hCleared = 0, hVerified = 0;
for (const city of cities) {
  if (city.homicideRate != null) {
    const norm = Math.round(((city.homicideRate - hMin) / (hMax - hMin)) * 100);
    const newInv = 100 - norm;
    const oldInv = city.homicideRateInv;
    if (oldInv !== newInv) {
      console.log(`  ${city.name}: homicideRateInv ${oldInv} → ${newInv} (rate=${city.homicideRate})`);
      hChanged++;
    } else {
      hVerified++;
    }
    city.homicideRateInv = newInv;
  } else {
    // Raw missing → clear inv
    if (city.homicideRateInv != null) {
      console.log(`  ${city.name}: CLEAR homicideRateInv=${city.homicideRateInv} (no raw homicideRate)`);
      hCleared++;
    }
    city.homicideRateInv = null;
  }
}
console.log(`  Changed: ${hChanged}, Cleared: ${hCleared}, Verified match: ${hVerified}`);

// ═══════════════════════════════════════════════════════════════
// Step 3: Recalculate gpiScoreInv from gpiScore
// Formula: ((5 - gpiScore) / 4) * 100, rounded
// ═══════════════════════════════════════════════════════════════
console.log("\n── Step 3: Recalculate gpiScoreInv ──");

let gChanged = 0, gCleared = 0, gVerified = 0;
for (const city of cities) {
  if (city.gpiScore != null) {
    const newInv = Math.round(((5 - city.gpiScore) / 4) * 100);
    const oldInv = city.gpiScoreInv;
    if (oldInv !== newInv) {
      console.log(`  ${city.name}: gpiScoreInv ${oldInv} → ${newInv} (gpi=${city.gpiScore})`);
      gChanged++;
    } else {
      gVerified++;
    }
    city.gpiScoreInv = newInv;
  } else {
    // Raw missing → clear inv
    if (city.gpiScoreInv != null) {
      console.log(`  ${city.name}: CLEAR gpiScoreInv=${city.gpiScoreInv} (no raw gpiScore)`);
      gCleared++;
    }
    city.gpiScoreInv = null;
  }
}
console.log(`  Changed: ${gChanged}, Cleared: ${gCleared}, Verified match: ${gVerified}`);

// ═══════════════════════════════════════════════════════════════
// Step 4: Recompute safetyIndex using merge-new-indicators formula
// (now that homicideRateInv and gpiScoreInv are correct/cleared)
// ═══════════════════════════════════════════════════════════════
console.log("\n── Step 4: Recompute safetyIndex ──");

function weightedAvg(subs) {
  const available = subs.filter(s => s.val != null);
  if (available.length === 0) return { value: null, count: 0 };
  const totalWeight = available.reduce((sum, s) => sum + s.weight, 0);
  const value = available.reduce((sum, s) => sum + (s.val * s.weight / totalWeight), 0);
  return { value: Math.round(value * 10) / 10, count: available.length };
}

let sChanged = 0;
for (const city of cities) {
  const wpsNorm = city.wpsIndex != null ? city.wpsIndex * 100 : null;
  const safetySubs = [
    { val: city.numbeoSafetyIndex, weight: 0.30 },
    { val: city.homicideRateInv,   weight: 0.25 },
    { val: city.gpiScoreInv,       weight: 0.20 },
    { val: city.gallupLawOrder,    weight: 0.15 },
    { val: wpsNorm,                weight: 0.10 },
  ];
  const result = weightedAvg(safetySubs);
  const newIdx = result.value ?? 0;
  if (Math.abs(city.safetyIndex - newIdx) > 0.5) {
    console.log(`  ${city.name}: safetyIndex ${city.safetyIndex} → ${newIdx}`);
    sChanged++;
  }
  city.safetyIndex = newIdx;
}
console.log(`  Changed (>0.5 delta): ${sChanged}`);

// ═══════════════════════════════════════════════════════════════
// Step 5: Recompute confidence (strict: raw fields only)
// ═══════════════════════════════════════════════════════════════
console.log("\n── Step 5: Recompute confidence (strict raw only) ──");

const SAFETY_SUBS = [["numbeoSafetyIndex",30],["homicideRate",25],["gpiScore",20],["gallupLawOrder",15],["wpsIndex",10]];
const HEALTH_SUBS = [["doctorsPerThousand",25],["hospitalBedsPerThousand",20],["uhcCoverageIndex",25],["lifeExpectancy",15],["outOfPocketPct",15]];
const GOV_SUBS = [["corruptionPerceptionIndex",25],["govEffectiveness",25],["wjpRuleLaw",20],["pressFreedomScore",15],["mipexScore",15]];

function groupConf(city, subs) {
  let available = 0;
  for (const [field, weight] of subs) {
    if (city[field] != null) available += weight;
  }
  return available;
}

let confChanged = 0;
for (const city of cities) {
  const sc = groupConf(city, SAFETY_SUBS);
  const hc = groupConf(city, HEALTH_SUBS);
  const gc = groupConf(city, GOV_SUBS);
  const avg = Math.round((sc + hc + gc) / 3);

  const oldSC = city.safetyConfidence;
  const oldHC = city.healthcareConfidence;
  const oldGC = city.governanceConfidence;
  const oldAvg = city.securityConfidence;

  if (sc !== oldSC || hc !== oldHC || gc !== oldGC || avg !== oldAvg) {
    console.log(`  ${city.name}: S:${oldSC}→${sc} H:${oldHC}→${hc} G:${oldGC}→${gc} avg:${oldAvg}→${avg}`);
    confChanged++;
  }

  city.safetyConfidence = sc;
  city.healthcareConfidence = hc;
  city.governanceConfidence = gc;
  city.securityConfidence = avg;
}
console.log(`  Changed: ${confChanged}`);

// ═══════════════════════════════════════════════════════════════
// Final audit
// ═══════════════════════════════════════════════════════════════
console.log("\n══ Final Audit ══");

// Verify no inv without raw
let issues = 0;
for (const city of cities) {
  if (city.homicideRate == null && city.homicideRateInv != null) {
    console.error(`  ✗ ${city.name}: homicideRateInv exists without raw`);
    issues++;
  }
  if (city.gpiScore == null && city.gpiScoreInv != null) {
    console.error(`  ✗ ${city.name}: gpiScoreInv exists without raw`);
    issues++;
  }
}

// Show remaining raw gaps
const perCity = cities.map(c => {
  const allSubs = [...SAFETY_SUBS, ...HEALTH_SUBS, ...GOV_SUBS];
  const missing = allSubs.filter(([f]) => c[f] == null).map(([f]) => f);
  return { name: c.name, missing: missing.length, fields: missing, secConf: c.securityConfidence };
}).filter(c => c.missing > 0).sort((a, b) => b.missing - a.missing);

console.log(`\nCities with missing raw data (${perCity.length}/${cities.length}):`);
for (const c of perCity) {
  console.log(`  ${c.name.padEnd(22)} conf:${c.secConf}%  missing ${c.missing}: ${c.fields.join(", ")}`);
}

// Distribution
const dist = { 100: 0, "90-99": 0, "80-89": 0, "70-79": 0, "<70": 0 };
cities.forEach(c => {
  const v = c.securityConfidence;
  if (v === 100) dist[100]++;
  else if (v >= 90) dist["90-99"]++;
  else if (v >= 80) dist["80-89"]++;
  else if (v >= 70) dist["70-79"]++;
  else dist["<70"]++;
});
console.log("\nConfidence distribution:", JSON.stringify(dist));

if (issues > 0) {
  console.error(`\n✗ ${issues} integrity issues found!`);
  process.exit(1);
}

writeFileSync(CITIES_PATH, JSON.stringify(data, null, 2) + "\n", "utf-8");
console.log(`\n✅ Written to ${CITIES_PATH} (0 integrity issues)`);
