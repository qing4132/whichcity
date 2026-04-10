#!/usr/bin/env node
/**
 * FIX-03: Fix climate rainfall inconsistency
 * When monthlyRainMm sum differs from annualRainMm by >15%,
 * set annualRainMm = sum(monthlyRainMm) as monthly data is more granular
 */
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const ROOT = join(import.meta.dirname, "..");
const filePath = join(ROOT, "public/data/cities.json");
const data = JSON.parse(readFileSync(filePath, "utf-8"));

let fixes = 0;
for (const c of data.cities) {
  const cl = c.climate;
  if (!cl || !cl.monthlyRainMm || cl.monthlyRainMm.length !== 12) continue;
  
  const monthSum = Math.round(cl.monthlyRainMm.reduce((a, b) => a + b, 0));
  const diff = Math.abs(monthSum - cl.annualRainMm);
  const threshold = cl.annualRainMm * 0.10; // 10% tolerance
  
  if (diff > threshold && diff > 20) { // Only fix if >10% AND >20mm absolute
    console.log(`${c.name}(${c.id}): annualRainMm ${cl.annualRainMm} → ${monthSum} (monthly sum)`);
    cl.annualRainMm = monthSum;
    fixes++;
  }
}

writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n");
console.log(`\nFixed rainfall in ${fixes} cities.`);
