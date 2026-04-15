#!/usr/bin/env node
/**
 * rebuild-cost-data.mjs — Rebuild costModerate / monthlyRent / housePrice
 *
 * Method (100% open data, transparent):
 *   costModerate = gdpPppPerCapita / 12 × consumptionShare × cityPremium
 *     - gdpPppPerCapita: WB NY.GDP.PCAP.PP.CD (CC BY 4.0), already in SOT
 *     - consumptionShare: WB NE.CON.TOTL.ZS (household+gov consumption % GDP)
 *     - cityPremium: 1.15 for capital/primary cities (well-documented urbanization factor)
 *
 *   monthlyRent = costModerate × rentShare
 *     - rentShare varies by income level: 35-40% (developed), 25-30% (developing)
 *
 *   housePrice = gniPerCapita × priceToIncomeRatio / 60m²
 *     - gniPerCapita: WB NY.GNP.PCAP.CD (CC BY 4.0), already in SOT
 *     - priceToIncomeRatio: regional averages (public knowledge)
 *
 * All estimates are clearly labeled. Not survey data.
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

// Fetch WB consumption share (% of GDP)
async function fetchConsumptionShare() {
  const result = {};
  for (let page = 1; page <= 3; page++) {
    const url = `https://api.worldbank.org/v2/country/all/indicator/NE.CON.TOTL.ZS?format=json&date=2020:2024&per_page=1000&page=${page}`;
    try {
      const res = await fetch(url);
      const json = await res.json();
      if (!json[1]) break;
      for (const e of json[1]) {
        const iso2 = e.country?.id;
        if (!iso2 || e.value == null) continue;
        if (!result[iso2] || parseInt(e.date) > parseInt(result[iso2].year)) {
          result[iso2] = { value: e.value / 100, year: e.date }; // Convert % to ratio
        }
      }
      if (json[0].page >= json[0].pages) break;
    } catch { break; }
  }
  return result;
}

function main_sync(consumptionData) {
  const sourceData = JSON.parse(readFileSync(SOURCE_PATH, "utf-8"));
  const cities = sourceData.cities;

  const CITY_PREMIUM = 1.05; // Reduced from 1.15 after cross-validation: salary/cost ratio check
  let stats = { costMod: 0, rent: 0, house: 0 };

  for (const city of cities) {
    const iso = COUNTRY_ISO[city.country];
    const gdpPPP = city.gdpPppPerCapita;
    const gni = city.gniPerCapita;

    // costModerate: GDP PPP per capita × consumption share × city premium / 12 months
    if (gdpPPP && iso) {
      const consShare = consumptionData[iso]?.value || 0.60; // Default 60% if missing
      const monthlyCost = Math.round(gdpPPP * consShare * CITY_PREMIUM / 12);
      city.costModerate = monthlyCost;
      stats.costMod++;
    } else if (gdpPPP) {
      // No ISO (Taiwan) — use default consumption share
      city.costModerate = Math.round(gdpPPP * 0.55 * CITY_PREMIUM / 12);
      stats.costMod++;
    } else {
      city.costModerate = null;
    }

    // monthlyRent: portion of costModerate
    // Rent share of total expenditure varies by development level
    if (city.costModerate) {
      let rentShare;
      if (gdpPPP > 40000) rentShare = 0.38;       // High income
      else if (gdpPPP > 20000) rentShare = 0.33;   // Upper middle
      else if (gdpPPP > 10000) rentShare = 0.28;   // Lower middle
      else rentShare = 0.22;                        // Low income
      city.monthlyRent = Math.round(city.costModerate * rentShare);
      stats.rent++;
    } else {
      city.monthlyRent = null;
    }

    // housePrice per m²: GNI × price-to-income ratio / typical flat size
    if (gni) {
      // Price-to-income ratios by region (widely published public knowledge)
      let pti;
      if (["SG","HK"].includes(iso)) pti = 18;           // City-states, extreme
      else if (["JP","KR","IL"].includes(iso)) pti = 12;  // High-density Asia/Israel
      else if (gdpPPP > 40000) pti = 7;                   // Rich Western
      else if (gdpPPP > 20000) pti = 9;                   // Upper middle
      else if (gdpPPP > 10000) pti = 8;                   // Lower middle
      else pti = 6;                                        // Low income
      // Typical city-center 1BR ≈ 50-70m², use 60m² as reference
      city.housePrice = Math.round(gni * pti / 60);
      stats.house++;
    } else {
      city.housePrice = null;
    }
  }

  writeFileSync(SOURCE_PATH, JSON.stringify(sourceData, null, 2) + "\n", "utf-8");

  console.log(`\n═══ Results ═══`);
  console.log(`  costModerate: ${stats.costMod}/${cities.length}`);
  console.log(`  monthlyRent:  ${stats.rent}/${cities.length}`);
  console.log(`  housePrice:   ${stats.house}/${cities.length}`);

  console.log(`\n═══ Samples ═══`);
  for (const name of ["纽约", "伦敦", "东京", "新加坡", "柏林", "曼谷", "胡志明市", "拉各斯", "台北"]) {
    const c = cities.find(x => x.name === name);
    if (c) console.log(`  ${name}: cost=$${c.costModerate}/mo  rent=$${c.monthlyRent}/mo  house=$${c.housePrice}/m²`);
  }

  console.log(`\n⚠️  Method: WB GDP PPP per capita × consumption share × 1.05 city premium`);
  console.log(`   These are open-data estimates. Source: WB CC BY 4.0`);
}

async function main() {
  console.log("═══ Rebuild Cost Data ═══\n");
  console.log("Fetching WB consumption share (NE.CON.TOTL.ZS)...");
  const consData = await fetchConsumptionShare();
  console.log(`  ${Object.keys(consData).length} countries`);
  main_sync(consData);
  console.log(`\n✅ Done`);
}

main().catch(console.error);
