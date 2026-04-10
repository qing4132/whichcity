#!/usr/bin/env node
/**
 * Audit Script 01: Data Integrity & Cross-validation
 * - Check field completeness, null counts, range checks
 * - Validate cost ratios, income consistency, climate data
 * - Cross-store consistency (cities.json vs constants, slugs, i18n, etc.)
 */
import { readFileSync } from "fs";
import { join } from "path";

const ROOT = join(import.meta.dirname, "..");
const cities = JSON.parse(readFileSync(join(ROOT, "public/data/cities.json"), "utf-8")).cities;
const rates = JSON.parse(readFileSync(join(ROOT, "public/data/exchange-rates.json"), "utf-8"));

const findings = [];
const warn = (cat, sev, city, msg) => findings.push({ category: cat, severity: sev, city, message: msg });

console.log(`\n=== AUDIT 01: DATA INTEGRITY ===`);
console.log(`Total cities loaded: ${cities.length}`);
console.log(`ID range: ${Math.min(...cities.map(c=>c.id))} - ${Math.max(...cities.map(c=>c.id))}`);

// 1. Field completeness
const nullCounts = {};
const fieldsToCheck = [
  "averageIncome", "costModerate", "costBudget", "bigMacPrice", "housePrice",
  "airQuality", "doctorsPerThousand", "directFlightCities", "annualWorkHours",
  "monthlyRent", "paidLeaveDays", "internetSpeedMbps", "hospitalBedsPerThousand",
  "uhcCoverageIndex", "lifeExpectancy", "pressFreedomScore", "democracyIndex",
  "corruptionPerceptionIndex", "numbeoSafetyIndex", "homicideRateInv",
  "gpiScoreInv", "gallupLawOrder", "safetyIndex", "healthcareIndex", "freedomIndex",
];

for (const f of fieldsToCheck) nullCounts[f] = 0;
for (const c of cities) {
  for (const f of fieldsToCheck) {
    if (c[f] === null || c[f] === undefined) {
      nullCounts[f]++;
      warn("FIELD_NULL", "INFO", `${c.name}(${c.id})`, `${f} is null`);
    }
  }
}
console.log("\n--- Null value counts per field ---");
for (const [f, cnt] of Object.entries(nullCounts).filter(([,v])=>v>0)) {
  console.log(`  ${f}: ${cnt} nulls`);
}

// 2. Cost ratio check (budget/moderate should be 60-75%)
console.log("\n--- Cost ratio violations (expected 60-75%) ---");
let costViolations = 0;
for (const c of cities) {
  if (c.costModerate > 0 && c.costBudget > 0) {
    const ratio = c.costBudget / c.costModerate;
    if (ratio < 0.35 || ratio > 0.80) {
      warn("COST_RATIO", "HIGH", `${c.name}(${c.id})`, `budget/moderate = ${(ratio*100).toFixed(1)}% (mod=${c.costModerate}, bud=${c.costBudget})`);
      costViolations++;
    } else if (ratio < 0.55 || ratio > 0.76) {
      warn("COST_RATIO", "MEDIUM", `${c.name}(${c.id})`, `budget/moderate = ${(ratio*100).toFixed(1)}%`);
      costViolations++;
    }
  }
}
console.log(`  Total cost ratio violations: ${costViolations}`);

// 3. Income consistency: averageIncome vs profession median
console.log("\n--- Income vs profession median mismatches ---");
let incomeIssues = 0;
for (const c of cities) {
  const profs = Object.values(c.professions);
  if (profs.length > 0) {
    const sorted = [...profs].sort((a,b)=>a-b);
    const median = sorted[Math.floor(sorted.length/2)];
    const ratio = c.averageIncome / median;
    if (ratio < 0.3 || ratio > 2.5) {
      warn("INCOME_MISMATCH", "HIGH", `${c.name}(${c.id})`, `avg=${c.averageIncome}, profMedian=${median}, ratio=${ratio.toFixed(2)}`);
      incomeIssues++;
    } else if (ratio < 0.5 || ratio > 1.8) {
      warn("INCOME_MISMATCH", "MEDIUM", `${c.name}(${c.id})`, `avg=${c.averageIncome}, profMedian=${median}, ratio=${ratio.toFixed(2)}`);
      incomeIssues++;
    }
  }
}
console.log(`  Total income mismatches: ${incomeIssues}`);

