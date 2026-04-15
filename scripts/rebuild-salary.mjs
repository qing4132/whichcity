#!/usr/bin/env node
/**
 * rebuild-salary.mjs — Rebuild professions from ILO + city premium factors
 *
 * Method: ILO national PPP monthly earnings × 12 × ISCO ratio × subRatio × cityPremium
 *
 * City premium is derived from the city's economic position within its country:
 *   - Capital / global financial center: 1.25-1.40
 *   - Major economic hub: 1.10-1.20
 *   - Secondary city: 0.85-1.00
 *   - These are well-documented urbanization economics patterns
 *
 * The city premium table is manually curated based on public knowledge
 * (no proprietary data), similar to how we assign safetyWarning.
 *
 * Preserves: BLS (21 US cities), doda.jp (6 Japan cities)
 * License: ILO CC BY 4.0 + editorial city premiums
 */
import { readFileSync, writeFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SOURCE_PATH = join(ROOT, "data/cities-source.json");
const ILO_DIR = join(ROOT, "data/sources/ilo");

// ── Country → ILO name ──
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

// ── City premium factors (editorial, public knowledge) ──
// Based on each city's role in its national economy
// Sources: general knowledge of urbanization economics, city GDP shares
// 1.0 = national average; >1.0 = more expensive/higher wages; <1.0 = below average
const CITY_PREMIUM = {
  // China (huge internal variation)
  "北京": 1.35, "上海": 1.40, "广州": 1.20, "深圳": 1.35, "成都": 1.00, "杭州": 1.15, "重庆": 0.90,
  // Hong Kong, Singapore, Luxembourg (city-states, no adjustment needed)
  "香港": 1.00, "新加坡": 1.00, "卢森堡": 1.00,
  // UK
  "伦敦": 1.30, "曼彻斯特": 0.90, "爱丁堡": 0.95,
  // Germany
  "柏林": 1.00, "慕尼黑": 1.20, "法兰克福": 1.15, "汉堡": 1.05,
  // France
  "巴黎": 1.30, "里昂": 0.90, "马赛": 0.85,
  // South Korea
  "首尔": 1.25, "釜山": 0.90,
  // India (massive gap)
  "孟买": 1.40, "班加罗尔": 1.30, "新德里": 1.20, "海得拉巴": 1.10, "钦奈": 1.05, "加尔各答": 0.90, "浦那": 1.00,
  // Brazil
  "圣保罗": 1.25, "里约热内卢": 1.10, "巴西利亚": 1.15, "库里蒂巴": 0.95, "贝洛奥里藏特": 0.90, "累西腓": 0.85,
  // Mexico
  "墨西哥城": 1.20, "蒙特雷": 1.10, "瓜达拉哈拉": 0.95,
  // Australia
  "悉尼": 1.20, "墨尔本": 1.10, "布里斯班": 0.95, "珀斯": 1.00,
  // Canada
  "多伦多": 1.15, "温哥华": 1.15, "蒙特利尔": 1.00, "渥太华": 1.05, "卡尔加里": 1.05,
  // Turkey
  "伊斯坦布尔": 1.25, "安卡拉": 1.00, "伊兹密尔": 0.90,
  // Russia
  "莫斯科": 1.40, "圣彼得堡": 1.10,
  // UAE
  "迪拜": 1.10, "阿布扎比": 1.15,
  // Thailand
  "曼谷": 1.30, "清迈": 0.75, "普吉岛": 0.80,
  // Indonesia
  "雅加达": 1.25, "巴厘岛": 0.80,
  // Vietnam
  "胡志明市": 1.20, "河内": 1.10, "岘港": 0.80,
  // Philippines
  "马尼拉": 1.20, "宿务": 0.85,
  // Colombia
  "波哥大": 1.20, "麦德林": 0.95,
  // Argentina
  "布宜诺斯艾利斯": 1.25,
  // Egypt
  "开罗": 1.20,
  // South Africa
  "约翰内斯堡": 1.15, "开普敦": 1.10,
  // Nigeria
  "拉各斯": 1.30, "阿布贾": 1.10,
  // Kenya
  "内罗毕": 1.15,
  // Poland
  "华沙": 1.20, "克拉科夫": 0.95,
  // Czech
  "布拉格": 1.20,
  // Romania
  "布加勒斯特": 1.25,
  // Spain
  "马德里": 1.15, "巴塞罗那": 1.15,
  // Italy
  "罗马": 1.10, "米兰": 1.20,
  // Netherlands
  "阿姆斯特丹": 1.15,
  // Switzerland
  "苏黎世": 1.15, "日内瓦": 1.15,
  // Israel
  "特拉维夫": 1.20,
  // Taiwan
  "台北": 1.20,
  // Pakistan
  "卡拉奇": 1.10, "伊斯兰堡": 1.15, "拉合尔": 0.95,
};
const DEFAULT_PREMIUM = 1.10; // Most cities in our list are capitals/primary cities

// ── 25 professions → ISCO mapping ──
const PROF_TO_ISCO = {
  "软件工程师": { isco: 2, sub: 1.15 },
  "医生/医学博士": { isco: 2, sub: 1.40 },
  "财务分析师": { isco: 2, sub: 1.05 },
  "市场经理": { isco: 1, sub: 1.00 },
  "平面设计师": { isco: 3, sub: 0.95 },
  "数据科学家": { isco: 2, sub: 1.10 },
  "销售经理": { isco: 1, sub: 1.10 },
  "人力资源经理": { isco: 1, sub: 0.95 },
  "教师": { isco: 2, sub: 0.75 },
  "护士": { isco: 2, sub: 0.70 },
  "律师": { isco: 2, sub: 1.30 },
  "建筑师": { isco: 2, sub: 0.95 },
  "厨师": { isco: 5, sub: 1.05 },
  "记者": { isco: 2, sub: 0.80 },
  "机械工程师": { isco: 2, sub: 1.00 },
  "药剂师": { isco: 2, sub: 1.10 },
  "会计师": { isco: 2, sub: 0.90 },
  "产品经理": { isco: 1, sub: 1.00 },
  "UI/UX设计师": { isco: 2, sub: 1.00 },
  "大学教授": { isco: 2, sub: 1.00 },
  "牙医": { isco: 2, sub: 1.20 },
  "公交司机": { isco: 8, sub: 1.00 },
  "电工": { isco: 7, sub: 1.00 },
  "政府/NGO行政": { isco: 4, sub: 1.05 },
  "数字游民": { isco: -1, sub: 0 },
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

const BLS_COUNTRIES = new Set(["美国", "波多黎各"]);
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
  console.log("═══ Rebuild Salaries (ILO + City Premiums) ═══\n");

  // Load ILO PPP monthly earnings
  const earnFile = readdirSync(ILO_DIR).find(f => f.startsWith("ilo-earnings-by-currency"));
  const earnRows = parseCSV(readFileSync(join(ILO_DIR, earnFile), "utf-8"));
  const pppEarnings = {};
  for (let i = 1; i < earnRows.length; i++) {
    const [country, , , sex, currency, year, val] = earnRows[i];
    if (sex !== "Total" || !currency?.includes("PPP")) continue;
    const v = parseFloat(val), y = parseInt(year);
    if (isNaN(v)) continue;
    if (!pppEarnings[country] || y > pppEarnings[country].year) pppEarnings[country] = { monthly: v, year: y };
  }

  // Load ILO ISCO ratios
  const occFile = readdirSync(ILO_DIR).find(f => f.startsWith("ilo-earnings-by-occupation"));
  const occRows = parseCSV(readFileSync(join(ILO_DIR, occFile), "utf-8"));
  const iscoData = {};
  for (let i = 1; i < occRows.length; i++) {
    const [country, , , sex, occ, year, val] = occRows[i];
    if (sex !== "Total") continue;
    const v = parseFloat(val), y = parseInt(year);
    if (isNaN(v)) continue;
    if (!iscoData[country]) iscoData[country] = {};
    if (!iscoData[country][occ] || y > iscoData[country][occ].year) iscoData[country][occ] = { val: v, year: y };
  }

  console.log(`ILO PPP: ${Object.keys(pppEarnings).length} countries`);
  console.log(`ILO ISCO: ${Object.keys(iscoData).length} countries`);
  console.log(`City premiums: ${Object.keys(CITY_PREMIUM).length} cities defined\n`);

  const sourceData = JSON.parse(readFileSync(SOURCE_PATH, "utf-8"));
  const cities = sourceData.cities;
  let rebuilt = 0, kept = 0, fallback = 0;

  for (const city of cities) {
    if (BLS_COUNTRIES.has(city.country)) { kept++; continue; }
    if (DODA_COUNTRIES.has(city.country)) { kept++; continue; }

    const iloName = COUNTRY_TO_ILO[city.country];
    const countryEarnings = iloName ? pppEarnings[iloName] : null;

    // Get base annual salary
    let annualBase;
    if (countryEarnings) {
      annualBase = countryEarnings.monthly * 12;
    } else if (city.gniPerCapita) {
      // Fallback: use GNI per capita as very rough proxy (WB CC BY 4.0)
      annualBase = city.gniPerCapita;
      fallback++;
    } else {
      continue; // Can't rebuild
    }

    // City premium
    const premium = CITY_PREMIUM[city.name] ?? DEFAULT_PREMIUM;

    // ISCO ratios
    const countryISCO = iloName ? iscoData[iloName] : null;
    let totalVal = null;
    if (countryISCO) {
      totalVal = countryISCO["Occupation (ISCO-08): Total"]?.val
        || countryISCO["Occupation (ISCO-88): Total"]?.val
        || countryISCO["Occupation (Skill level): Total"]?.val;
    }

    for (const [prof, mapping] of Object.entries(PROF_TO_ISCO)) {
      if (mapping.isco === -1) { city.professions[prof] = 85000; continue; }

      let salary;
      if (countryISCO && totalVal) {
        const iscoLabel = ISCO_LABELS[mapping.isco];
        const iscoVal = countryISCO[iscoLabel]?.val;
        const iscoRatio = (iscoVal && totalVal > 0) ? iscoVal / totalVal : 1.0;
        salary = annualBase * iscoRatio * mapping.sub * premium;
      } else {
        salary = annualBase * mapping.sub * premium;
      }

      city.professions[prof] = Math.round(salary);
    }
    rebuilt++;
  }

  writeFileSync(SOURCE_PATH, JSON.stringify(sourceData, null, 2) + "\n", "utf-8");

  console.log(`═══ Results ═══`);
  console.log(`  Rebuilt: ${rebuilt} (ILO: ${rebuilt - fallback}, GNI fallback: ${fallback})`);
  console.log(`  Kept: ${kept} (BLS + doda)`);
  console.log(`  Total: ${rebuilt + kept}/${cities.length}\n`);

  // Show same-country different-city comparison
  console.log("═══ Same-Country City Comparison ═══");
  const pairs = [
    ["北京", "成都"], ["上海", "重庆"],
    ["伦敦", "曼彻斯特"], ["慕尼黑", "柏林"],
    ["孟买", "加尔各答"], ["圣保罗", "累西腓"],
    ["首尔", "釜山"], ["曼谷", "清迈"],
  ];
  for (const [a, b] of pairs) {
    const ca = cities.find(c => c.name === a), cb = cities.find(c => c.name === b);
    if (!ca || !cb) continue;
    const swA = ca.professions["软件工程师"], swB = cb.professions["软件工程师"];
    console.log(`  ${a} vs ${b}: $${swA?.toLocaleString()} vs $${swB?.toLocaleString()} (${(swA/swB).toFixed(2)}x)`);
  }

  console.log("\n═══ Global Samples ═══");
  for (const name of ["纽约","旧金山","伦敦","东京","新加坡","柏林","曼谷","拉各斯","台北","首尔"]) {
    const c = cities.find(x => x.name === name);
    if (!c) continue;
    const sw = c.professions["软件工程师"];
    const med = Object.values(c.professions).sort((a,b)=>a-b)[12];
    console.log(`  ${name}: SW=$${sw?.toLocaleString()} med=$${med?.toLocaleString()} premium=${CITY_PREMIUM[name] ?? DEFAULT_PREMIUM}`);
  }
  console.log("\n✅ Done");
}

main();
