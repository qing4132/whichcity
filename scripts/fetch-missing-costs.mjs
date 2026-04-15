#!/usr/bin/env node
/**
 * fetch-missing-costs.mjs — 采集缺失 costModerate 的 10 个城市
 *
 * 目标城市:
 *   ID 70:  圣何塞(哥斯达黎加) — San-Jose-Costa-Rica  (旧数据需刷新)
 *   ID 138: 福冈               — Fukuoka              (页面无摘要，需手动计算)
 *   ID 159: 京都               — Kyoto                (页面无摘要，需手动计算)
 *   ID 162: 维尔纽斯           — Vilnius
 *   ID 163: 里加               — Riga
 *   ID 164: 尼科西亚           — Nicosia
 *   ID 165: 圣多明各           — Santo-Domingo
 *   ID 166: 基多               — Quito
 *   ID 167: 阿克拉             — Accra
 *   ID 168: 亚的斯亚贝巴       — Addis-Ababa
 *
 * 对于没有 singlePersonMonthlyCost 摘要的页面（如福冈、京都），
 * 脚本会从明细价格自行估算月生活成本。
 *
 * 用法:  node scripts/fetch-missing-costs.mjs
 * 输出:  解析结果 + 与现有数据对比 + HTML 归档
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const RAW_COST_DIR = join(__dirname, "numbeo-audit", "raw", "cost");
const CITIES_PATH = join(ROOT, "data/cities-source.json");

mkdirSync(RAW_COST_DIR, { recursive: true });

// ═══════════════════════════════════════════════════════════════
// Clash API 自动节点切换
// ═══════════════════════════════════════════════════════════════
const CLASH_API = "http://192.168.2.1:9090";
const CLASH_SECRET = "123456";
const CLASH_PROXY_GROUP = "🔰 手动选择";
const CLASH_GROUP_ENCODED = encodeURIComponent(CLASH_PROXY_GROUP);
const NODE_VERIFY_URL = "http://ip-api.com/json/";
const NODE_VERIFY_TIMEOUT = 8000;
const NODE_SWITCH_MAX = 30;

const nodeState = {
  allNodes: [],
  currentIndex: -1,
  switchCount: 0,
  initialNode: null,
  deadNodes: new Set(),
  usedIPs: new Set(),
};

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

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
    console.log(`🔀 节点池: ${interleaved.length} 个节点, ${regionKeys.length} 个地区`);
  } catch (err) {
    console.warn(`⚠ Clash API 不可用 (${err.message})，禁用节点切换`);
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
          console.log(`  ⏭ ${candidate} IP ${ip} 已用过`);
          nodeState.deadNodes.add(candidate);
          continue;
        }
        nodeState.usedIPs.add(ip);
        nodeState.switchCount++;
        console.log(`  🔀 ${candidate} → IP: ${ip}`);
        return { node: candidate, ip };
      } else {
        console.log(`  ⏭ ${candidate} 不通`);
        nodeState.deadNodes.add(candidate);
      }
    } catch {
      console.log(`  ⏭ ${candidate} 切换失败`);
      nodeState.deadNodes.add(candidate);
    }
  }
  console.warn(`  ⚠ 所有节点耗尽`);
  return null;
}

async function restoreInitialNode() {
  if (!nodeState.initialNode || nodeState.allNodes.length === 0) return;
  try {
    await clashPut(`/proxies/${CLASH_GROUP_ENCODED}`, { name: nodeState.initialNode });
    console.log(`🔙 已恢复初始节点: ${nodeState.initialNode}`);
  } catch { /* ignore */ }
}

