// Unified trust audit v2 — dual-GT (Numbeo + Livingcost) consistency cross-check.
// Extends 22-trust-audit.mjs with Livingcost as a second independent salary ground truth.
//
// New logic:
//   - Consistency ratio r_s = livingcost / numbeo (both monthly net USD).
//   - |ln r_s| > 0.4 (≈ >50% divergence between two sources) → demote city one tier.
//   - Cities with both GTs agreeing to ±25% earn a "dual-confirmed" salary stamp.

import fs from 'node:fs';
const calib = JSON.parse(fs.readFileSync('data/salary-research/calibration-ppp-to-nominal-net.json', 'utf8'));
function projectSalary(pppGross, { country, continent }) {
  const a = calib.countries[country]?.alpha ?? calib.continents[continent]?.alpha ?? calib.global.alpha;
  return pppGross * a;
}

const HIDDEN = new Set([38,54,56,77,79,80,81,83,84,91,92,94,95,96,97,99,100,105,107,109,110,114,115,116,118,119,120,127,128,131,135]);
const LOW_COST = new Set([52, 55, 112, 140, 147]);
const LOW_SAL = new Set([49, 50, 67, 68, 70, 112, 140, 147]);

const src = JSON.parse(fs.readFileSync('data/cities-source.json', 'utf8'));
const nb = JSON.parse(fs.readFileSync('_archive/scripts-numbeo/numbeo-audit/fetched-data.json', 'utf8'));
const salGT = JSON.parse(fs.readFileSync('data/sources/gt/numbeo-salary-gt.json', 'utf8'));
const livGT = JSON.parse(fs.readFileSync('data/sources/gt/livingcost-salary-gt.json', 'utf8'));
const trainedCost = JSON.parse(fs.readFileSync('data/sources/cost-models/trained-v4.json', 'utf8'));

const costOOF = new Map();
for (const p of trainedCost.predictions) costOOF.set(p.id, { errC: Math.abs(p.errC) / 100, errR: Math.abs(p.errR) / 100 });

function meanGross(c) {
  const e = Object.entries(c.professions || {}).filter(([k, v]) => k !== '数字游民' && typeof v === 'number' && v > 0);
  if (e.length < 10) return null;
  const vs = e.map(([, v]) => v).sort((a, b) => a - b);
  return vs.slice(2, -2).reduce((s, v) => s + v, 0) / (vs.length - 4);
}

// ===== Dual-GT salary consistency =====
const salConsistency = new Map(); // id → { numbeoUSD, livingcostUSD, lnRatio, absDivergencePct }
for (const c of src.cities) {
  const nbRow = salGT[c.id];
  const lvRow = livGT[c.id];
  if (!nbRow?.numbeoNetMonthlyUSD || !lvRow?.livingcostNetMonthlyUSD) continue;
  const n = nbRow.numbeoNetMonthlyUSD, l = lvRow.livingcostNetMonthlyUSD;
  const lnR = Math.log(l / n);
  salConsistency.set(c.id, {
    numbeoUSD: n,
    livingcostUSD: l,
    lnRatio: lnR,
    divergencePct: (Math.exp(Math.abs(lnR)) - 1) * 100,
  });
}

// ===== Salary algorithm validation: our computed → vs each GT =====
// We replicate the offline M3 calibration flow lightweight — read existing calibration
// table is not necessary here; we just need residual of our runtime salary vs GT.
// Use projectSalary() which applies PPP→nominal-net α. Feed it the mean-gross PPP$ and
// compare against Numbeo / Livingcost net USD.
function ourSalaryUSD(c) {
  const mean = meanGross(c);
  if (!mean) return null;
  // meanGross returns YEARLY PPP-gross USD. Divide by 12 then apply α.
  return projectSalary(mean / 12, { country: c.country, continent: c.continent });
}

const salResidual = new Map(); // id → { errVsNumbeo, errVsLiving, errVsBoth }
for (const c of src.cities) {
  const ours = ourSalaryUSD(c);
  if (ours == null) continue;
  const nb = salGT[c.id]?.numbeoNetMonthlyUSD;
  const lv = livGT[c.id]?.livingcostNetMonthlyUSD;
  const errNB = nb ? Math.abs(ours - nb) / nb : null;
  const errLV = lv ? Math.abs(ours - lv) / lv : null;
  const avgGT = nb && lv ? (nb + lv) / 2 : (nb || lv);
  const errAvg = avgGT ? Math.abs(ours - avgGT) / avgGT : null;
  salResidual.set(c.id, { ours, errVsNumbeo: errNB, errVsLiving: errLV, errVsAvg: errAvg });
}

