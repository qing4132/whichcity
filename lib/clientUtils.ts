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
