// Unified trust audit across salary, cost, rent.
// For each visible city compute:
//   - trust_cost:   boolean (not in LOW_CONFIDENCE_COST)
//   - trust_salary: boolean (not in LOW_CONFIDENCE_SALARY)
//   - hasGT_cost, hasGT_salary
//   - residual_cost (from trained-v4 OOF), residual_salary (from M3 LOCO-CV)
// Then produce composite "trust tier" per city and suggest cutoffs.

import fs from 'node:fs';

const HIDDEN = new Set([38,54,56,77,79,80,81,83,84,91,92,94,95,96,97,99,100,105,107,109,110,114,115,116,118,119,120,127,128,131,135]);
const LOW_COST = new Set([52, 55, 112, 140, 147]);
const LOW_SAL = new Set([49, 50, 67, 68, 70, 112, 140, 147]);

const src = JSON.parse(fs.readFileSync('data/cities-source.json', 'utf8'));
const nb = JSON.parse(fs.readFileSync('_archive/scripts-numbeo/numbeo-audit/fetched-data.json', 'utf8'));
const salGT = JSON.parse(fs.readFileSync('data/sources/gt/numbeo-salary-gt.json', 'utf8'));
const trainedCost = JSON.parse(fs.readFileSync('data/sources/cost-models/trained-v4.json', 'utf8'));

const costOOF = new Map();
for (const p of trainedCost.predictions) costOOF.set(p.id, { errC: Math.abs(p.errC) / 100, errR: Math.abs(p.errR) / 100 });

function meanGross(c) {
  const e = Object.entries(c.professions || {}).filter(([k, v]) => k !== '数字游民' && typeof v === 'number' && v > 0);
  if (e.length < 10) return null;
  const vs = e.map(([, v]) => v).sort((a, b) => a - b);
  return vs.slice(2, -2).reduce((s, v) => s + v, 0) / (vs.length - 4);
}

const rows = [];
for (const c of src.cities) {
  if (HIDDEN.has(c.id)) continue;
  const hasCostGT = !!nb.cityPages[c.id]?.singlePersonMonthlyCost;
  const hasSalGT = !!salGT[c.id];
  const ours = meanGross(c);
  const hasSalary = ours != null;
  const trustCost = !LOW_COST.has(c.id);
  const trustSal = !LOW_SAL.has(c.id);
  const oof = costOOF.get(c.id);
  rows.push({
    id: c.id, name: c.name, country: c.country, continent: c.continent,
    hasCostGT, hasSalGT, hasSalary, trustCost, trustSal,
    errCost: oof?.errC ?? null, errRent: oof?.errR ?? null,
  });
}

// ===== Trust tiers =====
// Tier A (GOLD):   trustCost ∧ trustSal ∧ hasCostGT ∧ hasSalGT ∧ errCost<0.20 ∧ errRent<0.25
// Tier B (SILVER): trustCost ∧ trustSal ∧ hasCostGT ∧ hasSalGT ∧ errCost<0.35 ∧ errRent<0.40
// Tier C (BRONZE): trustCost ∧ trustSal ∧ hasCostGT ∧ hasSalGT                           (any residual)
// Tier D:          缺 GT 或 命中 low-confidence 规则
function tier(r) {
  if (!r.trustCost || !r.trustSal) return 'D';
  if (!r.hasCostGT || !r.hasSalGT) return 'D';
  if (r.errCost == null || r.errRent == null) return 'D';
  if (r.errCost < 0.20 && r.errRent < 0.25) return 'A';
  if (r.errCost < 0.35 && r.errRent < 0.40) return 'B';
  return 'C';
}

for (const r of rows) r.tier = tier(r);

const byTier = { A: [], B: [], C: [], D: [] };
for (const r of rows) byTier[r.tier].push(r);

