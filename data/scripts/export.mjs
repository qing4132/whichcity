#!/usr/bin/env node
/**
 * export.mjs — Source-of-Truth → Frontend JSON export pipeline
 *
 * Reads data/cities-source.json (raw data only), computes all derived fields
 * (composite indices, inversions, confidence scores), validates, and writes
 * public/data/cities.json for frontend consumption.
 *
 * Usage:
 *   node data/scripts/export.mjs           # export + validate
 *   node data/scripts/export.mjs --check   # validate only, no write (CI mode)
 *   node data/scripts/export.mjs --diff    # show changes vs current export
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const SOURCE_PATH = join(ROOT, "data/cities-source.json");
const OUTPUT_PATH = join(ROOT, "public/data/cities.json");

const CHECK_ONLY = process.argv.includes("--check");
const SHOW_DIFF = process.argv.includes("--diff");

// ═══════════════════════════════════════════════════════════════
// Composite index weights (authoritative definition)
// ═══════════════════════════════════════════════════════════════
const SAFETY_WEIGHTS = [
  { field: "homicideRateInv",     rawField: "homicideRate",         weight: 35 },
  { field: "politicalStability",  rawField: "politicalStability",   weight: 25 },
  { field: "ruleLawWGI",          rawField: "ruleLawWGI",           weight: 20 },
  { field: "controlOfCorruption", rawField: "controlOfCorruption",  weight: 20 },
];

const HEALTHCARE_WEIGHTS = [
  { field: "doctorsNorm",  rawField: "doctorsPerThousand",      weight: 25 },
  { field: "uhcNorm",      rawField: "uhcCoverageIndex",        weight: 25 },
  { field: "bedsNorm",     rawField: "hospitalBedsPerThousand", weight: 20 },
  { field: "lifeNorm",     rawField: "lifeExpectancy",          weight: 15 },
  { field: "oopInvNorm",   rawField: "outOfPocketPct",          weight: 15 },
];

const GOVERNANCE_WEIGHTS = [
  { field: "corruptionPerceptionIndex", rawField: "corruptionPerceptionIndex", weight: 50 },
  { field: "govEffectiveness",          rawField: "govEffectiveness",          weight: 50 },
];

const FREEDOM_WEIGHTS = [
  { field: "democracyNorm",             rawField: "democracyIndex",            weight: 55 },
  { field: "corruptionPerceptionIndex", rawField: "corruptionPerceptionIndex", weight: 45 },
];

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════
let errors = 0;
let warnings = 0;
const fail = (msg) => { console.error(`  ✗ ${msg}`); errors++; };
const warn = (msg) => { console.warn(`  ⚠ ${msg}`); warnings++; };

function minMaxNorm(val, min, max) {
  if (val == null) return null;
  if (max === min) return 50;
  return Math.max(0, Math.min(100, ((val - min) / (max - min)) * 100));
}

function computeWeightedAvg(subs) {
  const available = subs.filter(s => s.val != null);
  if (available.length === 0) return null;
  const totalWeight = available.reduce((sum, s) => sum + s.weight, 0);
  return available.reduce((sum, s) => sum + (s.val * s.weight / totalWeight), 0);
}

function computeConfidence(city, weightDefs) {
  let available = 0;
  for (const { rawField, weight } of weightDefs) {
    if (city[rawField] != null) available += weight;
  }
  return available; // 0-100
}

function roundTo1(val) {
  return val != null ? Math.round(val * 10) / 10 : null;
}

// ═══════════════════════════════════════════════════════════════
// Raw fields (kept from SOT as-is)
// ═══════════════════════════════════════════════════════════════
const RAW_FIELDS = [
  "id", "name", "country", "continent", "currency", "description",
  "professions", "hidden",
  "costModerate", "costBudget", "bigMacPrice",
  "housePrice", "monthlyRent",
  "annualWorkHours", "paidLeaveDays", "internetSpeedMbps",
  "airQuality", "aqiSource",
  "doctorsPerThousand", "hospitalBedsPerThousand", "uhcCoverageIndex",
  "lifeExpectancy", "outOfPocketPct",
  "homicideRate", "politicalStability", "ruleLawWGI", "controlOfCorruption",
  "safetyWarning",
  "democracyIndex", "corruptionPerceptionIndex",
  "govEffectiveness",
  "inflationRate", "unemploymentRate", "gdpPppPerCapita",
  "pm25", "broadbandPer100", "regulatoryQuality",
  "netMigration", "nursesPerThousand", "healthExpPerCapita",
  "tertiaryEnrollment", "hdi", "gii",
  "inflationForecast", "gdpGrowthForecast", "gniPerCapita",
  "minimumWagePPP", "weeklyHoursEmp", "earningsGini", "genderWageGap",
  "directFlightCities",
  "climate", "timezone",
];

// ═══════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════
console.log("═══ WhichCity Data Export Pipeline ═══\n");

// 1. Load source data
if (!existsSync(SOURCE_PATH)) {
  console.error(`Source not found: ${SOURCE_PATH}`);
  console.error("Run 'node data/scripts/init-source.mjs' first.");
  process.exit(1);
}
const sourceData = JSON.parse(readFileSync(SOURCE_PATH, "utf-8"));
const cities = sourceData.cities;
console.log(`Loaded ${cities.length} cities from source.\n`);

// 2. Compute global normalization anchors
const vals = (field) => cities.map(c => c[field]).filter(v => v != null);

const homicideRates = vals("homicideRate");
const homicideMin = Math.min(...homicideRates);
const homicideMax = Math.max(...homicideRates);

const allDoctors = vals("doctorsPerThousand");
const allBeds = vals("hospitalBedsPerThousand");
const allLife = vals("lifeExpectancy");
const allOOP = vals("outOfPocketPct");

const doctorsMax = Math.max(...allDoctors);
const bedsMax = Math.max(...allBeds);
const lifeMin = Math.min(...allLife);
const lifeMax = Math.max(...allLife);
const oopMin = Math.min(...allOOP);
const oopMax = Math.max(...allOOP);

console.log("Normalization anchors:");
console.log(`  HomicideRate: [${homicideMin}, ${homicideMax}]`);
console.log(`  Doctors:      [0, ${doctorsMax}]`);
console.log(`  Beds:         [0, ${bedsMax}]`);
console.log(`  Life:         [${lifeMin}, ${lifeMax}]`);
console.log(`  OOP:          [${oopMin}, ${oopMax}] (inverted)\n`);

// 3. Compute derived fields for each city
const output = [];

for (const src of cities) {
  const city = {};

  // Copy raw fields
  for (const f of RAW_FIELDS) {
    if (f in src) city[f] = src[f];
    else if (f === "safetyWarning") continue; // optional
    else if (f === "aqiSource") continue; // optional
    else if (f === "timezone") continue; // optional
    else if (f === "climate") continue; // optional
    else if (f === "hidden") continue; // optional, defaults to false
  }

  // ── averageIncome (auto-computed from professions median) ──
  if (src.professions) {
    const sorted = Object.values(src.professions).sort((a, b) => a - b);
    city.averageIncome = sorted[Math.floor(sorted.length / 2)];
  }

  // ── Inversions ──
  city.homicideRateInv = src.homicideRate != null
    ? roundTo1(100 - minMaxNorm(src.homicideRate, homicideMin, homicideMax))
    : null;

  // ── Safety Index (100% WB CC BY 4.0) ──
  const safetySubs = [
    { val: city.homicideRateInv,     weight: 35 },
    { val: src.politicalStability,   weight: 25 },
    { val: src.ruleLawWGI,           weight: 20 },
    { val: src.controlOfCorruption,  weight: 20 },
  ];
  city.safetyIndex = roundTo1(computeWeightedAvg(safetySubs));
  city.safetyConfidence = computeConfidence(src, SAFETY_WEIGHTS);

  // ── Healthcare Index ──
  const doctorsNorm = minMaxNorm(src.doctorsPerThousand, 0, doctorsMax);
  const bedsNorm = minMaxNorm(src.hospitalBedsPerThousand, 0, bedsMax);
  const lifeNorm = minMaxNorm(src.lifeExpectancy, lifeMin, lifeMax);
  const oopInv = src.outOfPocketPct != null
    ? 100 - minMaxNorm(src.outOfPocketPct, oopMin, oopMax)
    : null;
  const healthSubs = [
    { val: doctorsNorm,           weight: 25 },
    { val: src.uhcCoverageIndex,  weight: 25 },
    { val: bedsNorm,              weight: 20 },
    { val: lifeNorm,              weight: 15 },
    { val: oopInv,                weight: 15 },
  ];
  city.healthcareIndex = roundTo1(computeWeightedAvg(healthSubs));
  city.healthcareConfidence = computeConfidence(src, HEALTHCARE_WEIGHTS);

  // ── Governance Index (TI CC BY 4.0 + WB CC BY 4.0) ──
  const govSubs = [
    { val: src.corruptionPerceptionIndex, weight: 50 },
    { val: src.govEffectiveness,          weight: 50 },
  ];
  city.governanceIndex = roundTo1(computeWeightedAvg(govSubs));
  city.governanceConfidence = computeConfidence(src, GOVERNANCE_WEIGHTS);

  // ── Freedom Index (WB CC BY 4.0 + TI CC BY 4.0) ──
  const democracyNorm = src.democracyIndex != null ? src.democracyIndex * 10 : null;
  const freedomSubs = [
    { val: democracyNorm,                  weight: 55 },
    { val: src.corruptionPerceptionIndex, weight: 45 },
  ];
  city.freedomIndex = roundTo1(computeWeightedAvg(freedomSubs)) ?? 0;
  city.freedomConfidence = computeConfidence(src, FREEDOM_WEIGHTS);

  // ── Security Confidence (avg of 3 groups) ──
  city.securityConfidence = Math.round(
    (city.safetyConfidence + city.healthcareConfidence + city.governanceConfidence) / 3
  );

  output.push(city);
}

// 4. Validate
console.log("Validating...\n");

for (const c of output) {
  // Required fields
  if (!c.id || !c.name || !c.country) fail(`${c.name || "?"}: missing identity fields`);

  // Profession count
  const profCount = c.professions ? Object.keys(c.professions).length : 0;
  if (profCount !== 25) fail(`${c.name}(${c.id}): ${profCount} professions, expected 25`);

  // Index ranges
  for (const f of ["safetyIndex", "healthcareIndex", "governanceIndex", "freedomIndex"]) {
    if (c[f] != null && (c[f] < 0 || c[f] > 100)) fail(`${c.name}(${c.id}): ${f}=${c[f]} out of [0,100]`);
  }

  // Confidence ranges
  for (const f of ["safetyConfidence", "healthcareConfidence", "governanceConfidence", "freedomConfidence", "securityConfidence"]) {
    if (typeof c[f] !== "number") fail(`${c.name}(${c.id}): ${f} is not a number`);
    if (c[f] < 0 || c[f] > 100) fail(`${c.name}(${c.id}): ${f}=${c[f]} out of [0,100]`);
  }

  // Climate consistency
  const cl = c.climate;
  if (cl?.monthlyRainMm?.length === 12 && cl.annualRainMm > 0) {
    const sum = cl.monthlyRainMm.reduce((a, b) => a + b, 0);
    const diff = Math.abs(sum - cl.annualRainMm);
    if (diff / cl.annualRainMm > 0.20) {
      warn(`${c.name}(${c.id}): rain sum=${Math.round(sum)} vs annual=${cl.annualRainMm}`);
    }
  }
  if (cl?.monthlyHighC && cl?.monthlyLowC) {
    for (let m = 0; m < 12; m++) {
      if (cl.monthlyHighC[m] < cl.monthlyLowC[m]) {
        fail(`${c.name}(${c.id}): month ${m+1} high < low`);
      }
    }
  }

  // averageIncome vs profession median (warning only)
  if (c.professions && c.averageIncome) {
    const sorted = Object.values(c.professions).sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    if (median > 0) {
      const ratio = c.averageIncome / median;
      if (ratio < 0.2 || ratio > 5.0) {
        fail(`${c.name}(${c.id}): averageIncome/median ratio ${ratio.toFixed(2)} out of [0.2, 5.0]`);
      }
    }
  }
}

// 5. Show diff if requested
if (SHOW_DIFF && existsSync(OUTPUT_PATH)) {
  const current = JSON.parse(readFileSync(OUTPUT_PATH, "utf-8"));
  let diffs = 0;
  for (const city of output) {
    const old = current.cities?.find(c => c.id === city.id);
    if (!old) { console.log(`  + NEW: ${city.name}(${city.id})`); diffs++; continue; }
    for (const key of Object.keys(city)) {
      const ov = JSON.stringify(old[key]);
      const nv = JSON.stringify(city[key]);
      if (ov !== nv) {
        console.log(`  Δ ${city.name}(${city.id}).${key}: ${ov} → ${nv}`);
        diffs++;
      }
    }
  }
  console.log(`\n${diffs} differences found.\n`);
}

// 6. Write output
console.log(`${"═".repeat(40)}`);
console.log(`Errors: ${errors}  Warnings: ${warnings}`);

if (errors > 0) {
  console.log("EXPORT FAILED — not writing output.");
  process.exit(1);
}

if (CHECK_ONLY) {
  console.log("CHECK PASSED" + (warnings > 0 ? ` (${warnings} warnings)` : ""));
  process.exit(0);
}

const outputData = { cities: output };
writeFileSync(OUTPUT_PATH, JSON.stringify(outputData, null, 2) + "\n", "utf-8");
console.log(`\n✅ Exported ${output.length} cities → ${OUTPUT_PATH}`);
