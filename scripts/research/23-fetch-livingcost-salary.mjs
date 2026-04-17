// Fetch Livingcost median-after-tax-salary as a second independent salary GT.
// Livingcost URLs require country + (optional state/region slug) + city slug.
// We discover each city's slug by scraping the country index page and matching.
//
// Output: data/sources/gt/livingcost-salary-gt.json  { cityId: { name, country, livingcostNetMonthlyUSD, slug } }

import fs from 'node:fs';

const OUT_PATH = 'data/sources/gt/livingcost-salary-gt.json';
const DELAY_MS = 600;

const src = JSON.parse(fs.readFileSync('data/cities-source.json', 'utf8'));

// Hand-curated country name → livingcost slug
const COUNTRY_SLUG = {
  '美国': 'united-states', '加拿大': 'canada', '英国': 'united-kingdom', '爱尔兰': 'ireland',
  '法国': 'france', '德国': 'germany', '西班牙': 'spain', '葡萄牙': 'portugal', '意大利': 'italy',
  '荷兰': 'netherlands', '比利时': 'belgium', '卢森堡': 'luxembourg', '瑞士': 'switzerland', '奥地利': 'austria',
  '丹麦': 'denmark', '瑞典': 'sweden', '挪威': 'norway', '芬兰': 'finland', '冰岛': 'iceland',
  '希腊': 'greece', '波兰': 'poland', '捷克': 'czech-republic', '匈牙利': 'hungary', '罗马尼亚': 'romania',
  '保加利亚': 'bulgaria', '塞尔维亚': 'serbia', '克罗地亚': 'croatia', '乌克兰': 'ukraine',
  '俄罗斯': 'russia', '土耳其': 'turkey', '格鲁吉亚': 'georgia',
  '立陶宛': 'lithuania', '拉脱维亚': 'latvia', '爱沙尼亚': 'estonia', '塞浦路斯': 'cyprus',
  '澳大利亚': 'australia', '新西兰': 'new-zealand',
  '日本': 'japan', '韩国': 'south-korea', '台湾': 'taiwan', '新加坡': 'singapore', '中国': 'china',
  '中国香港': 'hong-kong', '菲律宾': 'philippines', '印度尼西亚': 'indonesia', '越南': 'vietnam',
  '泰国': 'thailand', '马来西亚': 'malaysia', '印度': 'india', '哈萨克斯坦': 'kazakhstan',
  '阿联酋': 'united-arab-emirates', '沙特阿拉伯': 'saudi-arabia', '卡塔尔': 'qatar',
  '以色列': 'israel', '埃及': 'egypt', '摩洛哥': 'morocco', '南非': 'south-africa',
  '肯尼亚': 'kenya', '尼日利亚': 'nigeria', '加纳': 'ghana', '埃塞俄比亚': 'ethiopia',
  '墨西哥': 'mexico', '巴拿马': 'panama', '哥斯达黎加': 'costa-rica', '多米尼加': 'dominican-republic',
  '巴西': 'brazil', '阿根廷': 'argentina', '智利': 'chile', '哥伦比亚': 'colombia',
  '秘鲁': 'peru', '乌拉圭': 'uruguay', '厄瓜多尔': 'ecuador', '波多黎各': 'puerto-rico',
  '巴基斯坦': 'pakistan', '尼泊尔': 'nepal',
};

