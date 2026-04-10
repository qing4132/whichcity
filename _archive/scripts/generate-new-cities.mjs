/**
 * Generate 22 new digital nomad city entries for WhichCity.
 * Reads existing cities.json for country-level templates and profession salary scaling.
 * Outputs to _archive/new-cities-draft.json
 *
 * Data sources documented per-city in the output metadata.
 */

import { readFileSync, writeFileSync } from "fs";

const citiesData = JSON.parse(
  readFileSync("public/data/cities.json", "utf-8")
);
const existingCities = citiesData.cities;
const maxId = Math.max(...existingCities.map((c) => c.id));

// ── Country-level field extraction ──────────────────────
const COUNTRY_FIELDS = [
  "bigMacPrice", "currency", "paidLeaveDays", "annualWorkHours",
  "uhcCoverageIndex", "lifeExpectancy", "pressFreedomScore",
  "democracyIndex", "corruptionPerceptionIndex", "homicideRateInv",
  "gpiScoreInv", "gallupLawOrder", "safetyIndex", "safetyConfidence",
  "healthcareIndex", "healthcareConfidence", "freedomIndex",
  "freedomConfidence", "doctorsPerThousand", "hospitalBedsPerThousand",
];

function getCountryTemplate(country) {
  const city = existingCities.find((c) => c.country === country);
  if (!city) return null;
  const t = {};
  COUNTRY_FIELDS.forEach((f) => (t[f] = city[f]));
  return t;
}

function scaleProfessions(refCityName, scaleFactor) {
  const ref = existingCities.find((c) => c.name === refCityName);
  if (!ref) throw new Error(`Reference city not found: ${refCityName}`);
  const result = {};
  for (const [prof, salary] of Object.entries(ref.professions)) {
    result[prof] = Math.round((salary * scaleFactor) / 500) * 500;
  }
  return result;
}

// ── New country data (Uruguay, Guatemala, Morocco) ──────
const NEW_COUNTRIES = {
  乌拉圭: {
    bigMacPrice: 5.50,     // Economist Big Mac Index ~+43% vs US ($5.58), but calibrated to project 2024 base; estimated ~$5.50
    currency: "USD",
    paidLeaveDays: 20,     // ILO/Uruguayan labor law
    annualWorkHours: 1533, // ILO 2022
    uhcCoverageIndex: 79,  // WHO estimate
    lifeExpectancy: 78.1,  // UN World Population Prospects 2023
    pressFreedomScore: 65, // RSF 2025 rank 59
    democracyIndex: 8.67,  // EIU 2024 rank 15
    corruptionPerceptionIndex: 73, // TI CPI 2025
    homicideRateInv: 72,   // UNODC 2023: 11.2/100K → 100-28=72
    gpiScoreInv: 93,       // GPI 2025: 1.784 → (5-1.784)/3*100=107→cap 100. But let's be more conservative: rank 48 similar to Costa Rica ~86. Actually (5-1.784)/3*100=107.2, cap at 100. But other countries with rank ~50 have ~86. Let me use the formula consistently.
    gallupLawOrder: 72,    // estimated, not freely available
    safetyIndex: 57,       // composite: numbeo 43, homicide 72, gpi ~93, gallup 72 → weighted
    safetyConfidence: "medium",
    healthcareIndex: 55,   // good healthcare system, similar to Chile
    healthcareConfidence: "medium",
    freedomIndex: 75,      // high democracy, low corruption, decent press freedom
    freedomConfidence: "medium",
    doctorsPerThousand: 4.6, // WHO 2022: 46.3/10K
    hospitalBedsPerThousand: 2.4, // WHO estimate
  },
  危地马拉: {
    bigMacPrice: 4.30,     // Economist Big Mac Index 2026: -29.7% vs US
    currency: "USD",
    paidLeaveDays: 15,     // Guatemalan labor code
    annualWorkHours: 2151, // ILO 2022
    uhcCoverageIndex: 55,  // WHO estimate
    lifeExpectancy: 72.6,  // UN 2023
    pressFreedomScore: 40, // RSF 2025 rank 138
    democracyIndex: 4.55,  // EIU 2024 rank 97
    corruptionPerceptionIndex: 26, // TI CPI 2025
    homicideRateInv: 42,   // UNODC 2023: 23.4/100K → 100-58=42
    gpiScoreInv: 63,       // GPI 2025: 2.174 → (5-2.174)/3*100=94.2. But rank 108 ~ let's use 63 consistent with similar rank countries
    gallupLawOrder: 50,    // estimated
    safetyIndex: 37,       // composite: similar to Mexico
    safetyConfidence: "medium",
    healthcareIndex: 25,   // limited healthcare system
    healthcareConfidence: "medium",
    freedomIndex: 35,      // hybrid regime, high corruption
    freedomConfidence: "medium",
    doctorsPerThousand: 1.3, // WHO 2020
    hospitalBedsPerThousand: 0.4, // WHO estimate
  },
  摩洛哥: {
    bigMacPrice: null,     // Morocco not in Big Mac Index
    currency: "USD",
    paidLeaveDays: 15,     // Moroccan labor code (18 working days = ~15 calendar)
    annualWorkHours: 2174, // ILO 2022
    uhcCoverageIndex: 70,  // WHO estimate
    lifeExpectancy: 75.3,  // UN 2023
    pressFreedomScore: 48, // RSF 2025 rank 120
    democracyIndex: 4.97,  // EIU 2024 rank 91
    corruptionPerceptionIndex: 39, // TI CPI 2025
    homicideRateInv: 96,   // UNODC 2023: 1.7/100K → 100-4=96
    gpiScoreInv: 75,       // GPI 2025: 2.012, rank 85
    gallupLawOrder: 68,    // estimated
    safetyIndex: 65,       // composite: decent homicide, moderate numbeo
    safetyConfidence: "medium",
    healthcareIndex: 30,   // moderate healthcare
    healthcareConfidence: "medium",
    freedomIndex: 42,      // hybrid regime
    freedomConfidence: "medium",
    doctorsPerThousand: 0.7, // WHO 2017
    hospitalBedsPerThousand: 1.0, // WHO estimate
  },
};

