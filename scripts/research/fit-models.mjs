// WhichCity cost/rent research pipeline
// ======================================
// Ground truth: Numbeo city-page values (USD) calibrated via v1 appendix 7.2 to
// Livingcost "single person with rent" convention.  Used ONLY for evaluation.
//
// Inputs (all clean, non-Numbeo):
//   - mean occupational wage (BLS/ILO, city-level)
//   - BigMac price (country, The Economist)
//   - GNI per capita, GDP PPP per capita, HDI, inflation (World Bank)
//   - Direct-flight cities (OpenFlights-derived, city-level)
//   - Eurostat PLI (country, Eurostat)
//   - US RPP (city, BEA)
//   - Airbnb median nightly (city subset, InsideAirbnb CC-BY)
//   - Continent dummies
// Explicitly excluded: housePrice, monthlyRent, costModerate (Numbeo-derived)
//
// Algorithms: M1..M7 + stacking ensemble
// Validation: Leave-one-country-out to prevent data leakage

import fs from 'node:fs';
import path from 'node:path';

// ---------- Load raw data ----------
const src = JSON.parse(fs.readFileSync('data/cities-source.json', 'utf8'));
const nb = JSON.parse(fs.readFileSync('_archive/scripts-numbeo/numbeo-audit/fetched-data.json', 'utf8'));
const cmi = JSON.parse(fs.readFileSync('data/sources/cost-model-inputs.json', 'utf8'));
const ap = JSON.parse(fs.readFileSync('data/sources/airbnb-prices.json', 'utf8'));
const fx = JSON.parse(fs.readFileSync('public/data/exchange-rates.json', 'utf8')).rates;

const cityById = new Map(src.cities.map((c) => [c.id, c]));

// ---------- Ground truth (Numbeo -> LC calibration) ----------
function groundTruth(id) {
  const p = nb.cityPages[id];
  if (!p) return null;
  const sp = p.singlePersonMonthlyCost;
  const rc = p.rent1BRCenter;
  const ro = p.rent1BROutside;
  if (sp == null || rc == null || ro == null) return null;
  // v1 appendix 7.2: cost = 1.04 sp + 0.88 (0.05 rc + 0.95 ro);  rent = 0.68 (0.55 rc + 0.45 ro)
  const gtCost = 1.04 * sp + 0.88 * (0.05 * rc + 0.95 * ro);
  const gtRent = 0.68 * (0.55 * rc + 0.45 * ro);
  return { gtCost, gtRent, sp, rc, ro };
}

// ---------- Feature extraction ----------
function meanWage(city) {
  const vs = Object.values(city.professions || {}).filter((v) => typeof v === 'number' && v > 0);
  if (!vs.length) return null;
  vs.sort((a, b) => a - b);
  // trimmed mean (drop top/bottom 2) to suppress outliers
  const trimmed = vs.slice(2, -2);
  const m = trimmed.length ? trimmed : vs;
  return m.reduce((s, v) => s + v, 0) / m.length;
}

function airbnbUSD(id) {
  const row = ap.data?.[id];
  if (!row || !row.medianNightly || !row.localCurrency) return null;
  const rate = fx[row.localCurrency];
  if (!rate) return null;
  return row.medianNightly / rate;
}

const countryToISO = cmi.countryToISO;
function eurostatPLI(country) {
  const iso = countryToISO[country];
  if (!iso) return null;
  return cmi.eurostatPLI[iso] ?? null;
}
function usRPP(city) {
  return cmi.usRPP[city.name] ?? null;
}

// Baselines/constants from calibration anchors (chosen = NYC)
const NYC = cityById.get(1);
const NYC_wage = meanWage(NYC);
const NYC_bigmac = NYC.bigMacPrice;
const GT_NYC = groundTruth(1);
const P_NYC = GT_NYC.gtCost;   // ~$4,500 USD/month
const R_NYC = GT_NYC.gtRent;   // ~$2,360

// Assemble per-city record
const records = [];
for (const c of src.cities) {
  const gt = groundTruth(c.id);
  if (!gt) continue;
  const wage = meanWage(c);
  if (!wage) continue;
  records.push({
    id: c.id,
    name: c.name,
    country: c.country,
    continent: c.continent,
    wage,
    bigMac: c.bigMacPrice,
    gni: c.gniPerCapita,
    gdp: c.gdpPppPerCapita,
    hdi: c.hdi,
    flights: c.directFlightCities,
    airbnbUSD: airbnbUSD(c.id),
    pli: eurostatPLI(c.country),
    rpp: usRPP(c),
    gt,
  });
}
console.log(`Usable records: ${records.length}`);