// ═══════════════════════════════════════════════════════════════
// 目标城市
// ═══════════════════════════════════════════════════════════════
const TARGETS = [
  { id: 70,  label: "圣何塞(哥斯达黎加)", slug: "San-Jose-Costa-Rica", file: "070-san-jose-cr.html", expect: "Costa Rica" },
  { id: 138, label: "福冈",               slug: "Fukuoka",             file: "138-fukuoka.html",     expect: "Japan" },
  { id: 159, label: "京都",               slug: "Kyoto",               file: "159-kyoto.html",       expect: "Japan" },
  { id: 162, label: "维尔纽斯",           slug: "Vilnius",             file: "162-vilnius.html",      expect: "Lithuania" },
  { id: 163, label: "里加",               slug: "Riga",                file: "163-riga.html",         expect: "Latvia" },
  { id: 164, label: "尼科西亚",           slug: "Nicosia",             file: "164-nicosia.html",      expect: "Cyprus" },
  { id: 165, label: "圣多明各",           slug: "Santo-Domingo",       file: "165-santo-domingo.html", expect: "Dominican" },
  { id: 166, label: "基多",               slug: "Quito",               file: "166-quito.html",        expect: "Ecuador" },
  { id: 167, label: "阿克拉",             slug: "Accra",               file: "167-accra.html",        expect: "Ghana" },
  { id: 168, label: "亚的斯亚贝巴",       slug: "Addis-Ababa",         file: "168-addis-ababa.html",  expect: "Ethiopia" },
];

// ═══════════════════════════════════════════════════════════════
// 网络请求（重试 + 节点切换）
// ═══════════════════════════════════════════════════════════════
const USER_AGENTS = [
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
];

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
        if (nodeSwitches < NODE_SWITCH_MAX && nodeState.allNodes.length > 0) {
          const result = await switchToNextNode();
          if (result) { nodeSwitches++; attempt--; continue; }
        }
        const waitSec = 60 * attempt;
        console.log(`  ⚠ HTTP ${resp.status} → 等待 ${waitSec}s (${attempt}/${MAX_RETRIES})`);
        await sleep(waitSec * 1000);
        continue;
      }
      if (!resp.ok) return { ok: false, status: resp.status, html: "" };
      return { ok: true, status: resp.status, html: await resp.text() };
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
  return { ok: false, status: 0, html: "", error: "max retries" };
}

// ═══════════════════════════════════════════════════════════════
// HTML 解析
// ═══════════════════════════════════════════════════════════════
function parsePrice(str) {
  if (!str) return null;
  const val = parseFloat(str.replace(/,/g, "").trim());
  return isNaN(val) ? null : val;
}

