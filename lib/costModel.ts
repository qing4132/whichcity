// lib/costModel.ts — WhichCity production cost/rent estimator (v4)
// Trained: see scripts/research/fit-models-v4.mjs + data/sources/cost-models/trained-v4.json.
// Uses only non-Numbeo inputs; reports point estimate, CI, confidence flag, and
// per-method stacking weights for auditability.

import trained from '@/data/sources/cost-models/trained-v4.json';
import { LOW_CONFIDENCE_COST_CITY_IDS } from '@/lib/constants';

export interface CostModelInput {
  id?: number;
  name: string;
  country: string;
  continent: '北美洲' | '欧洲' | '亚洲' | '大洋洲' | '南美洲' | '非洲';
  wage: number;
  bigMac: number;
  gni: number;
  gdp: number;
  hdi: number;
  flights: number;
  airbnbUSD?: number | null;
  pli?: number | null;
  rpp?: number | null;
  // OSM POI counts in a 2km radius around the city centre (OpenStreetMap)
  osmCounts?: {
    dining: number; culture: number; health: number; edu: number;
    retail: number; finance: number; transit: number; tourism: number;
  } | null;
}

export interface CostModelOutput {
  cost: number;
  rent: number;
  ciLow: { cost: number; rent: number };
  ciHigh: { cost: number; rent: number };
  confidence: 'high' | 'medium' | 'low';
  methodWeights: { cost: Record<string, number>; rent: Record<string, number> };
}

const { anchors, continents, countryOsmMedian, models, stackWC, stackWR } = trained as any;
const { P_NYC, R_NYC, W_NYC, B_NYC } = anchors;
const CONT = continents as string[];
const OSM_MED: Record<string, number> = countryOsmMedian;

const dot = (x: number[], b: number[]) => x.reduce((s, v, i) => s + v * b[i], 0);

function osmFeat(r: CostModelInput) {
  const c = r.osmCounts; if (!c) return null;
  const total = c.dining + c.culture + c.health + c.edu + c.retail + c.finance + c.transit + c.tourism;
  if (total < 50) return null;
  const med = OSM_MED[r.country] || total;
  return {
    logRel: Math.log((total + 1) / (med + 1)),
    cultureShare: (c.culture + c.tourism) / (total + 1),
    diningShare: c.dining / (total + 1),
    financeShare: c.finance / (total + 1),
    transitShare: c.transit / (total + 1),
  };
}

function feat3(r: CostModelInput) {
  const cv = CONT.map((c) => (r.continent === c ? 1 : 0));
  return [1, Math.log(r.wage), Math.log(r.bigMac), Math.log(r.gni), r.hdi, Math.log(r.flights + 10), Math.log(r.gdp), Math.log(r.wage / r.gni + 0.001), ...cv];
}
function feat8(r: CostModelInput) {
  const cv = CONT.map((c) => (r.continent === c ? 1 : 0));
  const wx = CONT.map((c) => (r.continent === c ? Math.log(r.wage) : 0));
  return [1, Math.log(r.bigMac), Math.log(r.gni), r.hdi, Math.log(r.flights + 10), Math.log(r.wage / r.gni + 0.001), ...cv, ...wx];
}
function feat9(r: CostModelInput) {
  const base = feat3(r);
  const o = osmFeat(r);
  const e = o ? [o.logRel, o.cultureShare, o.diningShare, o.financeShare, 1] : [0, 0, 0, 0, 0];
  return [...base, ...e];
}
function feat10(r: CostModelInput) {
  const o = osmFeat(r);
  const tour = o ? o.cultureShare : 0;
  const tourInt = o ? o.cultureShare * Math.log(r.flights + 10) : 0;
  return [1, Math.log(r.wage), Math.log(r.bigMac), Math.log(r.flights + 10), tour, tourInt, o ? 1 : 0];
}
function knnFeat(r: CostModelInput) {
  return [Math.log(r.wage), Math.log(r.bigMac), Math.log(r.gni), r.hdi, Math.log(r.flights + 10), Math.log(r.gdp), Math.log(r.wage / r.gni + 0.001)];
}

type Theta = any; type Preds = { cost: number; rent: number };