// ---------- Algorithms ----------
// Each model exposes: train(samples) -> theta; predict(theta, record) -> {cost, rent}
// All models predict in log-space then exp.

function median(arr) {
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
function mean(arr) { return arr.reduce((a, b) => a + b, 0) / arr.length; }
function std(arr) { const m = mean(arr); return Math.sqrt(mean(arr.map((x) => (x - m) ** 2))); }
function quantile(arr, q) {
  const s = [...arr].sort((a, b) => a - b);
  const pos = (s.length - 1) * q;
  const lo = Math.floor(pos), hi = Math.ceil(pos);
  if (lo === hi) return s[lo];
  return s[lo] + (s[hi] - s[lo]) * (pos - lo);
}

// --- Simple OLS (Gram matrix solver, sufficient for <=20 features) ---
function solveOLS(X, y, lambda = 1e-6) {
  const n = X.length, p = X[0].length;
  const XtX = Array.from({ length: p }, () => Array(p).fill(0));
  const Xty = Array(p).fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < p; j++) {
      Xty[j] += X[i][j] * y[i];
      for (let k = 0; k < p; k++) XtX[j][k] += X[i][j] * X[i][k];
    }
  }
  for (let j = 0; j < p; j++) XtX[j][j] += lambda;
  // Gauss-Jordan
  const A = XtX.map((row, i) => [...row, Xty[i]]);
  for (let i = 0; i < p; i++) {
    // pivot
    let piv = i;
    for (let r = i + 1; r < p; r++) if (Math.abs(A[r][i]) > Math.abs(A[piv][i])) piv = r;
    [A[i], A[piv]] = [A[piv], A[i]];
    const d = A[i][i];
    if (Math.abs(d) < 1e-12) return Array(p).fill(0);
    for (let j = i; j <= p; j++) A[i][j] /= d;
    for (let r = 0; r < p; r++) if (r !== i) {
      const f = A[r][i];
      for (let j = i; j <= p; j++) A[r][j] -= f * A[i][j];
    }
  }
  return A.map((row) => row[p]);
}

// --- M1: Pure income power law ---  log P = a + b log wage
const M1 = {
  name: 'M1_income_power',
  train(S) {
    const X = S.map((r) => [1, Math.log(r.wage)]);
    const yC = S.map((r) => Math.log(r.gt.gtCost));
    const yR = S.map((r) => Math.log(r.gt.gtRent));
    return { bc: solveOLS(X, yC), br: solveOLS(X, yR) };
  },
  predict(t, r) {
    const lx = [1, Math.log(r.wage)];
    return {
      cost: Math.exp(lx[0] * t.bc[0] + lx[1] * t.bc[1]),
      rent: Math.exp(lx[0] * t.br[0] + lx[1] * t.br[1]),
    };
  },
};

// --- M2: Balassa-Samuelson two-component (analytic, theory-pinned) ---
// P = alpha * P_tradable + (1-alpha) * P_nontradable
// P_tradable ~= (bigMac/NYC_bigMac) * P_NYC
// P_nontradable ~= (wage/NYC_wage)^gamma * P_NYC
// alpha fit once, gamma fit once; no per-city coefficients
const M2 = {
  name: 'M2_Balassa_Samuelson',
  train(S) {
    // grid search alpha in [0.25, 0.55], gamma in [0.75, 1.05]
    let best = { err: Infinity };
    for (let a = 0.2; a <= 0.6; a += 0.02)
      for (let g = 0.7; g <= 1.1; g += 0.02) {
        const errs = S.map((r) => {
          const bm = r.bigMac ? r.bigMac / NYC_bigmac : 1;
          const nt = Math.pow(r.wage / NYC_wage, g);
          const hat = (a * bm + (1 - a) * nt) * P_NYC;
          return Math.abs(Math.log(hat) - Math.log(r.gt.gtCost));
        });
        const m = median(errs);
        if (m < best.err) best = { err: m, a, g };
      }
    // Rent: P_nontradable shifted. Rent = wageElasticity^g' * R_NYC (rent is pure non-tradable)
    let bestR = { err: Infinity };
    for (let g = 0.8; g <= 1.3; g += 0.02) {
      const errs = S.map((r) => {
        const hat = Math.pow(r.wage / NYC_wage, g) * R_NYC;
        return Math.abs(Math.log(hat) - Math.log(r.gt.gtRent));
      });
      const m = median(errs);
      if (m < bestR.err) bestR = { err: m, g };
    }
    return { a: best.a, g: best.g, gr: bestR.g };
  },
  predict(t, r) {
    const bm = r.bigMac ? r.bigMac / NYC_bigmac : 1;
    const nt = Math.pow(r.wage / NYC_wage, t.g);
    const cost = (t.a * bm + (1 - t.a) * nt) * P_NYC;
    const rent = Math.pow(r.wage / NYC_wage, t.gr) * R_NYC;
    return { cost, rent };
  },
};

