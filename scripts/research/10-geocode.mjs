// Geocode WhichCity 151 cities via Wikidata SPARQL, fall back to Nominatim.
// Produces data/sources/osm/geocoded.json with {id, name, country, lat, lon, source}.

import fs from 'node:fs';
import path from 'node:path';

const src = JSON.parse(fs.readFileSync('data/cities-source.json', 'utf8'));
const OUT = 'data/sources/osm/geocoded.json';
fs.mkdirSync(path.dirname(OUT), { recursive: true });

// Load existing cache
let cache = {};
if (fs.existsSync(OUT)) cache = JSON.parse(fs.readFileSync(OUT, 'utf8'));

// ---- EN name map (pull from lib/citySlug if possible) ----
const slugMod = fs.readFileSync('lib/citySlug.ts', 'utf8');
const slugRe = /'([^']+)':\s*'([a-z0-9-]+)'/g;
const slugMap = {};
let m; while ((m = slugRe.exec(slugMod))) slugMap[m[1]] = m[2];

const countryEN = {
  '美国': 'USA', '英国': 'United Kingdom', '日本': 'Japan', '中国': 'China', '德国': 'Germany',
  '法国': 'France', '意大利': 'Italy', '西班牙': 'Spain', '荷兰': 'Netherlands', '瑞士': 'Switzerland',
  '加拿大': 'Canada', '澳大利亚': 'Australia', '新加坡': 'Singapore', '韩国': 'South Korea',
  '印度': 'India', '泰国': 'Thailand', '马来西亚': 'Malaysia', '越南': 'Vietnam', '菲律宾': 'Philippines',
  '印度尼西亚': 'Indonesia', '巴西': 'Brazil', '墨西哥': 'Mexico', '阿根廷': 'Argentina', '智利': 'Chile',
  '南非': 'South Africa', '埃及': 'Egypt', '尼日利亚': 'Nigeria', '土耳其': 'Turkey', '俄罗斯': 'Russia',
  '波兰': 'Poland', '捷克': 'Czech Republic', '匈牙利': 'Hungary', '奥地利': 'Austria', '比利时': 'Belgium',
  '葡萄牙': 'Portugal', '爱尔兰': 'Ireland', '希腊': 'Greece', '瑞典': 'Sweden', '挪威': 'Norway',
  '丹麦': 'Denmark', '芬兰': 'Finland', '冰岛': 'Iceland', '新西兰': 'New Zealand', '阿联酋': 'UAE',
  '以色列': 'Israel', '沙特阿拉伯': 'Saudi Arabia', '卡塔尔': 'Qatar', '伊朗': 'Iran', '巴基斯坦': 'Pakistan',
  '孟加拉国': 'Bangladesh', '尼泊尔': 'Nepal', '斯里兰卡': 'Sri Lanka', '哥伦比亚': 'Colombia', '秘鲁': 'Peru',
  '哥斯达黎加': 'Costa Rica', '乌拉圭': 'Uruguay', '摩洛哥': 'Morocco', '肯尼亚': 'Kenya',
  '哈萨克斯坦': 'Kazakhstan', '乌克兰': 'Ukraine', '罗马尼亚': 'Romania', '保加利亚': 'Bulgaria',
  '克罗地亚': 'Croatia', '斯洛文尼亚': 'Slovenia', '斯洛伐克': 'Slovakia', '立陶宛': 'Lithuania',
  '拉脱维亚': 'Latvia', '爱沙尼亚': 'Estonia', '塞尔维亚': 'Serbia', '格鲁吉亚': 'Georgia',
  '亚美尼亚': 'Armenia', '乌兹别克斯坦': 'Uzbekistan', '缅甸': 'Myanmar', '柬埔寨': 'Cambodia',
  '蒙古': 'Mongolia', '马尔代夫': 'Maldives', '毛里求斯': 'Mauritius', '牙买加': 'Jamaica',
  '多米尼加': 'Dominican Republic', '卢森堡': 'Luxembourg', '马耳他': 'Malta', '塞浦路斯': 'Cyprus',
  '巴林': 'Bahrain', '科威特': 'Kuwait', '阿曼': 'Oman', '黎巴嫩': 'Lebanon', '约旦': 'Jordan',
};