const P: Array<(t: Theta, r: CostModelInput) => Preds> = [
  (t, r) => { const x = [1, Math.log(r.wage)]; return { cost: Math.exp(dot(x, t.bc)), rent: Math.exp(dot(x, t.br)) }; },
  (t, r) => { const x = [1, Math.log(r.bigMac / B_NYC), Math.log(r.wage / W_NYC)]; return { cost: P_NYC * Math.exp(dot(x, t.bc)), rent: R_NYC * Math.exp(dot(x, t.br)) }; },
  (t, r) => { const x = feat3(r); return { cost: Math.exp(dot(x, t.bc)), rent: Math.exp(dot(x, t.br)) }; },
  (t, r) => {
    if (r.rpp) return { cost: t.aC * r.rpp, rent: t.aR * r.rpp };
    if (r.pli) return { cost: Math.exp(t.pC[0] + t.pC[1] * Math.log(r.pli)), rent: Math.exp(t.pR[0] + t.pR[1] * Math.log(r.pli)) };
    const x = [1, Math.log(r.bigMac / B_NYC), Math.log(r.wage / W_NYC)];
    return { cost: P_NYC * Math.exp(dot(x, t.bsT.bc)), rent: R_NYC * Math.exp(dot(x, t.bsT.br)) };
  },
  (t, r) => {
    if (r.airbnbUSD && t.bc) { const x = [1, Math.log(r.airbnbUSD), Math.log(r.wage)]; return { cost: Math.exp(dot(x, t.bc)), rent: Math.exp(dot(x, t.br)) }; }
    const x = feat3(r); return { cost: Math.exp(dot(x, t.fallback.bc)), rent: Math.exp(dot(x, t.fallback.br)) };
  },
  (t, r) => {
    const f = knnFeat(r).map((v, d) => (v - t.mu[d]) / t.sd[d]);
    const ds = t.samples.map((s: any, i: number) => { const dd = Math.sqrt(f.reduce((a, v, d) => a + (v - t.Fz[i][d]) ** 2, 0)); return { d: s.country === r.country ? dd * 0.5 : dd, s }; }).sort((a: any, b: any) => a.d - b.d).slice(0, t.k);
    let W = 0, cN = 0, rN = 0;
    for (const { d, s } of ds as any[]) { const w = 1 / (d * d + 0.05); W += w; cN += w * Math.log(s.gtCost); rN += w * Math.log(s.gtRent); }
    return { cost: Math.exp(cN / W), rent: Math.exp(rN / W) };
  },
  (t, r) => { const xc = [1, Math.log(r.bigMac), Math.log(r.gni), Math.log(r.gdp), r.hdi]; const xr = [1, Math.log(r.wage / r.gni), Math.log(r.flights + 10), r.airbnbUSD ? Math.log(r.airbnbUSD) : 0, r.airbnbUSD ? 1 : 0]; return { cost: Math.exp(dot(xc, t.bc0) + dot(xr, t.bc1)), rent: Math.exp(dot(xc, t.br0) + dot(xr, t.br1)) }; },
  (t, r) => { const x = feat8(r); return { cost: Math.exp(dot(x, t.bc)), rent: Math.exp(dot(x, t.br)) }; },
  (t, r) => { const x = feat9(r); return { cost: Math.exp(dot(x, t.bc)), rent: Math.exp(dot(x, t.br)) }; },
  (t, r) => { const x = feat10(r); return { cost: Math.exp(dot(x, t.bc)), rent: Math.exp(dot(x, t.br)) }; },
];

function quantile(a: number[], q: number) { const s = [...a].sort((x, y) => x - y); const p = (s.length - 1) * q; const lo = Math.floor(p), hi = Math.ceil(p); return lo === hi ? s[lo] : s[lo] + (s[hi] - s[lo]) * (p - lo); }
function std(a: number[]) { const m = a.reduce((s, v) => s + v, 0) / a.length; return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / a.length); }

export function estimateCost(input: CostModelInput): CostModelOutput {
  const preds = models.map((m: any, i: number) => P[i](m.theta, input));
  const logC = preds.map((p: Preds) => Math.log(p.cost));
  const logR = preds.map((p: Preds) => Math.log(p.rent));
  const stackCost = Math.exp(logC.reduce((s: number, v: number, i: number) => s + stackWC[i] * v, 0));
  const stackRent = Math.exp(logR.reduce((s: number, v: number, i: number) => s + stackWR[i] * v, 0));
  const sdC = std(logC), sdR = std(logR);
  const spreadConfidence: 'high' | 'medium' | 'low' = sdC < 0.15 && sdR < 0.18 ? 'high' : sdC < 0.3 && sdR < 0.35 ? 'medium' : 'low';
  // Rule-based override: cities with known-untrustworthy GT are capped to 'low'
  // regardless of ensemble spread. See lib/constants.ts LOW_CONFIDENCE_COST_CITY_IDS.
  const confidence: 'high' | 'medium' | 'low' =
    input.id != null && LOW_CONFIDENCE_COST_CITY_IDS.has(input.id) ? 'low' : spreadConfidence;
  return {
    cost: Math.round(stackCost),
    rent: Math.round(stackRent),
    ciLow: { cost: Math.round(quantile(preds.map((p: Preds) => p.cost), 0.1)), rent: Math.round(quantile(preds.map((p: Preds) => p.rent), 0.1)) },
    ciHigh: { cost: Math.round(quantile(preds.map((p: Preds) => p.cost), 0.9)), rent: Math.round(quantile(preds.map((p: Preds) => p.rent), 0.9)) },
    confidence,
    methodWeights: {
      cost: Object.fromEntries(models.map((m: any, i: number) => [m.name, stackWC[i]])),
      rent: Object.fromEntries(models.map((m: any, i: number) => [m.name, stackWR[i]])),
    },
  };
}
