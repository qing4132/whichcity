// Trust audit v3 — 3-way comparison: WhichCity runtime vs Numbeo vs Livingcost.
// Numbeo & Livingcost are treated as REFERENCE samples, not ground truth.
//
// New rules:
//   - If NB and LV agree (≤25% divergence) and our value is far from both → we are wrong (red flag)
//   - If NB and LV disagree (>50%): check whether our value falls between them
//       • between → we are stable, likely arbitrating noisy samples correctly (neutral/good)
//       • outside range → we are wrong (red flag)
//   - If single source only: we must agree to ±30% to claim validation
//
// Output tier is based on our own error rather than NB/LV politics.

import fs from 'node:fs';

const HIDDEN = new Set([38,54,56,77,79,80,81,83,84,91,92,94,95,96,97,99,100,105,107,109,110,114,115,116,118,119,120,127,128,131,135]);
const LOW_COST = new Set([52, 55, 112, 140, 147]);
const LOW_SAL = new Set([49, 50, 67, 68, 70, 112, 140, 147]);

const src = JSON.parse(fs.readFileSync('data/cities-source.json', 'utf8'));
const nb = JSON.parse(fs.readFileSync('_archive/scripts-numbeo/numbeo-audit/fetched-data.json', 'utf8'));
const salNB = JSON.parse(fs.readFileSync('data/sources/gt/numbeo-salary-gt.json', 'utf8'));
const salLV = JSON.parse(fs.readFileSync('data/sources/gt/livingcost-salary-gt.json', 'utf8'));
const trainedCost = JSON.parse(fs.readFileSync('data/sources/cost-models/trained-v4.json', 'utf8'));
const calib = JSON.parse(fs.readFileSync('data/salary-research/calibration-ppp-to-nominal-net.json', 'utf8'));

const costOOF = new Map();
for (const p of trainedCost.predictions) costOOF.set(p.id, { errC: Math.abs(p.errC) / 100, errR: Math.abs(p.errR) / 100 });

function meanGross(c) {
  const e = Object.entries(c.professions || {}).filter(([k, v]) => k !== '数字游民' && typeof v === 'number' && v > 0);
  if (e.length < 10) return null;
  const vs = e.map(([, v]) => v).sort((a, b) => a - b);
  return vs.slice(2, -2).reduce((s, v) => s + v, 0) / (vs.length - 4);
}
function projectSalary(pppYearly, { country, continent }) {
  const a = calib.countries[country]?.alpha ?? calib.continents[continent]?.alpha ?? calib.global.alpha;
  return (pppYearly / 12) * a;
}

// ===== Classify each city's salary validation =====
function classifySalary(c) {
  const ours = (() => {
    const m = meanGross(c);
    return m ? projectSalary(m, c) : null;
  })();
  const nbv = salNB[c.id]?.numbeoNetMonthlyUSD ?? null;
  const lvv = salLV[c.id]?.livingcostNetMonthlyUSD ?? null;

  if (!ours) return { class: 'no-ours', ours, nbv, lvv, flag: null };
  if (!nbv && !lvv) return { class: 'no-reference', ours, nbv, lvv, flag: 'no-ref' };

  if (nbv && lvv) {
    const divPct = (Math.exp(Math.abs(Math.log(lvv / nbv))) - 1) * 100;
    if (divPct <= 25) {
      // refs agree → their mean is a reasonable anchor
      const ref = (nbv + lvv) / 2;
      const err = Math.abs(ours - ref) / ref;
      return {
        class: 'dual-agree',
        ours, nbv, lvv, divPct,
        err,
        flag: err > 0.40 ? 'we-wrong' : err > 0.25 ? 'we-off' : 'ok',
      };
    } else {
      // refs disagree → check if ours is in range
      const lo = Math.min(nbv, lvv), hi = Math.max(nbv, lvv);
      if (ours >= lo * 0.9 && ours <= hi * 1.1) {
        return { class: 'dual-disagree-ours-between', ours, nbv, lvv, divPct, flag: 'arbitrating' };
      }
      const ratio = ours > hi ? ours / hi : lo / ours;
      return {
        class: 'dual-disagree-ours-outside',
        ours, nbv, lvv, divPct,
        err: ratio - 1,
        flag: ratio > 1.5 ? 'we-wrong' : 'we-off',
      };
    }
  }

  // single reference only
  const ref = nbv ?? lvv;
  const err = Math.abs(ours - ref) / ref;
  return {
    class: nbv ? 'single-nb' : 'single-lv',
    ours, nbv, lvv,
    err,
    flag: err > 0.40 ? 'we-off' : 'ok',
  };
}

const rows = [];
for (const c of src.cities) {
  if (HIDDEN.has(c.id)) continue;
  const hasCostGT = !!nb.cityPages[c.id]?.singlePersonMonthlyCost;
  const trustCost = !LOW_COST.has(c.id);
  const trustSal = !LOW_SAL.has(c.id);
  const oof = costOOF.get(c.id);
  const sal = classifySalary(c);

  rows.push({
    id: c.id, name: c.name, country: c.country, continent: c.continent,
    hasCostGT, trustCost, trustSal,
    errCost: oof?.errC ?? null, errRent: oof?.errR ?? null,
    sal,
  });
}

