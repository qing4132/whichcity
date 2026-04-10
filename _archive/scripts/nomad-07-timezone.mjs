#!/usr/bin/env node
/**
 * Compute timezone overlap working hours for each city
 * Against 3 major remote employer zones: US-East, US-West, London
 * 
 * "Overlap" = hours where both sides are within 8am-8pm (reasonable work window)
 * Standard working hours: 9am-6pm (9h), but we use 8am-8pm (12h) as "possible work time"
 */
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const cities = JSON.parse(readFileSync(join(ROOT, "public/data/cities.json"), "utf-8")).cities;

// Reference timezones and their UTC offsets (standard time; DST handled separately)
const REFS = {
  "US-East": { tz: "America/New_York", label: "纽约" },
  "US-West": { tz: "America/Los_Angeles", label: "洛杉矶" },
  "London":  { tz: "Europe/London", label: "伦敦" },
};

// Get current UTC offset for a timezone (accounts for DST at time of run)
function getUTCOffset(tz) {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    timeZoneName: "shortOffset",
  });
  const parts = formatter.formatToParts(now);
  const offsetStr = parts.find(p => p.type === "timeZoneName")?.value || "GMT";
  const match = offsetStr.match(/GMT([+-]?)(\d{1,2})(?::(\d{2}))?/);
  if (!match) return 0;
  const sign = match[1] === "-" ? -1 : 1;
  return sign * (parseInt(match[2]) * 60 + parseInt(match[3] || "0"));
}

// Calculate overlap hours between two timezones
// "Work window" = 8:00-20:00 (12 hours) in each timezone
function overlapHours(offsetA, offsetB) {
  const diff = offsetA - offsetB; // in minutes
  const diffH = diff / 60;
  
  // Window A: 8:00-20:00 in A's time = 480-1200 minutes from midnight
  // Window B: 8:00-20:00 in B's time = (480+diff)-(1200+diff) in A's time
  const aStart = 480, aEnd = 1200; // A's work window in A-minutes
  const bStart = 480 + diff, bEnd = 1200 + diff; // B's work window in A-minutes
  
  const overlapStart = Math.max(aStart, bStart);
  const overlapEnd = Math.min(aEnd, bEnd);
  
  const overlap = Math.max(0, overlapEnd - overlapStart) / 60;
  return Math.round(overlap * 10) / 10; // round to 0.1h
}

// Compute for all cities
const refOffsets = {};
for (const [key, ref] of Object.entries(REFS)) {
  refOffsets[key] = getUTCOffset(ref.tz);
}

console.log("Reference timezone offsets (current, with DST if applicable):");
for (const [key, offset] of Object.entries(refOffsets)) {
  console.log(`  ${key}: UTC${offset >= 0 ? "+" : ""}${offset/60}h`);
}

const results = {};
let missingTz = 0;

for (const city of cities) {
  if (!city.timezone) {
    missingTz++;
    continue;
  }
  
  const cityOffset = getUTCOffset(city.timezone);
  const overlap = {};
  for (const [key, refOffset] of Object.entries(refOffsets)) {
    overlap[key] = overlapHours(cityOffset, refOffset);
  }
  
  results[city.id] = {
    name: city.name,
    timezone: city.timezone,
    utcOffsetMin: cityOffset,
    overlapHours: overlap,
  };
}

console.log(`\nComputed timezone overlap for ${Object.keys(results).length} cities (${missingTz} missing timezone)`);

// Summary stats
const usEastOverlaps = Object.values(results).map(r => r.overlapHours["US-East"]);
const londonOverlaps = Object.values(results).map(r => r.overlapHours["London"]);
console.log(`\nUS-East overlap: min=${Math.min(...usEastOverlaps)}h, max=${Math.max(...usEastOverlaps)}h`);
console.log(`London overlap: min=${Math.min(...londonOverlaps)}h, max=${Math.max(...londonOverlaps)}h`);

// Show some examples
console.log("\nSample results:");
const samples = [1, 3, 7, 45, 49, 14, 106, 132]; // NYC, Tokyo, Singapore, Bangkok, Bangalore, Dubai, Osaka, Moscow
for (const id of samples) {
  const r = results[id];
  if (r) {
    console.log(`  ${r.name}: US-East=${r.overlapHours["US-East"]}h, US-West=${r.overlapHours["US-West"]}h, London=${r.overlapHours["London"]}h`);
  }
}

writeFileSync(
  join(__dirname, "nomad-07-timezone-overlap.json"),
  JSON.stringify(results, null, 2) + "\n"
);
console.log("\nSaved to _audit/nomad-07-timezone-overlap.json");
