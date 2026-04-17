import { readFileSync } from "fs";
const v9 = JSON.parse(readFileSync("data/clean-pipeline/output/clean-values-v9.json","utf8"));
// Output: all v9 city names grouped by tier, with cost/rent source briefs
for (const tier of ["S","A","B","C","D"]) {
  console.log(`\n=== ${tier} ===`);
  const list = v9.cities.filter(c=>c.confidence===tier);
  for (const c of list) {
    const rs = c.rentSource?.split("-")[0] || "null";
    const cs = c.costSource?.includes("BEA") ? "BEA" : c.costSource?.includes("Eurostat") ? "Eurostat" : c.costSource?.startsWith("v4:") ? "PLIonly" : "null";
    console.log(`  ${c.name}(${c.country}) cost=${cs} rent=${rs}`);
  }
}
