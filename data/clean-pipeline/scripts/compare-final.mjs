#!/usr/bin/env node
/** compare-final.mjs — v1→v7 演进总对比 + 北京 ★ 完整画像 + 建议 */
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const REPO = join(ROOT, "../..");
const fx   = JSON.parse(readFileSync(join(REPO, "public/data/exchange-rates.json"), "utf-8"));
const prod = JSON.parse(readFileSync(join(REPO, "public/data/cities.json"), "utf-8"));
const v7   = JSON.parse(readFileSync(join(ROOT, "output/clean-values-v7.json"), "utf-8"));
const CNY = fx.rates.CNY;
const prodBy = new Map((prod.cities ?? prod).map(c => [c.name, c]));
const toCNY = (u) => u == null ? null : Math.round(u * CNY);
const fmt = (n) => (n == null ? "     -" : ("¥" + n.toLocaleString())).padStart(10);
const pct = (a, b) => (a == null || b == null || b === 0) ? "   -  " : ((a - b) / b * 100 >= 0 ? "+" : "") + ((a - b) / b * 100).toFixed(0) + "%";
const absPct = (a, b) => b && b !== 0 && a != null ? Math.abs((a - b) / b) : null;

console.log("=".repeat(110));
console.log(`FINAL REPORT — clean-pipeline v7 vs production (HEAD=2a19d87)`);
console.log(`汇率 1 USD = ${CNY} CNY    version=${v7.meta.formulaVersion}`);
console.log("=".repeat(110));

// ===== 1. 版本演进 =====
console.log("\n【1】版本演进 median |Δ| 和 mean |Δ|（all cities, CNY）");
console.log(`                     cost              rent            说明`);
console.log(`                 median  mean      median  mean`);
const files = [
  ["v1 (base)",     "clean-values.json"],
  ["v2 (+PLI/Zillow)", "clean-values-v2.json"],
  ["v3 (+Airbnb)",  "clean-values-v3.json"],
  ["v4 (+Digital)", "clean-values-v4.json"],
  ["v5 (+BigMac+iPhone)", "clean-values-v5.json"],
  ["v7 (final)",    "clean-values-v7.json"],
];
for (const [tag, f] of files) {
  try {
    const d = JSON.parse(readFileSync(join(ROOT, "output", f), "utf-8"));
    const cc = [], rr = [];
    for (const c of d.cities) {
      const p = prodBy.get(c.name); if (!p) continue;
      const dc = absPct(c.cost, p.costModerate); if (dc != null) cc.push(dc);
      const dr = absPct(c.rent, p.monthlyRent); if (dr != null) rr.push(dr);
    }
    cc.sort((a,b)=>a-b); rr.sort((a,b)=>a-b);
    const med = (a) => a.length ? (a[Math.floor(a.length/2)]*100).toFixed(1)+"%" : "—";
    const mn = (a) => a.length ? (a.reduce((s,v)=>s+v,0)/a.length*100).toFixed(1)+"%" : "—";
    console.log(`  ${tag.padEnd(20)}  ${med(cc).padStart(5)}  ${mn(cc).padStart(5)}      ${med(rr).padStart(5)}  ${mn(rr).padStart(5)}     n_cost=${cc.length} n_rent=${rr.length}`);
  } catch (e) { console.log(`  ${tag.padEnd(20)}  (not found)`); }
}

