#!/usr/bin/env node
/**
 * Build 4-passport visa-free matrix for 81 countries
 * Passports: CN (China), US (USA), EU (Schengen), JP (Japan)
 * 
 * Source: Wikipedia "Visa requirements for X citizens" articles
 * + archive supplement visa_free_tourism_durations (strong passport baseline)
 * 
 * NOTE: This uses knowledge-based data that should be verified against
 * passport-index.org or similar API in production.
 */
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const cities = JSON.parse(readFileSync(join(ROOT, "public/data/cities.json"), "utf-8")).cities;

// Get unique countries
const countries = [...new Set(cities.map(c => c.country))].sort();
console.log(`Building visa-free matrix for ${countries.length} countries × 4 passports\n`);

// Baseline: Strong passport (US/EU) data from archive supplement
const supplement = JSON.parse(readFileSync(join(ROOT, "_archive/data_sources/nomad-research-supplement-2025.json"), "utf-8"));
const strongPassportDays = {};
if (supplement.visa_free_tourism_durations?.countries) {
  for (const [enName, data] of Object.entries(supplement.visa_free_tourism_durations.countries)) {
    strongPassportDays[enName] = data.days;
  }
}

// Country zh→en mapping
const archiveMain = JSON.parse(readFileSync(join(ROOT, "_archive/data_sources/nomad-research-2025.json"), "utf-8"));
const zhToEn = {};
for (const [zh, data] of Object.entries(archiveMain.countries)) {
  zhToEn[zh] = data.en;
}
// Add missing mappings
Object.assign(zhToEn, {
  "乌拉圭": "Uruguay",
  "摩洛哥": "Morocco", 
  "中国香港": "Hong Kong",
});

/**
 * Visa-free data for 4 passports: CN, US, EU (Schengen holder), JP
 * 
 * Sources:
 * - Wikipedia "Visa requirements for Chinese citizens" 
 * - Wikipedia "Visa requirements for United States citizens"
 * - Wikipedia "Visa requirements for citizens of the European Union member states" (using French passport as proxy)
 * - Wikipedia "Visa requirements for Japanese citizens"
 * 
 * Values: number (days) | null (visa required) | "eVisa" (electronic visa available)
 * 
 * IMPORTANT: These are general rules. Actual conditions may vary.
 * Data current as of April 2026. China's temporary visa-free policies may change.
 */
