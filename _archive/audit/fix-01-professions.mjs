#!/usr/bin/env node
/**
 * FIX-01: Fix professions data for new cities (140-158)
 * Problem: professions values are monthly USD, should be annual USD
 * Solution: multiply by 12, recalculate averageIncome as median
 * Kyoto (159) is excluded - already correct
 */
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const ROOT = join(import.meta.dirname, "..");
const filePath = join(ROOT, "public/data/cities.json");
const data = JSON.parse(readFileSync(filePath, "utf-8"));

const TARGET_IDS = new Set([140,141,142,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157,158]);

let fixed = 0;
for (const city of data.cities) {
  if (!TARGET_IDS.has(city.id)) continue;
  
  // Multiply all professions by 12
  for (const key of Object.keys(city.professions)) {
    city.professions[key] = Math.round(city.professions[key] * 12);
  }
  
  // Recalculate averageIncome as median of professions
  const vals = Object.values(city.professions).sort((a, b) => a - b);
  const mid = Math.floor(vals.length / 2);
  const median = vals.length % 2 === 0 ? Math.round((vals[mid - 1] + vals[mid]) / 2) : vals[mid];
  
  const oldAvg = city.averageIncome;
  city.averageIncome = median;
  
  console.log(`✓ ${city.name}(${city.id}): professions ×12, avgIncome ${oldAvg.toLocaleString()} → ${median.toLocaleString()}`);
  fixed++;
}

writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n");
console.log(`\nFixed ${fixed} cities.`);
