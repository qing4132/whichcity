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
    }
  );
}

export function getCityEnName(id: number): string {
  return CITY_NAME_TRANSLATIONS[id]?.en || "";
}

export function getCountryEnName(zhName: string): string {
  return COUNTRY_TRANSLATIONS[zhName]?.en || zhName;
}

export function getAqiLabel(aqi: number): string {
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Moderate";
  if (aqi <= 150) return "Unhealthy for Sensitive Groups";
  if (aqi <= 200) return "Unhealthy";
  if (aqi <= 300) return "Very Unhealthy";
  return "Hazardous";
}

const CLIMATE_LABELS: Record<string, string> = {
  tropical: "Tropical",
  temperate: "Temperate",
  continental: "Continental",
  arid: "Arid",
  mediterranean: "Mediterranean",
  oceanic: "Oceanic",
};

export function getClimateLabel(type: string): string {
  return CLIMATE_LABELS[type] || type;
}
