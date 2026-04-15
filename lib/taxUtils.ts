/**
 * Tax calculation engine.
 * Computes net (after-tax) income from gross USD salary.
 */

import type { IncomeMode } from "./types";
import {
  COUNTRY_TAX, CITY_TAX_OVERRIDES, COUNTRY_CURRENCY_CODE,
  japanEmploymentDeduction, koreanEmploymentDeduction,
  type TaxBracket, type SocialComponent, type CountryTax, type CityTaxOverride,
} from "./taxData";

export type { IncomeMode };

export interface NetIncomeResult {
  netUSD: number;
  effectiveRate: number;   // 0–1 combined tax+social rate
  confidence: "high" | "medium" | "low";
  hasExpatScheme: boolean;
  dataIsLikelyNet?: boolean;  // true when salary data is already post-tax
}

export interface TaxBreakdownDetail {
  label: string;
  amount: number;  // positive
  rate?: string;   // e.g. "8.00%" — social component rate, displayed after translated label
  capped?: boolean; // true when annualBaseCap or annualAbsCap was applied
}

export interface TaxBreakdownSection {
  label: string;          // i18n key
  total: number;          // negative = deduction from gross
  details?: TaxBreakdownDetail[];
  isResult?: boolean;     // subtotal line (e.g. taxable income)
  isInfo?: boolean;       // informational, not a real deduction (e.g. tax-free allowance)
}

export interface TaxBreakdown {
  currencyCode: string;
  fxRate: number;
  grossLocal: number;
  grossUSD: number;
  sections: TaxBreakdownSection[];
  netLocal: number;
  netUSD: number;
  expatSchemeName?: string; // i18n key, e.g. "expatScheme30Ruling"
}

/* ── Progressive tax calculation ─────────────────────── */

function calcProgressive(taxable: number, brackets: TaxBracket[]): number {
  if (taxable <= 0) return 0;
  let tax = 0;
  let prev = 0;
  for (const b of brackets) {
    if (taxable <= prev) break;
    const sliceTop = Math.min(taxable, b.upTo);
    tax += (sliceTop - prev) * b.rate;
    prev = b.upTo;
  }
  return tax;
}

/* ── Social deduction calc ───────────────────────────── */

function calcSocial(grossLocal: number, components: SocialComponent[], overrides?: Record<string, Partial<SocialComponent>>): number {
  let total = 0;
  for (const comp of components) {
    const override = overrides?.[comp.name];
    const rate = override?.rate ?? comp.rate;
    const baseCap = override?.annualBaseCap ?? comp.annualBaseCap;
    const absCap = override?.annualAbsCap ?? comp.annualAbsCap;
    const floor = override?.annualFloor ?? comp.annualFloor;

    let base = grossLocal;
    if (floor !== undefined) base = Math.max(0, base - floor);
    if (baseCap !== undefined) base = Math.min(base, baseCap - (floor ?? 0));
    if (base < 0) base = 0;
    let deduction = base * rate;
    if (absCap !== undefined) deduction = Math.min(deduction, absCap);
    total += deduction;
  }
  return total;
}

/* ── Main computation ────────────────────────────────── */