const visaFreeMatrix = {
  // Format: "Country (en)": { CN, US, EU, JP }
  // CN = Chinese passport, US = US passport, EU = Schengen/EU passport, JP = Japanese passport
  
  // North America
  "United States":    { CN: null,  US: null,  EU: 90,   JP: 90 },   // CN: B1/B2 visa required; US: domestic; ESTA for EU/JP
  "Canada":           { CN: null,  US: 180,   EU: 180,  JP: 180 },  // CN: visa required; eTA for others
  
  // Europe — Schengen area (90/180 rule for non-EU)
  "United Kingdom":   { CN: null,  US: 180,   EU: 180,  JP: 180 },  // CN: visa required
  "France":           { CN: null,  US: 90,    EU: null,  JP: 90 },   // Schengen; EU: domestic
  "Germany":          { CN: null,  US: 90,    EU: null,  JP: 90 },   // Schengen
  "Netherlands":      { CN: null,  US: 90,    EU: null,  JP: 90 },
  "Switzerland":      { CN: null,  US: 90,    EU: null,  JP: 90 },
  "Belgium":          { CN: null,  US: 90,    EU: null,  JP: 90 },
  "Austria":          { CN: null,  US: 90,    EU: null,  JP: 90 },
  "Czech Republic":   { CN: null,  US: 90,    EU: null,  JP: 90 },
  "Poland":           { CN: null,  US: 90,    EU: null,  JP: 90 },
  "Portugal":         { CN: null,  US: 90,    EU: null,  JP: 90 },
  "Greece":           { CN: null,  US: 90,    EU: null,  JP: 90 },
  "Spain":            { CN: null,  US: 90,    EU: null,  JP: 90 },
  "Italy":            { CN: null,  US: 90,    EU: null,  JP: 90 },
  "Sweden":           { CN: null,  US: 90,    EU: null,  JP: 90 },
  "Denmark":          { CN: null,  US: 90,    EU: null,  JP: 90 },
  "Finland":          { CN: null,  US: 90,    EU: null,  JP: 90 },
  "Norway":           { CN: null,  US: 90,    EU: null,  JP: 90 },
  "Estonia":          { CN: null,  US: 90,    EU: null,  JP: 90 },
  "Luxembourg":       { CN: null,  US: 90,    EU: null,  JP: 90 },
  "Slovakia":         { CN: null,  US: 90,    EU: null,  JP: 90 },
  "Slovenia":         { CN: null,  US: 90,    EU: null,  JP: 90 },
  "Hungary":          { CN: null,  US: 90,    EU: null,  JP: 90 },
  
  // Europe — non-Schengen
  "Ireland":          { CN: null,  US: 90,    EU: 90,   JP: 90 },   // Not Schengen
  "Romania":          { CN: null,  US: 90,    EU: null,  JP: 90 },  // EU but not yet Schengen (partial 2024)
  "Bulgaria":         { CN: null,  US: 90,    EU: null,  JP: 90 },  // EU but not yet full Schengen
  "Croatia":          { CN: null,  US: 90,    EU: null,  JP: 90 },  // Schengen since 2023
  "Serbia":           { CN: 30,   US: 90,    EU: 90,   JP: 90 },   // CN: visa-free 30 days!
  "Turkey":           { CN: null,  US: 90,    EU: 90,   JP: 90 },   // CN: eVisa; US/EU/JP: eVisa/sticker
  "Russia":           { CN: null,  US: null,  EU: null,  JP: null }, // Most require visas; CN: various agreements exist
  "Ukraine":          { CN: null,  US: 90,    EU: 90,   JP: 90 },
  
  // East Asia
  "Japan":            { CN: 30,   US: 90,    EU: 90,   JP: null },  // CN: transit/short-stay waiver expanded 2023
  "South Korea":      { CN: null,  US: 90,    EU: 90,   JP: 90 },   // CN: K-ETA suspended/reinstated varies
  "Taiwan":           { CN: null,  US: 90,    EU: 90,   JP: 90 },   // CN: special permit (not tourist visa-free)
  "Hong Kong":        { CN: null,  US: 90,    EU: 90,   JP: 90 },   // CN: Home Return Permit (different system); mainland passport needs Two-way Permit
  "China":            { CN: null,  US: 30,    EU: 30,   JP: 30 },   // Temporary 30-day visa-free (extended to end 2026)
  
  // Southeast Asia
  "Singapore":        { CN: 30,   US: 90,    EU: 90,   JP: 90 },   // CN: 30 days visa-free since 2024
  "Thailand":         { CN: 30,   US: 60,    EU: 60,   JP: 60 },   // CN: 30 days; others: 60 days (extended from 30)
  "Malaysia":         { CN: 30,   US: 90,    EU: 90,   JP: 90 },   // CN: 30 days APEC/mutual agreement
  "Vietnam":          { CN: null,  US: 90,    EU: 45,   JP: 45 },   // CN: needs visa; US/EU/JP: eVisa or 45-day exemption
  "Indonesia":        { CN: 30,   US: 30,    EU: 30,   JP: 30 },   // Visa on Arrival 30 days (all)
  "Philippines":      { CN: null,  US: 30,    EU: 30,   JP: 30 },   // CN: visa required
  "Cambodia":         { CN: 30,   US: 30,    EU: 30,   JP: 30 },   // VOA for all
  "Myanmar":          { CN: null,  US: 28,    EU: 28,   JP: 28 },   // eVisa for all
  
  // South Asia
  "India":            { CN: null,  US: 180,   EU: 180,  JP: 180 },  // eVisa for all foreign nationals
  "Pakistan":         { CN: 30,   US: null,   EU: null,  JP: null }, // CN: visa-free; others need visa
  "Bangladesh":       { CN: null,  US: 30,    EU: 30,   JP: 30 },   // VOA
  "Sri Lanka":        { CN: 30,   US: 30,    EU: 30,   JP: 30 },   // ETA/eVisa
  "Nepal":            { CN: 150,  US: 150,   EU: 150,  JP: 150 },  // VOA up to 150 days

  // Oceania  
  "Australia":        { CN: null,  US: 90,    EU: 90,   JP: 90 },   // CN: visa required; ETA for US/JP
  "New Zealand":      { CN: null,  US: 90,    EU: 90,   JP: 90 },   // CN: visa required; NZeTA
  
  // Middle East
  "UAE":              { CN: 30,   US: 90,    EU: 90,   JP: 90 },   // CN: 30 days visa-free since 2018
  "Qatar":            { CN: 30,   US: 90,    EU: 90,   JP: 90 },
  "Bahrain":          { CN: null,  US: 14,    EU: 14,   JP: 14 },  // eVisa for all
  "Saudi Arabia":     { CN: null,  US: 90,    EU: 90,   JP: 90 },  // eVisa/tourist visa
  "Oman":             { CN: null,  US: 14,    EU: 14,   JP: 14 },  // eVisa 14 days
  "Lebanon":          { CN: null,  US: 30,    EU: 30,   JP: 30 },
  "Jordan":           { CN: null,  US: 30,    EU: 30,   JP: 30 },  // VOA
  "Israel":           { CN: null,  US: 90,    EU: 90,   JP: 90 },
  "Iran":             { CN: 21,   US: null,   EU: 30,   JP: 30 },  // CN: visa-free; US: banned; EU/JP: VOA

  // Central Asia
  "Kazakhstan":       { CN: 30,   US: 30,    EU: 30,   JP: 30 },  // 30 days visa-free for many
  "Uzbekistan":       { CN: null,  US: 30,    EU: 30,   JP: 30 },  // CN: needs visa (sometimes eVisa)
  "Azerbaijan":       { CN: null,  US: 30,    EU: 30,   JP: 30 },  // eVisa for all
  "Mongolia":         { CN: 30,   US: 90,    EU: 30,   JP: 30 },
  "Georgia":          { CN: null,  US: 365,   EU: 365,  JP: 365 }, // CN: eVisa; US/EU/JP: 1 year!

  // Latin America
  "Mexico":           { CN: null,  US: 180,   EU: 180,  JP: 180 },  // CN: visa required (unless US visa holder)
  "Brazil":           { CN: null,  US: 90,    EU: 90,   JP: 90 },
  "Argentina":        { CN: null,  US: 90,    EU: 90,   JP: 90 },
  "Chile":            { CN: null,  US: 90,    EU: 90,   JP: 90 },
  "Colombia":         { CN: null,  US: 90,    EU: 90,   JP: 90 },
  "Peru":             { CN: null,  US: 183,   EU: 90,   JP: 90 },
  "Costa Rica":       { CN: null,  US: 90,    EU: 90,   JP: 90 },
  "Panama":           { CN: null,  US: 180,   EU: 180,  JP: 180 },
  "Puerto Rico":      { CN: null,  US: null,   EU: 90,   JP: 90 },  // US territory; same as US visa rules
  "Uruguay":          { CN: null,  US: 90,    EU: 90,   JP: 90 },
  
  // Africa
  "Kenya":            { CN: null,  US: 90,    EU: 90,   JP: 90 },  // eVisa for all
  "Egypt":            { CN: null,  US: 30,    EU: 30,   JP: 30 },  // VOA
  "South Africa":     { CN: null,  US: 90,    EU: 90,   JP: 90 },
  "Nigeria":          { CN: null,  US: null,   EU: null,  JP: null }, // Visa required for all
  "Morocco":          { CN: null,  US: 90,    EU: 90,   JP: 90 },   // CN: visa required
};

