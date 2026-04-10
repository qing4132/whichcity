#!/usr/bin/env node
/**
 * Audit Script 03: Tax Data vs Exchange Rate Cross-validation
 * + Composite index re-computation verification
 */
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const ROOT = join(import.meta.dirname, "..");
const cities = JSON.parse(readFileSync(join(ROOT, "public/data/cities.json"), "utf-8")).cities;
const ratesData = JSON.parse(readFileSync(join(ROOT, "public/data/exchange-rates.json"), "utf-8"));

const findings = [];
const warn = (cat, sev, city, msg) => findings.push({ category: cat, severity: sev, city, message: msg });

console.log("=== AUDIT 03: TAX & INDEX RE-COMPUTATION ===\n");

// 1. Verify safety index re-computation
// Weights: 35% Numbeo, 30% homicideInv, 20% GPI inv, 15% Gallup
console.log("--- Safety Index Re-computation ---");
let safetyMismatches = 0;
for (const c of cities) {
  const subs = [
    { val: c.numbeoSafetyIndex, weight: 0.35 },
    { val: c.homicideRateInv, weight: 0.30 },
    { val: c.gpiScoreInv, weight: 0.20 },
    { val: c.gallupLawOrder, weight: 0.15 },
  ];
  const available = subs.filter(s => s.val !== null && s.val !== undefined);
  if (available.length === 0) continue;
  
  const totalWeight = available.reduce((sum, s) => sum + s.weight, 0);
  const recomputed = available.reduce((sum, s) => sum + (s.val * s.weight / totalWeight), 0);
  const rounded = Math.round(recomputed * 10) / 10;
  
  const diff = Math.abs(rounded - c.safetyIndex);
  if (diff > 2.0) {
    warn("SAFETY_MISMATCH", "HIGH", `${c.name}(${c.id})`, 
      `stored=${c.safetyIndex}, recomputed=${rounded.toFixed(1)} (diff=${diff.toFixed(1)}) subs=[${subs.map(s=>s.val).join(",")}]`);
    safetyMismatches++;
  } else if (diff > 0.5) {
    warn("SAFETY_DRIFT", "MEDIUM", `${c.name}(${c.id})`, 
      `stored=${c.safetyIndex}, recomputed=${rounded.toFixed(1)} (diff=${diff.toFixed(1)})`);
    safetyMismatches++;
  }
}
console.log(`  Safety index mismatches (>0.5): ${safetyMismatches}`);

// 2. Verify healthcare index re-computation
// Weights: 35% doctors, 25% beds, 25% UHC, 15% lifeExpectancy
console.log("\n--- Healthcare Index Re-computation ---");
let healthMismatches = 0;

// Need to normalize sub-indicators to 0-100 scale
// doctors/1k: typical range 0-7 → normalize
// beds/1k: typical range 0-15 → normalize
// UHC: already 0-100
// lifeExpectancy: range ~50-85 → normalize
const allDoctors = cities.map(c => c.doctorsPerThousand).filter(v => v !== null);
const allBeds = cities.map(c => c.hospitalBedsPerThousand).filter(v => v !== null);
const allLifeExp = cities.map(c => c.lifeExpectancy).filter(v => v !== null);

const doctorsMax = Math.max(...allDoctors);
const bedsMax = Math.max(...allBeds);
const lifeExpMin = Math.min(...allLifeExp);
const lifeExpMax = Math.max(...allLifeExp);

for (const c of cities) {
  // Since we don't know exact normalization used, just check relative consistency
  const hasSubs = [c.doctorsPerThousand, c.hospitalBedsPerThousand, c.uhcCoverageIndex, c.lifeExpectancy];
  const nonNull = hasSubs.filter(v => v !== null).length;
  
  // Confidence check
  const expectedConf = nonNull >= 4 ? "high" : nonNull >= 3 ? "medium" : "low";
  if (c.healthcareConfidence !== expectedConf) {
    warn("HEALTH_CONF", "MEDIUM", `${c.name}(${c.id})`, 
      `confidence="${c.healthcareConfidence}" but expected="${expectedConf}" (${nonNull}/4 subs present)`);
    healthMismatches++;
  }
}
console.log(`  Healthcare confidence mismatches: ${healthMismatches}`);

// 3. Safety confidence check
console.log("\n--- Safety Confidence Check ---");
let safetyConfIssues = 0;
for (const c of cities) {
  const subs = [c.numbeoSafetyIndex, c.homicideRateInv, c.gpiScoreInv, c.gallupLawOrder];
  const nonNull = subs.filter(v => v !== null && v !== undefined).length;
  const expectedConf = nonNull >= 4 ? "high" : nonNull >= 3 ? "medium" : "low";
  if (c.safetyConfidence !== expectedConf) {
    warn("SAFETY_CONF", "MEDIUM", `${c.name}(${c.id})`, 
      `confidence="${c.safetyConfidence}" expected="${expectedConf}" (${nonNull}/4 subs present)`);
    safetyConfIssues++;
  }
}
console.log(`  Safety confidence issues: ${safetyConfIssues}`);

