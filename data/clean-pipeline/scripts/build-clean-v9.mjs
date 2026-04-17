#!/usr/bin/env node
/**
 * build-clean-v9.mjs — reliability tiering for STANDALONE replacement.
 *
 * v9 = v8 logic, but tier is based purely on SOURCE QUALITY,
 * not on divergence-from-prod (because prod is being deprecated).
 *
 * Tier definitions (source-based only):
 *   S  cost: PLI + city_adj (BEA/Eurostat)  rent: official (Zillow/ONS/StatCan)
 *   A  cost: PLI + city_adj                 rent: market (Airbnb×K) | drift (NBS)
 *      OR  cost: PLI only                    rent: official
 *   B  cost: PLI + city_adj                 rent: formula
 *      OR  cost: PLI only                    rent: market/drift
 *   C  cost: PLI only                        rent: formula
 *   D  cost: missing / rent: missing
 *
 * Separately attaches `prodDivergence` as informational flag only.
 */
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const REPO = join(ROOT, "../..");

const v7   = JSON.parse(readFileSync(join(ROOT, "output/clean-values-v7.json"), "utf-8"));
const prod = JSON.parse(readFileSync(join(REPO, "public/data/cities.json"), "utf-8"));
const prodBy = new Map((prod.cities ?? prod).map(c => [c.name, c]));

function tierCost(c) {
  if (c.cost == null) return "D";
  if (c.costSource?.includes("BEA-RPP") || c.costSource?.includes("Eurostat-PLI")) return "S"; // PLI + city adj
  if (c.costSource?.startsWith("v4:")) return "A"; // PLI only
  return "D";
}
function tierRent(c) {
  if (c.rent == null) return "D";
  if (c.rentSource?.startsWith("Zillow") || c.rentSource?.startsWith("ONS") || c.rentSource?.startsWith("StatCan")) return "S"; // official
  if (c.rentSource?.startsWith("InsideAirbnb") || c.rentSource?.startsWith("prod-USD")) return "A"; // market / drift
  if (c.rentSource?.startsWith("cost")) return "B"; // formula
  return "D";
}

// Combine: both must be in a tier; take the worse of the two.
// But we mint a combined 5-level scale where S requires BOTH S.
const order = { S:0, A:1, B:2, C:3, D:4 };
const rev   = { 0:"S", 1:"A", 2:"B", 3:"C", 4:"D" };

const out = {
  meta: {
    formulaVersion: "clean-v9-standalone-reliability",
    description: "Pure source-based tiering for standalone prod replacement. Divergence is informational only.",
    generated: new Date().toISOString(),
    upstream: v7.meta.formulaVersion,
    tierDefinitions: {
      S: "cost: PLI+city_adj   rent: official (Zillow/ONS/StatCan)",
      A: "cost: PLI+city_adj   rent: market(Airbnb)|drift(NBS)     OR   cost: PLI only + rent: official",
      B: "cost: PLI+city_adj   rent: formula                        OR   cost: PLI only + rent: market/drift",
      C: "cost: PLI only       rent: formula",
      D: "cost or rent missing",
    },
  },
  cities: [],
};

const stats = { S:0, A:0, B:0, C:0, D:0 };
for (const c of v7.cities) {
  const tc = tierCost(c);
  const tr = tierRent(c);
  const p = prodBy.get(c.name);
  let tier;
  if (tc === "D" || tr === "D") tier = "D";
  else if (tc === "S" && tr === "S") tier = "S";
  else if ((tc === "S" && tr === "A") || (tc === "A" && tr === "S")) tier = "A";
  else if ((tc === "S" && tr === "B") || (tc === "A" && tr === "A")) tier = "B";
  else if (tc === "A" && tr === "B") tier = "C";
  else tier = "C";
  stats[tier]++;

  const divCost = (p?.costModerate && c.cost) ? ((c.cost - p.costModerate) / p.costModerate * 100).toFixed(1) : null;
  const divRent = (p?.monthlyRent && c.rent) ? ((c.rent - p.monthlyRent) / p.monthlyRent * 100).toFixed(1) : null;

  out.cities.push({
    ...c,
    confidence: tier,
    tierCost: tc,
    tierRent: tr,
    prodDivergence: { cost: divCost !== null ? +divCost : null, rent: divRent !== null ? +divRent : null },
  });
}

// Apply salary override identically to v8
const SAL_THRESHOLD = 0.10;
let overrides = 0;
for (const c of out.cities) {
  const p = prodBy.get(c.name);
  c.salaryOverride = null;
  if (c.h1bAnchors?.professions?.softwareDeveloper && p?.professions?.["软件工程师"]) {
    const h = c.h1bAnchors.professions.softwareDeveloper;
    const pv = p.professions["软件工程师"];
    const d = (h.p50 - pv) / pv;
    if (Math.abs(d) > SAL_THRESHOLD) {
      c.salaryOverride = { field:"softwareDeveloper", prodValue:pv, newValue:h.p50, delta:+(d*100).toFixed(1), source:`H1B LCA FY2026Q1 p50 (n=${h.n})`, range:{p25:h.p25, p50:h.p50, p75:h.p75} };
      overrides++;
    }
  }
  c.displayRecommendation = c.confidence === "D" ? "drop" : (c.confidence === "C" ? "warn" : "keep");
}

console.log("v9 (standalone reliability):");
console.log(`  S=${stats.S}  A=${stats.A}  B=${stats.B}  C=${stats.C}  D=${stats.D}  (total=${stats.S+stats.A+stats.B+stats.C+stats.D})`);
console.log(`  salary overrides: ${overrides}`);

// Per-tier city list
for (const tier of ["S","A","B","C","D"]) {
  const list = out.cities.filter(c => c.confidence === tier);
  const byc = {};
  for (const c of list) { byc[c.country] = byc[c.country] || []; byc[c.country].push(c.name); }
  console.log(`\n${tier} (${list.length}):`);
  for (const [k, v] of Object.entries(byc)) console.log(`  [${k}] ${v.join("/")}`);
}

writeFileSync(join(ROOT, "output/clean-values-v9.json"), JSON.stringify(out, null, 2) + "\n");
console.log(`\n✓ output/clean-values-v9.json`);
