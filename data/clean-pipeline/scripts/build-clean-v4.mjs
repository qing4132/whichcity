#!/usr/bin/env node
/**
 * build-clean-v4.mjs — Final clean pipeline.
 *
 * v4 adds: blended country price level = geomean(WB_PLI, Digital_PLI)
 *   where Digital_PLI = geomean(Netflix_c/Netflix_US, Spotify_c/Spotify_US).
 *
 * This folds in a totally independent consumer-pricing signal (companies
 * privately estimating each country's PPP) alongside national-accounts PLI.
 *
 * Rent tiers: gov (26) → airbnb (22) → formula (94).
 * House: unchanged GNI × PTI / 60m².
 */
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const REPO = join(ROOT, "../..");

const wb = JSON.parse(readFileSync(join(ROOT, "sources/wb-indicators.json"), "utf-8"));
const zillow = JSON.parse(readFileSync(join(ROOT, "sources/zillow-zori.json"), "utf-8"));
const ons = JSON.parse(readFileSync(join(ROOT, "sources/ons-uk-2026.json"), "utf-8"));
const statcan = JSON.parse(readFileSync(join(ROOT, "sources/statcan-ca-rent-2024.json"), "utf-8"));
const airbnb = JSON.parse(readFileSync(join(ROOT, "sources/airbnb-calibrated.json"), "utf-8"));
const digital = JSON.parse(readFileSync(join(ROOT, "sources/digital-pricing.json"), "utf-8"));
const inputs = JSON.parse(readFileSync(join(REPO, "data/sources/cost-model-inputs.json"), "utf-8"));
const fx = JSON.parse(readFileSync(join(REPO, "public/data/exchange-rates.json"), "utf-8"));
const sot = JSON.parse(readFileSync(join(REPO, "data/cities-source.json"), "utf-8"));

const US_ANCHOR = 3200;

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
  "台湾": null,
};
const ISO3_TO_ISO2 = {
  USA: "US", CAN: "CA", MEX: "MX", BRA: "BR", ARG: "AR", CHL: "CL", COL: "CO",
  PER: "PE", URY: "UY", CRI: "CR", PAN: "PA", GBR: "GB", FRA: "FR", DEU: "DE",
  ITA: "IT", ESP: "ES", PRT: "PT", NLD: "NL", BEL: "BE", CHE: "CH", AUT: "AT",
  SWE: "SE", NOR: "NO", DNK: "DK", FIN: "FI", ISL: "IS", IRL: "IE", GRC: "GR",
  POL: "PL", CZE: "CZ", HUN: "HU", ROU: "RO", BGR: "BG", HRV: "HR", SVN: "SI",
  SVK: "SK", LTU: "LT", LVA: "LV", EST: "EE", LUX: "LU", MLT: "MT", CYP: "CY",
  RUS: "RU", UKR: "UA", TUR: "TR", ISR: "IL", ARE: "AE", SAU: "SA", QAT: "QA",
  KWT: "KW", BHR: "BH", OMN: "OM", JOR: "JO", EGY: "EG", MAR: "MA", TUN: "TN",
  DZA: "DZ", KEN: "KE", NGA: "NG", ZAF: "ZA", ETH: "ET", GHA: "GH", TZA: "TZ",
  JPN: "JP", KOR: "KR", CHN: "CN", HKG: "HK", SGP: "SG", MYS: "MY", THA: "TH",
  VNM: "VN", IDN: "ID", PHL: "PH", IND: "IN", PAK: "PK", BGD: "BD", LKA: "LK",
  NPL: "NP", MMR: "MM", KHM: "KH", LAO: "LA", MNG: "MN", AUS: "AU", NZL: "NZ",
  FJI: "FJ",
};
const IMF_OVERRIDES = {
  台湾: { priceLevelIndex: 0.66, gdpPPPPerCapita: 73344, gniPerCapita: 34000, digitalPLIKey: "TW" },
};

