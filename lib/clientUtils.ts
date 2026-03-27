import type { ClimateInfo } from "./types";
import { CITY_CLIMATE } from "./constants";
import { CITY_NAME_TRANSLATIONS, COUNTRY_TRANSLATIONS } from "./i18n";

export function getCityClimate(id: number): ClimateInfo {
  return (
    CITY_CLIMATE[id] || {
      type: "temperate" as const,
      avgTempC: 15,
      annualRainMm: 800,
      sunshineHours: 2000,
      summerAvgC: 25,
      winterAvgC: 5,
      humidityPct: 65,
    }
  );
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

/** Life Pressure Index (0-100, higher = less pressure)
 * Savings rate 30% + Big Mac purchasing power 25% + Annual work hours (inv) 25% + Home purchase years (inv) 20%
 */
export function computeLifePressure(
  city: City,
  allCities: City[],
  income: number,
  allIncomes: number[],
  costTierField: keyof City,
): number {
  const tierCost = city[costTierField] as number;
  const savings = income - tierCost * 12;
  const savingsRate = income > 0 ? savings / income : 0;

  const bigMacPower = city.bigMacPrice !== null && city.bigMacPrice > 0
    ? (income / city.annualWorkHours) / city.bigMacPrice
    : null;

  const yearsToHome = savings > 0 ? (city.housePrice * 70) / savings : Infinity;

  // Compute all values for normalization
  const allSavingsRates = allCities.map((c, i) => {
    const inc = allIncomes[i];
    const cost = c[costTierField] as number;
    return inc > 0 ? (inc - cost * 12) / inc : 0;
  });

  const bigMacCities = allCities.filter(c => c.bigMacPrice !== null && c.bigMacPrice > 0);
  const bigMacIncomes = allCities.map((c, i) => c.bigMacPrice !== null && c.bigMacPrice > 0
    ? (allIncomes[i] / c.annualWorkHours) / (c.bigMacPrice as number) : null).filter((v): v is number => v !== null);

  const allWorkHours = allCities.map(c => c.annualWorkHours);

  const allYearsToHome = allCities.map((c, i) => {
    const inc = allIncomes[i];
    const cost = c[costTierField] as number;
    const sav = inc - cost * 12;
    return sav > 0 ? (c.housePrice * 70) / sav : Infinity;
  }).filter(isFinite);

  // Normalize each sub-indicator
  const srNorm = minMaxNorm(allSavingsRates, savingsRate); // higher = better

  let bmNorm: number;
  if (bigMacPower !== null) {
    bmNorm = minMaxNorm(bigMacIncomes, bigMacPower); // higher = better
  } else {
    // Redistribute weights: 40/33/27
    const srPart = minMaxNorm(allSavingsRates, savingsRate) * 0.40;
    const whPart = (100 - minMaxNorm(allWorkHours, city.annualWorkHours)) * 0.33;
    const yhPart = isFinite(yearsToHome)
      ? (100 - minMaxNorm(allYearsToHome, yearsToHome)) * 0.27
      : 0;
    return Math.round(srPart + whPart + yhPart);
  }

  const whNorm = 100 - minMaxNorm(allWorkHours, city.annualWorkHours); // lower hours = better
  const yhNorm = isFinite(yearsToHome)
    ? 100 - minMaxNorm(allYearsToHome, yearsToHome) // fewer years = better
    : 0;

  return Math.round(srNorm * 0.30 + bmNorm * 0.25 + whNorm * 0.25 + yhNorm * 0.20);
}

/** Healthcare Security Index (0-100, higher = better)
 * Doctors/1K 35% + Hospital beds/1K 25% + UHC coverage 25% + Life expectancy 15%
 */
export function computeHealthcare(city: City, allCities: City[]): number {
  const allDoctors = allCities.map(c => c.doctorsPerThousand);
  const allBeds = allCities.map(c => c.hospitalBedsPerThousand);
  const allUhc = allCities.map(c => c.uhcCoverageIndex);
  const allLife = allCities.map(c => c.lifeExpectancy);

  const docNorm = minMaxNorm(allDoctors, city.doctorsPerThousand);
  const bedNorm = minMaxNorm(allBeds, city.hospitalBedsPerThousand);
  const uhcNorm = minMaxNorm(allUhc, city.uhcCoverageIndex);
  const lifeNorm = minMaxNorm(allLife, city.lifeExpectancy);

  return Math.round(docNorm * 0.35 + bedNorm * 0.25 + uhcNorm * 0.25 + lifeNorm * 0.15);
}

/** Institutional Freedom Index (0-100, higher = freer)
 * Press freedom 35% + Democracy index (×10) 35% + CPI 30%
 */
export function computeInstitutionalFreedom(city: City): number {
  // All three are already on 0-100 scale (democracy is 0-10, multiply by 10)
  const press = city.pressFreedomScore;
  const democracy = city.democracyIndex * 10; // 0-10 → 0-100
  const cpi = city.corruptionPerceptionIndex;

  return Math.round(press * 0.35 + democracy * 0.35 + cpi * 0.30);
}
