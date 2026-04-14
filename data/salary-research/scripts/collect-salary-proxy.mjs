#!/usr/bin/env node
/**
 * collect-salary-proxy.mjs — 需要代理/IP轮换的薪资数据采集脚本
 *
 * ⚠ 此脚本需要由用户在可切换网络环境下运行（Clash 代理节点切换）
 * ⚠ 不要在 AI 环境中运行——切换 IP 可能导致连接断开
 *
 * 采集内容:
 *   Phase A: BLS OEWS zip 下载 (如果主脚本未能下载)
 *   Phase B: Numbeo 各城市平均薪资 (每城市 1 个请求)
 *   Phase C: Numbeo 分职业薪资页面 (如果存在)
 *
 * 特性:
 *   ✓ 断点续传 (checkpoint.json)
 *   ✓ Clash API 自动节点切换
 *   ✓ 指数退避重试
 *   ✓ 原始 HTML 归档
 *
 * 用法:
 *   node data/salary-research/scripts/collect-salary-proxy.mjs
 *   node data/salary-research/scripts/collect-salary-proxy.mjs --resume
 *   node data/salary-research/scripts/collect-salary-proxy.mjs --bls-only
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, createWriteStream } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../../..");
const RAW_DIR = join(__dirname, "../raw");
const CHECKPOINT_FILE = join(RAW_DIR, "salary-checkpoint.json");
const LOG_PATH = join(RAW_DIR, "salary-collection.log");

mkdirSync(join(RAW_DIR, "numbeo-salary-html"), { recursive: true });

// ═══════════════════════════════════════════════════════════════
// CLI
// ═══════════════════════════════════════════════════════════════
const args = process.argv.slice(2);
const BLS_ONLY = args.includes("--bls-only");
const RESUME = args.includes("--resume");
const REQUEST_DELAY_MS = 2500;
const MAX_RETRIES = 3;
const FETCH_TIMEOUT_MS = 30000;
const NODE_SWITCH_MAX = 10;

// ═══════════════════════════════════════════════════════════════
// Logging
// ═══════════════════════════════════════════════════════════════
let logStream = null;
const ts = () => new Date().toISOString().slice(11, 23);

function initLog() {
  logStream = createWriteStream(LOG_PATH, { flags: "a" });
  logStream.write(`\n${"═".repeat(60)}\n[${new Date().toISOString()}] 薪资采集脚本启动\n`);
}
function log(msg) { console.log(msg); if (logStream) logStream.write(`[${ts()}] ${msg}\n`); }
function logWarn(msg) { console.warn(msg); if (logStream) logStream.write(`[${ts()}] WARN ${msg}\n`); }
function logError(msg) { console.error(msg); if (logStream) logStream.write(`[${ts()}] ERROR ${msg}\n`); }
function closeLog() { if (logStream) { logStream.write(`[${ts()}] 脚本结束\n`); logStream.end(); } }

// ═══════════════════════════════════════════════════════════════
// Clash API 自动节点切换 (复用自 verify-numbeo-data.mjs)
// ═══════════════════════════════════════════════════════════════
const CLASH_API = "http://192.168.2.1:9090";
const CLASH_SECRET = "123456";
const CLASH_PROXY_GROUP = "🔰 手动选择";
const CLASH_GROUP_ENCODED = encodeURIComponent(CLASH_PROXY_GROUP);

const nodeState = {
  allNodes: [], currentIndex: -1, switchCount: 0, initialNode: null, deadNodes: new Set(),
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
    nodeState.currentIndex = Math.max(0, interleaved.indexOf(data.now));
    log(`🔀 节点池: ${interleaved.length} 节点, ${regionKeys.length} 地区`);
  } catch (err) {
    logWarn(`⚠ Clash API 不可用 (${err.message})，不做节点切换`);
  }
}

async function switchToNextNode() {
  if (nodeState.allNodes.length === 0) return null;
  const total = nodeState.allNodes.length;
  let tried = 0;
  while (tried < total) {
    nodeState.currentIndex = (nodeState.currentIndex + 1) % total;
    const candidate = nodeState.allNodes[nodeState.currentIndex];
    tried++;
    if (nodeState.deadNodes.has(candidate)) continue;
    try {
      await clashPut(`/proxies/${CLASH_GROUP_ENCODED}`, { name: candidate });
      await new Promise(r => setTimeout(r, 2000));
      const r = await fetch("http://ip-api.com/json/", { signal: AbortSignal.timeout(8000) });
      if (r.ok) {
        const ip = (await r.json()).query || "?";
        nodeState.switchCount++;
        log(`  🔀 切换到 ${candidate} (IP: ${ip})`);
        return { node: candidate, ip };
      }
    } catch { /* skip */ }
    nodeState.deadNodes.add(candidate);
  }
  return null;
}

