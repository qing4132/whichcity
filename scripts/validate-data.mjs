#!/usr/bin/env node
/**
 * Data validation script — run after any data change.
 * Usage: node scripts/validate-data.mjs
 * Exit code 0 = pass, 1 = fail
 *
 * Checks: field completeness, profession count, index ranges,
 * climate consistency, income/profession ratio, safety recomputation.
 */
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const cities = JSON.parse(readFileSync(join(ROOT, "public/data/cities.json"), "utf-8")).cities;

let errors = 0;
let warnings = 0;
const fail = (msg) => { console.error(`  ✗ ERROR: ${msg}`); errors++; };
const warn = (msg) => { console.warn(`  ⚠ WARN:  ${msg}`); warnings++; };

console.log(`Validating ${cities.length} cities…\n`);

// 1. Each city has 25 professions
for (const c of cities) {
  const n = Object.keys(c.professions).length;
  if (n !== 25) fail(`${c.name}(${c.id}): has ${n} professions, expected 25`);
}

// 2. averageIncome should be within 0.2x–5x of profession median
for (const c of cities) {
  const vals = Object.values(c.professions).sort((a, b) => a - b);
  const median = vals[Math.floor(vals.length / 2)];
  if (median > 0) {
    const ratio = c.averageIncome / median;
    if (ratio < 0.2 || ratio > 5.0) fail(`${c.name}(${c.id}): avg/median ratio ${ratio.toFixed(2)} out of [0.2, 5.0]`);
  }
}

// 3. Index fields 0-100
const idx100 = ["safetyIndex", "healthcareIndex", "freedomIndex"];
for (const f of idx100) {
  for (const c of cities) {
    if (c[f] < 0 || c[f] > 100) fail(`${c.name}(${c.id}): ${f}=${c[f]} out of [0,100]`);
  }
}

// 4. Safety index matches sub-indicators within tolerance (5 subs)
for (const c of cities) {
  const wpsNorm = c.wpsIndex != null ? c.wpsIndex * 100 : null;
  const subs = [
    { val: c.numbeoSafetyIndex, w: 0.30 },
    { val: c.homicideRateInv, w: 0.25 },
    { val: c.gpiScoreInv, w: 0.20 },
    { val: c.gallupLawOrder, w: 0.15 },
    { val: wpsNorm, w: 0.10 },
  ];
  const avail = subs.filter(s => s.val !== null && s.val !== undefined);
  if (avail.length > 0) {
    const tw = avail.reduce((s, v) => s + v.w, 0);
    const recomp = avail.reduce((s, v) => s + (v.val * v.w / tw), 0);
    if (Math.abs(recomp - c.safetyIndex) > 3.0) {
      fail(`${c.name}(${c.id}): safetyIndex=${c.safetyIndex} vs recomputed=${recomp.toFixed(1)} (diff > 3)`);
    }
  }
}

// 5. Climate: monthly rain sum vs annual within 20%
for (const c of cities) {
  const cl = c.climate;
  if (!cl?.monthlyRainMm || cl.monthlyRainMm.length !== 12) continue;
  const sum = cl.monthlyRainMm.reduce((a, b) => a + b, 0);
  const diff = Math.abs(sum - cl.annualRainMm);
  if (cl.annualRainMm > 0 && diff / cl.annualRainMm > 0.20) {
    warn(`${c.name}(${c.id}): rain monthly sum=${Math.round(sum)} vs annual=${cl.annualRainMm} (${(diff/cl.annualRainMm*100).toFixed(0)}% diff)`);
  }
}

// 6. Climate: monthlyHighC > monthlyLowC
for (const c of cities) {
  const cl = c.climate;
  if (!cl?.monthlyHighC || !cl?.monthlyLowC) continue;
  for (let m = 0; m < 12; m++) {
    if (cl.monthlyHighC[m] < cl.monthlyLowC[m]) {
      fail(`${c.name}(${c.id}): month ${m+1} high=${cl.monthlyHighC[m]} < low=${cl.monthlyLowC[m]}`);
    }
  }
}

// 7. Confidence labels match sub-indicator counts
for (const c of cities) {
  // Safety (5 subs: numbeo, homicide, gpi, gallup, wps)
  const sn = [c.numbeoSafetyIndex, c.homicideRateInv, c.gpiScoreInv, c.gallupLawOrder, c.wpsIndex].filter(v => v != null).length;
  const esc = sn >= 5 ? "high" : sn >= 4 ? "medium" : "low";
  if (c.safetyConfidence !== esc) warn(`${c.name}(${c.id}): safetyConfidence="${c.safetyConfidence}" should be "${esc}"`);
  // Healthcare (5 subs: doctors, beds, uhc, life, oop)
  const hn = [c.doctorsPerThousand, c.hospitalBedsPerThousand, c.uhcCoverageIndex, c.lifeExpectancy, c.outOfPocketPct].filter(v => v != null).length;
  const ehc = hn >= 5 ? "high" : hn >= 4 ? "medium" : "low";
  if (c.healthcareConfidence !== ehc) warn(`${c.name}(${c.id}): healthcareConfidence="${c.healthcareConfidence}" should be "${ehc}"`);
  // Freedom (legacy, 3 subs)
  const fn = [c.pressFreedomScore, c.democracyIndex, c.corruptionPerceptionIndex].filter(v => v != null).length;
  const efc = fn >= 3 ? "high" : fn >= 2 ? "medium" : "low";
  if (c.freedomConfidence !== efc) warn(`${c.name}(${c.id}): freedomConfidence="${c.freedomConfidence}" should be "${efc}"`);
  // Governance (5 subs: CPI, govEffectiveness, wjpRuleLaw, pressFreedomScore, mipexScore)
  const gn = [c.corruptionPerceptionIndex, c.govEffectiveness, c.wjpRuleLaw, c.pressFreedomScore, c.mipexScore].filter(v => v != null).length;
  const egc = gn >= 5 ? "high" : gn >= 4 ? "medium" : "low";
  if (c.governanceConfidence !== egc) warn(`${c.name}(${c.id}): governanceConfidence="${c.governanceConfidence}" should be "${egc}"`);
}

console.log(`\n${"=".repeat(40)}`);
console.log(`Errors: ${errors}  Warnings: ${warnings}`);
if (errors > 0) {
  console.log("VALIDATION FAILED");
  process.exit(1);
} else {
  console.log("VALIDATION PASSED" + (warnings > 0 ? ` (${warnings} warnings)` : ""));
}
