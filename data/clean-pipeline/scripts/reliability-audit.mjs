#!/usr/bin/env node
/**
 * reliability-audit.mjs — if we kill prod and ship v8 standalone,
 * per-tier reliability of each critical field.
 */
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const REPO = join(ROOT, "../..");
const v8   = JSON.parse(readFileSync(join(ROOT, "output/clean-values-v8.json"), "utf-8"));
const prod = JSON.parse(readFileSync(join(REPO, "public/data/cities.json"), "utf-8"));
const pby  = new Map((prod.cities ?? prod).map(c => [c.name, c]));

// Classify fields: tainted (Numbeo-origin) vs clean (WB/WHO/etc.)
const TAINTED_FIELDS = ["costModerate","costBudget","monthlyRent","housePrice","numbeoSafetyIndex","professions"];

const byTier = {};
for (const c of v8.cities) {
  const t = c.confidence;
  if (!byTier[t]) byTier[t] = [];
  byTier[t].push(c);
}

function classifyCost(c) {
  if (c.cost == null) return "missing";
  if (c.costSource?.includes("BEA-RPP") || c.costSource?.includes("Eurostat-PLI")) return "authoritative";
  if (c.costSource?.startsWith("v4:")) return "pli-only";
  return "unknown";
}
function classifyRent(c) {
  if (c.rent == null) return "missing";
  if (c.rentSource?.startsWith("Zillow")) return "official";
  if (c.rentSource?.startsWith("ONS")) return "official";
  if (c.rentSource?.startsWith("StatCan")) return "official";
  if (c.rentSource?.startsWith("InsideAirbnb")) return "market";
  if (c.rentSource?.startsWith("prod-USD")) return "drift-adjusted"; // NBS
  if (c.rentSource?.startsWith("cost")) return "formula";
  return "missing";
}
function classifySalary(c) {
  // US MSA with H1B → hard anchor (though only 1 profession)
  if (c.h1bAnchors?.professions) return `h1b:${Object.keys(c.h1bAnchors.professions).length}prof`;
  // Non-US cities: no anchor; would need ILO country-level fallback
  return "ilo-country-fallback";
}

console.log("=".repeat(100));
console.log("RELIABILITY AUDIT — if v8 replaces prod entirely (NO Numbeo fallback)");
console.log("=".repeat(100));

for (const tier of ["S","A","B","C","D"]) {
  const list = byTier[tier] || [];
  if (!list.length) continue;
  const costClass = { authoritative:0, "pli-only":0, missing:0 };
  const rentClass = { official:0, market:0, "drift-adjusted":0, formula:0, missing:0 };
  const salaryUS = list.filter(c => c.h1bAnchors).length;
  const salaryNonUS = list.filter(c => !c.h1bAnchors).length;
  for (const c of list) {
    costClass[classifyCost(c)] = (costClass[classifyCost(c)] || 0) + 1;
    rentClass[classifyRent(c)] = (rentClass[classifyRent(c)] || 0) + 1;
  }
  console.log(`\n${tier} tier (n=${list.length})`);
  console.log(`  cost   : authoritative(PLI+city adj)=${costClass.authoritative}  PLI-only=${costClass["pli-only"]}  missing=${costClass.missing}`);
  console.log(`  rent   : official(Zillow/ONS/StatCan)=${rentClass.official}  market(Airbnb)=${rentClass.market}  drift(NBS)=${rentClass["drift-adjusted"]}  formula=${rentClass.formula}  missing=${rentClass.missing}`);
  console.log(`  salary : H1B-anchored(US)=${salaryUS}  ILO-country-fallback=${salaryNonUS}`);
  console.log(`  gov(FH): ${list.filter(c=>c.governance).length}/${list.length}`);
}

// Bottom line per-tier
console.log("\n" + "=".repeat(100));
console.log("BOTTOM LINE: per-tier reliability score (0-100) if shipped standalone");
console.log("=".repeat(100));
console.log(`  Formula: 40% cost + 40% rent + 15% salary + 5% gov  (weighted)`);
console.log(`  cost scoring: authoritative=100, pli-only=70, missing=0`);
console.log(`  rent scoring: official=100, market=85, drift=80, formula=50, missing=0`);
console.log(`  salary scoring: H1B=90, ILO country=55 (US=85)`);
console.log(`  gov scoring: has FH=100, no FH=50\n`);

const scoreCity = (c) => {
  const cs = classifyCost(c);
  const rs = classifyRent(c);
  const cost = cs === "authoritative" ? 100 : cs === "pli-only" ? 70 : 0;
  const rent = rs === "official" ? 100 : rs === "market" ? 85 : rs === "drift-adjusted" ? 80 : rs === "formula" ? 50 : 0;
  const salary = c.h1bAnchors ? 85 : (c.country === "美国" ? 75 : 55);
  const gov = c.governance ? 100 : 50;
  return 0.40*cost + 0.40*rent + 0.15*salary + 0.05*gov;
};

for (const tier of ["S","A","B","C","D"]) {
  const list = byTier[tier] || [];
  if (!list.length) continue;
  const scores = list.map(scoreCity);
  const mean = scores.reduce((s,v)=>s+v,0)/scores.length;
  const min = Math.min(...scores), max = Math.max(...scores);
  console.log(`  ${tier}  n=${String(list.length).padStart(3)}  mean=${mean.toFixed(1)}/100  range=[${min.toFixed(0)}..${max.toFixed(0)}]`);
}

// Cumulative ship scenarios
console.log("\n" + "=".repeat(100));
console.log("CUMULATIVE SHIP SCENARIOS");
console.log("=".repeat(100));
const scenarios = [
  ["S only", ["S"]],
  ["S+A",     ["S","A"]],
  ["S+A+B",   ["S","A","B"]],
  ["S+A+B+C", ["S","A","B","C"]],
  ["All 151", ["S","A","B","C","D"]],
];
for (const [name, tiers] of scenarios) {
  const list = v8.cities.filter(c => tiers.includes(c.confidence));
  const scores = list.map(scoreCity);
  const mean = scores.length ? scores.reduce((s,v)=>s+v,0)/scores.length : 0;
  const officialRent = list.filter(c=>classifyRent(c)==="official").length;
  const marketRent = list.filter(c=>classifyRent(c)==="market").length;
  const driftRent = list.filter(c=>classifyRent(c)==="drift-adjusted").length;
  const formulaRent = list.filter(c=>classifyRent(c)==="formula").length;
  console.log(`\n  ${name.padEnd(10)} n=${list.length}  reliability=${mean.toFixed(1)}/100`);
  console.log(`    rent breakdown: official=${officialRent}  market=${marketRent}  drift=${driftRent}  formula=${formulaRent}`);
  console.log(`    cost median |Δ vs prod|: (informational) — see city-manifest`);
}
