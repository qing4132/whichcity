// Inspect data overlap between city source and numbeo ground truth
import fs from 'fs';
const d = JSON.parse(fs.readFileSync('_archive/scripts-numbeo/numbeo-audit/fetched-data.json', 'utf8'));
const s = JSON.parse(fs.readFileSync('data/cities-source.json', 'utf8'));
const srcIds = new Set(s.cities.map((c) => c.id));
const cpIds = new Set(Object.keys(d.cityPages).map(Number));
let both = 0, onlyCp = 0;
for (const id of cpIds) if (srcIds.has(id)) both++; else onlyCp++;
let onlySrc = 0; for (const id of srcIds) if (!cpIds.has(id)) onlySrc++;
console.log('cpIds cap src:', both, 'onlyCp:', onlyCp, 'onlySrc:', onlySrc);
let nCost = 0, nRent = 0;
for (const id of cpIds) {
  const x = d.cityPages[id];
  if (x.singlePersonMonthlyCost) nCost++;
  if (x.rent1BRCenter && x.rent1BROutside) nRent++;
}
console.log('usable cost:', nCost, 'usable rent:', nRent);
const hidden = s.cities.filter((c) => c.hidden).length;
console.log('hidden cities:', hidden);