// --- M3: Multi-feature log-linear (ridge) ---
// Uses: wage, bigMac, gni, hdi, flights, continent dummy
const CONTINENTS = ['北美洲', '欧洲', '亚洲', '大洋洲', '南美洲', '非洲'];
function safeLog(x, def = 0) { return x && x > 0 ? Math.log(x) : def; }
function feat3(r) {
  const contVec = CONTINENTS.map((c) => (r.continent === c ? 1 : 0));
  return [
    1,
    Math.log(r.wage),
    safeLog(r.bigMac, Math.log(4.5)),
    safeLog(r.gni, Math.log(15000)),
    safeLog(r.hdi || 0.7, Math.log(0.7)),
    safeLog(r.flights || 50, Math.log(50)),
    ...contVec,
  ];
}
const M3 = {
  name: 'M3_multi_loglinear_ridge',
  train(S) {
    const X = S.map(feat3);
    const yC = S.map((r) => Math.log(r.gt.gtCost));
    const yR = S.map((r) => Math.log(r.gt.gtRent));
    return { bc: solveOLS(X, yC, 1.0), br: solveOLS(X, yR, 1.0) };
  },
  predict(t, r) {
    const x = feat3(r);
    return {
      cost: Math.exp(x.reduce((s, v, i) => s + v * t.bc[i], 0)),
      rent: Math.exp(x.reduce((s, v, i) => s + v * t.br[i], 0)),
    };
  },
};

// --- M4: Tiered regional-index cascade (v1 M12 preserved, clean inputs only) ---
// Tier1: US RPP (14 cities)  cost = a*RPP
// Tier2: Eurostat PLI  cost = b*PLI^p
// Tier3 fallback: M2 Balassa-Samuelson
const M4 = {
  name: 'M4_tiered_RPP_PLI',
  train(S) {
    // RPP tier: cost = a*RPP; fit a via least squares in log space
    const rppS = S.filter((r) => r.rpp);
    const pliS = S.filter((r) => r.pli && !r.rpp);
    const aRPP = rppS.length
      ? Math.exp(mean(rppS.map((r) => Math.log(r.gt.gtCost) - Math.log(r.rpp))))
      : 30;
    const aRPPr = rppS.length
      ? Math.exp(mean(rppS.map((r) => Math.log(r.gt.gtRent) - Math.log(r.rpp))))
      : 15;
    // PLI tier: log cost = c + p log(PLI); fit (c,p)
    let pliC = [Math.log(30), 1], pliR = [Math.log(15), 1];
    if (pliS.length >= 5) {
      const X = pliS.map((r) => [1, Math.log(r.pli)]);
      pliC = solveOLS(X, pliS.map((r) => Math.log(r.gt.gtCost)));
      pliR = solveOLS(X, pliS.map((r) => Math.log(r.gt.gtRent)));
    }
    const bsTheta = M2.train(S);
    return { aRPP, aRPPr, pliC, pliR, bsTheta };
  },
  predict(t, r) {
    if (r.rpp) return { cost: t.aRPP * r.rpp, rent: t.aRPPr * r.rpp };
    if (r.pli) return {
      cost: Math.exp(t.pliC[0] + t.pliC[1] * Math.log(r.pli)),
      rent: Math.exp(t.pliR[0] + t.pliR[1] * Math.log(r.pli)),
    };
    return M2.predict(t.bsTheta, r);
  },
};

