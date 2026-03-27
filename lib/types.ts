export interface City {
  id: number;
  name: string;
  country: string;
  continent: string;
  averageIncome: number;
  costModerate: number;
  costBudget: number;
  bigMacPrice: number | null;
  currency: string;
  description: string;
  professions: Record<string, number>;
  housePrice: number | null;
  airQuality: number | null;
  aqiSource?: "EPA" | "AQICN";
  doctorsPerThousand: number | null;
  directFlightCities: number | null;
  annualWorkHours: number | null;
  safetyIndex: number;
  safetyConfidence: "high" | "medium" | "low";
  numbeoSafetyIndex: number | null;    // Numbeo Safety Index (0-100)
  homicideRateInv: number | null;      // UNODC homicide rate inverted (0-100)
  gpiScoreInv: number | null;          // GPI score inverted (0-100)
  gallupLawOrder: number | null;       // Gallup Law & Order Index (0-100)
  safetyWarning?: "active_conflict" | "extreme_instability" | "data_blocked";
  // Healthcare Index (pre-computed)
  healthcareIndex: number;
  healthcareConfidence: "high" | "medium" | "low";
  // Institutional Freedom Index (pre-computed)
  freedomIndex: number;
  freedomConfidence: "high" | "medium" | "low";
  // New fields (v2)
  monthlyRent: number | null;
  paidLeaveDays: number | null;
  internetSpeedMbps: number | null;
  hospitalBedsPerThousand: number | null;
  uhcCoverageIndex: number | null;
  lifeExpectancy: number | null;
  pressFreedomScore: number | null;
  democracyIndex: number | null;
  corruptionPerceptionIndex: number | null;
}

export type CostTier = "moderate" | "budget";
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
