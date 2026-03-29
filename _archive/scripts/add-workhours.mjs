#!/usr/bin/env node
/**
 * Add annualWorkHours to each city in cities.json.
 *
 * Data is at the COUNTRY level (same value for all cities in a country).
 * Values represent actual average annual hours worked per employed person.
 *
 * Data sources:
 *   - OECD Employment Outlook 2024 (actual hours worked)
 *   - ILO ILOSTAT database (countries not in OECD)
 *   - National statistics bureaus (supplementary)
 *
 * Note: These are national averages across ALL industries and occupations.
 * Individual profession hours may differ significantly.
 */
import { readFileSync, writeFileSync } from "fs";

// Country name (as used in cities.json) → annual work hours
const WORK_HOURS_BY_COUNTRY = {
  "美国": 1811,          // OECD 2024
  "英国": 1532,          // OECD
  "日本": 1607,          // OECD
  "中国": 2170,          // ILO estimate; 996 culture pushes actual higher
  "中国香港": 2080,      // Census & Statistics Dept HK
  "中国台湾": 2008,      // ROC Ministry of Labor
  "韩国": 1901,          // OECD
  "新加坡": 2238,        // MOM Singapore
  "澳大利亚": 1694,     // OECD
  "新西兰": 1752,        // OECD
  "加拿大": 1686,        // OECD
  "法国": 1511,          // OECD
  "德国": 1341,          // OECD — lowest among major economies
  "瑞士": 1533,          // OECD
  "荷兰": 1417,          // OECD — high part-time rate
  "比利时": 1577,        // OECD
  "奥地利": 1442,        // OECD
  "意大利": 1669,        // OECD
  "西班牙": 1644,        // OECD
  "葡萄牙": 1649,        // OECD
  "希腊": 1886,          // OECD
  "爱尔兰": 1656,        // OECD
  "捷克": 1766,          // OECD
  "波兰": 1803,          // OECD
  "匈牙利": 1805,        // OECD
  "斯洛伐克": 1700,      // OECD
  "斯洛文尼亚": 1624,    // OECD
  "克罗地亚": 1715,      // Eurostat
  "罗马尼亚": 1838,      // Eurostat
  "保加利亚": 1754,      // Eurostat
  "塞尔维亚": 1780,      // ILO
  "土耳其": 1855,        // OECD
  "以色列": 1898,        // OECD
  "阿联酋": 2200,        // ILO estimate; 6-day work week common
  "卡塔尔": 2200,        // ILO estimate
  "巴林": 2150,          // ILO estimate
  "沙特阿拉伯": 2100,   // ILO; shifting with Vision 2030
  "阿曼": 2100,          // ILO estimate
  "印度": 2117,          // ILO; large informal sector
  "印度尼西亚": 1950,   // BPS Indonesia
  "泰国": 2024,          // NSO Thailand
  "马来西亚": 2028,      // DOSM Malaysia
  "越南": 2060,          // GSO Vietnam
  "菲律宾": 2000,        // PSA Philippines
  "柬埔寨": 2100,        // ILO estimate
  "缅甸": 2100,          // ILO estimate
  "老挝": 2050,          // ILO estimate
  "孟加拉国": 2200,      // ILO; garment sector long hours
  "巴基斯坦": 2150,      // ILO
  "斯里兰卡": 1980,      // Census Sri Lanka
  "尼泊尔": 2050,        // ILO estimate
  "墨西哥": 2128,        // OECD — one of the highest
  "巴西": 1776,          // ILO / IBGE
  "阿根廷": 1820,        // ILO / INDEC
  "智利": 1916,          // OECD
  "哥伦比亚": 1964,      // OECD
  "秘鲁": 2000,          // ILO estimate
  "委内瑞拉": 1800,      // ILO estimate; economic crisis distorts data
  "哥斯达黎加": 2026,    // OECD
  "巴拿马": 1960,        // ILO
  "波多黎各": 1811,      // Uses US federal labor standards
  "牙买加": 1920,        // ILO estimate
  "古巴": 1780,          // ILO estimate; state employment
  "南非": 1856,          // ILO
  "肯尼亚": 2100,        // ILO estimate
  "埃及": 2070,          // CAPMAS Egypt
  "伊朗": 2024,          // ILO estimate
  "约旦": 2050,          // ILO
  "黎巴嫩": 1950,        // ILO estimate
  "乌克兰": 1750,        // ILO; conflict distorts recent data
  "蒙古": 1980,          // NSO Mongolia
  "哈萨克斯坦": 1900,    // ILO
  "乌兹别克斯坦": 1950,  // ILO estimate
  "阿塞拜疆": 1920,      // ILO
};

// ─── Apply to cities ──────────────────────────────────────────────
const path = "public/data/cities.json";
const data = JSON.parse(readFileSync(path, "utf8"));

let ok = 0;
let missing = [];
for (const city of data.cities) {
  const hours = WORK_HOURS_BY_COUNTRY[city.country];
  if (hours === undefined) {
    missing.push(`${city.id} ${city.name} (${city.country})`);
    continue;
  }
  city.annualWorkHours = hours;
  ok++;
}

if (missing.length) {
  console.error("Missing work hours data for:");
  missing.forEach(m => console.error("  " + m));
  process.exit(1);
}

console.log(`Added annualWorkHours for ${ok} cities`);

// Show range
const hours = data.cities.map(c => c.annualWorkHours);
const min = Math.min(...hours);
const max = Math.max(...hours);
const minCity = data.cities.find(c => c.annualWorkHours === min);
const maxCity = data.cities.find(c => c.annualWorkHours === max);
console.log(`  Range: ${min}h (${minCity.name}) — ${max}h (${maxCity.name})`);

// Samples
for (const name of ["New York", "Tokyo", "Berlin", "Singapore", "Mexico City"]) {
  const c = data.cities.find(c => c.name === name);
  if (c) console.log(`  ${c.name}: ${c.annualWorkHours}h`);
}

writeFileSync(path, JSON.stringify(data, null, 2) + "\n");
console.log("Written to", path);