// --- M5: Airbnb-anchored (clean InsideAirbnb + fallback) ---
// log cost = a + b log airbnbUSD;  log rent = c + d log airbnbUSD (Airbnb 24-30 day equivalent)
const M5 = {
  name: 'M5_airbnb_anchored',
  train(S) {
    const ab = S.filter((r) => r.airbnbUSD);
    if (ab.length < 8) return { fallback: M2.train(S) };
    const X = ab.map((r) => [1, Math.log(r.airbnbUSD)]);
    const bc = solveOLS(X, ab.map((r) => Math.log(r.gt.gtCost)));
    const br = solveOLS(X, ab.map((r) => Math.log(r.gt.gtRent)));
    return { bc, br, fallback: M2.train(S) };
  },
  predict(t, r) {
    if (r.airbnbUSD && t.bc) {
      const lx = Math.log(r.airbnbUSD);
      return {
        cost: Math.exp(t.bc[0] + t.bc[1] * lx),
        rent: Math.exp(t.br[0] + t.br[1] * lx),
      };
    }
    return M2.predict(t.fallback, r);
  },
};

// --- M6: kNN synthetic control on 8D standardized features ---
// Features: log(wage), log(bigMac), log(gni), hdi, log(flights+1), log(gdp), pli||gni, airbnb||wage
function knnFeat(r) {
  return [
    Math.log(r.wage),
    safeLog(r.bigMac, Math.log(4.5)),
    safeLog(r.gni, Math.log(15000)),
    r.hdi || 0.7,
    safeLog(r.flights || 50, Math.log(50)),
    safeLog(r.gdp, Math.log(30000)),
    safeLog(r.pli || (r.gni ? r.gni / 500 : 60), Math.log(80)),
    safeLog(r.airbnbUSD || (r.wage ? r.wage / 500 : 150), Math.log(150)),
  ];
}
const M6 = {
  name: 'M6_kNN_synthetic',
  train(S) {
    const F = S.map(knnFeat);
    const dim = F[0].length;
    const mu = Array(dim).fill(0), sd = Array(dim).fill(0);
    for (let d = 0; d < dim; d++) { mu[d] = mean(F.map((f) => f[d])); }
    for (let d = 0; d < dim; d++) { sd[d] = std(F.map((f) => f[d])) || 1; }
    const Fz = F.map((f) => f.map((v, d) => (v - mu[d]) / sd[d]));
    return { mu, sd, samples: S, Fz, k: 7 };
  },
  predict(t, r) {
    const f = knnFeat(r).map((v, d) => (v - t.mu[d]) / t.sd[d]);
    // same-country boost
    const dists = t.samples.map((s, i) => {
      const dd = f.reduce((acc, v, d) => acc + (v - t.Fz[i][d]) ** 2, 0);
      const boost = s.country === r.country ? 0.5 : 1.0;
      return { d: Math.sqrt(dd) * boost, s };
    });
    dists.sort((a, b) => a.d - b.d);
    const top = dists.slice(0, t.k);
    let wsum = 0, cNum = 0, rNum = 0;
    for (const { d, s } of top) {
      const w = 1 / (d * d + 0.05);
      wsum += w;
      cNum += w * Math.log(s.gt.gtCost);
      rNum += w * Math.log(s.gt.gtRent);
    }
    return { cost: Math.exp(cNum / wsum), rent: Math.exp(rNum / wsum) };
  },
};

// --- M7: Stacking (Ridge over M1..M6 predictions) ---
// Train M7 on OOF predictions; final weights sum-to-one via softmax of Ridge coefs.
const BASE_MODELS = [M1, M2, M3, M4, M5, M6];

function stackingTrain(S, oofPreds) {
  // oofPreds: array length |S|, each is {cost:[6 models], rent:[6 models]}
  const p = BASE_MODELS.length;
  // Ridge: minimize sum (log gt - sum_i w_i * log pred_i)^2 + lam * ||w||^2, weights non-neg via nnls approx
  const Xc = oofPreds.map((p) => p.cost.map(Math.log));
  const yc = S.map((r) => Math.log(r.gt.gtCost));
  const Xr = oofPreds.map((p) => p.rent.map(Math.log));
  const yr = S.map((r) => Math.log(r.gt.gtRent));
  const wc = solveOLS(Xc, yc, 0.5);
  const wr = solveOLS(Xr, yr, 0.5);
  // Project to non-negative + normalize (interpretable weights)
  const clip = (w) => {
    const v = w.map((x) => Math.max(0, x));
    const s = v.reduce((a, b) => a + b, 0);
    return s > 0 ? v.map((x) => x / s) : Array(p).fill(1 / p);
  };
  return { wc: clip(wc), wr: clip(wr), rawWc: wc, rawWr: wr };
}

