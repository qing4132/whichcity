#!/usr/bin/env node
/**
 * fetch-extended-sources.mjs — Fetch non-WB open data sources
 *
 * 1. ILO national wages → WB GNI per capita as proxy (ILO API down)
 * 2. IMF WEO → inflation forecast, GDP growth forecast
 * 3. UCDP → conflict country list (for safetyWarning enrichment)
 *
 * M-Lab NDT and OpenAQ require API keys / BigQuery — handled separately.
 */
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SOURCE_PATH = join(ROOT, "data/cities-source.json");

const COUNTRY_ISO = {
  "美国":"US","中国":"CN","中国香港":"HK","台湾":null,"日本":"JP","韩国":"KR","英国":"GB","德国":"DE",
  "法国":"FR","加拿大":"CA","澳大利亚":"AU","新加坡":"SG","荷兰":"NL","瑞士":"CH","瑞典":"SE","挪威":"NO",
  "丹麦":"DK","芬兰":"FI","爱尔兰":"IE","奥地利":"AT","比利时":"BE","卢森堡":"LU","西班牙":"ES","意大利":"IT",
  "葡萄牙":"PT","希腊":"GR","波兰":"PL","捷克":"CZ","匈牙利":"HU","罗马尼亚":"RO","保加利亚":"BG","克罗地亚":"HR",
  "斯洛伐克":"SK","斯洛文尼亚":"SI","爱沙尼亚":"EE","立陶宛":"LT","拉脱维亚":"LV","塞尔维亚":"RS","塞浦路斯":"CY",
  "新西兰":"NZ","以色列":"IL","阿联酋":"AE","卡塔尔":"QA","沙特阿拉伯":"SA","巴林":"BH","阿曼":"OM","约旦":"JO",
  "土耳其":"TR","印度":"IN","印度尼西亚":"ID","泰国":"TH","越南":"VN","菲律宾":"PH","马来西亚":"MY","柬埔寨":"KH",
  "缅甸":"MM","孟加拉国":"BD","尼泊尔":"NP","斯里兰卡":"LK","巴基斯坦":"PK","哈萨克斯坦":"KZ","乌兹别克斯坦":"UZ",
  "蒙古":"MN","格鲁吉亚":"GE","阿塞拜疆":"AZ","俄罗斯":"RU","乌克兰":"UA","伊朗":"IR","黎巴嫩":"LB",
  "埃及":"EG","摩洛哥":"MA","南非":"ZA","肯尼亚":"KE","尼日利亚":"NG","加纳":"GH","埃塞俄比亚":"ET",
  "巴西":"BR","墨西哥":"MX","阿根廷":"AR","哥伦比亚":"CO","智利":"CL","秘鲁":"PE","乌拉圭":"UY","哥斯达黎加":"CR",
  "巴拿马":"PA","厄瓜多尔":"EC","多米尼加":"DO","波多黎各":"PR"
};

// ISO2 → IMF country code mapping
const ISO2_TO_IMF = {
  US:"USA",CN:"CHN",HK:"HKG",JP:"JPN",KR:"KOR",GB:"GBR",DE:"DEU",FR:"FRA",CA:"CAN",AU:"AUS",SG:"SGP",
  NL:"NLD",CH:"CHE",SE:"SWE",NO:"NOR",DK:"DNK",FI:"FIN",IE:"IRL",AT:"AUT",BE:"BEL",LU:"LUX",ES:"ESP",
  IT:"ITA",PT:"PRT",GR:"GRC",PL:"POL",CZ:"CZE",HU:"HUN",RO:"ROU",BG:"BGR",HR:"HRV",SK:"SVK",SI:"SVN",
  EE:"EST",LT:"LTU",LV:"LVA",RS:"SRB",CY:"CYP",NZ:"NZL",IL:"ISR",AE:"ARE",QA:"QAT",SA:"SAU",BH:"BHR",
  OM:"OMN",JO:"JOR",TR:"TUR",IN:"IND",ID:"IDN",TH:"THA",VN:"VNM",PH:"PHL",MY:"MYS",KH:"KHM",MM:"MMR",
  BD:"BGD",NP:"NPL",LK:"LKA",PK:"PAK",KZ:"KAZ",UZ:"UZB",MN:"MNG",GE:"GEO",AZ:"AZE",RU:"RUS",UA:"UKR",
  IR:"IRN",LB:"LBN",EG:"EGY",MA:"MAR",ZA:"ZAF",KE:"KEN",NG:"NGA",GH:"GHA",ET:"ETH",BR:"BRA",MX:"MEX",
  AR:"ARG",CO:"COL",CL:"CHL",PE:"PER",UY:"URY",CR:"CRI",PA:"PAN",EC:"ECU",DO:"DOM",PR:"PRI"
};

async function fetchJSON(url, timeout = 20000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    return await res.json();
  } catch { clearTimeout(timer); return null; }
}

