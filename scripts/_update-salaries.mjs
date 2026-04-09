/**
 * Update 19 cities' profession salaries with real SalaryExpert data.
 * Source: SalaryExpert (salaryexpert.com), fetched 2026-04-08/09
 *
 * Data flow: SalaryExpert gross annual (local currency)
 *   → convert to USD via exchange rates
 *   → apply approximate tax rates per country
 *   → divide by 12 → monthly net USD
 *   → round to nearest 500 (project convention)
 *
 * Usage: node scripts/_update-salaries.mjs
 */
import { readFileSync, writeFileSync } from "fs";

// --- Exchange rates (1 USD = X local currency) ---
// From project's exchange-rates.json + manual additions for missing currencies
const FX = {
  EUR: 0.8607,    // from project
  IDR: 17073.04,  // from project
  VND: 26242.82,  // from project
  MXN: 17.6632,   // from project
  THB: 32.63,     // from project
  BRL: 5.152,     // from project
  MYR: 4.032,     // from project
  UYU: 43.27,     // xe.com 2026-04-09
  MAD: 8.62,      // xe.com 2026-04-09
  HRK: 6.49,      // historical (Croatia uses EUR since 2023, SalaryExpert still shows HRK; 1 EUR = 7.5345 HRK)
  PEN: 3.38,      // xe.com 2026-04-09
  KHR: 4100,      // approximate
  BGN: 1.6832,    // fixed to EUR: 1 EUR = 1.95583 BGN → BGN/USD = 0.8607 * 1.95583
};

// --- Approximate effective tax rates (employee social + income tax) ---
// These are rough effective rates for median-income earners in each country.
// For more precision, use the project's tax engine (lib/taxUtils.ts).
const TAX_RATES = {
  PT: 0.30,  // Portugal: ~11% SS + ~19% avg income tax
  ES: 0.28,  // Spain: ~6.35% SS + ~22% avg income tax
  MX: 0.25,  // Mexico: ~3% SS + ~22% avg ISR
  HR: 0.32,  // Croatia: ~20% SS + ~12% income tax
  BR: 0.28,  // Brazil: ~11% INSS + ~17% avg IRPF
  UY: 0.28,  // Uruguay: ~15% BPS + ~13% IRPF
  MY: 0.18,  // Malaysia: ~11% EPF + ~7% avg income tax
  ID: 0.20,  // Indonesia: ~5% BPJS + ~15% avg PPh21
  TH: 0.15,  // Thailand: ~5% SS + ~10% avg PIT
  VN: 0.22,  // Vietnam: ~10.5% SI + ~11% avg PIT
  MA: 0.25,  // Morocco: ~6.3% CNSS + ~19% avg IR
  PE: 0.20,  // Peru: ~13% AFP + ~7% avg IR
  BG: 0.24,  // Bulgaria: ~13.78% SS + ~10% flat tax
  KH: 0.10,  // Cambodia: ~0% SS + ~10% avg Tax on Salary
};

// --- Profession key mapping (Chinese → SalaryExpert order) ---
const PROF_KEYS = [
  "软件工程师", "医生/医学博士", "财务分析师", "市场经理", "平面设计师",
  "数据科学家", "销售经理", "人力资源经理", "教师", "护士",
  "律师", "建筑师", "厨师", "记者", "机械工程师",
  "药剂师", "会计师", "公务员", "产品经理", "UI/UX设计师",
  "大学教授", "牙医", "家政服务人员", "摄影师", "公交司机", "电工",
];