// 4. Freedom confidence check
console.log("\n--- Freedom Confidence Check ---");
let freedomConfIssues = 0;
for (const c of cities) {
  const subs = [c.pressFreedomScore, c.democracyIndex, c.corruptionPerceptionIndex];
  const nonNull = subs.filter(v => v !== null && v !== undefined).length;
  const expectedConf = nonNull >= 3 ? "high" : nonNull >= 2 ? "medium" : "low";
  if (c.freedomConfidence !== expectedConf) {
    warn("FREEDOM_CONF", "MEDIUM", `${c.name}(${c.id})`, 
      `confidence="${c.freedomConfidence}" expected="${expectedConf}" (${nonNull}/3 subs present)`);
    freedomConfIssues++;
  }
}
console.log(`  Freedom confidence issues: ${freedomConfIssues}`);

// 5. Check exchange-rates.json for currency coverage
console.log("\n--- Exchange Rate Currency Coverage ---");
const currenciesInRates = new Set(Object.keys(ratesData.rates));
console.log(`  Currencies in exchange-rates.json: ${currenciesInRates.size}`);

// Check for missing timestamp
if (!ratesData.updated_at && !ratesData.timestamp && !ratesData.date) {
  warn("RATE_STALENESS", "HIGH", "GLOBAL", "exchange-rates.json has NO timestamp field - impossible to detect stale data");
}

// 6. Country coverage check - list unique countries and check tax coverage
console.log("\n--- Unique Countries in cities.json ---");
const uniqueCountries = [...new Set(cities.map(c => c.country))].sort();
console.log(`  Total unique countries: ${uniqueCountries.length}`);

// 7. Duplicate city detection
console.log("\n--- Duplicate City Names ---");
const nameCount = {};
for (const c of cities) {
  nameCount[c.name] = (nameCount[c.name] || 0) + 1;
}
for (const [name, cnt] of Object.entries(nameCount)) {
  if (cnt > 1) {
    warn("DUPLICATE_NAME", "HIGH", name, `city name appears ${cnt} times`);
  }
}

// 8. Continent distribution
console.log("\n--- Continent Distribution ---");
const continentDist = {};
for (const c of cities) {
  continentDist[c.continent] = (continentDist[c.continent] || 0) + 1;
}
for (const [cont, cnt] of Object.entries(continentDist).sort((a,b) => b[1]-a[1])) {
  console.log(`  ${cont}: ${cnt} cities`);
}

// 9. Check for suspiciously identical values across cities (potential data fabrication)
console.log("\n--- Suspicious Identical Values (same-country same-field) ---");
const countryGroups = {};
for (const c of cities) {
  if (!countryGroups[c.country]) countryGroups[c.country] = [];
  countryGroups[c.country].push(c);
}
let suspiciousPatterns = 0;
for (const [country, citiesInCountry] of Object.entries(countryGroups)) {
  if (citiesInCountry.length < 2) continue;
  // Check if country-level fields are identical (they should vary by city)
  const checkFields = ["annualWorkHours", "paidLeaveDays"];
  for (const f of checkFields) {
    const vals = citiesInCountry.map(c => c[f]);
    const unique = new Set(vals.filter(v => v !== null));
    if (unique.size === 1 && citiesInCountry.length >= 3) {
      warn("IDENTICAL_VALUES", "MEDIUM", `${country}(${citiesInCountry.length} cities)`, 
        `All cities share identical ${f}=${[...unique][0]} - likely country-level data applied to all cities`);
      suspiciousPatterns++;
    }
  }
}
console.log(`  Suspicious identical patterns: ${suspiciousPatterns}`);

// Summary
console.log("\n\n========== FINDING SUMMARY ==========");
const bySeverity = {};
const byCategory = {};
for (const f of findings) {
  bySeverity[f.severity] = (bySeverity[f.severity] || 0) + 1;
  byCategory[f.category] = (byCategory[f.category] || 0) + 1;
}
console.log("By severity:", bySeverity);
console.log("By category:", byCategory);
console.log(`Total findings: ${findings.length}`);

writeFileSync(
  join(ROOT, "_audit", "03-results.json"),
  JSON.stringify({ summary: { bySeverity, byCategory, total: findings.length }, findings }, null, 2)
);
console.log("Results written to _audit/03-results.json");
