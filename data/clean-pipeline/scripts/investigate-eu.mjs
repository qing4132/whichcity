#!/usr/bin/env node
/** Investigate Europe cost bias: v7 vs prod, plus available HICP/PLI evidence. */
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const REPO = join(ROOT, "../..");
const v7   = JSON.parse(readFileSync(join(ROOT, "output/clean-values-v7.json"), "utf-8"));
const prod = JSON.parse(readFileSync(join(REPO, "public/data/cities.json"), "utf-8"));
const pby  = new Map((prod.cities ?? prod).map(c => [c.name, c]));

const EU = new Set(["德国","法国","意大利","西班牙","葡萄牙","荷兰","比利时","瑞士","奥地利","瑞典","挪威","丹麦","芬兰","冰岛","爱尔兰","希腊","波兰","捷克","匈牙利","罗马尼亚","克罗地亚","斯洛文尼亚","斯洛伐克","立陶宛","拉脱维亚","爱沙尼亚","卢森堡","马耳他","塞浦路斯","保加利亚","英国"]);

const rows = [];
for (const c of v7.cities) {
  if (!EU.has(c.country)) continue;
  const p = pby.get(c.name); if (!p || c.cost == null) continue;
  rows.push({ name: c.name, country: c.country, v7: c.cost, prod: p.costModerate, d: (c.cost - p.costModerate) / p.costModerate * 100 });
}
rows.sort((a,b) => b.d - a.d);
console.log(`Europe cost v7 vs prod (${rows.length} cities, sorted by Δ%):\n`);
console.log("City".padEnd(14) + "Country".padEnd(10) + "v7".padStart(8) + "prod".padStart(8) + "Δ%".padStart(8));
for (const r of rows) {
  console.log(r.name.padEnd(14) + r.country.padEnd(10) + ("$"+r.v7).padStart(8) + ("$"+r.prod).padStart(8) + ((r.d>=0?"+":"") + r.d.toFixed(0) + "%").padStart(8));
}
const ds = rows.map(r => r.d).sort((a,b) => a-b);
const med = ds[Math.floor(ds.length/2)];
const mean = ds.reduce((s,v)=>s+v,0)/ds.length;
console.log(`\nmedian Δ = ${med.toFixed(1)}%   mean Δ = ${mean.toFixed(1)}%   (positive = v7 higher than prod)`);
const over25 = rows.filter(r => r.d > 25).length;
const over50 = rows.filter(r => r.d > 50).length;
const under = rows.filter(r => r.d < -10).length;
console.log(`v7 > prod by >25%: ${over25} cities    by >50%: ${over50} cities    v7 < prod by >10%: ${under} cities`);