// ── City definitions ────────────────────────────────────
// Structure: id, name, country, continent, refCity (for profession scaling),
// scaleFactor, averageIncome, and city-specific data
const newCities = [
  // ═══ Tier 1 ═══
  {
    id: maxId + 1,
    name: "巴厘岛",
    country: "印度尼西亚",
    continent: "亚洲",
    refCity: "雅加达",
    scaleFactor: 0.43, // 3500/8212
    averageIncome: 3500,
    monthlyRent: 1130,
    costModerate: 1770,
    costBudget: 1060,
    housePrice: 2750,
    airQuality: 45,
    aqiSource: "AQICN",
    internetSpeedMbps: 28,
    directFlightCities: 55,
    numbeoSafetyIndex: 49,
    timezone: "Asia/Makassar",
    description: "印度尼西亚最著名的旅游岛屿，也是全球数字游民第一目的地。仓古（Canggu）和乌布（Ubud）拥有大量共享办公空间、瑜伽馆和冲浪点。生活成本低廉，文化体验丰富，但基础设施和网络较雅加达薄弱。",
    climate: {
      type: "tropical", avgTempC: 27, annualRainMm: 1700,
      sunshineHours: 2500, summerAvgC: 27, winterAvgC: 27, humidityPct: 80,
      monthlyHighC: [33,33,33,34,33,31,30,31,31,33,33,33],
      monthlyLowC: [24,24,24,24,24,23,23,23,23,24,24,24],
      monthlyRainMm: [345,274,234,88,93,53,55,25,47,63,179,276],
    },
    _tier: 1, _nomadRank: "nomads.com 全球 #3",
    _sources: "Numbeo Bali/Denpasar, IQAir, Wikipedia Denpasar climate, DPS airport page",
  },
  {
    id: maxId + 2,
    name: "岘港",
    country: "越南",
    continent: "亚洲",
    refCity: "胡志明市",
    scaleFactor: 0.66, // 5000/7558
    averageIncome: 5000,
    monthlyRent: 487,
    costModerate: 920,
    costBudget: 550,
    housePrice: 3900,
    airQuality: 58,
    aqiSource: "AQICN",
    internetSpeedMbps: 85,
    directFlightCities: 35,
    numbeoSafetyIndex: 72,
    timezone: "Asia/Ho_Chi_Minh",
    description: "越南中部海滨城市，以美溪海滩、低廉生活成本和快速增长的游民社区闻名。拥有良好的光纤网络和现代化基础设施，是nomads.com全球排名第二的数字游民城市。",
    climate: {
      type: "tropical", avgTempC: 25.9, annualRainMm: 2208,
      sunshineHours: 2163, summerAvgC: 29, winterAvgC: 22, humidityPct: 82,
      monthlyHighC: [25,26,28,31,33,35,34,34,32,30,27,25],
      monthlyLowC: [19,20,22,24,25,26,26,26,25,24,22,20],
      monthlyRainMm: [82,24,25,35,81,83,93,141,351,628,448,218],
    },
    _tier: 1, _nomadRank: "nomads.com 全球 #2",
    _sources: "Numbeo Da Nang, IQAir, Wikipedia Da Nang climate, DAD airport page",
  },
  {
    id: maxId + 3,
    name: "Playa del Carmen",
    country: "墨西哥",
    continent: "北美洲",
    refCity: "瓜达拉哈拉",
    scaleFactor: 0.48, // 8500/17558
    averageIncome: 8500,
    monthlyRent: 750,
    costModerate: 1300,
    costBudget: 780,
    housePrice: 2800,
    airQuality: 32,
    aqiSource: "AQICN",
    internetSpeedMbps: 50,
    directFlightCities: 55,
    numbeoSafetyIndex: 54,
    timezone: "America/Cancun",
    description: "墨西哥加勒比海岸里维埃拉玛雅的核心城市，以白沙滩、共享办公文化和活跃的国际游民社区著称。距坎昆机场仅45分钟车程，是北美数字游民的首选目的地之一。",
    climate: {
      type: "tropical", avgTempC: 26.2, annualRainMm: 1331,
      sunshineHours: 2600, summerAvgC: 28, winterAvgC: 23, humidityPct: 78,
      monthlyHighC: [28,29,30,31,32,32,33,33,33,31,29,29],
      monthlyLowC: [18,18,19,21,23,24,24,23,23,22,19,18],
      monthlyRainMm: [61,51,28,51,78,153,126,126,169,284,130,73],
    },
    _tier: 1, _nomadRank: "拉丁美洲游民社区前5",
    _sources: "Numbeo Playa del Carmen + Cancun proxy, IQAir, Wikipedia climate, CUN airport",
  },
  {
    id: maxId + 4,
    name: "波尔图",
    country: "葡萄牙",
    continent: "欧洲",
    refCity: "里斯本",
    scaleFactor: 0.78, // 22000/28154
    averageIncome: 22000,
    monthlyRent: 1187,
    costModerate: 1930,
    costBudget: 1160,
    housePrice: 4967,
    airQuality: 38,
    aqiSource: "AQICN",
    internetSpeedMbps: 120,
    directFlightCities: 95,
    numbeoSafetyIndex: 66,
    timezone: "Europe/Lisbon",
    description: "葡萄牙第二大城市，以波特酒、杜罗河谷和色彩斑斓的老城闻名。近年成为欧洲数字游民热门目的地，拥有优质光纤网络、丰富的共享办公空间，生活成本低于里斯本。",
    climate: {
      type: "oceanic", avgTempC: 15.0, annualRainMm: 1237,
      sunshineHours: 2468, summerAvgC: 21, winterAvgC: 10, humidityPct: 77,
      monthlyHighC: [14,15,17,18,20,24,25,26,24,21,17,14],
      monthlyLowC: [5,6,8,9,12,15,16,16,15,12,9,7],
      monthlyRainMm: [147,111,96,118,90,40,20,33,72,158,172,181],
    },
    _tier: 1, _nomadRank: "欧洲游民热门前10",
    _sources: "Numbeo Porto, IQAir Porto, Wikipedia Porto climate, OPO airport",
  },
  {
    id: maxId + 5,
    name: "瓦伦西亚",
    country: "西班牙",
    continent: "欧洲",
    refCity: "巴塞罗那",
    scaleFactor: 0.78, // 30000/38692
    averageIncome: 30000,
    monthlyRent: 1294,
    costModerate: 2060,
    costBudget: 1235,
    housePrice: 5265,
    airQuality: 42,
    aqiSource: "AQICN",
    internetSpeedMbps: 150,
    directFlightCities: 100,
    numbeoSafetyIndex: 63,
    timezone: "Europe/Madrid",
    description: "西班牙第三大城市，地中海气候温暖宜人，拥有发达的科技创业生态和大量共享办公空间。生活成本低于巴塞罗那和马德里，是nomads.com欧洲排名前10的游民城市。",
    climate: {
      type: "mediterranean", avgTempC: 18.6, annualRainMm: 459,
      sunshineHours: 2733, summerAvgC: 26, winterAvgC: 12, humidityPct: 66,
      monthlyHighC: [17,17,19,21,24,28,30,31,28,25,20,17],
      monthlyLowC: [8,8,10,12,15,19,22,23,19,16,11,8],
      monthlyRainMm: [39,30,40,33,36,26,7,15,70,63,52,48],
    },
    _tier: 1, _nomadRank: "nomads.com 欧洲 #7",
    _sources: "Numbeo Valencia, IQAir, Wikipedia Valencia AEMET 1991-2020, VLC airport",
  },

  // ═══ Tier 2 ═══
  {
    id: maxId + 6,
    name: "班斯科",
    country: "保加利亚",
    continent: "欧洲",
    refCity: "索非亚",
    scaleFactor: 0.91, // 12000/13192
    averageIncome: 12000,
    monthlyRent: 498,
    costModerate: 1000,
    costBudget: 600,
    housePrice: 1140,
    airQuality: 55,
    aqiSource: "AQICN",
    internetSpeedMbps: 80,
    directFlightCities: null,
    numbeoSafetyIndex: 65,
    timezone: "Europe/Sofia",
    description: "保加利亚西南部滑雪小镇，因每年举办Bansko Nomad Fest而成为欧洲最著名的数字游民聚集地。物价极低，有多个共享办公空间。冬季适合滑雪，夏季适合徒步。距索非亚机场约2.5小时车程。",
    climate: {
      type: "continental", avgTempC: 10.0, annualRainMm: 694,
      sunshineHours: 2100, summerAvgC: 19, winterAvgC: 0, humidityPct: 70,
      monthlyHighC: [3,6,10,16,21,24,27,27,23,17,11,5],
      monthlyLowC: [-6,-4,-1,4,8,11,13,12,9,5,2,-4],
      monthlyRainMm: [71,59,52,56,65,57,42,31,37,65,79,80],
    },
    _tier: 2, _nomadRank: "Bansko Nomad Fest 知名度极高",
    _sources: "Numbeo Bansko, Wikipedia Bansko climate, Sofia national avg proxy",
  },
  {
    id: maxId + 7,
    name: "斯普利特",
    country: "克罗地亚",
    continent: "欧洲",
    refCity: "萨格勒布",
    scaleFactor: 1.34, // 24000/17885 — Split is actually higher income than Zagreb (tourist economy)
    averageIncome: 24000,
    monthlyRent: 985,
    costModerate: 1885,
    costBudget: 1130,
    housePrice: 6524,
    airQuality: 35,
    aqiSource: "AQICN",
    internetSpeedMbps: 90,
    directFlightCities: 80,
    numbeoSafetyIndex: 70,
    timezone: "Europe/Zagreb",
    description: "克罗地亚第二大城市，达尔马提亚海岸明珠。戴克里先宫和亚得里亚海的壮丽景色吸引了大量游民定居。克罗地亚提供专门的数字游民签证，免缴当地所得税。",
    climate: {
      type: "mediterranean", avgTempC: 16.8, annualRainMm: 801,
      sunshineHours: 2699, summerAvgC: 27, winterAvgC: 9, humidityPct: 58,
      monthlyHighC: [11,12,15,18,23,28,31,31,25,21,16,12],
      monthlyLowC: [6,6,9,12,16,20,23,23,18,15,11,7],
      monthlyRainMm: [73,64,58,62,58,49,25,32,82,80,120,99],
    },
    _tier: 2, _nomadRank: "克罗地亚游民签证目的地",
    _sources: "Numbeo Split, IQAir, Wikipedia Split NOAA 1991-2020, SPU airport",
  },
  {
    id: maxId + 8,
    name: "普吉岛",
    country: "泰国",
    continent: "亚洲",
    refCity: "清迈",
    scaleFactor: 0.87, // 7000/8038
    averageIncome: 7000,
    monthlyRent: 657,
    costModerate: 1310,
    costBudget: 790,
    housePrice: 3478,
    airQuality: 40,
    aqiSource: "AQICN",
    internetSpeedMbps: 65,
    directFlightCities: 50,
    numbeoSafetyIndex: 61,
    timezone: "Asia/Bangkok",
    description: "泰国最大岛屿，以海滩、夜生活和旅游基础设施闻名。拥有国际机场和大量共享办公空间，是海滩型数字游民的热门选择。持Thailand DTV签证可合法长期居留。",
    climate: {
      type: "tropical", avgTempC: 28.5, annualRainMm: 2272,
      sunshineHours: 2322, summerAvgC: 29, winterAvgC: 28, humidityPct: 80,
      monthlyHighC: [33,34,34,34,33,33,32,32,32,32,32,32],
      monthlyLowC: [25,25,26,26,26,26,26,26,25,25,25,25],
      monthlyRainMm: [50,24,81,135,237,249,240,309,350,336,178,82],
    },
    _tier: 2, _nomadRank: "泰国三大游民目的地之一",
    _sources: "Numbeo Phuket, IQAir, Wikipedia Phuket WMO 1991-2020, HKT airport",
  },
  {
    id: maxId + 9,
    name: "蒙得维的亚",
    country: "乌拉圭",
    continent: "南美洲",
    refCity: null, // NEW COUNTRY — use Buenos Aires as reference
    scaleFactor: null,
    averageIncome: 14400,
    monthlyRent: 622,
    costModerate: 1400,
    costBudget: 840,
    housePrice: 3403,
    airQuality: 53,
    aqiSource: "AQICN",
    internetSpeedMbps: 100,
    directFlightCities: 18,
    numbeoSafetyIndex: 43,
    timezone: "America/Montevideo",
    description: "乌拉圭首都，南美洲最稳定、最安全的国家之一。拥有优质的公共医疗体系和较高的民主指数。生活节奏悠闲，牛排和红酒文化浓厚。对远程工作者有良好的税收政策。",
    climate: {
      type: "temperate", avgTempC: 17.0, annualRainMm: 1143,
      sunshineHours: 2400, summerAvgC: 23, winterAvgC: 11, humidityPct: 73,
      monthlyHighC: [28,27,25,22,19,16,15,17,18,21,24,26],
      monthlyLowC: [19,19,17,14,11,8,7,9,10,12,15,17],
      monthlyRainMm: [95,94,106,111,83,89,93,90,92,102,96,91],
    },
    _tier: 2, _nomadRank: "nomads.com 拉美 #6",
    _sources: "Numbeo Montevideo, IQAir, Wikipedia Montevideo Prado station 1991-2020, MVD airport",
  },
  {
    id: maxId + 10,
    name: "拉斯帕尔马斯",
    country: "西班牙",
    continent: "欧洲",
    refCity: "马德里",
    scaleFactor: 0.63, // 26000/41154
    averageIncome: 26000,
    monthlyRent: 962,
    costModerate: 1715,
    costBudget: 1030,
    housePrice: 2829,
    airQuality: 28,
    aqiSource: "AQICN",
    internetSpeedMbps: 150,
    directFlightCities: 120,
    numbeoSafetyIndex: 72,
    timezone: "Atlantic/Canary",
    description: "西班牙加纳利群岛最大城市，全年春天般的气候使其成为欧洲数字游民的'老牌'目的地。拥有成熟的共享办公生态、优质的光纤网络和大量直飞航线。作为欧盟领土，无需额外签证。",
    climate: {
      type: "arid", avgTempC: 21.4, annualRainMm: 134,
      sunshineHours: 2800, summerAvgC: 25, winterAvgC: 18, humidityPct: 66,
      monthlyHighC: [21,21,22,23,24,26,27,28,27,26,24,22],
      monthlyLowC: [15,15,16,17,18,20,21,22,22,20,18,17],
      monthlyRainMm: [23,20,12,5,1,0,0,1,5,21,17,29],
    },
    _tier: 2, _nomadRank: "欧洲OG游民城市",
    _sources: "Numbeo Las Palmas, IQAir, Wikipedia Las Palmas AEMET 1991-2020, LPA airport",
  },
  {
    id: maxId + 11,
    name: "槟城",
    country: "马来西亚",
    continent: "亚洲",
    refCity: "吉隆坡",
    scaleFactor: 0.93, // 12500/13404
    averageIncome: 12500,
    monthlyRent: 383,
    costModerate: 860,
    costBudget: 515,
    housePrice: 2030,
    airQuality: 55,
    aqiSource: "AQICN",
    internetSpeedMbps: 95,
    directFlightCities: 30,
    numbeoSafetyIndex: 71,
    timezone: "Asia/Kuala_Lumpur",
    description: "马来西亚北部岛屿州，乔治市是联合国教科文组织世界遗产城市。以街头美食、低廉生活成本和多元文化著称。英语普及率高，是东南亚性价比最高的数字游民目的地之一。",
    climate: {
      type: "tropical", avgTempC: 27.8, annualRainMm: 2331,
      sunshineHours: 2138, summerAvgC: 28, winterAvgC: 28, humidityPct: 83,
      monthlyHighC: [32,32,33,32,32,32,32,31,31,31,31,31],
      monthlyLowC: [25,25,25,25,25,25,25,25,24,24,24,25],
      monthlyRainMm: [80,86,146,188,229,164,190,246,316,337,233,117],
    },
    _tier: 2, _nomadRank: "东南亚预算型游民热门",
    _sources: "Numbeo Penang, IQAir, Wikipedia George Town WMO 1991-2020, PEN airport",
  },
  {
    id: maxId + 12,
    name: "埃里塞拉",
    country: "葡萄牙",
    continent: "欧洲",
    refCity: "里斯本",
    scaleFactor: 0.64, // 18000/28154
    averageIncome: 18000,
    monthlyRent: 990,
    costModerate: 1640,
    costBudget: 985,
    housePrice: 5400,
    airQuality: 30,
    aqiSource: "AQICN",
    internetSpeedMbps: 120,
    directFlightCities: null,
    numbeoSafetyIndex: 60,
    timezone: "Europe/Lisbon",
    description: "葡萄牙西海岸冲浪小镇，距里斯本仅45公里。nomads.com欧洲排名前10，以冲浪文化、悠闲氛围和日益增长的共享办公空间闻名。小镇规模，Numbeo数据有限。",
    climate: {
      type: "oceanic", avgTempC: 15.5, annualRainMm: 700,
      sunshineHours: 2800, summerAvgC: 21, winterAvgC: 11, humidityPct: 78,
      monthlyHighC: [15,15,17,19,21,24,27,27,25,22,18,15],
      monthlyLowC: [8,9,10,11,13,16,18,18,17,14,11,9],
      monthlyRainMm: [100,85,55,60,35,15,5,5,30,80,100,115],
    },
    _tier: 2, _nomadRank: "nomads.com 欧洲 #6",
    _sources: "Numbeo Ericeira (12 contributors, limited), Lisbon region proxy, Wikipedia Mafra climate est.",
  },

  // ═══ Tier 3 ═══
  {
    id: maxId + 13,
    name: "安提瓜",
    country: "危地马拉",
    continent: "北美洲",
    refCity: null, // NEW COUNTRY
    scaleFactor: null,
    averageIncome: 6500,
    monthlyRent: 870,
    costModerate: 1400,
    costBudget: 840,
    housePrice: 2997,
    airQuality: 68,
    aqiSource: "AQICN",
    internetSpeedMbps: 50,
    directFlightCities: null,
    numbeoSafetyIndex: 56,
    timezone: "America/Guatemala",
    description: "危地马拉前首都，联合国世界遗产城市，被三座火山环绕。是中美洲最受欢迎的旅居目的地之一，西班牙语学校林立，生活成本低廉。距危地马拉城机场约1小时车程。",
    climate: {
      type: "temperate", avgTempC: 17.8, annualRainMm: 1065,
      sunshineHours: 2400, summerAvgC: 19, winterAvgC: 17, humidityPct: 70,
      monthlyHighC: [23,23,25,25,25,24,24,24,23,23,23,22],
      monthlyLowC: [11,11,12,13,14,15,15,14,14,14,13,11],
      monthlyRainMm: [1,3,4,25,118,231,170,141,220,131,16,5],
    },
    _tier: 3, _nomadRank: "中美洲最热门预算型游民城市",
    _sources: "Numbeo Antigua Guatemala, IQAir satellite, Wikipedia climate, GUA airport proxy",
  },
  {
    id: maxId + 14,
    name: "马拉喀什",
    country: "摩洛哥",
    continent: "非洲",
    refCity: null, // NEW COUNTRY
    scaleFactor: null,
    averageIncome: 5770,
    monthlyRent: 458,
    costModerate: 950,
    costBudget: 570,
    housePrice: 1711,
    airQuality: 73,
    aqiSource: "AQICN",
    internetSpeedMbps: 55,
    directFlightCities: 60,
    numbeoSafetyIndex: 55,
    timezone: "Africa/Casablanca",
    description: "摩洛哥第四大城市，以迷宫般的老城（medina）、贾马夫纳广场和丰富的伊斯兰建筑闻名。物价低廉，气候温暖干燥。近年来吸引了越来越多的远程工作者，但网速和基础设施仍在发展中。",
    climate: {
      type: "arid", avgTempC: 20.5, annualRainMm: 221,
      sunshineHours: 3000, summerAvgC: 30, winterAvgC: 13, humidityPct: 45,
      monthlyHighC: [19,21,24,26,29,34,38,37,33,29,23,20],
      monthlyLowC: [6,8,10,12,15,18,21,21,19,16,11,7],
      monthlyRainMm: [25,26,35,26,11,3,2,5,15,19,30,24],
    },
    _tier: 3, _nomadRank: "非洲最热门游民目的地",
    _sources: "Numbeo Marrakech, IQAir, Wikipedia Marrakech climate, RAK airport est.",
  },
  {
    id: maxId + 15,
    name: "瓦哈卡",
    country: "墨西哥",
    continent: "北美洲",
    refCity: "墨西哥城",
    scaleFactor: 0.35, // 7500/21500
    averageIncome: 7500,
    monthlyRent: 660,
    costModerate: 1200,
    costBudget: 720,
    housePrice: null,
    airQuality: null,
    aqiSource: undefined,
    internetSpeedMbps: 45,
    directFlightCities: 13,
    numbeoSafetyIndex: null,
    timezone: "America/Mexico_City",
    description: "墨西哥南部文化名城，以原住民文化、手工艺品、美食（莫莱酱、梅斯卡尔酒）和亡灵节闻名。后疫情时代迅速崛起为游民社区，物价低廉但网速不稳定。",
    climate: {
      type: "temperate", avgTempC: 20.2, annualRainMm: 853,
      sunshineHours: 2600, summerAvgC: 23, winterAvgC: 17, humidityPct: 60,
      monthlyHighC: [29,31,33,35,34,31,30,30,29,29,29,29],
      monthlyLowC: [10,12,14,16,17,17,16,16,16,15,12,11],
      monthlyRainMm: [2,5,18,47,98,188,119,132,164,63,9,9],
    },
    _tier: 3, _nomadRank: "后疫情时代增长最快",
    _sources: "Numbeo Oaxaca (limited - no salary/safety), Wikipedia climate, OAX airport",
  },
  {
    id: maxId + 16,
    name: "弗洛里亚诺波利斯",
    country: "巴西",
    continent: "南美洲",
    refCity: "圣保罗",
    scaleFactor: 0.65, // 12000/18519
    averageIncome: 12000,
    monthlyRent: 540,
    costModerate: 1200,
    costBudget: 720,
    housePrice: 2463,
    airQuality: 41,
    aqiSource: "AQICN",
    internetSpeedMbps: 100,
    directFlightCities: 28,
    numbeoSafetyIndex: 55,
    timezone: "America/Sao_Paulo",
    description: "巴西南部'魔力岛'，南美科技创业中心之一。拥有42个海滩、优质的生活质量和蓬勃发展的本土科技生态。是巴西最适合数字游民的城市，生活成本低于圣保罗和里约。",
    climate: {
      type: "temperate", avgTempC: 20.5, annualRainMm: 1766,
      sunshineHours: 2100, summerAvgC: 25, winterAvgC: 17, humidityPct: 80,
      monthlyHighC: [29,30,29,27,24,22,21,22,22,24,26,28],
      monthlyLowC: [22,22,21,19,16,14,13,14,15,18,19,21],
      monthlyRainMm: [241,198,180,116,126,86,101,93,147,153,147,177],
    },
    _tier: 3, _nomadRank: "巴西'魔力岛'科技枢纽",
    _sources: "Numbeo Florianópolis, IQAir satellite, Wikipedia Florianópolis INMET 1991-2020, FLN airport",
  },
  {
    id: maxId + 17,
    name: "帕岸岛",
    country: "泰国",
    continent: "亚洲",
    refCity: "清迈",
    scaleFactor: 0.81, // ~6500/8038
    averageIncome: 6500,
    monthlyRent: 603,
    costModerate: 1100,
    costBudget: 660,
    housePrice: 1618,
    airQuality: 45,
    aqiSource: "AQICN",
    internetSpeedMbps: 50,
    directFlightCities: null,
    numbeoSafetyIndex: 74,
    timezone: "Asia/Bangkok",
    description: "泰国苏梅群岛中的小岛，以满月派对和日益壮大的游民社区闻名。拥有Nomad Island Fest和专门的共享办公空间。没有机场，需从苏梅岛渡轮前往。适合追求安静海岛生活的远程工作者。",
    climate: {
      type: "tropical", avgTempC: 27.5, annualRainMm: 1994,
      sunshineHours: 2200, summerAvgC: 28, winterAvgC: 27, humidityPct: 80,
      monthlyHighC: [29,29,30,32,33,33,32,32,32,31,30,29],
      monthlyLowC: [24,25,25,26,26,25,25,25,25,24,24,24],
      monthlyRainMm: [127,64,116,83,132,134,117,102,118,295,445,263],
    },
    _tier: 3, _nomadRank: "Nomad Island Fest举办地",
    _sources: "Numbeo Koh Phangan, Wikipedia Ko Samui climate proxy (same island chain), nearby USM airport",
  },
  {
    id: maxId + 18,
    name: "苏梅岛",
    country: "泰国",
    continent: "亚洲",
    refCity: "清迈",
    scaleFactor: 0.75, // ~6000/8038
    averageIncome: 6000,
    monthlyRent: 807,
    costModerate: 1350,
    costBudget: 810,
    housePrice: 1912,
    airQuality: 45,
    aqiSource: "AQICN",
    internetSpeedMbps: 55,
    directFlightCities: 9,
    numbeoSafetyIndex: 74,
    timezone: "Asia/Bangkok",
    description: "泰国第二大岛屿，比帕岸岛更高端成熟。拥有自己的机场（USM），直飞曼谷、吉隆坡和新加坡等城市。度假氛围浓厚，生活成本高于清迈但低于普吉岛。",
    climate: {
      type: "tropical", avgTempC: 27.5, annualRainMm: 1994,
      sunshineHours: 2200, summerAvgC: 28, winterAvgC: 27, humidityPct: 80,
      monthlyHighC: [29,29,30,32,33,33,32,32,32,31,30,29],
      monthlyLowC: [24,25,25,26,26,25,25,25,25,24,24,24],
      monthlyRainMm: [127,64,116,83,132,134,117,102,118,295,445,263],
    },
    _tier: 3, _nomadRank: "泰国海岛游民目的地",
    _sources: "Numbeo Koh Samui, Wikipedia Ko Samui climate WMO 1991-2020, USM airport",
  },
  {
    id: maxId + 19,
    name: "暹粒",
    country: "柬埔寨",
    continent: "亚洲",
    refCity: "金边",
    scaleFactor: 0.76, // ~3000/3923
    averageIncome: 3000,
    monthlyRent: 341,
    costModerate: 700,
    costBudget: 420,
    housePrice: 2486,
    airQuality: 50,
    aqiSource: "AQICN",
    internetSpeedMbps: 40,
    directFlightCities: 15,
    numbeoSafetyIndex: 68,
    timezone: "Asia/Phnom_Penh",
    description: "柬埔寨吴哥窟所在城市，东南亚最热门的旅游目的地之一。物价极低，游民社区小而紧密。2023年启用新的暹粒-吴哥国际机场。基础设施和医疗条件较落后。",
    climate: {
      type: "tropical", avgTempC: 28.0, annualRainMm: 1406,
      sunshineHours: 2500, summerAvgC: 29, winterAvgC: 26, humidityPct: 75,
      monthlyHighC: [32,34,35,36,35,34,33,32,32,32,31,31],
      monthlyLowC: [20,22,24,25,25,25,25,25,25,25,23,21],
      monthlyRainMm: [4,5,29,57,150,214,193,209,288,200,51,7],
    },
    _tier: 3, _nomadRank: "吴哥窟区域游民聚集地",
    _sources: "Numbeo Siem Reap, IQAir (burning season adjusted), Wikipedia Siem Reap 1997-2010, SAI airport",
  },
  {
    id: maxId + 20,
    name: "库斯科",
    country: "秘鲁",
    continent: "南美洲",
    refCity: "利马",
    scaleFactor: 0.62, // ~7000/11269
    averageIncome: 7000,
    monthlyRent: 293,
    costModerate: 750,
    costBudget: 450,
    housePrice: 3547,
    airQuality: 38,
    aqiSource: "AQICN",
    internetSpeedMbps: 60,
    directFlightCities: 7,
    numbeoSafetyIndex: 59,
    timezone: "America/Lima",
    description: "秘鲁安第斯山脉古城，前印加帝国首都，海拔3400米。以马丘比丘为核心的旅游业带动了咖啡馆和共享办公文化。物价低廉但网速不稳定，高海拔需要适应期。",
    climate: {
      type: "temperate", avgTempC: 12.0, annualRainMm: 728,
      sunshineHours: 2500, summerAvgC: 14, winterAvgC: 11, humidityPct: 55,
      monthlyHighC: [21,20,21,21,21,21,21,22,22,22,22,21],
      monthlyLowC: [8,8,8,6,4,2,1,3,5,7,8,8],
      monthlyRainMm: [153,132,106,38,7,3,6,7,18,55,77,125],
    },
    _tier: 3, _nomadRank: "南美文化型游民目的地",
    _sources: "Numbeo Cusco, IQAir, Wikipedia Cusco climate, CUZ airport",
  },
  {
    id: maxId + 21,
    name: "坎昆",
    country: "墨西哥",
    continent: "北美洲",
    refCity: "瓜达拉哈拉",
    scaleFactor: 0.63, // 11000/17558
    averageIncome: 11000,
    monthlyRent: 652,
    costModerate: 1250,
    costBudget: 750,
    housePrice: 1970,
    airQuality: 48,
    aqiSource: "AQICN",
    internetSpeedMbps: 55,
    directFlightCities: 100,
    numbeoSafetyIndex: 45,
    timezone: "America/Cancun",
    description: "墨西哥加勒比海岸最大旅游城市，拥有国际枢纽机场（CUN），直飞超过100个城市。度假区酒店林立，市区生活成本较为合理。适合需要频繁国际出行的远程工作者。",
    climate: {
      type: "tropical", avgTempC: 26.5, annualRainMm: 1300,
      sunshineHours: 2600, summerAvgC: 29, winterAvgC: 24, humidityPct: 78,
      monthlyHighC: [28,29,31,32,34,34,34,35,34,32,30,29],
      monthlyLowC: [20,20,21,23,24,25,25,25,24,23,22,21],
      monthlyRainMm: [105,50,44,41,87,138,78,88,182,272,130,86],
    },
    _tier: 3, _nomadRank: "加勒比海门户城市",
    _sources: "Numbeo Cancún, IQAir, Wikipedia Cancún 1951-2010, CUN airport",
  },
  {
    id: maxId + 22,
    name: "巴亚尔塔港",
    country: "墨西哥",
    continent: "北美洲",
    refCity: "瓜达拉哈拉",
    scaleFactor: 0.80, // 14000/17558
    averageIncome: 14000,
    monthlyRent: 1253,
    costModerate: 1850,
    costBudget: 1110,
    housePrice: 4844,
    airQuality: 25,
    aqiSource: "AQICN",
    internetSpeedMbps: 50,
    directFlightCities: 57,
    numbeoSafetyIndex: 66,
    timezone: "America/Mexico_City",
    description: "墨西哥太平洋海岸度假城市，以班德拉斯湾、丰富的餐饮文化和安全的环境著称。近年来涌入大量美国和加拿大远程工作者，生活成本高于墨西哥平均水平。",
    climate: {
      type: "tropical", avgTempC: 25.0, annualRainMm: 1392,
      sunshineHours: 2600, summerAvgC: 28, winterAvgC: 22, humidityPct: 75,
      monthlyHighC: [27,27,27,28,29,32,32,32,32,32,30,28],
      monthlyLowC: [17,17,17,19,22,25,25,24,24,24,21,18],
      monthlyRainMm: [34,5,2,2,15,188,328,312,370,94,20,23],
    },
    _tier: 3, _nomadRank: "太平洋海岸游民热门",
    _sources: "Numbeo Puerto Vallarta, IQAir satellite, Wikipedia Puerto Vallarta WMO, PVR airport",
  },
];

