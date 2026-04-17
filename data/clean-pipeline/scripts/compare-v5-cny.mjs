#!/usr/bin/env node
/** compare-v5-cny.mjs — v5 deviation + 北京 sanity + governance sample */
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const REPO = join(ROOT, "../..");
const fx = JSON.parse(readFileSync(join(REPO, "public/data/exchange-rates.json"), "utf-8"));
const clean = JSON.parse(readFileSync(join(ROOT, "output/clean-values-v5.json"), "utf-8"));
const prod = JSON.parse(readFileSync(join(REPO, "public/data/cities.json"), "utf-8"));
const CNY = fx.rates.CNY;
const prodBy = new Map(); for (const c of prod.cities ?? prod) prodBy.set(c.name, c);
const toCNY = (u) => u==null?null:Math.round(u*CNY);
const fmt = (n) => (n==null?"     -":("¥"+n.toLocaleString())).padStart(10);
const pct = (a,b) => (a==null||b==null||b===0)?"   -":((a-b)/b*100>=0?"+":"")+((a-b)/b*100).toFixed(0)+"%";

const pick = ["北京","上海","深圳","纽约","旧金山","洛杉矶","华盛顿","西雅图","芝加哥","伦敦","巴黎","柏林","米兰","里斯本","阿姆斯特丹","马德里","罗马","维也纳","哥本哈根","斯德哥尔摩","苏黎世","东京","首尔","新加坡","香港","台北","多伦多","温哥华","悉尼","迪拜","曼谷","孟买","墨西哥城","圣保罗","开普敦","内罗毕","开罗","伊斯坦布尔","特拉维夫"];

console.log(`汇率 1 USD = ${CNY} CNY    clean=${clean.meta.formulaVersion}\n`);
console.log("════ costModerate 月消费 CNY ════");
console.log("城市         |   clean-v5    |   2a19d87   |   Δ    | signals");
const dev = [];
for (const nm of pick) {
  const c = clean.cities.find(x=>x.name===nm); const p = prodBy.get(nm);
  if (!c || !p) continue;
  const d = p.costModerate ? (c.cost-p.costModerate)/p.costModerate : null;
  if (d != null) dev.push(Math.abs(d));
  const marker = nm==="北京"?" ★":"";
  console.log(`  ${nm.padEnd(12)} | ${fmt(toCNY(c.cost))}  | ${fmt(toCNY(p.costModerate))} | ${pct(c.cost,p.costModerate).padStart(6)}  | ${c._inputs.signalsUsed}${marker}`);
}
dev.sort((a,b)=>a-b);
console.log(`  [sample median |Δ|=${(dev[Math.floor(dev.length/2)]*100).toFixed(1)}% mean=${(dev.reduce((a,b)=>a+b,0)/dev.length*100).toFixed(1)}%]`);

console.log("\n════ 全局 141 城 ════");
const gC=[],gR=[];
for (const c of clean.cities) {
  const p = prodBy.get(c.name); if (!p) continue;
  if (c.cost!=null && p.costModerate) gC.push(Math.abs((c.cost-p.costModerate)/p.costModerate));
  if (c.rent!=null && p.monthlyRent) gR.push(Math.abs((c.rent-p.monthlyRent)/p.monthlyRent));
}
gC.sort((a,b)=>a-b); gR.sort((a,b)=>a-b);
console.log(`cost n=${gC.length} median=${(gC[Math.floor(gC.length/2)]*100).toFixed(1)}% mean=${(gC.reduce((a,b)=>a+b,0)/gC.length*100).toFixed(1)}%`);
console.log(`rent n=${gR.length} median=${(gR[Math.floor(gR.length/2)]*100).toFixed(1)}% mean=${(gR.reduce((a,b)=>a+b,0)/gR.length*100).toFixed(1)}%`);

console.log("\n════ 版本演进 median|Δ| ════");
console.log("              cost    rent");
for (const [v, f] of [["v1","clean-values.json"],["v2","clean-values-v2.json"],["v3","clean-values-v3.json"],["v4","clean-values-v4.json"],["v5","clean-values-v5.json"]]) {
  try {
    const d = JSON.parse(readFileSync(join(ROOT,"output",f),"utf-8"));
    const cc=[],rr=[];
    for (const c of d.cities) { const p=prodBy.get(c.name); if (!p) continue;
      if (c.cost!=null && p.costModerate) cc.push(Math.abs((c.cost-p.costModerate)/p.costModerate));
      if (c.rent!=null && p.monthlyRent) rr.push(Math.abs((c.rent-p.monthlyRent)/p.monthlyRent));
    }
    cc.sort((a,b)=>a-b); rr.sort((a,b)=>a-b);
    console.log(`  ${v.padEnd(4)}       ${(cc[Math.floor(cc.length/2)]*100).toFixed(1).padStart(5)}%  ${(rr[Math.floor(rr.length/2)]*100).toFixed(1).padStart(5)}%`);
  } catch {}
}

// Governance sample
console.log("\n════ Freedom House 治理指标 (sample) ════");
console.log("城市        | country        | FH总分 |  status | PR / CL");
for (const nm of ["北京","新加坡","香港","纽约","伦敦","巴黎","东京","首尔","迪拜","伊斯坦布尔","开罗"]) {
  const c = clean.cities.find(x=>x.name===nm); if (!c || !c.governance) { console.log(`  ${nm.padEnd(10)} | (no FH data)`); continue; }
  const marker = nm==="北京"?" ★":"";
  console.log(`  ${nm.padEnd(10)} | ${c.country.padEnd(14)} |  ${String(c.governance.fhTotal).padStart(3)}  |   ${c.governance.fhStatus.padEnd(3)}  | ${String(c.governance.fhPR).padStart(2)} / ${String(c.governance.fhCL).padStart(2)}${marker}`);
}
