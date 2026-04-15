#!/usr/bin/env node
/**
 * extract-ilo-to-sot.mjs — Extract ILO CSV data into cities-source.json
 *
 * New fields:
 *   minimumWagePPP     — Monthly minimum wage (2021 PPP $)
 *   weeklyHoursEmp     — Mean weekly hours per employee (Sex=Total)
 *   earningsGini       — Gini index of hourly earnings (Sex=Total, 0-1)
 *   genderWageGap      — Gender wage gap total (%)
 *
 * Also validates annualWorkHours against ILO weekly hours.
 */
import { readFileSync, writeFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SOURCE_PATH = join(ROOT, "data/cities-source.json");
const ILO_DIR = join(ROOT, "data/sources/ilo");

const COUNTRY_MAP = {
  "美国":"United States of America","中国":"China","中国香港":"China, Hong Kong SAR","台湾":"Taiwan, China",
  "日本":"Japan","韩国":"Korea, Republic of","英国":"United Kingdom of Great Britain and Northern Ireland","德国":"Germany",
  "法国":"France","加拿大":"Canada","澳大利亚":"Australia","新加坡":"Singapore","荷兰":"Netherlands",
  "瑞士":"Switzerland","瑞典":"Sweden","挪威":"Norway","丹麦":"Denmark","芬兰":"Finland","爱尔兰":"Ireland",
  "奥地利":"Austria","比利时":"Belgium","卢森堡":"Luxembourg","西班牙":"Spain","意大利":"Italy",
  "葡萄牙":"Portugal","希腊":"Greece","波兰":"Poland","捷克":"Czechia","匈牙利":"Hungary",
  "罗马尼亚":"Romania","保加利亚":"Bulgaria","克罗地亚":"Croatia","斯洛伐克":"Slovakia",
  "斯洛文尼亚":"Slovenia","爱沙尼亚":"Estonia","立陶宛":"Lithuania","拉脱维亚":"Latvia",
  "塞尔维亚":"Serbia","塞浦路斯":"Cyprus","新西兰":"New Zealand","以色列":"Israel",
  "阿联酋":"United Arab Emirates","卡塔尔":"Qatar","沙特阿拉伯":"Saudi Arabia","巴林":"Bahrain",
  "阿曼":"Oman","约旦":"Jordan","土耳其":"Türkiye","印度":"India","印度尼西亚":"Indonesia",
  "泰国":"Thailand","越南":"Viet Nam","菲律宾":"Philippines","马来西亚":"Malaysia","柬埔寨":"Cambodia",
  "缅甸":"Myanmar","孟加拉国":"Bangladesh","尼泊尔":"Nepal","斯里兰卡":"Sri Lanka",
  "巴基斯坦":"Pakistan","哈萨克斯坦":"Kazakhstan","乌兹别克斯坦":"Uzbekistan","蒙古":"Mongolia",
  "格鲁吉亚":"Georgia","阿塞拜疆":"Azerbaijan","俄罗斯":"Russian Federation","乌克兰":"Ukraine",
  "伊朗":"Iran, Islamic Republic of","黎巴嫩":"Lebanon","埃及":"Egypt","摩洛哥":"Morocco",
  "南非":"South Africa","肯尼亚":"Kenya","尼日利亚":"Nigeria","加纳":"Ghana","埃塞俄比亚":"Ethiopia",
  "巴西":"Brazil","墨西哥":"Mexico","阿根廷":"Argentina","哥伦比亚":"Colombia","智利":"Chile",
  "秘鲁":"Peru","乌拉圭":"Uruguay","哥斯达黎加":"Costa Rica","巴拿马":"Panama","厄瓜多尔":"Ecuador",
  "多米尼加":"Dominican Republic","波多黎各":"Puerto Rico",
};

// Reverse: English name → Chinese name(s)
const EN_TO_ZH = {};
for (const [zh, en] of Object.entries(COUNTRY_MAP)) {
  if (!EN_TO_ZH[en]) EN_TO_ZH[en] = [];
  EN_TO_ZH[en].push(zh);
}

function parseCSV(text) {
  const lines = text.split("\n").filter(l => l.trim());
  const rows = [];
  for (const line of lines) {
    const result = []; let field = "", inQ = false;
    for (const ch of line) {
      if (ch === '"') inQ = !inQ;
      else if (ch === "," && !inQ) { result.push(field); field = ""; }
      else field += ch;
    }
    result.push(field);
    rows.push(result);
  }
  return { headers: rows[0], data: rows.slice(1) };
}

function findFile(pattern) {
  const files = readdirSync(ILO_DIR).filter(f => f.startsWith(pattern));
  return files.length > 0 ? join(ILO_DIR, files[0]) : null;
}

function extractLatestByCountry(csv, countryCol, valueCol, filterFn) {
  const result = {};
  const yearCol = csv.headers.indexOf("time");
  for (const row of csv.data) {
    if (filterFn && !filterFn(row, csv.headers)) continue;
    const country = row[countryCol];
    const year = parseInt(row[yearCol]);
    const val = parseFloat(row[valueCol]);
    if (!country || isNaN(val) || isNaN(year)) continue;
    if (!result[country] || year > result[country].year) {
      result[country] = { value: val, year };
    }
  }
  return result;
}

function main() {
  console.log("═══ Extract ILO Data to SOT ═══\n");

  const sourceData = JSON.parse(readFileSync(SOURCE_PATH, "utf-8"));
  const cities = sourceData.cities;

  // 1. Minimum wage (PPP$)
  console.log("1. Minimum wage (PPP$)...");
  const mwFile = findFile("EAR_INEE_CUR_NB_A");
  if (mwFile) {
    const csv = parseCSV(readFileSync(mwFile, "utf-8"));
    const c1Idx = csv.headers.indexOf("classif1.label");
    const data = extractLatestByCountry(csv, 0, 5, (row) => row[c1Idx]?.includes("PPP"));
    let hit = 0;
    for (const city of cities) {
      const en = COUNTRY_MAP[city.country];
      if (en && data[en]) { city.minimumWagePPP = Math.round(data[en].value); hit++; }
      else city.minimumWagePPP = null;
    }
    console.log(`  ${hit}/${cities.length} cities`);
  }

  // 2. Weekly hours (employees, Sex=Total)
  console.log("2. Weekly hours (employees)...");
  const hwFile = findFile("HOW_XEES_SEX_NB_A");
  if (hwFile) {
    const csv = parseCSV(readFileSync(hwFile, "utf-8"));
    const sexIdx = csv.headers.indexOf("sex.label");
    const data = extractLatestByCountry(csv, 0, 5, (row) => row[sexIdx] === "Total");
    let hit = 0, diffs = 0;
    for (const city of cities) {
      const en = COUNTRY_MAP[city.country];
      if (en && data[en]) {
        const weeklyH = data[en].value;
        const annualH = Math.round(weeklyH * 52);
        // Compare with existing annualWorkHours
        if (city.annualWorkHours && Math.abs(city.annualWorkHours - annualH) > 100) {
          diffs++;
        }
        city.weeklyHoursEmp = Math.round(weeklyH * 10) / 10;
        hit++;
      } else {
        city.weeklyHoursEmp = null;
      }
    }
    console.log(`  ${hit}/${cities.length} cities, ${diffs} significant diffs with annualWorkHours`);
  }

  // 3. Gini index (Sex=Total)
  console.log("3. Earnings Gini index...");
  const giniFile = findFile("EAR_EHRG_SEX_NB_A");
  if (giniFile) {
    const csv = parseCSV(readFileSync(giniFile, "utf-8"));
    const sexIdx = csv.headers.indexOf("sex.label");
    const data = extractLatestByCountry(csv, 0, 5, (row) => row[sexIdx] === "Total");
    let hit = 0;
    for (const city of cities) {
      const en = COUNTRY_MAP[city.country];
      if (en && data[en]) { city.earningsGini = Math.round(data[en].value * 1000) / 1000; hit++; }
      else city.earningsGini = null;
    }
    console.log(`  ${hit}/${cities.length} cities`);
  }

  // 4. Gender wage gap (Total)
  console.log("4. Gender wage gap...");
  const gwgFile = findFile("EAR_GGAP_OCU_RT_A");
  if (gwgFile) {
    const csv = parseCSV(readFileSync(gwgFile, "utf-8"));
    const c1Idx = csv.headers.indexOf("classif1.label");
    const data = extractLatestByCountry(csv, 0, 5, (row) => row[c1Idx]?.includes("Total"));
    let hit = 0;
    for (const city of cities) {
      const en = COUNTRY_MAP[city.country];
      if (en && data[en]) { city.genderWageGap = Math.round(data[en].value * 10) / 10; hit++; }
      else city.genderWageGap = null;
    }
    console.log(`  ${hit}/${cities.length} cities`);
  }

  writeFileSync(SOURCE_PATH, JSON.stringify(sourceData, null, 2) + "\n", "utf-8");
  console.log(`\n✅ Written to ${SOURCE_PATH}`);
}

main();
