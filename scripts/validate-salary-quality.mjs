#!/usr/bin/env node
/**
 * validate-salary-quality.mjs — Multi-source salary cross-validation
 *
 * 1. BLS benchmark: compare our ILO-based estimates for US cities against BLS actuals
 * 2. Numbeo archive comparison (read-only, not for fitting)
 * 3. costModerate consistency check (salary vs cost of living ratio)
 * 4. Output: systematic bias analysis + per-city flags
 */
import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SOURCE_PATH = join(ROOT, "data/cities-source.json");
const BLS_PATH = join(ROOT, "data/salary-research/raw/bls-oews-extracted.json");
const ILO_DIR = join(ROOT, "data/sources/ilo");

function parseCSV(text) {
  const lines = text.split("\n").filter(l => l.trim());
  const rows = [];
  for (const line of lines) {
    const r = []; let f = "", q = false;
    for (const c of line) { if (c === '"') q = !q; else if (c === "," && !q) { r.push(f); f = ""; } else f += c; }
    r.push(f); rows.push(r);
  }
  return rows;
}

function main() {
  console.log("═══ Salary Quality Validation Report ═══\n");

  const sourceData = JSON.parse(readFileSync(SOURCE_PATH, "utf-8"));
  const cities = sourceData.cities;

  // ════════════════════════════════════════════════════
  // 1. BLS BENCHMARK VALIDATION
  // ════════════════════════════════════════════════════
  console.log("── 1. BLS Benchmark (US cities: actual vs if-we-estimated) ──\n");

  // Load ILO US PPP earnings to simulate what our estimate WOULD be
  const earnFile = readdirSync(ILO_DIR).find(f => f.startsWith("ilo-earnings-by-currency"));
  const earnRows = parseCSV(readFileSync(join(ILO_DIR, earnFile), "utf-8"));
  let usIloPPP = null;
  for (let i = 1; i < earnRows.length; i++) {
    const [country, , , sex, currency, year, val] = earnRows[i];
    if (country === "United States of America" && sex === "Total" && currency?.includes("PPP")) {
      const v = parseFloat(val), y = parseInt(year);
      if (!isNaN(v) && (!usIloPPP || y > usIloPPP.year)) usIloPPP = { monthly: v, year: y };
    }
  }

  if (usIloPPP) {
    console.log(`  US ILO PPP monthly avg: $${usIloPPP.monthly.toFixed(0)} (${usIloPPP.year})`);
    console.log(`  US ILO annual base: $${(usIloPPP.monthly * 12).toFixed(0)}\n`);

    // Load government ratios for US
    const govData = JSON.parse(readFileSync(join(ROOT, "data/salary-research/raw/country-specific-ratios.json"), "utf-8"));
    // US might not be in gov ratios (BLS is the direct source)
    // Instead, compare: BLS actual vs (ILO base × ISCO ratio × city premium)

    const usCities = cities.filter(c => c.country === "美国");
    const profSample = ["软件工程师", "护士", "教师", "厨师", "律师"];
    const ratios = [];

    console.log("  City | Prof | BLS Actual | ILO Estimate | Ratio");
    console.log("  " + "-".repeat(70));

    for (const city of usCities.slice(0, 8)) {
      for (const prof of profSample) {
        const blsActual = city.professions[prof];
        // Simulate ILO estimate: use same method as rebuild script
        // ILO annual × generic ISCO ratio × default premium
        const iloAnnual = usIloPPP.monthly * 12;
        const iscoSubs = { "软件工程师": 1.15, "护士": 0.70, "教师": 0.75, "厨师": 1.05, "律师": 1.30 };
        const premium = 1.10; // Default
        const iloEstimate = Math.round(iloAnnual * (iscoSubs[prof] || 1.0) * premium);
        const ratio = blsActual / iloEstimate;
        ratios.push(ratio);
        if (prof === "软件工程师") {
          console.log(`  ${city.name} | ${prof} | $${blsActual.toLocaleString()} | $${iloEstimate.toLocaleString()} | ${ratio.toFixed(2)}`);
        }
      }
    }

    const avgRatio = ratios.reduce((a, b) => a + b, 0) / ratios.length;
    const medRatio = ratios.sort((a, b) => a - b)[Math.floor(ratios.length / 2)];
    console.log(`\n  Average BLS/ILO ratio: ${avgRatio.toFixed(3)}`);
    console.log(`  Median BLS/ILO ratio: ${medRatio.toFixed(3)}`);
    console.log(`  → ILO estimates are ${avgRatio > 1 ? "lower" : "higher"} than BLS by ${Math.abs((1-avgRatio)*100).toFixed(1)}% on average`);
    console.log(`  → Suggested global correction factor: ${avgRatio.toFixed(3)}`);
  }

  // ════════════════════════════════════════════════════
  // 2. NUMBEO ARCHIVE COMPARISON (read-only)
  // ════════════════════════════════════════════════════
  console.log("\n── 2. Numbeo Archive Comparison (reference only, NOT for fitting) ──\n");

  // Try to read archived Numbeo salary data
  const archivePath = join(ROOT, "_archive/salary-research-tainted/salary-estimates-v2.json");
  let numbeoComparison = [];
  try {
    const archiveData = JSON.parse(readFileSync(archivePath, "utf-8"));
    const archiveByCity = {};
    for (const entry of archiveData.data || []) {
      const key = entry.cityName + "|" + entry.profession;
      archiveByCity[key] = entry.annualGrossMedian_USD;
    }

    const sampleCities = ["伦敦", "柏林", "新加坡", "首尔", "曼谷", "孟买"];
    const sampleProf = "软件工程师";

    console.log("  City | Current | Numbeo Archive | Ratio | Note");
    console.log("  " + "-".repeat(70));

    for (const name of sampleCities) {
      const city = cities.find(c => c.name === name);
      if (!city) continue;
      const current = city.professions[sampleProf];
      const archiveKey = name + "|" + sampleProf;
      const archive = archiveByCity[archiveKey];
      if (current && archive) {
        const ratio = current / archive;
        const note = ratio > 1.3 ? "⚠️ MUCH HIGHER" : ratio < 0.7 ? "⚠️ MUCH LOWER" : "OK";
        numbeoComparison.push(ratio);
        console.log(`  ${name} | $${current.toLocaleString()} | $${archive.toLocaleString()} | ${ratio.toFixed(2)} | ${note}`);
      } else {
        console.log(`  ${name} | $${current?.toLocaleString() || "?"} | ${archive ? "$" + archive.toLocaleString() : "N/A"} | — |`);
      }
    }

    if (numbeoComparison.length > 0) {
      const avg = numbeoComparison.reduce((a, b) => a + b, 0) / numbeoComparison.length;
      console.log(`\n  Average current/Numbeo ratio: ${avg.toFixed(3)}`);
      console.log(`  → ${avg > 1.1 ? "Our estimates tend higher (possible ILO PPP inflation)" : avg < 0.9 ? "Our estimates tend lower" : "Broadly consistent"}`);
    }
  } catch {
    console.log("  Archive file not found or unreadable. Skipping.");
  }

  // ════════════════════════════════════════════════════
  // 3. COST-OF-LIVING CONSISTENCY CHECK
  // ════════════════════════════════════════════════════
  console.log("\n── 3. Cost-of-Living Consistency ──\n");
  console.log("  Cities where salary/cost ratio is abnormal (savings rate <0% or >80%):\n");

  let flags = 0;
  for (const city of cities) {
    const medianSalary = Object.values(city.professions).sort((a, b) => a - b)[12];
    const monthlyCost = city.costModerate;
    if (!medianSalary || !monthlyCost) continue;

    const annualCost = monthlyCost * 12;
    const savingsRate = (medianSalary - annualCost) / medianSalary;

    if (savingsRate < -0.1 || savingsRate > 0.80) {
      const flag = savingsRate < 0 ? "🔴 NEGATIVE savings" : "🟡 Very high savings";
      console.log(`  ${city.name}: salary=$${medianSalary.toLocaleString()} cost=$${(annualCost).toLocaleString()}/yr savings=${(savingsRate*100).toFixed(0)}% ${flag}`);
      flags++;
    }
  }
  console.log(`\n  Flagged: ${flags}/${cities.length} cities`);

  // ════════════════════════════════════════════════════
  // 4. EUROSTAT SES CHECK (probe availability)
  // ════════════════════════════════════════════════════
  console.log("\n── 4. Eurostat Structure of Earnings Survey ──\n");
  console.log("  Eurostat SES provides city/region-level wage data for EU countries.");
  console.log("  Available via: https://ec.europa.eu/eurostat/databrowser/");
  console.log("  Dataset: earn_ses_annual (CC BY 4.0)");
  console.log("  → Future task: fetch EU city-level wages to replace generic premiums");

  console.log("\n═══ Summary ═══");
  console.log("  This report helps identify systematic biases in our salary estimates.");
  console.log("  Action items are based on cross-validation, NOT on fitting to any single source.");
  console.log("\n✅ Done");
}

main();
