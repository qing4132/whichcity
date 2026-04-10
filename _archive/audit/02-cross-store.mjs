#!/usr/bin/env node
/**
 * Audit Script 02: Cross-Store Consistency Check
 * Verifies that every city in cities.json has entries in ALL required stores
 */
import { readFileSync } from "fs";
import { writeFileSync } from "fs";
import { join } from "path";

const ROOT = join(import.meta.dirname, "..");
const cities = JSON.parse(readFileSync(join(ROOT, "public/data/cities.json"), "utf-8")).cities;

// Load all stores as raw text for regex parsing
const constantsTs = readFileSync(join(ROOT, "lib/constants.ts"), "utf-8");
const citySlugTs = readFileSync(join(ROOT, "lib/citySlug.ts"), "utf-8");
const cityIntrosTs = readFileSync(join(ROOT, "lib/cityIntros.ts"), "utf-8");
const cityLanguagesTs = readFileSync(join(ROOT, "lib/cityLanguages.ts"), "utf-8");
const i18nTs = readFileSync(join(ROOT, "lib/i18n.ts"), "utf-8");

const findings = [];
const warn = (cat, sev, city, msg) => findings.push({ category: cat, severity: sev, city, message: msg });

console.log("=== AUDIT 02: CROSS-STORE CONSISTENCY ===\n");

// Extract IDs from each store using regex
function extractIdsFromTS(content, objectName) {
  const ids = new Set();
  // Match patterns like: 123: or [123]: or "123":
  const pattern = new RegExp(`(?:^|\\n)\\s*(?:\\[?)?(\\d+)(?:\\])?\\s*:`, "g");
  // More specific: look for the object definition first
  const objRegex = new RegExp(`(?:const|export const)\\s+${objectName}[^=]*=\\s*\\{([\\s\\S]*?)\\n\\};`, "m");
  const match = content.match(objRegex);
  if (match) {
    let m;
    while ((m = pattern.exec(match[1])) !== null) {
      ids.add(parseInt(m[1]));
    }
  }
  return ids;
}

// Parse CITY_SLUGS from citySlug.ts
const slugIds = extractIdsFromTS(citySlugTs, "CITY_SLUGS");
const nameTransIds = extractIdsFromTS(i18nTs, "CITY_NAME_TRANSLATIONS");
const introIds = extractIdsFromTS(cityIntrosTs, "CITY_INTROS");
const langIds = extractIdsFromTS(cityLanguagesTs, "CITY_LANGUAGES");
const flagIds = extractIdsFromTS(constantsTs, "CITY_FLAG_EMOJIS");
const countryIds = extractIdsFromTS(constantsTs, "CITY_COUNTRY");

const cityIds = new Set(cities.map(c => c.id));

const stores = {
  CITY_SLUGS: slugIds,
  CITY_NAME_TRANSLATIONS: nameTransIds,
  CITY_INTROS: introIds,
  CITY_LANGUAGES: langIds,
  CITY_FLAG_EMOJIS: flagIds,
  CITY_COUNTRY: countryIds,
};

console.log("Store entry counts:");
for (const [name, ids] of Object.entries(stores)) {
  console.log(`  ${name}: ${ids.size} entries`);
}
console.log(`  cities.json: ${cityIds.size} entries`);

console.log("\n--- Cities in cities.json missing from stores ---");
for (const c of cities) {
  for (const [storeName, storeIds] of Object.entries(stores)) {
    if (!storeIds.has(c.id)) {
      warn("MISSING_IN_STORE", "HIGH", `${c.name}(${c.id})`, `Missing from ${storeName}`);
      console.log(`  ✗ ${c.name}(${c.id}) missing from ${storeName}`);
    }
  }
}

console.log("\n--- Entries in stores but NOT in cities.json ---");
for (const [storeName, storeIds] of Object.entries(stores)) {
  for (const id of storeIds) {
    if (!cityIds.has(id)) {
      warn("ORPHAN_ENTRY", "MEDIUM", `ID:${id}`, `In ${storeName} but not in cities.json`);
      console.log(`  ✗ ID:${id} in ${storeName} but not in cities.json`);
    }
  }
}

// Check SLUG_TO_ID reverse mapping consistency
console.log("\n--- SLUG_TO_ID consistency ---");
const slugToIdMatch = citySlugTs.match(/export\s+const\s+SLUG_TO_ID[^=]*=\s*\{([\s\S]*?)\n\};/m);
if (slugToIdMatch) {
  const slugToIdEntries = slugToIdMatch[1].matchAll(/"([^"]+)"\s*:\s*(\d+)/g);
  let slugCount = 0;
  let reverseCount = 0;
  for (const m of slugToIdEntries) {
    slugCount++;
    const slug = m[1];
    const id = parseInt(m[2]);
    if (!cityIds.has(id)) {
      warn("SLUG_ORPHAN", "MEDIUM", `slug:${slug}→${id}`, `SLUG_TO_ID points to nonexistent city`);
    }
    reverseCount++;
  }
  console.log(`  SLUG_TO_ID entries: ${reverseCount}`);
  console.log(`  CITY_SLUGS entries: ${slugIds.size}`);
  if (reverseCount !== slugIds.size) {
    warn("SLUG_ASYMMETRY", "HIGH", "GLOBAL", `SLUG_TO_ID (${reverseCount}) != CITY_SLUGS (${slugIds.size})`);
  }
}

// Check REGIONS coverage
console.log("\n--- REGIONS array coverage ---");
const regionsMatch = constantsTs.match(/export\s+const\s+REGIONS[^=]*=\s*\{([\s\S]*?)\n\};/m);
if (regionsMatch) {
  const regionIds = new Set();
  const idMatches = regionsMatch[1].matchAll(/(\d+)/g);
  for (const m of idMatches) regionIds.add(parseInt(m[1]));
  console.log(`  IDs in REGIONS arrays: ${regionIds.size}`);
  for (const c of cities) {
    if (!regionIds.has(c.id)) {
      warn("REGION_MISSING", "MEDIUM", `${c.name}(${c.id})`, `Not in any REGIONS array`);
      console.log(`  ✗ ${c.name}(${c.id}) not in REGIONS`);
    }
  }
}

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
  join(ROOT, "_audit", "02-results.json"),
  JSON.stringify({ summary: { bySeverity, byCategory, total: findings.length }, findings }, null, 2)
);
console.log("Results written to _audit/02-results.json");
