#!/usr/bin/env node
/**
 * collect-new-cities-numbeo.mjs — 采集新增 7 城市的 Numbeo 数据
 *
 * ⚠ 需要 Clash 代理支持（自动节点切换）
 *
 * 采集:
 *   - Cost of Living 页面 → costModerate, costBudget, monthlyRent, Average Net Salary
 *   - Property Prices 页面 → housePrice
 *   - Crime 页面 → numbeoSafetyIndex
 *
 * 用法: node data/salary-research/scripts/collect-new-cities-numbeo.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../../..");
const RAW_DIR = join(__dirname, "../raw");
const HTML_DIR = join(RAW_DIR, "numbeo-new-cities-html");
mkdirSync(HTML_DIR, { recursive: true });

// ═══════════════════════════════════════════════════════════════
// Clash 代理
// ═══════════════════════════════════════════════════════════════
const CLASH_API = "http://192.168.2.1:9090";
const CLASH_SECRET = "123456";
const CLASH_PROXY_GROUP = "🔰 手动选择";
const CLASH_GROUP_ENCODED = encodeURIComponent(CLASH_PROXY_GROUP);

const nodeState = { allNodes: [], currentIndex: -1, switchCount: 0, initialNode: null, deadNodes: new Set() };

async function clashGet(path) {
  const r = await fetch(`${CLASH_API}${path}`, { headers: { Authorization: `Bearer ${CLASH_SECRET}` }, signal: AbortSignal.timeout(5000) });
  if (!r.ok) throw new Error(`Clash ${r.status}`);
  return r.json();
}
async function clashPut(path, body) {
  const r = await fetch(`${CLASH_API}${path}`, { method: "PUT", headers: { Authorization: `Bearer ${CLASH_SECRET}`, "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(5000) });
  if (!r.ok) throw new Error(`Clash PUT ${r.status}`);
}

async function initNodePool() {
  try {
    const data = await clashGet(`/proxies/${CLASH_GROUP_ENCODED}`);
    nodeState.initialNode = data.now;
    const skip = new Set(["♻️ 自动选择", "🎯 Direct", "DIRECT", "REJECT", "🛑 Block"]);
    const raw = (data.all || []).filter(n => !skip.has(n));
    const groups = {};
    for (const n of raw) { const r = n.replace(/\s*[A-Z]?\d+$/, "").trim(); if (!groups[r]) groups[r] = []; groups[r].push(n); }
    const keys = Object.keys(groups);
    const maxLen = Math.max(...keys.map(k => groups[k].length));
    const interleaved = [];
    for (let i = 0; i < maxLen; i++) for (const r of keys) if (i < groups[r].length) interleaved.push(groups[r][i]);
    nodeState.allNodes = interleaved;
    nodeState.currentIndex = Math.max(0, interleaved.indexOf(data.now));
    console.log(`🔀 节点池: ${interleaved.length} 节点, ${keys.length} 地区`);
  } catch (e) { console.log(`⚠ Clash 不可用 (${e.message})`); }
}

async function switchNode() {
  if (!nodeState.allNodes.length) return null;
  let tried = 0;
  while (tried < nodeState.allNodes.length) {
    nodeState.currentIndex = (nodeState.currentIndex + 1) % nodeState.allNodes.length;
    const c = nodeState.allNodes[nodeState.currentIndex];
    tried++;
    if (nodeState.deadNodes.has(c)) continue;
    try {
      await clashPut(`/proxies/${CLASH_GROUP_ENCODED}`, { name: c });
      await new Promise(r => setTimeout(r, 2000));
      const r = await fetch("http://ip-api.com/json/", { signal: AbortSignal.timeout(8000) });
      if (r.ok) { const ip = (await r.json()).query || "?"; nodeState.switchCount++; console.log(`  🔀 ${c} (IP: ${ip})`); return { node: c, ip }; }
    } catch { /* skip */ }
    nodeState.deadNodes.add(c);
  }
  return null;
}

async function restoreNode() {
  if (nodeState.initialNode && nodeState.allNodes.length) {
    try { await clashPut(`/proxies/${CLASH_GROUP_ENCODED}`, { name: nodeState.initialNode }); console.log(`🔙 恢复: ${nodeState.initialNode}`); } catch {}
  }
}

// ═══════════════════════════════════════════════════════════════
// Fetch with retry
// ═══════════════════════════════════════════════════════════════
async function fetchPage(url, desc) {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const r = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
          "Accept": "text/html,application/xhtml+xml,*/*",
          "Accept-Language": "en-US,en;q=0.9",
        },
        signal: AbortSignal.timeout(30000),
      });
      if (r.status === 429 || r.status === 403) {
        console.log(`  ${r.status} → switching node...`);
        if (!(await switchNode())) return null;
        continue;
      }
      if (!r.ok) { console.log(`  HTTP ${r.status} for ${desc}`); return null; }
      return await r.text();
    } catch (e) {
      console.log(`  Retry ${attempt + 1}: ${e.message}`);
      if (attempt < 3) { await new Promise(r => setTimeout(r, 3000 * (attempt + 1))); await switchNode(); }
    }
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════
// Parse Numbeo pages
// ═══════════════════════════════════════════════════════════════
function parseFloat2(s) { return s ? parseFloat(s.replace(/,/g, "")) : null; }