async function restoreInitialNode() {
  if (!nodeState.initialNode || nodeState.allNodes.length === 0) return;
  try {
    await clashPut(`/proxies/${CLASH_GROUP_ENCODED}`, { name: nodeState.initialNode });
    log(`🔙 恢复初始节点: ${nodeState.initialNode}`);
  } catch { /* ignore */ }
}

// ═══════════════════════════════════════════════════════════════
// Checkpoint
// ═══════════════════════════════════════════════════════════════
function loadCheckpoint() {
  if (RESUME && existsSync(CHECKPOINT_FILE)) {
    return JSON.parse(readFileSync(CHECKPOINT_FILE, "utf-8"));
  }
  return { bls: false, numbeoCities: {}, numbeoSalary: {} };
}

function saveCheckpoint(cp) {
  writeFileSync(CHECKPOINT_FILE, JSON.stringify(cp, null, 2));
}

// ═══════════════════════════════════════════════════════════════
// Fetch with retry + node switch
// ═══════════════════════════════════════════════════════════════
async function fetchWithRetry(url, desc) {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const resp = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });

      if (resp.status === 403 || resp.status === 429) {
        logWarn(`  ${resp.status} for ${desc}, switching node...`);
        const switched = await switchToNextNode();
        if (!switched) { logError("  All nodes exhausted"); return null; }
        continue;
      }
      if (!resp.ok) {
        logWarn(`  HTTP ${resp.status} for ${desc}`);
        return null;
      }
      return await resp.text();
    } catch (err) {
      if (attempt < MAX_RETRIES - 1) {
        logWarn(`  Retry ${attempt + 1} for ${desc}: ${err.message}`);
        const delay = 2000 * Math.pow(2, attempt);
        await new Promise(r => setTimeout(r, delay));
        if (err.message.includes("timeout") || err.message.includes("abort")) {
          await switchToNextNode();
        }
      } else {
        logError(`  Failed after ${MAX_RETRIES} retries: ${desc}`);
        return null;
      }
    }
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════
// City → Numbeo slug mapping
// ═══════════════════════════════════════════════════════════════
const citiesData = JSON.parse(readFileSync(join(ROOT, "data/cities-source.json"), "utf-8")).cities;

