import { readFileSync } from "fs";
const fx = JSON.parse(readFileSync("public/data/exchange-rates.json", "utf-8"));
const clean = JSON.parse(readFileSync("data/clean-pipeline/output/clean-values.json", "utf-8"));
const prod = JSON.parse(readFileSync("public/data/cities.json", "utf-8"));
const CNY = fx.rates.CNY;
const prodBy = new Map();
for (const c of prod.cities ?? prod) prodBy.set(c.name, c);

const toCNY = (u) => (u == null ? null : Math.round(u * CNY));
const fmt = (n) => (n == null ? "     -" : ("¥" + n.toLocaleString())).padStart(10);
const pct = (a, b) =>
  a == null || b == null || b === 0
    ? "   -"
    : ((a - b) / b) * 100 >= 0
    ? "+" + (((a - b) / b) * 100).toFixed(0) + "%"
    : (((a - b) / b) * 100).toFixed(0) + "%";

const pick = [
  "纽约", "旧金山", "洛杉矶", "华盛顿",
  "伦敦", "贝尔法斯特",
  "巴黎", "柏林", "米兰", "里斯本", "阿姆斯特丹", "马德里",
  "东京", "首尔", "新加坡", "香港",
  "多伦多", "温哥华", "蒙特利尔",
  "悉尼", "迪拜",
  "曼谷", "吉隆坡", "孟买", "胡志明市",
  "墨西哥城", "圣保罗", "开普敦",
];

console.log(`汇率  1 USD = ${CNY} CNY\n`);

console.log("════ costModerate（月消费，单身专业人士，CNY） ════");
console.log("城市         |     clean    |    2a19d87    |    Δ");
for (const nm of pick) {
  const c = clean.cities.find((x) => x.name === nm);
  const p = prodBy.get(nm);
  if (!c || !p) continue;
  console.log(
    `  ${nm.padEnd(10)} | ${fmt(toCNY(c.cost))} | ${fmt(toCNY(p.costModerate))}  | ${pct(c.cost, p.costModerate).padStart(6)}`,
  );
}

console.log("\n════ monthlyRent（1 居室月租，CNY） ════");
console.log("城市         |     clean    |    2a19d87    |    Δ    | clean 来源");
for (const nm of pick) {
  const c = clean.cities.find((x) => x.name === nm);
  const p = prodBy.get(nm);
  if (!c || !p) continue;
  console.log(
    `  ${nm.padEnd(10)} | ${fmt(toCNY(c.rent))} | ${fmt(toCNY(p.monthlyRent))}  | ${pct(c.rent, p.monthlyRent).padStart(6)}  | ${c.rentSource}`,
  );
}

console.log("\n════ housePrice（CNY / m²） ════");
console.log("城市         |     clean     |    2a19d87     |    Δ");
for (const nm of pick) {
  const c = clean.cities.find((x) => x.name === nm);
  const p = prodBy.get(nm);
  if (!c || !p) continue;
  console.log(
    `  ${nm.padEnd(10)} | ${fmt(toCNY(c.house))}  | ${fmt(toCNY(p.housePrice))}   | ${pct(c.house, p.housePrice).padStart(6)}`,
  );
}
