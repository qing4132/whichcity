#!/usr/bin/env node
/**
 * build-clean-v7.mjs — FINAL. Best-of-breed per city per metric.
 *
 * Core principle: use v4 (WB+Digital geomean PLI) as the *base* cost formula
 * because Big Mac / iPhone signals introduced brand-premium bias in v5.
 * Overlay official/anchor data wherever available:
 *
 *   COST (USD/mo):
 *     base = US_ANCHOR × geomean(WB_PLI, Digital_PLI) × city_premium × city_adj
 *       city_adj = BEA_RPP (US) | Eurostat_PLI (EU) | none
 *
 *   RENT (USD/mo) — waterfall, first hit wins:
 *     1. Zillow ZORI 1BR (US, 2026-03)
 *     2. ONS UK Private Rent (2026-02)
 *     3. StatCan CMHC CA 1BR (2024)
 *     4. InsideAirbnb × K calibration (22 cities)
 *     5. v5 baseline × NBS_2026-03 YoY (CN: baseline drift correction)
 *     6. cost × rentShare(GDP) — last resort
 *
 *   SALARY (anchor only, attached; does not replace prod):
 *     7. H1B LCA p50 for 17 US MSAs × 15 SOC
 *
 *   METADATA (attached for UI badges / risk flags):
 *     - FH total (governance)
 *     - UBS GREBI bubble risk
 *     - OSM amenity quality index
 *     - NBS YoY/Q1avg (CN housing trend)
 */
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const REPO = join(ROOT, "../..");

const wb       = JSON.parse(readFileSync(join(ROOT, "sources/wb-indicators.json"), "utf-8"));
const zillow   = JSON.parse(readFileSync(join(ROOT, "sources/zillow-zori.json"), "utf-8"));
const ons      = JSON.parse(readFileSync(join(ROOT, "sources/ons-uk-2026.json"), "utf-8"));
const statcan  = JSON.parse(readFileSync(join(ROOT, "sources/statcan-ca-rent-2024.json"), "utf-8"));
const airbnb   = JSON.parse(readFileSync(join(ROOT, "sources/airbnb-calibrated.json"), "utf-8"));
const digital  = JSON.parse(readFileSync(join(ROOT, "sources/digital-pricing.json"), "utf-8"));
const fh       = JSON.parse(readFileSync(join(ROOT, "sources/freedom/fh-latest.json"), "utf-8"));
const nbs      = JSON.parse(readFileSync(join(ROOT, "sources/china/nbs-70cities-2026-03.json"), "utf-8"));
const ubs      = JSON.parse(readFileSync(join(ROOT, "sources/ubs/grebi-2025.json"), "utf-8"));
const osm      = JSON.parse(readFileSync(join(ROOT, "output/osm-quality-index.json"), "utf-8"));
const h1b      = JSON.parse(readFileSync(join(ROOT, "output/h1b-salary-anchors.json"), "utf-8"));
const inputs   = JSON.parse(readFileSync(join(REPO, "data/sources/cost-model-inputs.json"), "utf-8"));
const fx       = JSON.parse(readFileSync(join(REPO, "public/data/exchange-rates.json"), "utf-8"));
const sot      = JSON.parse(readFileSync(join(REPO, "data/cities-source.json"), "utf-8"));
const prod     = JSON.parse(readFileSync(join(REPO, "public/data/cities.json"), "utf-8"));
const prodBy   = new Map((prod.cities ?? prod).map(c => [c.name, c]));

const US_ANCHOR = 3200;

