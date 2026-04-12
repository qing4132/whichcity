#!/usr/bin/env node
/**
 * merge-new-indicators.mjs
 * 
 * Merges 6 new indicators into cities.json, recomputes composite indices.
 * 
 * New indicators:
 *   Safety:      + wpsIndex           (Georgetown WPS Index 2025/26, 0-1)
 *   Healthcare:  + outOfPocketPct     (World Bank SH.XPD.OOPC.CH.ZS 2021, %)
 *   Governance:  mipexScore           (MIPEX 2019, 0-100)
 *                wjpRuleLaw           (WJP Rule of Law Index 2025, 0-1)
 *                corruptionPerceptionIndex (kept from existing, 0-100)
 *                govEffectiveness     (WGI Government Effectiveness 2024, 0-100 percentile)
 *                internetFreedomScore (Freedom House Freedom on the Net 2024, 0-100)
 * 
 * Sources — all real, public, traceable:
 *   - WPS:  https://giwps.georgetown.edu/the-index/ (Excel download)
 *   - OOP:  World Bank API indicator SH.XPD.OOPC.CH.ZS
 *   - WJP:  https://worldjusticeproject.org/rule-of-law-index/global/2025 (CSV data)
 *   - FOTN: https://freedomhouse.org/countries/freedom-net/scores
 *   - MIPEX: https://www.mipex.eu/play/
 *   - WGI:  World Bank WGI dataset (Excel), https://www.worldbank.org/en/publication/worldwide-governance-indicators
 */

import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const CITIES_PATH = join(ROOT, "public/data/cities.json");

// ── Country name (zh) → ISO3 mapping ──────────────────────
const COUNTRY_TO_ISO3 = {
  "美国": "USA", "英国": "GBR", "日本": "JPN", "中国": "CHN", "澳大利亚": "AUS",
  "新加坡": "SGP", "法国": "FRA", "加拿大": "CAN", "中国香港": "HKG", "荷兰": "NLD",
  "瑞士": "CHE", "德国": "DEU", "西班牙": "ESP", "意大利": "ITA", "比利时": "BEL",
  "奥地利": "AUT", "捷克": "CZE", "波兰": "POL", "葡萄牙": "PRT", "希腊": "GRC",
  "土耳其": "TUR", "墨西哥": "MEX", "巴西": "BRA", "泰国": "THA", "马来西亚": "MYS",
  "越南": "VNM", "印度": "IND", "肯尼亚": "KEN", "埃及": "EGY", "伊朗": "IRN",
  "巴基斯坦": "PAK", "印度尼西亚": "IDN", "菲律宾": "PHL", "韩国": "KOR", "台湾": "TWN",
  "阿根廷": "ARG", "智利": "CHL", "哥伦比亚": "COL", "秘鲁": "PER", "南非": "ZAF",
  "阿联酋": "ARE", "卡塔尔": "QAT", "巴林": "BHR", "沙特阿拉伯": "SAU", "阿曼": "OMN",
  "黎巴嫩": "LBN", "约旦": "JOR", "以色列": "ISR", "乌克兰": "UKR", "罗马尼亚": "ROU",
  "保加利亚": "BGR", "克罗地亚": "HRV", "塞尔维亚": "SRB", "匈牙利": "HUN", "斯洛伐克": "SVK",
  "斯洛文尼亚": "SVN", "爱尔兰": "IRL", "哥斯达黎加": "CRI", "巴拿马": "PAN", "波多黎各": "PRI",
  "柬埔寨": "KHM", "缅甸": "MMR", "孟加拉国": "BGD", "斯里兰卡": "LKA", "尼泊尔": "NPL",
  "哈萨克斯坦": "KAZ", "乌兹别克斯坦": "UZB", "阿塞拜疆": "AZE", "蒙古": "MNG",
  "瑞典": "SWE", "丹麦": "DNK", "芬兰": "FIN", "挪威": "NOR",
  "爱沙尼亚": "EST", "卢森堡": "LUX", "俄罗斯": "RUS", "尼日利亚": "NGA",
  "格鲁吉亚": "GEO", "乌拉圭": "URY", "新西兰": "NZL", "冰岛": "ISL",
};

