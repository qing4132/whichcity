#!/usr/bin/env node
/**
 * extend-wb.mjs — fetch nominal GDP per capita via bulk WB API (single call)
 * and derive country Price Level Index (PLI) = Nominal/PPP.
 *
 * PLI < 1 → cheaper than US, PLI > 1 → more expensive.
 */
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const wb = JSON.parse(readFileSync(join(ROOT, "sources/wb-indicators.json"), "utf-8"));

const url = "https://api.worldbank.org/v2/country/all/indicator/NY.GDP.PCAP.CD?format=json&per_page=20000&date=2020:2024";
console.log("Bulk fetching WB nominal GDP per cap…");
const resp = await fetch(url);
const data = await resp.json();
const rows = data[1];
console.log(`  got ${rows.length} rows`);

const latest = new Map();
for (const r of rows) {
  if (r.value == null) continue;
  const year = parseInt(r.date);
  const cur = latest.get(r.countryiso3code);
  if (!cur || year > cur.year) latest.set(r.countryiso3code, { value: r.value, year });
}

let added = 0;
for (const iso3 of Object.keys(wb.countries)) {
  const rec = wb.countries[iso3];
  const gdpNom = latest.get(iso3);
  if (gdpNom) {
    rec.gdpNominal = gdpNom;
    if (rec.gdpPPP?.value) {
      rec.priceLevelIndex = gdpNom.value / rec.gdpPPP.value;
      added++;
    }
  }
}

wb.indicators.gdpNominal = "NY.GDP.PCAP.CD";
wb.indicators.priceLevelIndex = "derived: Nominal / PPP GDP per capita";
writeFileSync(join(ROOT, "sources/wb-indicators.json"), JSON.stringify(wb, null, 2) + "\n");
console.log(`\nCountries with PLI: ${added}`);
for (const c of ["USA", "CHE", "NOR", "SGP", "GBR", "DEU", "JPN", "KOR", "CHN", "IND", "VNM", "BRA", "MEX", "ZAF", "IDN", "THA", "TUR", "HKG"]) {
  const r = wb.countries[c];
  if (r?.priceLevelIndex) console.log(`  ${c}: ${r.priceLevelIndex.toFixed(3)}`);
}
