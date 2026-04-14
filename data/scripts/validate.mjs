#!/usr/bin/env node
/**
 * validate.mjs — Enhanced WhichCity data validation
 *
 * Validates both the SOT (data/cities-source.json) and the exported
 * frontend JSON (public/data/cities.json). Covers all rules from the
 * original validate-data.mjs plus additional checks.
 *
 * Usage:
 *   node data/scripts/validate.mjs          # validate both SOT and export
 *   node data/scripts/validate.mjs --export  # validate export only (CI mode)
 *
 * Exit code 0 = pass, 1 = fail
 */
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const SOURCE_PATH = join(ROOT, "data/cities-source.json");
const EXPORT_PATH = join(ROOT, "public/data/cities.json");

const EXPORT_ONLY = process.argv.includes("--export");

let errors = 0;
let warnings = 0;
const fail = (msg) => { console.error(`  ✗ ERROR: ${msg}`); errors++; };
const warn = (msg) => { console.warn(`  ⚠ WARN:  ${msg}`); warnings++; };

// ═══════════════════════════════════════════════════════════════
// 1. Validate exported frontend JSON
// ═══════════════════════════════════════════════════════════════
console.log("═══ WhichCity Data Validation ═══\n");

if (!existsSync(EXPORT_PATH)) {
  fail(`Export not found: ${EXPORT_PATH}`);
  process.exit(1);
}
const exportData = JSON.parse(readFileSync(EXPORT_PATH, "utf-8"));
const cities = exportData.cities;
console.log(`Validating ${cities.length} cities from export...\n`);

// 1a. Each city has 25 professions
for (const c of cities) {
  const n = Object.keys(c.professions).length;
  if (n !== 25) fail(`${c.name}(${c.id}): has ${n} professions, expected 25`);
}

// 1b. averageIncome must equal professions median (auto-computed by export)
for (const c of cities) {
  const vals = Object.values(c.professions).sort((a, b) => a - b);
  const median = vals[Math.floor(vals.length / 2)];
  if (c.averageIncome !== median) {
    fail(`${c.name}(${c.id}): averageIncome=${c.averageIncome} != professions median=${median}`);
  }
}

// 1c. Index fields 0-100
for (const f of ["safetyIndex", "healthcareIndex", "freedomIndex", "governanceIndex"]) {
  for (const c of cities) {
    const v = c[f];
    if (v != null && (v < 0 || v > 100)) fail(`${c.name}(${c.id}): ${f}=${v} out of [0,100]`);
  }
}

// 1d. Confidence fields are numeric 0-100
for (const f of ["safetyConfidence", "healthcareConfidence", "governanceConfidence", "freedomConfidence", "securityConfidence"]) {
  for (const c of cities) {
    if (typeof c[f] !== "number") fail(`${c.name}(${c.id}): ${f} must be number, got ${typeof c[f]}`);
    else if (c[f] < 0 || c[f] > 100) fail(`${c.name}(${c.id}): ${f}=${c[f]} out of [0,100]`);
  }
}

// 1e. Safety index recomputation check (within tolerance of 3)
for (const c of cities) {
  const wpsNorm = c.wpsIndex != null ? c.wpsIndex * 100 : null;
  const subs = [
    { val: c.numbeoSafetyIndex, w: 0.30 },
    { val: c.homicideRateInv, w: 0.25 },
    { val: c.gpiScoreInv, w: 0.20 },
    { val: c.gallupLawOrder, w: 0.15 },
    { val: wpsNorm, w: 0.10 },
  ];
  const avail = subs.filter(s => s.val != null);
  if (avail.length > 0) {
    const tw = avail.reduce((s, v) => s + v.w, 0);
    const recomp = avail.reduce((s, v) => s + (v.val * v.w / tw), 0);
    if (Math.abs(recomp - c.safetyIndex) > 3.0) {
      fail(`${c.name}(${c.id}): safetyIndex=${c.safetyIndex} vs recomputed=${recomp.toFixed(1)} (diff > 3)`);
    }
  }
}

// 1f. Climate consistency
for (const c of cities) {
  const cl = c.climate;
  if (!cl?.monthlyRainMm || cl.monthlyRainMm.length !== 12) continue;
  const sum = cl.monthlyRainMm.reduce((a, b) => a + b, 0);
  const diff = Math.abs(sum - cl.annualRainMm);
  if (cl.annualRainMm > 0 && diff / cl.annualRainMm > 0.20) {
    warn(`${c.name}(${c.id}): rain sum=${Math.round(sum)} vs annual=${cl.annualRainMm}`);
  }
}

for (const c of cities) {
  const cl = c.climate;
  if (!cl?.monthlyHighC || !cl?.monthlyLowC) continue;
  for (let m = 0; m < 12; m++) {
    if (cl.monthlyHighC[m] < cl.monthlyLowC[m]) {
      fail(`${c.name}(${c.id}): month ${m+1} high=${cl.monthlyHighC[m]} < low=${cl.monthlyLowC[m]}`);
    }
  }
}

