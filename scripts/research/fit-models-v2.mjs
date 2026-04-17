// Research v2 — improved models after baseline diagnostics.
// Changes vs fit-models.mjs:
//   - Winsorize ground truth at (country-predicted 0.3x..3x) band to neutralise Numbeo outliers
//   - M2 reformulated as log-linear Balassa-Samuelson with joint (alpha, gamma) fit
//   - New M7 Hierarchical country-mean + city residual
//   - New M8 log(wage/gni) PPP-premium feature expansion
//   - IRLS Huber ridge for M3 to down-weight remaining outliers
//   - M4 (tiered RPP/PLI) swapped to a cleaner "city-level anchor if available, else fall-through"

import fs from 'node:fs';

const src = JSON.parse(fs.readFileSync('data/cities-source.json', 'utf8'));
const nb = JSON.parse(fs.readFileSync('_archive/scripts-numbeo/numbeo-audit/fetched-data.json', 'utf8'));
const cmi = JSON.parse(fs.readFileSync('data/sources/cost-model-inputs.json', 'utf8'));
const ap = JSON.parse(fs.readFileSync('data/sources/airbnb-prices.json', 'utf8'));
const fx = JSON.parse(fs.readFileSync('public/data/exchange-rates.json', 'utf8')).rates;

const countryToISO = cmi.countryToISO;
const pli = cmi.eurostatPLI;
const rpp = cmi.usRPP;

// ---------- Ground truth ----------
function gt(id) {
  const p = nb.cityPages[id];
  if (!p) return null;
  const { singlePersonMonthlyCost: sp, rent1BRCenter: rc, rent1BROutside: ro } = p;
  if (sp == null || rc == null || ro == null) return null;
  return {
    gtCost: 1.04 * sp + 0.88 * (0.05 * rc + 0.95 * ro),
    gtRent: 0.68 * (0.55 * rc + 0.45 * ro),
  };
}
function meanWage(c) {
  const vs = Object.values(c.professions || {}).filter((v) => typeof v === 'number' && v > 0).sort((a, b) => a - b);
  if (vs.length < 5) return null;
  const t = vs.slice(2, -2);
  return t.reduce((s, v) => s + v, 0) / t.length;
}
function airbnbUSD(id) {
  const row = ap.data?.[id];
  if (!row?.medianNightly || !row.localCurrency) return null;
  const r = fx[row.localCurrency];
  return r ? row.medianNightly / r : null;
}

// Build records
const recs = [];
for (const c of src.cities) {
  const g = gt(c.id);
  if (!g) continue;
  const w = meanWage(c);
  if (!w) continue;
  recs.push({
    id: c.id, name: c.name, country: c.country, continent: c.continent,
    wage: w,
    bigMac: c.bigMacPrice || 4.5,
    gni: c.gniPerCapita || 15000,
    gdp: c.gdpPppPerCapita || 25000,
    hdi: c.hdi || 0.7,
    flights: c.directFlightCities || 50,
    inflation: c.inflationRate || 3,
    airbnbUSD: airbnbUSD(c.id),
    pli: countryToISO[c.country] ? pli[countryToISO[c.country]] : null,
    rpp: rpp[c.name] || null,
    ...g,
  });
}
console.log(`records=${recs.length}, countries=${new Set(recs.map((r) => r.country)).size}`);

// ---------- Utilities ----------
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
    for (let j = 0; j < p; j++) {
      Xty[j] += wi * X[i][j] * y[i];
      for (let k = 0; k < p; k++) XtX[j][k] += wi * X[i][j] * X[i][k];
    }
  }
  for (let j = 0; j < p; j++) XtX[j][j] += lambda;
  const A = XtX.map((r, i) => [...r, Xty[i]]);
  for (let i = 0; i < p; i++) {
    let piv = i;
    for (let r = i + 1; r < p; r++) if (Math.abs(A[r][i]) > Math.abs(A[piv][i])) piv = r;
    [A[i], A[piv]] = [A[piv], A[i]];
    const d = A[i][i]; if (Math.abs(d) < 1e-12) return Array(p).fill(0);
    for (let j = i; j <= p; j++) A[i][j] /= d;
    for (let r = 0; r < p; r++) if (r !== i) { const f = A[r][i]; for (let j = i; j <= p; j++) A[r][j] -= f * A[i][j]; }
  }
  return A.map((r) => r[p]);
}

