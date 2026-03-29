#!/usr/bin/env node
/**
 * Safety Index v2 — computed from 4 verifiable international data sources.
 *
 * Composite "Safety Index" (0–100, higher = safer):
 *   35% Numbeo Safety Index   — city-level (0-100, from Numbeo)
 *   30% Homicide Rate Inverse — country-level (UNODC, min-max normalized, inverted)
 *   20% GPI Score Inverse     — country-level (IEP Global Peace Index, converted to 0-100)
 *   15% Gallup Law & Order    — country-level (Gallup, 0-100)
 *
 * Data sources (stored in data/sources/):
 *   - numbeo-safety-2025.json   — Numbeo Safety Index by City
 *   - unodc-homicide-2024.json  — UNODC Intentional Homicide per 100k
 *   - gpi-2025.json             — IEP Global Peace Index (1-5 scale)
 *   - gallup-law-order-2024.json — Gallup Law & Order Index (0-100)
 *
 * Confidence is auto-computed (weight-sum based, aligned with healthcare & freedom):
 *   Missing weight sum = 0      → "high"
 *   Missing weight sum < 1/3    → "medium"
 *   Missing weight sum >= 1/3   → "low"
 *
 * Special warnings (safetyWarning field):
 *   "active_conflict"      — active armed conflict zone
 *   "extreme_instability"  — collapsed governance / severe data lag
 *   "data_blocked"         — information blockade, data unobtainable
 */
import { readFileSync, writeFileSync } from "fs";

// ─── City English name mapping for Numbeo lookup ──────────────────
const CITY_EN_NAMES = {
  1: "New York", 2: "London", 3: "Tokyo", 4: "Beijing", 5: "Shanghai",
  6: "Sydney", 7: "Singapore", 8: "Paris", 9: "Toronto", 10: "Hong Kong",
  11: "Los Angeles", 12: "San Francisco", 13: "Chicago", 14: "Dubai",
  15: "Amsterdam", 16: "Zurich", 17: "Geneva", 18: "Munich", 19: "Berlin",
  20: "Barcelona", 21: "Madrid", 22: "Milan", 23: "Rome", 24: "Brussels",
  25: "Vienna", 26: "Prague", 27: "Warsaw", 28: "Lisbon", 29: "Athens",
  30: "Istanbul", 31: "Mexico City", 32: "São Paulo", 33: "Rio de Janeiro",
  34: "Miami", 35: "Washington DC", 36: "Boston", 37: "Seattle", 38: "Denver",
  39: "Austin", 40: "Vancouver", 41: "Montreal", 42: "Melbourne", 43: "Brisbane",
  44: "Auckland", 45: "Bangkok", 46: "Kuala Lumpur", 47: "Ho Chi Minh City",
  48: "Hanoi", 49: "Bengaluru", 50: "Mumbai", 51: "New Delhi", 52: "Nairobi",
  53: "Cairo", 54: "Tehran", 55: "Karachi", 56: "Islamabad", 57: "Jakarta",
  58: "Manila", 59: "Seoul", 60: "Busan", 61: "Taipei", 62: "Buenos Aires",
  63: "Santiago", 64: "Bogota", 65: "Lima", 66: "Caracas", 67: "Johannesburg",
  68: "Cape Town", 69: "Guadalajara", 70: "San José", 71: "Panama City",
  72: "Havana", 73: "San Juan", 74: "Montego Bay", 75: "Abu Dhabi", 76: "Doha",
  77: "Manama", 78: "Riyadh", 79: "Muscat", 80: "Beirut", 81: "Amman",
  82: "Tel Aviv", 83: "Hyderabad", 84: "Pune", 85: "Kyiv", 86: "Bucharest",
  87: "Sofia", 88: "Zagreb", 89: "Belgrade", 90: "Budapest", 91: "Bratislava",
  92: "Ljubljana", 93: "Dublin", 94: "Belfast", 95: "Atlanta", 96: "Phoenix",
  97: "Portland", 98: "San Diego", 99: "Las Vegas", 100: "Tampa",
  101: "Guangzhou", 102: "Shenzhen", 103: "Chengdu", 104: "Hangzhou",
  105: "Chongqing", 106: "Osaka", 107: "Nagoya", 108: "Incheon",
  109: "Phnom Penh", 110: "Yangon",
  112: "Chiang Mai",
  114: "Dhaka", 115: "Colombo", 116: "Kathmandu",
  117: "Almaty", 118: "Tashkent", 119: "Baku", 120: "Ulaanbaatar",
  121: "Stockholm", 122: "Copenhagen", 123: "Helsinki", 124: "Oslo",
  125: "Houston", 126: "Philadelphia", 127: "Calgary", 128: "Perth",
  129: "Medellín", 130: "Tbilisi", 131: "Lagos", 132: "Moscow",
  133: "San Jose US", 134: "Irvine", 135: "Ottawa",
  136: "Luxembourg City", 137: "Tallinn", 138: "Fukuoka", 139: "Yokohama",
};

// ─── Special warnings for specific cities ─────────────────────────
const SAFETY_WARNINGS = {
  85: "active_conflict",       // Kyiv — active armed conflict
};