async function fetchIMF() {
  console.log("\n── 1. IMF WEO Data Mapper ──");

  // PCPIPCH = Inflation forecast, NGDP_RPCH = GDP growth forecast
  const [inflData, gdpData] = await Promise.all([
    fetchJSON("https://www.imf.org/external/datamapper/api/v1/PCPIPCH?periods=2025,2026"),
    fetchJSON("https://www.imf.org/external/datamapper/api/v1/NGDP_RPCH?periods=2025,2026"),
  ]);

  const result = {};
  if (inflData?.values?.PCPIPCH) {
    for (const [imfCode, years] of Object.entries(inflData.values.PCPIPCH)) {
      // Take 2025 forecast (or 2026 if 2025 missing)
      const val = years["2025"] ?? years["2026"];
      if (val != null) result[imfCode] = { ...(result[imfCode] || {}), inflationForecast: Math.round(val * 10) / 10 };
    }
  }
  if (gdpData?.values?.NGDP_RPCH) {
    for (const [imfCode, years] of Object.entries(gdpData.values.NGDP_RPCH)) {
      const val = years["2025"] ?? years["2026"];
      if (val != null) result[imfCode] = { ...(result[imfCode] || {}), gdpGrowthForecast: Math.round(val * 10) / 10 };
    }
  }

  console.log(`  Inflation forecasts: ${Object.values(result).filter(r => r.inflationForecast != null).length} countries`);
  console.log(`  GDP growth forecasts: ${Object.values(result).filter(r => r.gdpGrowthForecast != null).length} countries`);
  return result;
}

async function fetchWBGNI() {
  console.log("\n── 2. WB GNI per capita (ILO proxy) ──");
  // Since ILO API is down, fetch WB GNI per capita Atlas method as salary anchor proxy
  const url = "https://api.worldbank.org/v2/country/all/indicator/NY.GNP.PCAP.CD?format=json&date=2020:2024&per_page=1000";
  const result = {};
  for (let page = 1; page <= 3; page++) {
    const json = await fetchJSON(`${url}&page=${page}`);
    if (!json?.[1]) break;
    for (const e of json[1]) {
      const iso2 = e.country?.id;
      if (!iso2 || e.value == null) continue;
      if (!result[iso2] || parseInt(e.date) > parseInt(result[iso2].year)) {
        result[iso2] = { value: Math.round(e.value), year: e.date };
      }
    }
    if (json[0].page >= json[0].pages) break;
  }
  console.log(`  GNI per capita: ${Object.keys(result).length} countries`);
  return result;
}

async function fetchUCDP() {
  console.log("\n── 3. UCDP Conflict (via direct CSV) ──");
  // Try the GED CSV direct download
  const url = "https://ucdp.uu.se/downloads/ged/ged241-csv.zip";
  console.log(`  UCDP requires manual download or token. Trying country-year summary...`);

  // Alternative: use the UCDP country-level dataset (smaller)
  const altUrl = "https://ucdp.uu.se/downloads/ucdpprio/ucdp-prio-acd-241-csv.zip";
  // Both require browser download — skip automated fetch

  // Instead, hardcode known active conflicts from public knowledge (editorial)
  const activeConflicts2024 = {
    UA: "active_conflict",     // Ukraine
    MM: "active_conflict",     // Myanmar
    SD: "active_conflict",     // Sudan
    ET: "extreme_instability", // Ethiopia (Tigray aftermath)
    LB: "extreme_instability", // Lebanon (2024 conflict)
    PK: "extreme_instability", // Pakistan (terrorism)
    NG: "extreme_instability", // Nigeria (Boko Haram)
  };
  console.log(`  Using editorial conflict list: ${Object.keys(activeConflicts2024).length} countries`);
  return activeConflicts2024;
}

async function main() {
  console.log("═══ Fetch Extended Data Sources ═══");

  const sourceData = JSON.parse(readFileSync(SOURCE_PATH, "utf-8"));
  const cities = sourceData.cities;

  // 1. IMF WEO
  const imfData = await fetchIMF();

  // 2. WB GNI (ILO proxy)
  const gniData = await fetchWBGNI();

  // 3. UCDP conflicts
  const conflicts = await fetchUCDP();

  // Apply IMF data
  let imfHits = { infl: 0, gdp: 0 };
  for (const city of cities) {
    const iso2 = COUNTRY_ISO[city.country];
    const imfCode = iso2 ? ISO2_TO_IMF[iso2] : null;
    if (imfCode && imfData[imfCode]) {
      city.inflationForecast = imfData[imfCode].inflationForecast ?? null;
      city.gdpGrowthForecast = imfData[imfCode].gdpGrowthForecast ?? null;
      if (city.inflationForecast != null) imfHits.infl++;
      if (city.gdpGrowthForecast != null) imfHits.gdp++;
    } else {
      city.inflationForecast = null;
      city.gdpGrowthForecast = null;
    }
  }

  // Apply GNI
  let gniHits = 0;
  for (const city of cities) {
    const iso2 = COUNTRY_ISO[city.country];
    if (iso2 && gniData[iso2]) {
      city.gniPerCapita = gniData[iso2].value;
      gniHits++;
    } else {
      city.gniPerCapita = null;
    }
  }

  // Apply UCDP conflicts (enrich safetyWarning)
  let conflictUpdates = 0;
  for (const city of cities) {
    const iso2 = COUNTRY_ISO[city.country];
    if (iso2 && conflicts[iso2] && !city.safetyWarning) {
      city.safetyWarning = conflicts[iso2];
      conflictUpdates++;
    }
  }

  writeFileSync(SOURCE_PATH, JSON.stringify(sourceData, null, 2) + "\n", "utf-8");

  console.log("\n═══ Results ═══");
  console.log(`  IMF inflationForecast: ${imfHits.infl}/151`);
  console.log(`  IMF gdpGrowthForecast: ${imfHits.gdp}/151`);
  console.log(`  WB GNI per capita: ${gniHits}/151`);
  console.log(`  Conflict warnings updated: ${conflictUpdates}`);
  console.log(`\n✅ Written to ${SOURCE_PATH}`);
}

main().catch(console.error);
