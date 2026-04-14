#!/usr/bin/env node
/**
 * verify-numbeo-data.mjs — WhichCity Numbeo 数据一键验证/采集脚本
 *
 * 对 150 个城市从 Numbeo 采集以下数据并与 cities.json 做对比:
 *   - Safety Index（犯罪排名页 + 城市页）
 *   - Cost of Living Index / Rent Index（排名页）
 *   - Monthly living cost, single person（城市页）
 *   - Monthly rent 1BR city centre（城市页）
 *   - House price per sqm city centre（城市页）
 *   - Pollution Index（排名页）
 *   - Healthcare Index（排名页）
 *
 * 特性:
 *   ✓ 断点续传 — checkpoint.json 记录已完成的请求
 *   ✓ 自动重试 — 超时/429/网络错误，指数退避
 *   ✓ 原始 HTML 归档 — 可溯源
 *   ✓ 多模式匹配 — ranking 页自动匹配我方 150 城市
 *   ✓ 详细对比报告 — JSON + Markdown
 *
 * 用法:
 *   node scripts/verify-numbeo-data.mjs                # 完整流程
 *   node scripts/verify-numbeo-data.mjs --rankings-only # 仅排名页（5 请求，< 30 秒）
 *   node scripts/verify-numbeo-data.mjs --parse-only    # 仅重新解析已有 HTML
 *   node scripts/verify-numbeo-data.mjs --delay=5       # 请求间隔 5 秒（默认 2）
 *
 * 输出:
 *   scripts/numbeo-audit/raw/rankings/   — 排名页原始 HTML
 *   scripts/numbeo-audit/raw/cost/       — 城市生活成本页原始 HTML
 *   scripts/numbeo-audit/raw/property/   — 城市房产页原始 HTML (按需)
 *   scripts/numbeo-audit/checkpoint.json — 进度记录
 *   scripts/numbeo-audit/fetched-data.json — 解析后的结构化数据
 *   scripts/numbeo-audit/report.md       — 人类可读对比报告
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const AUDIT_DIR = join(__dirname, "numbeo-audit");
const RAW_DIR = join(AUDIT_DIR, "raw");
const CITIES_PATH = join(ROOT, "public/data/cities.json");

// ═══════════════════════════════════════════════════════════════
// CLI 参数解析
// ═══════════════════════════════════════════════════════════════
const args = process.argv.slice(2);
const RANKINGS_ONLY = args.includes("--rankings-only");
const PARSE_ONLY = args.includes("--parse-only");
const DELAY_ARG = args.find(a => a.startsWith("--delay="));
const REQUEST_DELAY_MS = DELAY_ARG ? parseInt(DELAY_ARG.split("=")[1]) * 1000 : 2000;
const MAX_RETRIES = 3;
const FETCH_TIMEOUT_MS = 30000;

// ═══════════════════════════════════════════════════════════════
// Section 1: 中文国家 → Numbeo 英文国名映射
// ═══════════════════════════════════════════════════════════════
const COUNTRY_ZH_TO_NUMBEO = {
  "美国": "United-States", "英国": "United-Kingdom", "日本": "Japan",
  "中国": "China", "澳大利亚": "Australia", "新加坡": "Singapore",
  "法国": "France", "加拿大": "Canada", "中国香港": "Hong-Kong",
  "荷兰": "Netherlands", "瑞士": "Switzerland", "德国": "Germany",
  "西班牙": "Spain", "意大利": "Italy", "比利时": "Belgium",
  "奥地利": "Austria", "捷克": "Czech-Republic", "波兰": "Poland",
  "葡萄牙": "Portugal", "希腊": "Greece", "土耳其": "Turkey",
  "墨西哥": "Mexico", "巴西": "Brazil", "新西兰": "New-Zealand",
  "泰国": "Thailand", "马来西亚": "Malaysia", "越南": "Vietnam",
  "印度": "India", "肯尼亚": "Kenya", "埃及": "Egypt", "伊朗": "Iran",
  "巴基斯坦": "Pakistan", "印度尼西亚": "Indonesia", "菲律宾": "Philippines",
  "韩国": "South-Korea", "台湾": "Taiwan", "阿根廷": "Argentina",
  "智利": "Chile", "哥伦比亚": "Colombia", "秘鲁": "Peru",
  "南非": "South-Africa", "哥斯达黎加": "Costa-Rica", "巴拿马": "Panama",
  "波多黎各": "Puerto-Rico", "阿联酋": "United-Arab-Emirates",
  "卡塔尔": "Qatar", "巴林": "Bahrain", "沙特阿拉伯": "Saudi-Arabia",
  "阿曼": "Oman", "黎巴嫩": "Lebanon", "约旦": "Jordan", "以色列": "Israel",
  "乌克兰": "Ukraine", "罗马尼亚": "Romania", "保加利亚": "Bulgaria",
  "克罗地亚": "Croatia", "塞尔维亚": "Serbia", "匈牙利": "Hungary",
  "斯洛伐克": "Slovakia", "斯洛文尼亚": "Slovenia", "爱尔兰": "Ireland",
  "柬埔寨": "Cambodia", "缅甸": "Myanmar", "孟加拉国": "Bangladesh",
  "斯里兰卡": "Sri-Lanka", "尼泊尔": "Nepal", "哈萨克斯坦": "Kazakhstan",
  "乌兹别克斯坦": "Uzbekistan", "阿塞拜疆": "Azerbaijan", "蒙古": "Mongolia",
  "瑞典": "Sweden", "丹麦": "Denmark", "芬兰": "Finland", "挪威": "Norway",
  "格鲁吉亚": "Georgia", "尼日利亚": "Nigeria", "俄罗斯": "Russia",
  "卢森堡": "Luxembourg", "爱沙尼亚": "Estonia", "乌拉圭": "Uruguay",
  "摩洛哥": "Morocco",
};

// ═══════════════════════════════════════════════════════════════
// Section 2: 我方 slug → ID（复制自 citySlug.ts）
// ═══════════════════════════════════════════════════════════════
const SLUG_TO_ID = {
  "new-york": 1, "london": 2, "tokyo": 3, "beijing": 4, "shanghai": 5,
  "sydney": 6, "singapore": 7, "paris": 8, "toronto": 9, "hong-kong": 10,
  "los-angeles": 11, "san-francisco": 12, "chicago": 13, "dubai": 14, "amsterdam": 15,
  "zurich": 16, "geneva": 17, "munich": 18, "berlin": 19, "barcelona": 20,
  "madrid": 21, "milan": 22, "rome": 23, "brussels": 24, "vienna": 25,
  "prague": 26, "warsaw": 27, "lisbon": 28, "athens": 29, "istanbul": 30,
  "mexico-city": 31, "sao-paulo": 32, "rio-de-janeiro": 33, "miami": 34,
  "washington": 35, "boston": 36, "seattle": 37, "denver": 38, "austin": 39,
  "vancouver": 40, "montreal": 41, "melbourne": 42, "brisbane": 43, "auckland": 44,
  "bangkok": 45, "kuala-lumpur": 46, "ho-chi-minh-city": 47, "hanoi": 48,
  "bengaluru": 49, "mumbai": 50, "new-delhi": 51, "nairobi": 52, "cairo": 53,
  "tehran": 54, "karachi": 55, "islamabad": 56, "jakarta": 57, "manila": 58,
  "seoul": 59, "busan": 60, "taipei": 61, "buenos-aires": 62, "santiago": 63,
  "bogota": 64, "lima": 65, "johannesburg": 67, "cape-town": 68,
  "guadalajara": 69, "san-jose": 70, "panama-city": 71, "san-juan": 73,
  "abu-dhabi": 75, "doha": 76, "manama": 77, "riyadh": 78, "muscat": 79,
  "beirut": 80, "amman": 81, "tel-aviv": 82, "hyderabad": 83, "pune": 84,
  "kyiv": 85, "bucharest": 86, "sofia": 87, "zagreb": 88, "belgrade": 89,
  "budapest": 90, "bratislava": 91, "ljubljana": 92, "dublin": 93, "belfast": 94,
  "atlanta": 95, "phoenix": 96, "portland": 97, "san-diego": 98,
  "las-vegas": 99, "tampa": 100, "guangzhou": 101, "shenzhen": 102,
  "chengdu": 103, "hangzhou": 104, "chongqing": 105, "osaka": 106,
  "nagoya": 107, "incheon": 108, "phnom-penh": 109, "yangon": 110,
  "chiang-mai": 112, "dhaka": 114, "colombo": 115, "kathmandu": 116,
  "almaty": 117, "tashkent": 118, "baku": 119, "ulaanbaatar": 120,
  "stockholm": 121, "copenhagen": 122, "helsinki": 123, "oslo": 124,
  "houston": 125, "philadelphia": 126, "calgary": 127, "perth": 128,
  "medellin": 129, "tbilisi": 130, "lagos": 131, "moscow": 132,
  "san-jose-us": 133, "irvine": 134, "ottawa": 135, "luxembourg-city": 136,
  "tallinn": 137, "fukuoka": 138, "yokohama": 139, "bali": 140,
  "da-nang": 141, "playa-del-carmen": 142, "porto": 143, "valencia": 144,
  "split": 146, "phuket": 147, "montevideo": 148, "las-palmas": 149,
  "penang": 150, "florianopolis": 152, "cancun": 157,
  "puerto-vallarta": 158, "kyoto": 159, "casablanca": 160, "wellington": 161,
};
const ID_TO_SLUG = Object.fromEntries(Object.entries(SLUG_TO_ID).map(([s, id]) => [id, s]));

// ═══════════════════════════════════════════════════════════════
// Section 3: Numbeo 城市名特殊映射
// slug 转 Title-Case 即为默认 Numbeo URL 名
// 此处仅列出与默认不同的城市
// ═══════════════════════════════════════════════════════════════
function slugToNumbeo(slug) {
  return slug.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join("-");
}

/** 我方 ID → Numbeo URL 城市名候选列表（按优先级排序） */
const NUMBEO_NAME_OVERRIDES = {
  10:  ["Hong-Kong"],                           // slug: hong-kong → 但 Numbeo 可能把它当独立地区
  35:  ["Washington-DC", "Washington"],          // slug: washington
  49:  ["Bangalore", "Bengaluru"],               // slug: bengaluru (Numbeo 用旧名)
  51:  ["Delhi", "New-Delhi"],                   // slug: new-delhi
  70:  ["San-Jose", "San-Jose--Costa-Rica"],     // slug: san-jose (哥斯达黎加)
  71:  ["Panama-City", "Panama"],                // slug: panama-city
  73:  ["San-Juan--Puerto-Rico", "San-Juan"],    // slug: san-juan
  82:  ["Tel-Aviv", "Tel-Aviv-Yafo"],            // slug: tel-aviv
  85:  ["Kyiv", "Kiev"],                         // slug: kyiv (Numbeo 可能用旧拼法)
  98:  ["San-Diego-CA", "San-Diego"],            // US city disambiguation
  120: ["Ulan-Bator", "Ulaanbaatar"],            // slug: ulaanbaatar
  129: ["Medellin"],                             // slug: medellin (accent omitted in URL)
  133: ["San-Jose-CA", "San-Jose"],              // slug: san-jose-us
  134: ["Irvine-CA", "Irvine"],                  // slug: irvine
  136: ["Luxembourg"],                           // slug: luxembourg-city
  140: ["Denpasar-Bali", "Denpasar", "Bali"],    // slug: bali（岛 vs 城市）
  149: ["Las-Palmas-De-Gran-Canaria", "Las-Palmas"], // slug: las-palmas
  150: ["Penang", "George-Town-Penang", "George-Town"], // slug: penang
};

