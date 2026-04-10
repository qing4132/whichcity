#!/usr/bin/env node
/**
 * Compile comprehensive nomad data from all sources:
 * - Archive: nomad-research-2025.json + supplement
 * - Fresh fetch: nomads.com city pages (2026-04-09)
 * - Computed: timezone overlap
 * 
 * Output: nomad-data-compiled.json
 */
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const cities = JSON.parse(readFileSync(join(ROOT, "public/data/cities.json"), "utf-8")).cities;
const archiveMain = JSON.parse(readFileSync(join(ROOT, "_archive/data_sources/nomad-research-2025.json"), "utf-8"));
const archiveSupplement = JSON.parse(readFileSync(join(ROOT, "_archive/data_sources/nomad-research-supplement-2025.json"), "utf-8"));
const timezoneData = JSON.parse(readFileSync(join(__dirname, "nomad-07-timezone-overlap.json"), "utf-8"));

// === SOURCED DATA ===

// #1 Visa data: from archive (verified accurate 2026-04-09)
// Build country→visa lookup from archive
const visaByCountry = {};
for (const [zhName, data] of Object.entries(archiveMain.countries)) {
  visaByCountry[zhName] = {
    ...data.nomad_visa,
    source: "nomad-research-2025.json",
    fetched: "2026-04-01",
    verified: "2026-04-09",
  };
}
// Add supplement visa details
const supplementVisas = archiveSupplement.updated_visa_details || {};
for (const [enName, detail] of Object.entries(supplementVisas)) {
  // merge into matching country
  for (const [zh, d] of Object.entries(visaByCountry)) {
    if (archiveMain.countries[zh]?.en === enName) {
      Object.assign(d, detail, { source: "nomad-research-supplement-2025.json" });
    }
  }
}
// Add missing countries for new cities
const missingVisa = {
  "乌拉圭": { has_visa: false, note: "No dedicated DN visa. 90-day tourist stay for strong passports. Temp residency for remote workers via consulate.", source: "visaguide.world", fetched: "2026-04-09" },
  "摩洛哥": { has_visa: false, note: "No DN visa. 90-day visa-free for US/EU/UK. 3-month extension possible at local police.", source: "Wikipedia visa policy", fetched: "2026-04-09" },
};
Object.assign(visaByCountry, missingVisa);

// Visa-free tourism days from supplement
const visaFreeDays = {};
if (archiveSupplement.visa_free_tourism_durations?.countries) {
  for (const [enName, data] of Object.entries(archiveSupplement.visa_free_tourism_durations.countries)) {
    visaFreeDays[enName] = data;
  }
}

// #4 English level: EF EPI from archive + nomads.com city ratings
const efEpiByCountry = {};
for (const [zhName, data] of Object.entries(archiveMain.countries)) {
  efEpiByCountry[zhName] = data.ef_epi;
}

// #8/#9 Nomads.com data: archive (130 cities) + fresh fetches (20 new)
const nomadsCom = {};
// From archive supplement
if (archiveSupplement.nomads_com_city_data?.cities) {
  for (const [enCity, data] of Object.entries(archiveSupplement.nomads_com_city_data.cities)) {
    nomadsCom[enCity] = { ...data, source: "nomads.com", fetched: "2026-04-08" };
  }
}

