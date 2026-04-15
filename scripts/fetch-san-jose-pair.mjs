#!/usr/bin/env node
/**
 * fetch-san-jose-pair.mjs — 定向采集两个圣何塞的 Numbeo 数据
 *
 * 采集目标:
 *   ID 70:  San José, Costa Rica  → Numbeo URL: San-Jose--Costa-Rica
 *   ID 133: San José, CA, USA     → Numbeo URL: San-Jose-CA--United-States
 *
 * 用法:
 *   node scripts/fetch-san-jose-pair.mjs
 *
 * 输出:
 *   scripts/numbeo-audit/raw/cost/070-san-jose-cr.html
 *   scripts/numbeo-audit/raw/cost/133-san-jose-us.html  (覆盖旧的失败文件)
 *   stdout: 解析后的结构化数据 + 与 cities.json 现有值对比
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const RAW_COST_DIR = join(__dirname, "numbeo-audit", "raw", "cost");
const CITIES_PATH = join(ROOT, "public/data/cities.json");

mkdirSync(RAW_COST_DIR, { recursive: true });

// ═══════════════════════════════════════════════════════════════
// Clash API 自动节点切换（复用 verify-numbeo-data.mjs 逻辑）
// ═══════════════════════════════════════════════════════════════
const CLASH_API = "http://192.168.2.1:9090";
const CLASH_SECRET = "123456";
const CLASH_PROXY_GROUP = "🔰 手动选择";
const CLASH_GROUP_ENCODED = encodeURIComponent(CLASH_PROXY_GROUP);
const NODE_VERIFY_URL = "http://ip-api.com/json/";
const NODE_VERIFY_TIMEOUT = 8000;
const NODE_SWITCH_MAX = 20;

const nodeState = {
  allNodes: [],
  currentIndex: -1,
  switchCount: 0,
  initialNode: null,
  deadNodes: new Set(),
  usedIPs: new Set(),      // 已用过的出口 IP（同 IP 不同节点没意义）
};

async function clashGet(path) {
  const r = await fetch(`${CLASH_API}${path}`, {
    headers: { Authorization: `Bearer ${CLASH_SECRET}` },
    signal: AbortSignal.timeout(5000),
  });
  if (!r.ok) throw new Error(`Clash API ${r.status}: ${path}`);
  return r.json();
}

async function clashPut(path, body) {
  const r = await fetch(`${CLASH_API}${path}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${CLASH_SECRET}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(5000),
  });
  if (!r.ok) throw new Error(`Clash API PUT ${r.status}: ${path}`);
}

async function initNodePool() {
  try {
    const data = await clashGet(`/proxies/${CLASH_GROUP_ENCODED}`);
    nodeState.initialNode = data.now;
    const skipNames = new Set(["♻️ 自动选择", "🎯 Direct", "DIRECT", "REJECT", "🛑 Block"]);
    const raw = (data.all || []).filter(n => !skipNames.has(n));
    const groups = {};
    for (const n of raw) {
      const region = n.replace(/\s*[A-Z]?\d+$/, "").trim();
      if (!groups[region]) groups[region] = [];
      groups[region].push(n);
    }
    const regionKeys = Object.keys(groups);
    const maxLen = Math.max(...regionKeys.map(k => groups[k].length));
    const interleaved = [];
    for (let i = 0; i < maxLen; i++) {
      for (const region of regionKeys) {
        if (i < groups[region].length) interleaved.push(groups[region][i]);
      }
    }
    nodeState.allNodes = interleaved;
    const curIdx = interleaved.indexOf(data.now);
    nodeState.currentIndex = curIdx >= 0 ? curIdx : 0;
    console.log(`🔀 节点池初始化: ${interleaved.length} 个节点, ${regionKeys.length} 个地区`);
    console.log(`   当前节点: ${data.now}`);
  } catch (err) {
    console.warn(`⚠ Clash API 不可用 (${err.message})，禁用自动节点切换`);
    nodeState.allNodes = [];
  }
}

async function verifyNode() {
  try {
    const r = await fetch(NODE_VERIFY_URL, { signal: AbortSignal.timeout(NODE_VERIFY_TIMEOUT) });
    if (!r.ok) return null;
    const data = await r.json();
    return data.query || data.ip || "unknown";
  } catch { return null; }
}

async function switchToNextNode() {
  if (nodeState.allNodes.length === 0) return null;
  const totalNodes = nodeState.allNodes.length;
  let tried = 0;
  while (tried < totalNodes) {
    nodeState.currentIndex = (nodeState.currentIndex + 1) % totalNodes;
    const candidate = nodeState.allNodes[nodeState.currentIndex];
    tried++;
    if (nodeState.deadNodes.has(candidate)) continue;
    try {
      await clashPut(`/proxies/${CLASH_GROUP_ENCODED}`, { name: candidate });
      await sleep(2000);
      const ip = await verifyNode();
      if (ip) {
        if (nodeState.usedIPs.has(ip)) {
          console.log(`  ⏭ 节点 ${candidate} 出口 IP ${ip} 已用过，跳过`);
          nodeState.deadNodes.add(candidate);
          continue;
        }
        nodeState.usedIPs.add(ip);
        nodeState.switchCount++;
        console.log(`  🔀 节点切换成功: ${candidate} → 出口 IP: ${ip}`);
        return { node: candidate, ip };
      } else {
        console.warn(`  ⚠ 节点 ${candidate} 不通，跳过`);
        nodeState.deadNodes.add(candidate);
      }
    } catch (err) {
      console.warn(`  ⚠ 节点切换失败 (${candidate}): ${err.message}`);
      nodeState.deadNodes.add(candidate);
    }
  }
  console.warn(`  ⚠ 所有 ${totalNodes} 个节点均不可用`);
  return null;
}

async function restoreInitialNode() {
  if (!nodeState.initialNode || nodeState.allNodes.length === 0) return;
  try {
    await clashPut(`/proxies/${CLASH_GROUP_ENCODED}`, { name: nodeState.initialNode });
    console.log(`🔙 已恢复初始节点: ${nodeState.initialNode}`);
  } catch { /* ignore */ }
}

