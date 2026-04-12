#!/usr/bin/env node
/**
 * fetch-numbeo-safety.mjs
 * 
 * 一键获取 Casablanca 和 Wellington 的 Numbeo Safety Index。
 * 
 * 使用方法：
 *   node scripts/fetch-numbeo-safety.mjs
 * 
 * 该脚本将：
 * 1. 从 Numbeo 的公开 API 获取两个城市的安全指数
 * 2. 将结果写入 scripts/_numbeo-safety-results.json
 * 3. 然后你可以将结果合并回 cities.json
 * 
 * 注意：需要在能访问 Numbeo 的网络环境下运行。
 */
import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT = join(__dirname, "_numbeo-safety-results.json");

const CITIES = [
  { id: 160, name: "Casablanca", country: "Morocco", numbeoCity: "Casablanca" },
  { id: 161, name: "Wellington", country: "New Zealand", numbeoCity: "Wellington" },
];

async function fetchNumbeoSafety(city, country) {
  // Numbeo's public crime page returns data we can parse
  const url = `https://www.numbeo.com/crime/in/${city}--${country}`;
  console.log(`  Fetching: ${url}`);
  
  const resp = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      "Accept": "text/html,application/xhtml+xml",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });
  
  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status} for ${city}`);
  }
  
  const html = await resp.text();
  
  // Extract Safety Index from the page
  // Numbeo shows "Safety Index: XX.XX" in a table
  const safetyMatch = html.match(/Safety\s+Index[:\s]*<\/td>\s*<td[^>]*>\s*([\d.]+)/i)
    || html.match(/Safety\s+Index[:\s]*([\d.]+)/i);
  
  if (safetyMatch) {
    return parseFloat(safetyMatch[1]);
  }
  
  // Alternative: look for crime index and compute safety = 100 - crime
  const crimeMatch = html.match(/Crime\s+Index[:\s]*<\/td>\s*<td[^>]*>\s*([\d.]+)/i)
    || html.match(/Crime\s+Index[:\s]*([\d.]+)/i);
  
  if (crimeMatch) {
    const crimeIndex = parseFloat(crimeMatch[1]);
    return Math.round((100 - crimeIndex) * 10) / 10;
  }
  
  throw new Error(`Could not parse safety index for ${city}. Page might have changed format.`);
}

async function main() {
  console.log("Fetching Numbeo Safety Index for new cities...\n");
  
  const results = {};
  
  for (const city of CITIES) {
    try {
      const safety = await fetchNumbeoSafety(city.numbeoCity, city.country);
      results[city.id] = {
        name: city.name,
        numbeoSafetyIndex: safety,
        status: "ok",
      };
      console.log(`  ✓ ${city.name}: Safety Index = ${safety}\n`);
    } catch (err) {
      results[city.id] = {
        name: city.name,
        numbeoSafetyIndex: null,
        status: "error",
        error: err.message,
      };
      console.log(`  ✗ ${city.name}: ${err.message}\n`);
      console.log(`    请手动访问 https://www.numbeo.com/crime/in/${city.numbeoCity} 查看`);
      console.log(`    找到 "Safety Index" 的数值，填入下方结果文件中。\n`);
    }
  }
  
  writeFileSync(OUTPUT, JSON.stringify(results, null, 2) + "\n");
  console.log(`\n结果已保存到: ${OUTPUT}`);
  console.log("\n下一步：切换回开发网络，运行以下命令合并结果：");
  console.log("  node scripts/apply-numbeo-safety.mjs");
}

main().catch(console.error);
