// Research v3: add continent × wage interaction (M8) and develop a production ensemble.
// Final evaluation + writes lib-ready trained model JSON.

import fs from 'node:fs';

const src = JSON.parse(fs.readFileSync('data/cities-source.json', 'utf8'));
const nb = JSON.parse(fs.readFileSync('_archive/scripts-numbeo/numbeo-audit/fetched-data.json', 'utf8'));
const cmi = JSON.parse(fs.readFileSync('data/sources/cost-model-inputs.json', 'utf8'));
const ap = JSON.parse(fs.readFileSync('data/sources/airbnb-prices.json', 'utf8'));
const fx = JSON.parse(fs.readFileSync('public/data/exchange-rates.json', 'utf8')).rates;

const { countryToISO, eurostatPLI: pli, usRPP: rpp } = cmi;

function gt(id) {
  const p = nb.cityPages[id]; if (!p) return null;
  const { singlePersonMonthlyCost: sp, rent1BRCenter: rc, rent1BROutside: ro } = p;
  if (sp == null || rc == null || ro == null) return null;
  return { gtCost: 1.04 * sp + 0.88 * (0.05 * rc + 0.95 * ro), gtRent: 0.68 * (0.55 * rc + 0.45 * ro) };
}
function meanWage(c) {
  const vs = Object.values(c.professions || {}).filter((v) => typeof v === 'number' && v > 0).sort((a, b) => a - b);
  if (vs.length < 5) return null;
  const t = vs.slice(2, -2); return t.reduce((s, v) => s + v, 0) / t.length;
}
function airbnbUSD(id) {
  const r = ap.data?.[id]; if (!r?.medianNightly) return null;
  const rate = fx[r.localCurrency]; return rate ? r.medianNightly / rate : null;
}

const recs = [];
for (const c of src.cities) {
  const g = gt(c.id); if (!g) continue;
  const w = meanWage(c); if (!w) continue;
  recs.push({
    id: c.id, name: c.name, country: c.country, continent: c.continent,
    wage: w, bigMac: c.bigMacPrice || 4.5, gni: c.gniPerCapita || 15000,
    gdp: c.gdpPppPerCapita || 25000, hdi: c.hdi || 0.7, flights: c.directFlightCities || 50,
    airbnbUSD: airbnbUSD(c.id), pli: countryToISO[c.country] ? pli[countryToISO[c.country]] : null,
    rpp: rpp[c.name] || null, ...g,
  });
}
console.log(`records=${recs.length}, countries=${new Set(recs.map((r) => r.country)).size}`);