// ── 目标城市定义（使用精确的 Numbeo URL，带国家后缀避免歧义）──
const TARGETS = [
  {
    id: 70,
    label: "San José, Costa Rica",
    urls: [
      "https://www.numbeo.com/cost-of-living/in/San-Jose-Costa-Rica?displayCurrency=USD",
    ],
    htmlFile: "070-san-jose-cr.html",
    expectCountry: "Costa Rica",
  },
  {
    id: 133,
    label: "San José, CA, USA",
    urls: [
      "https://www.numbeo.com/cost-of-living/in/San-Jose?displayCurrency=USD",
    ],
    htmlFile: "133-san-jose-us.html",
    expectCountry: "California",
  },
];

// ── 网络请求 ──
const USER_AGENTS = [
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
];

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function fetchPage(url) {
  const MAX_RETRIES = 20;
  let nodeSwitches = 0;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);

    try {
      const resp = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": ua,
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Cache-Control": "no-cache",
        },
        redirect: "follow",
      });
      clearTimeout(timer);

      if (resp.status === 429 || resp.status === 403) {
        // 尝试切换节点
        if (nodeSwitches < NODE_SWITCH_MAX && nodeState.allNodes.length > 0) {
          const result = await switchToNextNode();
          if (result) {
            nodeSwitches++;
            console.log(`  ⚠ HTTP ${resp.status} → 已切换节点 (第${nodeSwitches}次) → 立即重试`);
            attempt--; // 不消耗重试次数
            continue;
          }
        }
        // 节点切换不可用，退避等待
        const waitSec = 60 * attempt;
        console.log(`  ⚠ HTTP ${resp.status} → 等待 ${waitSec}s 后重试 (${attempt}/${MAX_RETRIES})`);
        await sleep(waitSec * 1000);
        continue;
      }

      if (!resp.ok) {
        return { ok: false, status: resp.status, html: "" };
      }
      const html = await resp.text();
      return { ok: true, status: resp.status, html };
    } catch (err) {
      clearTimeout(timer);
      if (attempt < MAX_RETRIES) {
        console.log(`  ⚠ ${err.message} → 重试 (${attempt}/${MAX_RETRIES})`);
        await sleep(5000 * attempt);
      } else {
        return { ok: false, status: 0, html: "", error: err.message };
      }
    }
  }
  return { ok: false, status: 0, html: "", error: "max retries exceeded" };
}

// ── HTML 解析（与 verify-numbeo-data.mjs 保持一致）──
function parsePrice(str) {
  if (!str) return null;
  const cleaned = str.replace(/,/g, "").trim();
  const val = parseFloat(cleaned);
  return isNaN(val) ? null : val;
}