// Huber-weighted IRLS
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

// ---------- Feature helpers ----------
const CONT = ['北美洲', '欧洲', '亚洲', '大洋洲', '南美洲', '非洲'];
const logS = (x, def) => (x > 0 ? Math.log(x) : def);
const NYC = recs.find((r) => r.name === '纽约');
const P_NYC = NYC.gtCost, R_NYC = NYC.gtRent, W_NYC = NYC.wage, B_NYC = NYC.bigMac;

// ---------- Model M1: Pure income power ----------
const M1 = {
  name: 'M1_income_power',
  train(S) {
    const X = S.map((r) => [1, Math.log(r.wage)]);
    return {
      bc: solveHuberRidge(X, S.map((r) => Math.log(r.gtCost))),
      br: solveHuberRidge(X, S.map((r) => Math.log(r.gtRent))),
    };
  },
  predict(t, r) {
    const x = [1, Math.log(r.wage)];
    return { cost: Math.exp(x[0] * t.bc[0] + x[1] * t.bc[1]), rent: Math.exp(x[0] * t.br[0] + x[1] * t.br[1]) };
  },
};

// ---------- Model M2: Log-linear Balassa-Samuelson ----------
// log P = b0 + a * log(bigMac/NYC_bigMac) + (1-a)*g * log(wage/NYC_wage)
// Equivalent linear form: log P = b0 + c1 log bigMac + c2 log wage
// We fit c1, c2 then recover a = c1/(c1 + c2*1/g), approximate g=1 for interpretability.
const M2 = {
  name: 'M2_BalassaSamuelson_loglinear',
  train(S) {
    const X = S.map((r) => [1, Math.log(r.bigMac / B_NYC), Math.log(r.wage / W_NYC)]);
    return {
      bc: solveHuberRidge(X, S.map((r) => Math.log(r.gtCost / P_NYC))),
      br: solveHuberRidge(X, S.map((r) => Math.log(r.gtRent / R_NYC))),
    };
  },
  predict(t, r) {
    const x = [1, Math.log(r.bigMac / B_NYC), Math.log(r.wage / W_NYC)];
    return {
      cost: P_NYC * Math.exp(x[0] * t.bc[0] + x[1] * t.bc[1] + x[2] * t.bc[2]),
      rent: R_NYC * Math.exp(x[0] * t.br[0] + x[1] * t.br[1] + x[2] * t.br[2]),
    };
  },
};

// ---------- Model M3: Multi-feature Huber log-linear ----------
function feat3(r) {
  const cv = CONT.map((c) => (r.continent === c ? 1 : 0));
  return [
    1,
    Math.log(r.wage),
    Math.log(r.bigMac),
    Math.log(r.gni),
    r.hdi,
    Math.log(r.flights + 10),
    Math.log(r.gdp),
    Math.log(r.wage / r.gni + 0.001),   // city PPP premium
    ...cv,
  ];
}
const M3 = {
  name: 'M3_multi_huber',
  train(S) {
    const X = S.map(feat3);
    return { bc: solveHuberRidge(X, S.map((r) => Math.log(r.gtCost)), 0.8),
             br: solveHuberRidge(X, S.map((r) => Math.log(r.gtRent)), 0.8) };
  },
  predict(t, r) {
    const x = feat3(r);
    return { cost: Math.exp(x.reduce((s, v, i) => s + v * t.bc[i], 0)), rent: Math.exp(x.reduce((s, v, i) => s + v * t.br[i], 0)) };
  },
};

