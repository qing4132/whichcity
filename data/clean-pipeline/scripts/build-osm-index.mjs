#!/usr/bin/env node
/**
 * build-osm-index.mjs — Convert OSM raw amenity counts into a city
 * "walkable richness" quality index 0-100. Purely a quality dimension,
 * independent from cost/income.
 *
 * Formula: geomean of 6 category min-max normalized scores * 100.
 */
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const osm = JSON.parse(readFileSync(join(ROOT, "sources/osm/amenities.json"), "utf-8"));

const CATS = ["food", "health", "edu", "culture", "transit", "leisure"];

const valid = {};
for (const [name, c] of Object.entries(osm.counts)) {
  if (!c.error) valid[name] = c;
}

// per-category max (use log scale to tame outliers)
const logC = {};
for (const cat of CATS) {
  logC[cat] = Object.values(valid).map((c) => Math.log1p(c[cat] || 0));
}
const maxC = Object.fromEntries(CATS.map((c) => [c, Math.max(...logC[c])]));
const minC = Object.fromEntries(CATS.map((c) => [c, Math.min(...logC[c])]));

const out = {
  source: "OpenStreetMap amenity density (© OSM contributors, ODbL)",
  radiusMeters: osm.radiusMeters,
  method: "geomean of 6 categories, each log+min-max, ×100",
  generated: new Date().toISOString(),
  cities: {},
};

for (const [name, c] of Object.entries(valid)) {
  const scores = {};
  for (const cat of CATS) {
    const v = Math.log1p(c[cat] || 0);
    const range = maxC[cat] - minC[cat];
    scores[cat] = range > 0 ? (v - minC[cat]) / range : 0;
  }
  // geomean (floor at 0.01 to avoid zero)
  const gm = Math.exp(CATS.reduce((s, cat) => s + Math.log(Math.max(scores[cat], 0.01)), 0) / CATS.length);
  out.cities[name] = {
    raw: c,
    normalized: Object.fromEntries(CATS.map((cat) => [cat, Math.round(scores[cat] * 100)])),
    qualityIndex: Math.round(gm * 100),
  };
}

writeFileSync(join(ROOT, "output/osm-quality-index.json"), JSON.stringify(out, null, 2) + "\n");

console.log("OSM 5-km amenity density quality index (higher = richer urban fabric):");
const sorted = Object.entries(out.cities).sort((a, b) => b[1].qualityIndex - a[1].qualityIndex);
console.log("\n城市           | 质量分 | food|health|edu|culture|transit|leisure");
for (const [nm, d] of sorted) {
  const n = d.normalized;
  const marker = nm === "北京" ? " ★" : "";
  console.log(`  ${nm.padEnd(10)}   |  ${String(d.qualityIndex).padStart(3)}  |  ${String(n.food).padStart(3)} |  ${String(n.health).padStart(3)} | ${String(n.edu).padStart(2)} |  ${String(n.culture).padStart(3)}  |  ${String(n.transit).padStart(3)}  |  ${String(n.leisure).padStart(3)}${marker}`);
}
console.log(`\n✓ output/osm-quality-index.json  (${Object.keys(valid).length} cities)`);
