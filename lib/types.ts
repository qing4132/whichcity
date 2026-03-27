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
  numbeoSafetyIndex: number | null;    // Numbeo Safety Index (0-100)
  homicideRateInv: number | null;      // UNODC homicide rate inverted (0-100)
  gpiScoreInv: number | null;          // GPI score inverted (0-100)
  gallupLawOrder: number | null;       // Gallup Law & Order Index (0-100)
  safetyWarning?: "active_conflict" | "extreme_instability" | "data_blocked";
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
