#!/usr/bin/env node
/**
 * apply-numbeo-safety.mjs
 * 
 * 读取 fetch-numbeo-safety.mjs 的输出结果，
 * 将 numbeoSafetyIndex 合并到 cities.json 并重新计算 safetyIndex。
 * 
 * 使用方法：
 *   node scripts/apply-numbeo-safety.mjs
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const CITIES_PATH = join(ROOT, "public/data/cities.json");
const RESULTS_PATH = join(__dirname, "_numbeo-safety-results.json");

if (!existsSync(RESULTS_PATH)) {
  console.error("找不到结果文件: scripts/_numbeo-safety-results.json");
  console.error("请先在 Numbeo 可访问的网络下运行: node scripts/fetch-numbeo-safety.mjs");
  process.exit(1);
}

function weightedAvg(subs) {
  const available = subs.filter(s => s.val != null);
  if (available.length === 0) return { value: null, confidence: "low", count: 0 };
  const totalWeight = available.reduce((sum, s) => sum + s.weight, 0);
  const value = available.reduce((sum, s) => sum + (s.val * s.weight / totalWeight), 0);
  const count = available.length;
  const total = subs.length;
  const confidence = count >= total ? "high" : count >= total - 1 ? "medium" : "low";
  return { value: Math.round(value * 10) / 10, confidence, count };
}

const results = JSON.parse(readFileSync(RESULTS_PATH, "utf-8"));
const data = JSON.parse(readFileSync(CITIES_PATH, "utf-8"));

for (const [idStr, result] of Object.entries(results)) {
  const id = Number(idStr);
  const city = data.cities.find(c => c.id === id);
  if (!city) {
    console.warn(`  ⚠ City id=${id} not found in cities.json`);
    continue;
  }

  if (result.numbeoSafetyIndex == null) {
    console.log(`  ⏭ ${city.name}: no Numbeo data, skipping`);
    continue;
  }

  city.numbeoSafetyIndex = result.numbeoSafetyIndex;
  console.log(`  ✓ ${city.name}: numbeoSafetyIndex = ${result.numbeoSafetyIndex}`);

  // Recompute safetyIndex
  const wpsNorm = city.wpsIndex != null ? city.wpsIndex * 100 : null;
  const safetySubs = [
    { val: city.numbeoSafetyIndex, weight: 0.30 },
    { val: city.homicideRateInv,   weight: 0.25 },
    { val: city.gpiScoreInv,       weight: 0.20 },
    { val: city.gallupLawOrder,    weight: 0.15 },
    { val: wpsNorm,                weight: 0.10 },
  ];
  const safety = weightedAvg(safetySubs);
  const oldSafety = city.safetyIndex;
  city.safetyIndex = safety.value;
  city.safetyConfidence = safety.confidence;
  console.log(`    safetyIndex: ${oldSafety} → ${safety.value} (${safety.confidence})`);
}

writeFileSync(CITIES_PATH, JSON.stringify(data, null, 2) + "\n");
console.log("\n✅ cities.json updated. Run validation: node scripts/validate-data.mjs");