// Fresh fetches from 2026-04-09 (extracted from web scraping above)
const freshNomadsData = {
  "Phuket":           { score: 3.29, rank: 321, cost: 1588, internet: 21, english: "Bad", reviews: 1585, places_to_work: "Great", power_grid: "Great", free_wifi: "Bad", friendly_foreigners: "Okay" },
  "Ko Samui":         { score: 2.96, rank: 720, cost: 1939, internet: 20, english: "Bad", reviews: 749, places_to_work: "Great", power_grid: "Great", free_wifi: "Bad", friendly_foreigners: "Great" },
  "Ko Pha Ngan":      { score: 3.29, rank: 320, cost: 2060, internet: 20, english: "Bad", reviews: 808, places_to_work: "Great", power_grid: "Great", free_wifi: "Bad", friendly_foreigners: "Great" },
  "Chiang Mai":       { score: 3.62, rank: 49,  cost: 1251, internet: 20, english: "Bad", reviews: 2712, places_to_work: "Great", power_grid: "Great", free_wifi: "Okay", friendly_foreigners: "Okay" },
  "Porto":            { score: 3.67, rank: 28,  cost: 3069, internet: 36, english: "Good", reviews: 1556, places_to_work: "Great", power_grid: "Great", free_wifi: "Okay", friendly_foreigners: "Good" },
  "Valencia":         { score: 3.71, rank: 23,  cost: 3710, internet: 34, english: "Okay", reviews: 1064, places_to_work: "Great", power_grid: "Great", free_wifi: "Good", friendly_foreigners: "Good" },
  "Split":            { score: 3.42, rank: 174, cost: 2766, internet: 14, english: "Good", reviews: 844, places_to_work: "Great", power_grid: "Great", free_wifi: "Okay", friendly_foreigners: "Good" },
  "Montevideo":       { score: 3.63, rank: 45,  cost: 2845, internet: 17, english: "Okay", reviews: 407, places_to_work: "Great", power_grid: "Great", free_wifi: "Great", friendly_foreigners: "Great" },
  "Las Palmas":       { score: 3.45, rank: 142, cost: 2000, internet: 31, english: "Bad", reviews: 799, places_to_work: "Great", power_grid: "Great", free_wifi: "Bad", friendly_foreigners: "Good" },
  "Bansko":           { score: 3.07, rank: 520, cost: 2724, internet: 23, english: "Okay", reviews: 365, places_to_work: "Great", power_grid: "Great", free_wifi: "Bad", friendly_foreigners: "Okay" },
  "Playa del Carmen": { score: 3.23, rank: 372, cost: 2504, internet: 12, english: "Bad", reviews: 1154, places_to_work: "Great", power_grid: "Great", free_wifi: "Bad", friendly_foreigners: "Great" },
  "Cancun":           { score: 3.34, rank: 261, cost: 2402, internet: 12, english: "Bad", reviews: 779, places_to_work: "Great", power_grid: "Great", free_wifi: "Great", friendly_foreigners: "Good" },
  "Penang":           { score: 3.61, rank: 52,  cost: 1168, internet: 18, english: "Good", reviews: 576, places_to_work: "Great", power_grid: "Great", free_wifi: "Great", friendly_foreigners: "Great" },
  "Florianopolis":    { score: 3.52, rank: 93,  cost: 1761, internet: 13, english: "Bad", reviews: 523, places_to_work: "Great", power_grid: "Great", free_wifi: "Bad", friendly_foreigners: "Great" },
  "Siem Reap":        { score: 3.22, rank: 383, cost: 1216, internet: 9,  english: "Bad", reviews: 718, places_to_work: "Great", power_grid: "Great", free_wifi: "Bad", friendly_foreigners: "Good" },
  "Cusco":            { score: 2.81, rank: 1045, cost: 2351, internet: 10, english: "Bad", reviews: 603, places_to_work: "Great", power_grid: "Great", free_wifi: "Bad", friendly_foreigners: "Bad" },
  "Da Nang":          { score: null, rank: null, cost: 1175, internet: 9, english: "Bad", reviews: null, places_to_work: null, power_grid: null, free_wifi: null, friendly_foreigners: null, note: "From nomads.com homepage listing" },
  "Bali":             { score: 3.15, rank: 443, cost: 2094, internet: 19, english: "Bad", reviews: null, places_to_work: null, power_grid: null, free_wifi: null, friendly_foreigners: null, note: "Listed as Uluwatu/Canggu on nomads.com" },
  "Marrakech":        { score: null, rank: null, cost: null, internet: null, english: null, reviews: null, note: "nomads.com page did not load city data" },
  // Puerto Vallarta & Kyoto: derive from same-country cities
  "Puerto Vallarta":  { score: null, rank: null, cost: 2200, internet: 12, english: "Bad", reviews: null, note: "Estimated from Mexico City/Cancun/Playa del Carmen average" },
  "Kyoto":            { score: null, rank: null, cost: 3083, internet: 27, english: "Bad", reviews: null, note: "Estimated equal to Tokyo (same country, similar tier city)" },
};

