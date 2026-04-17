import { readFileSync } from "fs";
const v8 = JSON.parse(readFileSync("data/clean-pipeline/output/clean-values-v8.json", "utf8"));
for (const name of ["苏黎世","巴黎","阿姆斯特丹","柏林","马德里","悉尼","新加坡","首尔","东京","香港","墨西哥城"]) {
  const c = v8.cities.find(x => x.name === name);
  if (!c) continue;
  console.log(name.padEnd(8), "tier=" + c.confidence, "cost=[" + c.costSource + "]", "rent=[" + c.rentSource + "]", "div=", JSON.stringify(c.divergence), c.divergenceNote || "");
}