const PRIMARY_CITIES = new Set([
  "纽约", "伦敦", "东京", "香港", "巴黎", "上海", "北京",
  "旧金山", "法兰克福", "苏黎世", "悉尼", "迪拜", "孟买",
  "圣保罗", "墨西哥城", "米兰", "马德里", "阿姆斯特丹", "首尔",
]);
const CAPITAL_NON_PRIMARY = new Set([
  "华盛顿", "渥太华", "堪培拉", "柏林", "罗马", "维也纳", "斯德哥尔摩",
  "奥斯陆", "赫尔辛基", "雷克雅未克", "哥本哈根", "都柏林", "雅典",
  "华沙", "布拉格", "布达佩斯", "里斯本", "布鲁塞尔", "伯尔尼", "惠灵顿",
  "布宜诺斯艾利斯", "圣地亚哥", "利马", "波哥大", "蒙得维的亚",
  "圣何塞(哥斯达黎加)", "巴拿马城", "开罗", "拉巴特", "内罗毕",
  "亚的斯亚贝巴", "安曼", "利雅得", "多哈", "马斯喀特", "科威特城",
  "麦纳麦", "阿布扎比", "雅加达", "吉隆坡", "马尼拉", "河内", "曼谷",
  "新德里", "伊斯兰堡", "达卡", "科伦坡", "加德满都", "仰光", "金边", "万象",
]);
const CITY_STATE_PREMIUM = new Set(["新加坡", "中国香港"]);

const EU_ISO2_TO_CN = {
  BE: "比利时", BG: "保加利亚", CZ: "捷克", DK: "丹麦", DE: "德国", EE: "爱沙尼亚",
  IE: "爱尔兰", EL: "希腊", ES: "西班牙", FR: "法国", HR: "克罗地亚", IT: "意大利",
  CY: "塞浦路斯", LV: "拉脱维亚", LT: "立陶宛", LU: "卢森堡", HU: "匈牙利",
  MT: "马耳他", NL: "荷兰", AT: "奥地利", PL: "波兰", PT: "葡萄牙", RO: "罗马尼亚",
  SI: "斯洛文尼亚", SK: "斯洛伐克", FI: "芬兰", SE: "瑞典", IS: "冰岛", NO: "挪威",
  CH: "瑞士", UK: "英国", TR: "土耳其",
};
const CN_TO_EU_ISO2 = Object.fromEntries(Object.entries(EU_ISO2_TO_CN).map(([a, b]) => [b, a]));

