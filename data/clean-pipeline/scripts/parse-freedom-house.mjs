#!/usr/bin/env node
/**
 * parse-freedom-house.mjs — FIW + (scraped) LGBT index from public sources.
 *
 * Freedom House FIW (All_data_FIW_2013-2024.xlsx):
 *   - PR (political rights 0-40), CL (civil liberties 0-60), Total 0-100
 *   - Status: F/PF/NF
 */
import XLSX from "xlsx";
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const wb = XLSX.readFile(join(ROOT, "sources/freedom/fiw-all-data.xlsx"));
console.log("Sheets:", wb.SheetNames);

// Primary sheet normally "FIW13-24" or similar
const sheetName = wb.SheetNames.find((n) => /FIW|Country|Aggregate/i.test(n)) || wb.SheetNames[0];
const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1 });
console.log(`Sheet "${sheetName}" has ${rows.length} rows`);
// Find header row
let headerRow = -1;
for (let i = 0; i < Math.min(5, rows.length); i++) {
  if (rows[i] && rows[i].some((c) => String(c).includes("Country"))) { headerRow = i; break; }
}
console.log("Header row idx:", headerRow, "cols:", rows[headerRow]?.slice(0, 15));

const h = rows[headerRow];
const findCol = (pat) => h.findIndex((c) => pat.test(String(c)));
const cCountry = findCol(/Country\/Territory|^Country$/);
const cEdition = findCol(/Edition/i);
const cStatus = findCol(/^Status$/i);
const cPR = findCol(/^PR$/);
const cCL = findCol(/^CL$/);
const cTotal = findCol(/^Total$|PR\+CL/i);

console.log("cols: country=%d edition=%d status=%d PR=%d CL=%d Total=%d", cCountry, cEdition, cStatus, cPR, cCL, cTotal);

// Take latest edition per country
const latest = new Map();
for (let i = headerRow + 1; i < rows.length; i++) {
  const r = rows[i];
  if (!r || !r[cCountry]) continue;
  const country = String(r[cCountry]).trim();
  const edition = Number(r[cEdition]);
  if (!edition) continue;
  const prev = latest.get(country);
  if (!prev || prev.edition < edition) {
    latest.set(country, {
      edition,
      status: r[cStatus],
      pr: Number(r[cPR]),
      cl: Number(r[cCL]),
      total: Number(r[cTotal]),
    });
  }
}

const out = {
  source: "Freedom House Freedom in the World 2024 (fair-use attribution)",
  url: "https://freedomhouse.org/report/freedom-world",
  anchor: "Total 0-100 (40 PR + 60 CL), status F/PF/NF",
  generated: new Date().toISOString(),
  values: Object.fromEntries([...latest].map(([k, v]) => [k, v])),
};
writeFileSync(join(ROOT, "sources/freedom/fh-latest.json"), JSON.stringify(out, null, 2) + "\n");
console.log(`\n✓ fh-latest.json with ${latest.size} countries`);
console.log("Sample:");
for (const k of ["United States", "China", "Singapore", "Germany", "India", "Russia", "Sweden", "Turkey"]) {
  const v = latest.get(k);
  if (v) console.log(`  ${k.padEnd(20)}  Total=${v.total}  ${v.status}  PR=${v.pr} CL=${v.cl}`);
}