function parseCostPage(html) {
  const result = {};
  // Average Monthly Net Salary (After Tax)
  const salaryMatch = html.match(/Average Monthly Net Salary \(After Tax\)\s*<\/td>\s*<td[^>]*>\s*<span[^>]*>\s*([\d,.]+)/);
  result.netMonthlySalary = salaryMatch ? parseFloat2(salaryMatch[1]) : null;

  // Extract all price items
  const items = {};
  const re = /<tr>\s*<td>\s*([^<]+?)\s*<\/td>\s*<td[^>]*class="[^"]*priceValue[^"]*"[^>]*>\s*<span[^>]*>\s*([\d,.]+)/g;
  let m;
  while ((m = re.exec(html)) !== null) items[m[1].trim()] = parseFloat2(m[2]);

  // Monthly living cost estimates
  // "A single person estimated monthly costs are X without rent"
  const singleCost = html.match(/single person estimated monthly costs are\s*([\d,.]+)/i);
  result.singlePersonCostWithoutRent = singleCost ? parseFloat2(singleCost[1]) : null;

  // Rent: "Apartment (1 bedroom) in City Centre"
  result.rent1brCenter = items["Apartment (1 bedroom) in City Centre"] || null;
  result.rent1brOutside = items["Apartment (1 bedroom) Outside of Centre"] || null;

  // Buy: "Price per Square Meter to Buy Apartment in City Centre"
  result.pricePerSqmCenter = items["Price per Square Meter to Buy Apartment in City Centre"] || null;

  result.allItems = items;
  return result;
}

function parseCrimePage(html) {
  // Safety Index
  const safetyMatch = html.match(/Safety Index:\s*<\/td>\s*<td[^>]*>\s*<div[^>]*>\s*([\d.]+)/);
  if (!safetyMatch) {
    // Alternative pattern
    const alt = html.match(/Safety Index[^<]*<[^>]*>[^<]*<[^>]*>\s*([\d.]+)/);
    return alt ? parseFloat(alt[1]) : null;
  }
  return parseFloat(safetyMatch[1]);
}

// ═══════════════════════════════════════════════════════════════
// Cities to collect
// ═══════════════════════════════════════════════════════════════
const CITIES = [
  { id: 162, name: "维尔纽斯", slug: "Vilnius" },
  { id: 163, name: "里加", slug: "Riga" },
  { id: 164, name: "尼科西亚", slug: "Nicosia" },
  { id: 165, name: "圣多明各", slug: "Santo-Domingo" },
  { id: 166, name: "基多", slug: "Quito" },
  { id: 167, name: "阿克拉", slug: "Accra" },
  { id: 168, name: "亚的斯亚贝巴", slug: "Addis-Ababa" },
];

// ═══════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════
async function main() {
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║  Numbeo 数据采集 — 新增 7 城市                           ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  await initNodePool();

  const results = {};

  for (const city of CITIES) {
    console.log(`\n━━━ ${city.name} (${city.slug}) ━━━`);
    const data = { id: city.id, name: city.name, slug: city.slug };

    // 1. Cost of Living page
    const costUrl = `https://www.numbeo.com/cost-of-living/in/${city.slug}`;
    console.log(`  Fetching cost-of-living...`);
    const costHtml = await fetchPage(costUrl, `CoL ${city.slug}`);
    if (costHtml) {
      writeFileSync(join(HTML_DIR, `${city.id}-${city.slug}-cost.html`), costHtml);
      const parsed = parseCostPage(costHtml);
      data.cost = parsed;
      console.log(`  ✓ Net salary: $${parsed.netMonthlySalary || "?"}/mo | Rent 1BR: $${parsed.rent1brCenter || "?"} | Sqm: $${parsed.pricePerSqmCenter || "?"}`);
    } else {
      console.log(`  ✗ Cost page failed`);
      data.cost = null;
    }

    await new Promise(r => setTimeout(r, 3000));

    // 2. Crime page
    const crimeUrl = `https://www.numbeo.com/crime/in/${city.slug}`;
    console.log(`  Fetching crime/safety...`);
    const crimeHtml = await fetchPage(crimeUrl, `Crime ${city.slug}`);
    if (crimeHtml) {
      writeFileSync(join(HTML_DIR, `${city.id}-${city.slug}-crime.html`), crimeHtml);
      const safety = parseCrimePage(crimeHtml);
      data.safetyIndex = safety;
      console.log(`  ✓ Safety Index: ${safety || "?"}`);
    } else {
      console.log(`  ✗ Crime page failed`);
      data.safetyIndex = null;
    }

    await new Promise(r => setTimeout(r, 3000));

    results[city.id] = data;
  }

  // Save results
  const outputFile = join(RAW_DIR, "numbeo-new-cities-data.json");
  const output = {
    source: "Numbeo.com (cost-of-living + crime pages)",
    collectedAt: new Date().toISOString(),
    note: "Raw Numbeo data for 7 newly added cities. Use to update SOT.",
    cities: results,
  };
  writeFileSync(outputFile, JSON.stringify(output, null, 2) + "\n");
  console.log(`\n✅ Saved → ${outputFile}`);

  // Summary
  console.log("\n═══ Summary ═══");
  for (const city of CITIES) {
    const d = results[city.id];
    const sal = d?.cost?.netMonthlySalary;
    const rent = d?.cost?.rent1brCenter;
    const sqm = d?.cost?.pricePerSqmCenter;
    const safety = d?.safetyIndex;
    console.log(`  ${city.name}: salary=$${sal || "?"}/mo rent=$${rent || "?"} sqm=$${sqm || "?"} safety=${safety || "?"}`);
  }

  console.log("\n运行完成后，请将结果告诉 AI，我会用真实数据更新 SOT。");

  await restoreNode();
}

main().catch(e => { console.error(`Fatal: ${e.stack}`); process.exit(1); });