// ── 1. WPS Index (Georgetown 2025/26, 0–1 scale, 181 countries) ──
// Source: https://giwps.georgetown.edu/wp-content/uploads/2025/10/WPS-Index-2025-Data.xlsx
const WPS = {
  USA: 0.840, CHN: 0.685, HKG: 0.809, JPN: 0.866, KOR: 0.815,
  GBR: 0.864, FRA: 0.864, DEU: 0.869, CAN: 0.885, AUS: 0.896,
  IND: 0.607, BRA: 0.632, MEX: 0.558, RUS: 0.718, SGP: 0.884,
  ITA: 0.811, ESP: 0.862, NLD: 0.905, CHE: 0.877, SWE: 0.924,
  NOR: 0.924, DNK: 0.939, FIN: 0.921, AUT: 0.898, BEL: 0.912,
  IRL: 0.891, PRT: 0.861, GRC: 0.752, POL: 0.854, CZE: 0.832,
  HUN: 0.832, ROU: 0.801, BGR: 0.814, HRV: 0.788, SRB: 0.844,
  SVK: 0.797, SVN: 0.889, EST: 0.896, LUX: 0.918, TUR: 0.664,
  ISR: 0.697, ARE: 0.872, QAT: 0.723, SAU: 0.739, BHR: 0.765,
  OMN: 0.755, JOR: 0.686, EGY: 0.617, ZAF: 0.648, KEN: 0.542,
  NGA: 0.495, NZL: 0.898, THA: 0.761, VNM: 0.721, MYS: 0.738,
  IDN: 0.678, PHL: 0.607, KHM: 0.667, MMR: 0.442, BGD: 0.526,
  PAK: 0.462, LKA: 0.706, NPL: 0.631, MNG: 0.799, KAZ: 0.722,
  UZB: 0.674, GEO: 0.798, AZE: 0.653, IRN: 0.608, UKR: 0.645,
  CHL: 0.739, ARG: 0.791, COL: 0.551, PER: 0.701, URY: 0.822,
  CRI: 0.824, PAN: 0.696, PRI: 0.707, LBN: 0.575, ISL: 0.932,
  TWN: null,  // Not covered by WPS Index
};

// ── 2. Out-of-Pocket Health Expenditure (% of current health expenditure) ──
// Source: World Bank API, indicator SH.XPD.OOPC.CH.ZS, most recent year (2021)
const OOP = {
  USA: 10.93, CHN: 32.17, HKG: null, JPN: 12.24, KOR: 31.75,
  GBR: 14.63, FRA: 9.26, DEU: 11.05, CAN: 15.20, AUS: 15.85,
  IND: 43.89, BRA: 26.23, MEX: 41.24, RUS: 27.10, SGP: 25.42,
  ITA: 21.43, ESP: 19.45, NLD: 10.28, CHE: 24.50, SWE: 13.45,
  NOR: 14.04, DNK: 13.57, FIN: 16.06, AUT: 17.12, BEL: 17.60,
  IRL: 13.12, PRT: 27.74, GRC: 35.44, POL: 20.25, CZE: 14.00,
  HUN: 31.30, ROU: 20.70, BGR: 37.33, HRV: 12.46, SRB: 36.67,
  SVK: 19.25, SVN: 11.27, EST: 17.05, LUX: 9.75, TUR: 17.59,
  ISR: 21.36, ARE: 14.50, QAT: 7.08, SAU: 16.22, BHR: 17.79,
  OMN: 7.93, JOR: 24.99, EGY: 53.87, ZAF: 6.65, KEN: 23.62,
  NGA: 70.59, NZL: 12.69, THA: 11.11, VNM: 40.47, MYS: 32.91,
  IDN: 29.11, PHL: 43.70, KHM: 56.91, MMR: 68.71, BGD: 67.53,
  PAK: 55.02, LKA: 42.42, NPL: 50.70, MNG: 28.57, KAZ: 28.22,
  UZB: 46.50, GEO: 43.06, AZE: 21.08, IRN: 37.57, UKR: 45.24,
  CHL: 32.72, ARG: 28.02, COL: 16.71, PER: 21.68, URY: 16.49,
  CRI: 22.18, PAN: 29.73, PRI: null, LBN: 37.77,
  TWN: null,  // Not in World Bank
};

