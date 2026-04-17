#!/usr/bin/env node
/**
 * build-clean-v6.mjs — v5 base + H1B salary anchors + NBS housing index + UBS GREBI
 *
 * This build does NOT replace v5's cost/rent formulas. Instead it attaches
 * per-city external anchor fields that let us cross-validate the pipeline:
 *
 *   - h1bAnchors   : US MSA × SOC p25/p50/p75 real certified wages
 *                    (for 20 US cities — software dev 15-1252, data sci 15-2051)
 *   - nbsHouseIdx  : China 70-city housing YoY & Q1-avg price indices (2026-03)
 *                    (for 13 mainland CN cities — drift correction factor)
 *   - ubsBubbleRisk: UBS GREBI 2025 bubble score + real price/rent change
 *                    (for 21 global cities)
 *
 * Downstream consumers can:
 *   - Compare cost-implied incomeAfterTax vs H1B p50 to flag under/over-estimates
 *   - Apply NBS YoY to baseline monthlyRent to pin CN rents to current market
 *   - Flag cities in UBS "high risk" bucket as overpriced in price-to-income
 */
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const REPO = join(ROOT, "../..");

const v5 = JSON.parse(readFileSync(join(ROOT, "output/clean-values-v5.json"), "utf-8"));
const h1b = JSON.parse(readFileSync(join(ROOT, "output/h1b-salary-anchors.json"), "utf-8"));
const nbs = JSON.parse(readFileSync(join(ROOT, "sources/china/nbs-70cities-2026-03.json"), "utf-8"));
const ubs = JSON.parse(readFileSync(join(ROOT, "sources/ubs/grebi-2025.json"), "utf-8"));

// --- Mapping tables ---
// WhichCity CN city → H1B MSA (20 US cities)
const CN_TO_MSA = {
  "纽约": "New York-Newark-Jersey City",
  "旧金山": "San Francisco-Oakland-Berkeley",
  "圣何塞": "San Jose-Sunnyvale-Santa Clara",
  "洛杉矶": "Los Angeles-Long Beach-Anaheim",
  "圣地亚哥(美)": "San Diego-Chula Vista",
  "圣地亚哥": "San Diego-Chula Vista", // if SD ever labelled without suffix (US)
  "西雅图": "Seattle-Tacoma-Bellevue",
  "波士顿": "Boston-Cambridge-Newton",
  "华盛顿": "Washington-Arlington-Alexandria",
  "芝加哥": "Chicago-Naperville-Elgin",
  "亚特兰大": "Atlanta-Sandy Springs-Alpharetta",
  "迈阿密": "Miami-Fort Lauderdale-West Palm Beach",
  "休斯顿": "Houston-The Woodlands-Sugar Land",
  "达拉斯": "Dallas-Fort Worth-Arlington",
  "奥斯汀": "Austin-Round Rock",
  "圣安东尼奥": "San Antonio-New Braunfels",
  "丹佛": "Denver-Aurora-Lakewood",
  "波特兰": "Portland-Vancouver-Hillsboro",
  "费城": "Philadelphia-Camden-Wilmington",
  "凤凰城": "Phoenix-Mesa-Chandler",
  "夏洛特": "Charlotte-Concord-Gastonia",
  "罗利": "Raleigh-Cary",
  "明尼阿波利斯": "Minneapolis-St. Paul-Bloomington",
  "匹兹堡": "Pittsburgh",
};

// SOC codes we expose (can be extended when profession mapping is needed)
const SOC_CODES = {
  softwareDeveloper:     "15-1252.00",
  dataScientist:         "15-2051.00",
  itProjectManager:      "15-1299.09",
  managementAnalyst:     "13-1111.00",
  financialAnalyst:      "13-2051.00",
  accountant:            "13-2011.00",
  electricalEngineer:    "17-2071.00",
  mechanicalEngineer:    "17-2141.00",
  civilEngineer:         "17-2051.00",
  physician:             "29-1216.00", // General Internal Medicine
  registeredNurse:       "29-1141.00",
  pharmacist:            "29-1051.00",
  lawyer:                "23-1011.00",
  marketResearchAnalyst: "13-1161.00",
  csMgr:                 "11-3021.00",
};

