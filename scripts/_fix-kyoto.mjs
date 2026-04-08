import { readFileSync, writeFileSync } from 'fs';

const data = JSON.parse(readFileSync('./public/data/cities.json', 'utf8'));
const kyoto = data.cities.find(c => c.id === 159);
const osaka = data.cities.find(c => c.id === 106);

// ── Fix 1: No airport ──
kyoto.directFlightCities = null;

// ── Fix 2: Replace all coefficient-based values with traceable data ──

// Source: nomads.com Kyoto page (last updated 2026-04-08)
kyoto.monthlyRent = 447;       // "1br studio rent in center $447 / month"
kyoto.costModerate = 1791;     // "Cost of living for expat $1,791 / month"
kyoto.costBudget = 696;        // "Cost of living for local $696 / month"
kyoto.airQuality = 43;         // "Air quality (annual) 43 US AQI"
kyoto.internetSpeedMbps = 27;  // "Internet 27 Mbps"

// Source: doda.jp (2025 survey, 600k records)
// 京都府 = 404万円/yr gross, at ¥150/USD = $26,933
kyoto.averageIncome = 26933;

// Source: nomads.com "Median home price $302,992"
// Typical Kyoto apartment ~65 sqm → $302,992/65 = $4,661/sqm
// This is a derived calculation from a traceable source
kyoto.housePrice = 4661;

// numbeoSafetyIndex: Numbeo is HTTP 429 blocked
// nomads.com rates Safety as "Great", Lack of crime as "Great"
// Other Japan cities: Tokyo=80, Osaka=77, Nagoya=79, Fukuoka=79, Yokohama=80
// Cannot get exact Numbeo index without Numbeo access
// Keep existing value 79 (within the 77-80 range for Japan)

// ── Fix 3: Professions using doda.jp ratio ──
// Source: doda.jp 2025: 京都府=404万 / 大阪府=411万 = ratio 0.9830
const ratio = 404 / 411;
for (const [k, v] of Object.entries(osaka.professions)) {
  kyoto.professions[k] = Math.round(v * ratio / 100) * 100;
}

writeFileSync('./public/data/cities.json', JSON.stringify(data, null, 2) + '\n');

console.log('Updated Kyoto (id=159):');
console.log('  directFlightCities:', kyoto.directFlightCities);
console.log('  averageIncome:', kyoto.averageIncome);
console.log('  monthlyRent:', kyoto.monthlyRent);
console.log('  costModerate:', kyoto.costModerate);
console.log('  costBudget:', kyoto.costBudget);
console.log('  housePrice:', kyoto.housePrice);
console.log('  airQuality:', kyoto.airQuality);
console.log('  internetSpeedMbps:', kyoto.internetSpeedMbps);
console.log('  numbeoSafetyIndex:', kyoto.numbeoSafetyIndex, '(No Numbeo access)');
console.log('  professions sample:');
console.log('    SE:', kyoto.professions['软件工程师']);
console.log('    Teacher:', kyoto.professions['教师']);
console.log('    Doctor:', kyoto.professions['医生/医学博士']);