console.log(`可见城市总数: ${rows.length}\n`);
console.log('┌──────────────┬─────┬────────┬────────┐');
console.log('│ 层级          │ 数量 │ 成本评估 │ 租金评估 │');
console.log('├──────────────┼─────┼────────┼────────┤');
for (const t of ['A', 'B', 'C', 'D']) {
  const ts = byTier[t].filter((r) => r.errCost != null);
  const med = (arr) => { if (!arr.length) return null; const s = [...arr].sort((x, y) => x - y), m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
  const ec = med(ts.map((r) => r.errCost)), er = med(ts.map((r) => r.errRent));
  console.log(`│ ${t === 'A' ? 'A 金' : t === 'B' ? 'B 银' : t === 'C' ? 'C 铜' : 'D 缺/低'}       │ ${byTier[t].length.toString().padStart(3)} │ ${ec != null ? (ec * 100).toFixed(1).padStart(5) + '%' : '   --'} │ ${er != null ? (er * 100).toFixed(1).padStart(5) + '%' : '   --'} │`);
}
console.log('└──────────────┴─────┴────────┴────────┘');

// 各层级城市名单
for (const t of ['A', 'B', 'C', 'D']) {
  console.log(`\n━━━ Tier ${t} (${byTier[t].length} 城) ━━━`);
  const byCountry = new Map();
  for (const r of byTier[t]) {
    if (!byCountry.has(r.country)) byCountry.set(r.country, []);
    byCountry.get(r.country).push(r);
  }
  const items = [];
  for (const [cc, arr] of [...byCountry].sort((a, b) => a[0].localeCompare(b[0]))) {
    items.push(`${cc}: ${arr.map((r) => r.name).join('/')}`);
  }
  console.log('  ' + items.join('；'));
}

// 建议截取策略
const A = byTier.A.length;
const AB = byTier.A.length + byTier.B.length;
const ABC = byTier.A.length + byTier.B.length + byTier.C.length;
const totalVisible = rows.length;

console.log(`\n╔═══════════════════════════════════════════════════════════╗`);
console.log(`║ 建议截取策略对比                                          ║`);
console.log(`╠═══════════════════════════════════════════════════════════╣`);
console.log(`║                                             城数  覆盖率  ║`);
console.log(`║ S0 现状 (全 visible)                        ${totalVisible.toString().padStart(3)}   100.0% ║`);
console.log(`║ S1 Tier A+B+C (有 GT 且不触红线)            ${ABC.toString().padStart(3)}   ${(ABC/totalVisible*100).toFixed(1).padStart(5)}% ║`);
console.log(`║ S2 Tier A+B (残差 ≤35%/40%)                 ${AB.toString().padStart(3)}   ${(AB/totalVisible*100).toFixed(1).padStart(5)}% ║`);
console.log(`║ S3 Tier A 仅 (最严格, 残差 ≤20%/25%)         ${A.toString().padStart(3)}   ${(A/totalVisible*100).toFixed(1).padStart(5)}% ║`);
console.log(`╚═══════════════════════════════════════════════════════════╝`);

// 每种策略下的聚合 MdAPE
function agg(pool) {
  const ecs = pool.map((r) => r.errCost).filter((x) => x != null);
  const ers = pool.map((r) => r.errRent).filter((x) => x != null);
  const med = (arr) => { const s = [...arr].sort((x, y) => x - y), m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
  return { costMdAPE: med(ecs) * 100, rentMdAPE: med(ers) * 100, n: pool.length };
}
console.log('\n策略下的成本/租金 LOCO-CV MdAPE（薪资需单独重跑 — 略）:');
console.log(`  S0: n=${agg(rows).n}  cost=${agg(rows).costMdAPE.toFixed(2)}%  rent=${agg(rows).rentMdAPE.toFixed(2)}%`);
console.log(`  S1: n=${agg([...byTier.A, ...byTier.B, ...byTier.C]).n}  cost=${agg([...byTier.A, ...byTier.B, ...byTier.C]).costMdAPE.toFixed(2)}%  rent=${agg([...byTier.A, ...byTier.B, ...byTier.C]).rentMdAPE.toFixed(2)}%`);
console.log(`  S2: n=${agg([...byTier.A, ...byTier.B]).n}  cost=${agg([...byTier.A, ...byTier.B]).costMdAPE.toFixed(2)}%  rent=${agg([...byTier.A, ...byTier.B]).rentMdAPE.toFixed(2)}%`);
console.log(`  S3: n=${agg(byTier.A).n}  cost=${agg(byTier.A).costMdAPE.toFixed(2)}%  rent=${agg(byTier.A).rentMdAPE.toFixed(2)}%`);

// Save full trust roster
const out = {
  generatedAt: new Date().toISOString(),
  description: 'Per-city trustworthiness audit across salary, cost, rent. Tier A (gold) / B (silver) / C (bronze) / D (deficient or flagged). Based on (i) Numbeo/Livingcost GT availability, (ii) independent rule-based GT-trust flags, (iii) v4 cost-model LOCO-CV residuals.',
  rules: {
    LOW_CONFIDENCE_COST_CITY_IDS: [...LOW_COST],
    LOW_CONFIDENCE_SALARY_CITY_IDS: [...LOW_SAL],
    tierA: 'trust flags clear ∧ residuals (cost<20% ∧ rent<25%)',
    tierB: 'trust flags clear ∧ residuals (cost<35% ∧ rent<40%)',
    tierC: 'trust flags clear, any residual',
    tierD: 'missing GT or flagged',
  },
  tierCounts: { A: byTier.A.length, B: byTier.B.length, C: byTier.C.length, D: byTier.D.length, total: rows.length },
  cities: rows.map((r) => ({ id: r.id, name: r.name, country: r.country, continent: r.continent, tier: r.tier, trustCost: r.trustCost, trustSal: r.trustSal, hasCostGT: r.hasCostGT, hasSalGT: r.hasSalGT, errCost: r.errCost, errRent: r.errRent })),
};
fs.writeFileSync('data/sources/gt/trust-audit.json', JSON.stringify(out, null, 2));
console.log('\nSaved → data/sources/gt/trust-audit.json');
