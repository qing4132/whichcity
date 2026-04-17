#!/usr/bin/env node
/**
 * build-clean.mjs — Clean-pipeline main builder.
 *
 * ABSOLUTE RULE: zero Numbeo/Livingcost/Expatistan inputs anywhere.
 *
 * Inputs (all CC BY 4.0 / Public Domain / OGL):
 *   sources/wb-indicators.json     WB HFCE, Pop, Gini, GDP-PPP, GNI
 *   sources/hud-fmr-2024.json      HUD FY2024 1BR FMR (19 US cities)
 *   sources/ons-uk-2026.json       ONS private rent Feb 2026 (UK 2 cities)
 *   sources/statcan-ca-rent-2024.json  StatCan CMHC 1BR 2024 (5 CA cities)
 *   ../sources/cost-model-inputs.json  Eurostat PLI + BEA RPP (reused — clean inputs)
 *   ../../public/data/exchange-rates.json  Current FX
 *
 * Output: output/clean-values.json  (id, name, country, cost, rent, house, source-tags)
 *
 * ─── Formulas ────────────────────────────────────────────────
 *
 * costModerate (single professional, USD/month):
 *   1. Base = HFCE_per_capita_annual_USD / 12                  (WB)
 *   2. middleClassMul = f(Gini):                                Gini reflects inequality;
 *        Gini < 0.32  → 1.30   (developed, uniform)             middle-class pro lives
 *        0.32–0.37    → 1.65                                     closer to the top in unequal
 *        0.37–0.42    → 2.30                                     societies, because the
 *        0.42–0.48    → 3.00                                     mean is dragged down by
 *        ≥ 0.48       → 3.80   (very unequal, e.g. Brazil/ZA)   rural poor.
 *   3. cityPriceAdj:
 *        US city with BEA RPP → RPP/100                         (public domain)
 *        EU country with Eurostat PLI → PLI/100                 (CC BY 4.0)
 *        other → 1.0
 *   4. cityPremium:
 *        primary/financial city → 1.20                          (documented fact)
 *        capital (non-primary)  → 1.10
 *        regular                → 1.00
 *
 *   costModerate = round(Base × middleClassMul × cityPriceAdj × cityPremium)
 *
 * monthlyRent:
 *   Preferred sources (Tier A): HUD FMR / ONS / StatCan CMHC — direct government values
 *   Fallback (Tier B): costModerate × rentShare(GDP-PPP tier):
 *     > $40k  → 0.38   (OECD Affordable Housing DB median, high-income)
 *     > $20k  → 0.32
 *     > $10k  → 0.28
 *     else    → 0.22
 *
 * housePrice (per m²):
 *   PTI (price-to-income, years of GNI per 60 m²):
 *     SG/HK → 18
 *     JP/KR/IL → 12
 *     GDP-PPP > $40k → 7
 *     > $20k → 9
 *     > $10k → 8
 *     else  → 6
 *   housePrice = round(GNI × PTI / 60)
 *   (BIS Residential Property Prices Database + Demographia Housing Affordability
 *    Survey 2023 — documented PTI tiers, no Numbeo.)
 */
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const REPO = join(ROOT, "../..");

const wb = JSON.parse(readFileSync(join(ROOT, "sources/wb-indicators.json"), "utf-8"));
const hud = JSON.parse(readFileSync(join(ROOT, "sources/hud-fmr-2024.json"), "utf-8"));
const ons = JSON.parse(readFileSync(join(ROOT, "sources/ons-uk-2026.json"), "utf-8"));
const statcan = JSON.parse(readFileSync(join(ROOT, "sources/statcan-ca-rent-2024.json"), "utf-8"));
const inputs = JSON.parse(readFileSync(join(REPO, "data/sources/cost-model-inputs.json"), "utf-8"));
const fx = JSON.parse(readFileSync(join(REPO, "public/data/exchange-rates.json"), "utf-8"));
const sot = JSON.parse(readFileSync(join(REPO, "data/cities-source.json"), "utf-8"));