function parseCostPage(html) {
  const result = {};

  // 月度成本摘要
  const costPatterns = [
    /single\s+person[\s\S]{0,400}?emp_number[^>]*>\s*(\d[\d,]*(?:\.\d+)?)\s*(?:&#36;|\$)/i,
    /single\s+person[\s\S]{0,500}?in_other_currency[^>]*>\(?\s*(\d[\d,]*(?:\.\d+)?)\s*(?:&#36;|\$)/i,
    /single\s+person[\s\S]{0,300}?emp_number[^>]*>\s*(\d[\d,]*(?:\.\d+)?)/i,
  ];
  for (const pat of costPatterns) {
    const m = html.match(pat);
    if (m) { result.singlePersonMonthlyCost = parsePrice(m[1]); break; }
  }

  // 家庭月度成本
  const familyPatterns = [
    /family\s+of\s+four[\s\S]{0,400}?emp_number[^>]*>\s*(\d[\d,]*(?:\.\d+)?)\s*(?:&#36;|\$)/i,
    /family\s+of\s+four[\s\S]{0,500}?in_other_currency[^>]*>\(?\s*(\d[\d,]*(?:\.\d+)?)\s*(?:&#36;|\$)/i,
    /family\s+of\s+four[\s\S]{0,300}?emp_number[^>]*>\s*(\d[\d,]*(?:\.\d+)?)/i,
  ];
  for (const pat of familyPatterns) {
    const m = html.match(pat);
    if (m) { result.familyMonthlyCost = parsePrice(m[1]); break; }
  }

  // 通用价格项提取
  function extractItem(label) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const p1 = new RegExp(escaped + "[\\s\\S]{0,300}?class=\"priceValue[^\"]*\"[^>]*>[\\s\\S]{0,100}?(\\d[\\d,.]+)", "i");
    const m1 = html.match(p1);
    if (m1) return parsePrice(m1[1]);
    const p2 = new RegExp(escaped + "[\\s\\S]{0,200}?<td[^>]*>[\\s\\S]{0,80}?(\\d[\\d,.]+)", "i");
    const m2 = html.match(p2);
    if (m2) return parsePrice(m2[1]);
    return null;
  }

  result.rent1BRCenter = extractItem("1 Bedroom Apartment in City Centre");
  result.rent1BROutside = extractItem("1 Bedroom Apartment Outside of City Centre");
  result.rent3BRCenter = extractItem("3 Bedroom Apartment in City Centre");
  result.pricePerSqmCenter = extractItem("Price per Square Meter to Buy Apartment in City Centre");
  result.pricePerSqmOutside = extractItem("Price per Square Meter to Buy Apartment Outside of Centre");
  result.mealInexpensive = extractItem("Meal at an Inexpensive Restaurant");
  result.cappuccino = extractItem("Cappuccino \\(Regular Size\\)");
  result.localTransport = extractItem("One-Way Ticket \\(Local Transport\\)");
  result.utilities = extractItem("Basic Utilities for");
  result.internetMonthly = extractItem("Broadband Internet");
  result.avgMonthlyNetSalary = extractItem("Average Monthly Net Salary \\(After Tax\\)");

  return result;
}

// ── 验证页面身份 ──
function verifyPageIdentity(html, expectedCountry) {
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  const title = titleMatch ? titleMatch[1] : "(no title)";

  // 检查页面是否包含预期的国家名
  const hasCountry = html.includes(expectedCountry);
  // 检查是否是错误页面
  const isError = /Cannot find city|404|not found/i.test(title);

  return { title, hasCountry, isError };
}

// ── 主流程 ──
async function main() {
  // 初始化 Clash 节点池
  await initNodePool();

  // 加载现有数据用于对比
  const citiesData = JSON.parse(readFileSync(CITIES_PATH, "utf-8"));
  const citiesMap = {};
  citiesData.cities.forEach(c => { citiesMap[c.id] = c; });

  console.log("═══════════════════════════════════════════════════════");
  console.log("  WhichCity — 圣何塞双城 Numbeo 数据定向采集");
  console.log("═══════════════════════════════════════════════════════\n");

  const results = {};

  for (const target of TARGETS) {
    console.log(`\n── ${target.label} (ID ${target.id}) ──`);

    // 重置已用 IP，每个城市独立计数
    nodeState.usedIPs.clear();
    nodeState.deadNodes.clear();

    let html = "";
    let fetchedUrl = "";
    let success = false;

    for (const url of target.urls) {
      console.log(`  尝试: ${url}`);
      const r = await fetchPage(url);

      if (r.ok) {
        const identity = verifyPageIdentity(r.html, target.expectCountry);
        console.log(`  ✓ HTTP ${r.status} | 页面标题: ${identity.title}`);

        if (identity.isError) {
          console.log(`  ✗ 错误页面，跳过此 URL`);
          await sleep(3000);
          continue;
        }

        if (!identity.hasCountry) {
          console.log(`  ⚠ 警告：页面中未找到预期国家名，可能抓到了错误城市！`);
          console.log(`    继续尝试下一个 URL...`);
          await sleep(3000);
          continue;
        }

        console.log(`  ✓ 身份验证通过: 页面包含 "${target.expectCountry}"`);
        html = r.html;
        fetchedUrl = url;
        success = true;
        break;
      } else {
        console.log(`  ✗ HTTP ${r.status} ${r.error || ""}`);
        await sleep(3000);
      }
    }

    if (!success) {
      console.log(`  ✗✗ 所有 URL 均失败！`);
      results[target.id] = null;
      continue;
    }

    // 保存原始 HTML
    const htmlPath = join(RAW_COST_DIR, target.htmlFile);
    writeFileSync(htmlPath, html);
    console.log(`  💾 已保存: ${target.htmlFile} (${(html.length / 1024).toFixed(0)} KB)`);

    // 解析
    const parsed = parseCostPage(html);
    results[target.id] = { ...parsed, _url: fetchedUrl };

    // 计算派生字段
    const costModerate = parsed.singlePersonMonthlyCost != null && parsed.rent1BRCenter != null
      ? Math.round(parsed.singlePersonMonthlyCost + parsed.rent1BRCenter)
      : null;
    const costBudget = parsed.singlePersonMonthlyCost != null && parsed.rent1BROutside != null
      ? Math.round(parsed.singlePersonMonthlyCost * 0.7 + parsed.rent1BROutside)
      : null;
    const monthlyRent = parsed.rent1BRCenter != null ? Math.round(parsed.rent1BRCenter) : null;
    const housePrice = parsed.pricePerSqmCenter != null ? Math.round(parsed.pricePerSqmCenter) : null;

    console.log(`\n  📊 解析结果:`);
    console.log(`     singlePersonMonthlyCost: ${parsed.singlePersonMonthlyCost}`);
    console.log(`     familyMonthlyCost:       ${parsed.familyMonthlyCost}`);
    console.log(`     rent1BRCenter:           ${parsed.rent1BRCenter}`);
    console.log(`     rent1BROutside:          ${parsed.rent1BROutside}`);
    console.log(`     rent3BRCenter:           ${parsed.rent3BRCenter}`);
    console.log(`     pricePerSqmCenter:       ${parsed.pricePerSqmCenter}`);
    console.log(`     pricePerSqmOutside:      ${parsed.pricePerSqmOutside}`);
    console.log(`     mealInexpensive:         ${parsed.mealInexpensive}`);
    console.log(`     utilities:               ${parsed.utilities}`);
    console.log(`     internetMonthly:         ${parsed.internetMonthly}`);
    console.log(`     avgMonthlyNetSalary:     ${parsed.avgMonthlyNetSalary}`);

    console.log(`\n  📐 计算后字段:`);
    console.log(`     costModerate (单人月开支+市中心1BR): ${costModerate}`);
    console.log(`     costBudget   (月开支×0.7+非中心1BR): ${costBudget}`);
    console.log(`     monthlyRent  (市中心1BR):            ${monthlyRent}`);
    console.log(`     housePrice   (市中心每平米):          ${housePrice}`);

    // 与现有数据对比
    const existing = citiesMap[target.id];
    if (existing) {
      console.log(`\n  🔄 与现有数据对比:`);
      const fields = [
        ["costModerate", costModerate, existing.costModerate],
        ["costBudget", costBudget, existing.costBudget],
        ["monthlyRent", monthlyRent, existing.monthlyRent],
        ["housePrice", housePrice, existing.housePrice],
      ];
      for (const [name, newVal, oldVal] of fields) {
        const changed = newVal !== oldVal;
        const arrow = changed ? "→" : "=";
        const marker = changed ? (oldVal == null ? " 🆕" : " ⚠️") : " ✓";
        console.log(`     ${name.padEnd(15)} 旧: ${String(oldVal).padEnd(8)} ${arrow} 新: ${newVal}${marker}`);
      }
    }

    // 请求间隔
    if (target !== TARGETS[TARGETS.length - 1]) {
      console.log(`\n  ⏳ 等待 5 秒...`);
      await sleep(5000);
    }
  }

  console.log("\n\n═══════════════════════════════════════════════════════");
  console.log("  采集完成。请检查以上数据，确认无误后手动更新 cities-source.json");
  console.log("═══════════════════════════════════════════════════════\n");

  // 恢复初始节点
  await restoreInitialNode();
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
