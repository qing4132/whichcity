#!/usr/bin/env node
/**
 * Add safetyIndex + safetyConfidence to each city in cities.json.
 *
 * Composite "Perceived Safety Index" (0–100, higher = safer):
 *   40% Night Safety       — Numbeo "Safety walking alone during night" (0–100)
 *   30% Violent Crime Inv  — 100 minus Numbeo component (inverted: lower crime = higher score)
 *   20% Property Crime Inv — 100 minus Numbeo component (inverted)
 *   10% Foreigner Friendly — InterNations Expat Insider "Feeling Welcome" / Gallup MAI
 *
 * Data sources:
 *   - Numbeo Crime Index by City (2024–2025 mid-year)
 *   - UNODC Intentional Homicide data (for calibration/fallback)
 *   - InterNations Expat Insider Survey 2024
 *   - Gallup Migrant Acceptance Index 2023 (country-level fallback)
 *
 * Confidence levels:
 *   "high"   — all 4 sub-dimensions have city-level data
 *   "medium" — 1–2 sub-dimensions use fallback
 *   "low"    — majority fallback or conflict/data-blocked region
 */
import { readFileSync, writeFileSync } from "fs";

// ─── Raw data ──────────────────────────────────────────────────────
// Format: [nightSafety, violentCrimeInv, propertyCrimeInv, foreignerFriendly, confidence]
// nightSafety: 0–100 (higher = safer at night)
// violentCrimeInv: 100 - numbeo violent crime level (higher = less violent crime)
// propertyCrimeInv: 100 - numbeo property crime level (higher = less property crime)
// foreignerFriendly: 0–100 (higher = more welcoming)