export function computeNetIncome(
  grossUSD: number,
  country: string,
  cityId: number,
  mode: IncomeMode = "net",
  dailyRates?: Record<string, number>,
): NetIncomeResult {
  if (mode === "gross") {
    return { netUSD: grossUSD, effectiveRate: 0, confidence: "high", hasExpatScheme: false };
  }

  const tax = COUNTRY_TAX[country];
  if (!tax) {
    // Unknown country → return gross, flag low confidence
    return { netUSD: grossUSD, effectiveRate: 0, confidence: "low", hasExpatScheme: false };
  }

  const cityOverride = CITY_TAX_OVERRIDES[cityId];
  const isExpat = mode === "expatNet";
  const hasExpatScheme = !!(isExpat && tax.expatScheme);

  // If data is likely already net, don't double-deduct
  if (tax.dataIsLikelyNet) {
    return { netUSD: grossUSD, effectiveRate: 0, confidence: "low", hasExpatScheme, dataIsLikelyNet: true };
  }

  // Resolve exchange rate: prefer daily rate, fall back to taxData static rate
  const currencyCode = COUNTRY_CURRENCY_CODE[country];
  const fxRate = (currencyCode && dailyRates?.[currencyCode]) || tax.usdToLocal;

  // Guard: fxRate must be positive to avoid division by zero
  if (fxRate <= 0) {
    return { netUSD: grossUSD, effectiveRate: 0, confidence: "low", hasExpatScheme: false };
  }

  const grossLocal = grossUSD * fxRate;

  // 1. Social deductions
  let socialDeductions = 0;
  if (isExpat && tax.expatScheme && (tax.expatScheme.type === "no_social" || tax.expatScheme.type === "flat_rate_no_social")) {
    socialDeductions = 0;
  } else {
    socialDeductions = calcSocial(grossLocal, tax.social, cityOverride?.socialOverrides);
  }

  // 2. Employee deduction (percentage-based universal deductions)
  let empDeduction = 0;
  if (tax.employeeDeduction) {
    const ed = tax.employeeDeduction;
    const base = ed.afterSocial ? grossLocal - socialDeductions : grossLocal;
    empDeduction = base * ed.rate;
    if (ed.min !== undefined) empDeduction = Math.max(empDeduction, ed.min);
    if (ed.max !== undefined) empDeduction = Math.min(empDeduction, ed.max);
  }

  // 3. Taxable income
  let taxableLocal = grossLocal - socialDeductions - tax.standardDeduction - empDeduction;

  // Japan special: employment income deduction (replaces generic empDeduction)
  if (country === "日本") {
    taxableLocal = grossLocal - japanEmploymentDeduction(grossLocal) - socialDeductions - tax.standardDeduction;
  }

  // Korea special: employment income deduction (근로소득공제)
  if (country === "韩国") {
    taxableLocal = grossLocal - koreanEmploymentDeduction(grossLocal) - socialDeductions - tax.standardDeduction;
  }

  // Japan: add 10% resident tax separately
  let residentTax = 0;
  if (country === "日本") {
    const residentTaxable = Math.max(0, taxableLocal);
    residentTax = residentTaxable * 0.10;
  }

  // Denmark special: AM-bidrag is pre-tax
  if (country === "丹麦") {
    // AM-bidrag 8% is applied before other calculations (already in social)
    // taxable is based on post-AM income, but brackets already account for municipal % on reduced base
    // Our simplified approach: social already handled, brackets already include combined rates
  }

  if (taxableLocal < 0) taxableLocal = 0;

  // 3. Income tax
  let incomeTax = 0;
  if (isExpat && tax.expatScheme) {
    const scheme = tax.expatScheme;
    if (scheme.type === "flat_rate" || scheme.type === "flat_rate_no_social") {
      if (scheme.incomeThreshold && taxableLocal > scheme.incomeThreshold) {
        incomeTax = scheme.incomeThreshold * (scheme.flatRate || 0)
          + (taxableLocal - scheme.incomeThreshold) * (scheme.rateAboveThreshold || scheme.flatRate || 0);
      } else {
        incomeTax = taxableLocal * (scheme.flatRate || 0);
      }
    } else if (scheme.type === "exemption_pct") {
      const reducedTaxable = taxableLocal * (1 - (scheme.exemptionPct || 0));
      incomeTax = calcProgressive(reducedTaxable, tax.brackets);
    } else if (scheme.type === "no_social") {
      incomeTax = calcProgressive(taxableLocal, tax.brackets);
    }
  } else {
    incomeTax = calcProgressive(taxableLocal, tax.brackets);
  }

  // 4. Local/state tax
  let localTax = 0;
  if (cityOverride) {
    if (cityOverride.localBrackets) {
      // For US: state tax uses federal taxable; for Canada: provincial tax uses federal taxable
      const localTaxable = Math.max(0, taxableLocal);
      localTax = calcProgressive(localTaxable, cityOverride.localBrackets);
    } else if (cityOverride.localFlatRate !== undefined) {
      localTax = Math.max(0, taxableLocal) * cityOverride.localFlatRate;
    }
  }

  // 5. Net income
  const netLocal = grossLocal - socialDeductions - incomeTax - localTax - residentTax;
  const netUSD = Math.max(0, netLocal / fxRate);
  const effectiveRate = grossUSD > 0 ? 1 - (netUSD / grossUSD) : 0;

  const expatResult: NetIncomeResult = {
    netUSD: Math.round(netUSD),
    effectiveRate: Math.max(0, Math.min(effectiveRate, 1)),
    confidence: tax.confidence,
    hasExpatScheme,
  };

  // Expat schemes are optional — if normal net is better, use that instead
  if (isExpat && hasExpatScheme) {
    const normalResult = computeNetIncome(grossUSD, country, cityId, "net", dailyRates);
    if (normalResult.netUSD > expatResult.netUSD) {
      return { ...normalResult, hasExpatScheme: false };
    }
  }

  return expatResult;
}

/* ── Batch helper: compute net income for an array of cities ── */

export function computeAllNetIncomes(
  cities: { country: string; id: number }[],
  grossIncomes: number[],
  mode: IncomeMode,
  dailyRates?: Record<string, number>,
): number[] {
  return cities.map((city, i) =>
    computeNetIncome(grossIncomes[i], city.country, city.id, mode, dailyRates).netUSD
  );
}

/* ── Get expat scheme display name ── */

export function getExpatSchemeName(country: string): string {
  return COUNTRY_TAX[country]?.expatScheme?.name || "";
}

/* ── Step-by-step tax breakdown (exhaustive) ─────────── */

function bracketDetailList(taxable: number, brackets: TaxBracket[]): TaxBreakdownDetail[] {
  if (taxable <= 0) return [];
  const out: TaxBreakdownDetail[] = [];
  let prev = 0;
  for (const b of brackets) {
    if (taxable <= prev) break;
    const sliceTop = Math.min(taxable, b.upTo);
    const tax = (sliceTop - prev) * b.rate;
    const lo = prev === 0 ? "0" : Math.round(prev).toLocaleString();
    const hi = b.upTo === Infinity ? "∞" : Math.round(b.upTo).toLocaleString();
    out.push({ label: `${lo}–${hi} × ${(b.rate * 100).toFixed(1)}%`, amount: tax });
    prev = b.upTo;
  }
  return out;
}

