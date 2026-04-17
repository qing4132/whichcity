// lib/salaryCalibration.ts — Maps PPP-gross USD to nominal-net USD using the
// offline-computed calibration table. See scripts/compute-salary-calibration.mjs
// and _archive/reports/salary-algorithm-audit-v1.md §6.
//
// Runtime rule: Numbeo data is NEVER fetched at runtime. This module only
// reads a static JSON committed to the repo.

import calibration from '@/data/salary-research/calibration-ppp-to-nominal-net.json';
import { LOW_CONFIDENCE_SALARY_CITY_IDS } from '@/lib/constants';

type SalaryView = 'ppp' | 'nominalNet';

interface CalibrationTable {
  global: { alpha: number };
  continents: Record<string, { alpha: number; n: number }>;
  countries: Record<string, { alpha: number; n: number; source: string }>;
}

const table = calibration as CalibrationTable;

/**
 * Return the PPP-gross → nominal-net calibration factor for a given city.
 * Lookup priority: country → continent → global fallback.
 */
export function salaryCalibrationFactor(country: string, continent: string): number {
  return table.countries[country]?.alpha ?? table.continents[continent]?.alpha ?? table.global.alpha;
}

/**
 * Project a PPP-gross USD salary into the requested view.
 *   'ppp'        → unchanged (raw value from data pipeline)
 *   'nominalNet' → multiply by country / continent / global calibration factor
 */
export function projectSalary(pppGrossUSD: number, country: string, continent: string, view: SalaryView): number {
  if (view === 'ppp') return pppGrossUSD;
  return pppGrossUSD * salaryCalibrationFactor(country, continent);
}

/**
 * Confidence flag for salary estimates — matches costModel's confidence style.
 *   'low'    → city GT is deemed untrustworthy (see LOW_CONFIDENCE_SALARY_CITY_IDS),
 *              UI should hide numeric estimates or show degraded styling
 *   'medium' → country has < 3 trusted training cities (continent/global fallback used)
 *   'high'   → country-level calibration available (≥ 3 training cities)
 */
export function salaryConfidence(cityId: number | undefined, country: string): 'high' | 'medium' | 'low' {
  if (cityId != null && LOW_CONFIDENCE_SALARY_CITY_IDS.has(cityId)) return 'low';
  return table.countries[country] ? 'high' : 'medium';
}

export type { SalaryView };
