import { readFileSync } from "fs";
const v9 = JSON.parse(readFileSync("data/clean-pipeline/output/clean-values-v9.json", "utf8"));
const prod = JSON.parse(readFileSync("public/data/cities.json", "utf8"));
const pby = new Map((prod.cities ?? prod).map(c => [c.name, c]));

const picks = {
  S: ["纽约","旧金山","伦敦","芝加哥"],
  A: ["多伦多","苏黎世","柏林","维也纳","雅典"],
  B: ["东京","北京","上海","巴黎","里斯本","赫尔辛基","布加勒斯特"],
  C: ["新加坡","香港","悉尼","首尔","迪拜","墨西哥城","班加罗尔","曼谷（already B?）","布宜诺斯艾利斯","开罗"],
  D: ["德黑兰","贝鲁特","第比利斯"],
};

for (const [tier, names] of Object.entries(picks)) {
  console.log("\n=== " + tier + " ===");
  for (const n of names) {
    const c = v9.cities.find(x => x.name === n);
    if (!c) { console.log(n + " NOT FOUND"); continue; }
    const p = pby.get(n);
    console.log(`${n.padEnd(8)} [${c.confidence}] v9.cost=$${c.cost ?? "-"}  v9.rent=$${c.rent ?? "-"}    prod.cost=$${p?.costModerate ?? "-"}  prod.rent=$${p?.monthlyRent ?? "-"}`);
    console.log(`        costSrc=${c.costSource || "-"}`);
    console.log(`        rentSrc=${c.rentSource || "-"}`);
  }
}