const median = (a) => { const s = [...a].sort((x, y) => x - y), m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;
const std = (a) => { const m = mean(a); return Math.sqrt(mean(a.map((x) => (x - m) ** 2))); };
const quantile = (a, q) => { const s = [...a].sort((x, y) => x - y), p = (s.length - 1) * q, lo = Math.floor(p), hi = Math.ceil(p); return lo === hi ? s[lo] : s[lo] + (s[hi] - s[lo]) * (p - lo); };

function solveRidge(X, y, lambda = 0.1, weights = null) {
  const n = X.length, p = X[0].length;
  const W = weights || Array(n).fill(1);
  const XtX = Array.from({ length: p }, () => Array(p).fill(0));
  const Xty = Array(p).fill(0);
  for (let i = 0; i < n; i++) {
    const wi = W[i];
    for (let j = 0; j < p; j++) { Xty[j] += wi * X[i][j] * y[i]; for (let k = 0; k < p; k++) XtX[j][k] += wi * X[i][j] * X[i][k]; }
  }
  for (let j = 0; j < p; j++) XtX[j][j] += lambda;
  const A = XtX.map((r, i) => [...r, Xty[i]]);
  for (let i = 0; i < p; i++) {
    let piv = i; for (let r = i + 1; r < p; r++) if (Math.abs(A[r][i]) > Math.abs(A[piv][i])) piv = r;
    [A[i], A[piv]] = [A[piv], A[i]];
    const d = A[i][i]; if (Math.abs(d) < 1e-12) return Array(p).fill(0);
    for (let j = i; j <= p; j++) A[i][j] /= d;
    for (let r = 0; r < p; r++) if (r !== i) { const f = A[r][i]; for (let j = i; j <= p; j++) A[r][j] -= f * A[i][j]; }
  }
  return A.map((r) => r[p]);
}
function solveHuberRidge(X, y, lambda = 0.3, delta = 0.4, iter = 12) {
  let w = Array(X.length).fill(1);
  let beta = solveRidge(X, y, lambda, w);
  for (let t = 0; t < iter; t++) {
    const res = X.map((xi, i) => y[i] - xi.reduce((s, v, j) => s + v * beta[j], 0));
    w = res.map((r) => (Math.abs(r) <= delta ? 1 : delta / Math.abs(r)));
    beta = solveRidge(X, y, lambda, w);
  }
  return beta;
}

const CONT = ['北美洲', '欧洲', '亚洲', '大洋洲', '南美洲', '非洲'];
const NYC = recs.find((r) => r.name === '纽约');
const P_NYC = NYC.gtCost, R_NYC = NYC.gtRent, W_NYC = NYC.wage, B_NYC = NYC.bigMac;

// --- M1 pure income ---
const M1 = {
  name: 'M1_income_power',
  train(S) {
    const X = S.map((r) => [1, Math.log(r.wage)]);
    return { bc: solveHuberRidge(X, S.map((r) => Math.log(r.gtCost))), br: solveHuberRidge(X, S.map((r) => Math.log(r.gtRent))) };
  },
  predict(t, r) { const x = [1, Math.log(r.wage)]; return { cost: Math.exp(x[0] * t.bc[0] + x[1] * t.bc[1]), rent: Math.exp(x[0] * t.br[0] + x[1] * t.br[1]) }; },
};

// --- M2 Balassa-Samuelson log-linear ---
const M2 = {
  name: 'M2_BalassaSamuelson',
  train(S) {
    const X = S.map((r) => [1, Math.log(r.bigMac / B_NYC), Math.log(r.wage / W_NYC)]);
    return { bc: solveHuberRidge(X, S.map((r) => Math.log(r.gtCost / P_NYC))), br: solveHuberRidge(X, S.map((r) => Math.log(r.gtRent / R_NYC))) };
  },
  predict(t, r) {
    const x = [1, Math.log(r.bigMac / B_NYC), Math.log(r.wage / W_NYC)];
    return { cost: P_NYC * Math.exp(x.reduce((s, v, i) => s + v * t.bc[i], 0)), rent: R_NYC * Math.exp(x.reduce((s, v, i) => s + v * t.br[i], 0)) };
  },
};

// --- M3 multi-feature Huber ridge ---
function feat3(r) {
  const cv = CONT.map((c) => (r.continent === c ? 1 : 0));
  return [1, Math.log(r.wage), Math.log(r.bigMac), Math.log(r.gni), r.hdi, Math.log(r.flights + 10), Math.log(r.gdp), Math.log(r.wage / r.gni + 0.001), ...cv];
}
const M3 = {
  name: 'M3_multi_huber',
  train(S) { const X = S.map(feat3); return { bc: solveHuberRidge(X, S.map((r) => Math.log(r.gtCost)), 0.8), br: solveHuberRidge(X, S.map((r) => Math.log(r.gtRent)), 0.8) }; },
  predict(t, r) { const x = feat3(r); return { cost: Math.exp(x.reduce((s, v, i) => s + v * t.bc[i], 0)), rent: Math.exp(x.reduce((s, v, i) => s + v * t.br[i], 0)) }; },
};

// --- M4 tiered regional index ---
const M4 = {
  name: 'M4_tiered_regional',
  train(S) {
    const rppS = S.filter((r) => r.rpp);
    const aC = rppS.length >= 3 ? Math.exp(mean(rppS.map((r) => Math.log(r.gtCost / r.rpp)))) : 30;
    const aR = rppS.length >= 3 ? Math.exp(mean(rppS.map((r) => Math.log(r.gtRent / r.rpp)))) : 15;
    const pliS = S.filter((r) => r.pli && !r.rpp);
    let pC = [Math.log(30), 1], pR = [Math.log(15), 1];
    if (pliS.length >= 5) { const X = pliS.map((r) => [1, Math.log(r.pli)]); pC = solveHuberRidge(X, pliS.map((r) => Math.log(r.gtCost))); pR = solveHuberRidge(X, pliS.map((r) => Math.log(r.gtRent))); }
    const bsT = M2.train(S);
    return { aC, aR, pC, pR, bsT };
  },
  predict(t, r) {
    if (r.rpp) return { cost: t.aC * r.rpp, rent: t.aR * r.rpp };
    if (r.pli) return { cost: Math.exp(t.pC[0] + t.pC[1] * Math.log(r.pli)), rent: Math.exp(t.pR[0] + t.pR[1] * Math.log(r.pli)) };
    return M2.predict(t.bsT, r);
  },
};

// --- M5 Airbnb anchored ---
const M5 = {
  name: 'M5_airbnb_anchored',
  train(S) {
    const a = S.filter((r) => r.airbnbUSD);
    const fb = M3.train(S);
    if (a.length < 10) return { fallback: fb };
    const X = a.map((r) => [1, Math.log(r.airbnbUSD), Math.log(r.wage)]);
    return { bc: solveHuberRidge(X, a.map((r) => Math.log(r.gtCost))), br: solveHuberRidge(X, a.map((r) => Math.log(r.gtRent))), fallback: fb };
  },
  predict(t, r) {
    if (r.airbnbUSD && t.bc) { const x = [1, Math.log(r.airbnbUSD), Math.log(r.wage)]; return { cost: Math.exp(x.reduce((s, v, i) => s + v * t.bc[i], 0)), rent: Math.exp(x.reduce((s, v, i) => s + v * t.br[i], 0)) }; }
    return M3.predict(t.fallback, r);
  },
};

// --- M6 kNN synthetic control ---
function knnFeat(r) { return [Math.log(r.wage), Math.log(r.bigMac), Math.log(r.gni), r.hdi, Math.log(r.flights + 10), Math.log(r.gdp), Math.log(r.wage / r.gni + 0.001)]; }
const M6 = {
  name: 'M6_kNN_synthetic',
  train(S) {
    const F = S.map(knnFeat);
    const mu = F[0].map((_, d) => mean(F.map((f) => f[d])));
    const sd = F[0].map((_, d) => std(F.map((f) => f[d])) || 1);
    const Fz = F.map((f) => f.map((v, d) => (v - mu[d]) / sd[d]));
    return { mu, sd, Fz, samples: S, k: 7 };
  },
  predict(t, r) {
    const f = knnFeat(r).map((v, d) => (v - t.mu[d]) / t.sd[d]);
    const ds = t.samples.map((s, i) => {
      const dd = Math.sqrt(f.reduce((a, v, d) => a + (v - t.Fz[i][d]) ** 2, 0));
      return { d: s.country === r.country ? dd * 0.5 : dd, s };
    }).sort((a, b) => a.d - b.d).slice(0, t.k);
    let W = 0, cN = 0, rN = 0;
    for (const { d, s } of ds) { const w = 1 / (d * d + 0.05); W += w; cN += w * Math.log(s.gtCost); rN += w * Math.log(s.gtRent); }
    return { cost: Math.exp(cN / W), rent: Math.exp(rN / W) };
  },
};

// --- M7 hierarchical country -> city ---
const M7 = {
  name: 'M7_hierarchical',
  train(S) {
    const byC = new Map();
    for (const r of S) { if (!byC.has(r.country)) byC.set(r.country, []); byC.get(r.country).push(r); }
    const cr = [];
    for (const [country, arr] of byC) { const any = arr[0]; cr.push({ country, bigMac: any.bigMac, gni: any.gni, gdp: any.gdp, hdi: any.hdi, gtCost: Math.exp(mean(arr.map((r) => Math.log(r.gtCost)))), gtRent: Math.exp(mean(arr.map((r) => Math.log(r.gtRent)))) }); }
    const Xc = cr.map((r) => [1, Math.log(r.bigMac), Math.log(r.gni), Math.log(r.gdp), r.hdi]);
    const bc0 = solveHuberRidge(Xc, cr.map((r) => Math.log(r.gtCost)), 0.5);
    const br0 = solveHuberRidge(Xc, cr.map((r) => Math.log(r.gtRent)), 0.5);
    const residC = [], residR = [], residX = [];
    for (const r of S) {
      const xc = [1, Math.log(r.bigMac), Math.log(r.gni), Math.log(r.gdp), r.hdi];
      residC.push(Math.log(r.gtCost) - xc.reduce((s, v, i) => s + v * bc0[i], 0));
      residR.push(Math.log(r.gtRent) - xc.reduce((s, v, i) => s + v * br0[i], 0));
      residX.push([1, Math.log(r.wage / r.gni), Math.log(r.flights + 10), r.airbnbUSD ? Math.log(r.airbnbUSD) : 0, r.airbnbUSD ? 1 : 0]);
    }
    return { bc0, br0, bc1: solveHuberRidge(residX, residC, 0.5), br1: solveHuberRidge(residX, residR, 0.5) };
  },
  predict(t, r) {
    const xc = [1, Math.log(r.bigMac), Math.log(r.gni), Math.log(r.gdp), r.hdi];
    const xr = [1, Math.log(r.wage / r.gni), Math.log(r.flights + 10), r.airbnbUSD ? Math.log(r.airbnbUSD) : 0, r.airbnbUSD ? 1 : 0];
    return {
      cost: Math.exp(xc.reduce((s, v, i) => s + v * t.bc0[i], 0) + xr.reduce((s, v, i) => s + v * t.bc1[i], 0)),
      rent: Math.exp(xc.reduce((s, v, i) => s + v * t.br0[i], 0) + xr.reduce((s, v, i) => s + v * t.br1[i], 0)),
    };
  },
};

// --- M8 continent × wage interaction ---
// log P = beta_0 + beta_cont[c] + beta_wage_cont[c] * log(wage) + beta_bm*log(bigMac) + beta_gni*log(gni)
function feat8(r) {
  const cv = CONT.map((c) => (r.continent === c ? 1 : 0));
  const wx = CONT.map((c) => (r.continent === c ? Math.log(r.wage) : 0));
  return [1, Math.log(r.bigMac), Math.log(r.gni), r.hdi, Math.log(r.flights + 10), Math.log(r.wage / r.gni + 0.001), ...cv, ...wx];
}
const M8 = {
  name: 'M8_continent_wage_interaction',
  train(S) {
    const X = S.map(feat8);
    return { bc: solveHuberRidge(X, S.map((r) => Math.log(r.gtCost)), 1.0), br: solveHuberRidge(X, S.map((r) => Math.log(r.gtRent)), 1.0) };
  },
  predict(t, r) { const x = feat8(r); return { cost: Math.exp(x.reduce((s, v, i) => s + v * t.bc[i], 0)), rent: Math.exp(x.reduce((s, v, i) => s + v * t.br[i], 0)) }; },
};

const BASE = [M1, M2, M3, M4, M5, M6, M7, M8];

function ape(p, g) { return Math.abs(p - g) / g; }
function r2(preds, gts) {
  const lp = preds.map(Math.log), lg = gts.map(Math.log);
  const mu = mean(lg);
  const ss_res = lp.reduce((s, v, i) => s + (v - lg[i]) ** 2, 0);
  const ss_tot = lg.reduce((s, v) => s + (v - mu) ** 2, 0);
  return 1 - ss_res / ss_tot;
}

const countries = [...new Set(recs.map((r) => r.country))];
const oof = new Array(recs.length);
const errs = BASE.map(() => ({ c: [], r: [] }));
for (const cc of countries) {
  const tr = recs.filter((r) => r.country !== cc);
  const te = recs.filter((r) => r.country === cc);
  const thetas = BASE.map((m) => m.train(tr));
  for (const r of te) {
    const idx = recs.indexOf(r);
    const preds = BASE.map((m, i) => m.predict(thetas[i], r));
    oof[idx] = { c: preds.map((p) => p.cost), r: preds.map((p) => p.rent) };
    preds.forEach((p, i) => { errs[i].c.push(ape(p.cost, r.gtCost)); errs[i].r.push(ape(p.rent, r.gtRent)); });
  }
}

const Xc = oof.map((o) => o.c.map(Math.log));
const Xr = oof.map((o) => o.r.map(Math.log));
let wcRaw = solveRidge(Xc, recs.map((r) => Math.log(r.gtCost)), 0.3);
let wrRaw = solveRidge(Xr, recs.map((r) => Math.log(r.gtRent)), 0.3);
const clip = (w) => { const v = w.map((x) => Math.max(0, x)); const s = v.reduce((a, b) => a + b, 0); return s > 0 ? v.map((x) => x / s) : Array(w.length).fill(1 / w.length); };
const wc = clip(wcRaw), wr = clip(wrRaw);

const stack = { c: [], r: [] };
for (let i = 0; i < recs.length; i++) {
  stack.c.push(ape(Math.exp(oof[i].c.map(Math.log).reduce((s, v, j) => s + wc[j] * v, 0)), recs[i].gtCost));
  stack.r.push(ape(Math.exp(oof[i].r.map(Math.log).reduce((s, v, j) => s + wr[j] * v, 0)), recs[i].gtRent));
}

console.log('\nModel                              cost_MdAPE  cost_P90   rent_MdAPE  rent_P90   R2_cost  R2_rent');
BASE.forEach((m, i) => {
  const pC = recs.map((r, k) => oof[k].c[i]), pR = recs.map((r, k) => oof[k].r[i]);
  console.log(`${m.name.padEnd(34)} ${(median(errs[i].c) * 100).toFixed(2).padStart(8)}%  ${(quantile(errs[i].c, 0.9) * 100).toFixed(2).padStart(7)}%  ${(median(errs[i].r) * 100).toFixed(2).padStart(8)}%  ${(quantile(errs[i].r, 0.9) * 100).toFixed(2).padStart(7)}%  ${r2(pC, recs.map((r) => r.gtCost)).toFixed(3)}  ${r2(pR, recs.map((r) => r.gtRent)).toFixed(3)}`);
});
console.log(`STACK                              ${(median(stack.c) * 100).toFixed(2).padStart(8)}%  ${(quantile(stack.c, 0.9) * 100).toFixed(2).padStart(7)}%  ${(median(stack.r) * 100).toFixed(2).padStart(8)}%  ${(quantile(stack.r, 0.9) * 100).toFixed(2).padStart(7)}%`);

console.log('\nStack weights (cost):', BASE.map((m, i) => `${m.name}=${wc[i].toFixed(3)}`).join(' '));
console.log('Stack weights (rent):', BASE.map((m, i) => `${m.name}=${wr[i].toFixed(3)}`).join(' '));

const rows = recs.map((r, i) => {
  const sc = Math.exp(oof[i].c.map(Math.log).reduce((s, v, j) => s + wc[j] * v, 0));
  const sr = Math.exp(oof[i].r.map(Math.log).reduce((s, v, j) => s + wr[j] * v, 0));
  return { ...r, stackCost: sc, stackRent: sr, errC: (sc - r.gtCost) / r.gtCost * 100, errR: (sr - r.gtRent) / r.gtRent * 100 };
});
console.log('\n-- Worst cost errors (stack) --');
[...rows].sort((a, b) => Math.abs(b.errC) - Math.abs(a.errC)).slice(0, 10).forEach((r) => console.log(`  ${r.name.padEnd(12)} ${r.country.padEnd(8)} gt=$${r.gtCost.toFixed(0)} hat=$${r.stackCost.toFixed(0)} err=${r.errC.toFixed(1)}%`));
console.log('\n-- Worst rent errors (stack) --');
[...rows].sort((a, b) => Math.abs(b.errR) - Math.abs(a.errR)).slice(0, 10).forEach((r) => console.log(`  ${r.name.padEnd(12)} ${r.country.padEnd(8)} gt=$${r.gtRent.toFixed(0)} hat=$${r.stackRent.toFixed(0)} err=${r.errR.toFixed(1)}%`));

// ---- Final: train on all data, save model ----
const finalT = BASE.map((m) => m.train(recs));
fs.writeFileSync('data/sources/cost-models/trained-v3.json', JSON.stringify({
  trainedAt: new Date().toISOString(),
  n: recs.length,
  anchors: { P_NYC, R_NYC, W_NYC, B_NYC },
  continents: CONT,
  models: BASE.map((m, i) => ({ name: m.name, theta: finalT[i] })),
  stackWC: wc, stackWR: wr,
  metrics: BASE.map((m, i) => ({
    name: m.name,
    mdapeCost: median(errs[i].c) * 100, p90Cost: quantile(errs[i].c, 0.9) * 100,
    mdapeRent: median(errs[i].r) * 100, p90Rent: quantile(errs[i].r, 0.9) * 100,
    r2cost: r2(recs.map((r, k) => oof[k].c[i]), recs.map((r) => r.gtCost)),
    r2rent: r2(recs.map((r, k) => oof[k].r[i]), recs.map((r) => r.gtRent)),
  })),
  stackMetrics: { mdapeCost: median(stack.c) * 100, p90Cost: quantile(stack.c, 0.9) * 100, mdapeRent: median(stack.r) * 100, p90Rent: quantile(stack.r, 0.9) * 100 },
  predictions: rows.map((r) => ({ id: r.id, name: r.name, country: r.country, gtCost: r.gtCost, gtRent: r.gtRent, stackCost: r.stackCost, stackRent: r.stackRent, errC: r.errC, errR: r.errR })),
}, null, 2));
console.log('\nSaved data/sources/cost-models/trained-v3.json');