/** Numbeo ranking 页中出现的城市名 → 我方 ID（用于反向匹配） */
const NUMBEO_REVERSE_MAP = {
  "bangalore": 49, "bengaluru": 49,
  "delhi": 51, "new-delhi": 51,
  "denpasar": 140, "denpasar-bali": 140, "bali": 140,
  "ulan-bator": 120, "ulaanbaatar": 120,
  "kiev": 85, "kyiv": 85,
  "washington-dc": 35, "washington-d-c": 35, "washington,-dc": 35,
  "san-jose-ca": 133,
  "irvine-ca": 134,
  "san-diego-ca": 98,
  "george-town": 150, "george-town-penang": 150, "penang": 150,
  "luxembourg": 136, "luxembourg-city": 136,
  "las-palmas-de-gran-canaria": 149, "las-palmas": 149,
  "panama-city": 71, "panama": 71,
  "tel-aviv-yafo": 82, "tel-aviv": 82,
};

// ═══════════════════════════════════════════════════════════════
// Section 4: 工具函数
// ═══════════════════════════════════════════════════════════════
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function ensureDir(dir) {
  mkdirSync(dir, { recursive: true });
}

function loadCheckpoint() {
  const p = join(AUDIT_DIR, "checkpoint.json");
  if (existsSync(p)) return JSON.parse(readFileSync(p, "utf-8"));
  return { rankings: {}, cities: {} };
}

