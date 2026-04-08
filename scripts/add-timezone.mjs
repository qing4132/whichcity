// Add IANA timezone to each city in cities.json
// Source: IANA Time Zone Database (https://www.iana.org/time-zones)
import { readFileSync, writeFileSync } from "fs";

const TIMEZONE_MAP = {
  // 美国
  1: "America/New_York",        // 纽约
  11: "America/Los_Angeles",    // 洛杉矶
  12: "America/Los_Angeles",    // 旧金山
  13: "America/Chicago",        // 芝加哥
  34: "America/New_York",       // 迈阿密
  35: "America/New_York",       // 华盛顿
  36: "America/New_York",       // 波士顿
  37: "America/Los_Angeles",    // 西雅图
  38: "America/Denver",         // 丹佛
  39: "America/Chicago",        // 奥斯汀
  95: "America/New_York",       // 亚特兰大
  96: "America/Phoenix",        // 凤凰城
  97: "America/Los_Angeles",    // 波特兰
  98: "America/Los_Angeles",    // 圣地亚哥(美)
  99: "America/Los_Angeles",    // 拉斯维加斯
  100: "America/New_York",      // 坦帕
  125: "America/Chicago",       // 休斯顿
  126: "America/New_York",      // 费城
  133: "America/Los_Angeles",   // 圣何塞(美)
  134: "America/Los_Angeles",   // 尔湾

  // 加拿大
  9: "America/Toronto",         // 多伦多
  40: "America/Vancouver",      // 温哥华
  41: "America/Montreal",       // 蒙特利尔
  127: "America/Edmonton",      // 卡尔加里
  135: "America/Toronto",       // 渥太华

  // 英国
  2: "Europe/London",           // 伦敦
  94: "Europe/London",          // 贝尔法斯特

  // 日本
  3: "Asia/Tokyo",              // 东京
  106: "Asia/Tokyo",            // 大阪
  107: "Asia/Tokyo",            // 名古屋
  138: "Asia/Tokyo",            // 福冈
  139: "Asia/Tokyo",            // 横滨

  // 中国
  4: "Asia/Shanghai",           // 北京
  5: "Asia/Shanghai",           // 上海
  101: "Asia/Shanghai",         // 广州
  102: "Asia/Shanghai",         // 深圳
  103: "Asia/Shanghai",         // 成都
  104: "Asia/Shanghai",         // 杭州
  105: "Asia/Shanghai",         // 重庆

  // 中国香港 / 台湾
  10: "Asia/Hong_Kong",         // 香港
  61: "Asia/Taipei",            // 台北

  // 澳大利亚
  6: "Australia/Sydney",        // 悉尼
  42: "Australia/Melbourne",    // 墨尔本
  43: "Australia/Brisbane",     // 布里斯班
  128: "Australia/Perth",       // 珀斯

  // 新西兰
  44: "Pacific/Auckland",       // 奥克兰

  // 新加坡
  7: "Asia/Singapore",          // 新加坡

  // 法国
  8: "Europe/Paris",            // 巴黎

  // 韩国
  59: "Asia/Seoul",             // 首尔
  60: "Asia/Seoul",             // 釜山
  108: "Asia/Seoul",            // 仁川

  // 欧洲
  15: "Europe/Amsterdam",       // 阿姆斯特丹
  16: "Europe/Zurich",          // 苏黎世
  17: "Europe/Zurich",          // 日内瓦
  18: "Europe/Berlin",          // 慕尼黑
  19: "Europe/Berlin",          // 柏林
  20: "Europe/Madrid",          // 巴塞罗那
  21: "Europe/Madrid",          // 马德里
  22: "Europe/Rome",            // 米兰
  23: "Europe/Rome",            // 罗马
  24: "Europe/Brussels",        // 布鲁塞尔
  25: "Europe/Vienna",          // 维也纳
  26: "Europe/Prague",          // 布拉格
  27: "Europe/Warsaw",          // 华沙
  28: "Europe/Lisbon",          // 里斯本
  29: "Europe/Athens",          // 雅典
  30: "Europe/Istanbul",        // 伊斯坦布尔
  85: "Europe/Kyiv",            // 基辅
  86: "Europe/Bucharest",       // 布加勒斯特
  87: "Europe/Sofia",           // 索非亚
  88: "Europe/Zagreb",          // 萨格勒布
  89: "Europe/Belgrade",        // 贝尔格莱德
  90: "Europe/Budapest",        // 布达佩斯
  91: "Europe/Bratislava",      // 布拉迪斯拉发
  92: "Europe/Ljubljana",       // 卢布尔雅那
  93: "Europe/Dublin",          // 都柏林
  121: "Europe/Stockholm",      // 斯德哥尔摩
  122: "Europe/Copenhagen",     // 哥本哈根
  123: "Europe/Helsinki",       // 赫尔辛基
  124: "Europe/Oslo",           // 奥斯陆
  132: "Europe/Moscow",         // 莫斯科
  136: "Europe/Luxembourg",     // 卢森堡市
  137: "Europe/Tallinn",        // 塔林

  // 中东
  14: "Asia/Dubai",             // 迪拜
  75: "Asia/Dubai",             // 阿布扎比
  76: "Asia/Qatar",             // 多哈
  77: "Asia/Bahrain",           // 麦纳麦
  78: "Asia/Riyadh",            // 利雅得
  79: "Asia/Muscat",            // 马斯喀特
  80: "Asia/Beirut",            // 贝鲁特
  81: "Asia/Amman",             // 安曼
  82: "Asia/Jerusalem",         // 特拉维夫

  // 南美
  31: "America/Mexico_City",    // 墨西哥城
  32: "America/Sao_Paulo",      // 圣保罗
  33: "America/Sao_Paulo",      // 里约热内卢
  62: "America/Argentina/Buenos_Aires", // 布宜诺斯艾利斯
  63: "America/Santiago",       // 圣地亚哥(智利)
  64: "America/Bogota",         // 波哥大
  65: "America/Lima",           // 利马
  69: "America/Mexico_City",    // 瓜达拉哈拉
  70: "America/Costa_Rica",     // 圣何塞(哥斯达黎加)
  71: "America/Panama",         // 巴拿马城
  73: "America/Puerto_Rico",    // 圣胡安
  129: "America/Bogota",        // 麦德林

  // 南亚
  49: "Asia/Kolkata",           // 班加罗尔
  50: "Asia/Kolkata",           // 孟买
  51: "Asia/Kolkata",           // 新德里
  83: "Asia/Kolkata",           // 海得拉巴
  84: "Asia/Kolkata",           // 浦那
  114: "Asia/Dhaka",            // 达卡
  115: "Asia/Colombo",          // 科伦坡
  116: "Asia/Kathmandu",        // 加德满都

  // 东南亚
  45: "Asia/Bangkok",           // 曼谷
  46: "Asia/Kuala_Lumpur",      // 吉隆坡
  47: "Asia/Ho_Chi_Minh",       // 胡志明市
  48: "Asia/Bangkok",           // 河内 (Vietnam uses ICT, same as Bangkok UTC+7)
  57: "Asia/Jakarta",           // 雅加达
  58: "Asia/Manila",            // 马尼拉
  109: "Asia/Phnom_Penh",       // 金边
  110: "Asia/Yangon",           // 仰光
  112: "Asia/Bangkok",          // 清迈

  // 非洲
  52: "Africa/Nairobi",         // 内罗毕
  53: "Africa/Cairo",           // 开罗
  67: "Africa/Johannesburg",    // 约翰内斯堡
  68: "Africa/Johannesburg",    // 开普敦
  131: "Africa/Lagos",          // 拉各斯

  // 中亚/高加索
  54: "Asia/Tehran",            // 德黑兰
  55: "Asia/Karachi",           // 卡拉奇
  56: "Asia/Karachi",           // 伊斯兰堡
  117: "Asia/Almaty",           // 阿拉木图
  118: "Asia/Tashkent",         // 塔什干
  119: "Asia/Baku",             // 巴库
  120: "Asia/Ulaanbaatar",      // 乌兰巴托
  130: "Asia/Tbilisi",          // 第比利斯
};

const path = new URL("../public/data/cities.json", import.meta.url);
const data = JSON.parse(readFileSync(path, "utf8"));

let added = 0, missing = [];
for (const city of data.cities) {
  const tz = TIMEZONE_MAP[city.id];
  if (tz) {
    city.timezone = tz;
    added++;
  } else {
    missing.push(`${city.id} ${city.name}`);
  }
}

writeFileSync(path, JSON.stringify(data, null, 2) + "\n", "utf8");
console.log(`Added timezone to ${added} cities`);
if (missing.length) console.log(`Missing: ${missing.join(", ")}`);
