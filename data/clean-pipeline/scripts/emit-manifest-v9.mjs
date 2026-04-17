#!/usr/bin/env node
/** emit-manifest-v9.mjs */
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const v9 = JSON.parse(readFileSync(join(ROOT, "output/clean-values-v9.json"), "utf-8"));

const hdr = ["name","country","tier","display","cost","rent","cost_source","rent_source","salary_h1b","fh","ubs_risk","prod_cost_delta%","prod_rent_delta%"];
const rows = [hdr.join(",")];
for (const c of v9.cities) {
  rows.push([
    c.name, c.country, c.confidence, c.displayRecommendation,
    c.cost ?? "", c.rent ?? "",
    (c.costSource||"").replace(/,/g, ";"),
    (c.rentSource||"").replace(/,/g, ";"),
    c.h1bAnchors ? `h1b(${Object.keys(c.h1bAnchors.professions).length}prof,n=${c.h1bAnchors.socCount})` : "",
    c.governance?.fhTotal ?? "",
    c.ubsBubble?.risk ?? "",
    c.prodDivergence.cost ?? "",
    c.prodDivergence.rent ?? "",
  ].join(","));
}
writeFileSync(join(ROOT, "output/city-manifest-v9.csv"), rows.join("\n"));
console.log(`✓ output/city-manifest-v9.csv (${rows.length-1} rows)`);