// 4. Profession count check
console.log("\n--- Profession count check ---");
let profIssues = 0;
const expectedProfCount = 26;
for (const c of cities) {
  const cnt = Object.keys(c.professions).length;
  if (cnt !== expectedProfCount) {
    warn("PROF_COUNT", "HIGH", `${c.name}(${c.id})`, `has ${cnt} professions (expected ${expectedProfCount})`);
    profIssues++;
  }
}
console.log(`  Cities with wrong profession count: ${profIssues}`);

// 5. Profession key consistency
const allProfKeys = new Set();
for (const c of cities) Object.keys(c.professions).forEach(k => allProfKeys.add(k));
console.log(`  Unique profession keys across all cities: ${allProfKeys.size}`);
if (allProfKeys.size !== expectedProfCount) {
  warn("PROF_KEYS", "HIGH", "GLOBAL", `Expected ${expectedProfCount} unique keys, got ${allProfKeys.size}`);
  // Find inconsistencies
  for (const c of cities) {
    for (const k of allProfKeys) {
      if (!(k in c.professions)) {
        warn("PROF_MISSING_KEY", "HIGH", `${c.name}(${c.id})`, `missing profession: ${k}`);
      }
    }
  }
}

// 6. Range checks for index values (0-100)
console.log("\n--- Index range validation (0-100) ---");
const indexFields = ["safetyIndex", "healthcareIndex", "freedomIndex", "numbeoSafetyIndex", "homicideRateInv", "gpiScoreInv", "gallupLawOrder", "uhcCoverageIndex"];
for (const f of indexFields) {
  for (const c of cities) {
    const v = c[f];
    if (v !== null && v !== undefined && (v < 0 || v > 100)) {
      warn("INDEX_RANGE", "HIGH", `${c.name}(${c.id})`, `${f}=${v} out of [0,100]`);
    }
  }
}

// 7. Climate data integrity
console.log("\n--- Climate data checks ---");
let climateIssues = 0;
for (const c of cities) {
  const cl = c.climate;
  if (!cl) { warn("CLIMATE_MISSING", "HIGH", `${c.name}(${c.id})`, "no climate data"); continue; }
  
  // avgTemp should be between winter and summer
  if (cl.avgTempC < cl.winterAvgC - 3 || cl.avgTempC > cl.summerAvgC + 3) {
    warn("CLIMATE_TEMP", "MEDIUM", `${c.name}(${c.id})`, `avgTemp=${cl.avgTempC} not between winter=${cl.winterAvgC} and summer=${cl.summerAvgC}`);
    climateIssues++;
  }
  
  // Monthly rain sum vs annual
  if (cl.monthlyRainMm && cl.monthlyRainMm.length === 12) {
    const monthSum = cl.monthlyRainMm.reduce((a,b)=>a+b, 0);
    const diff = Math.abs(monthSum - cl.annualRainMm);
    if (diff > cl.annualRainMm * 0.15) {
      warn("CLIMATE_RAIN", "HIGH", `${c.name}(${c.id})`, `monthlySum=${monthSum.toFixed(0)} vs annual=${cl.annualRainMm} (diff=${diff.toFixed(0)})`);
      climateIssues++;
    }
  }
  
  // Monthly temp consistency
  if (cl.monthlyHighC && cl.monthlyLowC && cl.monthlyHighC.length === 12 && cl.monthlyLowC.length === 12) {
    for (let m = 0; m < 12; m++) {
      if (cl.monthlyHighC[m] < cl.monthlyLowC[m]) {
        warn("CLIMATE_MONTHLY", "HIGH", `${c.name}(${c.id})`, `month ${m+1}: high=${cl.monthlyHighC[m]} < low=${cl.monthlyLowC[m]}`);
        climateIssues++;
      }
    }
  }
}
console.log(`  Climate data issues: ${climateIssues}`);