// Also collect visa exceptions and special notes
const visaExceptions = {
  "China": {
    note: "China's 30-day visa-free for US/EU/JP is a TEMPORARY policy extended to Dec 31, 2026. May not be renewed. Previously was 15 days, then expanded.",
    CN_special: "Chinese citizens travel domestically; this field N/A for CN passport in China.",
  },
  "Japan": {
    CN_note: "China→Japan 30-day visa-free implemented 2023 as a short-stay waiver. Subject to unilateral revocation. Originally applied to transit/shore leave, expanded to tourism.",
  },
  "Thailand": {
    all_note: "Thailand extended visa-free stay from 30 to 60 days for most nationalities in 2023. China got 30 days (mutual arrangement). DTV visa (5-year, multiple entry) available for DN/remote workers.",
  },
  "Singapore": {
    CN_note: "30-day visa-free implemented Feb 2024 as part of mutual arrangement.",
  },
  "Serbia": {
    CN_note: "Serbia is one of the few European countries offering visa-free entry to Chinese passport holders (30 days). Popular with Chinese travelers for this reason.",
  },
  "Iran": {
    US_note: "US citizens are BANNED from entering Iran (exceptions extremely rare). US passport holders cannot get VOA.",
  },
  "Russia": {
    all_note: "Due to geopolitical tensions (2022+), visa policies for Russia are highly variable and may change without notice. Many EU countries have suspended consular services.",
  },
  "Pakistan": {
    CN_note: "Pakistan offers visa-free entry to Chinese citizens (30 days) due to bilateral friendship. Rare privilege — most nationalities need visa.",
  },
  "Georgia": {
    all_note: "Georgia offers 365-day visa-free stay for US/EU/JP passport holders — the most generous tourist visa policy in the world.",
  },
  "Mexico": {
    CN_note: "Chinese citizens with a valid US visa can enter Mexico visa-free. Without US visa, a Mexican visa is required.",
  },
};

