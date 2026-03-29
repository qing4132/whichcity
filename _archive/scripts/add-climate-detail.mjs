/**
 * Add summerAvgC, winterAvgC, humidityPct to CITY_CLIMATE in lib/constants.ts
 *
 * Data sources:
 *   - Summer/Winter avg temps: WMO Climate Normals 1991–2020, NOAA, JMA, BOM,
 *     Met Office, national meteorological agencies
 *   - Humidity: WMO Climate Normals, national met agencies, TimeAndDate.com
 *
 * Northern hemisphere: summer = Jul–Aug mean, winter = Jan mean
 * Southern hemisphere: summer = Jan–Feb mean, winter = Jul mean
 *
 * Run: node scripts/add-climate-detail.mjs
 */

import { readFileSync, writeFileSync } from "fs";

// { cityId: [summerAvgC, winterAvgC, humidityPct] }
const DATA = {
  1:  [24.7,  0.4, 63],  // New York — NOAA Central Park
  2:  [18.7,  5.2, 79],  // London — Met Office Heathrow
  3:  [26.9,  5.4, 63],  // Tokyo — JMA
  4:  [26.7, -3.1, 53],  // Beijing — CMA
  5:  [28.6,  4.2, 77],  // Shanghai — CMA
  6:  [23.5, 13.0, 65],  // Sydney — BOM Observatory Hill (S)
  7:  [28.3, 26.0, 84],  // Singapore — MSS
  8:  [20.5,  4.9, 78],  // Paris — Météo-France
  9:  [22.3, -5.5, 71],  // Toronto — ECCC
  10: [29.0, 16.3, 78],  // Hong Kong — HKO
  11: [23.3, 14.3, 67],  // Los Angeles — NOAA LAX
  12: [17.6, 10.6, 74],  // San Francisco — NOAA SFO
  13: [24.1, -4.2, 71],  // Chicago — NOAA O'Hare
  14: [35.5, 19.0, 60],  // Dubai — NCMS Dubai Intl
  15: [17.9,  3.7, 82],  // Amsterdam — KNMI
  16: [19.3,  0.3, 76],  // Zurich — MeteoSwiss
  17: [20.5,  1.5, 73],  // Geneva — MeteoSwiss
  18: [18.8, -0.5, 76],  // Munich — DWD
  19: [19.5,  0.6, 72],  // Berlin — DWD
  20: [25.0,  9.1, 73],  // Barcelona — AEMET
  21: [25.6,  6.3, 57],  // Madrid — AEMET
  22: [24.8,  2.5, 75],  // Milan — ARPA Lombardia
  23: [25.0,  8.0, 74],  // Rome — AM Italy
  24: [18.4,  3.6, 81],  // Brussels — IRM/KMI
  25: [21.3,  0.3, 72],  // Vienna — ZAMG
  26: [19.3, -1.4, 74],  // Prague — CHMI
  27: [19.2, -2.1, 79],  // Warsaw — IMGW
  28: [23.5, 11.5, 74],  // Lisbon — IPMA
  29: [28.4,  9.6, 62],  // Athens — HNMS
  30: [24.5,  6.1, 73],  // Istanbul — MGM Turkey
  31: [19.0, 14.1, 57],  // Mexico City — SMN Mexico
  32: [22.4, 15.8, 78],  // São Paulo — INMET (S)
  33: [27.2, 21.4, 77],  // Rio de Janeiro — INMET (S)
  34: [28.6, 20.1, 74],  // Miami — NOAA MIA
  35: [26.6,  2.2, 66],  // Washington DC — NOAA DCA
  36: [23.3, -1.2, 65],  // Boston — NOAA Logan
  37: [19.8,  5.3, 77],  // Seattle — NOAA Sea-Tac
  38: [23.0, -0.1, 46],  // Denver — NOAA DEN
  39: [29.5, 10.5, 67],  // Austin — NOAA AUS
  40: [18.0,  3.6, 74],  // Vancouver — ECCC
  41: [21.7, -9.7, 73],  // Montreal — ECCC
  42: [20.8, 10.0, 61],  // Melbourne — BOM (S)
  43: [25.5, 15.2, 62],  // Brisbane — BOM (S)
  44: [20.1, 11.0, 80],  // Auckland — NIWA (S)
  45: [30.7, 26.0, 73],  // Bangkok — TMD
  46: [28.3, 27.0, 80],  // Kuala Lumpur — MetMalaysia
  47: [29.5, 25.8, 74],  // Ho Chi Minh City — VNMS
  48: [29.6, 16.4, 79],  // Hanoi — VNMS
  49: [27.8, 21.0, 67],  // Bengaluru — IMD
  50: [30.4, 24.3, 74],  // Mumbai — IMD
  51: [34.1, 14.0, 55],  // New Delhi — IMD
  52: [19.8, 17.1, 67],  // Nairobi — KMD
  53: [28.4, 13.9, 55],  // Cairo — EMA
  54: [30.1,  3.8, 40],  // Tehran — IRIMO
  55: [31.5, 19.1, 58],  // Karachi — PMD
  56: [32.2, 10.1, 56],  // Islamabad — PMD
  57: [28.2, 26.8, 80],  // Jakarta — BMKG (S)
  58: [29.9, 25.5, 77],  // Manila — PAGASA
  59: [25.7, -2.4, 66],  // Seoul — KMA
  60: [25.7,  2.5, 65],  // Busan — KMA
  61: [29.6, 16.1, 76],  // Taipei — CWA
  62: [25.1, 11.0, 72],  // Buenos Aires — SMN Argentina (S)
  63: [21.3,  8.1, 62],  // Santiago — DMC Chile (S)
  64: [14.8, 13.3, 78],  // Bogota — IDEAM
  65: [22.5, 15.3, 82],  // Lima — SENAMHI
  66: [22.6, 20.8, 78],  // Caracas — INAMEH
  67: [20.5, 10.7, 53],  // Johannesburg — SAWS (S)
  68: [22.1, 12.4, 76],  // Cape Town — SAWS (S)
  69: [24.0, 16.5, 50],  // Guadalajara — SMN Mexico
  70: [21.8, 20.0, 79],  // San José — IMN Costa Rica
  71: [27.8, 26.7, 77],  // Panama City — ETESA
  72: [27.5, 22.0, 77],  // Havana — INSMET Cuba
  73: [28.5, 25.2, 73],  // San Juan — NWS San Juan
  74: [28.5, 25.0, 73],  // Montego Bay — Met Service Jamaica
  75: [35.2, 18.8, 61],  // Abu Dhabi — NCMS
  76: [36.2, 17.8, 50],  // Doha — QMD
  77: [34.6, 17.2, 62],  // Manama — BMD
  78: [36.0, 14.4, 26],  // Riyadh — PME Saudi
  79: [34.2, 20.9, 58],  // Muscat — DGMAN Oman
  80: [27.5, 13.7, 68],  // Beirut — DGCA Lebanon
  81: [25.8,  8.5, 51],  // Amman — JMD
  82: [27.0, 13.4, 67],  // Tel Aviv — IMS Israel
  83: [30.5, 22.5, 59],  // Hyderabad — IMD
  84: [27.5, 21.5, 61],  // Pune — IMD
  85: [20.5, -3.5, 74],  // Kyiv — UkrHMC
  86: [23.0, -1.0, 73],  // Bucharest — ANM Romania
  87: [21.4, -0.4, 69],  // Sofia — NIMH Bulgaria
  88: [22.0,  1.3, 71],  // Zagreb — DHMZ Croatia
  89: [22.5,  1.4, 69],  // Belgrade — RHMZ Serbia
  90: [22.0, -0.4, 71],  // Budapest — OMSZ Hungary
  91: [21.3, -0.1, 72],  // Bratislava — SHMU Slovakia
  92: [21.0,  0.4, 74],  // Ljubljana — ARSO Slovenia
  93: [15.8,  5.3, 82],  // Dublin — Met Éireann
  94: [15.0,  4.5, 83],  // Belfast — Met Office
  95: [27.3,  6.3, 70],  // Atlanta — NOAA ATL
  96: [35.0, 12.3, 23],  // Phoenix — NOAA PHX
  97: [20.2,  5.6, 75],  // Portland — NOAA PDX
  98: [22.3, 14.2, 69],  // San Diego — NOAA SAN
  99: [34.1,  8.0, 23],  // Las Vegas — NOAA LAS
  100:[28.1, 16.1, 74],  // Tampa — NOAA TPA
  101:[28.6, 13.8, 77],  // Guangzhou — CMA
  102:[28.5, 15.4, 77],  // Shenzhen — CMA
  103:[25.8,  5.6, 80],  // Chengdu — CMA
  104:[28.6,  4.2, 76],  // Hangzhou — CMA
  105:[28.5,  7.5, 79],  // Chongqing — CMA
  106:[28.4,  5.5, 65],  // Osaka — JMA
  107:[27.8,  4.4, 68],  // Nagoya — JMA
  108:[25.0, -2.2, 73],  // Incheon — KMA
  109:[29.5, 26.3, 73],  // Phnom Penh — DOM Cambodia
  110:[27.5, 25.0, 76],  // Yangon — DMH Myanmar
  111:[29.5, 21.5, 73],  // Vientiane — DMH Laos
  112:[29.0, 21.0, 66],  // Chiang Mai — TMD
  113:[27.8, 26.5, 81],  // Davao — PAGASA
  114:[29.1, 19.0, 79],  // Dhaka — BMD Bangladesh
  115:[28.2, 26.4, 79],  // Colombo — DoM Sri Lanka
  116:[24.1, 10.8, 69],  // Kathmandu — DHM Nepal
  117:[23.8, -4.7, 59],  // Almaty — Kazhydromet
  118:[27.2,  1.9, 53],  // Tashkent — Uzhydromet
  119:[25.6,  4.4, 68],  // Baku — MENR Azerbaijan
  120:[18.2,-21.6, 53],  // Ulaanbaatar — NAMEM Mongolia
};

const file = "lib/constants.ts";
let src = readFileSync(file, "utf-8");

let count = 0;
for (const [id, [s, w, h]] of Object.entries(DATA)) {
  // Match: id: { ... sunshineHours: NNNN }  and append 3 fields
  const re = new RegExp(
    `(${id.padStart(3)}:\\s*\\{[^}]*sunshineHours:\\s*\\d+)\\s*\\}`,
  );
  if (re.test(src)) {
    src = src.replace(re, `$1, summerAvgC: ${s}, winterAvgC: ${w}, humidityPct: ${h} }`);
    count++;
  } else {
    // Try without padding
    const re2 = new RegExp(
      `(${id}:\\s*\\{[^}]*sunshineHours:\\s*\\d+)\\s*\\}`,
    );
    if (re2.test(src)) {
      src = src.replace(re2, `$1, summerAvgC: ${s}, winterAvgC: ${w}, humidityPct: ${h} }`);
      count++;
    } else {
      console.warn(`WARNING: Could not find entry for city ${id}`);
    }
  }
}

writeFileSync(file, src);
console.log(`Done – updated ${count} / ${Object.keys(DATA).length} cities`);