// English names for cities — derived from slug when possible, with Chinese->English fallback table
const enNameMap = {
  '纽约': 'New York', '伦敦': 'London', '东京': 'Tokyo', '巴黎': 'Paris', '柏林': 'Berlin',
  '洛杉矶': 'Los Angeles', '旧金山': 'San Francisco', '芝加哥': 'Chicago', '波士顿': 'Boston',
  '西雅图': 'Seattle', '迈阿密': 'Miami', '华盛顿': 'Washington, D.C.', '多伦多': 'Toronto',
  '温哥华': 'Vancouver', '蒙特利尔': 'Montreal', '悉尼': 'Sydney', '墨尔本': 'Melbourne',
  '布里斯班': 'Brisbane', '奥克兰': 'Auckland', '新加坡': 'Singapore', '首尔': 'Seoul',
  '釜山': 'Busan', '北京': 'Beijing', '上海': 'Shanghai', '广州': 'Guangzhou', '深圳': 'Shenzhen',
  '杭州': 'Hangzhou', '成都': 'Chengdu', '重庆': 'Chongqing', '武汉': 'Wuhan', '西安': 'Xi\'an',
  '香港': 'Hong Kong', '台北': 'Taipei', '马德里': 'Madrid', '巴塞罗那': 'Barcelona', '罗马': 'Rome',
  '米兰': 'Milan', '都柏林': 'Dublin', '阿姆斯特丹': 'Amsterdam', '布鲁塞尔': 'Brussels',
  '日内瓦': 'Geneva', '苏黎世': 'Zurich', '维也纳': 'Vienna', '布拉格': 'Prague', '华沙': 'Warsaw',
  '布达佩斯': 'Budapest', '斯德哥尔摩': 'Stockholm', '奥斯陆': 'Oslo', '哥本哈根': 'Copenhagen',
  '赫尔辛基': 'Helsinki', '雷克雅未克': 'Reykjavik', '里斯本': 'Lisbon', '波尔图': 'Porto',
  '雅典': 'Athens', '伊斯坦布尔': 'Istanbul', '特拉维夫': 'Tel Aviv', '迪拜': 'Dubai',
  '阿布扎比': 'Abu Dhabi', '多哈': 'Doha', '利雅得': 'Riyadh', '开罗': 'Cairo', '开普敦': 'Cape Town',
  '约翰内斯堡': 'Johannesburg', '拉各斯': 'Lagos', '内罗毕': 'Nairobi', '卡萨布兰卡': 'Casablanca',
  '圣保罗': 'São Paulo', '里约热内卢': 'Rio de Janeiro', '布宜诺斯艾利斯': 'Buenos Aires',
  '墨西哥城': 'Mexico City', '圣地亚哥': 'Santiago', '利马': 'Lima', '波哥大': 'Bogotá',
  '蒙得维的亚': 'Montevideo', '圣何塞(哥斯达黎加)': 'San Jose, Costa Rica', '曼谷': 'Bangkok',
  '清迈': 'Chiang Mai', '吉隆坡': 'Kuala Lumpur', '槟城': 'George Town, Penang',
  '胡志明市': 'Ho Chi Minh City', '河内': 'Hanoi', '岘港': 'Da Nang', '马尼拉': 'Manila',
  '雅加达': 'Jakarta', '巴厘岛': 'Denpasar', '孟买': 'Mumbai', '德里': 'New Delhi',
  '班加罗尔': 'Bangalore', '海得拉巴': 'Hyderabad', '加尔各答': 'Kolkata', '拉合尔': 'Lahore',
  '卡拉奇': 'Karachi', '达卡': 'Dhaka', '加德满都': 'Kathmandu', '科伦坡': 'Colombo',
  '伊斯坦布尔': 'Istanbul', '安卡拉': 'Ankara', '莫斯科': 'Moscow', '圣彼得堡': 'Saint Petersburg',
  '基辅': 'Kyiv', '第比利斯': 'Tbilisi', '埃里温': 'Yerevan', '塔什干': 'Tashkent',
  '阿拉木图': 'Almaty', '仰光': 'Yangon', '金边': 'Phnom Penh', '乌兰巴托': 'Ulaanbaatar',
  '特拉维夫': 'Tel Aviv', '安曼': 'Amman', '贝鲁特': 'Beirut', '德黑兰': 'Tehran',
  '麦纳麦': 'Manama', '科威特城': 'Kuwait City', '马斯喀特': 'Muscat', '马累': 'Male',
  '路易港': 'Port Louis', '金斯敦': 'Kingston', '圣多明各': 'Santo Domingo',
  '布加勒斯特': 'Bucharest', '索菲亚': 'Sofia', '贝尔格莱德': 'Belgrade', '萨格勒布': 'Zagreb',
  '卢布尔雅那': 'Ljubljana', '布拉迪斯拉发': 'Bratislava', '维尔纽斯': 'Vilnius', '里加': 'Riga',
  '塔林': 'Tallinn', '卢森堡市': 'Luxembourg', '瓦莱塔': 'Valletta', '尼科西亚': 'Nicosia',
  '纳什维尔': 'Nashville', '丹佛': 'Denver', '奥斯汀': 'Austin', '亚特兰大': 'Atlanta',
  '凤凰城': 'Phoenix', '波特兰': 'Portland, Oregon', '圣地亚哥(美国)': 'San Diego',
  '拉斯维加斯': 'Las Vegas', '坦帕': 'Tampa', '休斯顿': 'Houston', '费城': 'Philadelphia',
  '圣何塞(美国)': 'San Jose, California', '南京': 'Nanjing', '天津': 'Tianjin', '苏州': 'Suzhou',
  '名古屋': 'Nagoya', '大阪': 'Osaka', '福冈': 'Fukuoka', '京都': 'Kyoto', '横滨': 'Yokohama',
  '汉堡': 'Hamburg', '慕尼黑': 'Munich', '法兰克福': 'Frankfurt', '科隆': 'Cologne',
  '斯图加特': 'Stuttgart', '里昂': 'Lyon', '马赛': 'Marseille', '尼斯': 'Nice', '图卢兹': 'Toulouse',
  '曼彻斯特': 'Manchester', '爱丁堡': 'Edinburgh', '伯明翰': 'Birmingham, UK', '格拉斯哥': 'Glasgow',
  '鹿特丹': 'Rotterdam', '米兰': 'Milan', '佛罗伦萨': 'Florence', '那不勒斯': 'Naples',
  '瓦伦西亚': 'Valencia, Spain', '塞维利亚': 'Seville', '格拉纳达': 'Granada, Spain',
  '克拉科夫': 'Kraków', '特里凡得琅': 'Thiruvananthapuram', '奈梅亨': 'Nijmegen',
  '日惹': 'Yogyakarta', '科钦': 'Kochi', '迭戈加西亚': 'Diego Garcia', '巴斯': 'Bath',
  '阿伯丁': 'Aberdeen', '贝尔法斯特': 'Belfast', '坎蒂': 'Cantabria',
};