// ---------- Leave-one-country-out CV ----------
function evaluate(records) {
  const countries = [...new Set(records.map((r) => r.country))];
  console.log(`Countries: ${countries.length}`);

  const perModelErrs = BASE_MODELS.map(() => ({ cost: [], rent: [] }));
  const oofPreds = new Array(records.length);

  for (const cc of countries) {
    const train = records.filter((r) => r.country !== cc);
    const test = records.filter((r) => r.country === cc);
    const thetas = BASE_MODELS.map((m) => m.train(train));
    for (const r of test) {
      const idx = records.indexOf(r);
      const preds = BASE_MODELS.map((m, i) => m.predict(thetas[i], r));
      oofPreds[idx] = {
        cost: preds.map((p) => p.cost),
        rent: preds.map((p) => p.rent),
      };
      for (let i = 0; i < BASE_MODELS.length; i++) {
        perModelErrs[i].cost.push(ape(preds[i].cost, r.gt.gtCost));
        perModelErrs[i].rent.push(ape(preds[i].rent, r.gt.gtRent));
      }
    }
  }

  // Stacking weights trained on full OOF
  const stackTheta = stackingTrain(records, oofPreds);
  const stackErrs = { cost: [], rent: [] };
  for (let i = 0; i < records.length; i++) {
    const op = oofPreds[i];
    const logC = op.cost.map(Math.log).reduce((s, v, j) => s + stackTheta.wc[j] * v, 0);
    const logR = op.rent.map(Math.log).reduce((s, v, j) => s + stackTheta.wr[j] * v, 0);
    stackErrs.cost.push(ape(Math.exp(logC), records[i].gt.gtCost));
    stackErrs.rent.push(ape(Math.exp(logR), records[i].gt.gtRent));
  }

  return { perModelErrs, stackErrs, stackTheta, oofPreds };
}

function ape(pred, gt) { return Math.abs(pred - gt) / gt; }
function mdape(errs) { return median(errs) * 100; }
function p90(errs) { return quantile(errs, 0.9) * 100; }
function r2(preds, gts) {
  const lp = preds.map(Math.log), lg = gts.map(Math.log);
  const mu = mean(lg);
  const ss_res = lp.reduce((s, v, i) => s + (v - lg[i]) ** 2, 0);
  const ss_tot = lg.reduce((s, v) => s + (v - mu) ** 2, 0);
  return 1 - ss_res / ss_tot;
}

// ---------- Run ----------
const { perModelErrs, stackErrs, stackTheta, oofPreds } = evaluate(records);

console.log('\n===== Cost MdAPE / P90 (leave-one-country-out) =====');
BASE_MODELS.forEach((m, i) => {
  console.log(`${m.name}  cost MdAPE=${mdape(perModelErrs[i].cost).toFixed(2)}%  P90=${p90(perModelErrs[i].cost).toFixed(2)}%  rent MdAPE=${mdape(perModelErrs[i].rent).toFixed(2)}%  P90=${p90(perModelErrs[i].rent).toFixed(2)}%`);
});
console.log(`STACK       cost MdAPE=${mdape(stackErrs.cost).toFixed(2)}%  P90=${p90(stackErrs.cost).toFixed(2)}%  rent MdAPE=${mdape(stackErrs.rent).toFixed(2)}%  P90=${p90(stackErrs.rent).toFixed(2)}%`);

console.log('\nStack weights (cost):');
BASE_MODELS.forEach((m, i) => console.log(`  ${m.name}: ${stackTheta.wc[i].toFixed(3)}`));
console.log('Stack weights (rent):');
BASE_MODELS.forEach((m, i) => console.log(`  ${m.name}: ${stackTheta.wr[i].toFixed(3)}`));