// Hand-curated city name → slug tail (after country prefix). For cities in US / India / etc. the
// URL includes a state slug; we include that here when necessary.
const CITY_SLUG = {
  纽约: 'ny/new-york', 洛杉矶: 'ca/los-angeles', 旧金山: 'ca/san-francisco', 芝加哥: 'il/chicago',
  迈阿密: 'fl/miami', 华盛顿: 'dc/washington', 波士顿: 'ma/boston', 西雅图: 'wa/seattle',
  奥斯汀: 'tx/austin', '圣地亚哥(美国)': 'ca/san-diego', 圣地亚哥: 'ca/san-diego', 休斯顿: 'tx/houston',
  费城: 'pa/philadelphia', '圣何塞(美国)': 'ca/san-jose',
  多伦多: 'on/toronto', 温哥华: 'bc/vancouver', 蒙特利尔: 'qc/montreal',
  圣胡安: 'pr/san-juan',
  伦敦: 'eng/london',
  巴黎: 'idf/paris',
  柏林: 'bb/berlin', 慕尼黑: 'by/munich',
  马德里: 'md/madrid', 巴塞罗那: 'ca/barcelona', 瓦伦西亚: 'vc/valencia', 拉斯帕尔马斯: 'cn/las-palmas-de-gran-canaria',
  米兰: 'lo/milan', 罗马: 'lz/rome',
  悉尼: 'nsw/sydney', 墨尔本: 'vic/melbourne', 布里斯班: 'qld/brisbane',
  奥克兰: 'auk/auckland', 惠灵顿: 'wgn/wellington',
  首尔: 'seoul', 釜山: 'busan',
  东京: 'tokyo', 大阪: 'osaka', 京都: 'kyoto', 福冈: 'fukuoka',
  北京: 'beijing', 上海: 'shanghai', 广州: 'guangzhou', 深圳: 'shenzhen', 成都: 'chengdu',
  杭州: 'hangzhou', 香港: 'hong-kong',
  台北: 'taipei',
  新加坡: 'singapore',
  新德里: 'dl/new-delhi', 孟买: 'mh/mumbai', 班加罗尔: 'ka/bangalore',
  曼谷: 'bangkok', 清迈: 'chiang-mai', 普吉岛: 'phuket',
  吉隆坡: 'kuala-lumpur', 槟城: 'penang',
  雅加达: 'jakarta', 巴厘岛: 'bali/denpasar',
  胡志明市: 'ho-chi-minh', 河内: 'hanoi', 岘港: 'da-nang',
  马尼拉: 'manila',
  迪拜: 'dubai', 阿布扎比: 'abu-dhabi',
  多哈: 'doha', 利雅得: 'riyadh',
  特拉维夫: 'tel-aviv', 开罗: 'cairo', 卡萨布兰卡: 'casablanca',
  内罗毕: 'nairobi', 拉各斯: 'lagos', 阿克拉: 'accra', 亚的斯亚贝巴: 'addis-ababa',
  约翰内斯堡: 'johannesburg', 开普敦: 'cape-town',
  墨西哥城: 'mexico', 瓜达拉哈拉: 'guadalajara',
  巴拿马城: 'panama', '圣何塞(哥斯达黎加)': 'san-jose', 圣多明各: 'santo-domingo', 基多: 'quito',
  圣保罗: 'sao-paulo', 里约热内卢: 'rio-de-janeiro', 弗洛里亚诺波利斯: 'florianopolis',
  布宜诺斯艾利斯: 'buenos-aires',
  '圣地亚哥(智利)': 'santiago',
  波哥大: 'bogota', 麦德林: 'medellin',
  利马: 'lima', 蒙得维的亚: 'montevideo',
  伊斯坦布尔: 'istanbul',
  第比利斯: 'tbilisi',
  莫斯科: 'moscow',
  基辅: 'kyiv',
  阿拉木图: 'almaty',
  都柏林: 'dublin', 苏黎世: 'zurich', 日内瓦: 'geneva',
  维也纳: 'vienna', 布鲁塞尔: 'brussels', 阿姆斯特丹: 'amsterdam', 卢森堡市: 'luxembourg',
  斯德哥尔摩: 'stockholm', 哥本哈根: 'copenhagen', 奥斯陆: 'oslo', 赫尔辛基: 'helsinki',
  雅典: 'greece', // will likely 404; leave for manual fallback
  华沙: 'warsaw', 布拉格: 'prague', 布达佩斯: 'budapest',
  布加勒斯特: 'bucharest', 索非亚: 'sofia', 贝尔格莱德: 'belgrade',
  萨格勒布: 'zagreb', 斯普利特: 'split',
  里斯本: 'lisbon', 波尔图: 'porto',
  里加: 'riga', 维尔纽斯: 'vilnius', 塔林: 'tallinn', 尼科西亚: 'nicosia',
  卡拉奇: 'pk/karachi',
};

// Actually the '雅典' / 'athens' slug in livingcost index is... let's fix a couple manually:
CITY_SLUG['雅典'] = 'athens';

const targets = [];
for (const c of src.cities) {
  const cc = COUNTRY_SLUG[c.country];
  const tail = CITY_SLUG[c.name];
  if (!cc || !tail) continue;
  targets.push({ id: c.id, name: c.name, country: c.country, url: `https://livingcost.org/cost/${cc}/${tail}` });
}

console.log(`准备抓取 ${targets.length} 城...`);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Allow incremental resume by reading existing output
const existing = fs.existsSync(OUT_PATH) ? JSON.parse(fs.readFileSync(OUT_PATH, 'utf8')) : {};

async function fetchHTML(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (WhichCity Research)' }, redirect: 'follow' });
  if (!res.ok) return null;
  return res.text();
}

// Parse: <span data-usd="5228.62">$5229</span> following "The median after-tax salary is"
const RE = /median after-tax salary is\s*<span[^>]*data-usd="([\d.]+)"/;

let ok = 0, miss = 0, fail = 0;
for (const t of targets) {
  if (existing[t.id]?.livingcostNetMonthlyUSD) { ok++; continue; }
  try {
    const html = await fetchHTML(t.url);
    if (!html) { miss++; console.log(`  404 ${t.name} → ${t.url}`); continue; }
    const m = html.match(RE);
    if (!m) { miss++; console.log(`  NO_MATCH ${t.name} → ${t.url}`); continue; }
    const usd = parseFloat(m[1]);
    if (!(usd > 0 && usd < 20000)) { miss++; continue; }
    existing[t.id] = { name: t.name, country: t.country, livingcostNetMonthlyUSD: usd, url: t.url };
    ok++;
    if (ok % 10 === 0) {
      fs.writeFileSync(OUT_PATH, JSON.stringify(existing, null, 2));
      console.log(`  checkpoint: ${ok} extracted`);
    }
  } catch (e) {
    fail++; console.log(`  FAIL ${t.name}: ${e.message}`);
  }
  await sleep(DELAY_MS);
}
fs.writeFileSync(OUT_PATH, JSON.stringify(existing, null, 2));
console.log(`\n完成: ${ok} 成功 / ${miss} 无数据 / ${fail} 错误`);