function saveCheckpoint(cp) {
  writeFileSync(join(AUDIT_DIR, "checkpoint.json"), JSON.stringify(cp, null, 2) + "\n");
}

function ts() {
  return new Date().toISOString().slice(11, 19);
}

function pad(id) {
  return String(id).padStart(3, "0");
}

// ═══════════════════════════════════════════════════════════════
// Section 5: 网络请求（重试 + 退避 + 429 处理）
// ═══════════════════════════════════════════════════════════════
const USER_AGENTS = [
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
  "Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0",
];

let requestCount = 0;

async function fetchWithRetry(url, retries = MAX_RETRIES) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      const ua = USER_AGENTS[requestCount % USER_AGENTS.length];
      requestCount++;

      const resp = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": ua,
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Accept-Encoding": "gzip, deflate, br",
          "Cache-Control": "no-cache",
        },
        redirect: "follow",
      });
      clearTimeout(timer);

      if (resp.status === 429) {
        const waitSec = attempt === 1 ? 60 : 120 * attempt;
        console.warn(`  ⚠ 429 Too Many Requests → 等待 ${waitSec}s 后重试 (${attempt}/${retries})`);
        await sleep(waitSec * 1000);
        continue;
      }
      if (resp.status === 403) {
        const waitSec = 120 * attempt;
        console.warn(`  ⚠ 403 Forbidden → 等待 ${waitSec}s 后重试 (${attempt}/${retries})`);
        await sleep(waitSec * 1000);
        continue;
      }
      if (resp.status === 404) {
        return { ok: false, status: 404, html: "" };
      }
      if (resp.status >= 500) {
        console.warn(`  ⚠ HTTP ${resp.status} → 等待 10s 后重试 (${attempt}/${retries})`);
        await sleep(10000);
        continue;
      }
      if (!resp.ok) {
        return { ok: false, status: resp.status, html: "" };
      }

      const html = await resp.text();
      return { ok: true, status: resp.status, html };
    } catch (err) {
      if (err.name === "AbortError") {
        console.warn(`  ⚠ 超时 → 重试 (${attempt}/${retries})`);
      } else {
        console.warn(`  ⚠ 网络错误: ${err.message} → 重试 (${attempt}/${retries})`);
      }
      if (attempt < retries) {
        const backoff = 5000 * Math.pow(2, attempt - 1);
        await sleep(backoff);
      }
    }
  }
  return { ok: false, status: 0, html: "", error: "max retries exceeded" };
}

// ═══════════════════════════════════════════════════════════════
// Section 6: HTML 解析器 — 排名表格（通用）
// ═══════════════════════════════════════════════════════════════

/**
 * 从 Numbeo 排名页提取表格数据。
 * 返回 [{ urlName, displayText, values: [number, ...] }, ...]
 */
