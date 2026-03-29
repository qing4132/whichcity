/**
 * Tax calculation engine.
 * Computes net (after-tax) income from gross USD salary.
 */

import type { IncomeMode } from "./types";
import {
  COUNTRY_TAX, CITY_TAX_OVERRIDES,
  japanEmploymentDeduction, koreanEmploymentDeduction,
  type TaxBracket, type SocialComponent, type CountryTax, type CityTaxOverride,
} from "./taxData";

export type { IncomeMode };

export interface NetIncomeResult {
  netUSD: number;
  effectiveRate: number;   // 0–1 combined tax+social rate
  confidence: "high" | "medium" | "low";
  hasExpatScheme: boolean;
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

    let base = grossLocal;
    if (baseCap !== undefined) base = Math.min(base, baseCap);
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
    return { netUSD: grossUSD, effectiveRate: 0, confidence: "low", hasExpatScheme };
  }

  const grossLocal = grossUSD * tax.usdToLocal;

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
  const netUSD = netLocal / tax.usdToLocal;
  const effectiveRate = grossUSD > 0 ? 1 - (netUSD / grossUSD) : 0;

  const expatResult: NetIncomeResult = {
    netUSD: Math.round(netUSD),
    effectiveRate: Math.max(0, Math.min(effectiveRate, 1)),
    confidence: tax.confidence,
    hasExpatScheme,
  };

  // Expat schemes are optional — if normal net is better, use that instead
  if (isExpat && hasExpatScheme) {
    const normalResult = computeNetIncome(grossUSD, country, cityId, "net");
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
): number[] {
  return cities.map((city, i) =>
    computeNetIncome(grossIncomes[i], city.country, city.id, mode).netUSD
  );
}

/* ── Get expat scheme display name ── */

export function getExpatSchemeName(country: string): string {
  return COUNTRY_TAX[country]?.expatScheme?.name || "";
}
