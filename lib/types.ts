export interface City {
  id: number;
  name: string;
  country: string;
  continent: string;
  hidden?: boolean;
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
  safetyConfidence: number;  // weighted confidence 0-100 (sum of available sub-indicator weights)
  numbeoSafetyIndex: number | null;    // Numbeo Safety Index (0-100)
  homicideRateInv: number | null;      // UNODC homicide rate inverted (0-100)
  homicideRate?: number | null;        // UNODC homicide rate per 100k (raw)
  gpiScoreInv: number | null;          // GPI score inverted (0-100)
  gpiScore?: number | null;            // GPI overall score (1-5, lower = more peaceful)
  gallupLawOrder: number | null;       // Gallup Law & Order Index (0-100)
  wpsIndex: number | null;             // Georgetown WPS Index (0-1)
  safetyWarning?: "active_conflict" | "extreme_instability" | "data_blocked";
  // Healthcare Index (pre-computed)
  healthcareIndex: number;
  healthcareConfidence: number;  // weighted confidence 0-100
  outOfPocketPct: number | null;       // Out-of-pocket health expenditure (% of health spending)
  // Social Governance Index (pre-computed, replaces freedomIndex)
  governanceIndex: number;
  governanceConfidence: number;  // weighted confidence 0-100
  govEffectiveness: number | null;     // WGI Government Effectiveness (0-100 percentile)
  wjpRuleLaw: number | null;          // WJP Rule of Law Index (0-1)
  internetFreedomScore: number | null; // Freedom on the Net (0-100)
  mipexScore: number | null;          // MIPEX migrant integration (0-100)
  // Legacy: keep freedomIndex for backwards compat during transition
  freedomIndex: number;
  freedomConfidence: number;  // legacy, kept for compat
  securityConfidence: number;  // avg of safety+healthcare+governance confidence (0-100)
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
  timezone?: string;
  climate?: ClimateInfo;
}

export type CostTier = "moderate" | "budget";
export type Locale = "zh" | "en" | "ja" | "es";
export type IncomeMode = "gross" | "net" | "expatNet";
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
  monthlyHighC?: number[];
  monthlyLowC?: number[];
  monthlyRainMm?: number[];
}

export interface ExchangeRates {
  rates: Record<string, number>;
  symbols: Record<string, string>;
}