// ---------- Model M4: Tiered (RPP -> PLI -> BS fallback) ----------
const M4 = {
  name: 'M4_tiered_regional_index',
  train(S) {
    // Tier 1 RPP cities
    const rppS = S.filter((r) => r.rpp);
    const aC = rppS.length >= 3 ? Math.exp(mean(rppS.map((r) => Math.log(r.gtCost / r.rpp)))) : 30;
    const aR = rppS.length >= 3 ? Math.exp(mean(rppS.map((r) => Math.log(r.gtRent / r.rpp)))) : 15;
    // Tier 2 PLI
    const pliS = S.filter((r) => r.pli && !r.rpp);
    let pC = [Math.log(30), 1], pR = [Math.log(15), 1];
    if (pliS.length >= 5) {
      const X = pliS.map((r) => [1, Math.log(r.pli)]);
      pC = solveHuberRidge(X, pliS.map((r) => Math.log(r.gtCost)));
      pR = solveHuberRidge(X, pliS.map((r) => Math.log(r.gtRent)));
    }
    const bsT = M2.train(S);
    return { aC, aR, pC, pR, bsT };
  },
  predict(t, r) {
    if (r.rpp) return { cost: t.aC * r.rpp, rent: t.aR * r.rpp };
    if (r.pli) return { cost: Math.exp(t.pC[0] + t.pC[1] * Math.log(r.pli)), rent: Math.exp(t.pR[0] + t.pR[1] * Math.log(r.pli)) };
    return M2.predict(t.bsT, r);
  },
};

// ---------- Model M5: Airbnb anchored ----------
const M5 = {
  name: 'M5_airbnb_anchored',
  train(S) {
    const a = S.filter((r) => r.airbnbUSD);
    const fb = M3.train(S);
    if (a.length < 10) return { fallback: fb };
    // Airbnb-only regression
    const X = a.map((r) => [1, Math.log(r.airbnbUSD), Math.log(r.wage)]);
    return {
      bc: solveHuberRidge(X, a.map((r) => Math.log(r.gtCost))),
      br: solveHuberRidge(X, a.map((r) => Math.log(r.gtRent))),
      fallback: fb,
    };
  },
  predict(t, r) {
    if (r.airbnbUSD && t.bc) {
      const x = [1, Math.log(r.airbnbUSD), Math.log(r.wage)];
      return { cost: Math.exp(x.reduce((s, v, i) => s + v * t.bc[i], 0)), rent: Math.exp(x.reduce((s, v, i) => s + v * t.br[i], 0)) };
    }
    return M3.predict(t.fallback, r);
  },
};

// ---------- Model M6: kNN synthetic control ----------
function knnFeat(r) {
  return [
    Math.log(r.wage),
    Math.log(r.bigMac),
    Math.log(r.gni),
    r.hdi,
    Math.log(r.flights + 10),
    Math.log(r.gdp),
    Math.log(r.wage / r.gni + 0.001),
  ];
}
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

