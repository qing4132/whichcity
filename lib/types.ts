export interface City {
  id: number;
  name: string;
  country: string;
  continent: string;
  averageIncome: number;
  costOfLiving: number;
  costComfort: number;
  costModerate: number;
  costBudget: number;
  costMinimal: number;
  bigMacPrice: number | null;
  yearlySavings: number;
  currency: string;
  description: string;
  professions: Record<string, number>;
  housePrice: number;
  airQuality: number;
  doctorsPerThousand: number;
  directFlightCities: number;
  annualWorkHours: number;
  safetyIndex: number;
  safetyConfidence: "high" | "medium" | "low";
  // New fields (v2)
  monthlyRent: number;
  paidLeaveDays: number;
  internetSpeedMbps: number;
  hospitalBedsPerThousand: number;
  uhcCoverageIndex: number;
  lifeExpectancy: number;
  pressFreedomScore: number;
  democracyIndex: number;
  corruptionPerceptionIndex: number;
}

export type CostTier = "comfort" | "moderate" | "budget" | "minimal";
export type Locale = "zh" | "en" | "ja" | "es";
export type ClimateType =
  | "tropical"
  | "temperate"
  | "continental"
  | "arid"
  | "mediterranean"
  | "oceanic";

export interface ClimateInfo {
  type: ClimateType;
  avgTempC: number;
  annualRainMm: number;
  sunshineHours: number;
  summerAvgC: number;
  winterAvgC: number;
  humidityPct: number;
}

export interface ExchangeRates {
  rates: Record<string, number>;
  symbols: Record<string, string>;
}