for (const [city, data] of Object.entries(freshNomadsData)) {
  nomadsCom[city] = { ...data, source: "nomads.com", fetched: "2026-04-09" };
}

// #10 Insurance: global, from archive (verified)
const insurance = archiveSupplement.safetywing_insurance;

// #5 VPN restrictions (knowledge-based, not city-specific)
const vpnRestrictions = {
  "中国": { restricted: true, note: "VPN heavily restricted; most commercial VPNs blocked without special setup" },
  "伊朗": { restricted: true, note: "VPN usage illegal; heavily filtered" },
  "俄罗斯": { restricted: true, note: "Many VPN providers blocked since 2024" },
  "缅甸": { restricted: true, note: "Internet shutdowns and VPN blocks during political crises" },
  "土耳其": { restricted: "partial", note: "Some VPN protocols blocked; most paid VPNs work" },
  "阿联酋": { restricted: "partial", note: "VPN legal for legitimate use; VoIP often blocked" },
  "卡塔尔": { restricted: "partial", note: "Similar to UAE; VoIP restrictions" },
  "阿曼": { restricted: "partial", note: "VPN legal; some content blocked" },
  "巴基斯坦": { restricted: "partial", note: "Periodic social media blocks; VPN usage common" },
};

// === COMPILE PER-CITY OUTPUT ===
const output = {
  _meta: {
    description: "Comprehensive digital nomad dataset for WhichCity — 9 data categories across 154 cities",
    compiled: "2026-04-09",
    categories: {
      "#1_visa": "Digital nomad visa availability + visa-free tourist days (national level)",
      "#2_short_term_rent": "Estimated short-term rent (~45% of nomad total cost)",
      "#3_coworking": "Coworking quality rating from nomads.com + estimated price range",
      "#4_english": "EF EPI score (national) + nomads.com city-level English rating",
      "#5_internet": "Download speed (Mbps) + free WiFi rating + VPN restrictions",
      "#7_timezone": "Overlap working hours with US-East, US-West, London (8am-8pm window)",
      "#8_nomad_community": "Nomad score, global rank, review count from nomads.com",
      "#9_nomad_cost": "Total monthly nomad cost (rent+food+coworking+transport)",
      "#10_insurance": "SafetyWing global pricing (Essential $62.72/4wk, Complete $177.50/mo)",
    },
    sources: {
      nomads_com: { url: "https://nomads.com/", fetched: "2026-04-08 to 2026-04-09", note: "130 cities from archive + 20 freshly fetched" },
      ef_epi: { url: "https://www.ef.com/epi/", year: 2025, note: "123 countries ranked" },
      visa_data: { urls: ["https://en.wikipedia.org/wiki/Digital_nomad", "https://visaguide.world/digital-nomad-visa/"], fetched: "2026-04-01 + 2026-04-08" },
      safetywing: { url: "https://safetywing.com/nomad-insurance", fetched: "2026-04-08" },
      timezone: { method: "Computed from IANA timezone via Intl.DateTimeFormat", computed: "2026-04-09" },
    },
  },
  insurance: insurance,
  cities: {},
};

// Helper: find nomads.com data by English city name
function findNomadsData(enName, slug) {
  // Try exact match first
  if (nomadsCom[enName]) return nomadsCom[enName];
  // Try common variations
  const variations = [
    enName,
    enName.replace(/ /g, "-").toLowerCase(),
    slug,
  ];
  for (const v of variations) {
    for (const [key, data] of Object.entries(nomadsCom)) {
      if (key.toLowerCase() === v?.toLowerCase()) return data;
    }
  }
  return null;
}

// English city names from i18n
const i18nTs = readFileSync(join(ROOT, "lib/i18n.ts"), "utf-8");
const citySlugTs = readFileSync(join(ROOT, "lib/citySlug.ts"), "utf-8");

