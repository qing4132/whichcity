#!/usr/bin/env node
/**
 * Institutional Freedom Index — pre-computed composite from 3 sub-indicators.
 *
 * Composite "Freedom Index" (0–100, higher = freer):
 *   35% Press Freedom Score              (RSF, already 0-100)
 *   35% Democracy Index × 10             (EIU, 0-10 → 0-100)
 *   30% Corruption Perceptions Index     (TI CPI, already 0-100)
 *
 * Data already stored in cities.json sub-fields:
 *   pressFreedomScore, democracyIndex, corruptionPerceptionIndex
 *
 * Confidence (aligned with safety & healthcare):
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
  { field: "pressFreedomScore", weight: 0.35, scale: v => v },           // already 0-100
  { field: "democracyIndex",    weight: 0.35, scale: v => v * 10 },      // 0-10 → 0-100
  { field: "corruptionPerceptionIndex", weight: 0.30, scale: v => v },   // already 0-100
];

// ─── Compute composite freedom index ──────────────────────────────
let ok = 0;
for (let i = 0; i < cities.length; i++) {
  const city = cities[i];

  const vals = SUBS.map(sub => {
    const raw = city[sub.field];
    const val = (raw !== null && raw !== undefined) ? sub.scale(raw) : null;
    return { field: sub.field, val, w: sub.weight };
  });

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

  city.freedomIndex = nonNull.length > 0 ? Math.round(composite) : 0;
  city.freedomConfidence = confidence;

  ok++;
}

console.log(`Computed freedomIndex for ${ok} cities`);

// Print samples
const sampleIds = [1, 2, 3, 7, 14, 31, 49, 66, 72, 85, 110];
const samples = cities.filter(c => sampleIds.includes(c.id));
for (const s of samples) {
  console.log(`  ${s.name}: ${s.freedomIndex} (${s.freedomConfidence})`);
  console.log(`    press=${s.pressFreedomScore} democracy=${s.democracyIndex} cpi=${s.corruptionPerceptionIndex}`);
}

writeFileSync(citiesPath, JSON.stringify(data, null, 2) + "\n");
console.log("Written to", citiesPath);