// Top errors for audit
const rows = records.map((r, i) => ({
  name: r.name,
  country: r.country,
  gtCost: r.gt.gtCost,
  gtRent: r.gt.gtRent,
  stackCost: Math.exp(oofPreds[i].cost.map(Math.log).reduce((s, v, j) => s + stackTheta.wc[j] * v, 0)),
  stackRent: Math.exp(oofPreds[i].rent.map(Math.log).reduce((s, v, j) => s + stackTheta.wr[j] * v, 0)),
}));
rows.forEach((r) => {
  r.errCost = (r.stackCost - r.gtCost) / r.gtCost * 100;
  r.errRent = (r.stackRent - r.gtRent) / r.gtRent * 100;
});
console.log('\n--- Top 10 worst cost errors (stacking) ---');
[...rows].sort((a, b) => Math.abs(b.errCost) - Math.abs(a.errCost)).slice(0, 10).forEach((r) => {
  console.log(`  ${r.name.padEnd(12)} ${r.country.padEnd(8)} gt=$${r.gtCost.toFixed(0)}  hat=$${r.stackCost.toFixed(0)}  err=${r.errCost.toFixed(1)}%`);
});
console.log('\n--- Top 10 worst rent errors (stacking) ---');
[...rows].sort((a, b) => Math.abs(b.errRent) - Math.abs(a.errRent)).slice(0, 10).forEach((r) => {
  console.log(`  ${r.name.padEnd(12)} ${r.country.padEnd(8)} gt=$${r.gtRent.toFixed(0)}  hat=$${r.stackRent.toFixed(0)}  err=${r.errRent.toFixed(1)}%`);
});

// R^2 log-log for each model
console.log('\n===== R^2 (log-log) =====');
BASE_MODELS.forEach((m, i) => {
  const pC = records.map((r, idx) => oofPreds[idx].cost[i]);
  const pR = records.map((r, idx) => oofPreds[idx].rent[i]);
  const gC = records.map((r) => r.gt.gtCost);
  const gR = records.map((r) => r.gt.gtRent);
  console.log(`${m.name}  R2_cost=${r2(pC, gC).toFixed(3)}  R2_rent=${r2(pR, gR).toFixed(3)}`);
});
const sC = rows.map((r) => r.stackCost), sR = rows.map((r) => r.stackRent);
const gC = rows.map((r) => r.gtCost), gR = rows.map((r) => r.gtRent);
console.log(`STACK       R2_cost=${r2(sC, gC).toFixed(3)}  R2_rent=${r2(sR, gR).toFixed(3)}`);

// Save model parameters
const finalThetas = BASE_MODELS.map((m) => m.train(records));
const out = {
  trainedAt: new Date().toISOString(),
  nRecords: records.length,
  stackWeightsCost: Object.fromEntries(BASE_MODELS.map((m, i) => [m.name, stackTheta.wc[i]])),
  stackWeightsRent: Object.fromEntries(BASE_MODELS.map((m, i) => [m.name, stackTheta.wr[i]])),
  M1: finalThetas[0],
  M2: finalThetas[1],
  M3: finalThetas[2],
  M4: finalThetas[3],
  M5: finalThetas[4],
  // M6 is kNN: keep samples list (id+gt only)
  M6_samples: records.map((r) => ({ id: r.id, name: r.name, country: r.country, gtCost: r.gt.gtCost, gtRent: r.gt.gtRent })),
  anchors: { NYC_wage, NYC_bigmac, P_NYC, R_NYC },
  metrics: {
    perModel: BASE_MODELS.map((m, i) => ({
      name: m.name,
      mdapeCost: mdape(perModelErrs[i].cost),
      p90Cost: p90(perModelErrs[i].cost),
      mdapeRent: mdape(perModelErrs[i].rent),
      p90Rent: p90(perModelErrs[i].rent),
    })),
    stack: {
      mdapeCost: mdape(stackErrs.cost), p90Cost: p90(stackErrs.cost),
      mdapeRent: mdape(stackErrs.rent), p90Rent: p90(stackErrs.rent),
    },
  },
};
fs.mkdirSync('data/sources/cost-models', { recursive: true });
fs.writeFileSync('data/sources/cost-models/trained.json', JSON.stringify(out, null, 2));
console.log('\nWrote data/sources/cost-models/trained.json');