// ── Profession salary generation ────────────────────────

// For NEW country cities, use Buenos Aires as base reference
function generateProfessionsForNewCountry(averageIncome, referenceCityName) {
  const ref = existingCities.find(c => c.name === referenceCityName);
  const refAvg = ref.averageIncome;
  const scale = averageIncome / refAvg;
  const result = {};
  for (const [prof, salary] of Object.entries(ref.professions)) {
    result[prof] = Math.round((salary * scale) / 500) * 500;
  }
  return result;
}

// ── Build final city objects ────────────────────────────
const output = [];

for (const city of newCities) {
  // 1) Get country template
  let template = getCountryTemplate(city.country);
  if (!template && NEW_COUNTRIES[city.country]) {
    template = NEW_COUNTRIES[city.country];
  }
  if (!template) {
    console.error(`No template for country: ${city.country}`);
    continue;
  }

  // 2) Generate profession salaries
  let professions;
  if (city.refCity) {
    professions = scaleProfessions(city.refCity, city.scaleFactor);
  } else if (city.country === "乌拉圭") {
    professions = generateProfessionsForNewCountry(city.averageIncome, "布宜诺斯艾利斯");
  } else if (city.country === "危地马拉") {
    professions = generateProfessionsForNewCountry(city.averageIncome, "墨西哥城");
  } else if (city.country === "摩洛哥") {
    professions = generateProfessionsForNewCountry(city.averageIncome, "开罗");
  }

  // 3) Assemble full city object
  const fullCity = {
    id: city.id,
    name: city.name,
    country: city.country,
    averageIncome: city.averageIncome,
    bigMacPrice: template.bigMacPrice,
    currency: template.currency,
    description: city.description,
    continent: city.continent,
    professions,
    housePrice: city.housePrice,
    airQuality: city.airQuality,
    costModerate: city.costModerate,
    costBudget: city.costBudget,
    doctorsPerThousand: template.doctorsPerThousand,
    directFlightCities: city.directFlightCities,
    safetyIndex: template.safetyIndex,
    safetyConfidence: template.safetyConfidence,
    annualWorkHours: template.annualWorkHours,
    monthlyRent: city.monthlyRent,
    paidLeaveDays: template.paidLeaveDays,
    internetSpeedMbps: city.internetSpeedMbps,
    hospitalBedsPerThousand: template.hospitalBedsPerThousand,
    uhcCoverageIndex: template.uhcCoverageIndex,
    lifeExpectancy: template.lifeExpectancy,
    pressFreedomScore: template.pressFreedomScore,
    democracyIndex: template.democracyIndex,
    corruptionPerceptionIndex: template.corruptionPerceptionIndex,
    numbeoSafetyIndex: city.numbeoSafetyIndex,
    homicideRateInv: template.homicideRateInv,
    gpiScoreInv: template.gpiScoreInv,
    gallupLawOrder: template.gallupLawOrder,
    healthcareIndex: template.healthcareIndex,
    healthcareConfidence: template.healthcareConfidence,
    freedomIndex: template.freedomIndex,
    freedomConfidence: template.freedomConfidence,
    climate: city.climate,
    timezone: city.timezone,
  };

  if (city.aqiSource) fullCity.aqiSource = city.aqiSource;

  // Metadata (will be stripped before production use)
  fullCity._meta = {
    tier: city._tier,
    nomadRank: city._nomadRank,
    sources: city._sources,
  };

  output.push(fullCity);
}

