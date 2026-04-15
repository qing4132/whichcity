export interface City {
  id: number;
  name: string;
  country: string;
  continent: string;
  hidden?: boolean;
  averageIncome: number;
  costModerate: number | null;
  costBudget: number | null;
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
  homicideRateInv: number | null;      // WB intentional homicides per 100k, inverted (0-100)
  homicideRate?: number | null;        // WB intentional homicides per 100k (raw)
  politicalStability: number | null;    // WB WGI Political Stability score (0-100)
  ruleLawWGI: number | null;           // WB WGI Rule of Law score (0-100)
  controlOfCorruption: number | null;   // WB WGI Control of Corruption score (0-100)
  safetyWarning?: "active_conflict" | "extreme_instability" | "data_blocked";
  // Healthcare Index (pre-computed)
  healthcareIndex: number;
  healthcareConfidence: number;  // weighted confidence 0-100
  outOfPocketPct: number | null;       // Out-of-pocket health expenditure (% of health spending)
  // Social Governance Index (pre-computed, replaces freedomIndex)
  governanceIndex: number;
  governanceConfidence: number;  // weighted confidence 0-100
  govEffectiveness: number | null;     // WGI Government Effectiveness (0-100 percentile)
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
  democracyIndex: number | null;
  corruptionPerceptionIndex: number | null;
  // New indicators (WB CC BY 4.0 + UNDP CC BY 3.0 IGO)
  inflationRate: number | null;        // Consumer price inflation (annual %)
  unemploymentRate: number | null;     // Unemployment (% labor force, ILO modeled)
  gdpPppPerCapita: number | null;      // GDP per capita PPP (current int'l $)
  pm25: number | null;                 // PM2.5 mean annual exposure (μg/m³)
  broadbandPer100: number | null;      // Fixed broadband subscriptions per 100 people
  regulatoryQuality: number | null;    // WGI Regulatory Quality (0-100)
  netMigration: number | null;         // Net migration (5-year estimate)
  nursesPerThousand: number | null;    // Nurses & midwives per 1,000 people
  healthExpPerCapita: number | null;   // Health expenditure per capita (current US$)
  tertiaryEnrollment: number | null;   // School enrollment, tertiary (% gross)
  hdi: number | null;                  // UNDP Human Development Index (0-1)
  gii: number | null;                  // UNDP Gender Inequality Index (0-1, lower=better)
  inflationForecast: number | null;     // IMF WEO inflation forecast 2025 (annual %)
  gdpGrowthForecast: number | null;     // IMF WEO GDP growth forecast 2025 (annual %)
  gniPerCapita: number | null;          // WB GNI per capita Atlas method (current US$)
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
