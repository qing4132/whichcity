import fs from 'node:fs';
const OUT = 'data/sources/osm/poi-counts.json';
const IDS = [14, 43, 78, 98, 105, 131, 136, 138, 147];
const cache = JSON.parse(fs.readFileSync(OUT, 'utf8'));
for (const id of IDS) delete cache[id];
fs.writeFileSync(OUT, JSON.stringify(cache, null, 2));
console.log(`Purged ${IDS.length} stale entries. Now re-run 11-osm-poi.mjs.`);
