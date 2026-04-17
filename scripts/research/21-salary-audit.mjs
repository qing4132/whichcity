// WhichCity salary-algorithm audit vs Numbeo GT.
// Numbeo 'Average Monthly Net Salary (After Tax)' in USD nominal is our GT.
// Our stored professions[] are PPP$ gross annual.
// The ratio numbeo_net_usd_annual / our_mean_gross_PPP$ should be ~monotonic in
// country's nominal/PPP conversion factor × (1 - effective tax rate).
// Deviations from expected ratio reveal algorithm bias.

import fs from 'node:fs';

const src = JSON.parse(fs.readFileSync('data/cities-source.json', 'utf8'));
const gt = JSON.parse(fs.readFileSync('data/sources/gt/numbeo-salary-gt.json', 'utf8'));

const HIDDEN = new Set([38,54,56,77,79,80,81,83,84,91,92,94,95,96,97,99,100,105,107,109,110,114,115,116,118,119,120,127,128,131,135]);
const LOW_CONF_COST = new Set([52, 55, 112, 140, 147]);

// Compute trimmed mean of profession salaries (exclude hardcoded digital nomad)
function meanGrossPPP(c) {
  const entries = Object.entries(c.professions || {}).filter(([k, v]) => k !== '数字游民' && typeof v === 'number' && v > 0);
  if (entries.length < 10) return null;
  const vs = entries.map(([,v]) => v).sort((a, b) => a - b);
  // Trim 2 lowest + 2 highest to remove outliers (e.g. doctor $400k in US)
  const trimmed = vs.slice(2, -2);
  return trimmed.reduce((s, v) => s + v, 0) / trimmed.length;
}

function median(a) { const s = [...a].sort((x,y)=>x-y), m = Math.floor(s.length/2); return s.length % 2 ? s[m] : (s[m-1]+s[m])/2; }
function mean(a) { return a.reduce((s,v)=>s+v,0)/a.length; }
function std(a) { const m=mean(a); return Math.sqrt(mean(a.map(x=>(x-m)**2))); }
function quantile(a, q) { const s=[...a].sort((x,y)=>x-y), p=(s.length-1)*q, lo=Math.floor(p), hi=Math.ceil(p); return lo===hi?s[lo]:s[lo]+(s[hi]-s[lo])*(p-lo); }

// Build records
const recs = [];
for (const c of src.cities) {
  const g = gt[c.id];
  if (!g) continue;
  const ours = meanGrossPPP(c);
  if (!ours) continue;
  const numbeoAnnualUSD = g.numbeoNetMonthlyUSD * 12;
  recs.push({
    id: c.id,
    name: c.name,
    country: c.country,
    continent: c.continent,
    visible: !HIDDEN.has(c.id),
    trustedCost: !LOW_CONF_COST.has(c.id),
    ours,
    gt: numbeoAnnualUSD,
    gni: c.gniPerCapita || 15000,
    gdp: c.gdpPppPerCapita || 25000,
    hdi: c.hdi || 0.7,
    bigMac: c.bigMacPrice || 4.5,
    ratio: numbeoAnnualUSD / ours,
    logRatio: Math.log(numbeoAnnualUSD / ours),
  });
}

console.log(`Records with GT: ${recs.length} (visible: ${recs.filter(r=>r.visible).length})`);
console.log(`Mean ratio: ${mean(recs.map(r=>r.ratio)).toFixed(3)}   median: ${median(recs.map(r=>r.ratio)).toFixed(3)}`);
console.log(`StdDev of log ratio: ${std(recs.map(r=>r.logRatio)).toFixed(3)}\n`);

