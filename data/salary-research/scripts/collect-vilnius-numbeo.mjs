#!/usr/bin/env node
/**
 * collect-vilnius-numbeo.mjs — 单独采集维尔纽斯的 Numbeo 数据
 * 上次 cost 页被 429，这次多切几个节点重试
 *
 * 用法: node data/salary-research/scripts/collect-vilnius-numbeo.mjs
 */
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const HTML_DIR = join(__dirname, "../raw/numbeo-new-cities-html");
mkdirSync(HTML_DIR, { recursive: true });

const CLASH_API = "http://192.168.2.1:9090";
const CLASH_SECRET = "123456";
const CLASH_PROXY_GROUP = encodeURIComponent("🔰 手动选择");

const nodeState = { allNodes: [], currentIndex: -1, initialNode: null, deadNodes: new Set() };

async function clashGet(p) { const r = await fetch(`${CLASH_API}${p}`, { headers: { Authorization: `Bearer ${CLASH_SECRET}` }, signal: AbortSignal.timeout(5000) }); return r.json(); }
async function clashPut(p, b) { await fetch(`${CLASH_API}${p}`, { method: "PUT", headers: { Authorization: `Bearer ${CLASH_SECRET}`, "Content-Type": "application/json" }, body: JSON.stringify(b), signal: AbortSignal.timeout(5000) }); }

async function initNodes() {
  const data = await clashGet(`/proxies/${CLASH_PROXY_GROUP}`);
  nodeState.initialNode = data.now;
  const skip = new Set(["♻️ 自动选择", "🎯 Direct", "DIRECT", "REJECT", "🛑 Block"]);
  nodeState.allNodes = (data.all || []).filter(n => !skip.has(n));
  nodeState.currentIndex = Math.max(0, nodeState.allNodes.indexOf(data.now));
  console.log(`🔀 ${nodeState.allNodes.length} nodes available`);
}

async function switchNode() {
  let tried = 0;
  while (tried < nodeState.allNodes.length) {
    nodeState.currentIndex = (nodeState.currentIndex + 1) % nodeState.allNodes.length;
    const c = nodeState.allNodes[nodeState.currentIndex];
    tried++;
    if (nodeState.deadNodes.has(c)) continue;
    try {
      await clashPut(`/proxies/${CLASH_PROXY_GROUP}`, { name: c });
      await new Promise(r => setTimeout(r, 2500));
      const r = await fetch("http://ip-api.com/json/", { signal: AbortSignal.timeout(8000) });
      if (r.ok) { const ip = (await r.json()).query; console.log(`  🔀 ${c} → ${ip}`); return true; }
    } catch {}
    nodeState.deadNodes.add(c);
  }
  return false;
}

async function fetchWithRetry(url, desc) {
  // Try up to 15 node switches
  for (let i = 0; i < 15; i++) {
    try {
      console.log(`  Attempt ${i + 1}: ${desc}`);
      const r = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36", "Accept": "text/html,*/*", "Accept-Language": "en-US,en;q=0.9" },
        signal: AbortSignal.timeout(20000),
      });
      if (r.status === 429 || r.status === 403) {
        console.log(`  ${r.status} — switching...`);
        if (!(await switchNode())) { console.log("  All nodes exhausted"); return null; }
        await new Promise(r => setTimeout(r, 5000)); // longer delay
        continue;
      }
      if (r.ok) return await r.text();
      console.log(`  HTTP ${r.status}`);
      return null;
    } catch (e) {
      console.log(`  Error: ${e.message}`);
      await switchNode();
      await new Promise(r => setTimeout(r, 3000));
    }
  }
  return null;
}

async function main() {
  console.log("━━━ 维尔纽斯 Numbeo 单独采集 ━━━\n");
  await initNodes();
  
  // Switch to a fresh node first
  await switchNode();
  await new Promise(r => setTimeout(r, 3000));
  
  // Cost page
  console.log("\n[1] Cost of Living page:");
  const costHtml = await fetchWithRetry("https://www.numbeo.com/cost-of-living/in/Vilnius", "Vilnius CoL");
  if (costHtml) {
    writeFileSync(join(HTML_DIR, "162-Vilnius-cost.html"), costHtml);
    // Parse
    const salMatch = costHtml.match(/Average Monthly Net Salary[^<]*<\/td>\s*<td[^>]*>\s*<span[^>]*>\s*([\d,.]+)/);
    const rentMatch = costHtml.match(/1 Bedroom Apartment in City Centre[^<]*<\/td>\s*<td[^>]*>\s*<span[^>]*>\s*([\d,.]+)/);
    const sqmMatch = costHtml.match(/Price per Square Meter to Buy Apartment in City Centre[^<]*<\/td>\s*<td[^>]*>\s*<span[^>]*>\s*([\d,.]+)/);
    console.log(`  ✓ Salary: ${salMatch?.[1] || "?"}, Rent 1BR: ${rentMatch?.[1] || "?"}, Sqm: ${sqmMatch?.[1] || "?"}`);
    console.log(`  HTML size: ${costHtml.length} bytes`);
  } else {
    console.log("  ✗ Failed after all retries");
  }
  
  await new Promise(r => setTimeout(r, 5000));
  
  // Crime page (already got safety=69.75, but retry for completeness)
  console.log("\n[2] Crime page:");
  const crimeHtml = await fetchWithRetry("https://www.numbeo.com/crime/in/Vilnius", "Vilnius Crime");
  if (crimeHtml) {
    writeFileSync(join(HTML_DIR, "162-Vilnius-crime.html"), crimeHtml);
    const safetyMatch = crimeHtml.match(/Safety Index[^<]*<[^>]*>[^<]*<[^>]*>\s*([\d.]+)/);
    console.log(`  ✓ Safety: ${safetyMatch?.[1] || "?"}`);
  }
  
  // Restore
  try { await clashPut(`/proxies/${CLASH_PROXY_GROUP}`, { name: nodeState.initialNode }); console.log(`\n🔙 恢复: ${nodeState.initialNode}`); } catch {}
  console.log("\nDone. Check outputs above.");
}

main().catch(console.error);