function parseRankingTable(html) {
  const results = [];
  // 匹配每一个 <tr>...</tr>
  const rowRegex = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;
  while ((rowMatch = rowRegex.exec(html)) !== null) {
    const row = rowMatch[1];
    // 查找 city 链接: <a href="/crime/in/Tokyo">Tokyo, Japan</a>
    const linkMatch = row.match(/<a\s+href="[^"]*\/in\/([^"?]+)"[^>]*>([^<]+)<\/a>/i);
    if (!linkMatch) continue;

    const urlName = decodeURIComponent(linkMatch[1]); // e.g. "Tokyo" or "Ho-Chi-Minh-City"
    const displayText = linkMatch[2].trim();           // e.g. "Tokyo, Japan"

    // 提取所有数字列（td 中的数字）
    const values = [];
    const numRegex = /<td[^>]*>\s*([\d,.]+)\s*<\/td>/gi;
    let nm;
    while ((nm = numRegex.exec(row)) !== null) {
      values.push(parseFloat(nm[1].replace(/,/g, "")));
    }

    results.push({ urlName, displayText, values });
  }
  return results;
}

/**
 * 将 Numbeo 排名表的 displayText (如 "Tokyo, Japan") 匹配到我方 city ID。
 */
function matchToOurCity(urlName, displayText) {
  // Step 1: 尝试 URL name 匹配
  const urlNorm = urlName.toLowerCase().replace(/%20/g, "-");
  if (NUMBEO_REVERSE_MAP[urlNorm] !== undefined) return NUMBEO_REVERSE_MAP[urlNorm];
  if (SLUG_TO_ID[urlNorm] !== undefined) return SLUG_TO_ID[urlNorm];

  // Step 2: 从 displayText 提取城市名
  // 格式: "City, Country" 或 "City, State, Country"
  const parts = displayText.split(",").map(s => s.trim());
  const cityName = parts[0];
  const normalizedCity = cityName.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // 去变音符 São → Sao
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");

  if (NUMBEO_REVERSE_MAP[normalizedCity] !== undefined) return NUMBEO_REVERSE_MAP[normalizedCity];
  if (SLUG_TO_ID[normalizedCity] !== undefined) return SLUG_TO_ID[normalizedCity];

  // Step 3: 包含 state 的情况 → "City-ST" (如 "San-Jose-CA")
  if (parts.length >= 3) {
    const withState = `${normalizedCity}-${parts[1].trim().toLowerCase()}`;
    if (NUMBEO_REVERSE_MAP[withState] !== undefined) return NUMBEO_REVERSE_MAP[withState];
    if (SLUG_TO_ID[withState] !== undefined) return SLUG_TO_ID[withState];
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════
// Section 7: HTML 解析器 — 城市生活成本页 + 房产页
// ═══════════════════════════════════════════════════════════════

/** 从一串含数字的 HTML 片段中提取价格 */
function parsePrice(str) {
  if (!str) return null;
  const cleaned = str.replace(/[$€£¥₹₩,\s]|&nbsp;/g, "").trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

/**
 * 从 cost-of-living 页面解析:
 *   - singlePersonMonthlyCost (不含房租)
 *   - rent1BRCenter (1居室市中心月租)
 *   - rent1BROutside
 *   - rent3BRCenter
 *   - pricePerSqmCenter (每平米购房价，市中心)
 *   - pricePerSqmOutside
 *   - mealInexpensive, cappuccino, localTransport, utilities, internetMonthly
 */
function parseCostPage(html) {
  const result = {};

  // === 月度成本摘要 ===
  // Pattern: "A single person estimated monthly costs are 1,234.56$ (without rent)"
  // 或 "A single person estimated monthly costs are $1,234.56 without rent"
  const costPatterns = [
    /single\s+person\s+estimated\s+monthly\s+costs\s+are\s+(?:\$|USD\s*)?([\d,]+(?:\.\d+)?)/i,
    /single\s+person\s+estimated\s+monthly\s+costs\s+are\s+([\d,]+(?:\.\d+)?)\s*(?:\$|USD)/i,
    /single\s+person[^.]*?([\d,]+(?:\.\d+)?)\s*(?:\$|USD)/i,
  ];
  for (const pat of costPatterns) {
    const m = html.match(pat);
    if (m) { result.singlePersonMonthlyCost = parsePrice(m[1]); break; }
  }

  // === 家庭月度成本 ===
  const familyPatterns = [
    /family\s+of\s+four\s+estimated\s+monthly\s+costs\s+are\s+(?:\$|USD\s*)?([\d,]+(?:\.\d+)?)/i,
    /family\s+of\s+four\s+estimated\s+monthly\s+costs\s+are\s+([\d,]+(?:\.\d+)?)\s*(?:\$|USD)/i,
  ];
  for (const pat of familyPatterns) {
    const m = html.match(pat);
    if (m) { result.familyMonthlyCost = parsePrice(m[1]); break; }
  }

  // === 具体价格项（通用提取器）===
  // Numbeo 表格行: <td>Label</td> <td class="priceValue"> 1,234.56 $ </td>
  function extractItem(label) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // Pattern 1: label 后跟 priceValue class
    const p1 = new RegExp(escaped + "[\\s\\S]{0,300}?class=\"priceValue\"[^>]*>\\s*([\\d,.\\s$€£¥]+)", "i");
    const m1 = html.match(p1);
    if (m1) return parsePrice(m1[1]);
    // Pattern 2: label 后跟 <td> 中的数字
    const p2 = new RegExp(escaped + "[\\s\\S]{0,200}?<td[^>]*>\\s*([\\d,.]+)", "i");
    const m2 = html.match(p2);
    if (m2) return parsePrice(m2[1]);
    return null;
  }

  // 租金
  result.rent1BRCenter = extractItem("Apartment \\(1 bedroom\\) in City Centre");
  result.rent1BROutside = extractItem("Apartment \\(1 bedroom\\) Outside of Centre");
  result.rent3BRCenter = extractItem("Apartment \\(3 bedrooms\\) in City Centre");

  // 房价（可能在同一页面也可能不在）
  result.pricePerSqmCenter = extractItem("Price per Square Meter to Buy Apartment in City Centre");
  result.pricePerSqmOutside = extractItem("Price per Square Meter to Buy Apartment Outside of Centre");

  // 常用参考价格
  result.mealInexpensive = extractItem("Meal, Inexpensive Restaurant");
  result.cappuccino = extractItem("Cappuccino \\(regular\\)");
  result.localTransport = extractItem("One-way Ticket \\(Local Transport\\)");
  result.utilities = extractItem("Basic \\(Electricity, Heating, Cooling, Water, Garbage\\)");
  result.internetMonthly = extractItem("Internet \\(60 Mbps");

  // 薪资
  result.avgMonthlyNetSalary = extractItem("Average Monthly Net Salary \\(After Tax\\)");

  return result;
}

/**
 * 从 property-investment 页面解析房价（作为 cost page 的补充）
 */
function parsePropertyPage(html) {
  const result = {};
  function extractItem(label) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const p1 = new RegExp(escaped + "[\\s\\S]{0,300}?class=\"priceValue\"[^>]*>\\s*([\\d,.\\s$€£¥]+)", "i");
    const m1 = html.match(p1);
    if (m1) return parsePrice(m1[1]);
    const p2 = new RegExp(escaped + "[\\s\\S]{0,200}?<td[^>]*>\\s*([\\d,.]+)", "i");
    const m2 = html.match(p2);
    if (m2) return parsePrice(m2[1]);
    return null;
  }
  result.pricePerSqmCenter = extractItem("Price per Square Meter to Buy Apartment in City Centre");
  result.pricePerSqmOutside = extractItem("Price per Square Meter to Buy Apartment Outside of Centre");
  return result;
}

// ═══════════════════════════════════════════════════════════════
// Section 8: Phase A — 排名页采集与解析
// ═══════════════════════════════════════════════════════════════

const RANKING_PAGES = [
  {
    key: "crime",
    url: "https://www.numbeo.com/crime/rankings_current.jsp",
    // 列: Rank, City, Crime Index, Safety Index
    fields: ["crimeIndex", "safetyIndex"],
  },
  {
    key: "cost",
    url: "https://www.numbeo.com/cost-of-living/rankings_current.jsp",
    // 列: Rank, City, CoL Index, Rent Index, CoL+Rent Index, Groceries, Restaurant, PurchasingPower
    fields: ["colIndex", "rentIndex", "colRentIndex", "groceriesIndex", "restaurantIndex", "purchasingPowerIndex"],
  },
  {
    key: "property",
    url: "https://www.numbeo.com/property-investment/rankings_current.jsp",
    // 列: Rank, City, Price to Income Ratio, Gross Rental Yield City Centre, ...
    fields: ["priceToIncomeRatio", "grossRentalYieldCenter", "priceToRentCenter", "grossRentalYieldOutside", "priceToRentOutside", "mortgagePctIncome", "affordabilityIndex"],
  },
  {
    key: "healthcare",
    url: "https://www.numbeo.com/health-care/rankings_current.jsp",
    // 列: Rank, City, Health Care Index, Health Care Exp. Index
    fields: ["healthcareIndex", "healthcareExpIndex"],
  },
  {
    key: "pollution",
    url: "https://www.numbeo.com/pollution/rankings_current.jsp",
    // 列: Rank, City, Pollution Index, Exp Pollution Index
    fields: ["pollutionIndex", "expPollutionIndex"],
  },
];

async function fetchRankings(checkpoint) {
  const rankingsDir = join(RAW_DIR, "rankings");
  ensureDir(rankingsDir);

  const allRankData = {}; // { cityId: { safetyIndex, colIndex, ... } }
  const unmatchedCities = [];

  for (const page of RANKING_PAGES) {
    console.log(`\n[${ts()}] 📊 排名页: ${page.key}`);
    const htmlPath = join(rankingsDir, `${page.key}.html`);

    let html;
    if (checkpoint.rankings[page.key]) {
      console.log(`  ↩ 已有缓存，跳过请求`);
      html = readFileSync(htmlPath, "utf-8");
    } else if (PARSE_ONLY) {
      if (existsSync(htmlPath)) {
        html = readFileSync(htmlPath, "utf-8");
      } else {
        console.log(`  ⏭ --parse-only 模式，无已存 HTML，跳过`);
        continue;
      }
    } else {
      const result = await fetchWithRetry(page.url);
      if (!result.ok) {
        console.error(`  ✗ 请求失败 (HTTP ${result.status})`);
        continue;
      }
      html = result.html;
      writeFileSync(htmlPath, html);
      checkpoint.rankings[page.key] = true;
      saveCheckpoint(checkpoint);
      console.log(`  ✓ 已保存 (${(html.length / 1024).toFixed(0)} KB)`);
      await sleep(REQUEST_DELAY_MS);
    }

    // 解析
    const rows = parseRankingTable(html);
    console.log(`  解析到 ${rows.length} 个城市`);

    let matched = 0;
    for (const row of rows) {
      const cityId = matchToOurCity(row.urlName, row.displayText);
      if (cityId === null) {
        // 不在我方 150 城市中 → 忽略（Numbeo 有 400+ 城市）
        continue;
      }
      matched++;
      if (!allRankData[cityId]) allRankData[cityId] = {};
      // 保存 Numbeo URL name（后续个页使用）
      allRankData[cityId]._numbeoUrlName = row.urlName;
      // 映射 values → fields
      for (let i = 0; i < page.fields.length && i < row.values.length; i++) {
        allRankData[cityId][page.fields[i]] = row.values[i];
      }
    }
    console.log(`  匹配到我方城市: ${matched}/150`);
  }

  // 统计未匹配城市
  const allIds = Object.values(SLUG_TO_ID);
  const matchedIds = new Set(Object.keys(allRankData).map(Number));
  const unmatched = allIds.filter(id => !matchedIds.has(id));
  if (unmatched.length > 0) {
    console.log(`\n⚠ 排名页未匹配到的城市 (${unmatched.length}):`);
    for (const id of unmatched) {
      console.log(`  ${pad(id)} ${ID_TO_SLUG[id]}`);
    }
  }

  return allRankData;
}

// ═══════════════════════════════════════════════════════════════
// Section 9: Phase B — 城市个页采集与解析
// ═══════════════════════════════════════════════════════════════

function getNumbeoUrls(cityId, slug, rankData) {
  // 优先使用排名页发现的 URL name
  const fromRanking = rankData[cityId]?._numbeoUrlName;
  // Override 优先
  const overrides = NUMBEO_NAME_OVERRIDES[cityId];
  // Default: 从 slug 转
  const defaultName = slugToNumbeo(slug);

  const candidates = [];
  if (fromRanking) candidates.push(fromRanking);
  if (overrides) candidates.push(...overrides);
  if (!candidates.includes(defaultName)) candidates.push(defaultName);

  return [...new Set(candidates)]; // 去重
}

async function fetchCityPages(checkpoint, rankData, citiesData) {
  const costDir = join(RAW_DIR, "cost");
  const propertyDir = join(RAW_DIR, "property");
  ensureDir(costDir);
  ensureDir(propertyDir);

  const cityResults = {}; // { cityId: { ...parsedData } }
  const allIds = Object.values(SLUG_TO_ID).sort((a, b) => a - b);
  const total = allIds.length;
  let completed = 0;
  const needPropertyFetch = []; // 城市 ID 列表：cost 页缺少房价数据

  console.log(`\n${"═".repeat(60)}`);
  console.log(`Phase B: 采集 ${total} 个城市的 cost-of-living 页面`);
  console.log(`预计用时: ${Math.ceil(total * (REQUEST_DELAY_MS / 1000 + 1.5) / 60)} 分钟`);
  console.log(`${"═".repeat(60)}\n`);

  for (const cityId of allIds) {
    completed++;
    const slug = ID_TO_SLUG[cityId];
    const cityObj = citiesData.find(c => c.id === cityId);
    const cityLabel = `[${pad(completed)}/${total}] ${pad(cityId)}-${slug}`;

    // 检查 checkpoint
    if (checkpoint.cities[cityId]?.cost) {
      const htmlPath = join(costDir, `${pad(cityId)}-${slug}.html`);
      if (existsSync(htmlPath)) {
        const html = readFileSync(htmlPath, "utf-8");
        cityResults[cityId] = parseCostPage(html);
        if (!cityResults[cityId].pricePerSqmCenter) needPropertyFetch.push(cityId);
        process.stdout.write(`  ${cityLabel} ↩ 缓存\r`);
        continue;
      }
    }

    if (PARSE_ONLY) {
      const htmlPath = join(costDir, `${pad(cityId)}-${slug}.html`);
      if (existsSync(htmlPath)) {
        const html = readFileSync(htmlPath, "utf-8");
        cityResults[cityId] = parseCostPage(html);
        if (!cityResults[cityId].pricePerSqmCenter) needPropertyFetch.push(cityId);
      }
      continue;
    }

    // 获取候选 URL names
    const candidates = getNumbeoUrls(cityId, slug, rankData);
    let success = false;

    // 获取英文国名用于 fallback URL
    const countryZh = cityObj?.country || "";
    const countryEn = COUNTRY_ZH_TO_NUMBEO[countryZh] || "";

    for (const name of candidates) {
      // 先试不带国家的 URL
      const url1 = `https://www.numbeo.com/cost-of-living/in/${encodeURIComponent(name)}?displayCurrency=USD`;
      process.stdout.write(`  ${cityLabel} → ${name} ...`);

      const r = await fetchWithRetry(url1);
      if (r.ok && r.html.length > 5000) {
        // 验证页面确实是这个城市的（检查 title 或 heading）
        const htmlPath = join(costDir, `${pad(cityId)}-${slug}.html`);
        writeFileSync(htmlPath, r.html);
        checkpoint.cities[cityId] = { ...checkpoint.cities[cityId], cost: true };
        saveCheckpoint(checkpoint);

        cityResults[cityId] = parseCostPage(r.html);
        if (!cityResults[cityId].pricePerSqmCenter) needPropertyFetch.push(cityId);

        console.log(` ✓ (${(r.html.length / 1024).toFixed(0)} KB)`);
        success = true;
        await sleep(REQUEST_DELAY_MS);
        break;
      }

      // 用 --Country 后缀重试
      if (countryEn && !name.includes("--")) {
        const url2 = `https://www.numbeo.com/cost-of-living/in/${encodeURIComponent(name)}--${countryEn}?displayCurrency=USD`;
        process.stdout.write(` ✗ → 用国名重试 ...`);
        const r2 = await fetchWithRetry(url2);
        if (r2.ok && r2.html.length > 5000) {
          const htmlPath = join(costDir, `${pad(cityId)}-${slug}.html`);
          writeFileSync(htmlPath, r2.html);
          checkpoint.cities[cityId] = { ...checkpoint.cities[cityId], cost: true };
          saveCheckpoint(checkpoint);

          cityResults[cityId] = parseCostPage(r2.html);
          if (!cityResults[cityId].pricePerSqmCenter) needPropertyFetch.push(cityId);

          console.log(` ✓`);
          success = true;
          await sleep(REQUEST_DELAY_MS);
          break;
        }
      }

      await sleep(REQUEST_DELAY_MS);
    }

    if (!success) {
      console.log(` ✗ 所有候选 URL 均失败`);
      cityResults[cityId] = { _error: "fetch failed" };
    }
  }

  // Phase C: 补充采集缺少房价的城市 property 页
  if (needPropertyFetch.length > 0 && !PARSE_ONLY) {
    console.log(`\n${"═".repeat(60)}`);
    console.log(`Phase C: 补充采集 ${needPropertyFetch.length} 个城市的 property 页`);
    console.log(`${"═".repeat(60)}\n`);

    for (let i = 0; i < needPropertyFetch.length; i++) {
      const cityId = needPropertyFetch[i];
      const slug = ID_TO_SLUG[cityId];
      const cityObj = citiesData.find(c => c.id === cityId);
      const cityLabel = `[${i + 1}/${needPropertyFetch.length}] ${pad(cityId)}-${slug}`;

      if (checkpoint.cities[cityId]?.property) {
        const htmlPath = join(propertyDir, `${pad(cityId)}-${slug}.html`);
        if (existsSync(htmlPath)) {
          const html = readFileSync(htmlPath, "utf-8");
          const propData = parsePropertyPage(html);
          if (propData.pricePerSqmCenter) {
            cityResults[cityId].pricePerSqmCenter = propData.pricePerSqmCenter;
            cityResults[cityId].pricePerSqmOutside = propData.pricePerSqmOutside;
          }
          continue;
        }
      }

      const candidates = getNumbeoUrls(cityId, slug, rankData);
      const countryZh = cityObj?.country || "";
      const countryEn = COUNTRY_ZH_TO_NUMBEO[countryZh] || "";

      let success = false;
      for (const name of candidates) {
        const url = `https://www.numbeo.com/property-investment/in/${encodeURIComponent(name)}?displayCurrency=USD`;
        process.stdout.write(`  ${cityLabel} property → ${name} ...`);

        const r = await fetchWithRetry(url);
        if (r.ok && r.html.length > 3000) {
          const htmlPath = join(propertyDir, `${pad(cityId)}-${slug}.html`);
          writeFileSync(htmlPath, r.html);
          checkpoint.cities[cityId] = { ...checkpoint.cities[cityId], property: true };
          saveCheckpoint(checkpoint);

          const propData = parsePropertyPage(r.html);
          if (propData.pricePerSqmCenter) {
            cityResults[cityId].pricePerSqmCenter = propData.pricePerSqmCenter;
            cityResults[cityId].pricePerSqmOutside = propData.pricePerSqmOutside;
          }

          console.log(` ✓`);
          success = true;
          await sleep(REQUEST_DELAY_MS);
          break;
        }

        if (countryEn && !name.includes("--")) {
          const url2 = `https://www.numbeo.com/property-investment/in/${encodeURIComponent(name)}--${countryEn}?displayCurrency=USD`;
          const r2 = await fetchWithRetry(url2);
          if (r2.ok && r2.html.length > 3000) {
            const htmlPath = join(propertyDir, `${pad(cityId)}-${slug}.html`);
            writeFileSync(htmlPath, r2.html);
            checkpoint.cities[cityId] = { ...checkpoint.cities[cityId], property: true };
            saveCheckpoint(checkpoint);

            const propData = parsePropertyPage(r2.html);
            if (propData.pricePerSqmCenter) {
              cityResults[cityId].pricePerSqmCenter = propData.pricePerSqmCenter;
              cityResults[cityId].pricePerSqmOutside = propData.pricePerSqmOutside;
            }

            console.log(` ✓`);
            success = true;
            await sleep(REQUEST_DELAY_MS);
            break;
          }
        }

        await sleep(REQUEST_DELAY_MS);
      }

      if (!success) {
        console.log(` ✗`);
      }
    }
  }

  return cityResults;
}

// ═══════════════════════════════════════════════════════════════
// Section 10: 对比分析 + 报告
// ═══════════════════════════════════════════════════════════════

function pctDiff(oldVal, newVal) {
  if (oldVal == null || newVal == null) return null;
  if (oldVal === 0) return newVal === 0 ? 0 : Infinity;
  return ((newVal - oldVal) / Math.abs(oldVal) * 100);
}

function compareData(rankData, cityPageData, citiesData) {
  const comparisons = [];

  for (const cityObj of citiesData) {
    const id = cityObj.id;
    const slug = ID_TO_SLUG[id];
    if (!slug) continue;

    const rank = rankData[id] || {};
    const page = cityPageData[id] || {};
    const row = {
      id,
      slug,
      name: cityObj.name,
      fields: {},
    };

    // numbeoSafetyIndex
    if (rank.safetyIndex != null) {
      const old = cityObj.numbeoSafetyIndex;
      const nw = Math.round(rank.safetyIndex * 10) / 10;
      row.fields.numbeoSafetyIndex = {
        old, new: nw, diff: pctDiff(old, nw), source: "ranking",
      };
    }

    // costModerate: 我方 = 含租金总月费
    // Numbeo: singlePersonMonthlyCost (不含租金) + rent1BRCenter
    if (page.singlePersonMonthlyCost != null && page.rent1BRCenter != null) {
      const numbeoCostModerate = Math.round(page.singlePersonMonthlyCost + page.rent1BRCenter);
      const old = cityObj.costModerate;
      row.fields.costModerate = {
        old, new: numbeoCostModerate, diff: pctDiff(old, numbeoCostModerate), source: "city-page",
        detail: `singlePerson=${page.singlePersonMonthlyCost} + rent1BR=${page.rent1BRCenter}`,
      };
    } else if (page.singlePersonMonthlyCost != null) {
      // 有月费但没有租金数据 → only 记录月费
      row.fields._singlePersonCostOnly = {
        old: cityObj.costModerate,
        numbeoNoRent: page.singlePersonMonthlyCost,
        source: "city-page (rent missing)",
      };
    }

    // monthlyRent → rent1BRCenter
    if (page.rent1BRCenter != null) {
      const nw = Math.round(page.rent1BRCenter);
      const old = cityObj.monthlyRent;
      row.fields.monthlyRent = {
        old, new: nw, diff: pctDiff(old, nw), source: "city-page",
      };
    }

    // housePrice → pricePerSqmCenter
    if (page.pricePerSqmCenter != null) {
      const nw = Math.round(page.pricePerSqmCenter);
      const old = cityObj.housePrice;
      row.fields.housePrice = {
        old, new: nw, diff: pctDiff(old, nw), source: "city-page",
      };
    }

    // costBudget: 目前 ≈ costModerate × 0.48，验证这个比例
    if (page.singlePersonMonthlyCost != null && page.rent1BROutside != null) {
      // Budget ≈ singlePersonCost × 0.7 (节俭) + rent outside centre
      const numbeoBudget = Math.round(page.singlePersonMonthlyCost * 0.7 + page.rent1BROutside);
      const old = cityObj.costBudget;
      row.fields.costBudget = {
        old, new: numbeoBudget, diff: pctDiff(old, numbeoBudget), source: "city-page (estimated)",
        detail: `singlePerson×0.7=${Math.round(page.singlePersonMonthlyCost * 0.7)} + rentOutside=${page.rent1BROutside}`,
      };
    }

    // Numbeo 的其他 index 作为交叉验证参考
    if (rank.colIndex != null) {
      row.fields._colIndex = { value: rank.colIndex, source: "ranking (reference)" };
    }
    if (rank.rentIndex != null) {
      row.fields._rentIndex = { value: rank.rentIndex, source: "ranking (reference)" };
    }
    if (rank.healthcareIndex != null) {
      row.fields._healthcareIndex = { value: rank.healthcareIndex, source: "ranking (reference)" };
    }
    if (rank.pollutionIndex != null) {
      row.fields._pollutionIndex = { value: rank.pollutionIndex, source: "ranking (reference)" };
    }

    // 额外参考: 薪资
    if (page.avgMonthlyNetSalary != null) {
      row.fields._avgMonthlyNetSalary = {
        value: page.avgMonthlyNetSalary,
        ourAverageIncome: cityObj.averageIncome,
        numbeoAnnualized: Math.round(page.avgMonthlyNetSalary * 12),
        diff: pctDiff(cityObj.averageIncome, page.avgMonthlyNetSalary * 12),
        source: "city-page (reference)",
      };
    }

    comparisons.push(row);
  }

  return comparisons;
}

function generateReport(comparisons) {
  const lines = [];
  const now = new Date().toISOString().slice(0, 19).replace("T", " ");
  lines.push(`# Numbeo 数据验证报告`);
  lines.push(`> 生成时间: ${now}`);
  lines.push(``);

  // 统计摘要
  const mainFields = ["numbeoSafetyIndex", "costModerate", "monthlyRent", "housePrice", "costBudget"];
  const stats = {};
  for (const f of mainFields) {
    stats[f] = { total: 0, matched: 0, minor: 0, major: 0, missing: 0 };
  }

  for (const row of comparisons) {
    for (const f of mainFields) {
      const data = row.fields[f];
      if (!data) { stats[f].missing++; continue; }
      stats[f].total++;
      const absDiff = Math.abs(data.diff ?? 100);
      if (absDiff <= 10) stats[f].matched++;
      else if (absDiff <= 30) stats[f].minor++;
      else stats[f].major++;
    }
  }

  lines.push(`## 总览`);
  lines.push(``);
  lines.push(`| 字段 | 有数据 | ≤10%匹配 | 10-30%偏离 | >30%严重偏离 | Numbeo缺失 |`);
  lines.push(`|------|--------|----------|-----------|------------|-----------|`);
  for (const f of mainFields) {
    const s = stats[f];
    lines.push(`| ${f} | ${s.total} | ${s.matched} | ${s.minor} | ${s.major} | ${s.missing} |`);
  }
  lines.push(``);

  // 详细：严重偏离 (>30%)
  lines.push(`## 严重偏离 (>30%)`);
  lines.push(``);
  let hasMajor = false;
  for (const row of comparisons) {
    for (const f of mainFields) {
      const data = row.fields[f];
      if (!data || data.diff == null) continue;
      if (Math.abs(data.diff) > 30) {
        hasMajor = true;
        const sign = data.diff > 0 ? "+" : "";
        lines.push(`- **${row.name}** (${row.slug}): \`${f}\` 旧=${data.old} → Numbeo=${data.new} (${sign}${data.diff.toFixed(1)}%)${data.detail ? ` [${data.detail}]` : ""}`);
      }
    }
  }
  if (!hasMajor) lines.push(`无严重偏离 🎉`);
  lines.push(``);

  // 详细：中等偏离 (10-30%)
  lines.push(`## 中等偏离 (10-30%)`);
  lines.push(``);
  let hasMinor = false;
  for (const row of comparisons) {
    for (const f of mainFields) {
      const data = row.fields[f];
      if (!data || data.diff == null) continue;
      if (Math.abs(data.diff) > 10 && Math.abs(data.diff) <= 30) {
        hasMinor = true;
        const sign = data.diff > 0 ? "+" : "";
        lines.push(`- ${row.name} (${row.slug}): \`${f}\` 旧=${data.old} → Numbeo=${data.new} (${sign}${data.diff.toFixed(1)}%)`);
      }
    }
  }
  if (!hasMinor) lines.push(`无中等偏离`);
  lines.push(``);

  // Numbeo 未覆盖城市
  lines.push(`## Numbeo 未覆盖城市`);
  lines.push(``);
  const uncovered = comparisons.filter(r => {
    return mainFields.every(f => !r.fields[f]);
  });
  if (uncovered.length > 0) {
    for (const r of uncovered) {
      lines.push(`- ${r.name} (${r.slug}, id=${r.id})`);
    }
  } else {
    lines.push(`所有 150 城市均有覆盖`);
  }
  lines.push(``);

  // 交叉验证: 薪资
  lines.push(`## 交叉验证: 平均薪资 (Numbeo vs 我方)`);
  lines.push(``);
  lines.push(`| 城市 | 我方年收入 | Numbeo年化 | 偏差 |`);
  lines.push(`|------|-----------|-----------|------|`);
  const salaryRows = comparisons.filter(r => r.fields._avgMonthlyNetSalary?.value);
  const bigSalaryDiffs = salaryRows.filter(r => Math.abs(r.fields._avgMonthlyNetSalary.diff || 0) > 30);
  for (const r of bigSalaryDiffs.slice(0, 30)) {
    const s = r.fields._avgMonthlyNetSalary;
    const sign = s.diff > 0 ? "+" : "";
    lines.push(`| ${r.name} | $${s.ourAverageIncome} | $${s.numbeoAnnualized} | ${sign}${(s.diff ?? 0).toFixed(0)}% |`);
  }
  if (bigSalaryDiffs.length > 30) {
    lines.push(`| ... | 共 ${bigSalaryDiffs.length} 个偏差 >30% | | |`);
  }
  lines.push(``);

  // 排名 Index 交叉参考
  lines.push(`## Numbeo 排名 Index 参考值`);
  lines.push(``);
  lines.push(`| 城市 | Safety | CoL-Idx | Rent-Idx | Healthcare | Pollution |`);
  lines.push(`|------|--------|---------|----------|-----------|-----------|`);
  for (const r of comparisons.slice(0, 30)) {
    const safety = r.fields.numbeoSafetyIndex?.new ?? "-";
    const col = r.fields._colIndex?.value ?? "-";
    const rent = r.fields._rentIndex?.value ?? "-";
    const hc = r.fields._healthcareIndex?.value ?? "-";
    const poll = r.fields._pollutionIndex?.value ?? "-";
    lines.push(`| ${r.name} | ${safety} | ${col} | ${rent} | ${hc} | ${poll} |`);
  }
  if (comparisons.length > 30) {
    lines.push(`| ... | 共 ${comparisons.length} 个城市 (完整数据见 fetched-data.json) | | | | |`);
  }
  lines.push(``);

  return lines.join("\n");
}

// ═══════════════════════════════════════════════════════════════
// Section 11: 主流程
// ═══════════════════════════════════════════════════════════════

async function main() {
  console.log("╔══════════════════════════════════════════════╗");
  console.log("║  WhichCity Numbeo 数据验证 v1.0             ║");
  console.log("╚══════════════════════════════════════════════╝");
  console.log(`模式: ${PARSE_ONLY ? "仅解析" : RANKINGS_ONLY ? "仅排名页" : "完整采集"}`);
  console.log(`请求间隔: ${REQUEST_DELAY_MS / 1000}s | 最大重试: ${MAX_RETRIES} | 超时: ${FETCH_TIMEOUT_MS / 1000}s`);
  console.log();

  // 创建目录
  ensureDir(AUDIT_DIR);
  ensureDir(RAW_DIR);

  // 加载源数据
  const citiesJson = JSON.parse(readFileSync(CITIES_PATH, "utf-8"));
  const citiesData = citiesJson.cities;
  console.log(`已加载 cities.json: ${citiesData.length} 个城市`);

  // 加载 checkpoint
  const checkpoint = loadCheckpoint();
  const completedRankings = Object.keys(checkpoint.rankings).length;
  const completedCities = Object.keys(checkpoint.cities).length;
  if (completedRankings > 0 || completedCities > 0) {
    console.log(`已有进度: ${completedRankings} 排名页, ${completedCities} 城市页`);
  }

  // Phase A: 排名页
  console.log(`\n${"═".repeat(60)}`);
  console.log(`Phase A: 排名页采集 (5 个请求)`);
  console.log(`${"═".repeat(60)}`);

  const rankData = await fetchRankings(checkpoint);
  const rankMatchCount = Object.keys(rankData).length;
  console.log(`\n✓ Phase A 完成: 匹配到 ${rankMatchCount}/150 个城市`);

  // 如果只跑 ranking，到这里结束
  let cityPageData = {};
  if (!RANKINGS_ONLY) {
    // Phase B + C: 城市页
    cityPageData = await fetchCityPages(checkpoint, rankData, citiesData);

    const costSuccess = Object.values(cityPageData).filter(d => !d._error).length;
    const priceSuccess = Object.values(cityPageData).filter(d => d.pricePerSqmCenter != null).length;
    console.log(`\n✓ Phase B+C 完成: ${costSuccess} 城市有成本数据, ${priceSuccess} 有房价数据`);
  }

  // Phase D: 对比分析
  console.log(`\n${"═".repeat(60)}`);
  console.log(`Phase D: 数据对比分析`);
  console.log(`${"═".repeat(60)}\n`);

  const comparisons = compareData(rankData, cityPageData, citiesData);

  // 保存结构化数据
  const fetchedData = {
    timestamp: new Date().toISOString(),
    rankings: rankData,
    cityPages: cityPageData,
  };
  writeFileSync(join(AUDIT_DIR, "fetched-data.json"), JSON.stringify(fetchedData, null, 2) + "\n");
  console.log(`✓ 已保存: numbeo-audit/fetched-data.json`);

  // 保存对比结果
  writeFileSync(join(AUDIT_DIR, "comparisons.json"), JSON.stringify(comparisons, null, 2) + "\n");
  console.log(`✓ 已保存: numbeo-audit/comparisons.json`);

  // 生成报告
  const report = generateReport(comparisons);
  writeFileSync(join(AUDIT_DIR, "report.md"), report);
  console.log(`✓ 已保存: numbeo-audit/report.md`);

  // 终端摘要
  console.log(`\n${"═".repeat(60)}`);
  console.log(`📋 快速摘要`);
  console.log(`${"═".repeat(60)}`);

  const mainFields = ["numbeoSafetyIndex", "costModerate", "monthlyRent", "housePrice"];
  for (const f of mainFields) {
    const fieldData = comparisons.filter(r => r.fields[f]?.diff != null);
    const major = fieldData.filter(r => Math.abs(r.fields[f].diff) > 30);
    const ok = fieldData.filter(r => Math.abs(r.fields[f].diff) <= 10);
    console.log(`  ${f.padEnd(22)} ${ok.length}/${fieldData.length} 匹配 (≤10%), ${major.length} 严重偏离 (>30%)`);
  }

  console.log(`\n完整报告: scripts/numbeo-audit/report.md`);
  console.log(`结构化数据: scripts/numbeo-audit/fetched-data.json`);
  console.log(`原始 HTML: scripts/numbeo-audit/raw/`);

  // 如果有严重偏离，列出前 5 个
  const allMajors = [];
  for (const row of comparisons) {
    for (const f of mainFields) {
      if (row.fields[f]?.diff != null && Math.abs(row.fields[f].diff) > 30) {
        allMajors.push({ city: row.name, field: f, old: row.fields[f].old, new: row.fields[f].new, diff: row.fields[f].diff });
      }
    }
  }
  if (allMajors.length > 0) {
    allMajors.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
    console.log(`\n⚠ 偏差最大的 ${Math.min(5, allMajors.length)} 项:`);
    for (const m of allMajors.slice(0, 5)) {
      const sign = m.diff > 0 ? "+" : "";
      console.log(`  ${m.city} ${m.field}: ${m.old} → ${m.new} (${sign}${m.diff.toFixed(0)}%)`);
    }
  }
}

main().catch(err => {
  console.error(`\n💥 致命错误: ${err.message}`);
  console.error(err.stack);
  process.exit(1);
});