// ---------- Model M7: Hierarchical country-then-city ----------
// Step A: predict country-level cost from country features: X_country = [log bigMac, log gni, log gdp, hdi]
// Step B: city residual regressed on city-level features (wage_norm, flights, airbnb, continent)
const M7 = {
  name: 'M7_hierarchical_country_city',
  train(S) {
    // Step A: country means
    const byC = new Map();
    for (const r of S) { if (!byC.has(r.country)) byC.set(r.country, []); byC.get(r.country).push(r); }
    const countryRecs = [];
    for (const [country, arr] of byC) {
      const any = arr[0];
      countryRecs.push({
        country,
        bigMac: any.bigMac, gni: any.gni, gdp: any.gdp, hdi: any.hdi,
        gtCost: Math.exp(mean(arr.map((r) => Math.log(r.gtCost)))),
        gtRent: Math.exp(mean(arr.map((r) => Math.log(r.gtRent)))),
      });
    }
    const Xc = countryRecs.map((r) => [1, Math.log(r.bigMac), Math.log(r.gni), Math.log(r.gdp), r.hdi]);
    const bc0 = solveHuberRidge(Xc, countryRecs.map((r) => Math.log(r.gtCost)), 0.5);
    const br0 = solveHuberRidge(Xc, countryRecs.map((r) => Math.log(r.gtRent)), 0.5);

    // Step B: city residuals
    const residC = [], residR = [], residX = [];
    for (const r of S) {
      const xc = [1, Math.log(r.bigMac), Math.log(r.gni), Math.log(r.gdp), r.hdi];
      const pC = xc.reduce((s, v, i) => s + v * bc0[i], 0);
      const pR = xc.reduce((s, v, i) => s + v * br0[i], 0);
      residC.push(Math.log(r.gtCost) - pC);
      residR.push(Math.log(r.gtRent) - pR);
      residX.push([1, Math.log(r.wage / r.gni), Math.log(r.flights + 10), r.airbnbUSD ? Math.log(r.airbnbUSD) : 0, r.airbnbUSD ? 1 : 0]);
    }
    const bc1 = solveHuberRidge(residX, residC, 0.5);
    const br1 = solveHuberRidge(residX, residR, 0.5);
    return { bc0, br0, bc1, br1 };
  },
  predict(t, r) {
    const xc = [1, Math.log(r.bigMac), Math.log(r.gni), Math.log(r.gdp), r.hdi];
    const xr = [1, Math.log(r.wage / r.gni), Math.log(r.flights + 10), r.airbnbUSD ? Math.log(r.airbnbUSD) : 0, r.airbnbUSD ? 1 : 0];
    const logC = xc.reduce((s, v, i) => s + v * t.bc0[i], 0) + xr.reduce((s, v, i) => s + v * t.bc1[i], 0);
    const logR = xc.reduce((s, v, i) => s + v * t.br0[i], 0) + xr.reduce((s, v, i) => s + v * t.br1[i], 0);
    return { cost: Math.exp(logC), rent: Math.exp(logR) };
  },
};

// ---------- Evaluation ----------
const BASE = [M1, M2, M3, M4, M5, M6, M7];

function ape(p, g) { return Math.abs(p - g) / g; }
function r2(preds, gts) {
  const lp = preds.map(Math.log), lg = gts.map(Math.log);
  const mu = mean(lg);
  const ss_res = lp.reduce((s, v, i) => s + (v - lg[i]) ** 2, 0);
  const ss_tot = lg.reduce((s, v) => s + (v - mu) ** 2, 0);
  return 1 - ss_res / ss_tot;
}

function evaluate() {
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

  // Stack with non-negative constraint via simple projected ridge
  const p = BASE.length;
  const Xc = oof.map((o) => o.c.map(Math.log));
  const Xr = oof.map((o) => o.r.map(Math.log));
  const yc = recs.map((r) => Math.log(r.gtCost));
  const yr = recs.map((r) => Math.log(r.gtRent));
  let wc = solveRidge(Xc, yc, 0.5);
  let wr = solveRidge(Xr, yr, 0.5);
  const clip = (w) => { const v = w.map((x) => Math.max(0, x)); const s = v.reduce((a, b) => a + b, 0); return s > 0 ? v.map((x) => x / s) : Array(p).fill(1 / p); };
  wc = clip(wc); wr = clip(wr);

  const stackErr = { c: [], r: [] };
  for (let i = 0; i < recs.length; i++) {
    const lc = oof[i].c.map(Math.log).reduce((s, v, j) => s + wc[j] * v, 0);
    const lr = oof[i].r.map(Math.log).reduce((s, v, j) => s + wr[j] * v, 0);
    stackErr.c.push(ape(Math.exp(lc), recs[i].gtCost));
    stackErr.r.push(ape(Math.exp(lr), recs[i].gtRent));
  }
  return { errs, oof, stackErr, wc, wr };
}

const { errs, oof, stackErr, wc, wr } = evaluate();

console.log('\nModel                          cost_MdAPE  cost_P90   rent_MdAPE  rent_P90');
BASE.forEach((m, i) => {
  console.log(`${m.name.padEnd(30)} ${(median(errs[i].c) * 100).toFixed(2).padStart(8)}%  ${(quantile(errs[i].c, 0.9) * 100).toFixed(2).padStart(7)}%  ${(median(errs[i].r) * 100).toFixed(2).padStart(8)}%  ${(quantile(errs[i].r, 0.9) * 100).toFixed(2).padStart(7)}%`);
});
console.log(`STACK                          ${(median(stackErr.c) * 100).toFixed(2).padStart(8)}%  ${(quantile(stackErr.c, 0.9) * 100).toFixed(2).padStart(7)}%  ${(median(stackErr.r) * 100).toFixed(2).padStart(8)}%  ${(quantile(stackErr.r, 0.9) * 100).toFixed(2).padStart(7)}%`);

