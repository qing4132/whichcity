#!/usr/bin/env node
/**
 * fetch-wb-new-indicators.mjs — Fetch 12 new World Bank indicators
 * All CC BY 4.0. Uses bulk API (all countries per indicator).
 *
 * New fields added to SOT:
 *   inflationRate        FP.CPI.TOTL.ZG       Consumer price inflation (annual %)
 *   unemploymentRate     SL.UEM.TOTL.ZS        Unemployment (% labor force, ILO modeled)
 *   gdpPppPerCapita      NY.GDP.PCAP.PP.CD     GDP per capita PPP (current int'l $)
 *   pm25                 EN.ATM.PM25.MC.M3     PM2.5 mean annual exposure (μg/m³)
 *   broadbandPer100      IT.NET.BBND.P2        Fixed broadband subscriptions per 100 people
 *   regulatoryQuality    GOV_WGI_RQ.SC         WGI Regulatory Quality (0-100) [source=3]
 *   womenBusinessLaw     SG.LAW.INDX           Women Business & Law Index (0-100)
 *   netMigration         SM.POP.NETM           Net migration (5-year estimate)
 *   nursesPerThousand    SH.MED.NUMW.P3        Nurses & midwives per 1,000 people
 *   healthExpPerCapita   SH.XPD.CHEX.PC.CD     Health expenditure per capita (current US$)
 *   co2PerCapita         EN.ATM.CO2E.PC        CO2 emissions (metric tons per capita)
 *   tertiaryEnrollment   SE.TER.ENRR           School enrollment, tertiary (% gross)
 */
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SOURCE_PATH = join(ROOT, "data/cities-source.json");

const COUNTRY_ISO = {
  "美国": "US", "中国": "CN", "中国香港": "HK", "台湾": null,
  "日本": "JP", "韩国": "KR", "英国": "GB", "德国": "DE",
  "法国": "FR", "加拿大": "CA", "澳大利亚": "AU", "新加坡": "SG",
  "荷兰": "NL", "瑞士": "CH", "瑞典": "SE", "挪威": "NO",
  "丹麦": "DK", "芬兰": "FI", "爱尔兰": "IE", "奥地利": "AT",
  "比利时": "BE", "卢森堡": "LU", "西班牙": "ES", "意大利": "IT",
  "葡萄牙": "PT", "希腊": "GR", "波兰": "PL", "捷克": "CZ",
  "匈牙利": "HU", "罗马尼亚": "RO", "保加利亚": "BG", "克罗地亚": "HR",
  "斯洛伐克": "SK", "斯洛文尼亚": "SI", "爱沙尼亚": "EE", "立陶宛": "LT",
  "拉脱维亚": "LV", "塞尔维亚": "RS", "塞浦路斯": "CY",
  "新西兰": "NZ", "以色列": "IL", "阿联酋": "AE", "卡塔尔": "QA",
  "沙特阿拉伯": "SA", "巴林": "BH", "阿曼": "OM", "约旦": "JO",
  "土耳其": "TR", "印度": "IN", "印度尼西亚": "ID", "泰国": "TH",
  "越南": "VN", "菲律宾": "PH", "马来西亚": "MY", "柬埔寨": "KH",
  "缅甸": "MM", "孟加拉国": "BD", "尼泊尔": "NP", "斯里兰卡": "LK",
  "巴基斯坦": "PK", "哈萨克斯坦": "KZ", "乌兹别克斯坦": "UZ",
  "蒙古": "MN", "格鲁吉亚": "GE", "阿塞拜疆": "AZ",
  "俄罗斯": "RU", "乌克兰": "UA", "伊朗": "IR", "黎巴嫩": "LB",
  "埃及": "EG", "摩洛哥": "MA", "南非": "ZA", "肯尼亚": "KE",
  "尼日利亚": "NG", "加纳": "GH", "埃塞俄比亚": "ET",
  "巴西": "BR", "墨西哥": "MX", "阿根廷": "AR", "哥伦比亚": "CO",
  "智利": "CL", "秘鲁": "PE", "乌拉圭": "UY", "哥斯达黎加": "CR",
  "巴拿马": "PA", "厄瓜多尔": "EC", "多米尼加": "DO",
  "波多黎各": "PR",
};