export function computeTaxBreakdown(
  grossUSD: number,
  country: string,
  cityId: number,
  dailyRates?: Record<string, number>,
): TaxBreakdown | null {
  const tax = COUNTRY_TAX[country];
  if (!tax || tax.dataIsLikelyNet) return null;

  const currencyCode = COUNTRY_CURRENCY_CODE[country] || "USD";
  const fxRate = (currencyCode && dailyRates?.[currencyCode]) || tax.usdToLocal;
  const grossLocal = grossUSD * fxRate;
  const sections: TaxBreakdownSection[] = [];

  // ① Social deductions
  const socialLocal = calcSocial(grossLocal, tax.social, CITY_TAX_OVERRIDES[cityId]?.socialOverrides);
  if (socialLocal > 0) {
    const details: TaxBreakdownDetail[] = [];
    for (const comp of tax.social) {
      const override = CITY_TAX_OVERRIDES[cityId]?.socialOverrides?.[comp.name];
      const rate = override?.rate ?? comp.rate;
      const baseCap = override?.annualBaseCap ?? comp.annualBaseCap;
      const absCap = override?.annualAbsCap ?? comp.annualAbsCap;
      let base = grossLocal;
      let capped = false;
      if (baseCap !== undefined && base > baseCap) { base = baseCap; capped = true; }
      let amt = base * rate;
      if (absCap !== undefined && amt > absCap) { amt = absCap; capped = true; }
      if (amt > 0) details.push({ label: comp.name, amount: amt, rate: `${(rate * 100).toFixed(2)}%`, capped });
    }
    sections.push({ label: "taxBkSocial", total: -socialLocal, details });
  }

  // ②③ Standard deduction & employee deduction (computed for taxable base)
  let empDeduction = 0;
  if (country === "日本") {
    empDeduction = japanEmploymentDeduction(grossLocal);
  } else if (country === "韩国") {
    empDeduction = koreanEmploymentDeduction(grossLocal);
  } else if (tax.employeeDeduction) {
    const ed = tax.employeeDeduction;
    const base = ed.afterSocial ? grossLocal - socialLocal : grossLocal;
    empDeduction = base * ed.rate;
    if (ed.min !== undefined) empDeduction = Math.max(empDeduction, ed.min);
    if (ed.max !== undefined) empDeduction = Math.min(empDeduction, ed.max);
  }

  // ④ Taxable income
  let taxableLocal = grossLocal - socialLocal - tax.standardDeduction - empDeduction;
  if (taxableLocal < 0) taxableLocal = 0;
  if (tax.standardDeduction > 0) {
    sections.push({ label: "taxBkStdDeduction", total: tax.standardDeduction, isInfo: true });
  }
  if (empDeduction > 0) {
    sections.push({ label: "taxBkEmpDeduction", total: empDeduction, isInfo: true });
  }
  sections.push({ label: "taxBkTaxable", total: taxableLocal, isResult: true });

  // ⑤ Income tax (progressive brackets)
  const incomeTaxLocal = calcProgressive(taxableLocal, tax.brackets);
  if (incomeTaxLocal > 0) {
    sections.push({ label: "taxBkIncomeTax", total: -incomeTaxLocal, details: bracketDetailList(taxableLocal, tax.brackets) });
  }

  // ⑥ Resident tax (Japan)
  let residentTax = 0;
  if (country === "日本") {
    residentTax = Math.max(0, taxableLocal) * 0.10;
    if (residentTax > 0) {
      sections.push({ label: "taxBkResidentTax", total: -residentTax, details: [{ label: "10%", amount: residentTax }] });
    }
  }

  // ⑦ Local/state tax
  const cityOverride = CITY_TAX_OVERRIDES[cityId];
  let localTaxLocal = 0;
  if (cityOverride) {
    if (cityOverride.localBrackets) {
      localTaxLocal = calcProgressive(Math.max(0, taxableLocal), cityOverride.localBrackets);
      sections.push({ label: "taxBkLocalTax", total: -localTaxLocal, details: bracketDetailList(Math.max(0, taxableLocal), cityOverride.localBrackets) });
    } else if (cityOverride.localFlatRate !== undefined) {
      localTaxLocal = Math.max(0, taxableLocal) * cityOverride.localFlatRate;
      if (localTaxLocal > 0) {
        sections.push({ label: "taxBkLocalTax", total: -localTaxLocal, details: [{ label: `${(cityOverride.localFlatRate * 100).toFixed(1)}%`, amount: localTaxLocal }] });
      }
    }
  }

  const netLocal = grossLocal - socialLocal - incomeTaxLocal - localTaxLocal - residentTax;
  return {
    currencyCode,
    fxRate,
    grossLocal,
    grossUSD,
    sections,
    netLocal,
    netUSD: Math.round(netLocal / fxRate),
    expatSchemeName: tax.expatScheme?.name,
  };
}
