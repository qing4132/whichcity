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

/** Min-max normalize a value within a set of values to [0, 100] */
function minMaxNorm(values: number[], val: number): number {
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) return 50;
  return ((val - min) / (max - min)) * 100;
}

/** Life Pressure Index (0-100, higher = more pressure)
 * Savings rate 30% + Big Mac purchasing power 25% + Annual work hours (inv) 25% + Home purchase years (inv) 20%
 * Returns { value, confidence } where confidence is weight-sum based.
 */
export function computeLifePressure(
  city: City,
  allCities: City[],
  income: number,
  allIncomes: number[],
  costTierField: keyof City,
): { value: number; confidence: "high" | "medium" | "low" } {
  const tierCost = city[costTierField] as number;
  const savings = income - tierCost * 12;
  const savingsRate = income > 0 ? savings / income : 0;

  const bigMacPower = city.bigMacPrice !== null && city.bigMacPrice > 0
    && city.annualWorkHours !== null && city.annualWorkHours > 0
    ? (income / city.annualWorkHours) / city.bigMacPrice
    : null;

  const yearsToHome = savings > 0 && city.housePrice !== null
    ? (city.housePrice * 70) / savings : null;

  const workHours = city.annualWorkHours;

  // Compute all values for normalization
  const allSavingsRates = allCities.map((c, i) => {
    const inc = allIncomes[i];
    const cost = c[costTierField] as number;
    return inc > 0 ? (inc - cost * 12) / inc : 0;
  });

  const bigMacIncomes = allCities.map((c, i) =>
    c.bigMacPrice !== null && c.bigMacPrice > 0 && c.annualWorkHours !== null && c.annualWorkHours > 0
      ? (allIncomes[i] / c.annualWorkHours) / (c.bigMacPrice as number) : null
  ).filter((v): v is number => v !== null);

  const allWorkHours = allCities.map(c => c.annualWorkHours).filter((v): v is number => v !== null);

  const allYearsToHome = allCities.map((c, i) => {
    const inc = allIncomes[i];
    const cost = c[costTierField] as number;
    const sav = inc - cost * 12;
    return sav > 0 && c.housePrice !== null ? (c.housePrice * 70) / sav : null;
  }).filter((v): v is number => v !== null && isFinite(v));

  // Determine which sub-indicators are available
  type Sub = { norm: number; w: number };
  const subs: Sub[] = [];
  let missingWeight = 0;

  // Savings rate (30%) — always available if income > 0
  subs.push({ norm: minMaxNorm(allSavingsRates, savingsRate), w: 0.30 });

  // Big Mac purchasing power (25%)
  if (bigMacPower !== null) {
    subs.push({ norm: minMaxNorm(bigMacIncomes, bigMacPower), w: 0.25 });
  } else {
    missingWeight += 0.25;
  }

  // Work hours inverse (25%)
  if (workHours !== null) {
    subs.push({ norm: 100 - minMaxNorm(allWorkHours, workHours), w: 0.25 });
  } else {
    missingWeight += 0.25;
  }

  // Years to home inverse (20%) — N/A (unaffordable) = worst score
  if (yearsToHome !== null && isFinite(yearsToHome)) {
    subs.push({ norm: 100 - minMaxNorm(allYearsToHome, yearsToHome), w: 0.20 });
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

