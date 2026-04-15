#!/usr/bin/env node
/**
 * fetch-remaining-replacements.mjs
 *
 * Fetches replacement data for remaining tainted fields:
 *   1. democracyIndex → WB WGI Voice & Accountability GOV_WGI_VA.SC (CC BY 4.0)
 *      Replaces EIU Democracy Index. Scale: 0-100 (already normalized)
 *   2. annualWorkHours → ILO ILOSTAT (CC BY 4.0)
 *      Replaces OECD data (CC BY-NC-SA)
 *
 * internetSpeedMbps requires M-Lab BigQuery (separate task).
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

async function fetchAllCountries(indicator, source) {
  let url = `https://api.worldbank.org/v2/country/all/indicator/${indicator}?format=json&date=2018:2024&per_page=5000`;
  if (source) url += `&source=${source}`;
  console.log(`  Fetching ${indicator}...`);
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const ctrl = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), 30000);
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(timeout);
      if (!res.ok) { console.log(`    HTTP ${res.status}`); return {}; }
      const json = await res.json();
      if (!json[1]) { console.log(`    No data`); return {}; }
      const byCountry = {};
      for (const entry of json[1]) {
        const iso2 = entry.country?.id;
        if (!iso2 || entry.value == null) continue;
        if (!byCountry[iso2] || parseInt(entry.date) > parseInt(byCountry[iso2].year)) {
          byCountry[iso2] = { value: Math.round(entry.value * 100) / 100, year: entry.date };
        }
      }
      console.log(`    Got ${Object.keys(byCountry).length} countries`);
      return byCountry;
    } catch (e) {
      console.log(`    Attempt ${attempt + 1} failed: ${e.message}`);
      if (attempt < 2) await new Promise(r => setTimeout(r, 2000));
    }
  }
  return {};
}

async function fetchILOWorkHours() {
  // ILO ILOSTAT: Mean weekly hours actually worked per employed person
  // Indicator: HOW_TEMP_SEX_ECO_NB_A (annual, total economy)
  // API docs: https://ilostat.ilo.org/data/
  const url = "https://rplumber.ilo.org/data/indicator/?id=HOW_TEMP_SEX_ECO_NB_A&timefrom=2019&timeto=2024&type=label&format=.json";
  console.log("  Fetching ILO work hours...");
  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 30000);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timeout);
    if (!res.ok) {
      console.log(`    ILO HTTP ${res.status}, trying alternative...`);
      return null;
    }
    const data = await res.json();
    console.log(`    Got ${data.length} records`);
    // Group by ref_area (ISO3), filter sex=Total, classif1=Total, take latest
    const byCountry = {};
    for (const row of data) {
      if (row.sex !== "Sex: Total" && row.sex !== "Total") continue;
      if (row.classif1 && !row.classif1.includes("Total")) continue;
      const iso3 = row.ref_area;
      const year = parseInt(row.time);
      const weeklyHours = parseFloat(row.obs_value);
      if (!iso3 || isNaN(weeklyHours) || isNaN(year)) continue;
      if (!byCountry[iso3] || year > byCountry[iso3].year) {
        byCountry[iso3] = { weeklyHours, year, annualHours: Math.round(weeklyHours * 52) };
      }
    }
    return byCountry;
  } catch (e) {
    console.log(`    ILO fetch failed: ${e.message}`);
    return null;
  }
}

// ISO3 → ISO2 for ILO data mapping
const ISO3_TO_ISO2 = {
  USA: "US", GBR: "GB", JPN: "JP", CHN: "CN", AUS: "AU", SGP: "SG",
  FRA: "FR", CAN: "CA", HKG: "HK", ARE: "AE", NLD: "NL", CHE: "CH",
  DEU: "DE", ESP: "ES", ITA: "IT", BEL: "BE", AUT: "AT", CZE: "CZ",
  POL: "PL", PRT: "PT", GRC: "GR", TUR: "TR", MEX: "MX", BRA: "BR",
  NZL: "NZ", THA: "TH", MYS: "MY", VNM: "VN", IND: "IN", KEN: "KE",
  NOR: "NO", SWE: "SE", DNK: "DK", FIN: "FI", IRL: "IE", LUX: "LU",
  HUN: "HU", ROU: "RO", BGR: "BG", HRV: "HR", SVK: "SK", SVN: "SI",
  EST: "EE", LTU: "LT", LVA: "LV", SRB: "RS", CYP: "CY",
  ISR: "IL", QAT: "QA", SAU: "SA", BHR: "BH", OMN: "OM", JOR: "JO",
  IDN: "ID", PHL: "PH", KHM: "KH", MMR: "MM", BGD: "BD", NPL: "NP",
  LKA: "LK", PAK: "PK", KAZ: "KZ", UZB: "UZ", MNG: "MN", GEO: "GE",
  AZE: "AZ", RUS: "RU", UKR: "UA", IRN: "IR", LBN: "LB",
  EGY: "EG", MAR: "MA", ZAF: "ZA", NGA: "NG", GHA: "GH", ETH: "ET",
  ARG: "AR", COL: "CO", CHL: "CL", PER: "PE", URY: "UY", CRI: "CR",
  PAN: "PA", ECU: "EC", DOM: "DO", KOR: "KR", PRI: "PR", TWN: null,
};

async function main() {
  console.log("═══ Fetch Remaining Replacement Data ═══\n");

  const sourceData = JSON.parse(readFileSync(SOURCE_PATH, "utf-8"));
  const cities = sourceData.cities;

  // 1. Democracy → WGI Voice & Accountability (0-100)
  console.log("1. Democracy Index → WGI Voice & Accountability");
  const vaData = await fetchAllCountries("GOV_WGI_VA.SC", 3);

  let vaUpdated = 0, vaMissing = 0;
  for (const city of cities) {
    const iso = COUNTRY_ISO[city.country];
    if (!iso) { vaMissing++; continue; }
    if (vaData[iso]) {
      // WGI VA.SC is 0-100, EIU was 0-10. Store as 0-10 to maintain field semantics
      // (export.mjs does democracyNorm = democracyIndex * 10)
      city.democracyIndex = Math.round(vaData[iso].value) / 10;
      vaUpdated++;
    } else {
      city.democracyIndex = null;
      vaMissing++;
    }
  }
  console.log(`  Updated: ${vaUpdated}, Missing: ${vaMissing}\n`);

  // 2. Work Hours → ILO ILOSTAT
  console.log("2. Annual Work Hours → ILO ILOSTAT");
  const iloData = await fetchILOWorkHours();

  if (iloData) {
    // Build ISO2 lookup from ILO's ISO3 data
    const iloByIso2 = {};
    for (const [iso3, data] of Object.entries(iloData)) {
      const iso2 = ISO3_TO_ISO2[iso3];
      if (iso2) iloByIso2[iso2] = data;
    }

    let iloUpdated = 0, iloMissing = 0;
    for (const city of cities) {
      const iso = COUNTRY_ISO[city.country];
      if (!iso) { iloMissing++; continue; }
      if (iloByIso2[iso]) {
        city.annualWorkHours = iloByIso2[iso].annualHours;
        iloUpdated++;
      } else {
        // Keep existing value if ILO doesn't have it
        iloMissing++;
      }
    }
    console.log(`  Updated: ${iloUpdated}, Missing/kept: ${iloMissing}`);
    console.log(`  ILO countries available: ${Object.keys(iloByIso2).length}\n`);
  } else {
    console.log("  ILO API unavailable, skipping. Existing data kept.\n");
  }

  // Write back
  writeFileSync(SOURCE_PATH, JSON.stringify(sourceData, null, 2) + "\n", "utf-8");

  console.log("═══ Summary ═══");
  console.log(`democracyIndex: ${vaUpdated}/${cities.length} updated (WGI VA.SC → /10 for compat)`);
  if (iloData) console.log(`annualWorkHours: ILO data applied`);
  console.log(`\n✅ Written to ${SOURCE_PATH}`);
}

main().catch(console.error);