// Numbeo city slugs (English city name for URL)
// Format: https://www.numbeo.com/cost-of-living/in/{slug}
const CITY_NUMBEO_SLUGS = {};
{
  // Load from citySlug.ts if possible, or use our own mapping
  const slugMap = {
    1: "New-York", 2: "London", 3: "Tokyo", 4: "Beijing", 5: "Shanghai",
    6: "Sydney", 7: "Singapore", 8: "Paris", 9: "Toronto", 10: "Hong-Kong",
    11: "Los-Angeles", 12: "San-Francisco", 13: "Chicago", 14: "Dubai",
    15: "Amsterdam", 16: "Zurich", 17: "Geneva", 18: "Munich", 19: "Berlin",
    20: "Barcelona", 21: "Madrid", 22: "Milan", 23: "Rome", 24: "Brussels",
    25: "Vienna", 26: "Prague", 27: "Warsaw", 28: "Lisbon", 29: "Athens",
    30: "Istanbul", 31: "Mexico-City", 32: "Sao-Paulo", 33: "Rio-De-Janeiro",
    34: "Miami", 35: "Washington", 36: "Boston", 37: "Seattle",
    38: "Denver", 39: "Austin", 40: "Vancouver", 41: "Montreal",
    42: "Melbourne", 43: "Brisbane", 44: "Auckland", 45: "Bangkok",
    46: "Kuala-Lumpur", 47: "Ho-Chi-Minh-City", 48: "Hanoi",
    49: "Bangalore", 50: "Mumbai", 51: "New-Delhi", 52: "Nairobi",
    53: "Cairo", 54: "Tehran", 55: "Karachi", 56: "Islamabad",
    57: "Jakarta", 58: "Manila", 59: "Seoul", 60: "Busan",
    61: "Taipei", 62: "Buenos-Aires", 63: "Santiago", 64: "Bogota",
    65: "Lima", 67: "Johannesburg", 68: "Cape-Town", 69: "Guadalajara",
    70: "San-Jose-Costa-Rica", 71: "Panama-City", 73: "San-Juan-Puerto-Rico",
    75: "Abu-Dhabi", 76: "Doha", 77: "Manama", 78: "Riyadh",
    79: "Muscat", 80: "Beirut", 81: "Amman", 82: "Tel-Aviv",
    83: "Hyderabad-India", 84: "Pune", 85: "Kiev", 86: "Bucharest",
    87: "Sofia", 88: "Zagreb", 89: "Belgrade", 90: "Budapest",
    91: "Bratislava", 92: "Ljubljana", 93: "Dublin", 94: "Belfast",
    95: "Atlanta", 96: "Phoenix", 97: "Portland", 98: "San-Diego",
    99: "Las-Vegas", 100: "Tampa", 101: "Guangzhou", 102: "Shenzhen",
    103: "Chengdu", 104: "Hangzhou", 105: "Chongqing", 106: "Osaka",
    107: "Nagoya", 108: "Incheon", 109: "Phnom-Penh", 110: "Yangon",
    112: "Chiang-Mai", 114: "Dhaka", 115: "Colombo", 116: "Kathmandu",
    117: "Almaty", 118: "Tashkent", 119: "Baku", 120: "Ulaanbaatar",
    121: "Stockholm", 122: "Copenhagen", 123: "Helsinki", 124: "Oslo",
    125: "Houston", 126: "Philadelphia", 127: "Calgary", 128: "Perth",
    129: "Medellin", 130: "Tbilisi", 131: "Lagos", 132: "Moscow",
    133: "San-Jose-CA", 134: "Irvine", 135: "Ottawa", 136: "Luxembourg",
    137: "Tallinn", 138: "Fukuoka", 139: "Yokohama", 140: "Bali",
    141: "Da-Nang", 142: "Playa-Del-Carmen", 143: "Porto",
    144: "Valencia", 146: "Split", 147: "Phuket",
    148: "Montevideo", 149: "Las-Palmas-De-Gran-Canaria", 150: "Penang",
    152: "Florianopolis", 157: "Cancun", 158: "Puerto-Vallarta",
    159: "Kyoto", 160: "Casablanca", 161: "Wellington",
  };
  Object.assign(CITY_NUMBEO_SLUGS, slugMap);
}

