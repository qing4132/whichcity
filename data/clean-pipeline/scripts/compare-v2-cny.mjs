#!/usr/bin/env node
/** compare-v2-cny.mjs — compare clean-v2 vs 2a19d87 in CNY */
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const REPO = join(ROOT, "../..");

const fx = JSON.parse(readFileSync(join(REPO, "public/data/exchange-rates.json"), "utf-8"));
const clean = JSON.parse(readFileSync(join(ROOT, "output/clean-values-v2.json"), "utf-8"));
const prod = JSON.parse(readFileSync(join(REPO, "public/data/cities.json"), "utf-8"));
const CNY = fx.rates.CNY;
const prodBy = new Map();
for (const c of prod.cities ?? prod) prodBy.set(c.name, c);

const toCNY = (u) => (u == null ? null : Math.round(u * CNY));
const fmt = (n) => (n == null ? "     -" : ("¥" + n.toLocaleString())).padStart(10);
const pct = (a, b) => a == null || b == null || b === 0 ? "   -" : ((a - b) / b * 100 >= 0 ? "+" : "") + ((a - b) / b * 100).toFixed(0) + "%";

console.log(`汇率  1 USD = ${CNY} CNY\n`);

const pick = [
  "纽约", "旧金山", "洛杉矶", "华盛顿", "西雅图", "芝加哥", "迈阿密",
  "伦敦", "贝尔法斯特",
  "巴黎", "柏林", "米兰", "里斯本", "阿姆斯特丹", "马德里",
  "东京", "首尔", "新加坡", "香港",
  "多伦多", "温哥华", "蒙特利尔",
  "悉尼", "迪拜",
  "曼谷", "吉隆坡", "雅加达", "孟买", "胡志明市", "马尼拉",
  "墨西哥城", "圣保罗", "布宜诺斯艾利斯",
  "开普敦", "内罗毕", "开罗",
  "伊斯坦布尔", "特拉维夫",
];

console.log("════ costModerate 月消费 CNY（单身专业人士）════");
console.log("城市         |    clean-v2   |   2a19d87    |    Δ");
const dev = [];
for (const nm of pick) {
  const c = clean.cities.find((x) => x.name === nm);
  const p = prodBy.get(nm);
  if (!c || !p) continue;
  const d = p.costModerate ? (c.cost - p.costModerate) / p.costModerate : null;
  if (d != null) dev.push(Math.abs(d));
  console.log(`  ${nm.padEnd(12)} | ${fmt(toCNY(c.cost))}  | ${fmt(toCNY(p.costModerate))} | ${pct(c.cost, p.costModerate).padStart(6)}`);
}
dev.sort((a, b) => a - b);
console.log(`  [abs-dev across ${dev.length} cities: median=${(dev[Math.floor(dev.length / 2)] * 100).toFixed(1)}%, mean=${(dev.reduce((a, b) => a + b, 0) / dev.length * 100).toFixed(1)}%]`);

console.log("\n════ monthlyRent 1居室 CNY ════");
console.log("城市         |    clean-v2   |   2a19d87    |    Δ    | clean 源");
const rdev = [];
for (const nm of pick) {
  const c = clean.cities.find((x) => x.name === nm);
  const p = prodBy.get(nm);
  if (!c || !p) continue;
  const d = p.monthlyRent ? (c.rent - p.monthlyRent) / p.monthlyRent : null;
  if (d != null) rdev.push(Math.abs(d));
  console.log(`  ${nm.padEnd(12)} | ${fmt(toCNY(c.rent))}  | ${fmt(toCNY(p.monthlyRent))} | ${pct(c.rent, p.monthlyRent).padStart(6)}  | ${c.rentSource}`);
}
rdev.sort((a, b) => a - b);
console.log(`  [abs-dev across ${rdev.length} cities: median=${(rdev[Math.floor(rdev.length / 2)] * 100).toFixed(1)}%, mean=${(rdev.reduce((a, b) => a + b, 0) / rdev.length * 100).toFixed(1)}%]`);

// Global stats (all 141)
console.log("\n════ 全局 141 城统计 ════");
const gCost = [], gRent = [];
for (const c of clean.cities) {
  const p = prodBy.get(c.name);
  if (!p) continue;
  if (c.cost != null && p.costModerate) gCost.push(Math.abs((c.cost - p.costModerate) / p.costModerate));
  if (c.rent != null && p.monthlyRent) gRent.push(Math.abs((c.rent - p.monthlyRent) / p.monthlyRent));
}
gCost.sort((a, b) => a - b); gRent.sort((a, b) => a - b);
const bucket = (arr) => {
  const b = { "<10%": 0, "10-25%": 0, "25-50%": 0, "50-100%": 0, ">100%": 0 };
  for (const v of arr) {
    if (v < 0.1) b["<10%"]++;
    else if (v < 0.25) b["10-25%"]++;
    else if (v < 0.5) b["25-50%"]++;
    else if (v < 1.0) b["50-100%"]++;
    else b[">100%"]++;
  }
  return b;
};
console.log(`cost  n=${gCost.length} median=${(gCost[Math.floor(gCost.length / 2)] * 100).toFixed(1)}% mean=${(gCost.reduce((a, b) => a + b, 0) / gCost.length * 100).toFixed(1)}%`);
console.log("      buckets:", bucket(gCost));
console.log(`rent  n=${gRent.length} median=${(gRent[Math.floor(gRent.length / 2)] * 100).toFixed(1)}% mean=${(gRent.reduce((a, b) => a + b, 0) / gRent.length * 100).toFixed(1)}%`);
console.log("      buckets:", bucket(gRent));
