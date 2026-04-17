import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const REPO = join(ROOT, "../..");
const v8   = JSON.parse(readFileSync(join(ROOT, "output/clean-values-v8.json"), "utf-8"));
const prod = JSON.parse(readFileSync(join(REPO, "public/data/cities.json"), "utf-8"));
const pby  = new Map((prod.cities ?? prod).map(c => [c.name, c]));

function stats(list) {
  const cc=[], rr=[];
  for (const c of list) {
    const p=pby.get(c.name); if(!p) continue;
    if (c.cost && p.costModerate) cc.push(Math.abs((c.cost-p.costModerate)/p.costModerate));
    if (c.rent && p.monthlyRent) rr.push(Math.abs((c.rent-p.monthlyRent)/p.monthlyRent));
  }
  cc.sort((a,b)=>a-b); rr.sort((a,b)=>a-b);
  const med=a=>a.length?(a[Math.floor(a.length/2)]*100).toFixed(1)+"%":"—";
  const mn=a=>a.length?(a.reduce((s,v)=>s+v,0)/a.length*100).toFixed(1)+"%":"—";
  return { costMed:med(cc), costMean:mn(cc), costN:cc.length, rentMed:med(rr), rentMean:mn(rr), rentN:rr.length };
}
console.log("Scope".padEnd(22) + "n_cost n_rent costMed costMean rentMed rentMean");
const all = v8.cities;
const keep = all.filter(c => ["S","A","B"].includes(c.confidence));
const sOnly = all.filter(c => c.confidence === "S");
const saOnly = all.filter(c => ["S","A"].includes(c.confidence));
for (const [name, list] of [["All 151", all],["keep (S+A+B, 95)", keep],["S+A (41)", saOnly],["S only (19)", sOnly]]) {
  const s = stats(list);
  console.log(name.padEnd(22) + String(s.costN).padStart(6) + String(s.rentN).padStart(7) + s.costMed.padStart(8) + s.costMean.padStart(9) + s.rentMed.padStart(8) + s.rentMean.padStart(9));
}
