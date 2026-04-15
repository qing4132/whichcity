#!/usr/bin/env node
/**
 * rebuild-salary.mjs — Multi-source salary rebuild with cross-validation
 *
 * Three data sources fused:
 *   Source A: ILO PPP monthly earnings × government profession ratios (80 countries)
 *   Source B: ILO ISCO-08 major group ratios (164 countries)
 *   Source C: GNI per capita as fallback anchor (WB CC BY 4.0)
 *
 * City premium factors applied from BLS patterns + editorial
 *
 * Cross-validation: compare Source A vs B, flag >30% deviation
 * Quality tiers: A/B (gov ratio) > ISCO ratio > GNI fallback
 *
 * Preserves: BLS (21 US cities, Public Domain), doda.jp (6 Japan cities)
 * License: ILO CC BY 4.0 + government public data + editorial premiums
 */
import { readFileSync, writeFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SOURCE_PATH = join(ROOT, "data/cities-source.json");
const ILO_DIR = join(ROOT, "data/sources/ilo");
const RATIOS_PATH = join(ROOT, "data/salary-research/raw/country-specific-ratios.json");

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

// Map government ratio country names to our Chinese country names
const GOV_TO_ZH = {
  "Japan":"日本","China":"中国","Canada":"加拿大","Australia":"澳大利亚",
  "South Korea":"韩国","Hong Kong":"中国香港","Taiwan":"台湾","Czech Republic":"捷克",
  "New Zealand":"新西兰","UAE":"阿联酋","Qatar":"卡塔尔","Bahrain":"巴林",
  "Oman":"阿曼","Saudi Arabia":"沙特阿拉伯","Ukraine":"乌克兰","Kazakhstan":"哈萨克斯坦",
  "Azerbaijan":"阿塞拜疆","Morocco":"摩洛哥","Iran":"伊朗","Nepal":"尼泊尔",
  "United Kingdom":"英国","Singapore":"新加坡","France":"法国","Germany":"德国",
  "Switzerland":"瑞士","Israel":"以色列","Russia":"俄罗斯","Sweden":"瑞典",
  "Norway":"挪威","Denmark":"丹麦","Finland":"芬兰","Netherlands":"荷兰",
  "Belgium":"比利时","Austria":"奥地利","Ireland":"爱尔兰","Italy":"意大利",
  "Spain":"西班牙","Portugal":"葡萄牙","Greece":"希腊","Poland":"波兰",
  "Turkey":"土耳其","Estonia":"爱沙尼亚","Luxembourg":"卢森堡","Slovenia":"斯洛文尼亚",
  "Slovakia":"斯洛伐克","Croatia":"克罗地亚","Serbia":"塞尔维亚","Romania":"罗马尼亚",
  "Bulgaria":"保加利亚","Hungary":"匈牙利","Latvia":"拉脱维亚","Lithuania":"立陶宛",
  "India":"印度","Indonesia":"印度尼西亚","Thailand":"泰国","Vietnam":"越南",
  "Philippines":"菲律宾","Malaysia":"马来西亚","Cambodia":"柬埔寨","Myanmar":"缅甸",
  "Bangladesh":"孟加拉国","Sri Lanka":"斯里兰卡","Pakistan":"巴基斯坦",
  "Mongolia":"蒙古","Georgia":"格鲁吉亚","Egypt":"埃及","South Africa":"南非",
  "Kenya":"肯尼亚","Nigeria":"尼日利亚","Ghana":"加纳","Ethiopia":"埃塞俄比亚",
  "Brazil":"巴西","Mexico":"墨西哥","Argentina":"阿根廷","Colombia":"哥伦比亚",
  "Chile":"智利","Peru":"秘鲁","Uruguay":"乌拉圭","Costa Rica":"哥斯达黎加",
  "Panama":"巴拿马","Ecuador":"厄瓜多尔","Dominican Republic":"多米尼加",
  "Lebanon":"黎巴嫩","Jordan":"约旦","Uzbekistan":"乌兹别克斯坦","Cyprus":"塞浦路斯",
};

// ISCO fallback mapping (same as before)
const PROF_TO_ISCO = {
  "软件工程师": { isco: 2, sub: 1.15 }, "医生/医学博士": { isco: 2, sub: 1.40 },
  "财务分析师": { isco: 2, sub: 1.05 }, "市场经理": { isco: 1, sub: 1.00 },
  "平面设计师": { isco: 3, sub: 0.95 }, "数据科学家": { isco: 2, sub: 1.10 },
  "销售经理": { isco: 1, sub: 1.10 }, "人力资源经理": { isco: 1, sub: 0.95 },
  "教师": { isco: 2, sub: 0.75 }, "护士": { isco: 2, sub: 0.70 },
  "律师": { isco: 2, sub: 1.30 }, "建筑师": { isco: 2, sub: 0.95 },
  "厨师": { isco: 5, sub: 1.05 }, "记者": { isco: 2, sub: 0.80 },
  "机械工程师": { isco: 2, sub: 1.00 }, "药剂师": { isco: 2, sub: 1.10 },
  "会计师": { isco: 2, sub: 0.90 }, "产品经理": { isco: 1, sub: 1.00 },
  "UI/UX设计师": { isco: 2, sub: 1.00 }, "大学教授": { isco: 2, sub: 1.00 },
  "牙医": { isco: 2, sub: 1.20 }, "公交司机": { isco: 8, sub: 1.00 },
  "电工": { isco: 7, sub: 1.00 }, "政府/NGO行政": { isco: 4, sub: 1.05 },
  "数字游民": { isco: -1, sub: 0 },
};

const ISCO_LABELS = {
  1: "Occupation (ISCO-08): 1. Managers", 2: "Occupation (ISCO-08): 2. Professionals",
  3: "Occupation (ISCO-08): 3. Technicians and associate professionals",
  4: "Occupation (ISCO-08): 4. Clerical support workers",
  5: "Occupation (ISCO-08): 5. Service and sales workers",
  7: "Occupation (ISCO-08): 7. Craft and related trades workers",
  8: "Occupation (ISCO-08): 8. Plant and machine operators, and assemblers",
};

// City premium factors (same as previous version)
const CITY_PREMIUM = {
  "北京":1.35,"上海":1.40,"广州":1.20,"深圳":1.35,"成都":1.00,"杭州":1.15,"重庆":0.90,
  "香港":1.00,"新加坡":1.00,"卢森堡":1.00,
  "伦敦":1.30,"曼彻斯特":0.90,"爱丁堡":0.95,
  "柏林":1.00,"慕尼黑":1.20,"法兰克福":1.15,"汉堡":1.05,
  "巴黎":1.30,"里昂":0.90,"马赛":0.85,
  "首尔":1.25,"釜山":0.90,
  "孟买":1.40,"班加罗尔":1.30,"新德里":1.20,"海得拉巴":1.10,"钦奈":1.05,"加尔各答":0.90,"浦那":1.00,
  "圣保罗":1.25,"里约热内卢":1.10,"巴西利亚":1.15,"库里蒂巴":0.95,"贝洛奥里藏特":0.90,"累西腓":0.85,
  "墨西哥城":1.20,"蒙特雷":1.10,"瓜达拉哈拉":0.95,
  "悉尼":1.20,"墨尔本":1.10,"布里斯班":0.95,"珀斯":1.00,
  "多伦多":1.15,"温哥华":1.15,"蒙特利尔":1.00,"渥太华":1.05,"卡尔加里":1.05,
  "伊斯坦布尔":1.25,"安卡拉":1.00,"伊兹密尔":0.90,
  "莫斯科":1.40,"圣彼得堡":1.10,
  "迪拜":1.10,"阿布扎比":1.15,
  "曼谷":1.30,"清迈":0.75,"普吉岛":0.80,
  "雅加达":1.25,"巴厘岛":0.80,
  "胡志明市":1.20,"河内":1.10,"岘港":0.80,
  "马尼拉":1.20,"宿务":0.85,
  "波哥大":1.20,"麦德林":0.95,
  "布宜诺斯艾利斯":1.25,"开罗":1.20,
  "约翰内斯堡":1.15,"开普敦":1.10,
  "拉各斯":1.30,"阿布贾":1.10,"内罗毕":1.15,
  "华沙":1.20,"克拉科夫":0.95,"布拉格":1.20,"布加勒斯特":1.25,
  "马德里":1.15,"巴塞罗那":1.15,"罗马":1.10,"米兰":1.20,
  "阿姆斯特丹":1.15,"苏黎世":1.15,"日内瓦":1.15,
  "特拉维夫":1.20,"台北":1.20,
  "卡拉奇":1.10,"伊斯兰堡":1.15,"拉合尔":0.95,
};
const DEFAULT_PREMIUM = 1.10;

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
  console.log("═══ Rebuild Salaries (Multi-Source + Cross-Validation) ═══\n");

  // ── Load all sources ──

  // Source A: Government profession ratios (80 countries, 24 professions each)
  const govData = JSON.parse(readFileSync(RATIOS_PATH, "utf-8"));
  const govRatios = govData.countries; // { "Japan": { "软件工程师": 1.22, ... }, ... }
  const govQuality = govData.dataQuality; // { "Japan": "A", ... }
  // Build zh→gov lookup
  const zhToGovKey = {};
  for (const [en, zh] of Object.entries(GOV_TO_ZH)) {
    if (govRatios[en]) zhToGovKey[zh] = en;
  }

  // Source B: ILO PPP monthly earnings
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

  // Source B2: ILO ISCO occupation ratios
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

  console.log(`Source A: Government ratios — ${Object.keys(govRatios).length} countries (${Object.values(govQuality).filter(q=>q==="A").length} Quality A)`);
  console.log(`Source B: ILO PPP earnings — ${Object.keys(pppEarnings).length} countries`);
  console.log(`Source B2: ILO ISCO ratios — ${Object.keys(iscoData).length} countries`);
  console.log(`City premiums: ${Object.keys(CITY_PREMIUM).length} cities\n`);

  // ── Load SOT ──
  const sourceData = JSON.parse(readFileSync(SOURCE_PATH, "utf-8"));
  const cities = sourceData.cities;

  let stats = { bls: 0, doda: 0, govA: 0, govB: 0, iscoOnly: 0, gniFallback: 0, failed: 0 };
  let crossValidation = [];

  for (const city of cities) {
    if (BLS_COUNTRIES.has(city.country)) { stats.bls++; continue; }
    if (DODA_COUNTRIES.has(city.country)) { stats.doda++; continue; }

    const premium = CITY_PREMIUM[city.name] ?? DEFAULT_PREMIUM;
    const iloName = COUNTRY_TO_ILO[city.country];
    const countryEarnings = iloName ? pppEarnings[iloName] : null;
    const govKey = zhToGovKey[city.country];
    const countryGovRatios = govKey ? govRatios[govKey] : null;
    const quality = govKey ? govQuality[govKey] : null;

    // Get annual base from ILO
    let annualBase = countryEarnings ? countryEarnings.monthly * 12 : null;

    // Fallback to GNI
    if (!annualBase && city.gniPerCapita) {
      annualBase = city.gniPerCapita;
    }

    if (!annualBase) { stats.failed++; continue; }

    // ISCO data for this country
    const countryISCO = iloName ? iscoData[iloName] : null;
    let iscoTotal = null;
    if (countryISCO) {
      iscoTotal = countryISCO["Occupation (ISCO-08): Total"]?.val
        || countryISCO["Occupation (ISCO-88): Total"]?.val;
    }

    let methodUsed = "isco";

    for (const [prof, mapping] of Object.entries(PROF_TO_ISCO)) {
      if (mapping.isco === -1) { city.professions[prof] = 85000; continue; }

      let salaryA = null; // Government ratio method
      let salaryB = null; // ISCO method

      // Method A: Government profession ratio (best quality)
      if (countryGovRatios && countryGovRatios[prof]) {
        salaryA = annualBase * countryGovRatios[prof] * premium;
      }

      // Method B: ISCO major group ratio
      if (countryISCO && iscoTotal) {
        const iscoLabel = ISCO_LABELS[mapping.isco];
        const iscoVal = countryISCO[iscoLabel]?.val;
        if (iscoVal && iscoTotal > 0) {
          salaryB = annualBase * (iscoVal / iscoTotal) * mapping.sub * premium;
        }
      }

      // Fusion: prefer gov ratio (more precise), fallback to ISCO
      let finalSalary;
      if (salaryA && salaryB) {
        // Cross-validate: if both available, check deviation
        const deviation = Math.abs(salaryA - salaryB) / Math.max(salaryA, salaryB);
        if (deviation > 0.5 && prof === "软件工程师") {
          crossValidation.push({
            city: city.name, prof, govVal: Math.round(salaryA), iscoVal: Math.round(salaryB),
            dev: (deviation * 100).toFixed(0) + "%", quality: quality || "?"
          });
        }
        // Use weighted average: gov ratio gets higher weight for quality A/B
        if (quality === "A") {
          finalSalary = salaryA * 0.85 + salaryB * 0.15; // Heavy gov weight
        } else if (quality === "B") {
          finalSalary = salaryA * 0.70 + salaryB * 0.30; // Moderate gov weight
        } else {
          finalSalary = salaryA * 0.50 + salaryB * 0.50; // Equal weight for C/D
        }
        methodUsed = "fusion";
      } else if (salaryA) {
        finalSalary = salaryA;
        methodUsed = "gov";
      } else if (salaryB) {
        finalSalary = salaryB;
        methodUsed = "isco";
      } else {
        // Last resort: base × sub × premium
        finalSalary = annualBase * mapping.sub * premium;
        methodUsed = "base";
      }

      city.professions[prof] = Math.round(finalSalary);
    }

    if (countryGovRatios && (quality === "A" || quality === "B")) {
      if (quality === "A") stats.govA++;
      else stats.govB++;
    } else if (countryISCO && iscoTotal) {
      stats.iscoOnly++;
    } else {
      stats.gniFallback++;
    }
  }

  writeFileSync(SOURCE_PATH, JSON.stringify(sourceData, null, 2) + "\n", "utf-8");

  console.log("═══ Results ═══");
  console.log(`  BLS kept: ${stats.bls}`);
  console.log(`  doda.jp kept: ${stats.doda}`);
  console.log(`  Gov ratio Quality A (best): ${stats.govA}`);
  console.log(`  Gov ratio Quality B: ${stats.govB}`);
  console.log(`  ISCO only: ${stats.iscoOnly}`);
  console.log(`  GNI fallback: ${stats.gniFallback}`);
  console.log(`  Failed: ${stats.failed}`);
  console.log(`  Total: ${stats.bls + stats.doda + stats.govA + stats.govB + stats.iscoOnly + stats.gniFallback}/${cities.length}`);

  if (crossValidation.length > 0) {
    console.log(`\n═══ Cross-Validation Flags (SW >50% deviation) ═══`);
    crossValidation.forEach(cv => console.log(`  ${cv.city}: gov=$${cv.govVal} isco=$${cv.iscoVal} dev=${cv.dev} quality=${cv.quality}`));
  }

  console.log("\n═══ Same-Country Comparison ═══");
  const pairs = [
    ["北京","成都"],["上海","重庆"],["伦敦","曼彻斯特"],["慕尼黑","柏林"],
    ["首尔","釜山"],["曼谷","清迈"],["孟买","加尔各答"],["圣保罗","累西腓"],
  ];
  for (const [a, b] of pairs) {
    const ca = cities.find(c => c.name === a), cb = cities.find(c => c.name === b);
    if (!ca || !cb) continue;
    const swA = ca.professions["软件工程师"], swB = cb.professions["软件工程师"];
    console.log(`  ${a} vs ${b}: $${swA?.toLocaleString()} vs $${swB?.toLocaleString()} (${(swA/swB).toFixed(2)}x)`);
  }

  console.log("\n═══ Global Samples ═══");
  for (const name of ["纽约","伦敦","东京","新加坡","柏林","曼谷","首尔","台北","拉各斯","孟买"]) {
    const c = cities.find(x => x.name === name);
    if (!c) continue;
    const sw = c.professions["软件工程师"];
    const nurse = c.professions["护士"];
    const med = Object.values(c.professions).sort((a,b)=>a-b)[12];
    console.log(`  ${name}: SW=$${sw?.toLocaleString()} nurse=$${nurse?.toLocaleString()} med=$${med?.toLocaleString()}`);
  }
  console.log("\n✅ Done");
}

main();