const CN_TO_ISO3 = {"美国":"USA","加拿大":"CAN","墨西哥":"MEX","巴西":"BRA","阿根廷":"ARG","智利":"CHL","哥伦比亚":"COL","秘鲁":"PER","乌拉圭":"URY","哥斯达黎加":"CRI","巴拿马":"PAN","英国":"GBR","法国":"FRA","德国":"DEU","意大利":"ITA","西班牙":"ESP","葡萄牙":"PRT","荷兰":"NLD","比利时":"BEL","瑞士":"CHE","奥地利":"AUT","瑞典":"SWE","挪威":"NOR","丹麦":"DNK","芬兰":"FIN","冰岛":"ISL","爱尔兰":"IRL","希腊":"GRC","波兰":"POL","捷克":"CZE","匈牙利":"HUN","罗马尼亚":"ROU","保加利亚":"BGR","克罗地亚":"HRV","斯洛文尼亚":"SVN","斯洛伐克":"SVK","立陶宛":"LTU","拉脱维亚":"LVA","爱沙尼亚":"EST","卢森堡":"LUX","马耳他":"MLT","塞浦路斯":"CYP","俄罗斯":"RUS","乌克兰":"UKR","土耳其":"TUR","以色列":"ISR","阿联酋":"ARE","沙特阿拉伯":"SAU","卡塔尔":"QAT","科威特":"KWT","巴林":"BHR","阿曼":"OMN","约旦":"JOR","埃及":"EGY","摩洛哥":"MAR","突尼斯":"TUN","阿尔及利亚":"DZA","肯尼亚":"KEN","尼日利亚":"NGA","南非":"ZAF","埃塞俄比亚":"ETH","加纳":"GHA","坦桑尼亚":"TZA","日本":"JPN","韩国":"KOR","中国":"CHN","中国香港":"HKG","新加坡":"SGP","马来西亚":"MYS","泰国":"THA","越南":"VNM","印度尼西亚":"IDN","菲律宾":"PHL","印度":"IND","巴基斯坦":"PAK","孟加拉国":"BGD","斯里兰卡":"LKA","尼泊尔":"NPL","缅甸":"MMR","柬埔寨":"KHM","老挝":"LAO","蒙古":"MNG","澳大利亚":"AUS","新西兰":"NZL","斐济":"FJI","台湾":null};
const ISO3_TO_ISO2 = {USA:"US",CAN:"CA",MEX:"MX",BRA:"BR",ARG:"AR",CHL:"CL",COL:"CO",PER:"PE",URY:"UY",CRI:"CR",PAN:"PA",GBR:"GB",FRA:"FR",DEU:"DE",ITA:"IT",ESP:"ES",PRT:"PT",NLD:"NL",BEL:"BE",CHE:"CH",AUT:"AT",SWE:"SE",NOR:"NO",DNK:"DK",FIN:"FI",ISL:"IS",IRL:"IE",GRC:"GR",POL:"PL",CZE:"CZ",HUN:"HU",ROU:"RO",BGR:"BG",HRV:"HR",SVN:"SI",SVK:"SK",LTU:"LT",LVA:"LV",EST:"EE",LUX:"LU",MLT:"MT",CYP:"CY",RUS:"RU",UKR:"UA",TUR:"TR",ISR:"IL",ARE:"AE",SAU:"SA",QAT:"QA",KWT:"KW",BHR:"BH",OMN:"OM",JOR:"JO",EGY:"EG",MAR:"MA",TUN:"TN",DZA:"DZ",KEN:"KE",NGA:"NG",ZAF:"ZA",ETH:"ET",GHA:"GH",TZA:"TZ",JPN:"JP",KOR:"KR",CHN:"CN",HKG:"HK",SGP:"SG",MYS:"MY",THA:"TH",VNM:"VN",IDN:"ID",PHL:"PH",IND:"IN",PAK:"PK",BGD:"BD",LKA:"LK",NPL:"NP",MMR:"MM",KHM:"KH",LAO:"LA",MNG:"MN",AUS:"AU",NZL:"NZ",FJI:"FJ"};
const CN_TO_FH_NAME = {"美国":"United States","英国":"United Kingdom","韩国":"South Korea","中国":"China","中国香港":"Hong Kong","台湾":"Taiwan","德国":"Germany","法国":"France","意大利":"Italy","西班牙":"Spain","俄罗斯":"Russia","瑞士":"Switzerland","日本":"Japan","新加坡":"Singapore","印度":"India","泰国":"Thailand","越南":"Vietnam","印度尼西亚":"Indonesia","菲律宾":"Philippines","马来西亚":"Malaysia","阿联酋":"United Arab Emirates","沙特阿拉伯":"Saudi Arabia","卡塔尔":"Qatar","以色列":"Israel","土耳其":"Turkey","埃及":"Egypt","南非":"South Africa","尼日利亚":"Nigeria","肯尼亚":"Kenya","摩洛哥":"Morocco","澳大利亚":"Australia","新西兰":"New Zealand","加拿大":"Canada","墨西哥":"Mexico","巴西":"Brazil","阿根廷":"Argentina","智利":"Chile","哥伦比亚":"Colombia","秘鲁":"Peru","荷兰":"Netherlands","比利时":"Belgium","奥地利":"Austria","瑞典":"Sweden","挪威":"Norway","丹麦":"Denmark","芬兰":"Finland","冰岛":"Iceland","爱尔兰":"Ireland","希腊":"Greece","葡萄牙":"Portugal","波兰":"Poland","捷克":"Czech Republic","匈牙利":"Hungary","罗马尼亚":"Romania","克罗地亚":"Croatia","保加利亚":"Bulgaria","乌克兰":"Ukraine","伊朗":"Iran","黎巴嫩":"Lebanon","约旦":"Jordan","阿曼":"Oman","巴林":"Bahrain","科威特":"Kuwait"};
const IMF_OVERRIDES = {台湾:{priceLevelIndex:0.66,gdpPPPPerCapita:73344,gniPerCapita:34000,digitalPLIKey:"TW"}};

