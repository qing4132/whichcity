import fs from 'node:fs';
const g = JSON.parse(fs.readFileSync('data/sources/osm/geocoded.json', 'utf8'));
const p = JSON.parse(fs.readFileSync('data/sources/osm/poi-counts.json', 'utf8'));
const src = JSON.parse(fs.readFileSync('data/cities-source.json', 'utf8'));

const bad = [];
for (const c of src.cities) {
  const pp = p[c.id];
  if (!pp || !pp.r2000) { bad.push({ id: c.id, name: c.name, country: c.country, total: null, reason: 'missing' }); continue; }
  const t = pp.r2000;
  const total = t.dining + t.culture + t.health + t.edu + t.retail + t.finance + t.transit + t.tourism;
  if (total < 50) bad.push({ id: c.id, name: c.name, country: c.country, total, lat: g[c.id]?.lat, lon: g[c.id]?.lon, displayName: g[c.id]?.displayName });
}
console.log(`Bad geocoded cities (total<50): ${bad.length}`);
console.log(JSON.stringify(bad, null, 2));