// Country name (Chinese) → ISO-3166 alpha-3
const CN_TO_ISO3 = {
  "美国": "USA", "加拿大": "CAN", "墨西哥": "MEX", "巴西": "BRA", "阿根廷": "ARG",
  "智利": "CHL", "哥伦比亚": "COL", "秘鲁": "PER", "乌拉圭": "URY", "哥斯达黎加": "CRI",
  "巴拿马": "PAN", "英国": "GBR", "法国": "FRA", "德国": "DEU", "意大利": "ITA",
  "西班牙": "ESP", "葡萄牙": "PRT", "荷兰": "NLD", "比利时": "BEL", "瑞士": "CHE",
  "奥地利": "AUT", "瑞典": "SWE", "挪威": "NOR", "丹麦": "DNK", "芬兰": "FIN",
  "冰岛": "ISL", "爱尔兰": "IRL", "希腊": "GRC", "波兰": "POL", "捷克": "CZE",
  "匈牙利": "HUN", "罗马尼亚": "ROU", "保加利亚": "BGR", "克罗地亚": "HRV",
  "斯洛文尼亚": "SVN", "斯洛伐克": "SVK", "立陶宛": "LTU", "拉脱维亚": "LVA",
  "爱沙尼亚": "EST", "卢森堡": "LUX", "马耳他": "MLT", "塞浦路斯": "CYP",
  "俄罗斯": "RUS", "乌克兰": "UKR", "土耳其": "TUR", "以色列": "ISR",
  "阿联酋": "ARE", "沙特阿拉伯": "SAU", "卡塔尔": "QAT", "科威特": "KWT",
  "巴林": "BHR", "阿曼": "OMN", "约旦": "JOR",
  "埃及": "EGY", "摩洛哥": "MAR", "突尼斯": "TUN", "阿尔及利亚": "DZA",
  "肯尼亚": "KEN", "尼日利亚": "NGA", "南非": "ZAF", "埃塞俄比亚": "ETH",
  "加纳": "GHA", "坦桑尼亚": "TZA",
  "日本": "JPN", "韩国": "KOR", "中国": "CHN", "中国香港": "HKG", "新加坡": "SGP",
  "马来西亚": "MYS", "泰国": "THA", "越南": "VNM", "印度尼西亚": "IDN", "菲律宾": "PHL",
  "印度": "IND", "巴基斯坦": "PAK", "孟加拉国": "BGD", "斯里兰卡": "LKA",
  "尼泊尔": "NPL", "缅甸": "MMR", "柬埔寨": "KHM", "老挝": "LAO", "蒙古": "MNG",
  "澳大利亚": "AUS", "新西兰": "NZL", "斐济": "FJI",
  // Taiwan: not in WB — handled via IMF override below
  "台湾": null,
};

// IMF WEO 2024 fallback for Taiwan (not in WB dataset)
const IMF_OVERRIDES = {
  台湾: { hfcePerCapitaAnnualUSD: 17800, gini: 0.342, gdpPPPPerCapita: 73344, gniPerCapita: 34000 },
};

// Primary / financial city tier (public knowledge, no NB)
const PRIMARY_CITIES = new Set([
  "纽约", "伦敦", "东京", "香港", "新加坡", "巴黎", "上海", "北京", "洛杉矶",
  "旧金山", "芝加哥", "法兰克福", "苏黎世", "多伦多", "悉尼", "迪拜", "孟买",
  "圣保罗", "墨西哥城", "米兰", "马德里", "阿姆斯特丹", "首尔", "迈阿密", "硅谷（圣何塞）",
]);
const CAPITAL_NON_PRIMARY = new Set([
  "华盛顿", "渥太华", "堪培拉", "柏林", "罗马", "维也纳", "斯德哥尔摩", "奥斯陆",
  "赫尔辛基", "雷克雅未克", "哥本哈根", "都柏林", "雅典", "华沙", "布拉格",
  "布达佩斯", "里斯本", "布鲁塞尔", "伯尔尼", "惠灵顿", "布宜诺斯艾利斯", "圣地亚哥",
  "利马", "波哥大", "蒙得维的亚", "圣何塞(哥斯达黎加)", "巴拿马城", "开罗", "拉巴特",
  "内罗毕", "亚的斯亚贝巴", "安曼", "利雅得", "多哈", "马斯喀特", "科威特城",
  "麦纳麦", "阿布扎比", "雅加达", "吉隆坡", "马尼拉", "河内", "曼谷",
  "新德里", "伊斯兰堡", "达卡", "科伦坡", "加德满都", "仰光", "金边", "万象",
]);