function cityPremium(name, country) {
  if (CITY_STATE_PREMIUM.has(country) || CITY_STATE_PREMIUM.has(name)) return 1.35;
  if (PRIMARY_CITIES.has(name)) return 1.20;
  if (CAPITAL_NON_PRIMARY.has(name)) return 1.10;
  return 1.00;
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

const out = {
  meta: {
    description: "Clean-pipeline v4 — blended PLI + Airbnb-calibrated rent",
    generated: new Date().toISOString(),
    formulaVersion: "clean-v4",
    anchor: `US_ANCHOR=$${US_ANCHOR} (BEA PCE core urban middle-class ex-housing)`,
    sources: {
      wbPLI: "WB Nominal/PPP GDP per capita (CC BY 4.0)",
      digitalPLI: "geomean(Netflix_c/US, Spotify_c/US), 2026-04 pricing",
      rpp: "BEA Regional Price Parities 2022 (Public Domain)",
      euPLI: "Eurostat PLI 2022 (CC BY 4.0)",
      usRent: "Zillow ZORI (market median, all homes) 2026-03",
      ukRent: "ONS Private Rent UK Feb 2026 (OGL v3)",
      caRent: "StatCan Table 34-10-0133-01 2024 1BR (OGL-Canada)",
      airbnbRent: "InsideAirbnb × K (K fit to 8 Tier A anchors, CC BY 4.0)",
      gni: "WB NY.GNP.PCAP.CD (CC BY 4.0)",
    },
  },
  cities: [],
};

const stats = { cost: 0, rentGov: 0, rentAirbnb: 0, rentFormula: 0, house: 0, missing: new Set(), digitalUsed: 0 };

for (const city of sot.cities) {
  const iso3 = CN_TO_ISO3[city.country];
  const iso2 = iso3 ? ISO3_TO_ISO2[iso3] : IMF_OVERRIDES[city.country]?.digitalPLIKey;
  const imf = IMF_OVERRIDES[city.country];
  const wbRec = iso3 ? wb.countries[iso3] : null;

  const wbPLI = wbRec?.priceLevelIndex ?? imf?.priceLevelIndex ?? null;
  const digitalPLI = iso2 ? digital.values[iso2]?.digitalPLI : null;

  // Blended country PLI
  let blendedPLI = null;
  if (wbPLI != null && digitalPLI != null) {
    blendedPLI = Math.sqrt(wbPLI * digitalPLI);
    stats.digitalUsed++;
  } else if (wbPLI != null) blendedPLI = wbPLI;
  else if (digitalPLI != null) blendedPLI = digitalPLI;

  const gdpPPP = wbRec?.gdpPPP?.value ?? imf?.gdpPPPPerCapita ?? null;
  const gni = wbRec?.gni?.value ?? imf?.gniPerCapita ?? null;

  // cost
  let cost = null, costSource = "null";
  if (blendedPLI != null) {
    const prem = cityPremium(city.name, city.country);
    let cityPriceAdj = 1.0, adjTag = "none";
    if (city.country === "美国" && inputs.usRPP[city.name] != null) {
      cityPriceAdj = inputs.usRPP[city.name] / 100; adjTag = "BEA-RPP";
    } else {
      const euIso2 = CN_TO_EU_ISO2[city.country];
      if (euIso2 && inputs.eurostatPLI[euIso2] != null) {
        cityPriceAdj = inputs.eurostatPLI[euIso2] / 100; adjTag = "Eurostat-PLI";
      }
    }
    cost = Math.round(US_ANCHOR * blendedPLI * prem * cityPriceAdj);
    const pliTag = digitalPLI != null ? `blend(wb=${wbPLI?.toFixed(2) ?? "—"},dig=${digitalPLI.toFixed(2)})` : `WB(${wbPLI.toFixed(2)})`;
    costSource = `${US_ANCHOR}×${pliTag}×prem(${prem})×${adjTag}(${cityPriceAdj.toFixed(2)})`;
    stats.cost++;
  } else {
    stats.missing.add(city.country);
  }

  // rent — layered
  let rent = null, rentSource = "null";
  if (city.country === "美国" && zillow.cities[city.name]) {
    rent = zillow.cities[city.name].rentUSD; rentSource = `Zillow-ZORI-${zillow.month}`; stats.rentGov++;
  } else if (city.country === "英国" && ons.cities[city.name]) {
    rent = Math.round(ons.cities[city.name].avgMonthlyRentGBP / fx.rates.GBP); rentSource = "ONS-2026"; stats.rentGov++;
  } else if (city.country === "加拿大" && statcan.cities[city.name]) {
    rent = Math.round(statcan.cities[city.name].rent1BR_CAD / fx.rates.CAD); rentSource = "StatCan-CMHC-2024"; stats.rentGov++;
  } else if (airbnb.synthesized[city.name]) {
    rent = airbnb.synthesized[city.name].rentUSD;
    rentSource = `InsideAirbnb×${airbnb.synthesized[city.name].multiplier.toFixed(1)}`;
    stats.rentAirbnb++;
  } else if (cost != null) {
    rent = Math.round(cost * rentShare(gdpPPP));
    rentSource = `cost×rentShare(${rentShare(gdpPPP)})`;
    stats.rentFormula++;
  }

  let house = null;
  if (gni != null) {
    const pti = priceToIncome(city.country, gdpPPP);
    house = Math.round(gni * pti / 60);
    stats.house++;
  }

  out.cities.push({
    id: city.id, name: city.name, country: city.country,
    cost, costSource, rent, rentSource, house,
    _inputs: { wbPLI, digitalPLI, blendedPLI, gdpPPP, gni },
  });
}

console.log(`v4: cost ${stats.cost}/151 (digital PLI blend used on ${stats.digitalUsed})`);
console.log(`    rent gov=${stats.rentGov} airbnb=${stats.rentAirbnb} formula=${stats.rentFormula} total=${stats.rentGov + stats.rentAirbnb + stats.rentFormula}/151`);
console.log(`    house ${stats.house}/151`);
if (stats.missing.size) console.log(`    Missing cost: ${[...stats.missing].join(", ")}`);

writeFileSync(join(ROOT, "output/clean-values-v4.json"), JSON.stringify(out, null, 2) + "\n");
console.log(`\n✓ output/clean-values-v4.json`);