// ── 3. WJP Rule of Law Index (2025, 0–1 scale, 143 countries) ──
// Source: https://worldjusticeproject.org/rule-of-law-index/global/2025 (CSV data endpoint)
const WJP = {
  USA: 0.68, CHN: 0.48, HKG: 0.72, JPN: 0.78, KOR: 0.74,
  GBR: 0.78, FRA: 0.72, DEU: 0.83, CAN: 0.79, AUS: 0.80,
  IND: 0.49, BRA: 0.50, MEX: 0.40, RUS: 0.41, SGP: 0.78,
  ITA: 0.66, ESP: 0.71, NLD: 0.82, CHE: null, SWE: 0.85,
  NOR: 0.89, DNK: 0.90, FIN: 0.87, AUT: 0.79, BEL: 0.78,
  IRL: 0.82, PRT: 0.67, GRC: 0.60, POL: 0.66, CZE: 0.74,
  HUN: 0.50, ROU: 0.61, BGR: 0.55, HRV: 0.61, SRB: 0.47,
  SVK: 0.64, SVN: 0.68, EST: 0.82, LUX: 0.83, TUR: 0.41,
  ISR: null, ARE: 0.64, QAT: 0.62, SAU: null, BHR: null,
  OMN: null, JOR: 0.55, EGY: 0.35, ZAF: 0.56, KEN: 0.45,
  NGA: 0.41, NZL: 0.83, THA: 0.50, VNM: 0.50, MYS: 0.57,
  IDN: 0.52, PHL: 0.46, KHM: 0.31, MMR: 0.34, BGD: 0.39,
  PAK: 0.37, LKA: 0.51, NPL: 0.52, MNG: 0.53, KAZ: 0.54,
  UZB: 0.50, GEO: 0.58, AZE: null, IRN: 0.38, UKR: 0.48,
  CHL: 0.66, ARG: 0.54, COL: 0.47, PER: 0.48, URY: 0.72,
  CRI: 0.68, PAN: 0.52, PRI: null, LBN: 0.44,
  TWN: null,  // Not covered by WJP
};

// ── 4. Freedom on the Net (Freedom House 2024, 0–100) ──
// Source: https://freedomhouse.org/countries/freedom-net/scores
// Higher = more free. Countries not assessed are null.
const FOTN = {
  USA: 73, CHN: 9, HKG: null, JPN: 78, KOR: 65,
  GBR: 76, FRA: 76, DEU: 74, CAN: 85, AUS: 75,
  IND: 51, BRA: 65, MEX: 61, RUS: 17, SGP: 53,
  ITA: 74, ESP: null, NLD: 84, CHE: null, SWE: null,
  NOR: null, DNK: null, FIN: null, AUT: null, BEL: null,
  IRL: null, PRT: null, GRC: null, POL: null, CZE: null,
  HUN: 69, ROU: null, BGR: null, HRV: null, SRB: 67,
  SVK: null, SVN: null, EST: 91, LUX: null, TUR: 31,
  ISR: null, ARE: 28, QAT: null, SAU: 25, BHR: 30,
  OMN: null, JOR: 47, EGY: 28, ZAF: 73, KEN: 58,
  NGA: 59, NZL: null, THA: 39, VNM: 22, MYS: 60,
  IDN: 48, PHL: 61, KHM: 42, MMR: 9, BGD: 45,
  PAK: 27, LKA: 53, NPL: null, MNG: null, KAZ: 37,
  UZB: 29, GEO: 70, AZE: 34, IRN: 13, UKR: 62,
  CHL: 87, ARG: 71, COL: 64, PER: null, URY: null,
  CRI: 86, PAN: null, PRI: null, LBN: 50,
  TWN: 79,
};