function parseCostPage(html) {
  const result = {};

  // 摘要: singlePersonMonthlyCost
  const costPatterns = [
    /single\s+person[\s\S]{0,400}?emp_number[^>]*>\s*(\d[\d,]*(?:\.\d+)?)\s*(?:&#36;|\$)/i,
    /single\s+person[\s\S]{0,500}?in_other_currency[^>]*>\(?\s*(\d[\d,]*(?:\.\d+)?)\s*(?:&#36;|\$)/i,
    /single\s+person[\s\S]{0,300}?emp_number[^>]*>\s*(\d[\d,]*(?:\.\d+)?)/i,
  ];
  for (const pat of costPatterns) {
    const m = html.match(pat);
    if (m) { result.singlePersonMonthlyCost = parsePrice(m[1]); break; }
  }

  // 摘要: familyMonthlyCost
  const familyPatterns = [
    /family\s+of\s+four[\s\S]{0,400}?emp_number[^>]*>\s*(\d[\d,]*(?:\.\d+)?)\s*(?:&#36;|\$)/i,
    /family\s+of\s+four[\s\S]{0,500}?in_other_currency[^>]*>\(?\s*(\d[\d,]*(?:\.\d+)?)\s*(?:&#36;|\$)/i,
    /family\s+of\s+four[\s\S]{0,300}?emp_number[^>]*>\s*(\d[\d,]*(?:\.\d+)?)/i,
  ];
  for (const pat of familyPatterns) {
    const m = html.match(pat);
    if (m) { result.familyMonthlyCost = parsePrice(m[1]); break; }
  }

  // 通用提取
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
  result.mealMidRange = extractItem("Meal for 2 People, Mid-range Restaurant");
  result.cappuccino = extractItem("Cappuccino \\(Regular Size\\)");
  result.localTransport = extractItem("One-Way Ticket \\(Local Transport\\)");
  result.monthlyPass = extractItem("Monthly Pass \\(Regular Price\\)");
  result.utilities = extractItem("Basic Utilities for");
  result.internetMonthly = extractItem("Broadband Internet");
  result.fitness = extractItem("Fitness Club, Monthly Fee");
  result.avgMonthlyNetSalary = extractItem("Average Monthly Net Salary \\(After Tax\\)");

  // 如果没有摘要但有明细，自行估算 singlePersonMonthlyCost
  // Numbeo 公式近似: meal(×30) + transport(月卡) + utilities + internet + fitness + groceries杂项
  // 简化: 用 Numbeo 的其他有摘要城市的 "摘要/明细" 比值来推算
  if (result.singlePersonMonthlyCost == null) {
    // 用更直接的方式: 便宜餐×30 + 月交通卡 + 水电 + 网费 + 健身 + 日用杂项(≈便宜餐×15)
    const meal = result.mealInexpensive;
    const transport = result.monthlyPass;
    const util = result.utilities;
    const net = result.internetMonthly;
    const fit = result.fitness;
    if (meal != null) {
      const food = meal * 30;        // 每天一餐外食 + 自炊 ≈ 便宜餐 × 30
      const trans = transport || 0;
      const u = util || 0;
      const n = net || 0;
      const f = fit || 0;
      const groceries = meal * 15;   // 日用/超市 ≈ 便宜餐 × 15
      const estimated = food + trans + u + n + f + groceries;
      result.singlePersonMonthlyCostEstimated = Math.round(estimated);
      result._costEstimated = true;
    }
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════
// 主流程
// ═══════════════════════════════════════════════════════════════
async function main() {
  await initNodePool();

  const srcData = JSON.parse(readFileSync(CITIES_PATH, "utf-8"));
  const citiesMap = {};
  srcData.cities.forEach(c => { citiesMap[c.id] = c; });

  console.log("\n═══════════════════════════════════════════════════════");
  console.log("  WhichCity — 缺失城市 Numbeo 数据采集 (10 城市)");
  console.log("═══════════════════════════════════════════════════════\n");

  const results = {};

  for (let i = 0; i < TARGETS.length; i++) {
    const t = TARGETS[i];
    console.log(`\n── [${i + 1}/${TARGETS.length}] ${t.label} (ID ${t.id}) ──`);

    // 每个城市重置 IP 池
    nodeState.usedIPs.clear();
    nodeState.deadNodes.clear();

    const url = `https://www.numbeo.com/cost-of-living/in/${t.slug}?displayCurrency=USD`;
    console.log(`  URL: ${url}`);

    const r = await fetchPage(url);
    if (!r.ok) {
      console.log(`  ✗ 失败: HTTP ${r.status} ${r.error || ""}`);
      results[t.id] = null;
      if (i < TARGETS.length - 1) { console.log(`  ⏳ 等待 5s...`); await sleep(5000); }
      continue;
    }

    // 验证页面身份
    const titleMatch = r.html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const title = titleMatch ? titleMatch[1] : "(no title)";
    const isError = /Cannot find city|404|not found/i.test(title);

    if (isError) {
      console.log(`  ✗ 错误页面: ${title}`);
      results[t.id] = null;
      if (i < TARGETS.length - 1) { console.log(`  ⏳ 等待 5s...`); await sleep(5000); }
      continue;
    }

    if (!r.html.includes(t.expect)) {
      console.log(`  ⚠ 警告: 页面中未找到 "${t.expect}"，可能抓错了！`);
      console.log(`  页面标题: ${title}`);
    } else {
      console.log(`  ✓ ${title}`);
    }

    // 保存 HTML
    writeFileSync(join(RAW_COST_DIR, t.file), r.html);
    console.log(`  💾 ${t.file} (${(r.html.length / 1024).toFixed(0)} KB)`);

    // 解析
    const parsed = parseCostPage(r.html);
    results[t.id] = parsed;

    // 确定 singlePersonMonthlyCost
    const singleCost = parsed.singlePersonMonthlyCost ?? parsed.singlePersonMonthlyCostEstimated ?? null;
    const isEst = !!parsed._costEstimated;

    // 计算派生字段
    const costModerate = (singleCost != null && parsed.rent1BRCenter != null)
      ? Math.round(singleCost + parsed.rent1BRCenter) : null;
    const costBudget = (singleCost != null && parsed.rent1BROutside != null)
      ? Math.round(singleCost * 0.7 + parsed.rent1BROutside) : null;
    const monthlyRent = parsed.rent1BRCenter != null ? Math.round(parsed.rent1BRCenter) : null;
    const housePrice = parsed.pricePerSqmCenter != null ? Math.round(parsed.pricePerSqmCenter) : null;

    console.log(`\n  📊 原始数据:`);
    console.log(`     singlePersonMonthlyCost: ${parsed.singlePersonMonthlyCost ?? "—"}${isEst ? ` (估算: ${parsed.singlePersonMonthlyCostEstimated})` : ""}`);
    console.log(`     rent1BRCenter:  ${parsed.rent1BRCenter}`);
    console.log(`     rent1BROutside: ${parsed.rent1BROutside}`);
    console.log(`     pricePerSqmCenter: ${parsed.pricePerSqmCenter}`);
    console.log(`     mealInexpensive: ${parsed.mealInexpensive}`);
    console.log(`     utilities: ${parsed.utilities} | internet: ${parsed.internetMonthly}`);

    console.log(`  📐 计算结果${isEst ? " ⚠️ 基于估算" : ""}:`);
    console.log(`     costModerate: ${costModerate}`);
    console.log(`     costBudget:   ${costBudget}`);
    console.log(`     monthlyRent:  ${monthlyRent}`);
    console.log(`     housePrice:   ${housePrice}`);

    // 对比现有值
    const existing = citiesMap[t.id];
    if (existing) {
      console.log(`  🔄 对比:`);
      const fields = [
        ["costModerate", costModerate, existing.costModerate],
        ["costBudget", costBudget, existing.costBudget],
        ["monthlyRent", monthlyRent, existing.monthlyRent],
        ["housePrice", housePrice, existing.housePrice],
      ];
      for (const [name, newVal, oldVal] of fields) {
        const changed = newVal !== oldVal;
        const marker = changed ? (oldVal == null ? "🆕" : "⚠️") : "✓";
        console.log(`     ${name.padEnd(15)} 旧: ${String(oldVal).padEnd(8)} → 新: ${newVal} ${marker}`);
      }
    }

    // 请求间隔
    if (i < TARGETS.length - 1) {
      console.log(`\n  ⏳ 等待 5s...`);
      await sleep(5000);
    }
  }

  // 汇总
  console.log("\n\n═══════════════════════════════════════════════════════");
  console.log("  采集完成汇总");
  console.log("═══════════════════════════════════════════════════════");
  let ok = 0, fail = 0, est = 0;
  for (const t of TARGETS) {
    const r = results[t.id];
    if (!r) { fail++; console.log(`  ✗ ${t.label} — 采集失败`); }
    else if (r._costEstimated) { est++; console.log(`  ⚠ ${t.label} — 月成本为估算值`); }
    else { ok++; console.log(`  ✓ ${t.label}`); }
  }
  console.log(`\n  成功: ${ok}  估算: ${est}  失败: ${fail}`);
  console.log("\n  请审核以上数据，确认后手动更新 data/cities-source.json");
  console.log("  然后运行: node data/scripts/export.mjs");
  console.log("═══════════════════════════════════════════════════════\n");

  await restoreInitialNode();
}

main().catch(err => { console.error("Fatal:", err); process.exit(1); });
