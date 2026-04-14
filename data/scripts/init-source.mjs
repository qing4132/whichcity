#!/usr/bin/env node
/**
 * init-source.mjs — One-time: Extract raw fields from current cities.json
 * to create the initial Source of Truth (data/cities-source.json).
 *
 * This strips computed fields (composite indices, inversions, confidence scores)
 * since those are now recomputed by the export pipeline.
 *
 * Usage: node data/scripts/init-source.mjs
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const INPUT = join(ROOT, "public/data/cities.json");
const OUTPUT = join(ROOT, "data/cities-source.json");

if (existsSync(OUTPUT)) {
  console.error(`${OUTPUT} already exists. Delete it first to re-init.`);
  process.exit(1);
}

// Fields to keep in SOT (raw data only — no computed/derived fields)
const RAW_FIELDS = [
  "id", "name", "country", "continent", "currency", "description",
  "professions",
  "costModerate", "costBudget", "bigMacPrice",
  "housePrice", "monthlyRent",
  "annualWorkHours", "paidLeaveDays", "internetSpeedMbps",
  "airQuality", "aqiSource",
  "doctorsPerThousand", "hospitalBedsPerThousand", "uhcCoverageIndex",
  "lifeExpectancy", "outOfPocketPct",
  "numbeoSafetyIndex", "homicideRate", "gpiScore", "gallupLawOrder", "wpsIndex",
  "safetyWarning",
  "pressFreedomScore", "democracyIndex", "corruptionPerceptionIndex",
  "govEffectiveness", "wjpRuleLaw", "internetFreedomScore", "mipexScore",
  "directFlightCities",
  "climate", "timezone",
];

// Computed fields that will be removed (recomputed by export.mjs)
const COMPUTED_FIELDS = [
  "homicideRateInv", "gpiScoreInv",
  "safetyIndex", "healthcareIndex", "governanceIndex", "freedomIndex",
  "safetyConfidence", "healthcareConfidence", "governanceConfidence",
  "freedomConfidence", "securityConfidence",
];

const data = JSON.parse(readFileSync(INPUT, "utf-8"));
const cities = data.cities;

console.log(`Read ${cities.length} cities from ${INPUT}`);

const result = [];
let strippedCount = 0;

for (const city of cities) {
  const raw = {};
  for (const f of RAW_FIELDS) {
    if (f in city) raw[f] = city[f];
  }
  // Count stripped fields
  for (const f of COMPUTED_FIELDS) {
    if (f in city) strippedCount++;
  }
  result.push(raw);
}

const output = {
  $schema: "Source of Truth for WhichCity city data. Computed fields are derived by data/scripts/export.mjs.",
  version: "1.0.0",
  lastUpdated: new Date().toISOString().slice(0, 10),
  cities: result,
};

writeFileSync(OUTPUT, JSON.stringify(output, null, 2) + "\n", "utf-8");
console.log(`\n✅ Created ${OUTPUT}`);
console.log(`   ${result.length} cities, ${RAW_FIELDS.length} raw fields each`);
console.log(`   Stripped ${strippedCount} computed field values`);
console.log(`\nNext: run 'node data/scripts/export.mjs --diff' to verify round-trip.`);
