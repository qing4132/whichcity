#!/usr/bin/env node
/** retry-osm-v2.mjs — save incrementally so we don't lose progress */
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const file = join(ROOT, "sources/osm/amenities.json");

const TARGETS = [
  ["北京", 39.9042, 116.4074], ["上海", 31.2304, 121.4737],
  ["旧金山", 37.7749, -122.4194], ["巴黎", 48.8566, 2.3522],
  ["东京", 35.6762, 139.6503], ["香港", 22.3193, 114.1694],
  ["迪拜", 25.2048, 55.2708], ["特拉维夫", 32.0853, 34.7818],
  ["维也纳", 48.2082, 16.3738], ["哥本哈根", 55.6761, 12.5683],
  ["苏黎世", 47.3769, 8.5417],
];
const RADIUS = 5000;
const ENDPOINTS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"];

async function countFor(lat, lon, ep) {
  const q = `[out:json][timeout:90];(node(around:${RADIUS},${lat},${lon})["amenity"~"^(restaurant|cafe|bar|fast_food)$"];)->.food;(node(around:${RADIUS},${lat},${lon})["amenity"~"^(hospital|clinic|doctors|pharmacy)$"];)->.health;(node(around:${RADIUS},${lat},${lon})["amenity"~"^(school|university|college|library)$"];)->.edu;(node(around:${RADIUS},${lat},${lon})["amenity"~"^(theatre|cinema|arts_centre|community_centre)$"];node(around:${RADIUS},${lat},${lon})["tourism"~"^(museum|gallery)$"];)->.culture;(node(around:${RADIUS},${lat},${lon})["amenity"="bicycle_rental"];node(around:${RADIUS},${lat},${lon})["public_transport"="station"];node(around:${RADIUS},${lat},${lon})["railway"="station"];node(around:${RADIUS},${lat},${lon})["railway"="subway_entrance"];)->.transit;(node(around:${RADIUS},${lat},${lon})["leisure"~"^(park|garden|playground|sports_centre|fitness_centre)$"];)->.leisure;out count;.food out count;.health out count;.edu out count;.culture out count;.transit out count;.leisure out count;`;
  const r = await fetch(ep, { method: "POST", body: q, headers: { "Content-Type": "text/plain" } });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const j = await r.json();
  const counts = j.elements.filter(e=>e.type==="count").map(e=>Number(e.tags?.nodes ?? e.tags?.total ?? 0));
  return { food:counts[1]??0, health:counts[2]??0, edu:counts[3]??0, culture:counts[4]??0, transit:counts[5]??0, leisure:counts[6]??0 };
}

for (const [name, lat, lon] of TARGETS) {
  const data = JSON.parse(readFileSync(file, "utf-8"));
  if (data.counts[name] && !data.counts[name].error) {
    console.log(`  ${name} (cached, skip)`);
    continue;
  }
  let ok = false;
  for (const ep of ENDPOINTS) {
    try {
      process.stdout.write(`  ${name.padEnd(10)} [${ep.split("/")[2]}] `);
      const c = await countFor(lat, lon, ep);
      data.counts[name] = c;
      data.generated = new Date().toISOString();
      writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
      const t = Object.values(c).reduce((a,b)=>a+b,0);
      console.log(`food=${c.food} health=${c.health} edu=${c.edu} culture=${c.culture} transit=${c.transit} leisure=${c.leisure} (Σ${t}) saved`);
      ok = true;
      await new Promise(r=>setTimeout(r,5000));
      break;
    } catch(e) {
      console.log(`FAIL ${e.message}`);
      await new Promise(r=>setTimeout(r,8000));
    }
  }
  if (!ok) console.log(`  ${name} all endpoints failed, leaving blank`);
}
console.log("\n✓ done");