// --- Raw SalaryExpert data (annual gross, local currency) ---
// null = data not available from SalaryExpert
const RAW_DATA = {
  // id=140 Bali, Indonesia (IDR)
  140: { currency: "IDR", country: "ID", data: [432612266,721970600,358404061,471023809,231203202,455445248,316412941,435866816,258353482,null,485911157,336769488,237806071,362835238,392518064,468335982,289329824,null,428714178,405309963,350691536,569155660,79022860,231199293,149249534,235804132] },
  // id=141 Da Nang, Vietnam (VND) - country level
  141: { currency: "VND", country: "VN", data: [682808006,1096441459,580838049,758115135,374693345,708037612,509268182,701529781,361175660,425419259,803872091,545776552,332450578,588019319,556526832,609564743,468894716,null,656147916,559637262,580170129,864364646,53430627,315769341,null,182438572] },
  // id=142 Playa del Carmen, Mexico (MXN) - country/PV fallback
  142: { currency: "MXN", country: "MX", data: [659971,793459,526283,921927,339500,619107,619310,853114,317214,293527,829802,479345,301225,532790,592658,441122,411822,null,775129,472556,617836,625513,105537,263397,178706,286896] },
  // id=143 Porto, Portugal (EUR)
  143: { currency: "EUR", country: "PT", data: [56271,93610,53602,null,34578,59512,42368,58365,33331,34499,74446,50366,30678,54265,51543,52041,43271,null,null,44218,53732,73795,13831,29533,22761,32866] },
  // id=144 Valencia, Spain (EUR)
  144: { currency: "EUR", country: "ES", data: [59225,97806,62884,72223,37034,63398,48517,66833,35698,36022,79610,53943,32859,58118,55114,59560,46344,null,60903,48007,57456,77104,17083,34337,25672,38367] },
  // id=145 Bansko, Bulgaria (EUR via SalaryExpert, country level)
  145: { currency: "EUR", country: "BG", data: [38035,59378,23893,38532,15413,32162,25884,35656,15204,16475,45699,22451,null,24188,31638,33011,19288,null,30600,23578,32982,null,null,15204,15204,16604] },
  // id=146 Split, Croatia (EUR — SalaryExpert labels HRK but values are EUR since Croatia adopted EUR 2023-01)
  146: { currency: "EUR", country: "HR", data: [35519,53964,35657,49099,23002,57877,32983,45435,22172,23555,38669,33505,20409,38298,26771,30001,28785,null,40143,33054,29615,42542,12604,21377,15280,23697] },
  // id=147 Phuket, Thailand (THB)
  147: { currency: "THB", country: "TH", data: [1197123,1834380,944376,1845144,609209,896790,1239486,1707423,587231,738173,1474727,887370,540527,960172,1017191,null,765655,null,1536981,878421,1064340,1451476,208797,458648,322027,561707] },
  // id=148 Montevideo, Uruguay (UYU)
  148: { currency: "UYU", country: "UY", data: [1566386,2913269,1322370,1968971,853049,1609310,1322668,1822008,822274,1014109,2048475,1242547,756877,1198800,1269090,1619627,1067513,null,1553464,1176424,1478425,2296636,335461,812914,525455,776112] },
  // id=149 Las Palmas, Spain (EUR) - country level
  149: { currency: "EUR", country: "ES", data: [64871,107132,62884,79110,40566,69454,53143,73206,39102,39455,87199,59088,35992,null,60368,59560,50764,null,66707,52585,62933,84456,17083,37612,28120,42020] },
  // id=150 Penang, Malaysia (MYR)
  150: { currency: "MYR", country: "MY", data: [160987,286407,126087,185792,81338,163060,124807,171925,78403,96977,188674,118476,72168,127646,130621,150053,101787,null,170510,119445,136170,225785,27628,68495,47266,73341] },
  // id=151 Marrakech, Morocco (MAD)
  151: { currency: "MAD", country: "MA", data: [283307,408879,265851,282167,171498,271831,189548,261106,165311,144514,367091,249804,152164,265185,257929,227316,214615,null,238585,212028,268887,322334,63688,137733,97731,143171] },
  // id=152 Florianópolis, Brazil (BRL)
  152: { currency: "BRL", country: "BR", data: [195893,259652,142404,270551,91864,176242,181745,250357,88550,101937,233583,133808,81507,153934,161712,144353,114959,null,261932,132344,180001,231713,27941,70465,47935,74441] },
  // id=153 Ko Pha-ngan, Thailand (THB) - use Phuket/Thailand data
  153: { currency: "THB", country: "TH", data: [1197123,1834380,944376,1845144,609209,896790,1239486,1707423,587231,738173,1474727,887370,540527,960172,1017191,null,765655,null,1536981,878421,1064340,1451476,208797,458648,322027,561707] },
  // id=154 Ko Samui, Thailand (THB) - use Phuket/Thailand data
  154: { currency: "THB", country: "TH", data: [1197123,1834380,944376,1845144,609209,896790,1239486,1707423,587231,738173,1474727,887370,540527,960172,1017191,null,765655,null,1536981,878421,1064340,1451476,208797,458648,322027,561707] },
  // id=155 Siem Reap, Cambodia (KHR) - Paylab.com 75th percentile, national level
  // null: Chef, Journalist, MechE, CivServ, Prof, Housekeeper, Photographer, BusDriver, Electrician
  155: { currency: "KHR", country: "KH", data: [72370536,26116152,29325720,77421324,25990680,31599264,51754932,43988268,12714960,15087684,21639420,44113140,null,null,null,24424056,30604692,null,42161820,38352312,null,23030436,null,null,null,null] },
  // id=156 Cusco, Peru (PEN)
  156: { currency: "PEN", country: "PE", data: [97596,143191,81334,123947,52468,88427,83262,114695,50575,48973,126838,76424,46553,82340,87811,79607,70308,null,100405,69027,91542,121454,16613,41509,31471,44745] },
  // id=157 Cancún, Mexico (MXN)
  157: { currency: "MXN", country: "MX", data: [709997,853603,548806,921927,354030,650333,666253,853114,317214,315774,892699,515678,314117,555591,618023,474559,443036,null,833886,508376,644278,672926,105537,283359,178706,315066] },
  // id=158 Puerto Vallarta, Mexico (MXN)
  158: { currency: "MXN", country: "MX", data: [685805,800713,526283,964927,339500,619107,648195,892905,327252,305016,856061,494515,301225,532790,592658,445155,424854,null,811285,null,617836,625513,105537,263397,183022,286896] },
};