// WhichCity CN city → NBS city (13 mainland CN cities + HK/TW excluded, HK has no NBS data)
const CN_TO_NBS = {
  "北京":"北京","上海":"上海","广州":"广州","深圳":"深圳","成都":"成都",
  "杭州":"杭州","南京":"南京","武汉":"武汉","西安":"西安","重庆":"重庆",
  "苏州":null, // Suzhou not in 70-city list
  "天津":"天津","青岛":"青岛","厦门":"厦门","大连":"大连","长沙":"长沙",
  "郑州":"郑州","昆明":"昆明","沈阳":"沈阳","合肥":"合肥","宁波":"宁波",
  "济南":"济南","无锡":"无锡","南昌":"南昌","福州":"福州","哈尔滨":"哈尔滨",
};

// WhichCity CN city → UBS GREBI city (21 cities)
const CN_TO_UBS = {
  "迈阿密":"Miami","东京":"Tokyo","苏黎世":"Zurich","洛杉矶":"Los Angeles",
  "迪拜":"Dubai","阿姆斯特丹":"Amsterdam","日内瓦":"Geneva","多伦多":"Toronto",
  "悉尼":"Sydney","马德里":"Madrid","法兰克福":"Frankfurt","温哥华":"Vancouver",
  "慕尼黑":"Munich","新加坡":"Singapore","中国香港":"Hong Kong","伦敦":"London",
  "旧金山":"San Francisco","纽约":"New York","巴黎":"Paris","米兰":"Milan",
  "圣保罗":"São Paulo",
};

// --- Build ---
const ubsByCity = Object.fromEntries(ubs.cities.map(c => [c.city, c]));

const stats = { h1b:0, nbs:0, ubs:0 };
const cities = v5.cities.map((c) => {
  const row = { ...c };

  // H1B anchors for US cities
  const msa = CN_TO_MSA[c.name];
  if (msa && h1b.byMsa[msa]) {
    const socs = h1b.byMsa[msa];
    const profs = {};
    for (const [key, code] of Object.entries(SOC_CODES)) {
      const s = socs[code];
      if (s) profs[key] = { n: s.n, p25: s.p25, p50: s.p50, p75: s.p75 };
    }
    if (Object.keys(profs).length) {
      row.h1bAnchors = { msa, socCount: Object.keys(socs).length, professions: profs };
      stats.h1b++;
    }
  }

  // NBS housing index for CN cities
  if (c.country === "中国") {
    const nbsName = CN_TO_NBS[c.name];
    if (nbsName && nbs.newHome[nbsName]) {
      row.nbsHouseIdx = {
        period: nbs.period,
        newHome: nbs.newHome[nbsName],
        secondHand: nbs.secondHand[nbsName],
      };
      stats.nbs++;
    }
  }

  // UBS bubble risk
  const ubsCity = CN_TO_UBS[c.name];
  if (ubsCity && ubsByCity[ubsCity]) {
    const u = ubsByCity[ubsCity];
    row.ubsBubbleRisk = {
      rank: u.rank,
      score: u.score,
      risk: u.risk,
      realPriceChgYoY: u.realPriceChgYoY,
      realPriceChg10Y: u.realPriceChg10Y,
      realRentChgYoY: u.realRentChgYoY,
      realRentChg10Y: u.realRentChg10Y,
    };
    stats.ubs++;
  }

  return row;
});

const out = {
  meta: {
    ...v5.meta,
    description: "Clean-pipeline v6 — v5 base + H1B/NBS/UBS anchor layer",
    formulaVersion: "clean-v6",
    newSources: {
      h1b: "US DOL ETA H1B LCA FY2026 Q1 (Public Domain)",
      nbs: "NBS 70-city Housing Price Index 2026-03 (official)",
      ubs: "UBS Global Real Estate Bubble Index 2025",
    },
    coverage: { h1b: `${stats.h1b}/20 US`, nbs: `${stats.nbs}/13 CN`, ubs: `${stats.ubs}/21 global` },
  },
  cities,
};

writeFileSync(join(ROOT, "output/clean-values-v6.json"), JSON.stringify(out, null, 2) + "\n");
console.log(`v6: H1B ${stats.h1b} US cities, NBS ${stats.nbs} CN cities, UBS ${stats.ubs} cities`);
console.log("✓ output/clean-values-v6.json");