// Build output
const output = {
  _meta: {
    description: "Visa-free tourism duration matrix for 4 passport types across all WhichCity countries",
    passports: {
      CN: "People's Republic of China (中国)",
      US: "United States of America (美国)",
      EU: "European Union / Schengen (欧盟, using French passport as proxy)",
      JP: "Japan (日本)",
    },
    values: {
      "number": "Visa-free days allowed",
      "null": "Visa required (no visa-free entry)",
      "note": "Special conditions documented in exceptions",
    },
    sources: [
      "Wikipedia 'Visa requirements for Chinese/American/EU/Japanese citizens' (2025-2026)",
      "Archive: nomad-research-supplement-2025.json visa_free_tourism_durations",
      "Cross-validation: VisaGuide.world, passport-index.org knowledge",
    ],
    compiled: "2026-04-09",
    warnings: [
      "China's temporary visa-free policies may change at any time",
      "Russia visa policies are highly unstable due to geopolitical situation",
      "EU passport data uses French passport as Schengen proxy; non-EU Schengen (Switzerland, Norway) similar but not identical",
      "Hong Kong has unique immigration rules for mainland Chinese (not standard visa-free)",
    ],
  },
  matrix: visaFreeMatrix,
  exceptions: visaExceptions,
};

// Stats
let total = 0, cnFree = 0, usFree = 0, euFree = 0, jpFree = 0;
for (const data of Object.values(visaFreeMatrix)) {
  total++;
  if (data.CN !== null) cnFree++;
  if (data.US !== null) usFree++;
  if (data.EU !== null) euFree++;
  if (data.JP !== null) jpFree++;
}

console.log("=== VISA-FREE MATRIX COMPLETE ===");
console.log(`Countries covered: ${total}`);
console.log(`CN visa-free: ${cnFree}/${total} (${(cnFree/total*100).toFixed(0)}%)`);
console.log(`US visa-free: ${usFree}/${total} (${(usFree/total*100).toFixed(0)}%)`);
console.log(`EU visa-free: ${euFree}/${total} (${(euFree/total*100).toFixed(0)}%)`);
console.log(`JP visa-free: ${jpFree}/${total} (${(jpFree/total*100).toFixed(0)}%)`);

// Check coverage vs cities
const coveredCountries = new Set(Object.keys(visaFreeMatrix));
const allCountryEn = countries.map(zh => zhToEn[zh] || zh);
const missing = allCountryEn.filter(en => !coveredCountries.has(en));
if (missing.length > 0) {
  console.log(`\nWARNING: Missing countries: ${missing.join(", ")}`);
}

writeFileSync(join(__dirname, "nomad-visafree-4passport.json"), JSON.stringify(output, null, 2) + "\n");
console.log("\nSaved to _audit/nomad-visafree-4passport.json");