const PRIMARY_CITIES = new Set(["纽约","伦敦","东京","香港","巴黎","上海","北京","旧金山","法兰克福","苏黎世","悉尼","迪拜","孟买","圣保罗","墨西哥城","米兰","马德里","阿姆斯特丹","首尔"]);
const CAPITAL_NON_PRIMARY = new Set(["华盛顿","渥太华","堪培拉","柏林","罗马","维也纳","斯德哥尔摩","奥斯陆","赫尔辛基","雷克雅未克","哥本哈根","都柏林","雅典","华沙","布拉格","布达佩斯","里斯本","布鲁塞尔","伯尔尼","惠灵顿","布宜诺斯艾利斯","圣地亚哥","利马","波哥大","蒙得维的亚","圣何塞(哥斯达黎加)","巴拿马城","开罗","拉巴特","内罗毕","亚的斯亚贝巴","安曼","利雅得","多哈","马斯喀特","科威特城","麦纳麦","阿布扎比","雅加达","吉隆坡","马尼拉","河内","曼谷","新德里","伊斯兰堡","达卡","科伦坡","加德满都","仰光","金边","万象"]);
const CITY_STATE_PREMIUM = new Set(["新加坡","中国香港"]);
const EU_ISO2_TO_CN = {BE:"比利时",BG:"保加利亚",CZ:"捷克",DK:"丹麦",DE:"德国",EE:"爱沙尼亚",IE:"爱尔兰",EL:"希腊",ES:"西班牙",FR:"法国",HR:"克罗地亚",IT:"意大利",CY:"塞浦路斯",LV:"拉脱维亚",LT:"立陶宛",LU:"卢森堡",HU:"匈牙利",MT:"马耳他",NL:"荷兰",AT:"奥地利",PL:"波兰",PT:"葡萄牙",RO:"罗马尼亚",SI:"斯洛文尼亚",SK:"斯洛伐克",FI:"芬兰",SE:"瑞典",IS:"冰岛",NO:"挪威",CH:"瑞士",UK:"英国",TR:"土耳其"};
const CN_TO_EU_ISO2 = Object.fromEntries(Object.entries(EU_ISO2_TO_CN).map(([a,b])=>[b,a]));