// 8. Housing data consistency
console.log("\n--- Housing data checks ---");
let housingIssues = 0;
for (const c of cities) {
  // Extreme house prices
  if (c.housePrice !== null) {
    if (c.housePrice < 200) {
      warn("HOUSING_LOW", "HIGH", `${c.name}(${c.id})`, `housePrice=${c.housePrice} USD/m² (suspiciously low)`);
      housingIssues++;
    }
    if (c.housePrice > 30000) {
      warn("HOUSING_HIGH", "HIGH", `${c.name}(${c.id})`, `housePrice=${c.housePrice} USD/m² (suspiciously high)`);
      housingIssues++;
    }
  }
  // Extreme rents
  if (c.monthlyRent !== null) {
    if (c.monthlyRent < 50) {
      warn("RENT_LOW", "HIGH", `${c.name}(${c.id})`, `monthlyRent=${c.monthlyRent} USD (suspiciously low)`);
      housingIssues++;
    }
    if (c.monthlyRent > 5000) {
      warn("RENT_HIGH", "MEDIUM", `${c.name}(${c.id})`, `monthlyRent=${c.monthlyRent} USD (very high)`);
      housingIssues++;
    }
  }
}
console.log(`  Housing issues: ${housingIssues}`);

// 9. Work data checks
console.log("\n--- Work data checks ---");
for (const c of cities) {
  if (c.annualWorkHours !== null) {
    if (c.annualWorkHours < 1200 || c.annualWorkHours > 2800) {
      warn("WORK_HOURS", "MEDIUM", `${c.name}(${c.id})`, `annualWorkHours=${c.annualWorkHours} (typical 1400-2500)`);
    }
  }
  if (c.paidLeaveDays !== null) {
    if (c.paidLeaveDays < 0 || c.paidLeaveDays > 45) {
      warn("PAID_LEAVE", "MEDIUM", `${c.name}(${c.id})`, `paidLeaveDays=${c.paidLeaveDays} (typical 0-40)`);
    }
  }
}

// 10. Duplicate salary detection (copy-paste detection)
console.log("\n--- Salary copy-paste detection ---");
const salaryFingerprints = new Map();
for (const c of cities) {
  const fp = Object.values(c.professions).sort().join(",");
  if (!salaryFingerprints.has(fp)) salaryFingerprints.set(fp, []);
  salaryFingerprints.get(fp).push(`${c.name}(${c.id})`);
}
for (const [fp, cityList] of salaryFingerprints) {
  if (cityList.length > 1) {
    warn("SALARY_DUPLICATE", "HIGH", cityList.join(", "), `identical salary profiles (${cityList.length} cities share exact same values)`);
  }
}

// 11. Exchange rate coverage
console.log("\n--- Exchange rate coverage ---");
const rateCurrencies = new Set(Object.keys(rates.rates));
const cityCurrencies = new Set(cities.map(c => c.currency));
for (const cur of cityCurrencies) {
  if (!rateCurrencies.has(cur) && cur !== "USD") {
    warn("RATE_MISSING", "HIGH", "GLOBAL", `Currency ${cur} used by cities but missing from exchange-rates.json`);
  }
}

// Summary
console.log("\n\n========== FINDING SUMMARY ==========");
const bySeverity = { HIGH: 0, MEDIUM: 0, INFO: 0 };
const byCategory = {};
for (const f of findings) {
  bySeverity[f.severity] = (bySeverity[f.severity] || 0) + 1;
  byCategory[f.category] = (byCategory[f.category] || 0) + 1;
}
console.log("By severity:", bySeverity);
console.log("By category:", byCategory);
console.log(`\nTotal findings: ${findings.length}`);

// Write to file
import { writeFileSync } from "fs";
writeFileSync(
  join(ROOT, "_audit", "01-results.json"), 
  JSON.stringify({ summary: { bySeverity, byCategory, total: findings.length }, findings }, null, 2)
);
console.log("Results written to _audit/01-results.json");