const rows = [];
for (const c of src.cities) {
  if (HIDDEN.has(c.id)) continue;
  const hasCostGT = !!nb.cityPages[c.id]?.singlePersonMonthlyCost;
  const hasSalGTnb = !!salGT[c.id];
  const hasSalGTlv = !!livGT[c.id];
  const dualGT = hasSalGTnb && hasSalGTlv;
  const cons = salConsistency.get(c.id);
  const dualConfirmed = cons && cons.divergencePct <= 25;
  const dualDivergent = cons && cons.divergencePct > 50;
  const trustCost = !LOW_COST.has(c.id);
  const trustSal = !LOW_SAL.has(c.id);
  const oof = costOOF.get(c.id);
  const sr = salResidual.get(c.id);
  rows.push({
    id: c.id, name: c.name, country: c.country, continent: c.continent,
    hasCostGT, hasSalGTnb, hasSalGTlv, dualGT, dualConfirmed, dualDivergent,
    divergencePct: cons?.divergencePct ?? null,
    trustCost, trustSal,
    errCost: oof?.errC ?? null, errRent: oof?.errR ?? null,
    errSalNB: sr?.errVsNumbeo ?? null, errSalLV: sr?.errVsLiving ?? null, errSalAvg: sr?.errVsAvg ?? null,
  });
}

// ===== Tiers with dual-GT cross-check =====
function tier(r) {
  if (!r.trustCost || !r.trustSal) return 'D';
  if (!r.hasCostGT || !r.hasSalGTnb) return 'D';
  if (r.errCost == null || r.errRent == null) return 'D';
  // demote one tier if dual-GT disagrees strongly
  let base;
  if (r.errCost < 0.20 && r.errRent < 0.25) base = 'A';
  else if (r.errCost < 0.35 && r.errRent < 0.40) base = 'B';
  else base = 'C';
  if (r.dualDivergent) {
    if (base === 'A') return 'B';
    if (base === 'B') return 'C';
    return 'D';
  }
  // promote to A+ (gold with dual-confirm) — kept as A but flagged
  return base;
}
for (const r of rows) r.tier = tier(r);

const byTier = { A: [], B: [], C: [], D: [] };
for (const r of rows) byTier[r.tier].push(r);

