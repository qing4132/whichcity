#!/usr/bin/env node
/**
 * update-confidence-numbers.mjs
 *
 * Recalculates safetyConfidence, healthcareConfidence, governanceConfidence
 * from string tiers ("high"/"medium"/"low") to weighted percentage numbers (0–100).
 *
 * Formula per group:
 *   groupConfidence = sum(available sub-indicator weights) / sum(all weights) * 100
 *
 * Weights match the composite index computation in merge-new-indicators.mjs:
 *   Safety:     numbeoSafetyIndex(30) + homicideRateInv(25) + gpiScoreInv(20) + gallupLawOrder(15) + wpsIndex(10)
 *   Healthcare: doctorsPerThousand(25) + hospitalBedsPerThousand(20) + uhcCoverageIndex(25) + lifeExpectancy(15) + outOfPocketPct(15)
 *   Governance: corruptionPerceptionIndex(25) + govEffectiveness(25) + wjpRuleLaw(20) + pressFreedomScore(15) + mipexScore(15)
 *
 * Also adds securityConfidence (综合评级可信度) = average of three group confidences.
 */

import { readFileSync, writeFileSync } from "fs";

const CITIES_PATH = "public/data/cities.json";

const SAFETY_SUBS = [
  ["numbeoSafetyIndex", 30],
  ["homicideRate", 25],      // use raw field presence (homicideRate or homicideRateInv)
  ["gpiScore", 20],          // use raw field presence (gpiScore or gpiScoreInv)
  ["gallupLawOrder", 15],
  ["wpsIndex", 10],
];

const HEALTH_SUBS = [
  ["doctorsPerThousand", 25],
  ["hospitalBedsPerThousand", 20],
  ["uhcCoverageIndex", 25],
  ["lifeExpectancy", 15],
  ["outOfPocketPct", 15],
];

const GOV_SUBS = [
  ["corruptionPerceptionIndex", 25],
  ["govEffectiveness", 25],
  ["wjpRuleLaw", 20],
  ["pressFreedomScore", 15],
  ["mipexScore", 15],
];

function groupConfidence(city, subs) {
  let available = 0;
  for (const [field, weight] of subs) {
    if (city[field] != null) available += weight;
  }
  return available; // out of 100
}

// ── Main ──
const data = JSON.parse(readFileSync(CITIES_PATH, "utf-8"));
const cities = data.cities;

console.log(`Processing ${cities.length} cities...`);

const dist = { 100: 0, "90-99": 0, "80-89": 0, "70-79": 0, "<70": 0 };
let changed = 0;

for (const city of cities) {
  const sc = groupConfidence(city, SAFETY_SUBS);
  const hc = groupConfidence(city, HEALTH_SUBS);
  const gc = groupConfidence(city, GOV_SUBS);
  const avg = Math.round((sc + hc + gc) / 3);

  const oldSC = city.safetyConfidence;
  const oldHC = city.healthcareConfidence;
  const oldGC = city.governanceConfidence;

  city.safetyConfidence = sc;
  city.healthcareConfidence = hc;
  city.governanceConfidence = gc;
  city.securityConfidence = avg;

  if (typeof oldSC === "string" || typeof oldHC === "string" || typeof oldGC === "string") changed++;

  // Distribution
  if (avg === 100) dist["100"]++;
  else if (avg >= 90) dist["90-99"]++;
  else if (avg >= 80) dist["80-89"]++;
  else if (avg >= 70) dist["70-79"]++;
  else dist["<70"]++;
}

console.log(`\nConverted ${changed} cities from string to number confidence`);
console.log("Distribution of securityConfidence (avg):", JSON.stringify(dist));

// Show non-100% cities
const nonFull = cities
  .filter(c => c.securityConfidence < 100)
  .sort((a, b) => a.securityConfidence - b.securityConfidence)
  .map(c => `  ${c.name.padEnd(22)} S:${c.safetyConfidence}  H:${c.healthcareConfidence}  G:${c.governanceConfidence}  avg:${c.securityConfidence}`);

console.log(`\nNon-100% cities (${nonFull.length}):`);
nonFull.forEach(l => console.log(l));

writeFileSync(CITIES_PATH, JSON.stringify(data, null, 2) + "\n", "utf-8");
console.log(`\n✅ Written to ${CITIES_PATH}`);