// Build ID→English name mapping
const cityEnNames = {};
const nameMatches = i18nTs.matchAll(/(\d+):\s*\{[^}]*en:\s*"([^"]+)"/g);
for (const m of nameMatches) {
  cityEnNames[parseInt(m[1])] = m[2];
}

// Build ID→slug mapping
const citySlugs = {};
const slugMatches = citySlugTs.matchAll(/(\d+):\s*"([^"]+)"/g);
for (const m of slugMatches) {
  citySlugs[parseInt(m[1])] = m[2];
}

// Coworking price estimates by region (USD/month for hot desk)
const coworkingPriceEstimates = {
  "northAmerica": { min: 150, max: 400, typical: 250 },
  "europe_west": { min: 150, max: 350, typical: 200 },
  "europe_east": { min: 50, max: 200, typical: 100 },
  "eastAsia_developed": { min: 100, max: 400, typical: 200 },
  "eastAsia_china": { min: 80, max: 250, typical: 150 },
  "southeastAsia": { min: 50, max: 200, typical: 100 },
  "southAsia": { min: 30, max: 150, typical: 70 },
  "oceania": { min: 200, max: 500, typical: 300 },
  "middleEast": { min: 100, max: 400, typical: 200 },
  "centralAsia": { min: 30, max: 100, typical: 60 },
  "latinAmerica": { min: 50, max: 250, typical: 120 },
  "africa": { min: 30, max: 150, typical: 80 },
};

function getCoworkingRegion(city) {
  const continent = city.continent;
  const country = city.country;
  if (["美国", "加拿大"].includes(country)) return "northAmerica";
  if (["英国", "法国", "德国", "荷兰", "瑞士", "比利时", "奥地利", "爱尔兰", "卢森堡", "瑞典", "丹麦", "芬兰", "挪威"].includes(country)) return "europe_west";
  if (["西班牙", "意大利", "葡萄牙", "希腊", "波兰", "捷克", "匈牙利", "罗马尼亚", "保加利亚", "克罗地亚", "塞尔维亚", "斯洛伐克", "斯洛文尼亚", "爱沙尼亚", "乌克兰", "俄罗斯", "土耳其"].includes(country)) return "europe_east";
  if (["日本", "韩国", "台湾", "中国香港"].includes(country)) return "eastAsia_developed";
  if (country === "中国") return "eastAsia_china";
  if (["新加坡", "泰国", "马来西亚", "越南", "印度尼西亚", "菲律宾", "柬埔寨", "缅甸"].includes(country)) return "southeastAsia";
  if (["印度", "巴基斯坦", "孟加拉国", "斯里兰卡", "尼泊尔"].includes(country)) return "southAsia";
  if (["澳大利亚", "新西兰"].includes(country)) return "oceania";
  if (["阿联酋", "卡塔尔", "巴林", "沙特阿拉伯", "阿曼", "以色列", "黎巴嫩", "约旦", "伊朗"].includes(country)) return "middleEast";
  if (["哈萨克斯坦", "乌兹别克斯坦", "阿塞拜疆", "蒙古", "格鲁吉亚"].includes(country)) return "centralAsia";
  if (continent === "南美洲" || ["墨西哥", "哥斯达黎加", "巴拿马", "波多黎各", "乌拉圭"].includes(country)) return "latinAmerica";
  if (continent === "非洲" || country === "摩洛哥") return "africa";
  return "europe_east"; // fallback
}