// Indicators to fetch: [fieldName, wbCode, source (null=default, 3=WGI), roundDigits]
const INDICATORS = [
  ["inflationRate",      "FP.CPI.TOTL.ZG",    null, 1],
  ["unemploymentRate",   "SL.UEM.TOTL.ZS",    null, 1],
  ["gdpPppPerCapita",    "NY.GDP.PCAP.PP.CD",  null, 0],
  ["pm25",               "EN.ATM.PM25.MC.M3",  null, 1],
  ["broadbandPer100",    "IT.NET.BBND.P2",     null, 1],
  ["regulatoryQuality",  "GOV_WGI_RQ.SC",      3,    2],
  ["womenBusinessLaw",   "SG.LAW.INDX",        null, 1],
  ["netMigration",       "SM.POP.NETM",        null, 0],
  ["nursesPerThousand",  "SH.MED.NUMW.P3",     null, 1],
  ["healthExpPerCapita", "SH.XPD.CHEX.PC.CD",  null, 0],
  ["co2PerCapita",       "EN.ATM.CO2E.PC",     null, 1],
  ["tertiaryEnrollment", "SE.TER.ENRR",        null, 1],
];

async function fetchBulk(code, source) {
  let url = `https://api.worldbank.org/v2/country/all/indicator/${code}?format=json&date=2015:2024&per_page=10000`;
  if (source) url += `&source=${source}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const ctrl = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), 30000);
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(timeout);
      if (!res.ok) return {};
      const json = await res.json();
      if (!json[1]) return {};
      const byCountry = {};
      for (const entry of json[1]) {
        const iso2 = entry.country?.id;
        if (!iso2 || entry.value == null) continue;
        if (!byCountry[iso2] || parseInt(entry.date) > parseInt(byCountry[iso2].year)) {
          byCountry[iso2] = { value: entry.value, year: entry.date };
        }
      }
      return byCountry;
    } catch (e) {
      if (attempt < 2) await new Promise(r => setTimeout(r, 2000));
    }
  }
  return {};
}

async function main() {
  console.log("═══ Fetch 12 New World Bank Indicators ═══\n");

  const sourceData = JSON.parse(readFileSync(SOURCE_PATH, "utf-8"));
  const cities = sourceData.cities;
  console.log(`${cities.length} cities\n`);

  // Fetch all indicators in parallel (12 API calls)
  console.log("Fetching all indicators...");
  const results = await Promise.all(
    INDICATORS.map(async ([field, code, source]) => {
      const data = await fetchBulk(code, source);
      const count = Object.keys(data).length;
      console.log(`  ${field} (${code}): ${count} countries`);
      return [field, data];
    })
  );

  // Build lookup
  const dataMap = Object.fromEntries(results);

  // Apply to cities
  console.log("\nApplying to cities...");
  const stats = {};
  for (const [field] of INDICATORS) stats[field] = { hit: 0, miss: 0 };

  for (const city of cities) {
    const iso = COUNTRY_ISO[city.country];
    for (const [field, , , digits] of INDICATORS) {
      if (!iso || !dataMap[field][iso]) {
        city[field] = null;
        stats[field].miss++;
      } else {
        const raw = dataMap[field][iso].value;
        city[field] = digits === 0 ? Math.round(raw) : Math.round(raw * (10 ** digits)) / (10 ** digits);
        stats[field].hit++;
      }
    }
  }

  writeFileSync(SOURCE_PATH, JSON.stringify(sourceData, null, 2) + "\n", "utf-8");

  console.log("\n═══ Results ═══");
  for (const [field] of INDICATORS) {
    const s = stats[field];
    console.log(`  ${field}: ${s.hit}/${cities.length} (miss: ${s.miss})`);
  }
  console.log(`\n✅ Written to ${SOURCE_PATH}`);
}

main().catch(console.error);