// ── 5. MIPEX (Migrant Integration Policy Index, 2019 edition, 0–100) ──
// Source: https://www.mipex.eu/play/
const MIPEX = {
  USA: 73, CHN: 32, HKG: null, JPN: 47, KOR: 56,
  GBR: 56, FRA: 56, DEU: 58, CAN: 79, AUS: 65,
  IND: 24, BRA: 64, MEX: 51, RUS: 31, SGP: null,
  ITA: 58, ESP: 60, NLD: 57, CHE: 50, SWE: 86,
  NOR: 69, DNK: 49, FIN: 85, AUT: 46, BEL: 69,
  IRL: 64, PRT: 81, GRC: 47, POL: 41, CZE: 49,
  HUN: 43, ROU: 49, BGR: 39, HRV: 39, SRB: 50,
  SVK: 39, SVN: 48, EST: 50, LUX: 62, TUR: 43,
  ISR: 49, ARE: 29, QAT: null, SAU: 10, BHR: null,
  OMN: null, JOR: 21, EGY: null, ZAF: 48, KEN: null,
  NGA: null, NZL: 77, THA: null, VNM: null, MYS: null,
  IDN: 26, PHL: null, KHM: null, MMR: null, BGD: null,
  PAK: null, LKA: null, NPL: null, MNG: null, KAZ: null,
  UZB: null, GEO: null, AZE: null, IRN: null, UKR: 48,
  CHL: 53, ARG: 58, COL: null, PER: null, URY: null,
  CRI: null, PAN: null, PRI: null, LBN: null,
  TWN: null,
};

// ── 6. WGI Government Effectiveness (World Bank 2024, 0–100 percentile rank) ──
// Source: World Bank WGI dataset (Excel), sheet "ge", column "Governance score (0-100)"
const GE = {
  USA: 77.8, CHN: 68.8, HKG: 83.2, JPN: 91.9, KOR: 80.2,
  GBR: 74.4, FRA: 74.7, DEU: 81.4, CAN: 85.5, AUS: 86.5,
  IND: 59.2, BRA: 47.0, MEX: 47.1, RUS: 45.1, SGP: 95.7,
  ITA: 66.7, ESP: 72.9, NLD: 85.4, CHE: 87.1, SWE: 85.8,
  NOR: 87.2, DNK: 88.5, FIN: 86.7, AUT: 80.8, BEL: 74.6,
  IRL: 82.7, PRT: 69.8, GRC: 55.1, POL: 64.4, CZE: 74.2,
  HUN: 61.1, ROU: 59.5, BGR: 52.2, HRV: 65.1, SRB: 53.3,
  SVK: 64.1, SVN: 72.5, EST: 76.6, LUX: 91.0, TUR: 50.0,
  ISR: 74.1, ARE: 75.8, QAT: 73.4, SAU: 66.6, BHR: 63.0,
  OMN: 62.4, JOR: 55.5, EGY: 49.5, ZAF: 46.9, KEN: 45.5,
  NGA: 31.8, NZL: 87.3, THA: 56.3, VNM: 49.5, MYS: 69.1,
  IDN: 54.8, PHL: 54.2, KHM: 45.6, MMR: 21.0, BGD: 39.3,
  PAK: 39.7, LKA: 46.0, NPL: 34.1, MNG: 43.8, KAZ: 54.2,
  UZB: 48.5, GEO: 60.2, AZE: 54.6, IRN: 37.6, UKR: 39.7,
  CHL: 70.1, ARG: 54.9, COL: 49.2, PER: 47.4, URY: 64.8,
  CRI: 56.9, PAN: 56.1, PRI: 46.4, LBN: 29.4,
  TWN: null,  // Not in WGI
};

// ══════════════════════════════════════════════════════════════
//  Helper: anchored normalization (same approach used throughout codebase)
// ══════════════════════════════════════════════════════════════
function anchoredNorm(value, min, max) {
  if (value == null) return null;
  return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
}

function weightedAvg(subs) {
  // subs: [{val, weight}, ...]
  const available = subs.filter(s => s.val != null);
  if (available.length === 0) return { value: null, confidence: "low", count: 0 };
  const totalWeight = available.reduce((sum, s) => sum + s.weight, 0);
  const value = available.reduce((sum, s) => sum + (s.val * s.weight / totalWeight), 0);
  const count = available.length;
  const total = subs.length;
  const confidence = count >= total ? "high" : count >= total - 1 ? "medium" : "low";
  return { value: Math.round(value * 10) / 10, confidence, count };
}