const med = (arr) => { if (!arr.length) return null; const s = [...arr].sort((x, y) => x - y); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

console.log(`\n════ 综合可信度审计 v2（双 GT 源：Numbeo + Livingcost）════`);
console.log(`可见城市: ${rows.length}   Numbeo GT: ${rows.filter(r=>r.hasSalGTnb).length}   Livingcost GT: ${rows.filter(r=>r.hasSalGTlv).length}   双源: ${rows.filter(r=>r.dualGT).length}`);

const dualCovered = rows.filter(r => r.dualGT && r.divergencePct != null && Number.isFinite(r.divergencePct));
const divAll = dualCovered.map(r => r.divergencePct);
console.log(`\n—— 薪资双源一致性（|ln(LV/NB)| 分布，n=${dualCovered.length}）`);
console.log(`   中位差异: ${med(divAll).toFixed(1)}%  |  25 / 50 / 75 分位: ${[0.25,0.5,0.75].map(q=>{const s=[...divAll].sort((a,b)=>a-b);return s[Math.floor(q*s.length)].toFixed(1)+'%'}).join(' / ')}`);
console.log(`   ≤ 25% (双源确认): ${dualCovered.filter(r=>r.divergencePct<=25).length}   > 50% (显著背离): ${dualCovered.filter(r=>r.divergencePct>50).length}`);

console.log('\n┌──────────────┬─────┬────────┬────────┬────────┬────────┐');
console.log('│ 层级         │ 数量 │ cost   │ rent   │ salNB  │ salLV  │');
console.log('├──────────────┼─────┼────────┼────────┼────────┼────────┤');
for (const t of ['A', 'B', 'C', 'D']) {
  const ts = byTier[t];
  const ec = med(ts.map((r) => r.errCost).filter(x=>x!=null));
  const er = med(ts.map((r) => r.errRent).filter(x=>x!=null));
  const esN = med(ts.map((r) => r.errSalNB).filter(x=>x!=null));
  const esL = med(ts.map((r) => r.errSalLV).filter(x=>x!=null));
  const lbl = t === 'A' ? 'A 金' : t === 'B' ? 'B 银' : t === 'C' ? 'C 铜' : 'D 缺/低';
  const f = (v) => v != null ? (v * 100).toFixed(1).padStart(5) + '%' : '   --';
  console.log(`│ ${lbl.padEnd(10,' ')} │ ${ts.length.toString().padStart(3)} │ ${f(ec)} │ ${f(er)} │ ${f(esN)} │ ${f(esL)} │`);
}
console.log('└──────────────┴─────┴────────┴────────┴────────┴────────┘');

// 显著背离名单
const divergent = rows.filter(r => r.dualDivergent);
if (divergent.length) {
  console.log(`\n⚠ 双源背离 > 50%（需人工复查，n=${divergent.length}）：`);
  for (const r of divergent.sort((a,b)=>b.divergencePct-a.divergencePct)) {
    const c = salConsistency.get(r.id);
    console.log(`  ${r.name.padEnd(14,'　')}  NB $${c.numbeoUSD.toFixed(0).padStart(5)}  LV $${c.livingcostUSD.toFixed(0).padStart(5)}  差 ${r.divergencePct.toFixed(0)}%`);
  }
}

// 各层级名单
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

// ===== 策略对比 =====
const A = byTier.A.length, AB = A + byTier.B.length, ABC = AB + byTier.C.length, total = rows.length;

console.log(`\n╔═══════════════════════════════════════════════════════════════════╗`);
console.log(`║ 策略对比                          cost     rent     salNB   salLV ║`);
console.log(`╠═══════════════════════════════════════════════════════════════════╣`);
function agg(pool, lbl) {
  const ec = med(pool.map((r) => r.errCost).filter(x=>x!=null));
  const er = med(pool.map((r) => r.errRent).filter(x=>x!=null));
  const esN = med(pool.map((r) => r.errSalNB).filter(x=>x!=null));
  const esL = med(pool.map((r) => r.errSalLV).filter(x=>x!=null));
  const f = (v) => v != null ? (v * 100).toFixed(2).padStart(5) + '%' : '  --';
  console.log(`║ ${lbl.padEnd(34,' ')} ${f(ec)}  ${f(er)}  ${f(esN)}  ${f(esL)} ║`);
}
agg(rows, `S0 全 visible         (n=${total})`);
agg([...byTier.A, ...byTier.B, ...byTier.C], `S1 Tier A+B+C         (n=${ABC})`);
agg([...byTier.A, ...byTier.B], `S2 Tier A+B           (n=${AB})`);
agg(byTier.A, `S3 Tier A             (n=${A})`);
console.log(`╚═══════════════════════════════════════════════════════════════════╝`);

// Save
const out = {
  generatedAt: new Date().toISOString(),
  version: 'v2-dualGT',
  description: 'Trust audit v2: incorporates Livingcost as second independent salary GT for consistency cross-check. Tier demoted one level if dual-GT divergence > 50%.',
  rules: {
    LOW_CONFIDENCE_COST_CITY_IDS: [...LOW_COST],
    LOW_CONFIDENCE_SALARY_CITY_IDS: [...LOW_SAL],
    tierA: 'trust flags clear ∧ cost<20% ∧ rent<25% (demoted to B if dualDivergent)',
    tierB: 'trust flags clear ∧ cost<35% ∧ rent<40% (demoted to C if dualDivergent)',
    tierC: 'trust flags clear, any residual',
    tierD: 'missing GT or flagged',
  },
  dualGTCoverage: dualCovered.length,
  dualDivergentCount: divergent.length,
  tierCounts: { A: byTier.A.length, B: byTier.B.length, C: byTier.C.length, D: byTier.D.length, total },
  cities: rows.map((r) => ({
    id: r.id, name: r.name, country: r.country, continent: r.continent, tier: r.tier,
    trustCost: r.trustCost, trustSal: r.trustSal,
    hasCostGT: r.hasCostGT, hasSalGTnb: r.hasSalGTnb, hasSalGTlv: r.hasSalGTlv,
    dualConfirmed: r.dualConfirmed, dualDivergent: r.dualDivergent, divergencePct: r.divergencePct,
    errCost: r.errCost, errRent: r.errRent, errSalNB: r.errSalNB, errSalLV: r.errSalLV,
  })),
};
fs.writeFileSync('data/sources/gt/trust-audit.json', JSON.stringify(out, null, 2));
console.log('\nSaved → data/sources/gt/trust-audit.json');