function roundTo500(v) {
  return Math.round(v / 500) * 500;
}

function convertToMonthlyNetUSD(annualGrossLocal, currency, countryCode) {
  const rate = FX[currency];
  if (!rate) throw new Error(`Missing FX rate for ${currency}`);
  const annualGrossUSD = annualGrossLocal / rate;
  const taxRate = TAX_RATES[countryCode];
  if (taxRate === undefined) throw new Error(`Missing tax rate for ${countryCode}`);
  const annualNetUSD = annualGrossUSD * (1 - taxRate);
  const monthlyNetUSD = annualNetUSD / 12;
  return roundTo500(monthlyNetUSD);
}

// --- Main ---
const citiesPath = "public/data/cities.json";
const raw = readFileSync(citiesPath, "utf8");
const data = JSON.parse(raw);

let updatedCount = 0;
let skippedCities = [];

for (const [idStr, cityData] of Object.entries(RAW_DATA)) {
  const id = Number(idStr);
  if (!cityData) {
    skippedCities.push(id);
    continue;
  }

  const city = data.cities.find((c) => c.id === id);
  if (!city) {
    console.error(`City id=${id} not found in cities.json`);
    continue;
  }

  const { currency, country, data: salaries } = cityData;
  const newProf = {};
  let filled = 0;
  let missing = [];

  // First pass: convert all available SalaryExpert data
  for (let i = 0; i < PROF_KEYS.length; i++) {
    const key = PROF_KEYS[i];
    const gross = salaries[i];
    if (gross === null || gross === undefined) {
      missing.push(key);
      continue;
    }
    const monthlyNet = convertToMonthlyNetUSD(gross, currency, country);
    newProf[key] = Math.max(500, monthlyNet);
    filled++;
  }

  // Second pass: fill missing values with estimates (NOT from old coefficient data)
  for (const key of missing) {
    let estimate = null;
    if (key === "公务员") {
      // Civil servant ≈ teacher salary (gov pay scales are similar)
      estimate = newProf["教师"] || null;
    } else if (key === "市场经理" && newProf["人力资源经理"]) {
      // Marketing manager ≈ HR manager (similar management tier)
      estimate = newProf["人力资源经理"];
    } else if (key === "产品经理" && newProf["软件工程师"]) {
      // Product manager ≈ software engineer (tech management)
      estimate = newProf["软件工程师"];
    } else if (key === "药剂师" && newProf["护士"]) {
      // Pharmacist ≈ 1.3× nurse
      estimate = roundTo500(newProf["护士"] * 1.3);
    } else if (key === "护士" && newProf["教师"]) {
      // Nurse ≈ teacher
      estimate = newProf["教师"];
    } else if (key === "UI/UX设计师" && newProf["平面设计师"]) {
      // UX designer ≈ graphic designer × 1.2
      estimate = roundTo500(newProf["平面设计师"] * 1.2);
    } else if (key === "记者" && newProf["教师"]) {
      estimate = roundTo500(newProf["教师"] * 1.2);
    } else if (key === "厨师" && newProf["教师"]) {
      estimate = newProf["教师"];
    } else if (key === "牙医" && newProf["医生/医学博士"]) {
      estimate = roundTo500(newProf["医生/医学博士"] * 0.75);
    } else if (key === "机械工程师") {
      // Mechanical engineer ≈ accountant × 1.1 (technical profession)
      estimate = newProf["会计师"] ? roundTo500(newProf["会计师"] * 1.1) : null;
    } else if (key === "大学教授") {
      // Professor ≈ lawyer (similar professional tier)
      estimate = newProf["律师"] || null;
    } else if (key === "电工") {
      // Electrician ≈ teacher × 0.8 (skilled labor)
      estimate = newProf["教师"] ? roundTo500(newProf["教师"] * 0.8) : null;
    } else if (key === "公交司机") {
      // Bus driver ≈ electrician (if set), else teacher × 0.7
      estimate = newProf["电工"] || (newProf["教师"] ? roundTo500(newProf["教师"] * 0.7) : null);
    } else if (key === "家政服务人员") {
      // Housekeeper ≈ bus driver × 0.7, else teacher × 0.5
      estimate = newProf["公交司机"]
        ? roundTo500(newProf["公交司机"] * 0.7)
        : (newProf["教师"] ? roundTo500(newProf["教师"] * 0.5) : null);
    } else if (key === "摄影师") {
      // Photographer ≈ graphic designer × 0.7 (creative field, lower)
      estimate = newProf["平面设计师"] ? roundTo500(newProf["平面设计师"] * 0.7) : null;
    }
    if (estimate) {
      newProf[key] = Math.max(500, estimate);
      filled++;
    }
  }

  city.professions = newProf;
  updatedCount++;
  console.log(
    `✅ ${city.name} (id=${id}): ${filled}/26 professions updated, ${missing.length} kept as-is [${missing.join(", ")}]`
  );
}

if (skippedCities.length > 0) {
  console.log(`\n⏭️  Skipped cities (no data): ${skippedCities.join(", ")}`);
}

// Write back
writeFileSync(citiesPath, JSON.stringify(data, null, 2) + "\n");
console.log(`\n✅ Done. Updated ${updatedCount} cities in ${citiesPath}`);

// Print sample comparison for verification
console.log("\n--- Sample: Porto (id=143) ---");
const porto = data.cities.find((c) => c.id === 143);
if (porto) {
  for (const [k, v] of Object.entries(porto.professions)) {
    console.log(`  ${k}: $${v}/mo`);
  }
}