// ══════════════════════════════════════════════════════════════
//  Main
// ══════════════════════════════════════════════════════════════
const data = JSON.parse(readFileSync(CITIES_PATH, "utf-8"));
const cities = data.cities;

console.log(`Loaded ${cities.length} cities from cities.json`);

// ── Phase 1: Add raw new indicator fields ──────────────────
let stats = { wps: 0, oop: 0, wjp: 0, fotn: 0, mipex: 0, ge: 0 };

for (const city of cities) {
  const iso3 = COUNTRY_TO_ISO3[city.country];
  if (!iso3) {
    console.warn(`  ⚠ No ISO3 mapping for country: ${city.country}`);
    continue;
  }

  // WPS Index (0-1)
  const wps = WPS[iso3] ?? null;
  city.wpsIndex = wps;
  if (wps != null) stats.wps++;

  // Out-of-pocket health % (lower = better)
  const oop = OOP[iso3] ?? null;
  city.outOfPocketPct = oop;
  if (oop != null) stats.oop++;

  // WJP Rule of Law (0-1)
  const wjp = WJP[iso3] ?? null;
  city.wjpRuleLaw = wjp;
  if (wjp != null) stats.wjp++;

  // Freedom on the Net (0-100, higher=more free)
  const fotn = FOTN[iso3] ?? null;
  city.internetFreedomScore = fotn;
  if (fotn != null) stats.fotn++;

  // MIPEX (0-100)
  const mipex = MIPEX[iso3] ?? null;
  city.mipexScore = mipex;
  if (mipex != null) stats.mipex++;

  // WGI Government Effectiveness (0-100 percentile)
  const ge = GE[iso3] ?? null;
  city.govEffectiveness = ge;
  if (ge != null) stats.ge++;
}

console.log("\n── New indicator coverage ──");
console.log(`  WPS Index:            ${stats.wps}/${cities.length}`);
console.log(`  Out-of-pocket %:      ${stats.oop}/${cities.length}`);
console.log(`  WJP Rule of Law:      ${stats.wjp}/${cities.length}`);
console.log(`  Internet Freedom:     ${stats.fotn}/${cities.length}`);
console.log(`  MIPEX:                ${stats.mipex}/${cities.length}`);
console.log(`  Gov Effectiveness:    ${stats.ge}/${cities.length}`);

// ── Phase 2: Compute normalization anchors ──────────────────
// For healthcare sub-indicators that need normalization
const allDoctors = cities.map(c => c.doctorsPerThousand).filter(v => v != null);
const allBeds = cities.map(c => c.hospitalBedsPerThousand).filter(v => v != null);
const allLife = cities.map(c => c.lifeExpectancy).filter(v => v != null);
const allOOP = cities.map(c => c.outOfPocketPct).filter(v => v != null);

const doctorsMin = 0, doctorsMax = Math.max(...allDoctors);
const bedsMin = 0, bedsMax = Math.max(...allBeds);
const lifeMin = Math.min(...allLife), lifeMax = Math.max(...allLife);
const oopMin = Math.min(...allOOP), oopMax = Math.max(...allOOP);

console.log(`\n── Normalization anchors ──`);
console.log(`  Doctors: [${doctorsMin}, ${doctorsMax}]`);
console.log(`  Beds:    [${bedsMin}, ${bedsMax}]`);
console.log(`  Life:    [${lifeMin}, ${lifeMax}]`);
console.log(`  OOP:     [${oopMin}, ${oopMax}] (inverted: lower=better)`);

// ── Phase 3: Recompute composite indices ──────────────────
// New formulas (all 5 subs per composite):
//
// SAFETY (5 subs, all 0-100):
//   30% Numbeo + 25% HomicideInv + 20% GPI inv + 15% Gallup + 10% WPS*100
//
// HEALTHCARE (5 subs, normalized to 0-100):
//   25% Doctors(norm) + 20% Beds(norm) + 25% UHC + 15% LifeExp(norm) + 15% OOP_inv(norm)
//
// GOVERNANCE (5 subs, all scaled to 0-100):
//   25% CPI + 25% GovEffectiveness + 20% WJP*100 + 15% InternetFreedom + 15% MIPEX

let safetyChanges = 0, healthChanges = 0, govChanges = 0;

