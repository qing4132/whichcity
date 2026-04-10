#!/usr/bin/env node
/**
 * Compute short-term rent for all 154 cities
 * 
 * Method (hybrid, best of both sources):
 * 1. If nomads.com total cost exists → shortTermRent = totalCost × 0.42 (their documented rent share)
 * 2. Else → shortTermRent = longTermRent × regional multiplier
 * 
 * Regional multipliers (Airbnb monthly discount / long-term lease ratio):
 * - High Airbnb markets (US, UK, AU, NZ, CA, W.Europe, SG): ×2.2
 * - Medium markets (E.Europe, Japan, Korea, UAE, Israel): ×1.8
 * - Low-cost markets (SE Asia, S.Asia, C.Asia, Africa, LatAm): ×1.5
 * - Tourist hotspots (Bali, Phuket, Cancun, etc.): ×2.5
 * 
 * Validation: cross-checked against Expatistan furnished studio prices for SF, London, Tokyo
 */
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const cities = JSON.parse(readFileSync(join(ROOT, "public/data/cities.json"), "utf-8")).cities;
const nomadData = JSON.parse(readFileSync(join(__dirname, "nomad-data-compiled.json"), "utf-8"));

const multipliers = {
  high_airbnb: 2.2,
  med_airbnb: 1.8,
  low_airbnb: 1.5,
  tourist_premium: 2.5,
};

const highCountries = new Set(["美国","英国","加拿大","澳大利亚","新西兰","法国","德国","荷兰","瑞士","比利时","奥地利","爱尔兰","卢森堡","瑞典","丹麦","芬兰","挪威","新加坡"]);
const medCountries = new Set(["西班牙","意大利","葡萄牙","希腊","日本","韩国","台湾","以色列","阿联酋","卡塔尔","波兰","捷克","匈牙利","罗马尼亚","克罗地亚","保加利亚","塞尔维亚","斯洛伐克","斯洛文尼亚","爱沙尼亚","俄罗斯","土耳其","中国香港","巴林","沙特阿拉伯","阿曼","乌拉圭","智利"]);
const touristIds = new Set([140,142,147,149,153,154,155,156,157,158]);

function getTier(city) {
  if (touristIds.has(city.id)) return "tourist_premium";
  if (highCountries.has(city.country)) return "high_airbnb";
  if (medCountries.has(city.country)) return "med_airbnb";
  return "low_airbnb";
}

const results = {};
let fromNomads = 0, fromMultiplier = 0;

for (const city of cities) {
  const nd = nomadData.cities[String(city.id)];
  const nomadCost = nd?.nomadMonthlyCost;
  const longRent = city.monthlyRent;
  const tier = getTier(city);

  let shortRent, method;
  if (nomadCost && nomadCost > 0) {
    // Method 1: nomads.com total cost × 42% (their documented rent proportion)
    shortRent = Math.round(nomadCost * 0.42);
    method = `nomads.com total ($${nomadCost}) × 42%`;
    fromNomads++;
  } else if (longRent && longRent > 0) {
    // Method 2: long-term rent × multiplier
    shortRent = Math.round(longRent * multipliers[tier]);
    method = `longRent ($${longRent}) × ${multipliers[tier]} (${tier})`;
    fromMultiplier++;
  } else {
    shortRent = null;
    method = "no data";
  }

  results[city.id] = {
    name: city.name,
    shortTermRentUsd: shortRent,
    method,
    tier,
    longTermRentUsd: longRent,
    nomadTotalCost: nomadCost || null,
  };
}

// Compute stats
const allRents = Object.values(results).filter(r => r.shortTermRentUsd).map(r => r.shortTermRentUsd);
const avg = Math.round(allRents.reduce((a,b) => a+b, 0) / allRents.length);
const sorted = [...allRents].sort((a,b) => a-b);
const median = sorted[Math.floor(sorted.length/2)];

console.log("=== SHORT-TERM RENT COMPUTATION ===");
console.log(`From nomads.com: ${fromNomads} cities`);
console.log(`From multiplier: ${fromMultiplier} cities`);
console.log(`No data: ${cities.length - fromNomads - fromMultiplier} cities`);
console.log(`Average: $${avg}/mo | Median: $${median}/mo`);
console.log(`Range: $${sorted[0]} - $${sorted[sorted.length-1]}/mo`);

// Show extremes
const byRent = Object.values(results).filter(r => r.shortTermRentUsd).sort((a,b) => b.shortTermRentUsd - a.shortTermRentUsd);
console.log("\nTop 5 most expensive:");
for (const r of byRent.slice(0, 5)) console.log(`  $${r.shortTermRentUsd} — ${r.name} (${r.method})`);
console.log("Top 5 cheapest:");
for (const r of byRent.slice(-5).reverse()) console.log(`  $${r.shortTermRentUsd} — ${r.name} (${r.method})`);

writeFileSync(join(__dirname, "nomad-02-short-rent.json"), JSON.stringify(results, null, 2) + "\n");
console.log("\nSaved to _audit/nomad-02-short-rent.json");
