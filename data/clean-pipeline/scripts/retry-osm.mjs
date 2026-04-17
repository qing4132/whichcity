#!/usr/bin/env node
/** retry-osm.mjs — retry OSM queries with slower pace for 429/504 cities */
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const existing = JSON.parse(readFileSync(join(ROOT, "sources/osm/amenities.json"), "utf-8"));

const RETRY_CITIES = [
  ["北京", 39.9042, 116.4074], ["上海", 31.2304, 121.4737], ["旧金山", 37.7749, -122.4194],
  ["巴黎", 48.8566, 2.3522], ["东京", 35.6762, 139.6503], ["香港", 22.3193, 114.1694],
  ["台北", 25.0330, 121.5654], ["迪拜", 25.2048, 55.2708], ["曼谷", 13.7563, 100.5018],
  ["圣保罗", -23.5505, -46.6333], ["特拉维夫", 32.0853, 34.7818], ["维也纳", 48.2082, 16.3738],
  ["哥本哈根", 55.6761, 12.5683], ["苏黎世", 47.3769, 8.5417],
];
const RADIUS = 5000;
const ENDPOINTS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter", "https://overpass.private.coffee/api/interpreter"];

async function countFor(lat, lon, endpoint) {
  const query = `[out:json][timeout:90];
(node(around:${RADIUS},${lat},${lon})["amenity"~"^(restaurant|cafe|bar|fast_food)$"];)->.food;
(node(around:${RADIUS},${lat},${lon})["amenity"~"^(hospital|clinic|doctors|pharmacy)$"];)->.health;
(node(around:${RADIUS},${lat},${lon})["amenity"~"^(school|university|college|library)$"];)->.edu;
(node(around:${RADIUS},${lat},${lon})["amenity"~"^(theatre|cinema|arts_centre|community_centre)$"];
 node(around:${RADIUS},${lat},${lon})["tourism"~"^(museum|gallery)$"];)->.culture;
(node(around:${RADIUS},${lat},${lon})["amenity"="bicycle_rental"];
 node(around:${RADIUS},${lat},${lon})["public_transport"="station"];
 node(around:${RADIUS},${lat},${lon})["railway"="station"];
 node(around:${RADIUS},${lat},${lon})["railway"="subway_entrance"];)->.transit;
(node(around:${RADIUS},${lat},${lon})["leisure"~"^(park|garden|playground|sports_centre|fitness_centre)$"];)->.leisure;
out count;.food out count;.health out count;.edu out count;.culture out count;.transit out count;.leisure out count;`;
  const r = await fetch(endpoint, { method: "POST", body: query, headers: { "Content-Type": "text/plain" } });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const j = await r.json();
  const counts = j.elements.filter(e=>e.type==="count").map(e=>Number(e.tags?.nodes ?? e.tags?.total ?? 0));
  return { food:counts[1]??0, health:counts[2]??0, edu:counts[3]??0, culture:counts[4]??0, transit:counts[5]??0, leisure:counts[6]??0 };
}

const counts = existing.counts;
for (const [name, lat, lon] of RETRY_CITIES) {
  if (counts[name] && !counts[name].error) continue; // already good
  let success = false;
  for (const ep of ENDPOINTS) {
    try {
      process.stdout.write(`  ${name.padEnd(10)} [${ep.split("/")[2]}] `);
      const c = await countFor(lat, lon, ep);
      counts[name] = c;
      const total = Object.values(c).reduce((a,b)=>a+b,0);
      console.log(`food=${c.food} health=${c.health} edu=${c.edu} culture=${c.culture} transit=${c.transit} leisure=${c.leisure}  (Σ ${total})`);
      success = true;
      await new Promise(r=>setTimeout(r,4000));
      break;
    } catch (e) {
      console.log(`FAIL ${e.message}`);
      await new Promise(r=>setTimeout(r,6000));
    }
  }
  if (!success) counts[name] = { error: "all endpoints failed" };
}

existing.counts = counts;
existing.generated = new Date().toISOString();
writeFileSync(join(ROOT, "sources/osm/amenities.json"), JSON.stringify(existing, null, 2) + "\n");
const ok = Object.values(counts).filter(v=>!v.error).length;
console.log(`\n✓ ${ok}/${Object.keys(counts).length} cities have OSM data`);