// 1g. Raw/inv consistency: if raw is null, inv MUST be null
for (const c of cities) {
  if (c.homicideRate == null && c.homicideRateInv != null) {
    fail(`${c.name}(${c.id}): homicideRateInv without homicideRate`);
  }
  if (c.gpiScore == null && c.gpiScoreInv != null) {
    fail(`${c.name}(${c.id}): gpiScoreInv without gpiScore`);
  }
}

// 1h. Confidence matches sub-indicator presence (numeric weights)
const SAFETY_SUBS = [["numbeoSafetyIndex", 30], ["homicideRate", 25], ["gpiScore", 20], ["gallupLawOrder", 15], ["wpsIndex", 10]];
const HEALTH_SUBS = [["doctorsPerThousand", 25], ["hospitalBedsPerThousand", 20], ["uhcCoverageIndex", 25], ["lifeExpectancy", 15], ["outOfPocketPct", 15]];
const GOV_SUBS = [["corruptionPerceptionIndex", 25], ["govEffectiveness", 25], ["wjpRuleLaw", 20], ["pressFreedomScore", 15], ["mipexScore", 15]];
const FREE_SUBS = [["pressFreedomScore", 35], ["democracyIndex", 35], ["corruptionPerceptionIndex", 30]];

function expectedConf(city, subs) {
  let avail = 0;
  for (const [f, w] of subs) {
    if (city[f] != null) avail += w;
  }
  return avail;
}

for (const c of cities) {
  const es = expectedConf(c, SAFETY_SUBS);
  if (c.safetyConfidence !== es) warn(`${c.name}(${c.id}): safetyConfidence=${c.safetyConfidence} expected ${es}`);

  const eh = expectedConf(c, HEALTH_SUBS);
  if (c.healthcareConfidence !== eh) warn(`${c.name}(${c.id}): healthcareConfidence=${c.healthcareConfidence} expected ${eh}`);

  const eg = expectedConf(c, GOV_SUBS);
  if (c.governanceConfidence !== eg) warn(`${c.name}(${c.id}): governanceConfidence=${c.governanceConfidence} expected ${eg}`);

  const ef = expectedConf(c, FREE_SUBS);
  if (c.freedomConfidence !== ef) warn(`${c.name}(${c.id}): freedomConfidence=${c.freedomConfidence} expected ${ef}`);

  const eSec = Math.round((es + eh + eg) / 3);
  if (c.securityConfidence !== eSec) warn(`${c.name}(${c.id}): securityConfidence=${c.securityConfidence} expected ${eSec}`);
}

// 1i. Required fields not null
for (const c of cities) {
  for (const f of ["id", "name", "country", "continent", "currency"]) {
    if (c[f] == null) fail(`${c.name || c.id}: required field ${f} is null`);
  }
  // Cost fields should be present but warn (not error) for new cities still being populated
  for (const f of ["costModerate", "costBudget"]) {
    if (c[f] == null) warn(`${c.name}(${c.id}): ${f} is null`);
  }
}

// 1j. No duplicate IDs
const idSet = new Set();
for (const c of cities) {
  if (idSet.has(c.id)) fail(`Duplicate city ID: ${c.id}`);
  idSet.add(c.id);
}

// ═══════════════════════════════════════════════════════════════
// 2. Validate SOT (if available and not --export)
// ═══════════════════════════════════════════════════════════════
if (!EXPORT_ONLY && existsSync(SOURCE_PATH)) {
  console.log("\nValidating SOT (data/cities-source.json)...\n");
  const sourceData = JSON.parse(readFileSync(SOURCE_PATH, "utf-8"));
  const srcCities = sourceData.cities;

  // 2a. SOT should not contain computed fields
  const COMPUTED = ["averageIncome", "homicideRateInv", "gpiScoreInv", "safetyIndex", "healthcareIndex",
    "governanceIndex", "freedomIndex", "safetyConfidence", "healthcareConfidence",
    "governanceConfidence", "freedomConfidence", "securityConfidence"];
  for (const c of srcCities) {
    for (const f of COMPUTED) {
      if (f in c) fail(`SOT: ${c.name}(${c.id}) should not have computed field '${f}'`);
    }
  }

  // 2b. SOT city count matches export
  if (srcCities.length !== cities.length) {
    fail(`SOT has ${srcCities.length} cities, export has ${cities.length}`);
  }

  // 2c. SOT IDs match export IDs
  const srcIds = new Set(srcCities.map(c => c.id));
  const expIds = new Set(cities.map(c => c.id));
  for (const id of srcIds) {
    if (!expIds.has(id)) fail(`SOT city ${id} not in export`);
  }
  for (const id of expIds) {
    if (!srcIds.has(id)) fail(`Export city ${id} not in SOT`);
  }
}

// ═══════════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════════
console.log(`\n${"═".repeat(40)}`);
console.log(`Errors: ${errors}  Warnings: ${warnings}`);
if (errors > 0) {
  console.log("VALIDATION FAILED");
  process.exit(1);
} else {
  console.log("VALIDATION PASSED" + (warnings > 0 ? ` (${warnings} warnings)` : ""));
}