const CN_TO_MSA = {"纽约":"New York-Newark-Jersey City","旧金山":"San Francisco-Oakland-Berkeley","圣何塞":"San Jose-Sunnyvale-Santa Clara","洛杉矶":"Los Angeles-Long Beach-Anaheim","圣地亚哥(美)":"San Diego-Chula Vista","西雅图":"Seattle-Tacoma-Bellevue","波士顿":"Boston-Cambridge-Newton","华盛顿":"Washington-Arlington-Alexandria","芝加哥":"Chicago-Naperville-Elgin","亚特兰大":"Atlanta-Sandy Springs-Alpharetta","迈阿密":"Miami-Fort Lauderdale-West Palm Beach","休斯顿":"Houston-The Woodlands-Sugar Land","达拉斯":"Dallas-Fort Worth-Arlington","奥斯汀":"Austin-Round Rock","圣安东尼奥":"San Antonio-New Braunfels","丹佛":"Denver-Aurora-Lakewood","波特兰":"Portland-Vancouver-Hillsboro","费城":"Philadelphia-Camden-Wilmington","凤凰城":"Phoenix-Mesa-Chandler","夏洛特":"Charlotte-Concord-Gastonia","罗利":"Raleigh-Cary","明尼阿波利斯":"Minneapolis-St. Paul-Bloomington","匹兹堡":"Pittsburgh"};
const SOC_CODES = {softwareDeveloper:"15-1252.00",dataScientist:"15-2051.00",itProjectManager:"15-1299.09",managementAnalyst:"13-1111.00",financialAnalyst:"13-2051.00",accountant:"13-2011.00",electricalEngineer:"17-2071.00",mechanicalEngineer:"17-2141.00",civilEngineer:"17-2051.00",registeredNurse:"29-1141.00",pharmacist:"29-1051.00",marketResearchAnalyst:"13-1161.00",csMgr:"11-3021.00"};
const CN_TO_NBS = {"北京":"北京","上海":"上海","广州":"广州","深圳":"深圳","成都":"成都","杭州":"杭州","南京":"南京","武汉":"武汉","西安":"西安","重庆":"重庆","天津":"天津","青岛":"青岛","厦门":"厦门","大连":"大连","长沙":"长沙","郑州":"郑州","昆明":"昆明","沈阳":"沈阳","合肥":"合肥","宁波":"宁波","济南":"济南","无锡":"无锡","南昌":"南昌","福州":"福州","哈尔滨":"哈尔滨"};
const CN_TO_UBS = {"迈阿密":"Miami","东京":"Tokyo","苏黎世":"Zurich","洛杉矶":"Los Angeles","迪拜":"Dubai","阿姆斯特丹":"Amsterdam","日内瓦":"Geneva","多伦多":"Toronto","悉尼":"Sydney","马德里":"Madrid","法兰克福":"Frankfurt","温哥华":"Vancouver","慕尼黑":"Munich","新加坡":"Singapore","中国香港":"Hong Kong","伦敦":"London","旧金山":"San Francisco","纽约":"New York","巴黎":"Paris","米兰":"Milan","圣保罗":"São Paulo"};

const geomean = (arr) => Math.exp(arr.reduce((s, r) => s + Math.log(r), 0) / arr.length);
function cityPremium(name, country) {
  if (CITY_STATE_PREMIUM.has(country) || CITY_STATE_PREMIUM.has(name)) return 1.35;
  if (PRIMARY_CITIES.has(name)) return 1.20;
  if (CAPITAL_NON_PRIMARY.has(name)) return 1.10;
  return 1.00;
}
function rentShare(g) { if (g == null) return 0.30; if (g > 40000) return 0.38; if (g > 20000) return 0.32; if (g > 10000) return 0.28; return 0.22; }
function priceToIncome(country, g) { if (["新加坡","中国香港"].includes(country)) return 18; if (["日本","韩国","以色列"].includes(country)) return 12; if (g == null) return 8; if (g > 40000) return 7; if (g > 20000) return 9; if (g > 10000) return 8; return 6; }

const ubsByCity = Object.fromEntries(ubs.cities.map(c => [c.city, c]));
const osmByCity = osm.cities; // dict: city → { raw, normalized, qualityIndex }

