#!/usr/bin/env node
/**
 * parse-big-mac.mjs — Big Mac Index → country PLI signal.
 *
 * Source: https://github.com/TheEconomist/big-mac-data (CC BY-SA via Economist)
 * Latest snapshot row per country → raw USD price, USD anchor = baseline 1.0.
 * `USD_raw` field = (local_price / exchange_rate) / US_price − 1, i.e. over/undervaluation.
 * Our derived PLI = dollar_price_country / dollar_price_US.
 */
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const csv = readFileSync(join(ROOT, "sources/bigmac/big-mac-full-index.csv"), "utf-8").trim().split("\n");
const header = csv[0].split(",");
const col = Object.fromEntries(header.map((h, i) => [h, i]));

// Parse all, keep latest date per ISO
const latest = new Map();
for (let i = 1; i < csv.length; i++) {
  const f = csv[i].split(",");
  const iso = f[col.iso_a3];
  const date = f[col.date];
  const usd = parseFloat(f[col.dollar_price]);
  if (!iso || isNaN(usd)) continue;
  const prev = latest.get(iso);
  if (!prev || prev.date < date) latest.set(iso, { date, name: f[col.name], usd });
}

const us = latest.get("USA");
if (!us) throw new Error("no USA row");

const values = {};
for (const [iso, v] of latest) {
  values[iso] = {
    date: v.date,
    name: v.name,
    usd: v.usd,
    bigmacPLI: Math.round((v.usd / us.usd) * 1000) / 1000,
  };
}

const out = {
  source: "The Economist Big Mac Index (CC BY-SA, github.com/TheEconomist/big-mac-data)",
  anchor: `US = $${us.usd} (${us.date})`,
  generated: new Date().toISOString(),
  values,
};

writeFileSync(join(ROOT, "sources/bigmac/bigmac-pli.json"), JSON.stringify(out, null, 2) + "\n");

const sorted = Object.entries(values).sort((a, b) => a[1].bigmacPLI - b[1].bigmacPLI);
console.log(`Big Mac PLI (${sorted.length} countries, US=$${us.usd}):`);
for (const [iso, v] of sorted) {
  console.log(`  ${iso}  ${String(v.bigmacPLI).padStart(5)}  $${v.usd.toFixed(2).padStart(5)}  ${v.name}`);
}
console.log(`\n✓ sources/bigmac/bigmac-pli.json`);
