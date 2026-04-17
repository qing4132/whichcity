#!/usr/bin/env node
/**
 * build-clean-v5.mjs — v4 + Big Mac + iPhone → 4-signal country PLI.
 *
 * PLI blend = geomean(WB, Digital, BigMac, iPhone) over whichever of the four
 * signals exist for a country. Each signal has its own source of noise:
 *   - WB:     national accounts (GDP nominal/PPP ratio)
 *   - Digital: platform-set subscription prices (Netflix, Spotify)
 *   - BigMac: tradable commodity purchasing power (Economist proxy)
 *   - iPhone: global tradable tech good price dispersion
 * Geomean dampens any one outlier (e.g. Turkey FX shock) while keeping signal.
 *
 * Also merges Freedom House governance index into city.gov block.
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
const bigmac = JSON.parse(readFileSync(join(ROOT, "sources/bigmac/bigmac-pli.json"), "utf-8"));
const iphone = JSON.parse(readFileSync(join(ROOT, "sources/iphone-pricing.json"), "utf-8"));
const fh = JSON.parse(readFileSync(join(ROOT, "sources/freedom/fh-latest.json"), "utf-8"));
const inputs = JSON.parse(readFileSync(join(REPO, "data/sources/cost-model-inputs.json"), "utf-8"));
const fx = JSON.parse(readFileSync(join(REPO, "public/data/exchange-rates.json"), "utf-8"));
const sot = JSON.parse(readFileSync(join(REPO, "data/cities-source.json"), "utf-8"));

const US_ANCHOR = 3200;

const CN_TO_ISO3 = {
  "美国":"USA","加拿大":"CAN","墨西哥":"MEX","巴西":"BRA","阿根廷":"ARG","智利":"CHL","哥伦比亚":"COL","秘鲁":"PER","乌拉圭":"URY","哥斯达黎加":"CRI","巴拿马":"PAN","英国":"GBR","法国":"FRA","德国":"DEU","意大利":"ITA","西班牙":"ESP","葡萄牙":"PRT","荷兰":"NLD","比利时":"BEL","瑞士":"CHE","奥地利":"AUT","瑞典":"SWE","挪威":"NOR","丹麦":"DNK","芬兰":"FIN","冰岛":"ISL","爱尔兰":"IRL","希腊":"GRC","波兰":"POL","捷克":"CZE","匈牙利":"HUN","罗马尼亚":"ROU","保加利亚":"BGR","克罗地亚":"HRV","斯洛文尼亚":"SVN","斯洛伐克":"SVK","立陶宛":"LTU","拉脱维亚":"LVA","爱沙尼亚":"EST","卢森堡":"LUX","马耳他":"MLT","塞浦路斯":"CYP","俄罗斯":"RUS","乌克兰":"UKR","土耳其":"TUR","以色列":"ISR","阿联酋":"ARE","沙特阿拉伯":"SAU","卡塔尔":"QAT","科威特":"KWT","巴林":"BHR","阿曼":"OMN","约旦":"JOR","埃及":"EGY","摩洛哥":"MAR","突尼斯":"TUN","阿尔及利亚":"DZA","肯尼亚":"KEN","尼日利亚":"NGA","南非":"ZAF","埃塞俄比亚":"ETH","加纳":"GHA","坦桑尼亚":"TZA","日本":"JPN","韩国":"KOR","中国":"CHN","中国香港":"HKG","新加坡":"SGP","马来西亚":"MYS","泰国":"THA","越南":"VNM","印度尼西亚":"IDN","菲律宾":"PHL","印度":"IND","巴基斯坦":"PAK","孟加拉国":"BGD","斯里兰卡":"LKA","尼泊尔":"NPL","缅甸":"MMR","柬埔寨":"KHM","老挝":"LAO","蒙古":"MNG","澳大利亚":"AUS","新西兰":"NZL","斐济":"FJI","台湾":null,
};
const ISO3_TO_ISO2 = {USA:"US",CAN:"CA",MEX:"MX",BRA:"BR",ARG:"AR",CHL:"CL",COL:"CO",PER:"PE",URY:"UY",CRI:"CR",PAN:"PA",GBR:"GB",FRA:"FR",DEU:"DE",ITA:"IT",ESP:"ES",PRT:"PT",NLD:"NL",BEL:"BE",CHE:"CH",AUT:"AT",SWE:"SE",NOR:"NO",DNK:"DK",FIN:"FI",ISL:"IS",IRL:"IE",GRC:"GR",POL:"PL",CZE:"CZ",HUN:"HU",ROU:"RO",BGR:"BG",HRV:"HR",SVN:"SI",SVK:"SK",LTU:"LT",LVA:"LV",EST:"EE",LUX:"LU",MLT:"MT",CYP:"CY",RUS:"RU",UKR:"UA",TUR:"TR",ISR:"IL",ARE:"AE",SAU:"SA",QAT:"QA",KWT:"KW",BHR:"BH",OMN:"OM",JOR:"JO",EGY:"EG",MAR:"MA",TUN:"TN",DZA:"DZ",KEN:"KE",NGA:"NG",ZAF:"ZA",ETH:"ET",GHA:"GH",TZA:"TZ",JPN:"JP",KOR:"KR",CHN:"CN",HKG:"HK",SGP:"SG",MYS:"MY",THA:"TH",VNM:"VN",IDN:"ID",PHL:"PH",IND:"IN",PAK:"PK",BGD:"BD",LKA:"LK",NPL:"NP",MMR:"MM",KHM:"KH",LAO:"LA",MNG:"MN",AUS:"AU",NZL:"NZ",FJI:"FJ"};
const CN_TO_FH_NAME = { "美国":"United States","英国":"United Kingdom","韩国":"South Korea","中国":"China","中国香港":"Hong Kong","台湾":"Taiwan","德国":"Germany","法国":"France","意大利":"Italy","西班牙":"Spain","俄罗斯":"Russia","瑞士":"Switzerland","日本":"Japan","新加坡":"Singapore","印度":"India","泰国":"Thailand","越南":"Vietnam","印度尼西亚":"Indonesia","菲律宾":"Philippines","马来西亚":"Malaysia","阿联酋":"United Arab Emirates","沙特阿拉伯":"Saudi Arabia","卡塔尔":"Qatar","以色列":"Israel","土耳其":"Turkey","埃及":"Egypt","南非":"South Africa","尼日利亚":"Nigeria","肯尼亚":"Kenya","摩洛哥":"Morocco","澳大利亚":"Australia","新西兰":"New Zealand","加拿大":"Canada","墨西哥":"Mexico","巴西":"Brazil","阿根廷":"Argentina","智利":"Chile","哥伦比亚":"Colombia","秘鲁":"Peru","荷兰":"Netherlands","比利时":"Belgium","奥地利":"Austria","瑞典":"Sweden","挪威":"Norway","丹麦":"Denmark","芬兰":"Finland","冰岛":"Iceland","爱尔兰":"Ireland","希腊":"Greece","葡萄牙":"Portugal","波兰":"Poland","捷克":"Czech Republic","匈牙利":"Hungary","罗马尼亚":"Romania","克罗地亚":"Croatia","保加利亚":"Bulgaria","乌克兰":"Ukraine","乌兹别克斯坦":"Uzbekistan","哈萨克斯坦":"Kazakhstan","阿塞拜疆":"Azerbaijan","格鲁吉亚":"Georgia","伊朗":"Iran","黎巴嫩":"Lebanon","约旦":"Jordan","阿曼":"Oman","巴林":"Bahrain","科威特":"Kuwait" };
const IMF_OVERRIDES = {台湾:{priceLevelIndex:0.66,gdpPPPPerCapita:73344,gniPerCapita:34000,digitalPLIKey:"TW"}};

const PRIMARY_CITIES = new Set(["纽约","伦敦","东京","香港","巴黎","上海","北京","旧金山","法兰克福","苏黎世","悉尼","迪拜","孟买","圣保罗","墨西哥城","米兰","马德里","阿姆斯特丹","首尔"]);
const CAPITAL_NON_PRIMARY = new Set(["华盛顿","渥太华","堪培拉","柏林","罗马","维也纳","斯德哥尔摩","奥斯陆","赫尔辛基","雷克雅未克","哥本哈根","都柏林","雅典","华沙","布拉格","布达佩斯","里斯本","布鲁塞尔","伯尔尼","惠灵顿","布宜诺斯艾利斯","圣地亚哥","利马","波哥大","蒙得维的亚","圣何塞(哥斯达黎加)","巴拿马城","开罗","拉巴特","内罗毕","亚的斯亚贝巴","安曼","利雅得","多哈","马斯喀特","科威特城","麦纳麦","阿布扎比","雅加达","吉隆坡","马尼拉","河内","曼谷","新德里","伊斯兰堡","达卡","科伦坡","加德满都","仰光","金边","万象"]);
const CITY_STATE_PREMIUM = new Set(["新加坡","中国香港"]);

const EU_ISO2_TO_CN = {BE:"比利时",BG:"保加利亚",CZ:"捷克",DK:"丹麦",DE:"德国",EE:"爱沙尼亚",IE:"爱尔兰",EL:"希腊",ES:"西班牙",FR:"法国",HR:"克罗地亚",IT:"意大利",CY:"塞浦路斯",LV:"拉脱维亚",LT:"立陶宛",LU:"卢森堡",HU:"匈牙利",MT:"马耳他",NL:"荷兰",AT:"奥地利",PL:"波兰",PT:"葡萄牙",RO:"罗马尼亚",SI:"斯洛文尼亚",SK:"斯洛伐克",FI:"芬兰",SE:"瑞典",IS:"冰岛",NO:"挪威",CH:"瑞士",UK:"英国",TR:"土耳其"};
const CN_TO_EU_ISO2 = Object.fromEntries(Object.entries(EU_ISO2_TO_CN).map(([a,b])=>[b,a]));

function cityPremium(n, c) {
  if (CITY_STATE_PREMIUM.has(c) || CITY_STATE_PREMIUM.has(n)) return 1.35;
  if (PRIMARY_CITIES.has(n)) return 1.20;
  if (CAPITAL_NON_PRIMARY.has(n)) return 1.10;
  return 1.00;
}
function rentShare(g){if(g==null)return 0.30;if(g>40000)return 0.38;if(g>20000)return 0.32;if(g>10000)return 0.28;return 0.22;}
function priceToIncome(c,g){if(["新加坡","中国香港"].includes(c))return 18;if(["日本","韩国","以色列"].includes(c))return 12;if(g==null)return 8;if(g>40000)return 7;if(g>20000)return 9;if(g>10000)return 8;return 6;}
const geomean = (arr) => Math.exp(arr.reduce((s,r)=>s+Math.log(r),0)/arr.length);

const out = {
  meta: {
    description: "Clean-pipeline v5 — 4-signal PLI (WB+Digital+BigMac+iPhone) + FH governance",
    generated: new Date().toISOString(),
    formulaVersion: "clean-v5",
    anchor: `US_ANCHOR=$${US_ANCHOR}`,
    sources: {
      wbPLI: "WB Nominal/PPP GDP per capita (CC BY 4.0)",
      digitalPLI: "Netflix+Spotify 2026-04 factual prices",
      bigmacPLI: "Economist Big Mac Index (github.com/TheEconomist, CC BY-SA)",
      iphonePLI: "Apple iPhone 16 128GB country pricing 2026-04",
      rpp: "BEA RPP 2022",
      euPLI: "Eurostat PLI 2022",
      usRent: "Zillow ZORI 2026-03",
      ukRent: "ONS Private Rent 2026-02",
      caRent: "StatCan CMHC 2024",
      airbnb: "InsideAirbnb × K",
      fh: "Freedom House FIW latest (0-100)",
    },
  },
  cities: [],
};

const stats = { cost:0, rentGov:0, rentAirbnb:0, rentFormula:0, house:0, fh:0, signals:{1:0,2:0,3:0,4:0} };

for (const city of sot.cities) {
  const iso3 = CN_TO_ISO3[city.country];
  const iso2 = iso3 ? ISO3_TO_ISO2[iso3] : IMF_OVERRIDES[city.country]?.digitalPLIKey;
  const imf = IMF_OVERRIDES[city.country];
  const wbRec = iso3 ? wb.countries[iso3] : null;

  const wbPLI      = wbRec?.priceLevelIndex ?? imf?.priceLevelIndex ?? null;
  const digitalPLI = iso2 ? (digital.values[iso2]?.digitalPLI ?? null) : null;
  const bigmacPLI  = iso3 ? (bigmac.values[iso3]?.bigmacPLI ?? null) : null;
  const iphonePLI  = iso2 ? (iphone.values[iso2]?.iphonePLI ?? null) : null;

  const signals = [wbPLI, digitalPLI, bigmacPLI, iphonePLI].filter((v) => v != null && v > 0);
  const blendedPLI = signals.length ? geomean(signals) : null;
  if (signals.length) stats.signals[signals.length]++;

  const gdpPPP = wbRec?.gdpPPP?.value ?? imf?.gdpPPPPerCapita ?? null;
  const gni = wbRec?.gni?.value ?? imf?.gniPerCapita ?? null;

  let cost=null, costSource="null";
  if (blendedPLI != null) {
    const prem = cityPremium(city.name, city.country);
    let adj=1.0, adjTag="none";
    if (city.country === "美国" && inputs.usRPP[city.name] != null) { adj = inputs.usRPP[city.name]/100; adjTag="BEA-RPP"; }
    else { const e = CN_TO_EU_ISO2[city.country]; if (e && inputs.eurostatPLI[e] != null) { adj = inputs.eurostatPLI[e]/100; adjTag="Eurostat-PLI"; } }
    cost = Math.round(US_ANCHOR * blendedPLI * prem * adj);
    costSource = `${US_ANCHOR}×blend${signals.length}(${blendedPLI.toFixed(2)})×prem(${prem})×${adjTag}(${adj.toFixed(2)})`;
    stats.cost++;
  }

  let rent=null, rentSource="null";
  if (city.country==="美国" && zillow.cities[city.name]) { rent=zillow.cities[city.name].rentUSD; rentSource=`Zillow-ZORI-${zillow.month}`; stats.rentGov++; }
  else if (city.country==="英国" && ons.cities[city.name]) { rent=Math.round(ons.cities[city.name].avgMonthlyRentGBP/fx.rates.GBP); rentSource="ONS-2026"; stats.rentGov++; }
  else if (city.country==="加拿大" && statcan.cities[city.name]) { rent=Math.round(statcan.cities[city.name].rent1BR_CAD/fx.rates.CAD); rentSource="StatCan-CMHC-2024"; stats.rentGov++; }
  else if (airbnb.synthesized[city.name]) { rent=airbnb.synthesized[city.name].rentUSD; rentSource=`InsideAirbnb×${airbnb.synthesized[city.name].multiplier.toFixed(1)}`; stats.rentAirbnb++; }
  else if (cost != null) { rent=Math.round(cost*rentShare(gdpPPP)); rentSource=`cost×rentShare(${rentShare(gdpPPP)})`; stats.rentFormula++; }

  let house=null;
  if (gni != null) { const pti=priceToIncome(city.country, gdpPPP); house=Math.round(gni*pti/60); stats.house++; }

  // Freedom House governance
  const fhName = CN_TO_FH_NAME[city.country];
  const fhRec = fhName ? fh.values[fhName] : null;
  if (fhRec) stats.fh++;

  out.cities.push({
    id: city.id, name: city.name, country: city.country,
    cost, costSource, rent, rentSource, house,
    governance: fhRec ? { fhTotal: fhRec.total, fhStatus: fhRec.status, fhPR: fhRec.pr, fhCL: fhRec.cl } : null,
    _inputs: { wbPLI, digitalPLI, bigmacPLI, iphonePLI, blendedPLI: blendedPLI?.toFixed(3), signalsUsed: signals.length, gdpPPP, gni },
  });
}

console.log(`v5: cost ${stats.cost}/151`);
console.log(`    signal coverage: 4-sig=${stats.signals[4]} 3-sig=${stats.signals[3]} 2-sig=${stats.signals[2]} 1-sig=${stats.signals[1]}`);
console.log(`    rent gov=${stats.rentGov} airbnb=${stats.rentAirbnb} formula=${stats.rentFormula} total=${stats.rentGov+stats.rentAirbnb+stats.rentFormula}/151`);
console.log(`    house ${stats.house}/151  FH ${stats.fh}/151`);

writeFileSync(join(ROOT,"output/clean-values-v5.json"), JSON.stringify(out,null,2)+"\n");
console.log(`\n✓ output/clean-values-v5.json`);
