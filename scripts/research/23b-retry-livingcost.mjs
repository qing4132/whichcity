// Retry fetch for cities whose slug pattern was wrong in the initial pass.
import fs from 'node:fs';
const OUT = 'data/sources/gt/livingcost-salary-gt.json';
const existing = JSON.parse(fs.readFileSync(OUT, 'utf8'));
const src = JSON.parse(fs.readFileSync('data/cities-source.json', 'utf8'));

const OVERRIDES = {
  悉尼: 'australia/sydney', 墨尔本: 'australia/melbourne', 布里斯班: 'australia/brisbane',
  奥克兰: 'new-zealand/auckland', 惠灵顿: 'new-zealand/wellington',
  巴塞罗那: 'spain/barcelona', 马德里: 'spain/madrid', 瓦伦西亚: 'spain/valencia',
  '圣地亚哥(智利)': 'chile/santiago', 基辅: 'ukraine/kiev', 巴厘岛: 'indonesia/denpasar',
  香港: 'china/hong-kong',
};

const RE = /median after-tax salary is\s*<span[^>]*data-usd="([\d.]+)"/;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let ok = 0, miss = 0;
for (const [name, tail] of Object.entries(OVERRIDES)) {
  const city = src.cities.find((c) => c.name === name);
  if (!city) continue;
  if (existing[city.id]) { console.log(`skip existing ${name}`); continue; }
  const url = `https://livingcost.org/cost/${tail}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) { console.log(`MISS ${res.status} ${name}`); miss++; continue; }
  const html = await res.text();
  const m = html.match(RE);
  if (!m) { console.log(`NO_MATCH ${name}`); miss++; continue; }
  existing[city.id] = { name, country: city.country, livingcostNetMonthlyUSD: parseFloat(m[1]), url };
  console.log(`OK ${name} $${m[1]}`);
  ok++;
  await sleep(500);
}
fs.writeFileSync(OUT, JSON.stringify(existing, null, 2));
console.log(`\nretry: +${ok} / ${miss} miss. total=${Object.keys(existing).length}`);
