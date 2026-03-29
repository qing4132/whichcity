#!/usr/bin/env node
/**
 * Healthcare Index — pre-computed composite from 4 sub-indicators.
 *
 * Composite "Healthcare Index" (0–100, higher = better):
 *   35% Doctors per 1,000 population   (min-max normalized)
 *   25% Hospital beds per 1,000 pop.   (min-max normalized)
 *   25% UHC Service Coverage Index      (already 0-100)
 *   15% Life expectancy at birth        (min-max normalized)
 *
 * Data already stored in cities.json sub-fields:
 *   doctorsPerThousand, hospitalBedsPerThousand, uhcCoverageIndex, lifeExpectancy
 *
 * Confidence (aligned with safety index):
 *   Based on missing weight sum:
 *     sum = 0        → "high"
 *     sum < 1/3      → "medium"
 *     sum >= 1/3     → "low"
 */
import { readFileSync, writeFileSync } from "fs";

const citiesPath = "public/data/cities.json";
const data = JSON.parse(readFileSync(citiesPath, "utf8"));
const cities = data.cities;

// ─── Sub-indicator definitions ────────────────────────────────────
const SUBS = [
  { field: "doctorsPerThousand", weight: 0.35 },
  { field: "hospitalBedsPerThousand", weight: 0.25 },
  { field: "uhcCoverageIndex", weight: 0.25 },
  { field: "lifeExpectancy", weight: 0.15 },
];

// ─── Helper: min-max normalize an array to 0-100 ─────────────────
function minMaxNorm(values) {
  const valid = values.filter(v => v !== null);
  if (valid.length === 0) return values.map(() => null);
  const min = Math.min(...valid);
  const max = Math.max(...valid);
  if (max === min) return values.map(v => v === null ? null : 50);
  return values.map(v => v === null ? null : Math.round(((v - min) / (max - min)) * 100));
}

// ─── Step 1: Extract raw values ───────────────────────────────────
const rawArrays = {};
for (const sub of SUBS) {
  rawArrays[sub.field] = cities.map(c => {
    const v = c[sub.field];
    return (v !== null && v !== undefined) ? v : null;
  });
}

// ─── Step 2: Min-max normalize each sub-indicator ─────────────────
const normArrays = {};
for (const sub of SUBS) {
  normArrays[sub.field] = minMaxNorm(rawArrays[sub.field]);
}

// ─── Step 3: Compute composite healthcare index ───────────────────
let ok = 0;
for (let i = 0; i < cities.length; i++) {
  const city = cities[i];

  const vals = SUBS.map(sub => ({
    field: sub.field,
    val: normArrays[sub.field][i],
    w: sub.weight,
  }));

  // Confidence based on missing weight sum
  const missingWeightSum = vals
    .filter(v => v.val === null)
    .reduce((s, v) => s + v.w, 0);

  let confidence;
  if (missingWeightSum === 0) confidence = "high";
  else if (missingWeightSum < 1 / 3) confidence = "medium";
  else confidence = "low";

  // Redistribute weights for non-null sub-indicators
  const nonNull = vals.filter(v => v.val !== null);
  const totalWeight = nonNull.reduce((s, v) => s + v.w, 0);
  let composite = 0;
  for (const v of nonNull) {
    composite += v.val * (v.w / totalWeight);
  }

  city.healthcareIndex = nonNull.length > 0 ? Math.round(composite) : 0;
  city.healthcareConfidence = confidence;

  ok++;
}

console.log(`Computed healthcareIndex for ${ok} cities`);

// Print samples
const sampleIds = [1, 2, 3, 7, 14, 31, 49, 66, 85, 110];
const samples = cities.filter(c => sampleIds.includes(c.id));
for (const s of samples) {
  console.log(`  ${s.name}: ${s.healthcareIndex} (${s.healthcareConfidence})`);
  console.log(`    doctors=${s.doctorsPerThousand} beds=${s.hospitalBedsPerThousand} uhc=${s.uhcCoverageIndex} life=${s.lifeExpectancy}`);
}

writeFileSync(citiesPath, JSON.stringify(data, null, 2) + "\n");
console.log("Written to", citiesPath);
