#!/usr/bin/env node
/**
 * fetch-osm-amenities.mjs — OpenStreetMap amenity density via Overpass API.
 *
 * For each comparison city, count cultural/transit/healthcare/food amenities
 * within a 5 km radius of the city centre. Yields a quality-of-life signal
 * orthogonal to income/cost.
 *
 * License: ODbL (attribute OpenStreetMap contributors).
 * Rate limit: respect Overpass — sleep between queries.
 */
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const REPO = join(ROOT, "../..");

// Key cities with approximate centre lat/lon (hand-curated; kept short so we
// keep within Overpass fair use in one pass).
const CITIES = [
  ["北京", 39.9042, 116.4074],
  ["上海", 31.2304, 121.4737],
  ["深圳", 22.5431, 114.0579],
  ["纽约", 40.7128, -74.0060],
  ["旧金山", 37.7749, -122.4194],
  ["芝加哥", 41.8781, -87.6298],
  ["伦敦", 51.5074, -0.1278],
  ["巴黎", 48.8566, 2.3522],
  ["柏林", 52.5200, 13.4050],
  ["阿姆斯特丹", 52.3676, 4.9041],
  ["东京", 35.6762, 139.6503],
  ["首尔", 37.5665, 126.9780],
  ["新加坡", 1.3521, 103.8198],
  ["香港", 22.3193, 114.1694],
  ["台北", 25.0330, 121.5654],
  ["多伦多", 43.6532, -79.3832],
  ["悉尼", -33.8688, 151.2093],
  ["迪拜", 25.2048, 55.2708],
  ["曼谷", 13.7563, 100.5018],
  ["孟买", 19.0760, 72.8777],
  ["墨西哥城", 19.4326, -99.1332],
  ["圣保罗", -23.5505, -46.6333],
  ["开普敦", -33.9249, 18.4241],
  ["伊斯坦布尔", 41.0082, 28.9784],
  ["特拉维夫", 32.0853, 34.7818],
  ["马德里", 40.4168, -3.7038],
  ["罗马", 41.9028, 12.4964],
  ["维也纳", 48.2082, 16.3738],
  ["哥本哈根", 55.6761, 12.5683],
  ["苏黎世", 47.3769, 8.5417],
];

// 5 km radius = 0.045 deg lat  (approx); generate bbox query.
// Single combined query per city counting 5 amenity buckets.
const RADIUS = 5000; // meters

async function countFor(lat, lon) {
  const query = `
[out:json][timeout:60];
(
  node(around:${RADIUS},${lat},${lon})["amenity"~"^(restaurant|cafe|bar|fast_food)$"];
)->.food;
(
  node(around:${RADIUS},${lat},${lon})["amenity"~"^(hospital|clinic|doctors|pharmacy)$"];
)->.health;
(
  node(around:${RADIUS},${lat},${lon})["amenity"~"^(school|university|college|library)$"];
)->.edu;
(
  node(around:${RADIUS},${lat},${lon})["amenity"~"^(theatre|cinema|arts_centre|community_centre)$"];
  node(around:${RADIUS},${lat},${lon})["tourism"~"^(museum|gallery)$"];
)->.culture;
(
  node(around:${RADIUS},${lat},${lon})["amenity"="bicycle_rental"];
  node(around:${RADIUS},${lat},${lon})["public_transport"="station"];
  node(around:${RADIUS},${lat},${lon})["railway"="station"];
  node(around:${RADIUS},${lat},${lon})["railway"="subway_entrance"];
)->.transit;
(
  node(around:${RADIUS},${lat},${lon})["leisure"~"^(park|garden|playground|sports_centre|fitness_centre)$"];
)->.leisure;
out count;
.food out count;
.health out count;
.edu out count;
.culture out count;
.transit out count;
.leisure out count;
`.trim();

  const url = "https://overpass-api.de/api/interpreter";
  const r = await fetch(url, { method: "POST", body: query, headers: { "Content-Type": "text/plain" } });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const j = await r.json();
  const counts = j.elements.filter((e) => e.type === "count").map((e) => Number(e.tags?.nodes ?? e.tags?.total ?? 0));
  // Overpass returns counts in set declaration order; first overall, then named sets.
  // We emitted: food, health, edu, culture, transit, leisure (plus an initial "out count" for default set)
  return {
    food: counts[1] ?? 0,
    health: counts[2] ?? 0,
    edu: counts[3] ?? 0,
    culture: counts[4] ?? 0,
    transit: counts[5] ?? 0,
    leisure: counts[6] ?? 0,
  };
}

const results = {};
for (const [name, lat, lon] of CITIES) {
  process.stdout.write(`  ${name.padEnd(10)} `);
  try {
    const c = await countFor(lat, lon);
    results[name] = c;
    const total = Object.values(c).reduce((a, b) => a + b, 0);
    console.log(`food=${c.food} health=${c.health} edu=${c.edu} culture=${c.culture} transit=${c.transit} leisure=${c.leisure}  (Σ ${total})`);
    await new Promise((r) => setTimeout(r, 1500)); // polite delay
  } catch (e) {
    console.log(`ERROR ${e.message}`);
    results[name] = { error: e.message };
    await new Promise((r) => setTimeout(r, 5000));
  }
}

const out = {
  source: "OpenStreetMap via Overpass API (© OpenStreetMap contributors, ODbL)",
  radiusMeters: RADIUS,
  generated: new Date().toISOString(),
  counts: results,
};
writeFileSync(join(ROOT, "sources/osm/amenities.json"), JSON.stringify(out, null, 2) + "\n");
console.log(`\n✓ sources/osm/amenities.json (${CITIES.length} cities)`);