// ===== 2. 北京 ★ 完整画像 =====
console.log("\n【2】北京 ★ — 完整多源画像");
const bj = v7.cities.find(c => c.name === "北京");
const pBj = prodBy.get("北京");
console.log(`  生产基线 (2a19d87):  costModerate=${toCNY(pBj.costModerate)} CNY  monthlyRent=$${pBj.monthlyRent}  (约 ¥${toCNY(pBj.monthlyRent)})`);
console.log(`  v7 cost:             ¥${toCNY(bj.cost)}  (${pct(bj.cost, pBj.costModerate)})`);
console.log(`    formula:           ${bj.costSource}`);
console.log(`  v7 rent:             $${bj.rent} → ¥${toCNY(bj.rent)}  (${pct(bj.rent, pBj.monthlyRent)})`);
console.log(`    source:            ${bj.rentSource}`);
console.log(`  NBS 2026-03:         新房 yoy=${bj.nbsHouseIdx.newHome.yoy}  Q1avg=${bj.nbsHouseIdx.newHome.q1avg}`);
console.log(`                       二手 yoy=${bj.nbsHouseIdx.secondHand.yoy} ← 比新房跌更多`);
console.log(`  Freedom House:       ${bj.governance.fhTotal}/100 (${bj.governance.fhStatus}) PR=${bj.governance.fhPR} CL=${bj.governance.fhCL}`);
console.log(`  OSM 设施密度:        ${bj.osmQuality.score}/100 (食${bj.osmQuality.normalized.food}·医${bj.osmQuality.normalized.health}·学${bj.osmQuality.normalized.edu}·文${bj.osmQuality.normalized.culture}·交${bj.osmQuality.normalized.transit}·游${bj.osmQuality.normalized.leisure})`);
console.log(`                       注: OSM 中国覆盖偏低，非真实便利度`);
console.log(`  UBS GREBI:           (未覆盖，UBS 21 城不含北京)`);
console.log(`  H1B salary:          (N/A - 非美国城市)`);

// ===== 3. H1B 对 US 软件工程师工资校准 =====
console.log("\n【3】H1B FY2026 Q1 vs 生产软件工程师年薪 (USD)");
console.log(`${"City".padEnd(14)} ${"H1B n".padStart(6)} ${"H1B p50".padStart(10)} ${"prod".padStart(10)} ${"Δ%".padStart(7)} 评估`);
const assess = (d) => Math.abs(d) < 5 ? "✓" : Math.abs(d) < 10 ? "○" : d > 0 ? "生产偏低" : "生产偏高";
for (const c of v7.cities.filter(c => c.h1bAnchors?.professions.softwareDeveloper)) {
  const sd = c.h1bAnchors.professions.softwareDeveloper;
  const p = prodBy.get(c.name);
  const prodAnnual = p?.professions?.["软件工程师"];
  if (!prodAnnual) continue;
  const d = (sd.p50 - prodAnnual) / prodAnnual * 100;
  console.log(`  ${c.name.padEnd(12)}  ${String(sd.n).padStart(6)}  $${sd.p50.toLocaleString().padStart(8)}  $${prodAnnual.toLocaleString().padStart(8)}  ${(d>=0?"+":"")+d.toFixed(1)+"%"}  ${assess(d)}`);
}

// ===== 4. NBS 中国 7 城 rent 漂移修正 =====
console.log("\n【4】NBS 2026-03 rent 漂移修正 (prod baseline × NBS 二手 yoy)");
console.log(`${"City".padEnd(8)} ${"prod rent".padStart(11)} ${"NBS 2手 yoy".padStart(14)} ${"v7 rent".padStart(10)}  累计漂移`);
for (const c of v7.cities.filter(c => c.rentSource?.startsWith("prod-USD"))) {
  const p = prodBy.get(c.name);
  const yoy = c.nbsHouseIdx.secondHand.yoy;
  console.log(`  ${c.name.padEnd(6)}  $${p.monthlyRent.toString().padStart(5)}       ${yoy}%         $${c.rent.toString().padStart(5)}    ${(yoy-100).toFixed(1)}%`);
}

// ===== 5. UBS 泡沫警示 =====
console.log("\n【5】UBS GREBI 2025 泡沫风险警示（按 bubble score 降序）");
console.log(`${"City".padEnd(14)} ${"risk".padStart(10)} ${"score".padStart(8)} ${"10Y 实际价涨幅".padStart(16)} 建议标签`);
for (const c of [...v7.cities.filter(c => c.ubsBubble)].sort((a,b)=>b.ubsBubble.score-a.ubsBubble.score).slice(0,10)) {
  const u = c.ubsBubble;
  const tag = u.risk === "high" ? "🔴 泡沫警示" : u.risk === "elevated" ? "🟠 关注" : u.risk === "moderate" ? "🟡 中性" : "🟢 健康";
  console.log(`  ${c.name.padEnd(12)}  ${u.risk.padStart(10)}  ${u.score.toFixed(2).padStart(7)}   ${(u.realPriceChg10Y>=0?"+":"")+u.realPriceChg10Y.toFixed(1)+"%/yr"}        ${tag}`);
}

