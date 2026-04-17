// Hand-curate the ~9 mis-geocoded cities (Nominatim gave us non-downtown points).
// Coordinates below are well-known CBD / downtown centroids.
import fs from 'node:fs';

const PATCH = {
  14:  { name: '迪拜',       lat: 25.1972,  lon: 55.2744,  note: 'Downtown Dubai / Burj Khalifa' },
  43:  { name: '布里斯班',    lat: -27.4698, lon: 153.0251, note: 'Brisbane CBD' },
  78:  { name: '利雅得',      lat: 24.7136,  lon: 46.6753,  note: 'Riyadh Olaya / city centre' },
  98:  { name: '圣地亚哥',    lat: 32.7157,  lon: -117.1611, note: 'San Diego (USA) downtown — Nominatim returned a tiny WA town' },
  105: { name: '重庆',        lat: 29.5630,  lon: 106.5516, note: 'Jiefangbei CBD (Yuzhong District)' },
  131: { name: '拉各斯',      lat: 6.4541,   lon: 3.3947,   note: 'Lagos Island CBD (on edge — keep for re-fetch)' },
  136: { name: '卢森堡市',    lat: 49.6117,  lon: 6.1319,   note: 'Luxembourg City centre' },
  138: { name: '福冈',        lat: 33.5904,  lon: 130.4017, note: 'Hakata / Fukuoka central' },
  147: { name: '普吉岛',      lat: 7.8804,   lon: 98.3923,  note: 'Phuket Town centre' },
};

const path = 'data/sources/osm/geocoded.json';
const g = JSON.parse(fs.readFileSync(path, 'utf8'));
for (const [id, p] of Object.entries(PATCH)) {
  if (!g[id]) { console.log(`WARN id=${id} not in geocoded.json`); continue; }
  if (g[id].name !== p.name) { console.log(`WARN id=${id} name mismatch: ${g[id].name} != ${p.name}`); continue; }
  g[id] = { ...g[id], lat: p.lat, lon: p.lon, source: 'manual', displayName: `${p.name} (manual: ${p.note})` };
  console.log(`Patched id=${id} ${p.name} → (${p.lat}, ${p.lon})`);
}
fs.writeFileSync(path, JSON.stringify(g, null, 2));
console.log(`\nSaved ${path}`);
