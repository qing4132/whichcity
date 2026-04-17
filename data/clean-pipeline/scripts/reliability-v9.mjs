#!/usr/bin/env node
/** reliability-v9.mjs — final reliability scoring for standalone ship. */
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const v9 = JSON.parse(readFileSync(join(ROOT, "output/clean-values-v9.json"), "utf-8"));

const classifyCost = (c) => {
  if (c.cost == null) return "missing";
  if (c.costSource?.includes("BEA-RPP") || c.costSource?.includes("Eurostat-PLI")) return "pli+adj";
  if (c.costSource?.startsWith("v4:")) return "pli-only";
  return "unknown";
};
const classifyRent = (c) => {
  if (c.rent == null) return "missing";
  if (c.rentSource?.startsWith("Zillow")) return "zillow";
  if (c.rentSource?.startsWith("ONS")) return "ons";
  if (c.rentSource?.startsWith("StatCan")) return "statcan";
  if (c.rentSource?.startsWith("InsideAirbnb")) return "airbnb";
  if (c.rentSource?.startsWith("prod-USD")) return "nbs-drift"; // NOTE: still uses prod as baseline; flag this
  if (c.rentSource?.startsWith("cost")) return "formula";
  return "missing";
};
const scoreCost = (cls) => ({ "pli+adj":90, "pli-only":70, missing:0 }[cls]);
const scoreRent = (cls) => ({ zillow:95, ons:95, statcan:90, airbnb:75, "nbs-drift":60, formula:45, missing:0 }[cls]);
const scoreSalary = (c) => c.h1bAnchors ? 90 : (c.country === "美国" ? 65 : 45);
const scoreCity = (c) => 0.40*scoreCost(classifyCost(c)) + 0.40*scoreRent(classifyRent(c)) + 0.15*scoreSalary(c) + 0.05*(c.governance ? 100 : 40);

// Per tier breakdown
console.log("v9 per-tier reliability (standalone ship, no prod fallback):\n");
console.log("Tier   n    cost_score  rent_score  salary_score  gov_score   overall");
for (const tier of ["S","A","B","C","D"]) {
  const list = v9.cities.filter(c => c.confidence === tier);
  if (!list.length) continue;
  const cs = list.map(c => scoreCost(classifyCost(c)));
  const rs = list.map(c => scoreRent(classifyRent(c)));
  const ss = list.map(scoreSalary);
  const gs = list.map(c => c.governance ? 100 : 40);
  const ov = list.map(scoreCity);
  const mean = (a) => (a.reduce((s,v)=>s+v,0)/a.length).toFixed(0);
  console.log(`  ${tier}  ${String(list.length).padStart(3)}    ${mean(cs).padStart(4)}        ${mean(rs).padStart(4)}        ${mean(ss).padStart(4)}          ${mean(gs).padStart(4)}        ${mean(ov).padStart(5)}`);
}

// Cumulative ship scenarios
console.log("\n" + "=".repeat(90));
console.log("SHIP SCENARIOS (cumulative)");
console.log("=".repeat(90));
console.log(`Scope          n    reliability   rent_src breakdown`);
const scenarios = [
  ["S only (精品美国)", ["S"]],
  ["S+A (欧美核心)",    ["S","A"]],
  ["S+A+B (主流)",      ["S","A","B"]],
  ["S+A+B+C (宽容)",    ["S","A","B","C"]],
  ["All 151",           ["S","A","B","C","D"]],
];
for (const [name, tiers] of scenarios) {
  const list = v9.cities.filter(c => tiers.includes(c.confidence));
  const ov = list.length ? (list.map(scoreCity).reduce((s,v)=>s+v,0)/list.length).toFixed(1) : "0";
  const rc = {};
  for (const c of list) { const k = classifyRent(c); rc[k] = (rc[k]||0) + 1; }
  const rcStr = Object.entries(rc).map(([k,v]) => `${k}:${v}`).join(" ");
  console.log(`  ${name.padEnd(18)} ${String(list.length).padStart(4)}    ${ov}/100      ${rcStr}`);
}

// Rent source × tier matrix
console.log("\n" + "=".repeat(90));
console.log("RENT SOURCE × TIER MATRIX");
console.log("=".repeat(90));
const sources = ["zillow","ons","statcan","airbnb","nbs-drift","formula","missing"];
console.log("Tier".padEnd(6) + sources.map(s => s.padStart(10)).join(""));
for (const tier of ["S","A","B","C","D"]) {
  const list = v9.cities.filter(c => c.confidence === tier);
  const counts = sources.map(s => list.filter(c => classifyRent(c) === s).length);
  console.log(tier.padEnd(6) + counts.map(n => String(n).padStart(10)).join(""));
}
