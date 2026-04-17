#!/usr/bin/env node
/**
 * fetch-wb.mjs — Fetch World Bank indicators for clean-pipeline.
 *
 * Indicators (all CC BY 4.0):
 *   NE.CON.PRVT.CD   Household Final Consumption Expenditure (current US$)
 *   SP.POP.TOTL      Population total
 *   SI.POV.GINI      Gini index
 *   NY.GDP.PCAP.PP.CD  GDP per capita, PPP (current international $)
 *   NY.GNP.PCAP.CD   GNI per capita, Atlas method (current US$)
 *
 * Output: data/clean-pipeline/sources/wb-indicators.json
 */
import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// Countries we cover (ISO-3166-1 alpha-3 for WB API)
const COUNTRIES = [
  "USA", "CAN", "MEX", "BRA", "ARG", "CHL", "COL", "PER", "URY", "CRI", "PAN",
  "GBR", "FRA", "DEU", "ITA", "ESP", "PRT", "NLD", "BEL", "CHE", "AUT", "SWE",
  "NOR", "DNK", "FIN", "ISL", "IRL", "GRC", "POL", "CZE", "HUN", "ROU", "BGR",
  "HRV", "SVN", "SVK", "LTU", "LVA", "EST", "LUX", "MLT", "CYP",
  "RUS", "UKR", "TUR", "ISR", "ARE", "SAU", "QAT", "KWT", "BHR", "OMN", "JOR",
  "EGY", "MAR", "TUN", "DZA", "KEN", "NGA", "ZAF", "ETH", "GHA", "TZA",
  "JPN", "KOR", "CHN", "HKG", "SGP", "MYS", "THA", "VNM", "IDN", "PHL",
  "IND", "PAK", "BGD", "LKA", "NPL", "MMR", "KHM", "LAO", "MNG",
  "AUS", "NZL", "FJI",
];

const IND = {
  hfce: "NE.CON.PRVT.CD",
  pop: "SP.POP.TOTL",
  gini: "SI.POV.GINI",
  gdpPPP: "NY.GDP.PCAP.PP.CD",
  gni: "NY.GNP.PCAP.CD",
};

async function fetchIndicator(ind) {
  // WB API: paginate, retry on ECONNRESET
  const url = `https://api.worldbank.org/v2/country/all/indicator/${ind}?format=json&per_page=20000&date=2015:2024`;
  let lastErr;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const res = await fetch(url);
      const json = await res.json();
      const data = json[1] || [];
      const latest = {};
      for (const row of data) {
        if (row.value == null) continue;
        const iso3 = row.countryiso3code;
        if (!iso3) continue;
        const year = parseInt(row.date);
        if (!latest[iso3] || year > latest[iso3].year) {
          latest[iso3] = { value: row.value, year, country: row.country.value };
        }
      }
      return latest;
    } catch (e) {
      lastErr = e;
      await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
    }
  }
  throw lastErr;
}

console.log("Fetching WB indicators (this uses public API only)...");
const results = {};
for (const [key, ind] of Object.entries(IND)) {
  process.stdout.write(`  ${key} (${ind})... `);
  results[key] = await fetchIndicator(ind);
  console.log(`${Object.keys(results[key]).length} countries`);
}

// Build per-country record
const out = {
  source: "World Bank Indicators (CC BY 4.0)",
  api: "https://api.worldbank.org/v2",
  indicators: IND,
  retrievedAt: new Date().toISOString().slice(0, 10),
  countries: {},
};

for (const iso3 of COUNTRIES) {
  const r = {};
  for (const key of Object.keys(IND)) {
    if (results[key][iso3]) r[key] = results[key][iso3];
  }
  // Derived: HFCE per capita per month USD
  if (r.hfce && r.pop) {
    r.hfcePerCapitaAnnualUSD = r.hfce.value / r.pop.value;
    r.hfcePerCapitaMonthlyUSD = r.hfcePerCapitaAnnualUSD / 12;
  }
  out.countries[iso3] = r;
}

const OUT = join(ROOT, "sources/wb-indicators.json");
writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n");
console.log(`\n✓ ${OUT}`);
console.log(`Coverage: ${Object.keys(out.countries).length} countries`);

// Report missing
const missingGini = COUNTRIES.filter(c => !out.countries[c]?.gini);
const missingHFCE = COUNTRIES.filter(c => !out.countries[c]?.hfce);
console.log(`Missing Gini: ${missingGini.length} countries (${missingGini.slice(0, 8).join(",")}...)`);
console.log(`Missing HFCE: ${missingHFCE.length} countries (${missingHFCE.join(",")})`);
