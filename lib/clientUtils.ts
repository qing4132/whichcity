import type { ClimateInfo } from "./types";
import { CITY_CLIMATE } from "./constants";
import { CITY_NAME_TRANSLATIONS, COUNTRY_TRANSLATIONS } from "./i18n";

export function getCityClimate(id: number): ClimateInfo | null {
  return CITY_CLIMATE[id] ?? null;
}

export function getCityEnName(id: number): string {
  return CITY_NAME_TRANSLATIONS[id]?.en || "";
}

export function getCountryEnName(zhName: string): string {
  return COUNTRY_TRANSLATIONS[zhName]?.en || zhName;
}

const AQI_LABELS: Record<string, Record<string, string>> = {
  good: { zh: "优", en: "Good", ja: "良好", es: "Bueno" },
  moderate: { zh: "良", en: "Moderate", ja: "普通", es: "Moderado" },
  usg: { zh: "敏感人群不健康", en: "Unhealthy for Sensitive Groups", ja: "敏感な人に不健康", es: "Insalubre para sensibles" },
  unhealthy: { zh: "不健康", en: "Unhealthy", ja: "不健康", es: "Insalubre" },
  veryUnhealthy: { zh: "非常不健康", en: "Very Unhealthy", ja: "非常に不健康", es: "Muy insalubre" },
  hazardous: { zh: "危险", en: "Hazardous", ja: "危険", es: "Peligroso" },
};

export function getAqiLabel(aqi: number, locale: string = "en"): string {
  let key: string;
  if (aqi <= 50) key = "good";
  else if (aqi <= 100) key = "moderate";
  else if (aqi <= 150) key = "usg";
  else if (aqi <= 200) key = "unhealthy";
  else if (aqi <= 300) key = "veryUnhealthy";
  else key = "hazardous";
  return AQI_LABELS[key]?.[locale] || AQI_LABELS[key]?.en || key;
}

const CLIMATE_LABELS: Record<string, Record<string, string>> = {
  tropical: { zh: "热带", en: "Tropical", ja: "熱帯", es: "Tropical" },
  temperate: { zh: "温带", en: "Temperate", ja: "温帯", es: "Templado" },
  continental: { zh: "大陆性", en: "Continental", ja: "大陸性", es: "Continental" },
  arid: { zh: "干旱", en: "Arid", ja: "乾燥", es: "Árido" },
  mediterranean: { zh: "地中海", en: "Mediterranean", ja: "地中海性", es: "Mediterráneo" },
  oceanic: { zh: "海洋性", en: "Oceanic", ja: "海洋性", es: "Oceánico" },
};

export function getClimateLabel(type: string, locale: string = "en"): string {
  return CLIMATE_LABELS[type]?.[locale] || CLIMATE_LABELS[type]?.en || type;
}

// ─── Composite Index Calculations ───

import type { City } from "./types";

/** Clamp a value into [lo, hi] and normalize to [0, 100] using fixed anchors.
 *  Values outside the range are clamped. */
function anchoredNorm(lo: number, hi: number, val: number): number {
  if (hi === lo) return 50;
  const clamped = Math.max(lo, Math.min(hi, val));
  return ((clamped - lo) / (hi - lo)) * 100;
}

/** Life Pressure Index (0-100, higher = more pressure)
 *
 * Uses **fixed anchor scales** so that the score is absolute and comparable
 * across cost tiers and professions.  Switching from "budget" to "moderate"
 * will never paradoxically lower the pressure of the same city.
 *
 * Savings rate 30% + Big Mac purchasing power 25% + Annual work hours (inv) 25%
 * + Home purchase years (inv) 20%.
 *
 * Anchor ranges (derived from dataset extremes with a safety margin):
 *   savings rate : -0.30 (worst)  … 0.85 (best)
 *   big-mac/hour :  1.0  (worst)  … 22.0 (best)
 *   work hours   :  2500 (worst)  … 1200 (best)
 *   years-to-buy :  120  (worst)  …  3   (best)
 */
export function computeLifePressure(
  city: City,
  _allCities: City[],
  income: number,
  _allIncomes: number[],
  costTierField: keyof City,
): { value: number; confidence: "high" | "medium" | "low" } {
  const tierCost = city[costTierField] as number;
  const savings = income - tierCost * 12;
  const savingsRate = income > 0 ? savings / income : -0.30;

  const bigMacPower = city.bigMacPrice !== null && city.bigMacPrice > 0
    && city.annualWorkHours !== null && city.annualWorkHours > 0
    ? (income / city.annualWorkHours) / city.bigMacPrice
    : null;

  const yearsToHome = savings > 0 && city.housePrice !== null
    ? (city.housePrice * 70) / savings : null;

  const workHours = city.annualWorkHours;

  // Determine which sub-indicators are available
  type Sub = { norm: number; w: number };
  const subs: Sub[] = [];
  let missingWeight = 0;

  // Savings rate (30%) — anchored -0.30 … 0.85
  subs.push({ norm: anchoredNorm(-0.30, 0.85, savingsRate), w: 0.30 });

  // Big Mac purchasing power (25%) — anchored 1.0 … 22.0
  if (bigMacPower !== null) {
    subs.push({ norm: anchoredNorm(1.0, 22.0, bigMacPower), w: 0.25 });
  } else {
    missingWeight += 0.25;
  }

  // Work hours inverse (25%) — anchored 2500 (worst) … 1200 (best)
  if (workHours !== null) {
    subs.push({ norm: 100 - anchoredNorm(1200, 2500, workHours), w: 0.25 });
  } else {
    missingWeight += 0.25;
  }

  // Years to home inverse (20%) — anchored 120 (worst) … 3 (best)
  // N/A (unaffordable) = worst score
  if (yearsToHome !== null && isFinite(yearsToHome)) {
    subs.push({ norm: 100 - anchoredNorm(3, 120, yearsToHome), w: 0.20 });
  } else {
    subs.push({ norm: 0, w: 0.20 });
  }

  // Confidence
  let confidence: "high" | "medium" | "low";
  if (missingWeight === 0) confidence = "high";
  else if (missingWeight < 1 / 3) confidence = "medium";
  else confidence = "low";

  // Weighted sum with redistribution
  const totalWeight = subs.reduce((s, v) => s + v.w, 0);
  if (totalWeight === 0) return { value: 0, confidence: "low" };
  const raw = Math.round(subs.reduce((s, v) => s + v.norm * (v.w / totalWeight), 0));
  // Invert: higher value = more pressure
  const value = 100 - raw;

  return { value, confidence };
}