// ─── Load source data ─────────────────────────────────────────────
const numbeo = JSON.parse(readFileSync("data/sources/numbeo-safety-2025.json", "utf8"));
const unodc = JSON.parse(readFileSync("data/sources/unodc-homicide-2024.json", "utf8"));
const gpiData = JSON.parse(readFileSync("data/sources/gpi-2025.json", "utf8"));
const gallup = JSON.parse(readFileSync("data/sources/gallup-law-order-2024.json", "utf8"));
const citiesPath = "public/data/cities.json";
const data = JSON.parse(readFileSync(citiesPath, "utf8"));

// ─── Helper: min-max normalize an array to 0-100 ─────────────────
function minMaxNorm(values) {
  const valid = values.filter(v => v !== null);
  const min = Math.min(...valid);
  const max = Math.max(...valid);
  if (max === min) return values.map(v => v === null ? null : 50);
  return values.map(v => v === null ? null : Math.round(((v - min) / (max - min)) * 100));
}

// ─── Step 1: Extract raw sub-indicator values per city ────────────
const rawNumbeo = [];
const rawHomicide = [];
const rawGpi = [];
const rawGallup = [];

for (const city of data.cities) {
  const enName = CITY_EN_NAMES[city.id];
  const country = city.country;

  // Numbeo Safety Index (city-level, already 0-100)
  const nVal = numbeo.cities[enName] ?? null;
  rawNumbeo.push(nVal);

  // UNODC homicide rate (country-level) — will be inverted after normalization
  const hRate = unodc.countries[country] ?? null;
  rawHomicide.push(hRate);

  // GPI score (country-level, 1-5 scale → converted to 0-100, lower GPI = higher safety)
  const gpiScore = gpiData.countries[country] ?? null;
  const gpiConverted = gpiScore !== null ? Math.round(((5 - gpiScore) / 4) * 100) : null;
  rawGpi.push(gpiConverted);

  // Gallup Law & Order (country-level, already 0-100)
  const gVal = gallup.countries[country] ?? null;
  rawGallup.push(gVal);
}

// ─── Step 2: Normalize homicide rate (inverted: lower rate = higher score) ──
// Homicide: min-max normalize then invert (100 - norm)
const normHomicideRaw = minMaxNorm(rawHomicide);
const normHomicide = normHomicideRaw.map(v => v === null ? null : 100 - v);

// Numbeo, GPI converted, and Gallup are already on 0-100 scale, use as-is
const normNumbeo = rawNumbeo.map(v => v === null ? null : Math.round(v));
const normGpi = rawGpi;
const normGallup = rawGallup;

// ─── Step 3: Compute composite safety index ───────────────────────
const WEIGHTS = { numbeo: 0.35, homicide: 0.30, gpi: 0.20, gallup: 0.15 };

let ok = 0;
for (let i = 0; i < data.cities.length; i++) {
  const city = data.cities[i];

  const vals = [
    { key: "numbeo", val: normNumbeo[i], w: WEIGHTS.numbeo },
    { key: "homicide", val: normHomicide[i], w: WEIGHTS.homicide },
    { key: "gpi", val: normGpi[i], w: WEIGHTS.gpi },
    { key: "gallup", val: normGallup[i], w: WEIGHTS.gallup },
  ];

  // Confidence based on missing weight sum
  const missingWeightSum = vals
    .filter(v => v.val === null)
    .reduce((s, v) => s + v.w, 0);
  const nonNull = vals.filter(v => v.val !== null);

  // Redistribute weights for missing sub-indicators
  const totalWeight = nonNull.reduce((s, v) => s + v.w, 0);
  let composite = 0;
  for (const v of nonNull) {
    composite += v.val * (v.w / totalWeight);
  }

  // Auto-compute confidence (aligned: weight-sum based)
  let confidence;
  if (missingWeightSum === 0) confidence = "high";
  else if (missingWeightSum < 1 / 3) confidence = "medium";
  else confidence = "low";

  // Write fields
  city.numbeoSafetyIndex = normNumbeo[i];
  city.homicideRateInv = normHomicide[i];
  city.gpiScoreInv = normGpi[i];
  city.gallupLawOrder = normGallup[i];
  city.safetyIndex = nonNull.length > 0 ? Math.round(composite) : 0;
  city.safetyConfidence = confidence;

  // Special warnings
  if (SAFETY_WARNINGS[city.id]) {
    city.safetyWarning = SAFETY_WARNINGS[city.id];
  } else {
    delete city.safetyWarning;
  }

  // Remove old v1 sub-fields
  delete city.safetyNightSafety;
  delete city.safetyViolentCrimeInv;
  delete city.safetyPropertyCrimeInv;
  delete city.safetyForeignerFriendly;

  ok++;
}

console.log(`Computed safetyIndex v2 for ${ok} cities`);

// Print samples
const sampleIds = [1, 3, 7, 14, 31, 66, 72, 85, 110];
const samples = data.cities.filter(c => sampleIds.includes(c.id));
for (const s of samples) {
  const w = s.safetyWarning ? ` [${s.safetyWarning}]` : "";
  console.log(`  ${s.name}: ${s.safetyIndex} (${s.safetyConfidence})${w}`);
  console.log(`    numbeo=${s.numbeoSafetyIndex ?? "null"} homicide=${s.homicideRateInv ?? "null"} gpi=${s.gpiScoreInv ?? "null"} gallup=${s.gallupLawOrder ?? "null"}`);
}

writeFileSync(citiesPath, JSON.stringify(data, null, 2) + "\n");
console.log("Written to", citiesPath);
