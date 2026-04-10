#!/usr/bin/env node
/**
 * Add 20 new cities to cities.json:
 * - 19 from _archive/new-cities-draft.json (exclude IDs 151, 152, 154)
 * - 1 new Kyoto entry
 * Reassigns IDs 140-159, merges into cities.json.
 */
import { readFileSync, writeFileSync } from 'fs';

const citiesPath = './public/data/cities.json';
const draftPath = './_archive/new-cities-draft.json';

// ── Read existing data ──
const raw = JSON.parse(readFileSync(citiesPath, 'utf8'));
const existingCities = raw.cities || raw;
const draft = JSON.parse(readFileSync(draftPath, 'utf8'));

// ── Filter draft: exclude Ericeira(151), Antigua(152), Oaxaca(154) ──
const EXCLUDE_IDS = new Set([151, 152, 154]);
const kept = draft.newCities.filter(c => !EXCLUDE_IDS.has(c.id));
console.log(`Kept ${kept.length} cities from draft (excluded 3)`);

// ── Build Kyoto data (calibrated from Osaka @ 85.5% ratio) ──
const SCALE = 0.855; // Kyoto/Osaka salary ratio
const osakaProfs = {
  "软件工程师": 86000, "医生/医学博士": 100000, "财务分析师": 55000,
  "市场经理": 50000, "平面设计师": 32000, "数据科学家": 78000,
  "销售经理": 55000, "人力资源经理": 48000, "教师": 42000,
  "护士": 36000, "律师": 72000, "建筑师": 48000,
  "厨师": 28000, "记者": 36000, "机械工程师": 60000,
  "药剂师": 50000, "会计师": 52000, "公务员": 45000,
  "产品经理": 72000, "UI/UX设计师": 45000, "大学教授": 65000,
  "牙医": 72000, "家政服务人员": 20000, "摄影师": 28000,
  "公交司机": 28000, "电工": 34000,
};
const kyotoProfs = {};
for (const [k, v] of Object.entries(osakaProfs)) {
  kyotoProfs[k] = Math.round(v * SCALE / 100) * 100;
}

const kyoto = {
  id: -1, // will be reassigned
  name: "京都",
  country: "日本",
  averageIncome: 44000,
  bigMacPrice: 3.68,
  currency: "USD",
  description: "日本千年古都，拥有17处UNESCO世界遗产和超过2000座寺庙神社。四季分明的文化风情，春樱秋叶尤为动人。生活节奏比东京大阪更为从容，大学城学术氛围浓厚。",
  continent: "亚洲",
  professions: kyotoProfs,
  housePrice: 3800,
  airQuality: 45,
  costModerate: 1800,
  costBudget: 790,
  doctorsPerThousand: 2.6,
  directFlightCities: 100,
  safetyIndex: 89,
  safetyConfidence: "high",
  annualWorkHours: 1607,
  monthlyRent: 550,
  paidLeaveDays: 10,
  internetSpeedMbps: 170,
  hospitalBedsPerThousand: 12.6,
  uhcCoverageIndex: 83,
  lifeExpectancy: 84.5,
  pressFreedomScore: 64,
  democracyIndex: 8.33,
  corruptionPerceptionIndex: 73,
  numbeoSafetyIndex: 79,
  homicideRateInv: 100,
  gpiScoreInv: 92,
  gallupLawOrder: 91,
  healthcareIndex: 72,
  healthcareConfidence: "high",
  freedomIndex: 73,
  freedomConfidence: "high",
  aqiSource: "EPA",
  climate: {
    type: "temperate",
    avgTempC: 16.2,
    annualRainMm: 1523,
    sunshineHours: 1793,
    summerAvgC: 26.4,
    winterAvgC: 5.8,
    humidityPct: 65,
    monthlyHighC: [9, 10, 14, 20, 25, 28, 32, 34, 29, 23, 17, 12],
    monthlyLowC: [2, 2, 4, 9, 15, 19, 24, 25, 21, 14, 8, 4],
    monthlyRainMm: [53, 65, 106, 117, 151, 200, 224, 154, 179, 143, 74, 57],
  },
  timezone: "Asia/Tokyo",
};

// ── Combine and reassign IDs 140-159 ──
const allNew = [...kept, kyoto];
console.log(`Total new cities: ${allNew.length}`);

allNew.forEach((city, i) => {
  city.id = 140 + i;
  // Remove _meta field (not in production data)
  delete city._meta;
});

// ── Merge into existing cities ──
const merged = [...existingCities, ...allNew];
console.log(`Total cities after merge: ${merged.length} (was ${existingCities.length})`);

// ── Validate ──
const ids = merged.map(c => c.id);
const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
if (dupes.length) {
  console.error('DUPLICATE IDS:', dupes);
  process.exit(1);
}

// Check all cities have required fields
const required = ['id', 'name', 'country', 'averageIncome', 'professions', 'climate', 'timezone'];
for (const city of allNew) {
  for (const field of required) {
    if (city[field] === undefined) {
      console.error(`City ${city.name} missing field: ${field}`);
      process.exit(1);
    }
  }
  const profCount = Object.keys(city.professions).length;
  if (profCount !== 26) {
    console.error(`City ${city.name} has ${profCount} professions (need 26)`);
    process.exit(1);
  }
}

// ── Write ──
const output = Array.isArray(raw) ? merged : { cities: merged };
writeFileSync(citiesPath, JSON.stringify(output, null, 2) + '\n');
console.log('✅ cities.json updated');

// ── Output helper data for config files ──
console.log('\n── CITY_SLUGS entries ──');
for (const city of allNew) {
  const slug = city.name
    .replace(/京都/, 'kyoto')
    .replace(/巴厘岛/, 'bali')
    .replace(/岘港/, 'da-nang')
    .replace(/Playa del Carmen/, 'playa-del-carmen')
    .replace(/波尔图/, 'porto')
    .replace(/瓦伦西亚/, 'valencia')
    .replace(/班斯科/, 'bansko')
    .replace(/斯普利特/, 'split')
    .replace(/普吉岛/, 'phuket')
    .replace(/蒙得维的亚/, 'montevideo')
    .replace(/拉斯帕尔马斯/, 'las-palmas')
    .replace(/槟城/, 'penang')
    .replace(/马拉喀什/, 'marrakech')
    .replace(/弗洛里亚诺波利斯/, 'florianopolis')
    .replace(/帕岸岛/, 'koh-phangan')
    .replace(/苏梅岛/, 'koh-samui')
    .replace(/暹粒/, 'siem-reap')
    .replace(/库斯科/, 'cusco')
    .replace(/坎昆/, 'cancun')
    .replace(/巴亚尔塔港/, 'puerto-vallarta');
  console.log(`  ${city.id}: "${slug}",`);
}

console.log('\n── CITY_LANGUAGES entries ──');
for (const city of allNew) {
  const langMap = {
    '日本': '["Japanese"]',
    '印度尼西亚': '["Indonesian"]',
    '越南': '["Vietnamese"]',
    '墨西哥': '["Spanish"]',
    '葡萄牙': '["Portuguese"]',
    '西班牙': '["Spanish"]',
    '保加利亚': '["Bulgarian"]',
    '克罗地亚': '["Croatian"]',
    '泰国': '["Thai"]',
    '乌拉圭': '["Spanish"]',
    '马来西亚': '["Malay"]',
    '摩洛哥': '["Arabic"]',
    '巴西': '["Portuguese"]',
    '柬埔寨': '["Khmer"]',
    '秘鲁': '["Spanish", "Quechua"]',
  };
  console.log(`  ${city.id}: ${langMap[city.country]},  // ${city.name}`);
}
