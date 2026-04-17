#!/usr/bin/env node
/**
 * compare.mjs — clean-pipeline vs current 2a19d87 (NB-fit baseline).
 *
 * Reports per-city deviation, distribution, tier A vs tier B accuracy.
 */
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const REPO = join(ROOT, "../..");

const clean = JSON.parse(readFileSync(join(ROOT, "output/clean-values.json"), "utf-8"));
const prod = JSON.parse(readFileSync(join(REPO, "public/data/cities.json"), "utf-8"));

const prodByName = new Map();
for (const c of prod.cities ?? prod) prodByName.set(c.name, c);

function dev(a, b) {
  if (a == null || b == null) return null;
  if (b === 0) return null;
  return (a - b) / b;
}

const rows = [];
const cleanCost = [], cleanRent = [], cleanHouse = [];
const tierACities = [], tierBCities = [];

for (const cc of clean.cities) {
  const p = prodByName.get(cc.name);
  if (!p) continue;
  const dCost = dev(cc.cost, p.costModerate);
  const dRent = dev(cc.rent, p.monthlyRent);
  const dHouse = dev(cc.house, p.housePrice);
  rows.push({
    name: cc.name, country: cc.country,
    costClean: cc.cost, costProd: p.costModerate, dCost,
    rentClean: cc.rent, rentProd: p.monthlyRent, dRent, rentSource: cc.rentSource,
    houseClean: cc.house, houseProd: p.housePrice, dHouse,
  });
  if (dCost != null) cleanCost.push(Math.abs(dCost));
  if (dRent != null) cleanRent.push(Math.abs(dRent));
  if (dHouse != null) cleanHouse.push(Math.abs(dHouse));
  if (cc.rentSource.startsWith("HUD") || cc.rentSource.startsWith("ONS") || cc.rentSource.startsWith("StatCan")) {
    tierACities.push({ name: cc.name, dRent });
  } else if (dRent != null) {
    tierBCities.push({ name: cc.name, dRent });
  }
}

function median(a) { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; }
function bucket(arr) {
  const b = { "<10%": 0, "10-25%": 0, "25-50%": 0, "50-100%": 0, ">100%": 0 };
  for (const v of arr) {
    if (v < 0.10) b["<10%"]++;
    else if (v < 0.25) b["10-25%"]++;
    else if (v < 0.50) b["25-50%"]++;
    else if (v < 1.00) b["50-100%"]++;
    else b[">100%"]++;
  }
  return b;
}

console.log("════ Global deviation (|Δ| vs 2a19d87) ════");
console.log(`Cost:  n=${cleanCost.length}  median=${(median(cleanCost) * 100).toFixed(1)}%  mean=${(cleanCost.reduce((a, b) => a + b, 0) / cleanCost.length * 100).toFixed(1)}%`);
console.log(`       buckets:`, bucket(cleanCost));
console.log(`Rent:  n=${cleanRent.length}  median=${(median(cleanRent) * 100).toFixed(1)}%  mean=${(cleanRent.reduce((a, b) => a + b, 0) / cleanRent.length * 100).toFixed(1)}%`);
console.log(`       buckets:`, bucket(cleanRent));
console.log(`House: n=${cleanHouse.length}  median=${(median(cleanHouse) * 100).toFixed(1)}%  mean=${(cleanHouse.reduce((a, b) => a + b, 0) / cleanHouse.length * 100).toFixed(1)}%`);
console.log(`       buckets:`, bucket(cleanHouse));

console.log(`\n════ Rent by tier ════`);
const tierAAbs = tierACities.filter(x => x.dRent != null).map(x => Math.abs(x.dRent));
const tierBAbs = tierBCities.map(x => Math.abs(x.dRent));
console.log(`Tier A gov-direct  n=${tierAAbs.length}  median=${(median(tierAAbs) * 100).toFixed(1)}%  buckets:`, bucket(tierAAbs));
console.log(`Tier B WB-formula  n=${tierBAbs.length}  median=${(median(tierBAbs) * 100).toFixed(1)}%  buckets:`, bucket(tierBAbs));

console.log(`\n════ Tier A (government-direct) rent, per city ════`);
console.log("name           clean  vs  prod   Δ%");
for (const t of tierACities.sort((a, b) => (b.dRent ?? 0) - (a.dRent ?? 0))) {
  const r = rows.find(x => x.name === t.name);
  console.log(`  ${t.name.padEnd(12)} $${String(r.rentClean).padStart(5)}  $${String(r.rentProd).padStart(5)}  ${t.dRent == null ? "—" : (t.dRent * 100).toFixed(0) + "%"}`);
}

console.log(`\n════ Sample (20 cities across GDP tiers) ════`);
const pick = ["纽约", "旧金山", "洛杉矶", "伦敦", "巴黎", "柏林", "米兰", "里斯本", "东京", "首尔", "新加坡", "香港", "多伦多", "悉尼", "迪拜", "曼谷", "孟买", "胡志明市", "墨西哥城", "开普敦"];
console.log("city        | cost clean / prod  Δ%   | rent clean / prod  Δ%   | house clean / prod  Δ%");
for (const nm of pick) {
  const r = rows.find(x => x.name === nm);
  if (!r) continue;
  const f = (c, p, d) => `${String(c ?? "-").padStart(5)} / ${String(p ?? "-").padStart(5)}  ${d == null ? "  -" : (d * 100 >= 0 ? "+" : "") + (d * 100).toFixed(0).padStart(3) + "%"}`;
  console.log(`  ${nm.padEnd(10)} | ${f(r.costClean, r.costProd, r.dCost)} | ${f(r.rentClean, r.rentProd, r.dRent)} | ${f(r.houseClean, r.houseProd, r.dHouse)}`);
}

writeFileSync(join(ROOT, "output/comparison.json"), JSON.stringify({ rows, bucketsCost: bucket(cleanCost), bucketsRent: bucket(cleanRent), bucketsHouse: bucket(cleanHouse) }, null, 2) + "\n");
console.log(`\n✓ ${join(ROOT, "output/comparison.json")}`);