async function nominatim(q) {
  await new Promise((r) => setTimeout(r, 1200)); // politeness
  const u = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`;
  const res = await fetch(u, { headers: { 'User-Agent': 'WhichCityResearch/1.0 (whichcity.run)' } });
  if (!res.ok) return null;
  const j = await res.json();
  if (!Array.isArray(j) || !j.length) return null;
  return { lat: parseFloat(j[0].lat), lon: parseFloat(j[0].lon), source: 'nominatim', displayName: j[0].display_name };
}

async function run() {
  const out = { ...cache };
  let done = 0;
  for (const c of src.cities) {
    if (out[c.id]?.lat != null) { done++; continue; }
    const en = enNameMap[c.name] || c.name;
    const cen = countryEN[c.country] || c.country;
    let q = `${en}, ${cen}`;
    let r = await nominatim(q);
    if (!r) { q = en; r = await nominatim(q); }
    if (!r) { console.warn(`MISS ${c.id} ${c.name} (${c.country})`); out[c.id] = { id: c.id, name: c.name, country: c.country, query: q }; continue; }
    out[c.id] = { id: c.id, name: c.name, country: c.country, lat: r.lat, lon: r.lon, source: r.source, displayName: r.displayName, query: q };
    done++;
    if (done % 10 === 0) {
      fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
      console.log(`[${done}/${src.cities.length}] ${c.name} -> ${r.lat.toFixed(3)}, ${r.lon.toFixed(3)}`);
    }
  }
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  const miss = Object.values(out).filter((v) => v.lat == null);
  console.log(`\nDone. Geocoded=${Object.values(out).filter((v) => v.lat != null).length}/${src.cities.length}, misses=${miss.length}`);
  if (miss.length) console.log('Missing:', miss.map((m) => `${m.id} ${m.name}`).join('; '));
}

run().catch((e) => { console.error(e); process.exit(1); });