// ─── Helpers ────────────────────────────────────────────────
function middleClassMul(gini) {
  if (gini == null) return 2.0; // median fallback
  const g = gini > 1 ? gini / 100 : gini;
  if (g < 0.32) return 1.30;
  if (g < 0.37) return 1.65;
  if (g < 0.42) return 2.30;
  if (g < 0.48) return 3.00;
  return 3.80;
}

function rentShare(gdpPPP) {
  if (gdpPPP == null) return 0.30;
  if (gdpPPP > 40000) return 0.38;
  if (gdpPPP > 20000) return 0.32;
  if (gdpPPP > 10000) return 0.28;
  return 0.22;
}

function priceToIncome(country, gdpPPP) {
  if (["新加坡", "中国香港"].includes(country)) return 18;
  if (["日本", "韩国", "以色列"].includes(country)) return 12;
  if (gdpPPP == null) return 8;
  if (gdpPPP > 40000) return 7;
  if (gdpPPP > 20000) return 9;
  if (gdpPPP > 10000) return 8;
  return 6;
}

function cityPremium(name) {
  if (PRIMARY_CITIES.has(name)) return 1.20;
  if (CAPITAL_NON_PRIMARY.has(name)) return 1.10;
  return 1.00;
}

// Eurostat country ISO alpha-2 → CN country name
const EU_ISO2_TO_CN = {
  BE: "比利时", BG: "保加利亚", CZ: "捷克", DK: "丹麦", DE: "德国", EE: "爱沙尼亚",
  IE: "爱尔兰", EL: "希腊", ES: "西班牙", FR: "法国", HR: "克罗地亚", IT: "意大利",
  CY: "塞浦路斯", LV: "拉脱维亚", LT: "立陶宛", LU: "卢森堡", HU: "匈牙利",
  MT: "马耳他", NL: "荷兰", AT: "奥地利", PL: "波兰", PT: "葡萄牙", RO: "罗马尼亚",
  SI: "斯洛文尼亚", SK: "斯洛伐克", FI: "芬兰", SE: "瑞典", IS: "冰岛", NO: "挪威",
  CH: "瑞士", UK: "英国", TR: "土耳其",
};
const CN_TO_EU_ISO2 = Object.fromEntries(Object.entries(EU_ISO2_TO_CN).map(([a, b]) => [b, a]));

function pliFor(country) {
  const iso2 = CN_TO_EU_ISO2[country];
  return iso2 ? inputs.eurostatPLI[iso2] : null;
}

// ─── Compute per city ──────────────────────────────────────
const out = {
  meta: {
    description: "Clean-pipeline cost/rent/house — zero Numbeo/Livingcost inputs",
    generated: new Date().toISOString(),
    formulaVersion: "clean-v1",
    sources: {
      hfce: "WB NE.CON.PRVT.CD / SP.POP.TOTL (CC BY 4.0)",
      gini: "WB SI.POV.GINI (CC BY 4.0)",
      gdpPPP: "WB NY.GDP.PCAP.PP.CD (CC BY 4.0)",
      gni: "WB NY.GNP.PCAP.CD (CC BY 4.0)",
      rpp: "BEA Regional Price Parities 2022 (Public Domain)",
      pli: "Eurostat PLI 2022 (CC BY 4.0)",
      usRent: "HUD FY2024 Fair Market Rent 1BR (Public Domain)",
      ukRent: "ONS Private rent and house prices UK Feb 2026 (OGL v3)",
      caRent: "StatCan Table 34-10-0133-01 2024 1BR (OGL-Canada)",
      imfTW: "IMF WEO April 2024 (for Taiwan, public)",
    },
  },
  cities: [],
};

const stats = { cost: { ok: 0, nullv: 0 }, rent: { tierA: 0, tierB: 0 }, house: 0 };
const missingCountries = new Set();

