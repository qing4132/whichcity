#!/usr/bin/env node
/**
 * build-clean-v8.mjs — FINAL FINAL. v7 + salary override + confidence tiering.
 *
 * v8 = v7 (unchanged cost/rent formulas) + the ONE override we can justify:
 *   softwareDeveloper salary for US cities where |H1B p50 - prod| > 10%
 *
 * Adds per-city confidence tier (S/A/B/C/D) based on source provenance:
 *   S  cost: PLI + city adj (BEA/Eurostat)   rent: Zillow/ONS/StatCan
 *   A  cost: PLI                              rent: InsideAirbnb×K | NBS drift
 *   B  cost: PLI                              rent: formula fallback
 *   C  cost: null | PLI missing               rent: formula
 *   D  no cost + no rent signal (drop)
 *
 * Also attaches a "displayRecommendation" flag: keep | warn | drop.
 */
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const REPO = join(ROOT, "../..");

const v7   = JSON.parse(readFileSync(join(ROOT, "output/clean-values-v7.json"), "utf-8"));
const prod = JSON.parse(readFileSync(join(REPO, "public/data/cities.json"), "utf-8"));
const fx   = JSON.parse(readFileSync(join(REPO, "public/data/exchange-rates.json"), "utf-8"));
const prodBy = new Map((prod.cities ?? prod).map(c => [c.name, c]));

const SAL_THRESHOLD = 0.10;  // override if |Δ| > 10%

const out = {
  meta: {
    formulaVersion: "clean-v8-final",
    description: "v7 + H1B softwareDeveloper override (|Δ|>10%) + S/A/B/C/D confidence tiering",
    generated: new Date().toISOString(),
    upstream: v7.meta,
    overrides: {
      salary: `H1B LCA p50 replaces prod softwareDeveloper when |Δ|>${SAL_THRESHOLD*100}%`,
    },
    confidence: {
      S: "cost: PLI + city-level adj (BEA/Eurostat);  rent: Zillow / ONS / StatCan",
      A: "cost: PLI;  rent: InsideAirbnb×K | NBS yoy drift",
      B: "cost: PLI;  rent: formula (cost × rentShare)",
      C: "cost: null or PLI missing;  rent: formula",
      D: "cost and rent both missing/unreliable — drop from UI",
    },
  },
  cities: [],
};

const stats = { S:0, A:0, B:0, C:0, D:0, salaryOverride:0 };

function tierFor(c) {
  const rentT = {
    "Zillow-ZORI": "S", "ONS-2026": "S", "StatCan-CMHC": "S",
    "InsideAirbnb": "A", "prod-USD": "A",
    "cost×rentShare": "B", "null": "C",
  };
  let rent = "C";
  for (const k of Object.keys(rentT)) if (c.rentSource?.startsWith(k)) { rent = rentT[k]; break; }

  const costHasPLI = c._inputs?.blendedPLI != null;
  const costHasAdj = c.costSource?.includes("BEA-RPP") || c.costSource?.includes("Eurostat-PLI");

  let cost = "D";
  if (c.cost != null && costHasPLI && costHasAdj) cost = "S";
  else if (c.cost != null && costHasPLI) cost = "A";
  else if (c.cost != null) cost = "B";
  else cost = "D";

  // Aggregate: pick lower of the two (S<A<B<C<D)
  const order = { S:0, A:1, B:2, C:3, D:4 };
  const final = order[cost] > order[rent] ? cost : rent;
  if (c.cost == null && c.rent == null) return "D";
  return final;
}

for (const c of v7.cities) {
  const p = prodBy.get(c.name);
  const clone = JSON.parse(JSON.stringify(c));

  // === Salary override ===
  clone.salaryOverride = null;
  if (c.h1bAnchors?.professions?.softwareDeveloper && p?.professions?.["软件工程师"]) {
    const h = c.h1bAnchors.professions.softwareDeveloper;
    const pAnnual = p.professions["软件工程师"];
    const delta = (h.p50 - pAnnual) / pAnnual;
    if (Math.abs(delta) > SAL_THRESHOLD) {
      clone.salaryOverride = {
        field: "softwareDeveloper",
        prodValue: pAnnual,
        newValue: h.p50,
        delta: +(delta * 100).toFixed(1),
        source: `H1B LCA FY2026Q1 p50 (n=${h.n})`,
        range: { p25: h.p25, p50: h.p50, p75: h.p75 },
      };
      stats.salaryOverride++;
    }
  }

  // === Confidence tier ===
  let tier = tierFor(c);

  // Downgrade if v7 and prod disagree wildly (>40% on either metric)
  const dCost = (p?.costModerate && c.cost) ? Math.abs(c.cost - p.costModerate) / p.costModerate : 0;
  const dRent = (p?.monthlyRent && c.rent) ? Math.abs(c.rent - p.monthlyRent) / p.monthlyRent : 0;
  const maxDiv = Math.max(dCost, dRent);
  clone.divergence = { cost: +(dCost*100).toFixed(1), rent: +(dRent*100).toFixed(1) };

  // If tier is S/A/B but divergence > 40%, downgrade one level (mark as "warn")
  const downgrade = { S:"A", A:"B", B:"C", C:"C", D:"D" };
  if (maxDiv > 0.40 && tier !== "D") {
    clone.divergenceNote = `v7 vs prod diverge by ${(maxDiv*100).toFixed(0)}% — review`;
    tier = downgrade[tier];
  }
  clone.confidence = tier;
  stats[tier]++;

  // === Display recommendation ===
  if (tier === "D") clone.displayRecommendation = "drop";
  else if (tier === "C") clone.displayRecommendation = "warn";
  else clone.displayRecommendation = "keep";

  out.cities.push(clone);
}

console.log(`v8-final:`);
console.log(`  tiers:    S=${stats.S}  A=${stats.A}  B=${stats.B}  C=${stats.C}  D=${stats.D}   (total=${stats.S+stats.A+stats.B+stats.C+stats.D})`);
console.log(`  display:  keep=${stats.S+stats.A+stats.B}   warn=${stats.C}   drop=${stats.D}`);
console.log(`  salary override (|Δ|>${SAL_THRESHOLD*100}%): ${stats.salaryOverride} US cities`);
console.log("");

// Print drops/warns for visibility
const drops = out.cities.filter(c => c.displayRecommendation === "drop");
const warns = out.cities.filter(c => c.displayRecommendation === "warn");
console.log(`DROP (${drops.length}):`, drops.map(c => `${c.name}(${c.country})`).join(", "));
console.log(`\nWARN (${warns.length}):`, warns.map(c => `${c.name}(${c.country})`).join(", "));

const overrides = out.cities.filter(c => c.salaryOverride);
console.log(`\nSalary overrides (${overrides.length}):`);
for (const c of overrides) {
  const o = c.salaryOverride;
  console.log(`  ${c.name.padEnd(10)}  prod=$${o.prodValue.toLocaleString().padStart(8)}  H1B=$${o.newValue.toLocaleString().padStart(8)}  Δ=${o.delta>0?"+":""}${o.delta}%`);
}

writeFileSync(join(ROOT, "output/clean-values-v8.json"), JSON.stringify(out, null, 2) + "\n");
console.log(`\n✓ output/clean-values-v8.json  (${out.cities.length} cities)`);