for (const city of cities) {
  const id = city.id;
  const enName = cityEnNames[id] || "";
  const slug = citySlugs[id] || "";
  const tz = timezoneData[id];
  const nd = findNomadsData(enName, slug);
  const visa = visaByCountry[city.country];
  const epi = efEpiByCountry[city.country];
  const vpn = vpnRestrictions[city.country] || { restricted: false };
  const cwRegion = getCoworkingRegion(city);
  const cwPrice = coworkingPriceEstimates[cwRegion];

  // #2 Short-term rent estimate: ~45% of nomad total cost
  const nomadCost = nd?.cost || null;
  const shortTermRent = nomadCost ? Math.round(nomadCost * 0.45) : null;

  output.cities[id] = {
    name: city.name,
    en: enName,
    country: city.country,

    // #1 Visa
    visa: visa ? {
      hasNomadVisa: visa.has_visa || false,
      visaName: visa.visa_name || null,
      durationMonths: visa.duration_months || null,
      minIncomeUsd: visa.min_income_usd || null,
      taxOnForeignIncome: visa.tax_on_foreign_income || null,
      note: visa.note || null,
    } : null,
    visaFreeDays: visaFreeDays[archiveMain.countries[city.country]?.en]?.days ?? null,

    // #2 Short-term rent (estimated)
    shortTermRentUsd: shortTermRent,
    shortTermRentNote: shortTermRent ? "Estimated as ~45% of nomads.com total nomad cost" : "No nomads.com data",

    // #3 Coworking
    coworking: {
      qualityRating: nd?.places_to_work || null,
      estimatedPriceRange: cwPrice,
      note: "Quality from nomads.com 'Places to work from'; price is regional estimate",
    },

    // #4 English
    english: {
      efEpiScore: epi?.score || null,
      efEpiBand: epi?.band || null,
      cityRating: nd?.english || null,
      source: "EF EPI 2025 (national) + nomads.com (city-level)",
    },

    // #5 Internet
    internet: {
      downloadMbps: nd?.internet || city.internetSpeedMbps || null,
      freeWifiRating: nd?.free_wifi || null,
      vpnRestricted: vpn.restricted || false,
      vpnNote: vpn.note || null,
      source: nd?.internet ? "nomads.com" : "existing cities.json",
    },

    // #7 Timezone overlap
    timezoneOverlap: tz ? {
      utcOffsetHours: tz.utcOffsetMin / 60,
      overlapWithUSEast: tz.overlapHours["US-East"],
      overlapWithUSWest: tz.overlapHours["US-West"],
      overlapWithLondon: tz.overlapHours["London"],
      note: "Hours where both sides are within 8am-8pm window",
    } : null,

    // #8 Nomad community
    nomadCommunity: nd ? {
      nomadScore: nd.score,
      globalRank: nd.rank,
      reviewCount: nd.reviews,
      source: nd.source,
      fetched: nd.fetched,
    } : null,

    // #9 Nomad total cost
    nomadMonthlyCost: nomadCost,
    nomadCostNote: nd?.note || null,
  };
}

// Stats
const cityCount = Object.keys(output.cities).length;
const withVisa = Object.values(output.cities).filter(c => c.visa).length;
const withNomadData = Object.values(output.cities).filter(c => c.nomadCommunity?.nomadScore).length;
const withTimezone = Object.values(output.cities).filter(c => c.timezoneOverlap).length;
const withEnglish = Object.values(output.cities).filter(c => c.english.efEpiScore || c.english.cityRating).length;
const withCost = Object.values(output.cities).filter(c => c.nomadMonthlyCost).length;
const withRent = Object.values(output.cities).filter(c => c.shortTermRentUsd).length;

console.log(`\n=== NOMAD DATA COMPILATION COMPLETE ===`);
console.log(`Total cities: ${cityCount}`);
console.log(`#1 Visa data: ${withVisa} cities (national level)`);
console.log(`#2 Short-term rent estimate: ${withRent} cities`);
console.log(`#3 Coworking: regional estimates for all + ${withNomadData} with quality ratings`);
console.log(`#4 English data: ${withEnglish} cities`);
console.log(`#5 Internet data: ${cityCount} cities (from nomads.com or existing)`);
console.log(`#7 Timezone overlap: ${withTimezone} cities`);
console.log(`#8 Nomad community: ${withNomadData} with scores + rank`);
console.log(`#9 Nomad monthly cost: ${withCost} cities`);
console.log(`#10 Insurance: Global (SafetyWing Essential $62.72/4wk)`);

writeFileSync(
  join(__dirname, "nomad-data-compiled.json"),
  JSON.stringify(output, null, 2) + "\n"
);
console.log(`\nOutput: _audit/nomad-data-compiled.json`);
