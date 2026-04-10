#!/usr/bin/env node
/**
 * FIX-02: Recalculate ALL safety indices using documented weights
 * Weights: 35% Numbeo, 30% homicideRateInv, 20% GPI inv, 15% Gallup
 * Also fixes confidence labels for safety, healthcare, freedom
 */
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const ROOT = join(import.meta.dirname, "..");
const filePath = join(ROOT, "public/data/cities.json");
const data = JSON.parse(readFileSync(filePath, "utf-8"));

let safetyFixes = 0, confFixes = 0;

for (const c of data.cities) {
  // --- Safety Index recalculation ---
  const safetySubs = [
    { val: c.numbeoSafetyIndex, weight: 0.35 },
    { val: c.homicideRateInv, weight: 0.30 },
    { val: c.gpiScoreInv, weight: 0.20 },
    { val: c.gallupLawOrder, weight: 0.15 },
  ];
  const available = safetySubs.filter(s => s.val !== null && s.val !== undefined);
  
  if (available.length > 0) {
    const totalWeight = available.reduce((sum, s) => sum + s.weight, 0);
    const recomputed = available.reduce((sum, s) => sum + (s.val * s.weight / totalWeight), 0);
    const rounded = Math.round(recomputed * 10) / 10;
    
    if (Math.abs(rounded - c.safetyIndex) > 0.5) {
      console.log(`SAFETY FIX: ${c.name}(${c.id}): ${c.safetyIndex} → ${rounded}`);
      c.safetyIndex = rounded;
      safetyFixes++;
    }
  }
  
  // --- Safety confidence fix ---
  const safetyNonNull = safetySubs.filter(s => s.val !== null && s.val !== undefined).length;
  const expectedSafetyConf = safetyNonNull >= 4 ? "high" : safetyNonNull >= 3 ? "medium" : "low";
  if (c.safetyConfidence !== expectedSafetyConf) {
    console.log(`SAFETY CONF: ${c.name}(${c.id}): "${c.safetyConfidence}" → "${expectedSafetyConf}"`);
    c.safetyConfidence = expectedSafetyConf;
    confFixes++;
  }
  
  // --- Healthcare confidence fix ---
  const healthSubs = [c.doctorsPerThousand, c.hospitalBedsPerThousand, c.uhcCoverageIndex, c.lifeExpectancy];
  const healthNonNull = healthSubs.filter(v => v !== null && v !== undefined).length;
  const expectedHealthConf = healthNonNull >= 4 ? "high" : healthNonNull >= 3 ? "medium" : "low";
  if (c.healthcareConfidence !== expectedHealthConf) {
    console.log(`HEALTH CONF: ${c.name}(${c.id}): "${c.healthcareConfidence}" → "${expectedHealthConf}"`);
    c.healthcareConfidence = expectedHealthConf;
    confFixes++;
  }
  
  // --- Freedom confidence fix ---
  const freedomSubs = [c.pressFreedomScore, c.democracyIndex, c.corruptionPerceptionIndex];
  const freedomNonNull = freedomSubs.filter(v => v !== null && v !== undefined).length;
  const expectedFreedomConf = freedomNonNull >= 3 ? "high" : freedomNonNull >= 2 ? "medium" : "low";
  if (c.freedomConfidence !== expectedFreedomConf) {
    console.log(`FREEDOM CONF: ${c.name}(${c.id}): "${c.freedomConfidence}" → "${expectedFreedomConf}"`);
    c.freedomConfidence = expectedFreedomConf;
    confFixes++;
  }
}

writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n");
console.log(`\nSafety indices fixed: ${safetyFixes}`);
console.log(`Confidence labels fixed: ${confFixes}`);