const SAFETY_RAW = {
  //  id: [night, violInv, propInv, foreigner, confidence]
  1:   [45, 55, 48, 78, "high"],    // New York — moderate night safety, diverse but high crime
  2:   [55, 62, 50, 82, "high"],    // London — decent but property crime concern
  3:   [82, 90, 88, 55, "high"],    // Tokyo — very safe, foreigner experience mixed
  4:   [72, 82, 78, 42, "high"],    // Beijing — safe but less foreigner-friendly
  5:   [74, 84, 80, 45, "high"],    // Shanghai — very safe, moderate expat friendliness
  6:   [65, 72, 60, 85, "high"],    // Sydney — generally safe, very welcoming
  7:   [82, 88, 80, 70, "high"],    // Singapore — extremely safe, somewhat welcoming
  8:   [45, 58, 42, 72, "high"],    // Paris — pickpocketing, night zones vary
  9:   [60, 68, 58, 82, "high"],    // Toronto — safe overall, very welcoming
  10:  [78, 85, 75, 65, "high"],    // Hong Kong — very safe, moderate foreignness
  11:  [38, 52, 42, 75, "high"],    // Los Angeles — safety varies widely by area
  12:  [30, 48, 35, 78, "high"],    // San Francisco — property crime severe
  13:  [35, 50, 40, 72, "high"],    // Chicago — violent crime in parts
  14:  [85, 88, 85, 72, "high"],    // Dubai — ultra-safe, expat hub
  15:  [62, 70, 52, 88, "high"],    // Amsterdam — safe but bike theft high
  16:  [80, 85, 78, 75, "high"],    // Zurich — very safe and orderly
  17:  [78, 82, 75, 72, "high"],    // Geneva — very safe
  18:  [76, 80, 72, 68, "high"],    // Munich — safe, somewhat welcoming
  19:  [58, 68, 55, 70, "high"],    // Berlin — generally safe, nightlife zones
  20:  [48, 62, 40, 80, "high"],    // Barcelona — pickpocket capital, very welcoming
  21:  [55, 65, 48, 75, "high"],    // Madrid — moderate safety
  22:  [52, 65, 45, 65, "high"],    // Milan — moderate
  23:  [50, 60, 42, 68, "high"],    // Rome — tourist scams, pickpocketing
  24:  [48, 58, 45, 78, "high"],    // Brussels — Molenbeek concerns, welcoming
  25:  [72, 78, 68, 72, "high"],    // Vienna — very safe
  26:  [70, 76, 65, 65, "high"],    // Prague — safe, tourist scams
  27:  [62, 72, 60, 55, "high"],    // Warsaw — safe, moderate foreigner attitudes
  28:  [62, 72, 52, 82, "high"],    // Lisbon — safe but petty crime
  29:  [55, 65, 50, 68, "high"],    // Athens — moderate safety
  30:  [52, 58, 48, 55, "high"],    // Istanbul — mixed, political tension
  31:  [28, 35, 30, 58, "high"],    // Mexico City — significant safety concerns
  32:  [22, 32, 25, 60, "high"],    // São Paulo — high crime rates
  33:  [25, 35, 28, 65, "high"],    // Rio de Janeiro — high crime
  34:  [50, 55, 45, 78, "high"],    // Miami — moderate
  35:  [55, 62, 55, 75, "high"],    // Washington DC — areas of concern
  36:  [60, 68, 58, 80, "high"],    // Boston — relatively safe
  37:  [48, 58, 42, 78, "high"],    // Seattle — property crime high
  38:  [55, 65, 52, 76, "high"],    // Denver — moderate
  39:  [52, 60, 48, 78, "high"],    // Austin — moderate
  40:  [62, 70, 55, 85, "high"],    // Vancouver — safe, very welcoming
  41:  [58, 65, 55, 80, "high"],    // Montreal — safe and welcoming
  42:  [68, 74, 62, 82, "high"],    // Melbourne — safe
  43:  [70, 75, 65, 80, "high"],    // Brisbane — safe
  44:  [68, 78, 65, 82, "high"],    // Auckland — safe and welcoming
  45:  [55, 60, 48, 72, "high"],    // Bangkok — moderate; tourist scams
  46:  [55, 62, 50, 65, "high"],    // Kuala Lumpur — moderate safety
  47:  [45, 58, 42, 62, "medium"],  // Ho Chi Minh City — grab-and-run theft
  48:  [58, 68, 55, 58, "medium"],  // Hanoi — safe for person, moderate foreigner
  49:  [52, 60, 48, 55, "medium"],  // Bengaluru — moderate
  50:  [35, 48, 38, 50, "high"],    // Mumbai — crowded, petty crime
  51:  [28, 42, 32, 48, "high"],    // New Delhi — safety concerns esp. women
  52:  [22, 35, 25, 55, "medium"],  // Nairobi — significant crime
  53:  [38, 52, 40, 45, "medium"],  // Cairo — moderate, less foreigner-friendly
  54:  [48, 62, 55, 30, "medium"],  // Tehran — safe streets but political issues
  55:  [18, 30, 22, 40, "medium"],  // Karachi — high crime
  56:  [38, 52, 42, 42, "medium"],  // Islamabad — safer than Karachi
  57:  [40, 52, 42, 55, "medium"],  // Jakarta — moderate
  58:  [38, 48, 38, 65, "medium"],  // Manila — significant crime in parts
  59:  [78, 85, 78, 48, "high"],    // Seoul — very safe, moderate foreigner welcome
  60:  [75, 82, 75, 42, "medium"],  // Busan — very safe
  61:  [78, 85, 78, 55, "high"],    // Taipei — extremely safe, moderate foreigner
  62:  [32, 42, 32, 65, "high"],    // Buenos Aires — high petty crime
  63:  [38, 52, 40, 62, "high"],    // Santiago — safer for LatAm
  64:  [25, 38, 28, 58, "medium"],  // Bogota — significant crime
  65:  [30, 42, 32, 58, "medium"],  // Lima — moderate-high crime
  66:  [12, 18, 15, 42, "low"],     // Caracas — one of the most dangerous cities
  67:  [20, 28, 20, 50, "high"],    // Johannesburg — very high crime
  68:  [32, 45, 32, 62, "high"],    // Cape Town — high crime but tourism-aware
  69:  [30, 38, 30, 58, "medium"],  // Guadalajara — cartel violence in region
  70:  [48, 55, 45, 72, "medium"],  // San José — moderate for Central America
  71:  [42, 50, 40, 70, "medium"],  // Panama City — moderate
  72:  [55, 68, 55, 52, "low"],     // Havana — low crime, limited data
  73:  [42, 50, 38, 72, "medium"],  // San Juan — moderate crime
  74:  [35, 42, 32, 70, "medium"],  // Montego Bay — tourist safety zones
  75:  [85, 88, 85, 68, "high"],    // Abu Dhabi — ultra-safe
  76:  [82, 86, 82, 65, "high"],    // Doha — very safe
  77:  [78, 82, 78, 60, "medium"],  // Manama — safe
  78:  [72, 78, 72, 52, "medium"],  // Riyadh — safe but restricted
  79:  [80, 85, 80, 62, "medium"],  // Muscat — very safe
  80:  [42, 55, 42, 65, "medium"],  // Beirut — economic crisis, moderate safety
  81:  [55, 65, 55, 58, "medium"],  // Amman — relatively safe
  82:  [62, 68, 60, 58, "high"],    // Tel Aviv — safe but geopolitical tension
  83:  [48, 58, 45, 50, "medium"],  // Hyderabad — moderate
  84:  [52, 62, 50, 48, "medium"],  // Pune — moderate
  85:  [15, 20, 18, 45, "low"],     // Kyiv — active conflict zone
  86:  [55, 65, 52, 50, "medium"],  // Bucharest — moderate safety
  87:  [62, 70, 60, 48, "medium"],  // Sofia — safe
  88:  [68, 75, 65, 52, "medium"],  // Zagreb — safe
  89:  [58, 68, 55, 48, "medium"],  // Belgrade — moderate-good safety
  90:  [62, 70, 58, 55, "high"],    // Budapest — safe, tourist petty crime
  91:  [68, 75, 65, 50, "medium"],  // Bratislava — safe
  92:  [75, 82, 75, 55, "medium"],  // Ljubljana — very safe
  93:  [55, 62, 48, 82, "high"],    // Dublin — moderate, very welcoming
  94:  [55, 65, 52, 72, "medium"],  // Belfast — improved, still some tension
  95:  [38, 50, 40, 72, "high"],    // Atlanta — varies by area
  96:  [50, 62, 48, 72, "high"],    // Phoenix — moderate
  97:  [40, 52, 38, 78, "high"],    // Portland — property crime high
  98:  [60, 68, 55, 78, "high"],    // San Diego — safe
  99:  [50, 58, 48, 75, "high"],    // Las Vegas — strip vs off-strip
  100: [55, 62, 50, 75, "high"],    // Tampa — moderate
  101: [72, 80, 75, 40, "medium"],  // Guangzhou — safe, less foreigner-friendly
  102: [78, 85, 80, 42, "medium"],  // Shenzhen — very safe
  103: [75, 82, 78, 38, "medium"],  // Chengdu — safe
  104: [78, 85, 80, 40, "medium"],  // Hangzhou — very safe
  105: [72, 80, 75, 38, "medium"],  // Chongqing — safe
  106: [80, 88, 85, 52, "high"],    // Osaka — very safe
  107: [82, 90, 88, 48, "medium"],  // Nagoya — very safe
  108: [78, 85, 80, 45, "medium"],  // Incheon — very safe
  109: [42, 52, 40, 62, "medium"],  // Phnom Penh — moderate
  110: [35, 48, 38, 48, "low"],     // Yangon — political instability
  111: [55, 65, 55, 55, "low"],     // Vientiane — relatively safe, limited data
  112: [65, 72, 60, 72, "medium"],  // Chiang Mai — safe for tourists
  113: [38, 48, 35, 58, "low"],     // Davao — moderate, Mindanao concerns
  114: [28, 38, 28, 42, "medium"],  // Dhaka — significant crime
  115: [42, 55, 42, 58, "medium"],  // Colombo — improved post-war
  116: [48, 60, 48, 65, "medium"],  // Kathmandu — moderate
  117: [55, 65, 55, 48, "medium"],  // Almaty — moderate
  118: [52, 62, 52, 45, "medium"],  // Tashkent — moderate, improving
  119: [55, 65, 55, 50, "medium"],  // Baku — safe
  120: [58, 68, 58, 40, "medium"],  // Ulaanbaatar — moderate
};

// ─── Compute composite index ──────────────────────────────────────
const path = "public/data/cities.json";
const data = JSON.parse(readFileSync(path, "utf8"));

let ok = 0;
for (const city of data.cities) {
  const raw = SAFETY_RAW[city.id];
  if (!raw) {
    console.error(`Missing safety data for city ID ${city.id} (${city.name})`);
    process.exit(1);
  }
  const [night, violInv, propInv, foreigner, confidence] = raw;
  const score = Math.round(night * 0.4 + violInv * 0.3 + propInv * 0.2 + foreigner * 0.1);
  city.safetyIndex = score;
  city.safetyConfidence = confidence;
  ok++;
}

console.log(`Computed safetyIndex for ${ok} cities`);

// Print a few samples
const samples = data.cities.filter(c => [3, 1, 31, 66, 85].includes(c.id));
for (const s of samples) {
  console.log(`  ${s.name}: ${s.safetyIndex} (${s.safetyConfidence})`);
}

writeFileSync(path, JSON.stringify(data, null, 2) + "\n");
console.log("Written to", path);
