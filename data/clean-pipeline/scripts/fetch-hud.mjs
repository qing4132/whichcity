#!/usr/bin/env node
/**
 * fetch-hud.mjs — HUD FY2024 Fair Market Rents (Public Domain, US Federal).
 * Source: https://www.huduser.gov/portal/datasets/fmr.html
 *
 * We extract 1BR 40th-percentile FMR for the 19 US cities in our SOT,
 * using the primary urban county FIPS code for each metro.
 *
 * Output: data/clean-pipeline/sources/hud-fmr-2024.json
 */
import XLSX from "xlsx";
import { writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const XLSX_PATH = join(ROOT, "sources/hud-fmr-2024.xlsx");

// Download if missing
if (!existsSync(XLSX_PATH)) {
  console.log("Downloading HUD FMR 2024 revised...");
  execSync(`curl -sL -o "${XLSX_PATH}" "https://www.huduser.gov/portal/datasets/fmr/fmr2024/FMR2024_final_revised.xlsx"`);
}

// County FIPS (5-digit state+county) — primary urban county per metro
// Sources verified against US Census Bureau FIPS codes.
const CITY_TO_FIPS = {
  "纽约": "36061",        "洛杉矶": "06037",    "旧金山": "06075",
  "芝加哥": "17031",      "迈阿密": "12086",    "华盛顿": "11001",
  "波士顿": "25025",      "西雅图": "53033",    "丹佛": "08031",
  "奥斯汀": "48453",      "亚特兰大": "13121",  "凤凰城": "04013",
  "波特兰": "41051",      "圣地亚哥": "06073",  "拉斯维加斯": "32003",
  "坦帕": "12057",        "休斯顿": "48201",    "费城": "42101",
  "硅谷（圣何塞）": "06085",
};

const wb = XLSX.readFile(XLSX_PATH);
const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: null });

// Build fips5 → largest pop row map
const byFips5 = new Map();
for (const r of rows) {
  if (!r.fips) continue;
  const fips5 = String(r.fips).padStart(10, "0").slice(0, 5);
  const prev = byFips5.get(fips5);
  if (!prev || r.pop2020 > prev.pop2020) byFips5.set(fips5, r);
}

const out = {
  source: "HUD Fair Market Rents FY2024 Revised",
  license: "Public Domain (US Federal)",
  url: "https://www.huduser.gov/portal/datasets/fmr.html",
  file: "FMR2024_final_revised.xlsx",
  unit: "USD/month, 1BR 40th percentile FMR",
  retrievedAt: new Date().toISOString().slice(0, 10),
  cities: {},
};

for (const [city, fips] of Object.entries(CITY_TO_FIPS)) {
  const row = byFips5.get(fips);
  if (!row) { console.warn(`MISS ${city} (${fips})`); continue; }
  out.cities[city] = {
    fmr1BR: row.fmr_1, fmr2BR: row.fmr_2, studio: row.fmr_0,
    hudAreaName: row.hud_area_name, county: row.countyname, fips,
  };
}

const OUT = join(ROOT, "sources/hud-fmr-2024.json");
writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n");
console.log(`✓ ${OUT} — ${Object.keys(out.cities).length}/19 cities`);
for (const [k, v] of Object.entries(out.cities)) {
  console.log(`  ${k.padEnd(16)} 1BR=$${v.fmr1BR}  (${v.hudAreaName.slice(0, 50)})`);
}
