#!/usr/bin/env node
/**
 * rebuild-salary.mjs — Rebuild professions salaries from ILO open data
 *
 * Replaces Numbeo-based salary anchors with ILO PPP monthly earnings.
 * Preserves BLS Tier 1 (21 US cities) and doda.jp (6 Japan cities).
 *
 * Pipeline:
 *   1. Load ILO PPP monthly earnings (166 countries) → annual gross USD
 *   2. Load ILO ISCO occupation ratios (164 countries)
 *   3. Map 25 WhichCity professions → ISCO major groups
 *   4. For each non-BLS city: salary = ILO_annual × ISCO_ratio × profession_subRatio
 *   5. Keep BLS cities untouched
 *
 * License: All inputs CC BY 4.0 (ILO) or Public Domain (BLS)
 */
import { readFileSync, writeFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SOURCE_PATH = join(ROOT, "data/cities-source.json");
const ILO_DIR = join(ROOT, "data/sources/ilo");

// ── Country name mapping ──
const COUNTRY_TO_ILO = {
  "美国":"United States of America","中国":"China","中国香港":"China, Hong Kong SAR",
  "台湾":"Taiwan, China","日本":"Japan","韩国":"Korea, Republic of",
  "英国":"United Kingdom of Great Britain and Northern Ireland","德国":"Germany",
  "法国":"France","加拿大":"Canada","澳大利亚":"Australia","新加坡":"Singapore",
  "荷兰":"Netherlands","瑞士":"Switzerland","瑞典":"Sweden","挪威":"Norway",
  "丹麦":"Denmark","芬兰":"Finland","爱尔兰":"Ireland","奥地利":"Austria",
  "比利时":"Belgium","卢森堡":"Luxembourg","西班牙":"Spain","意大利":"Italy",
  "葡萄牙":"Portugal","希腊":"Greece","波兰":"Poland","捷克":"Czechia",
  "匈牙利":"Hungary","罗马尼亚":"Romania","保加利亚":"Bulgaria","克罗地亚":"Croatia",
  "斯洛伐克":"Slovakia","斯洛文尼亚":"Slovenia","爱沙尼亚":"Estonia","立陶宛":"Lithuania",
  "拉脱维亚":"Latvia","塞尔维亚":"Serbia","塞浦路斯":"Cyprus","新西兰":"New Zealand",
  "以色列":"Israel","阿联酋":"United Arab Emirates","卡塔尔":"Qatar",
  "沙特阿拉伯":"Saudi Arabia","巴林":"Bahrain","阿曼":"Oman","约旦":"Jordan",
  "土耳其":"Türkiye","印度":"India","印度尼西亚":"Indonesia","泰国":"Thailand",
  "越南":"Viet Nam","菲律宾":"Philippines","马来西亚":"Malaysia","柬埔寨":"Cambodia",
  "缅甸":"Myanmar","孟加拉国":"Bangladesh","尼泊尔":"Nepal","斯里兰卡":"Sri Lanka",
  "巴基斯坦":"Pakistan","哈萨克斯坦":"Kazakhstan","乌兹别克斯坦":"Uzbekistan",
  "蒙古":"Mongolia","格鲁吉亚":"Georgia","阿塞拜疆":"Azerbaijan",
  "俄罗斯":"Russian Federation","乌克兰":"Ukraine","伊朗":"Iran, Islamic Republic of",
  "黎巴嫩":"Lebanon","埃及":"Egypt","摩洛哥":"Morocco","南非":"South Africa",
  "肯尼亚":"Kenya","尼日利亚":"Nigeria","加纳":"Ghana","埃塞俄比亚":"Ethiopia",
  "巴西":"Brazil","墨西哥":"Mexico","阿根廷":"Argentina","哥伦比亚":"Colombia",
  "智利":"Chile","秘鲁":"Peru","乌拉圭":"Uruguay","哥斯达黎加":"Costa Rica",
  "巴拿马":"Panama","厄瓜多尔":"Ecuador","多米尼加":"Dominican Republic","波多黎各":"Puerto Rico",
};

// ── 25 professions → ISCO-08 major group mapping ──
// ISCO-08: 1=Managers, 2=Professionals, 3=Technicians, 4=Clerical, 5=Service/Sales,
//          6=Agriculture, 7=Craft, 8=Operators, 9=Elementary
const PROF_TO_ISCO = {
  "软件工程师": { isco: 2, subRatio: 1.15 },      // Professional, high-demand
  "医生/医学博士": { isco: 2, subRatio: 1.40 },    // Professional, medical specialist
  "财务分析师": { isco: 2, subRatio: 1.05 },       // Professional
  "市场经理": { isco: 1, subRatio: 1.00 },         // Manager
  "平面设计师": { isco: 3, subRatio: 0.95 },       // Technician
  "数据科学家": { isco: 2, subRatio: 1.10 },       // Professional
  "销售经理": { isco: 1, subRatio: 1.10 },         // Manager, senior
  "人力资源经理": { isco: 1, subRatio: 0.95 },     // Manager
  "教师": { isco: 2, subRatio: 0.75 },             // Professional, education
  "护士": { isco: 2, subRatio: 0.70 },             // Professional, healthcare
  "律师": { isco: 2, subRatio: 1.30 },             // Professional, legal
  "建筑师": { isco: 2, subRatio: 0.95 },           // Professional
  "厨师": { isco: 5, subRatio: 1.05 },             // Service
  "记者": { isco: 2, subRatio: 0.80 },             // Professional, media
  "机械工程师": { isco: 2, subRatio: 1.00 },       // Professional, engineering
  "药剂师": { isco: 2, subRatio: 1.10 },           // Professional, health
  "会计师": { isco: 2, subRatio: 0.90 },           // Professional
  "产品经理": { isco: 1, subRatio: 1.00 },         // Manager
  "UI/UX设计师": { isco: 2, subRatio: 1.00 },      // Professional
  "大学教授": { isco: 2, subRatio: 1.00 },         // Professional, academic
  "牙医": { isco: 2, subRatio: 1.20 },             // Professional, dental
  "公交司机": { isco: 8, subRatio: 1.00 },         // Operator
  "电工": { isco: 7, subRatio: 1.00 },             // Craft
  "政府/NGO行政": { isco: 4, subRatio: 1.05 },     // Clerical/admin
  "数字游民": { isco: -1, subRatio: 0 },           // Fixed $85,000
};

const ISCO_LABELS = {
  1: "Occupation (ISCO-08): 1. Managers",
  2: "Occupation (ISCO-08): 2. Professionals",
  3: "Occupation (ISCO-08): 3. Technicians and associate professionals",
  4: "Occupation (ISCO-08): 4. Clerical support workers",
  5: "Occupation (ISCO-08): 5. Service and sales workers",
  7: "Occupation (ISCO-08): 7. Craft and related trades workers",
  8: "Occupation (ISCO-08): 8. Plant and machine operators, and assemblers",
};

// BLS cities (keep untouched)
const BLS_COUNTRIES = new Set(["美国", "波多黎各"]);
// Japan doda cities (keep untouched)
const DODA_COUNTRIES = new Set(["日本"]);

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
  console.log("═══ Rebuild Salaries from ILO Open Data ═══\n");

  // 1. Load ILO PPP monthly earnings
  const earnFile = readdirSync(ILO_DIR).find(f => f.startsWith("ilo-earnings-by-currency"));
  const earnRows = parseCSV(readFileSync(join(ILO_DIR, earnFile), "utf-8"));
  const pppEarnings = {}; // country → { monthly PPP$ }
  for (let i = 1; i < earnRows.length; i++) {
    const [country, , , sex, currency, year, val] = earnRows[i];
    if (sex !== "Total" || !currency?.includes("PPP")) continue;
    const v = parseFloat(val), y = parseInt(year);
    if (isNaN(v)) continue;
    if (!pppEarnings[country] || y > pppEarnings[country].year) {
      pppEarnings[country] = { monthly: v, year: y };
    }
  }
  console.log(`ILO PPP earnings: ${Object.keys(pppEarnings).length} countries`);

  // 2. Load ILO ISCO occupation ratios
  const occFile = readdirSync(ILO_DIR).find(f => f.startsWith("ilo-earnings-by-occupation"));
  const occRows = parseCSV(readFileSync(join(ILO_DIR, occFile), "utf-8"));
  const iscoData = {}; // country → { iscoLabel → val }
  for (let i = 1; i < occRows.length; i++) {
    const [country, , , sex, occ, year, val] = occRows[i];
    if (sex !== "Total") continue;
    const v = parseFloat(val), y = parseInt(year);
    if (isNaN(v)) continue;
    if (!iscoData[country]) iscoData[country] = {};
    if (!iscoData[country][occ] || y > iscoData[country][occ].year) {
      iscoData[country][occ] = { val: v, year: y };
    }
  }
  console.log(`ILO ISCO data: ${Object.keys(iscoData).length} countries`);

  // 3. Load SOT
  const sourceData = JSON.parse(readFileSync(SOURCE_PATH, "utf-8"));
  const cities = sourceData.cities;

  let rebuilt = 0, kept = 0, failed = 0;

  for (const city of cities) {
    // Skip BLS cities (already accurate)
    if (BLS_COUNTRIES.has(city.country)) { kept++; continue; }
    // Skip Japan doda cities
    if (DODA_COUNTRIES.has(city.country)) { kept++; continue; }

    const iloName = COUNTRY_TO_ILO[city.country];
    if (!iloName) { failed++; continue; }

    const countryEarnings = pppEarnings[iloName];
    if (!countryEarnings) { failed++; continue; }

    // Annual gross from ILO PPP monthly
    const annualBase = countryEarnings.monthly * 12;

    // Get ISCO ratios for this country
    const countryISCO = iscoData[iloName];
    let totalVal = null;
    if (countryISCO) {
      totalVal = countryISCO["Occupation (ISCO-08): Total"]?.val
        || countryISCO["Occupation (ISCO-88): Total"]?.val
        || countryISCO["Occupation (Skill level): Total"]?.val;
    }

    // Compute each profession
    for (const [prof, mapping] of Object.entries(PROF_TO_ISCO)) {
      // Digital nomad: fixed
      if (mapping.isco === -1) {
        city.professions[prof] = 85000;
        continue;
      }

      let salary;
      if (countryISCO && totalVal) {
        // Use ISCO ratio
        const iscoLabel = ISCO_LABELS[mapping.isco];
        const iscoVal = countryISCO[iscoLabel]?.val;
        if (iscoVal && totalVal > 0) {
          const iscoRatio = iscoVal / totalVal;
          salary = annualBase * iscoRatio * mapping.subRatio;
        } else {
          // ISCO group not available, use base × subRatio
          salary = annualBase * mapping.subRatio;
        }
      } else {
        // No ISCO data, use base × subRatio only
        salary = annualBase * mapping.subRatio;
      }

      city.professions[prof] = Math.round(salary);
    }

    rebuilt++;
  }

  writeFileSync(SOURCE_PATH, JSON.stringify(sourceData, null, 2) + "\n", "utf-8");

  console.log(`\n═══ Results ═══`);
  console.log(`  Rebuilt (ILO): ${rebuilt} cities`);
  console.log(`  Kept (BLS/doda): ${kept} cities`);
  console.log(`  Failed (no ILO data): ${failed} cities`);

  // Sanity check
  console.log(`\n═══ Samples ═══`);
  for (const name of ["纽约", "伦敦", "东京", "曼谷", "柏林", "拉各斯", "台北"]) {
    const c = cities.find(x => x.name === name);
    if (!c) continue;
    const sw = c.professions["软件工程师"];
    const nurse = c.professions["护士"];
    const cook = c.professions["厨师"];
    const med = Object.values(c.professions).sort((a,b) => a-b)[12];
    console.log(`  ${name}: SW=$${sw} 护士=$${nurse} 厨师=$${cook} 中位=$${med}`);
  }

  console.log(`\n✅ Done`);
}

main();