// ===== Ridge regression helpers =====
function solveRidge(X,y,lambda=0.1){const n=X.length,p=X[0].length;const A=Array.from({length:p},()=>Array(p+1).fill(0));for(let i=0;i<n;i++)for(let j=0;j<p;j++){A[j][p]+=X[i][j]*y[i];for(let k=0;k<p;k++)A[j][k]+=X[i][j]*X[i][k];}for(let j=0;j<p;j++)A[j][j]+=lambda;for(let i=0;i<p;i++){let piv=i;for(let r=i+1;r<p;r++)if(Math.abs(A[r][i])>Math.abs(A[piv][i]))piv=r;[A[i],A[piv]]=[A[piv],A[i]];const d=A[i][i];if(Math.abs(d)<1e-12)return Array(p).fill(0);for(let j=i;j<=p;j++)A[i][j]/=d;for(let r=0;r<p;r++)if(r!==i){const f=A[r][i];for(let j=i;j<=p;j++)A[r][j]-=f*A[i][j];}}return A.map(r=>r[p]);}
function solveHuber(X,y,lambda=0.3,delta=0.4,iter=12){let w=Array(X.length).fill(1);let beta=solveRidge(X,y,lambda);for(let t=0;t<iter;t++){const res=X.map((xi,i)=>y[i]-xi.reduce((s,v,j)=>s+v*beta[j],0));w=res.map((r)=>(Math.abs(r)<=delta?1:delta/Math.abs(r)));const A=Array.from({length:X[0].length},()=>Array(X[0].length+1).fill(0));for(let i=0;i<X.length;i++)for(let j=0;j<X[0].length;j++){A[j][X[0].length]+=w[i]*X[i][j]*y[i];for(let k=0;k<X[0].length;k++)A[j][k]+=w[i]*X[i][j]*X[i][k];}for(let j=0;j<X[0].length;j++)A[j][j]+=lambda;for(let i=0;i<X[0].length;i++){let piv=i;for(let r=i+1;r<X[0].length;r++)if(Math.abs(A[r][i])>Math.abs(A[piv][i]))piv=r;[A[i],A[piv]]=[A[piv],A[i]];const d=A[i][i];if(Math.abs(d)<1e-12)break;for(let j=i;j<=X[0].length;j++)A[i][j]/=d;for(let r=0;r<X[0].length;r++)if(r!==i){const f=A[r][i];for(let j=i;j<=X[0].length;j++)A[r][j]-=f*A[i][j];}}beta=A.map(r=>r[X[0].length]);}return beta;}

const CONT=['北美洲','欧洲','亚洲','大洋洲','南美洲','非洲'];
function feat(r){const cv=CONT.map((c)=>(r.continent===c?1:0));return[1,Math.log(r.gni),Math.log(r.gdp),r.hdi,Math.log(r.bigMac),...cv];}

// ===== LOCO-CV =====
function locoCV(pool, predict) {
  const countries = [...new Set(pool.map(r => r.country))];
  const errs = [];
  for (const cc of countries) {
    const tr = pool.filter(r => r.country !== cc);
    const te = pool.filter(r => r.country === cc);
    const model = predict.fit(tr);
    for (const r of te) {
      const pred = predict.pred(model, r);
      errs.push({ rec: r, pred, ae: Math.abs(pred - r.gt) / r.gt, le: Math.log(pred / r.gt) });
    }
  }
  return errs;
}

// ===== Candidate methods =====

// M0: raw — use our ours directly as prediction (current algorithm output, no adjustment)
//     This is clearly biased (PPP$ vs nominal USD mismatch) but is the "do-nothing" baseline.
const M0 = { fit: () => null, pred: (_, r) => r.ours };

// M1: single global scalar — α = median(numbeo/ours) across training cities
const M1 = {
  fit: (tr) => ({ alpha: Math.exp(median(tr.map(r => r.logRatio))) }),
  pred: (m, r) => m.alpha * r.ours,
};

// M2: continent-specific scalar — median ratio per continent
const M2 = {
  fit: (tr) => {
    const m = {};
    for (const c of CONT) {
      const sub = tr.filter(r => r.continent === c);
      m[c] = sub.length >= 3 ? Math.exp(median(sub.map(r => r.logRatio))) : Math.exp(median(tr.map(r => r.logRatio)));
    }
    return m;
  },
  pred: (m, r) => (m[r.continent] || 1) * r.ours,
};

// M3: ridge log-linear — log(numbeo) = log(ours) + β·features
const M3 = {
  fit: (tr) => {
    const X = tr.map(feat);
    const y = tr.map(r => r.logRatio);
    return { beta: solveHuber(X, y, 0.5) };
  },
  pred: (m, r) => {
    const x = feat(r);
    const lr = x.reduce((s, v, i) => s + v * m.beta[i], 0);
    return r.ours * Math.exp(lr);
  },
};