for (const city of sot.cities) {
  const iso3 = CN_TO_ISO3[city.country];
  const imf = IMF_OVERRIDES[city.country];
  let wbRec = iso3 ? wb.countries[iso3] : null;
  if (!wbRec && imf) wbRec = {};

  // Resolve base values
  const hfcePC = wbRec?.hfcePerCapitaAnnualUSD
    ?? (wbRec?.hfce && wbRec?.pop ? wbRec.hfce.value / wbRec.pop.value : null)
    ?? imf?.hfcePerCapitaAnnualUSD
    ?? null;
  const gini = (wbRec?.gini?.value ?? imf?.gini) ?? null;
  const gdpPPP = (wbRec?.gdpPPP?.value ?? imf?.gdpPPPPerCapita) ?? null;
  const gni = (wbRec?.gni?.value ?? imf?.gniPerCapita) ?? null;

  // costModerate ────────────────────────────────────────
  let cost = null, costSource = "null";
  let base = null;
  if (hfcePC) base = hfcePC / 12;
  else if (gdpPPP) { base = (gdpPPP * 0.58) / 12; costSource = "fallback"; }
  if (base) {
    const mul = middleClassMul(gini);
    let priceAdj = 1.0;
    let priceTag = "none";
    if (city.country === "美国" && inputs.usRPP[city.name] != null) {
      priceAdj = inputs.usRPP[city.name] / 100; priceTag = "BEA-RPP";
    } else if (pliFor(city.country) != null) {
      priceAdj = pliFor(city.country) / 100; priceTag = "Eurostat-PLI";
    }
    const prem = cityPremium(city.name);
    cost = Math.round(base * mul * priceAdj * prem);
    if (costSource === "null") costSource = `HFCE×Gini(${mul})×${priceTag}×prem(${prem})`;
    stats.cost.ok++;
  } else {
    stats.cost.nullv++;
    missingCountries.add(city.country);
  }

  // monthlyRent ────────────────────────────────────────
  let rent = null, rentSource = "null";
  if (city.country === "美国" && hud.cities[city.name]) {
    rent = hud.cities[city.name].fmr1BR;
    rentSource = "HUD-FMR-2024";
    stats.rent.tierA++;
  } else if (city.country === "英国" && ons.cities[city.name]) {
    const gbp = ons.cities[city.name].avgMonthlyRentGBP;
    rent = Math.round(gbp / fx.rates.GBP);
    rentSource = "ONS-2026";
    stats.rent.tierA++;
  } else if (city.country === "加拿大" && statcan.cities[city.name]) {
    const cad = statcan.cities[city.name].rent1BR_CAD;
    rent = Math.round(cad / fx.rates.CAD);
    rentSource = "StatCan-CMHC-2024";
    stats.rent.tierA++;
  } else if (cost != null) {
    rent = Math.round(cost * rentShare(gdpPPP));
    rentSource = `cost×rentShare(${rentShare(gdpPPP)})`;
    stats.rent.tierB++;
  }

  // housePrice ─────────────────────────────────────────
  let house = null, houseSource = "null";
  if (gni != null) {
    const pti = priceToIncome(city.country, gdpPPP);
    house = Math.round(gni * pti / 60);
    houseSource = `GNI×PTI(${pti})/60m²`;
    stats.house++;
  }

  out.cities.push({
    id: city.id, name: city.name, country: city.country,
    cost, costSource,
    rent, rentSource,
    house, houseSource,
    _inputs: {
      hfcePC: hfcePC ? Math.round(hfcePC) : null,
      gini, gdpPPP, gni,
    },
  });
}

console.log(`costModerate: ${stats.cost.ok}/151 (${stats.cost.nullv} null)`);
console.log(`monthlyRent:  Tier A gov-direct ${stats.rent.tierA} + Tier B formula ${stats.rent.tierB} = ${stats.rent.tierA + stats.rent.tierB}/151`);
console.log(`housePrice:   ${stats.house}/151`);
if (missingCountries.size) console.log(`Missing country data: ${[...missingCountries].join(", ")}`);

writeFileSync(join(ROOT, "output/clean-values.json"), JSON.stringify(out, null, 2) + "\n");
console.log(`\n✓ ${join(ROOT, "output/clean-values.json")}`);

console.log("\nSample:");
const samples = ["纽约", "旧金山", "伦敦", "东京", "柏林", "巴黎", "新加坡", "多伦多", "首尔", "曼谷", "孟买", "圣保罗", "胡志明市", "开普敦", "墨西哥城"];
for (const nm of samples) {
  const c = out.cities.find(x => x.name === nm);
  if (!c) continue;
  console.log(`  ${nm.padEnd(10)} cost=$${String(c.cost).padStart(5)}  rent=$${String(c.rent).padStart(5)}  house=$${String(c.house).padStart(6)}/m²  [${c.rentSource}]`);
}