// ===== New tier logic =====
// Tier A: cost<20% & rent<25% & salary-flag ∈ {ok, arbitrating}
// Tier B: cost<35% & rent<40% & salary-flag ∈ {ok, arbitrating, we-off}
// Tier C: cost model completes (has errCost) & salary has some reference
// Tier D: LOW_COST/LOW_SAL triggered, or no cost model, or no salary reference and errCost>30%
function tier(r) {
  if (!r.trustCost || !r.trustSal) return 'D';
  const salOK = ['ok', 'arbitrating'].includes(r.sal.flag);
  const salMarginal = r.sal.flag === 'we-off';
  const salBad = r.sal.flag === 'we-wrong';
  const costFail = r.errCost == null || r.errRent == null;
  if (costFail) return 'D';
  if (r.errCost < 0.20 && r.errRent < 0.25 && salOK) return 'A';
  if (r.errCost < 0.35 && r.errRent < 0.40 && !salBad) return 'B';
  if (r.errCost < 0.50 && r.errRent < 0.60 && !salBad) return 'C';
  return 'D';
}
for (const r of rows) r.tier = tier(r);

const byTier = { A: [], B: [], C: [], D: [] };
for (const r of rows) byTier[r.tier].push(r);

const med = (arr) => { if (!arr.length) return null; const s = [...arr].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

console.log(`\n════ 可信度审计 v3（NB/LV 作为参考样本而非 GT）════`);
console.log(`可见城市: ${rows.length}\n`);

// Sal classification breakdown
const byClass = {};
for (const r of rows) byClass[r.sal.class] = (byClass[r.sal.class] || 0) + 1;
const byFlag = {};
for (const r of rows) byFlag[r.sal.flag ?? 'n/a'] = (byFlag[r.sal.flag ?? 'n/a'] || 0) + 1;
console.log('薪资场景分布：', byClass);
console.log('薪资判定标签：', byFlag);

// Tier table
console.log('\n┌──────────┬─────┬────────┬────────┐');
console.log('│ 层级      │ 数量 │ cost   │ rent   │');
console.log('├──────────┼─────┼────────┼────────┤');
for (const t of ['A', 'B', 'C', 'D']) {
  const ts = byTier[t];
  const ec = med(ts.map((r) => r.errCost).filter((x) => x != null));
  const er = med(ts.map((r) => r.errRent).filter((x) => x != null));
  const lbl = t === 'A' ? 'A 金' : t === 'B' ? 'B 银' : t === 'C' ? 'C 铜' : 'D 差';
  const f = (v) => v != null ? (v * 100).toFixed(1).padStart(5) + '%' : '   --';
  console.log(`│ ${lbl.padEnd(8, ' ')} │ ${ts.length.toString().padStart(3)} │ ${f(ec)} │ ${f(er)} │`);
}
console.log('└──────────┴─────┴────────┴────────┘');

// Between cases (our model likely arbitrating noisy refs)
const arbitrating = rows.filter(r => r.sal.flag === 'arbitrating').sort((a, b) => b.sal.divPct - a.sal.divPct);
if (arbitrating.length) {
  console.log(`\n╭─ 双源分歧且我们居中（模型可能是最稳的参考，n=${arbitrating.length}）`);
  for (const r of arbitrating) {
    console.log(`│  ${r.name.padEnd(14, '　')} NB $${r.sal.nbv.toFixed(0).padStart(5)}  LV $${r.sal.lvv.toFixed(0).padStart(5)}  我们 $${r.sal.ours.toFixed(0).padStart(5)}  分歧 ${r.sal.divPct.toFixed(0)}%`);
  }
}

// Outside-range / we-wrong cases
const weWrong = rows.filter(r => r.sal.flag === 'we-wrong');
if (weWrong.length) {
  console.log(`\n╭─ 我们值明显偏离双源（n=${weWrong.length}，真实可疑）`);
  for (const r of weWrong) {
    const detail = r.sal.class === 'dual-agree'
      ? `NB=LV≈$${((r.sal.nbv+r.sal.lvv)/2).toFixed(0)}  我们 $${r.sal.ours.toFixed(0)}  err=${(r.sal.err*100).toFixed(0)}%`
      : `NB $${r.sal.nbv?.toFixed(0) ?? '-'}  LV $${r.sal.lvv?.toFixed(0) ?? '-'}  我们 $${r.sal.ours.toFixed(0)}`;
    console.log(`│  ${r.name.padEnd(14, '　')} ${detail}`);
  }
}

// Lists
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

// Strategies
const A = byTier.A.length, AB = A + byTier.B.length, ABC = AB + byTier.C.length;
console.log(`\n策略对比：`);
console.log(`  全部: ${rows.length}`);
console.log(`  Tier A+B+C: ${ABC}`);
console.log(`  Tier A+B:   ${AB}`);
console.log(`  Tier A:     ${A}`);

// Save
const out = {
  generatedAt: new Date().toISOString(),
  version: 'v3-threeway',
  rules: {
    salaryClassification: 'NB/LV are reference samples, not GT. ours between dual-disagree refs = arbitrating (good). ours far from dual-agree refs = we-wrong.',
    tierA: 'cost<20% & rent<25% & salary ∈ {ok, arbitrating}',
    tierB: 'cost<35% & rent<40% & salary not we-wrong',
    tierC: 'cost<50% & rent<60% & salary not we-wrong',
    tierD: 'otherwise or flagged',
  },
  tierCounts: { A: byTier.A.length, B: byTier.B.length, C: byTier.C.length, D: byTier.D.length, total: rows.length },
  cities: rows.map((r) => ({
    id: r.id, name: r.name, country: r.country, continent: r.continent, tier: r.tier,
    errCost: r.errCost, errRent: r.errRent,
    salClass: r.sal.class, salFlag: r.sal.flag,
    ourSalaryUSD: r.sal.ours, nbSalaryUSD: r.sal.nbv, lvSalaryUSD: r.sal.lvv,
    salDivPct: r.sal.divPct ?? null, salErr: r.sal.err ?? null,
  })),
};
fs.writeFileSync('data/sources/gt/trust-audit-v3.json', JSON.stringify(out, null, 2));
console.log('\nSaved → data/sources/gt/trust-audit-v3.json');