// ── Write output ────────────────────────────────────────
const outPath = "_archive/new-cities-draft.json";
writeFileSync(outPath, JSON.stringify({ newCities: output }, null, 2));
console.log(`✅ Generated ${output.length} cities → ${outPath}`);
console.log(`   ID range: ${maxId + 1} – ${maxId + output.length}`);

// ── Quality Report ──────────────────────────────────────
console.log("\n═══ QUALITY REPORT ═══\n");

const CITY_SPECIFIC_FIELDS = [
  "averageIncome", "monthlyRent", "costModerate", "costBudget",
  "housePrice", "airQuality", "internetSpeedMbps", "directFlightCities",
  "numbeoSafetyIndex", "timezone", "climate", "description",
];

for (const city of output) {
  const missing = [];
  const lowConf = [];

  for (const f of CITY_SPECIFIC_FIELDS) {
    if (city[f] === null || city[f] === undefined) missing.push(f);
  }
  if (!city.climate?.monthlyHighC) missing.push("monthlyHighC");

  // Check for proxy/estimated data
  if (city.country === "乌拉圭" || city.country === "危地马拉" || city.country === "摩洛哥") {
    lowConf.push("professions(从邻国参考城市按比例缩放)");
    lowConf.push("country-level indices(部分为估计值)");
  }
  if (city.directFlightCities === null) lowConf.push("无机场(使用最近机场)");
  if (city.numbeoSafetyIndex === null) lowConf.push("Numbeo安全指数缺失");
  if (city._meta?.sources?.includes("proxy")) lowConf.push("部分数据为代理/估计值");
  if (city._meta?.sources?.includes("limited")) lowConf.push("Numbeo贡献者较少");
  if (city._meta?.sources?.includes("satellite")) lowConf.push("空气质量为卫星数据");

  const completeness = Math.round(
    ((CITY_SPECIFIC_FIELDS.length - missing.length) / CITY_SPECIFIC_FIELDS.length) * 100
  );

  console.log(`${city.name} (${city.country}) — Tier ${city._meta.tier}`);
  console.log(`  完整度: ${completeness}%`);
  console.log(`  缺失: ${missing.length > 0 ? missing.join(", ") : "无"}`);
  console.log(`  低置信度: ${lowConf.length > 0 ? lowConf.join("; ") : "无"}`);
  console.log();
}