for (const city of cities) {
  // ── Safety Index ──
  const wpsNorm = city.wpsIndex != null ? city.wpsIndex * 100 : null;
  const safetySubs = [
    { val: city.numbeoSafetyIndex, weight: 0.30 },
    { val: city.homicideRateInv,   weight: 0.25 },
    { val: city.gpiScoreInv,       weight: 0.20 },
    { val: city.gallupLawOrder,    weight: 0.15 },
    { val: wpsNorm,                weight: 0.10 },
  ];
  const oldSafety = city.safetyIndex;
  const safety = weightedAvg(safetySubs);
  city.safetyIndex = safety.value;
  city.safetyConfidence = safety.confidence;
  if (Math.abs((oldSafety || 0) - (safety.value || 0)) > 1) safetyChanges++;

  // ── Healthcare Index ──
  const doctorsNorm = anchoredNorm(city.doctorsPerThousand, doctorsMin, doctorsMax);
  const bedsNorm = anchoredNorm(city.hospitalBedsPerThousand, bedsMin, bedsMax);
  const lifeNorm = anchoredNorm(city.lifeExpectancy, lifeMin, lifeMax);
  // OOP: invert (lower % = better healthcare)
  const oopInv = city.outOfPocketPct != null
    ? 100 - anchoredNorm(city.outOfPocketPct, oopMin, oopMax)
    : null;

  const healthSubs = [
    { val: doctorsNorm,        weight: 0.25 },
    { val: bedsNorm,           weight: 0.20 },
    { val: city.uhcCoverageIndex, weight: 0.25 },
    { val: lifeNorm,           weight: 0.15 },
    { val: oopInv,             weight: 0.15 },
  ];
  const oldHealth = city.healthcareIndex;
  const health = weightedAvg(healthSubs);
  city.healthcareIndex = health.value;
  city.healthcareConfidence = health.confidence;
  if (Math.abs((oldHealth || 0) - (health.value || 0)) > 1) healthChanges++;

  // ── Governance Index (replaces old freedomIndex) ──
  const wjpNorm = city.wjpRuleLaw != null ? city.wjpRuleLaw * 100 : null;
  const govSubs = [
    { val: city.corruptionPerceptionIndex, weight: 0.25 },
    { val: city.govEffectiveness,          weight: 0.25 },
    { val: wjpNorm,                        weight: 0.20 },
    { val: city.internetFreedomScore,      weight: 0.15 },
    { val: city.mipexScore,                weight: 0.15 },
  ];
  const oldFreedom = city.freedomIndex;
  const gov = weightedAvg(govSubs);
  city.governanceIndex = gov.value;
  city.governanceConfidence = gov.confidence;
  if (Math.abs((oldFreedom || 0) - (gov.value || 0)) > 1) govChanges++;

  // Keep old freedom fields temporarily for backwards compat
  // city.freedomIndex and city.freedomConfidence will be updated in types
}

console.log(`\n── Composite index recomputation ──`);
console.log(`  Safety:     ${safetyChanges} cities changed by >1pt`);
console.log(`  Healthcare: ${healthChanges} cities changed by >1pt`);
console.log(`  Governance: ${govChanges} cities changed by >1pt (vs old freedom)`);

// ── Phase 4: Sanity checks ──────────────────
console.log(`\n── Sanity checks (top/bottom 5) ──`);
const sorted = (key) =>
  [...cities].filter(c => c[key] != null).sort((a, b) => b[key] - a[key]);

const showTopBottom = (key, label) => {
  const s = sorted(key);
  console.log(`  ${label}:`);
  console.log(`    Top:    ${s.slice(0, 5).map(c => `${c.name}(${c[key]})`).join(", ")}`);
  console.log(`    Bottom: ${s.slice(-5).map(c => `${c.name}(${c[key]})`).join(", ")}`);
};

showTopBottom("safetyIndex", "Safety");
showTopBottom("healthcareIndex", "Healthcare");
showTopBottom("governanceIndex", "Governance");

// ── Phase 5: Write updated cities.json ──────────────────
writeFileSync(CITIES_PATH, JSON.stringify(data, null, 2) + "\n", "utf-8");
console.log(`\n✅ Wrote updated cities.json (${cities.length} cities)`);
