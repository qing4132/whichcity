#!/usr/bin/env node
/** compare-v6-anchors.mjs — cross-validate v6 anchors vs production baseline. */
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const REPO = join(ROOT, "../..");

const v6 = JSON.parse(readFileSync(join(ROOT, "output/clean-values-v6.json"), "utf-8"));
const prod = JSON.parse(readFileSync(join(REPO, "public/data/cities.json"), "utf-8"));
const sot = JSON.parse(readFileSync(join(REPO, "data/cities-source.json"), "utf-8"));
const fx = JSON.parse(readFileSync(join(REPO, "public/data/exchange-rates.json"), "utf-8"));

const prodMap = new Map(prod.cities.map(c => [c.id, c]));
const sotMap = new Map(sot.cities.map(c => [c.id, c]));
const CNY = fx.rates.CNY ?? 7.1;

const toCNY = (usd) => Math.round(usd * CNY);
const pad = (s, n) => String(s).padEnd(n);
const lpad = (s, n) => String(s).padStart(n);

// ==== Section 1: H1B vs production salaryData ====
console.log("=".repeat(110));
console.log("1. H1B LCA FY2026 Q1 — 美国城市 p50 年薪 (USD) vs 生产 salary (软件开发)");
console.log("=".repeat(110));
console.log(`${pad("City",14)} ${pad("MSA",42)} ${lpad("H1B n",6)} ${lpad("H1B p50",9)} ${lpad("prod SW",9)} ${lpad("Δ%",7)}`);
const us = v6.cities.filter(c => c.h1bAnchors);
for (const c of us) {
  const sd = c.h1bAnchors.professions.softwareDeveloper;
  if (!sd) continue;
  const p = prodMap.get(c.id);
  // Production professions = { profName: annual USD (number) }
  const prodProfs = p?.professions || {};
  const prodAnnual = prodProfs["软件工程师"] ?? null;
  const delta = prodAnnual ? ((sd.p50 - prodAnnual) / prodAnnual * 100).toFixed(1) : "—";
  console.log(
    `${pad(c.name, 14)} ${pad(c.h1bAnchors.msa, 42)} ${lpad(sd.n, 6)} $${lpad(sd.p50.toLocaleString(), 7)} ` +
    `$${lpad((prodAnnual ?? 0).toLocaleString(), 7)} ${lpad(delta, 6)}%`
  );
}

// ==== Section 2: NBS CN housing drift ====
console.log("\n" + "=".repeat(110));
console.log("2. NBS 70 城 2026-03 vs 生产 monthlyRent — 新房同比 (yoy=上年同月) 偏离");
console.log("=".repeat(110));
console.log(`${pad("City",8)} ${lpad("新房 m2m",10)} ${lpad("新房 yoy",10)} ${lpad("新房 Q1avg",10)} ${lpad("二手 yoy",10)} ${lpad("prod rent ¥",14)} 解读`);
const cn = v6.cities.filter(c => c.nbsHouseIdx);
for (const c of cn) {
  const n = c.nbsHouseIdx.newHome;
  const s = c.nbsHouseIdx.secondHand;
  const p = prodMap.get(c.id);
  const rent = p?.monthlyRent ? `$${p.monthlyRent.toLocaleString()}` : "—";
  const drift = s.yoy < 95 ? "二手跌超 5%" : s.yoy < 97 ? "二手跌 3-5%" : "较稳";
  const star = c.name === "北京" ? " ★" : "";
  console.log(
    `${pad(c.name + star, 8)} ${lpad(n.m2m, 10)} ${lpad(n.yoy, 10)} ${lpad(n.q1avg, 10)} ` +
    `${lpad(s.yoy, 10)} ${lpad(rent, 14)}  ${drift}`
  );
}

// ==== Section 3: UBS GREBI bubble risk ====
console.log("\n" + "=".repeat(110));
console.log("3. UBS GREBI 2025 — 泡沫风险 (得分高=泡沫大) + 实际房价/租金年化涨幅 (YoY/10Y, %)");
console.log("=".repeat(110));
console.log(`${pad("City",12)} ${lpad("rank",5)} ${lpad("score",7)} ${lpad("risk",10)} ${lpad("priceYoY",10)} ${lpad("price10Y",10)} ${lpad("rentYoY",10)} ${lpad("rent10Y",10)}`);
const ubs = v6.cities.filter(c => c.ubsBubbleRisk).sort((a, b) => a.ubsBubbleRisk.rank - b.ubsBubbleRisk.rank);
for (const c of ubs) {
  const u = c.ubsBubbleRisk;
  console.log(
    `${pad(c.name, 12)} ${lpad(u.rank, 5)} ${lpad(u.score.toFixed(2), 7)} ${lpad(u.risk, 10)} ` +
    `${lpad(u.realPriceChgYoY.toFixed(1), 9)}% ${lpad(u.realPriceChg10Y.toFixed(1), 9)}% ` +
    `${lpad(u.realRentChgYoY.toFixed(1), 9)}% ${lpad(u.realRentChg10Y.toFixed(1), 9)}%`
  );
}

// ==== Summary ====
console.log("\n" + "=".repeat(110));
console.log("Summary");
console.log("=".repeat(110));
console.log(`H1B coverage:  ${us.length} US cities × 15 professions`);
console.log(`NBS coverage:  ${cn.length} CN cities (70-city index lag 1mo)`);
console.log(`UBS coverage:  ${ubs.length} global cities (bubble risk)`);