// M4: country-anchored — for each country use country mean log-ratio from training
const M4 = {
  fit: (tr) => {
    const byC = new Map();
    for (const r of tr) {
      if (!byC.has(r.country)) byC.set(r.country, []);
      byC.get(r.country).push(r.logRatio);
    }
    const cm = {};
    for (const [k, arr] of byC) cm[k] = Math.exp(mean(arr));
    const fallback = Math.exp(median(tr.map(r => r.logRatio)));
    return { cm, fallback };
  },
  pred: (m, r) => (m.cm[r.country] || m.fallback) * r.ours,
  // Note: M4 leaks information when target country has multiple cities in training; still valid LOCO
};

// M5: pure from-scratch — ignore our ours entirely, predict log(numbeo) from features
const M5 = {
  fit: (tr) => {
    const X = tr.map(feat);
    const y = tr.map(r => Math.log(r.gt));
    return { beta: solveHuber(X, y, 0.5) };
  },
  pred: (m, r) => {
    const x = feat(r);
    return Math.exp(x.reduce((s, v, i) => s + v * m.beta[i], 0));
  },
};

const METHODS = [
  ['M0 raw (current algo, no adj)', M0],
  ['M1 global scalar', M1],
  ['M2 continent scalar', M2],
  ['M3 ridge log-linear', M3],
  ['M4 country-anchored', M4],
  ['M5 from-scratch (ignore ours)', M5],
];

function report(label, errs) {
  const ae = errs.map(e => e.ae);
  const le = errs.map(e => e.le);
  const bias = mean(le);
  console.log(`${label.padEnd(38)}  n=${errs.length.toString().padStart(3)}  MdAPE=${(median(ae)*100).toFixed(2).padStart(6)}%  P90=${(quantile(ae,0.9)*100).toFixed(2).padStart(6)}%  bias(log)=${bias.toFixed(3).padStart(7)}  σ(log)=${std(le).toFixed(3)}`);
}

console.log('\n=== 方案对比 (在全部 143 城 LOCO-CV) ===\n');
for (const [label, method] of METHODS) {
  const errs = locoCV(recs, method);
  report(label, errs);
}

console.log('\n=== 方案对比 (仅可见 + 可信-cost 城市池) ===\n');
const trustedPool = recs.filter(r => r.visible && r.trustedCost);
console.log(`trusted pool n=${trustedPool.length}\n`);
for (const [label, method] of METHODS) {
  const errs = locoCV(trustedPool, method);
  report(label, errs);
}

// ===== Diagnose worst-fit cities (under M3 — best model) =====
console.log('\n=== 当前算法 (M0 raw) 拟合最差的 25 座城市 ===');
const m0errs = locoCV(recs, M0);
const worstRaw = [...m0errs].sort((a, b) => b.ae - a.ae).slice(0, 25);
console.log('名次  城市         国家         我们(gross PPP$/yr)  Numbeo(net nom$/yr)  比率   |err%|');
worstRaw.forEach((e, i) => {
  const r = e.rec;
  console.log(`${(i+1).toString().padStart(2)}. ${r.name.padEnd(12)} ${r.country.padEnd(10)} ${r.ours.toFixed(0).padStart(7)}  ${r.gt.toFixed(0).padStart(7)}  ${r.ratio.toFixed(3)}  ${(e.ae*100).toFixed(1)}%`);
});

console.log('\n=== 最佳重标定 (M3 ridge log-linear) 下仍然最差的 25 座城市 ===');
const m3errs = locoCV(recs, M3);
const worstM3 = [...m3errs].sort((a, b) => b.ae - a.ae).slice(0, 25);
console.log('名次  城市         国家         ours→ M3估计($)       Numbeo($)   |err%|  可见 可信');
worstM3.forEach((e, i) => {
  const r = e.rec;
  console.log(`${(i+1).toString().padStart(2)}. ${r.name.padEnd(12)} ${r.country.padEnd(10)} ${r.ours.toFixed(0).padStart(7)}→${e.pred.toFixed(0).padStart(7)}  ${r.gt.toFixed(0).padStart(7)}  ${(e.ae*100).toFixed(1)}%  ${r.visible?'Y':'·'}   ${r.trustedCost?'Y':'·'}`);
});

