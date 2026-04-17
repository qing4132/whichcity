#!/usr/bin/env node
/** Emit final closure artifacts: per-city confidence CSV + summary stats. */
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const REPO = join(ROOT, "../..");
const v8   = JSON.parse(readFileSync(join(ROOT, "output/clean-values-v8.json"), "utf-8"));
const prod = JSON.parse(readFileSync(join(REPO, "public/data/cities.json"), "utf-8"));
const fx   = JSON.parse(readFileSync(join(REPO, "public/data/exchange-rates.json"), "utf-8"));
const prodBy = new Map((prod.cities ?? prod).map(c => [c.name, c]));

// Per-city manifest CSV
const hdr = ["name","country","tier","display","cost_v8","cost_prod","cost_delta%","rent_v8","rent_prod","rent_delta%","cost_source","rent_source","salary_override","fh","ubs_risk","osm"];
const rows = [hdr.join(",")];
for (const c of v8.cities) {
  const p = prodBy.get(c.name);
  const dCost = (p?.costModerate && c.cost) ? ((c.cost-p.costModerate)/p.costModerate*100).toFixed(1) : "";
  const dRent = (p?.monthlyRent && c.rent) ? ((c.rent-p.monthlyRent)/p.monthlyRent*100).toFixed(1) : "";
  rows.push([
    c.name, c.country, c.confidence, c.displayRecommendation,
    c.cost ?? "", p?.costModerate ?? "", dCost,
    c.rent ?? "", p?.monthlyRent ?? "", dRent,
    (c.costSource||"").replace(/,/g,";"),
    (c.rentSource||"").replace(/,/g,";"),
    c.salaryOverride ? `${c.salaryOverride.prodValue}→${c.salaryOverride.newValue}(${c.salaryOverride.delta}%)` : "",
    c.governance?.fhTotal ?? "",
    c.ubsBubble?.risk ?? "",
    c.osmQuality?.score ?? "",
  ].join(","));
}
writeFileSync(join(ROOT, "output/city-manifest-v8.csv"), rows.join("\n"));
console.log(`✓ output/city-manifest-v8.csv (${rows.length-1} rows)`);

// Region × tier breakdown
const regionMap = {
  "美加": ["美国","加拿大"],
  "西欧/北欧": ["英国","法国","德国","荷兰","比利时","瑞士","奥地利","爱尔兰","卢森堡","瑞典","挪威","丹麦","芬兰","冰岛","意大利","西班牙","葡萄牙","希腊"],
  "中东欧": ["波兰","捷克","匈牙利","罗马尼亚","保加利亚","克罗地亚","斯洛文尼亚","斯洛伐克","立陶宛","拉脱维亚","爱沙尼亚","塞浦路斯","乌克兰","俄罗斯"],
  "东亚": ["日本","韩国","中国","中国香港","台湾","蒙古"],
  "东南亚": ["新加坡","马来西亚","泰国","越南","印度尼西亚","菲律宾","柬埔寨","缅甸","老挝"],
  "南亚": ["印度","巴基斯坦","孟加拉国","斯里兰卡","尼泊尔"],
  "中东/北非": ["阿联酋","沙特阿拉伯","卡塔尔","科威特","巴林","阿曼","以色列","土耳其","伊朗","黎巴嫩","埃及","摩洛哥","突尼斯","阿尔及利亚"],
  "撒南非洲": ["南非","尼日利亚","肯尼亚","加纳","埃塞俄比亚","坦桑尼亚"],
  "大洋洲": ["澳大利亚","新西兰","斐济"],
  "拉美": ["墨西哥","巴西","阿根廷","智利","哥伦比亚","秘鲁","乌拉圭","哥斯达黎加","巴拿马","多米尼加","厄瓜多尔","波多黎各"],
  "其他": ["塞尔维亚","哈萨克斯坦","乌兹别克斯坦","阿塞拜疆","格鲁吉亚","马耳他"],
};
const cToRegion = {};
for (const [r, list] of Object.entries(regionMap)) for (const c of list) cToRegion[c] = r;

const byRegion = {};
for (const c of v8.cities) {
  const r = cToRegion[c.country] || "?";
  if (!byRegion[r]) byRegion[r] = { S:0, A:0, B:0, C:0, D:0, total:0 };
  byRegion[r][c.confidence]++;
  byRegion[r].total++;
}
console.log("\nRegion × tier breakdown:");
console.log("Region".padEnd(14) + "S".padStart(4) + "A".padStart(4) + "B".padStart(4) + "C".padStart(4) + "D".padStart(4) + "total".padStart(7) + " keep%");
for (const [r, t] of Object.entries(byRegion).sort((a,b) => b[1].total-a[1].total)) {
  const keep = (t.S+t.A+t.B);
  console.log(r.padEnd(14) + String(t.S).padStart(4) + String(t.A).padStart(4) + String(t.B).padStart(4) + String(t.C).padStart(4) + String(t.D).padStart(4) + String(t.total).padStart(7) + ` ${(keep/t.total*100).toFixed(0)}%`.padStart(6));
}

// Tier × divergence stats
console.log("\nTier × median |Δ vs prod|:");
for (const tier of ["S","A","B","C"]) {
  const ts = v8.cities.filter(c => c.confidence === tier);
  const dc = ts.filter(c => c.divergence?.cost > 0).map(c => c.divergence.cost).sort((a,b)=>a-b);
  const dr = ts.filter(c => c.divergence?.rent > 0).map(c => c.divergence.rent).sort((a,b)=>a-b);
  const med = (a) => a.length ? a[Math.floor(a.length/2)].toFixed(1)+"%" : "—";
  console.log(`  ${tier}  (n=${ts.length})  cost med |Δ|=${med(dc)}   rent med |Δ|=${med(dr)}`);
}