// ===== 6. 全局覆盖率 =====
console.log("\n【6】v7 覆盖率总览");
const s = { cost:0, rentOfficial:0, rentMarket:0, rentFormula:0, rentNbs:0, h1b:0, nbs:0, ubs:0, osm:0, fh:0 };
for (const c of v7.cities) {
  if (c.cost != null) s.cost++;
  if (c.rentSource?.match(/ZORI|ONS|StatCan/)) s.rentOfficial++;
  else if (c.rentSource?.startsWith("InsideAirbnb")) s.rentMarket++;
  else if (c.rentSource?.startsWith("prod-USD")) s.rentNbs++;
  else if (c.rentSource?.startsWith("cost×")) s.rentFormula++;
  if (c.h1bAnchors) s.h1b++;
  if (c.nbsHouseIdx) s.nbs++;
  if (c.ubsBubble) s.ubs++;
  if (c.osmQuality) s.osm++;
  if (c.governance) s.fh++;
}
console.log(`  cost:      ${s.cost}/151`);
console.log(`  rent:      官方 (Zillow/ONS/StatCan) = ${s.rentOfficial}    市场 (InsideAirbnb) = ${s.rentMarket}`);
console.log(`             NBS 漂移修正 (中国)       = ${s.rentNbs}    formula 兜底              = ${s.rentFormula}`);
console.log(`  metadata:  FH=${s.fh}   H1B=${s.h1b}   NBS=${s.nbs}   UBS=${s.ubs}   OSM=${s.osm}`);

// ===== 7. 选定核心城市对比 =====
console.log("\n【7】核心 29 城 v7 vs 2a19d87 对比（CNY）");
const pick = ["北京","上海","深圳","纽约","旧金山","洛杉矶","华盛顿","西雅图","芝加哥","伦敦","巴黎","柏林","米兰","阿姆斯特丹","马德里","东京","首尔","新加坡","香港","多伦多","温哥华","悉尼","迪拜","曼谷","孟买","墨西哥城","开普敦","台北","特拉维夫"];
console.log(`${"城市".padEnd(10)}  ${"v7 cost ¥".padStart(12)}  ${"prod cost ¥".padStart(13)}  ${"Δ%".padStart(6)}  ${"v7 rent ¥".padStart(11)}  ${"prod rent ¥".padStart(12)}  ${"Δ%".padStart(6)}`);
const devC = [], devR = [];
for (const nm of pick) {
  const c = v7.cities.find(x => x.name === nm); const p = prodBy.get(nm);
  if (!c || !p) continue;
  const dc = absPct(c.cost, p.costModerate); if (dc != null) devC.push(dc);
  const dr = absPct(c.rent, p.monthlyRent); if (dr != null) devR.push(dr);
  const mark = nm === "北京" ? " ★" : "";
  const prodRentCNY = toCNY(p.monthlyRent);
  const v7RentCNY = toCNY(c.rent);
  console.log(`  ${(nm+mark).padEnd(10)}  ${fmt(toCNY(c.cost))}  ${fmt(toCNY(p.costModerate))}  ${pct(c.cost,p.costModerate).padStart(6)}  ${fmt(v7RentCNY)}  ${fmt(prodRentCNY)}  ${pct(c.rent,p.monthlyRent).padStart(6)}`);
}
devC.sort((a,b)=>a-b); devR.sort((a,b)=>a-b);
console.log(`\n  核心 29 城: cost median |Δ| = ${(devC[Math.floor(devC.length/2)]*100).toFixed(1)}%    rent median |Δ| = ${(devR[Math.floor(devR.length/2)]*100).toFixed(1)}%`);