// ═══════════════════════════════════════════════════════════════
// Phase A: BLS zip download
// ═══════════════════════════════════════════════════════════════
async function phaseA_blsDownload(cp) {
  const zipPath = join(RAW_DIR, "oesm24ma.zip");
  const extractedPath = join(RAW_DIR, "bls-oews-extracted.json");
  
  if (existsSync(extractedPath) || existsSync(zipPath)) {
    log("Phase A: BLS data already exists, skipping");
    return;
  }
  
  log("\n" + "═".repeat(50));
  log("Phase A: Download BLS OEWS zip file");
  log("═".repeat(50));
  
  const html = await fetchWithRetry(
    "https://www.bls.gov/oes/special-requests/oesm24ma.zip",
    "BLS OEWS zip"
  );
  
  if (html && html.length > 100000) {
    writeFileSync(zipPath, html);
    log(`✓ Downloaded BLS zip (${html.length} bytes)`);
    cp.bls = true;
    saveCheckpoint(cp);
  } else {
    // Try alternative: download.bls.gov text format
    log("  Trying download.bls.gov text format...");
    const textData = await fetchWithRetry(
      "https://download.bls.gov/pub/time.series/oe/oe.data.0.Current",
      "BLS text data"
    );
    if (textData && textData.length > 1000000) {
      writeFileSync(join(RAW_DIR, "bls-oe-data-current.txt"), textData);
      log(`✓ Downloaded BLS text data (${textData.length} bytes)`);
      cp.bls = true;
      saveCheckpoint(cp);
    } else {
      logWarn("✗ BLS download failed — both methods blocked");
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// Phase B: Numbeo average salary — BATCH from ranking pages
// ═══════════════════════════════════════════════════════════════
async function phaseB_numbeoSalary(cp) {
  log("\n" + "═".repeat(50));
  log("Phase B: Numbeo salary data (ranking pages → batch)");
  log("═".repeat(50));
  
  const outputFile = join(RAW_DIR, "numbeo-salary-all-cities.json");
  
  // Strategy: Fetch ranking pages instead of individual city pages.
  // https://www.numbeo.com/cost-of-living/rankings.jsp has average salary for ALL cities
  // Much fewer requests needed (1-3 pages vs 150 individual city pages)
  
  const rankingUrls = [
    { url: "https://www.numbeo.com/cost-of-living/rankings_current.jsp", desc: "CoL rankings current" },
    { url: "https://www.numbeo.com/cost-of-living/rankings.jsp", desc: "CoL rankings" },
    { url: "https://www.numbeo.com/cost-of-living/country_price_rankings?itemId=105", desc: "Avg monthly salary after tax" },
    { url: "https://www.numbeo.com/cost-of-living/country_price_rankings?itemId=101", desc: "Avg monthly salary before tax" },
  ];
  
  const results = {};
  
  for (const { url, desc } of rankingUrls) {
    log(`\n  Fetching: ${desc}`);
    log(`  URL: ${url}`);
    
    const html = await fetchWithRetry(url, desc);
    if (!html) {
      log(`  ✗ Failed`);
      continue;
    }
    
    // Save raw HTML
    const safeName = desc.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
    writeFileSync(join(RAW_DIR, "numbeo-salary-html", `ranking-${safeName}.html`), html);
    log(`  ✓ Got ${html.length.toLocaleString()} bytes`);
    
    // Parse city salary data from ranking table
    // Numbeo ranking pages have tables with city names and values
    const cityPattern = /<td[^>]*>\s*<a[^>]*href="[^"]*\/in\/([^"]+)"[^>]*>([^<]+)<\/a>\s*<\/td>/gi;
    const rowPattern = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    
    let match;
    let found = 0;
    while ((match = rowPattern.exec(html)) !== null) {
      const rowHtml = match[1];
      
      // Find city link
      const cityMatch = rowHtml.match(/<a[^>]*href="[^"]*\/in\/([^"]+)"[^>]*>([^<]+)<\/a>/i);
      if (!cityMatch) continue;
      
      const slug = cityMatch[1];
      const cityName = cityMatch[2].trim();
      
      // Find numeric values in the row
      const numbers = [];
      const numPattern = /(?:class="[^"]*priceValue[^"]*"|<td[^>]*>)\s*([\d,.]+)\s/gi;
      let numMatch;
      while ((numMatch = numPattern.exec(rowHtml)) !== null) {
        const val = parseFloat(numMatch[1].replace(",", ""));
        if (!isNaN(val)) numbers.push(val);
      }
      
      if (numbers.length > 0) {
        if (!results[slug]) results[slug] = { cityName, slug, values: {} };
        results[slug].values[desc] = numbers;
        found++;
      }
    }
    
    log(`  Parsed ${found} cities from this page`);
    
    await new Promise(r => setTimeout(r, REQUEST_DELAY_MS));
  }
  
  // Also try individual city pages for salary-specific data
  // But only if ranking pages didn't get enough data
  if (Object.keys(results).length < 50) {
    log("\n  Ranking pages insufficient, trying individual city salary pages...");
    log("  (This requires more requests — will use node switching)");
    
    const collected = cp.numbeoSalary || {};
    let count = Object.keys(collected).length;
    const total = Object.keys(CITY_NUMBEO_SLUGS).length;
    
    for (const [cityIdStr, slug] of Object.entries(CITY_NUMBEO_SLUGS)) {
      const cityId = parseInt(cityIdStr);
      if (collected[cityId]) continue;
      
      const city = citiesData.find(c => c.id === cityId);
      if (!city) continue;
      
      // Cost of living page has "Average Monthly Net Salary"
      const url = `https://www.numbeo.com/cost-of-living/in/${slug}`;
      log(`  [${count + 1}/${total}] ${city.name} (${slug})`);
      
      const html = await fetchWithRetry(url, `Numbeo ${slug}`);
      
      if (html) {
        writeFileSync(join(RAW_DIR, "numbeo-salary-html", `${cityId}-${slug}.html`), html);
        
        // Parse net salary
        const salaryMatch = html.match(
          /Average Monthly Net Salary[^<]*<\/td>\s*<td[^>]*>\s*([\d,.]+)\s/i
        );
        
        const salary = salaryMatch ? parseFloat(salaryMatch[1].replace(",", "")) : null;
        
        collected[cityId] = {
          cityName: city.name, slug, country: city.country,
          numbeoNetMonthlySalary: salary,
          fetchedAt: new Date().toISOString(),
        };
        
        count++;
        log(`    ${salary ? `Net salary: $${salary}/mo` : "No salary found"}`);
      } else {
        log(`    ✗ Failed — stopping individual fetches`);
        break;  // If one fails, all will fail — stop early
      }
      
      cp.numbeoSalary = collected;
      saveCheckpoint(cp);
      await new Promise(r => setTimeout(r, REQUEST_DELAY_MS));
    }
  }
  
  // Save whatever we got
  const output = {
    source: "Numbeo Cost of Living / Salary Rankings",
    collectedAt: new Date().toISOString(),
    rankingData: results,
    cityData: cp.numbeoSalary || {},
    totalRankingCities: Object.keys(results).length,
    totalCityPages: Object.keys(cp.numbeoSalary || {}).length,
  };
  writeFileSync(outputFile, JSON.stringify(output, null, 2) + "\n");
  log(`\n✓ Saved → ${outputFile}`);
  log(`  Ranking data: ${Object.keys(results).length} cities`);
  log(`  City pages: ${Object.keys(cp.numbeoSalary || {}).length} cities`);
}

// ═══════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════
async function main() {
  initLog();
  
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║  WhichCity Salary Collection — Proxy-Required Script    ║");
  console.log("║  需要 Clash 代理支持 (自动节点切换)                      ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
  
  // Initialize proxy
  await initNodePool();
  
  // Load checkpoint
  const cp = loadCheckpoint();
  
  try {
    // Phase A: BLS download (if needed)
    if (!cp.bls) {
      await phaseA_blsDownload(cp);
    }
    
    if (!BLS_ONLY) {
      // Phase B: Numbeo salary
      await phaseB_numbeoSalary(cp);
    }
    
    // Summary
    log("\n" + "═".repeat(50));
    log("SUMMARY");
    log("═".repeat(50));
    log(`BLS data: ${cp.bls ? "✓" : "✗"}`);
    log(`Numbeo cities: ${Object.keys(cp.numbeoSalary || {}).length}/${Object.keys(CITY_NUMBEO_SLUGS).length}`);
    log(`Node switches: ${nodeState.switchCount}`);
    
  } finally {
    await restoreInitialNode();
    closeLog();
  }
}

main().catch(err => {
  logError(`Fatal: ${err.stack}`);
  closeLog();
  process.exit(1);
});