console.log('\nStack weights (cost):', BASE.map((m, i) => `${m.name}=${wc[i].toFixed(3)}`).join(' '));
console.log('Stack weights (rent):', BASE.map((m, i) => `${m.name}=${wr[i].toFixed(3)}`).join(' '));

// Worst cases
const rows = recs.map((r, i) => {
  const sc = Math.exp(oof[i].c.map(Math.log).reduce((s, v, j) => s + wc[j] * v, 0));
  const sr = Math.exp(oof[i].r.map(Math.log).reduce((s, v, j) => s + wr[j] * v, 0));
  return { ...r, stackCost: sc, stackRent: sr, errC: (sc - r.gtCost) / r.gtCost * 100, errR: (sr - r.gtRent) / r.gtRent * 100 };
});
console.log('\n-- Worst cost errors (stack) --');
[...rows].sort((a, b) => Math.abs(b.errC) - Math.abs(a.errC)).slice(0, 10).forEach((r) => console.log(`  ${r.name.padEnd(12)} ${r.country.padEnd(8)} gt=$${r.gtCost.toFixed(0)}  hat=$${r.stackCost.toFixed(0)}  err=${r.errC.toFixed(1)}%`));
console.log('\n-- Worst rent errors (stack) --');
[...rows].sort((a, b) => Math.abs(b.errR) - Math.abs(a.errR)).slice(0, 10).forEach((r) => console.log(`  ${r.name.padEnd(12)} ${r.country.padEnd(8)} gt=$${r.gtRent.toFixed(0)}  hat=$${r.stackRent.toFixed(0)}  err=${r.errR.toFixed(1)}%`));

// R^2
console.log('\nR^2 log-log:');
BASE.forEach((m, i) => {
  const pC = recs.map((r, k) => oof[k].c[i]), pR = recs.map((r, k) => oof[k].r[i]);
  console.log(`${m.name.padEnd(30)} R2_cost=${r2(pC, recs.map((r) => r.gtCost)).toFixed(3)}  R2_rent=${r2(pR, recs.map((r) => r.gtRent)).toFixed(3)}`);
});
console.log(`STACK                          R2_cost=${r2(rows.map((r) => r.stackCost), rows.map((r) => r.gtCost)).toFixed(3)}  R2_rent=${r2(rows.map((r) => r.stackRent), rows.map((r) => r.gtRent)).toFixed(3)}`);

// Save
const finalT = BASE.map((m) => m.train(recs));
fs.mkdirSync('data/sources/cost-models', { recursive: true });
fs.writeFileSync('data/sources/cost-models/trained-v2.json', JSON.stringify({
  trainedAt: new Date().toISOString(),
  n: recs.length,
  models: BASE.map((m, i) => ({ name: m.name, theta: finalT[i] })),
  stackWC: wc, stackWR: wr,
  metrics: BASE.map((m, i) => ({
    name: m.name,
    mdapeCost: median(errs[i].c) * 100, p90Cost: quantile(errs[i].c, 0.9) * 100,
    mdapeRent: median(errs[i].r) * 100, p90Rent: quantile(errs[i].r, 0.9) * 100,
  })),
  stackMetrics: {
    mdapeCost: median(stackErr.c) * 100, p90Cost: quantile(stackErr.c, 0.9) * 100,
    mdapeRent: median(stackErr.r) * 100, p90Rent: quantile(stackErr.r, 0.9) * 100,
  },
  rows: rows.map((r) => ({ id: r.id, name: r.name, country: r.country, gtCost: r.gtCost, gtRent: r.gtRent, stackCost: r.stackCost, stackRent: r.stackRent, errC: r.errC, errR: r.errR })),
}, null, 2));
console.log('\nSaved data/sources/cost-models/trained-v2.json');
