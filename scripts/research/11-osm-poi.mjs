// Fetch OSM POI counts for 151 cities from Overpass API.
// One query per city using around:<radius>,<lat>,<lon> for 8 POI categories.
// Saves data/sources/osm/poi-counts.json

import fs from 'node:fs';

const geo = JSON.parse(fs.readFileSync('data/sources/osm/geocoded.json', 'utf8'));
const OUT = 'data/sources/osm/poi-counts.json';
let cache = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};

const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
];
let epIdx = 0;

// 8 POI categories as documented in v2 report
function buildQuery(lat, lon, radius) {
  return `[out:json][timeout:60];
(
  nwr(around:${radius},${lat},${lon})[amenity~"^(restaurant|cafe|fast_food|bar|pub|food_court)$"];
)->.dining;
(
  nwr(around:${radius},${lat},${lon})[amenity~"^(theatre|cinema|arts_centre|nightclub|music_venue)$"];
  nwr(around:${radius},${lat},${lon})[tourism~"^(museum|gallery)$"];
)->.culture;
(
  nwr(around:${radius},${lat},${lon})[amenity~"^(hospital|clinic|pharmacy|doctors|dentist)$"];
)->.health;
(
  nwr(around:${radius},${lat},${lon})[amenity~"^(school|university|college|kindergarten|library)$"];
)->.edu;
(
  nwr(around:${radius},${lat},${lon})[shop];
)->.retail;
(
  nwr(around:${radius},${lat},${lon})[amenity~"^(bank|atm|bureau_de_change)$"];
  nwr(around:${radius},${lat},${lon})[office];
)->.finance;
(
  nwr(around:${radius},${lat},${lon})[railway=subway_entrance];
  nwr(around:${radius},${lat},${lon})[public_transport=station];
  nwr(around:${radius},${lat},${lon})[amenity=bus_station];
)->.transit;
(
  nwr(around:${radius},${lat},${lon})[tourism~"^(hotel|hostel|guest_house|attraction)$"];
)->.tourism;
.dining out count;
.culture out count;
.health out count;
.edu out count;
.retail out count;
.finance out count;
.transit out count;
.tourism out count;`;
}

const CATS = ['dining', 'culture', 'health', 'edu', 'retail', 'finance', 'transit', 'tourism'];

async function query(lat, lon, radius = 2000, attempt = 0) {
  const body = 'data=' + encodeURIComponent(buildQuery(lat, lon, radius));
  const ep = ENDPOINTS[epIdx % ENDPOINTS.length];
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 90000);
    const res = await fetch(ep, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'WhichCityResearch/1.0' },
      body,
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (res.status === 429 || res.status === 504 || res.status >= 500) {
      epIdx++;
      if (attempt < 3) { await new Promise((r) => setTimeout(r, 5000 * (attempt + 1))); return query(lat, lon, radius, attempt + 1); }
      throw new Error(`HTTP ${res.status}`);
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const j = await res.json();
    // Extract counts from 8 consecutive 'count' elements; they appear in query order.
    const elems = j.elements || [];
    const counts = {};
    let idx = 0;
    for (const e of elems) {
      if (e.type === 'count') {
        const tags = e.tags || {};
        const total = parseInt(tags.total || tags.nodes || '0', 10) +
                      parseInt(tags.ways || '0', 10) + parseInt(tags.relations || '0', 10);
        // Overpass "out count" puts n/w/r separately; sum them
        const nodes = parseInt(tags.nodes || '0', 10);
        const ways = parseInt(tags.ways || '0', 10);
        const rels = parseInt(tags.relations || '0', 10);
        counts[CATS[idx]] = tags.total ? parseInt(tags.total, 10) : (nodes + ways + rels);
        idx++;
      }
    }
    return counts;
  } catch (e) {
    epIdx++;
    if (attempt < 3) { await new Promise((r) => setTimeout(r, 5000 * (attempt + 1))); return query(lat, lon, radius, attempt + 1); }
    throw e;
  }
}

async function run() {
  const cities = Object.values(geo).filter((c) => c.lat != null);
  let done = 0;
  for (const c of cities) {
    done++;
    if (cache[c.id]?.r2000?.dining != null) continue;
    try {
      const r2000 = await query(c.lat, c.lon, 2000);
      // Skip second radius for speed; r=2km captures city-center density
      cache[c.id] = { id: c.id, name: c.name, country: c.country, lat: c.lat, lon: c.lon, r2000 };
      const total = Object.values(r2000).reduce((s, v) => s + (v || 0), 0);
      console.log(`[${done}/${cities.length}] ${c.name} total=${total} (${Object.entries(r2000).map(([k,v]) => `${k}:${v}`).join(' ')})`);
      fs.writeFileSync(OUT, JSON.stringify(cache, null, 2));
      await new Promise((r) => setTimeout(r, 1500));
    } catch (e) {
      console.warn(`[${done}/${cities.length}] FAIL ${c.name}: ${e.message}`);
      cache[c.id] = { id: c.id, name: c.name, error: String(e.message) };
      fs.writeFileSync(OUT, JSON.stringify(cache, null, 2));
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
  console.log('\nDone.');
}
run().catch((e) => { console.error(e); process.exit(1); });
