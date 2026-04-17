#!/usr/bin/env node
/**
 * extract-zillow.mjs — Pull latest month ZORI for our 19 US cities.
 *
 * Source: Zillow Research ZORI (Zillow Observed Rent Index, smoothed, all homes),
 * MSA level monthly. CC-compatible research-data terms (free use w/ attribution).
 */
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const csv = readFileSync(join(ROOT, "sources/zillow-zori-raw.csv"), "utf-8");
const lines = csv.trim().split("\n");

// Proper CSV parse (quoted fields contain embedded commas — the MSA column)
function parseCSVRow(row) {
  const out = [];
  let cur = "", q = false;
  for (const ch of row) {
    if (ch === '"') { q = !q; continue; }
    if (ch === "," && !q) { out.push(cur); cur = ""; continue; }
    cur += ch;
  }
  out.push(cur);
  return out;
}

const header = parseCSVRow(lines[0]);
const monthCols = header.slice(5);
const lastMonth = monthCols[monthCols.length - 1];
const lastIdx = header.length - 1;

// our 19 US cities → Zillow MSA RegionName (normalized "City  ST" double-space)
const MSA_MAP = {
  纽约: "New York, NY",
  旧金山: "San Francisco, CA",
  洛杉矶: "Los Angeles, CA",
  华盛顿: "Washington, DC",
  波士顿: "Boston, MA",
  西雅图: "Seattle, WA",
  芝加哥: "Chicago, IL",
  迈阿密: "Miami, FL",
  丹佛: "Denver, CO",
  亚特兰大: "Atlanta, GA",
  奥斯汀: "Austin, TX",
  波特兰: "Portland, OR",
  费城: "Philadelphia, PA",
  凤凰城: "Phoenix, AZ",
  拉斯维加斯: "Las Vegas, NV",
  坦帕: "Tampa, FL",
  休斯顿: "Houston, TX",
  圣地亚哥: "San Diego, CA",
  "硅谷（圣何塞）": "San Jose, CA",
};

const zillowByMSA = new Map();
for (let i = 1; i < lines.length; i++) {
  const row = parseCSVRow(lines[i]);
  // Note: Zillow writes MSA name with TWO spaces before state code, e.g. "New York  NY"
  const name = row[2].replace(/\s+/g, " "); // collapse whitespace
  const val = row[lastIdx];
  if (!val) continue;
  zillowByMSA.set(name, parseFloat(val));
}

const out = {
  source: "Zillow Observed Rent Index (ZORI), smoothed, all homes (MSA)",
  url: "https://www.zillow.com/research/data/",
  license: "Zillow Research free-use with attribution (compatible)",
  month: lastMonth,
  unit: "USD/month market median asking rent",
  retrievedAt: "2026-04-17",
  cities: {},
};

let hit = 0, miss = 0;
for (const [cn, msa] of Object.entries(MSA_MAP)) {
  const val = zillowByMSA.get(msa);
  if (val != null) {
    out.cities[cn] = { msa, rentUSD: Math.round(val), month: lastMonth };
    hit++;
  } else {
    console.log(`  miss: ${cn} → "${msa}"`);
    miss++;
  }
}

writeFileSync(join(ROOT, "sources/zillow-zori.json"), JSON.stringify(out, null, 2) + "\n");
console.log(`\nZillow ZORI ${lastMonth}: ${hit}/${hit + miss} matched`);
for (const [k, v] of Object.entries(out.cities)) console.log(`  ${k.padEnd(12)} $${v.rentUSD}`);