// ===== GT trustworthiness rules (same shape as cost/rent audit) =====
// Rule 1: numbeo net monthly > (gni_per_capita/12)*2.5 → small-sample Numbeo outlier in low-income country
// Rule 2: tourist-dominated cities (already known list)
const TOURIST = new Set(['巴厘岛', '普吉岛', '清迈', '马拉喀什', '雷克雅未克']);
function saltyGT(r) {
  const mgni = r.gni / 12;
  const numbeoMonthly = r.gt / 12;
  if (numbeoMonthly > mgni * 2.5) return `numbeo/mGNI=${(numbeoMonthly/mgni).toFixed(2)}>2.5`;
  if (numbeoMonthly < mgni * 0.15) return `numbeo/mGNI=${(numbeoMonthly/mgni).toFixed(2)}<0.15`;
  if (TOURIST.has(r.name)) return 'tourist-dominated';
  return null;
}
const flagged = recs.filter(r => r.visible && saltyGT(r));
console.log(`\n=== 独立 GT 可信度规则判定 (${flagged.length} / ${recs.filter(r=>r.visible).length} 可见城市) ===`);
flagged.forEach(r => console.log(`  ${r.name.padEnd(14)} ${r.country.padEnd(10)} ours=$${r.ours.toFixed(0).padStart(6)} numbeo=$${r.gt.toFixed(0).padStart(6)} gni=$${r.gni.toFixed(0).padStart(6)}  ${saltyGT(r)}`));

// ===== Final recommended metric: M3 on (visible ∩ trusted-cost ∩ trusted-salary-GT) =====
const trustedSalary = recs.filter(r => r.visible && r.trustedCost && !saltyGT(r));
console.log(`\n=== 推荐方案：M3 在 (可见 ∩ 可信 cost ∩ 可信 salary GT) = ${trustedSalary.length} 城 ===`);
const mErrs = locoCV(trustedSalary, M3);
report('M3 on trusted pool', mErrs);
const worstFinal = [...mErrs].sort((a,b)=>b.ae-a.ae).slice(0,15);
console.log('\n剩余最差 15 城 (算法层问题):');
worstFinal.forEach((e,i)=>console.log(`  ${(i+1).toString().padStart(2)}. ${e.rec.name.padEnd(12)} ${e.rec.country.padEnd(10)} err=${(e.ae*100).toFixed(1)}%  pred=$${e.pred.toFixed(0)} gt=$${e.rec.gt.toFixed(0)}`));

// Save summary JSON for report
const summary = {
  generatedAt: new Date().toISOString(),
  inputs: { totalCitiesWithGT: recs.length, visibleWithGT: recs.filter(r=>r.visible).length, trustedCostVisibleWithGT: trustedPool.length, trustedFullVisibleWithGT: trustedSalary.length },
  flaggedSalaryGT: flagged.map(r => ({ id: r.id, name: r.name, country: r.country, ours: r.ours, gt: r.gt, gni: r.gni, reason: saltyGT(r) })),
  methodsAllPool: METHODS.map(([label, m]) => {
    const errs = locoCV(recs, m);
    return { label, n: errs.length, mdape: median(errs.map(e=>e.ae))*100, p90: quantile(errs.map(e=>e.ae),0.9)*100, bias: mean(errs.map(e=>e.le)), sigma: std(errs.map(e=>e.le)) };
  }),
  methodsTrustedPool: METHODS.map(([label, m]) => {
    const errs = locoCV(trustedPool, m);
    return { label, n: errs.length, mdape: median(errs.map(e=>e.ae))*100, p90: quantile(errs.map(e=>e.ae),0.9)*100, bias: mean(errs.map(e=>e.le)), sigma: std(errs.map(e=>e.le)) };
  }),
  rawWorst25: worstRaw.map(e => ({ id: e.rec.id, name: e.rec.name, country: e.rec.country, ours: Math.round(e.rec.ours), gt: Math.round(e.rec.gt), ratio: e.rec.ratio, errAbs: e.ae })),
  finalWorst15: worstFinal.map(e => ({ id: e.rec.id, name: e.rec.name, country: e.rec.country, pred: Math.round(e.pred), gt: Math.round(e.rec.gt), errAbs: e.ae })),
};
fs.writeFileSync('data/sources/gt/salary-audit-summary.json', JSON.stringify(summary, null, 2));
console.log('\nSaved → data/sources/gt/salary-audit-summary.json');