const out = {
  meta: {
    formulaVersion: "clean-v7-final",
    description: "Final: v4 PLI base + H1B US salary anchor + NBS CN rent drift + FH/UBS/OSM metadata",
    generated: new Date().toISOString(),
    anchor: `US_ANCHOR=$${US_ANCHOR}`,
    strategy: "best-of-breed waterfall per metric per city",
    sources: {
      costBase: "v4 formula = US_ANCHOR × geomean(WB_PLI, Digital_PLI) × city_premium × city_adj",
      rentWaterfall: ["Zillow ZORI (US)","ONS (UK)","StatCan CMHC (CA)","InsideAirbnb×K (22)","v5 baseline × NBS YoY (CN)","cost × rentShare"],
      salaryAnchor: "H1B LCA p50 (US 17 cities × 15 SOC)",
      metadata: ["FH governance","UBS GREBI bubble","OSM amenity quality"],
    },
  },
  cities: [],
};

const stats = { cost:0, rentZillow:0, rentOns:0, rentStatcan:0, rentAirbnb:0, rentNbs:0, rentFormula:0, h1b:0, nbs:0, ubs:0, osm:0, fh:0 };

for (const city of sot.cities) {
  const iso3 = CN_TO_ISO3[city.country];
  const iso2 = iso3 ? ISO3_TO_ISO2[iso3] : IMF_OVERRIDES[city.country]?.digitalPLIKey;
  const imf = IMF_OVERRIDES[city.country];
  const wbRec = iso3 ? wb.countries[iso3] : null;

  const wbPLI = wbRec?.priceLevelIndex ?? imf?.priceLevelIndex ?? null;
  const digitalPLI = iso2 ? (digital.values[iso2]?.digitalPLI ?? null) : null;
  const signals = [wbPLI, digitalPLI].filter(v => v != null && v > 0);
  const blendedPLI = signals.length ? geomean(signals) : null;

  const gdpPPP = wbRec?.gdpPPP?.value ?? imf?.gdpPPPPerCapita ?? null;
  const gni = wbRec?.gni?.value ?? imf?.gniPerCapita ?? null;

  // === COST ===
  let cost = null, costSource = "null";
  if (blendedPLI != null) {
    const prem = cityPremium(city.name, city.country);
    let adj = 1.0, adjTag = "none";
    if (city.country === "美国" && inputs.usRPP[city.name] != null) { adj = inputs.usRPP[city.name]/100; adjTag = "BEA-RPP"; }
    else { const e = CN_TO_EU_ISO2[city.country]; if (e && inputs.eurostatPLI[e] != null) { adj = inputs.eurostatPLI[e]/100; adjTag = "Eurostat-PLI"; } }
    cost = Math.round(US_ANCHOR * blendedPLI * prem * adj);
    costSource = `v4:US${US_ANCHOR}×geomean(wbPLI=${wbPLI?.toFixed(2)},digPLI=${digitalPLI?.toFixed(2)})×prem${prem}×${adjTag}${adj.toFixed(2)}`;
    stats.cost++;
  }

  // === RENT WATERFALL ===
  let rent = null, rentSource = "null";
  if (city.country === "美国" && zillow.cities[city.name]) {
    rent = zillow.cities[city.name].rentUSD; rentSource = `Zillow-ZORI-${zillow.month}`; stats.rentZillow++;
  } else if (city.country === "英国" && ons.cities[city.name]) {
    rent = Math.round(ons.cities[city.name].avgMonthlyRentGBP / fx.rates.GBP); rentSource = "ONS-2026"; stats.rentOns++;
  } else if (city.country === "加拿大" && statcan.cities[city.name]) {
    rent = Math.round(statcan.cities[city.name].rent1BR_CAD / fx.rates.CAD); rentSource = "StatCan-CMHC-2024"; stats.rentStatcan++;
  } else if (airbnb.synthesized[city.name]) {
    rent = airbnb.synthesized[city.name].rentUSD; rentSource = `InsideAirbnb×${airbnb.synthesized[city.name].multiplier.toFixed(1)}`; stats.rentAirbnb++;
  } else if (city.country === "中国" && CN_TO_NBS[city.name] && prodBy.has(city.name)) {
    // CN: apply NBS secondHand YoY drift to production baseline (converted USD)
    const n = nbs.secondHand[CN_TO_NBS[city.name]];
    const baselineUSD = prodBy.get(city.name).monthlyRent; // already USD
    if (n && baselineUSD) {
      rent = Math.round(baselineUSD * (n.yoy / 100));
      rentSource = `prod-USD(${baselineUSD})×NBS-2hand-YoY(${n.yoy}%)`;
      stats.rentNbs++;
    }
  }
  if (rent == null && cost != null) {
    rent = Math.round(cost * rentShare(gdpPPP)); rentSource = `cost×rentShare(${rentShare(gdpPPP)})`; stats.rentFormula++;
  }

  // === HOUSE PRICE ===
  let house = null;
  if (gni != null) house = Math.round(gni * priceToIncome(city.country, gdpPPP) / 60);

  // === METADATA ===
  const fhName = CN_TO_FH_NAME[city.country];
  const fhRec = fhName ? fh.values[fhName] : null;
  if (fhRec) stats.fh++;

  const msa = CN_TO_MSA[city.name];
  let h1bAnchors = null;
  if (msa && h1b.byMsa[msa]) {
    const socs = h1b.byMsa[msa];
    const profs = {};
    for (const [key, code] of Object.entries(SOC_CODES)) {
      const s = socs[code]; if (s) profs[key] = { n: s.n, p25: s.p25, p50: s.p50, p75: s.p75 };
    }
    if (Object.keys(profs).length) { h1bAnchors = { msa, socCount: Object.keys(socs).length, professions: profs }; stats.h1b++; }
  }

  let nbsHouseIdx = null;
  if (city.country === "中国" && CN_TO_NBS[city.name] && nbs.newHome[CN_TO_NBS[city.name]]) {
    nbsHouseIdx = { period: nbs.period, newHome: nbs.newHome[CN_TO_NBS[city.name]], secondHand: nbs.secondHand[CN_TO_NBS[city.name]] };
    stats.nbs++;
  }

  let ubsBubble = null;
  const uc = CN_TO_UBS[city.name];
  if (uc && ubsByCity[uc]) {
    const u = ubsByCity[uc];
    ubsBubble = { rank: u.rank, score: u.score, risk: u.risk, realPriceChgYoY: u.realPriceChgYoY, realPriceChg10Y: u.realPriceChg10Y, realRentChgYoY: u.realRentChgYoY, realRentChg10Y: u.realRentChg10Y };
    stats.ubs++;
  }

  let osmQuality = null;
  if (osmByCity[city.name]) {
    osmQuality = { score: osmByCity[city.name].qualityIndex, normalized: osmByCity[city.name].normalized };
    stats.osm++;
  }

  out.cities.push({
    id: city.id, name: city.name, country: city.country,
    cost, costSource,
    rent, rentSource,
    house,
    governance: fhRec ? { fhTotal: fhRec.total, fhStatus: fhRec.status, fhPR: fhRec.pr, fhCL: fhRec.cl } : null,
    h1bAnchors,
    nbsHouseIdx,
    ubsBubble,
    osmQuality,
    _inputs: { wbPLI, digitalPLI, blendedPLI: blendedPLI?.toFixed(3), gdpPPP, gni },
  });
}

console.log(`v7-final:`);
console.log(`  cost:    ${stats.cost}/151`);
console.log(`  rent:    Zillow=${stats.rentZillow}  ONS=${stats.rentOns}  StatCan=${stats.rentStatcan}  Airbnb=${stats.rentAirbnb}  NBS-CN=${stats.rentNbs}  formula=${stats.rentFormula}  (total=${stats.rentZillow+stats.rentOns+stats.rentStatcan+stats.rentAirbnb+stats.rentNbs+stats.rentFormula}/151)`);
console.log(`  salary:  H1B=${stats.h1b}/23 US MSAs`);
console.log(`  meta:    FH=${stats.fh}/151  UBS=${stats.ubs}/21  NBS=${stats.nbs}/70  OSM=${stats.osm}/22`);

writeFileSync(join(ROOT, "output/clean-values-v7.json"), JSON.stringify(out, null, 2) + "\n");
console.log(`\n✓ output/clean-values-v7.json`);
