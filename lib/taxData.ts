/**
 * Tax rate data for 81 countries/territories.
 * All currency amounts are in LOCAL currency per year unless noted.
 * Source: OECD, KPMG, PwC Worldwide Tax Summaries, national tax authorities.
 * Last updated: 2025-01
 */

/* ── Types ───────────────────────────────────────────── */

export interface TaxBracket {
  upTo: number;   // local currency annual threshold (Infinity = last bracket)
  rate: number;   // marginal rate 0–1
}

export interface SocialComponent {
  name: string;
  rate: number;
  annualBaseCap?: number; // monthly base cap × 12 (local currency)
  annualAbsCap?: number;  // absolute annual deduction cap
  annualFloor?: number;   // exempt threshold: no contribution below this amount
}

export interface ExpatScheme {
  name: string;
  type: "flat_rate" | "exemption_pct" | "no_social" | "flat_rate_no_social";
  flatRate?: number;
  exemptionPct?: number;
  incomeThreshold?: number;      // local currency; above this, rateAboveThreshold applies
  rateAboveThreshold?: number;
}

export interface CountryTax {
  brackets: TaxBracket[];
  standardDeduction: number;
  social: SocialComponent[];
  usdToLocal: number;               // 1 USD = X local currency
  expatScheme?: ExpatScheme;
  /** Universal employee deduction (e.g. France 10% frais, Germany Werbungskosten, Norway minstefradrag) */
  employeeDeduction?: {
    rate: number;           // percentage of base
    min?: number;           // minimum deduction (local currency)
    max?: number;           // cap (local currency)
    afterSocial?: boolean;  // if true, base = gross − social (France)
  };
  confidence: "high" | "medium" | "low";
  dataIsLikelyNet?: boolean;
}

export interface CityTaxOverride {
  localBrackets?: TaxBracket[];
  localFlatRate?: number;
  socialOverrides?: Record<string, Partial<SocialComponent>>;
}

/* ── Helper ──────────────────────────────────────────── */

const INF = Infinity;

/* ── Country Tax Tables ─────────────────────────────── */
// Key = city.country (Chinese name as in cities.json)

export const COUNTRY_TAX: Record<string, CountryTax> = {

  /* ══ A Group: Zero / minimal tax ══ */

  "阿联酋": {
    brackets: [{ upTo: INF, rate: 0 }],
    standardDeduction: 0,
    social: [],
    usdToLocal: 3.67,
    confidence: "high",
  },
  "卡塔尔": {
    brackets: [{ upTo: INF, rate: 0 }],
    standardDeduction: 0,
    social: [],
    usdToLocal: 3.64,
    confidence: "high",
  },
  "巴林": {
    brackets: [{ upTo: INF, rate: 0 }],
    standardDeduction: 0,
    social: [{ name: "unemployment", rate: 0.01 }],
    usdToLocal: 0.376,
    confidence: "high",
  },
  "阿曼": {
    brackets: [{ upTo: INF, rate: 0 }],
    standardDeduction: 0,
    social: [],
    usdToLocal: 0.385,
    confidence: "high",
  },
  "沙特阿拉伯": {
    brackets: [{ upTo: INF, rate: 0 }],
    standardDeduction: 0,
    social: [],
    usdToLocal: 3.75,
    confidence: "high",
  },
  "中国香港": {
    brackets: [
      { upTo: 50000, rate: 0.02 },
      { upTo: 100000, rate: 0.06 },
      { upTo: 150000, rate: 0.10 },
      { upTo: 200000, rate: 0.14 },
      { upTo: INF, rate: 0.17 },
    ],
    standardDeduction: 132000, // basic allowance HKD
    social: [{ name: "MPF", rate: 0.05, annualAbsCap: 18000 }],
    usdToLocal: 7.82,
    confidence: "high",
  },

  /* ══ B Group: Flat / simple rate ══ */

  "俄罗斯": {
    brackets: [
      { upTo: 2400000, rate: 0.13 },
      { upTo: 5000000, rate: 0.15 },
      { upTo: 20000000, rate: 0.18 },
      { upTo: 50000000, rate: 0.20 },
      { upTo: INF, rate: 0.22 },
    ],
    standardDeduction: 0,
    social: [],
    usdToLocal: 92,
    confidence: "medium",
  },
  "乌克兰": {
    brackets: [{ upTo: INF, rate: 0.18 }],
    standardDeduction: 0,
    social: [{ name: "military", rate: 0.015 }],
    usdToLocal: 41.5,
    confidence: "medium",
  },
  "格鲁吉亚": {
    brackets: [{ upTo: INF, rate: 0.20 }],
    standardDeduction: 0,
    social: [],
    usdToLocal: 2.72,
    confidence: "high",
  },
  "保加利亚": {
    brackets: [{ upTo: INF, rate: 0.10 }],
    standardDeduction: 0,
    social: [
      { name: "pension", rate: 0.0878 },
      { name: "health", rate: 0.032 },
      { name: "unemployment", rate: 0.004 },
      { name: "sickness", rate: 0.014 },
    ],
    usdToLocal: 1.80,
    confidence: "high",
  },
  "罗马尼亚": {
    brackets: [{ upTo: INF, rate: 0.10 }],
    standardDeduction: 0,
    social: [
      { name: "pension", rate: 0.25 },
      { name: "health", rate: 0.10 },
    ],
    usdToLocal: 4.60,
    confidence: "high",
  },
  "匈牙利": {
    brackets: [{ upTo: INF, rate: 0.15 }],
    standardDeduction: 0,
    social: [{ name: "social", rate: 0.185 }],
    usdToLocal: 370,
    confidence: "high",
  },
  "塞尔维亚": {
    brackets: [{ upTo: INF, rate: 0.10 }],
    standardDeduction: 0,
    social: [
      { name: "pension", rate: 0.14 },
      { name: "health", rate: 0.0515 },
      { name: "unemployment", rate: 0.0075 },
    ],
    usdToLocal: 108,
    confidence: "high",
  },
  "哈萨克斯坦": {
    brackets: [{ upTo: INF, rate: 0.10 }],
    standardDeduction: 0,
    social: [
      { name: "pension", rate: 0.10 },
      { name: "health", rate: 0.02 },
    ],
    usdToLocal: 470,
    confidence: "medium",
  },
  "乌兹别克斯坦": {
    brackets: [{ upTo: INF, rate: 0.12 }],
    standardDeduction: 0,
    social: [],
    usdToLocal: 12700,
    confidence: "low",
  },
  "阿塞拜疆": {
    brackets: [
      { upTo: 8000 * 12, rate: 0.14 },
      { upTo: INF, rate: 0.25 },
    ],
    standardDeduction: 0,
    social: [{ name: "social", rate: 0.035 }],
    usdToLocal: 1.70,
    confidence: "low",
  },
  "蒙古": {
    brackets: [{ upTo: INF, rate: 0.10 }],
    standardDeduction: 0,
    social: [{ name: "social", rate: 0.11 }],
    usdToLocal: 3450,
    confidence: "low",
  },
  "爱沙尼亚": {
    brackets: [{ upTo: INF, rate: 0.20 }],
    standardDeduction: 7848, // EUR 654/month basic exemption
    social: [
      { name: "unemployment", rate: 0.016 },
      { name: "pension", rate: 0.02 },
    ],
    usdToLocal: 0.92,
    confidence: "high",
  },

  /* ══ C Group: Standard progressive ══ */

  // ── North America ──

  "美国": {
    brackets: [
      { upTo: 11600, rate: 0.10 },
      { upTo: 47150, rate: 0.12 },
      { upTo: 100525, rate: 0.22 },
      { upTo: 191950, rate: 0.24 },
      { upTo: 243725, rate: 0.32 },
      { upTo: 609350, rate: 0.35 },
      { upTo: INF, rate: 0.37 },
    ],
    standardDeduction: 14600,
    social: [
      { name: "SS", rate: 0.062, annualBaseCap: 168600 },
      { name: "Medicare", rate: 0.0145 },
    ],
    usdToLocal: 1,
    confidence: "high",
  },
  "加拿大": {
    brackets: [
      { upTo: 55867, rate: 0.15 },
      { upTo: 111733, rate: 0.205 },
      { upTo: 154906, rate: 0.26 },
      { upTo: 220000, rate: 0.29 },
      { upTo: INF, rate: 0.33 },
    ],
    standardDeduction: 15705,
    social: [
      { name: "CPP", rate: 0.0595, annualBaseCap: 73200 },
      { name: "EI", rate: 0.0158, annualBaseCap: 63200 },
    ],
    usdToLocal: 1.37,
    confidence: "high",
  },
  "波多黎各": {
    brackets: [
      { upTo: 9000, rate: 0 },
      { upTo: 25000, rate: 0.07 },
      { upTo: 50000, rate: 0.14 },
      { upTo: 75000, rate: 0.25 },
      { upTo: INF, rate: 0.33 },
    ],
    standardDeduction: 3500,
    social: [
      { name: "SS", rate: 0.062, annualBaseCap: 168600 },
      { name: "Medicare", rate: 0.0145 },
    ],
    usdToLocal: 1,
    confidence: "medium",
  },

  // ── Latin America ──

  "墨西哥": {
    brackets: [
      { upTo: 8952, rate: 0.0192 },
      { upTo: 75984, rate: 0.064 },
      { upTo: 133536, rate: 0.1088 },
      { upTo: 155229, rate: 0.16 },
      { upTo: 185852, rate: 0.1792 },
      { upTo: 374837, rate: 0.2136 },
      { upTo: 590796, rate: 0.2352 },
      { upTo: 1127926, rate: 0.30 },
      { upTo: 1503816, rate: 0.32 },
      { upTo: 4511707, rate: 0.34 },
      { upTo: INF, rate: 0.35 },
    ],
    standardDeduction: 0,
    social: [{ name: "IMSS", rate: 0.0278, annualBaseCap: 25 * 108.57 * 365 }],
    usdToLocal: 17.2,
    confidence: "high",
  },
  "巴西": {
    brackets: [
      { upTo: 26963.04, rate: 0 },
      { upTo: 33919.80, rate: 0.075 },
      { upTo: 45012.60, rate: 0.15 },
      { upTo: 55976.16, rate: 0.225 },
      { upTo: INF, rate: 0.275 },
    ],
    standardDeduction: 0,
    social: [
      { name: "INSS", rate: 0.11, annualBaseCap: 93432 },
    ],
    usdToLocal: 5.0,
    confidence: "high",
  },
  "阿根廷": {
    brackets: [
      { upTo: 3091035, rate: 0.05 },
      { upTo: 6182070, rate: 0.09 },
      { upTo: 9273105, rate: 0.12 },
      { upTo: 12364141, rate: 0.15 },
      { upTo: 18546211, rate: 0.19 },
      { upTo: 24728281, rate: 0.23 },
      { upTo: 37092421, rate: 0.27 },
      { upTo: 49456562, rate: 0.31 },
      { upTo: INF, rate: 0.35 },
    ],
    standardDeduction: 3091035,
    social: [{ name: "jubilacion+social", rate: 0.17 }],
    usdToLocal: 900,
    confidence: "low",
  },
  "智利": {
    brackets: [
      { upTo: 8775702, rate: 0 },
      { upTo: 19501560, rate: 0.04 },
      { upTo: 32502600, rate: 0.08 },
      { upTo: 45503640, rate: 0.135 },
      { upTo: 58504680, rate: 0.23 },
      { upTo: 78006240, rate: 0.304 },
      { upTo: 100758360, rate: 0.35 },
      { upTo: INF, rate: 0.40 },
    ],
    standardDeduction: 0,
    social: [
      { name: "AFP", rate: 0.106 },
      { name: "health", rate: 0.07 },
    ],
    usdToLocal: 940,
    confidence: "high",
  },
  "哥伦比亚": {
    brackets: [
      { upTo: 49_869_000, rate: 0 },
      { upTo: 78_421_000, rate: 0.19 },
      { upTo: 183_152_000, rate: 0.28 },
      { upTo: 311_801_000, rate: 0.33 },
      { upTo: 737_261_000, rate: 0.35 },
      { upTo: 1_316_513_000, rate: 0.37 },
      { upTo: INF, rate: 0.39 },
    ],
    standardDeduction: 0,
    social: [
      { name: "pension", rate: 0.04 },
      { name: "health", rate: 0.04 },
    ],
    usdToLocal: 4000,
    confidence: "medium",
  },
  "秘鲁": {
    brackets: [
      { upTo: 26950, rate: 0.08 },
      { upTo: 107800, rate: 0.14 },
      { upTo: 157850, rate: 0.17 },
      { upTo: 184800, rate: 0.20 },
      { upTo: INF, rate: 0.30 },
    ],
    standardDeduction: 36050,
    social: [{ name: "AFP", rate: 0.13 }],
    usdToLocal: 3.75,
    confidence: "medium",
  },
  "哥斯达黎加": {
    brackets: [
      { upTo: 11148000, rate: 0 },
      { upTo: 16416000, rate: 0.10 },
      { upTo: 27396000, rate: 0.15 },
      { upTo: 54894000, rate: 0.20 },
      { upTo: INF, rate: 0.25 },
    ],
    standardDeduction: 0,
    social: [{ name: "social", rate: 0.105 }],
    usdToLocal: 510,
    confidence: "medium",
  },
  "巴拿马": {
    brackets: [
      { upTo: 11000, rate: 0 },
      { upTo: 50000, rate: 0.15 },
      { upTo: INF, rate: 0.25 },
    ],
    standardDeduction: 0,
    social: [{ name: "CSS", rate: 0.0975 }],
    usdToLocal: 1,
    confidence: "medium",
  },
  "乌拉圭": {
    brackets: [
      { upTo: 552384, rate: 0 },
      { upTo: 789120, rate: 0.10 },
      { upTo: 1183680, rate: 0.15 },
      { upTo: 2367360, rate: 0.24 },
      { upTo: 3945600, rate: 0.25 },
      { upTo: 5918400, rate: 0.27 },
      { upTo: 9074880, rate: 0.31 },
      { upTo: INF, rate: 0.36 },
    ],
    standardDeduction: 0,
    social: [
      { name: "retirement", rate: 0.15, annualBaseCap: 3270768 },
      { name: "FONASA", rate: 0.045 },
      { name: "FRL", rate: 0.001 },
    ],
    usdToLocal: 42,
    confidence: "medium",
  },

  // ── Western Europe ──

  "英国": {
    brackets: [
      { upTo: 37700, rate: 0.20 },
      { upTo: 125140, rate: 0.40 },
      { upTo: INF, rate: 0.45 },
    ],
    standardDeduction: 12570,
    social: [
      { name: "NI_main", rate: 0.08, annualFloor: 12570, annualBaseCap: 50270 },
      { name: "NI_upper", rate: 0.02, annualFloor: 50270 },
    ],
    usdToLocal: 0.79,
    confidence: "high",
  },
  "法国": {
    brackets: [
      { upTo: 11294, rate: 0 },
      { upTo: 28797, rate: 0.11 },
      { upTo: 82341, rate: 0.30 },
      { upTo: 177106, rate: 0.41 },
      { upTo: INF, rate: 0.45 },
    ],
    standardDeduction: 0,
    social: [{ name: "combined", rate: 0.23 }], // CSG+CRDS+pension+etc simplified
    employeeDeduction: { rate: 0.10, min: 472, max: 14171, afterSocial: true }, // 10% frais professionnels
    usdToLocal: 0.92,
    confidence: "high",
  },
  "德国": {
    brackets: [
      { upTo: 11604, rate: 0 },
      { upTo: 17005, rate: 0.14 },
      { upTo: 66760, rate: 0.2397 },
      { upTo: 277825, rate: 0.42 },
      { upTo: INF, rate: 0.45 },
    ],
    standardDeduction: 1230, // Werbungskostenpauschale (employee lump-sum)
    social: [
      { name: "pension", rate: 0.093, annualBaseCap: 90600 },
      { name: "health", rate: 0.0815, annualBaseCap: 62100 },
      { name: "unemployment", rate: 0.013, annualBaseCap: 90600 },
      { name: "care", rate: 0.023, annualBaseCap: 62100 },
    ],
    usdToLocal: 0.92,
    confidence: "high",
  },
  "荷兰": {
    brackets: [
      { upTo: 75518, rate: 0.3697 },
      { upTo: INF, rate: 0.495 },
    ],
    standardDeduction: 5532, // general tax credit approximation
    social: [], // included in Box 1 rates
    usdToLocal: 0.92,
    expatScheme: { name: "expatScheme30Ruling", type: "exemption_pct", exemptionPct: 0.30 },
    confidence: "high",
  },
  "比利时": {
    brackets: [
      { upTo: 15200, rate: 0.25 },
      { upTo: 26830, rate: 0.40 },
      { upTo: 46440, rate: 0.45 },
      { upTo: INF, rate: 0.50 },
    ],
    standardDeduction: 10160,
    social: [{ name: "social", rate: 0.1307 }],
    usdToLocal: 0.92,
    confidence: "high",
  },
  "瑞士": {
    brackets: [
      { upTo: 17800, rate: 0 },
      { upTo: 31600, rate: 0.0077 },
      { upTo: 41400, rate: 0.0088 },
      { upTo: 55200, rate: 0.0264 },
      { upTo: 72400, rate: 0.0297 },
      { upTo: 78100, rate: 0.0561 },
      { upTo: 103600, rate: 0.0624 },
      { upTo: 134600, rate: 0.0668 },
      { upTo: 176000, rate: 0.0891 },
      { upTo: 755200, rate: 0.10 },
      { upTo: INF, rate: 0.115 },
    ],
    standardDeduction: 0,
    social: [
      { name: "AHV", rate: 0.053 },
      { name: "ALV", rate: 0.011, annualBaseCap: 148200 },
    ],
    usdToLocal: 0.88,
    confidence: "high",
  },
  "奥地利": {
    brackets: [
      { upTo: 12816, rate: 0 },
      { upTo: 20818, rate: 0.20 },
      { upTo: 34513, rate: 0.30 },
      { upTo: 66612, rate: 0.40 },
      { upTo: 99266, rate: 0.48 },
      { upTo: 1000000, rate: 0.50 },
      { upTo: INF, rate: 0.55 },
    ],
    standardDeduction: 0,
    social: [{ name: "combined", rate: 0.1807 }],
    usdToLocal: 0.92,
    confidence: "high",
  },
  "爱尔兰": {
    brackets: [
      { upTo: 42000, rate: 0.20 },
      { upTo: INF, rate: 0.40 },
    ],
    standardDeduction: 1875, // single person tax credit / rate approximation
    social: [{ name: "PRSI", rate: 0.04 }],
    usdToLocal: 0.92,
    confidence: "high",
  },
  "卢森堡": {
    brackets: [
      { upTo: 11265, rate: 0 },
      { upTo: 13173, rate: 0.08 },
      { upTo: 15081, rate: 0.09 },
      { upTo: 16989, rate: 0.10 },
      { upTo: 18897, rate: 0.11 },
      { upTo: 20805, rate: 0.12 },
      { upTo: 22713, rate: 0.14 },
      { upTo: 24621, rate: 0.16 },
      { upTo: 26529, rate: 0.18 },
      { upTo: 28437, rate: 0.20 },
      { upTo: 30345, rate: 0.22 },
      { upTo: 32253, rate: 0.24 },
      { upTo: 34161, rate: 0.26 },
      { upTo: 36069, rate: 0.28 },
      { upTo: 37977, rate: 0.30 },
      { upTo: 39885, rate: 0.32 },
      { upTo: 41793, rate: 0.34 },
      { upTo: 43701, rate: 0.36 },
      { upTo: 45609, rate: 0.38 },
      { upTo: 100000, rate: 0.39 },
      { upTo: 150000, rate: 0.40 },
      { upTo: 200000, rate: 0.41 },
      { upTo: INF, rate: 0.42 },
    ],
    standardDeduction: 0,
    social: [
      { name: "pension", rate: 0.08 },
      { name: "health", rate: 0.028 },
      { name: "care", rate: 0.014 },
    ],
    usdToLocal: 0.92,
    confidence: "high",
  },

  // ── Southern Europe ──

  "西班牙": {
    brackets: [
      { upTo: 12450, rate: 0.19 },
      { upTo: 20200, rate: 0.24 },
      { upTo: 35200, rate: 0.30 },
      { upTo: 60000, rate: 0.37 },
      { upTo: 300000, rate: 0.45 },
      { upTo: INF, rate: 0.47 },
    ],
    standardDeduction: 5550,
    social: [{ name: "SS", rate: 0.0635, annualBaseCap: 56844 }],
    usdToLocal: 0.92,
    expatScheme: { name: "expatSchemeBeckham", type: "flat_rate", flatRate: 0.24, incomeThreshold: 600000, rateAboveThreshold: 0.47 },
    confidence: "high",
  },
  "意大利": {
    brackets: [
      { upTo: 28000, rate: 0.23 },
      { upTo: 50000, rate: 0.35 },
      { upTo: INF, rate: 0.43 },
    ],
    standardDeduction: 0,
    social: [{ name: "INPS", rate: 0.0919 }],
    usdToLocal: 0.92,
    expatScheme: { name: "expatSchemeImpatriati", type: "exemption_pct", exemptionPct: 0.50 },
    confidence: "high",
  },
  "葡萄牙": {
    brackets: [
      { upTo: 7703, rate: 0.13 },
      { upTo: 11623, rate: 0.18 },
      { upTo: 16472, rate: 0.23 },
      { upTo: 21321, rate: 0.26 },
      { upTo: 27146, rate: 0.3275 },
      { upTo: 39791, rate: 0.37 },
      { upTo: 51997, rate: 0.435 },
      { upTo: 81199, rate: 0.45 },
      { upTo: INF, rate: 0.48 },
    ],
    standardDeduction: 4104,
    social: [{ name: "SS", rate: 0.11 }],
    usdToLocal: 0.92,
    expatScheme: { name: "expatSchemeNHR", type: "flat_rate", flatRate: 0.20 },
    confidence: "high",
  },
  "希腊": {
    brackets: [
      { upTo: 10000, rate: 0.09 },
      { upTo: 20000, rate: 0.22 },
      { upTo: 30000, rate: 0.28 },
      { upTo: 40000, rate: 0.36 },
      { upTo: INF, rate: 0.44 },
    ],
    standardDeduction: 0,
    social: [{ name: "combined", rate: 0.1387 }],
    usdToLocal: 0.92,
    confidence: "high",
  },
  "土耳其": {
    brackets: [
      { upTo: 110000, rate: 0.15 },
      { upTo: 230000, rate: 0.20 },
      { upTo: 580000, rate: 0.27 },
      { upTo: 3000000, rate: 0.35 },
      { upTo: INF, rate: 0.40 },
    ],
    standardDeduction: 0,
    social: [{ name: "SGK", rate: 0.14 }],
    usdToLocal: 32,
    confidence: "medium",
  },

  // ── Northern Europe ──

  "瑞典": {
    brackets: [
      { upTo: 613900, rate: 0.30 }, // municipal tax ~30%
      { upTo: INF, rate: 0.50 },    // +20% national
    ],
    standardDeduction: 15400,
    social: [{ name: "pension_contrib", rate: 0.07 }],
    usdToLocal: 10.5,
    confidence: "high",
  },
  "丹麦": {
    brackets: [
      { upTo: 588900, rate: 0.3244 }, // AM 8% + municipal ~24.9%
      { upTo: INF, rate: 0.4744 },    // + top tax 15%
    ],
    standardDeduction: 48000,
    social: [{ name: "AM_bidrag", rate: 0.08 }],
    employeeDeduction: { rate: 0.1065, max: 44800, afterSocial: true }, // beskæftigelsesfradrag (base = post-AM income)
    usdToLocal: 6.88,
    confidence: "high",
  },
  "芬兰": {
    brackets: [
      { upTo: 19900, rate: 0.1264 },
      { upTo: 29700, rate: 0.19 },
      { upTo: 49000, rate: 0.3025 },
      { upTo: 85800, rate: 0.34 },
      { upTo: INF, rate: 0.44 },
    ],
    standardDeduction: 0,
    social: [
      { name: "pension", rate: 0.0715 },
      { name: "unemployment", rate: 0.0126 },
    ],
    usdToLocal: 0.92,
    confidence: "high",
  },
  "挪威": {
    brackets: [
      { upTo: 208050, rate: 0.22 },
      { upTo: 292850, rate: 0.237 },
      { upTo: 670000, rate: 0.261 },
      { upTo: 937900, rate: 0.341 },
      { upTo: 1350000, rate: 0.396 },
      { upTo: INF, rate: 0.396 },
    ],
    standardDeduction: 0,
    employeeDeduction: { rate: 0.46, min: 4000, max: 104450 }, // minstefradrag
    social: [{ name: "trygdeavgift", rate: 0.079 }],
    usdToLocal: 10.8,
    confidence: "high",
  },

  // ── Central/Eastern Europe ──

  "捷克": {
    brackets: [
      { upTo: 1935552, rate: 0.15 },
      { upTo: INF, rate: 0.23 },
    ],
    standardDeduction: 30840,
    social: [{ name: "combined", rate: 0.11 }],
    usdToLocal: 23.3,
    confidence: "high",
  },
  "波兰": {
    brackets: [
      { upTo: 120000, rate: 0.12 },
      { upTo: INF, rate: 0.32 },
    ],
    standardDeduction: 30000,
    social: [
      { name: "pension", rate: 0.0976 },
      { name: "disability", rate: 0.015 },
      { name: "sickness", rate: 0.0245 },
    ],
    usdToLocal: 4.05,
    confidence: "high",
  },
  "克罗地亚": {
    brackets: [
      { upTo: 50400, rate: 0.20 },
      { upTo: INF, rate: 0.30 },
    ],
    standardDeduction: 7200, // 600 EUR/month × 12 (PwC 2025)
    social: [{ name: "pension", rate: 0.20 }],
    usdToLocal: 0.92,  // EUR
    confidence: "high",
  },
  "斯洛伐克": {
    brackets: [
      { upTo: 41445, rate: 0.19 },
      { upTo: INF, rate: 0.25 },
    ],
    standardDeduction: 4922, // nezdaniteľná časť
    social: [
      { name: "pension", rate: 0.04 },
      { name: "disability", rate: 0.03 },
      { name: "sickness", rate: 0.014 },
      { name: "unemployment", rate: 0.01 },
      { name: "health", rate: 0.04 },
    ],
    usdToLocal: 0.92,
    confidence: "high",
  },
  "斯洛文尼亚": {
    brackets: [
      { upTo: 8755, rate: 0.16 },
      { upTo: 25750, rate: 0.26 },
      { upTo: 51500, rate: 0.33 },
      { upTo: 74160, rate: 0.39 },
      { upTo: INF, rate: 0.50 },
    ],
    standardDeduction: 3500,
    social: [{ name: "combined", rate: 0.221 }],
    usdToLocal: 0.92,
    confidence: "high",
  },

  // ── East Asia ──

  "日本": {
    brackets: [
      { upTo: 1950000, rate: 0.05 },
      { upTo: 3300000, rate: 0.10 },
      { upTo: 6950000, rate: 0.20 },
      { upTo: 9000000, rate: 0.23 },
      { upTo: 18000000, rate: 0.33 },
      { upTo: 40000000, rate: 0.40 },
      { upTo: INF, rate: 0.45 },
    ],
    standardDeduction: 480000, // basic deduction; employment income deduction applied in calc
    social: [
      { name: "pension", rate: 0.0915 },
      { name: "health", rate: 0.05 },
      { name: "employment", rate: 0.006 },
    ],
    usdToLocal: 150,
    confidence: "high",
  },
  "韩国": {
    brackets: [
      { upTo: 14000000, rate: 0.06 },
      { upTo: 50000000, rate: 0.15 },
      { upTo: 88000000, rate: 0.24 },
      { upTo: 150000000, rate: 0.35 },
      { upTo: 300000000, rate: 0.38 },
      { upTo: 500000000, rate: 0.40 },
      { upTo: 1000000000, rate: 0.42 },
      { upTo: INF, rate: 0.45 },
    ],
    standardDeduction: 1500000,
    social: [
      { name: "NPS", rate: 0.045, annualBaseCap: 5900000 * 12 },
      { name: "health", rate: 0.03545 },
      { name: "longTermCare", rate: 0.009 },
      { name: "employment", rate: 0.009 },
    ],
    usdToLocal: 1350,
    expatScheme: { name: "expatScheme19Flat", type: "flat_rate", flatRate: 0.19 },
    confidence: "high",
  },
  "台湾": {
    brackets: [
      { upTo: 560000, rate: 0.05 },
      { upTo: 1260000, rate: 0.12 },
      { upTo: 2520000, rate: 0.20 },
      { upTo: 4720000, rate: 0.30 },
      { upTo: INF, rate: 0.40 },
    ],
    standardDeduction: 124000 + 207000, // standard + salary special deduction
    social: [
      { name: "labor_insurance", rate: 0.02 },
      { name: "NHI", rate: 0.019 },
    ],
    usdToLocal: 32,
    confidence: "high",
  },
  // 五险一金中，工伤和生育由企业承担（个人 0%），个人缴纳三险一金。
  // 缴费基数上限 = 当地社平工资 × 3，各城市不同，由城市级 CITY_TAX_OVERRIDES 单独配置。
  // 住房公积金比例 5%–12%，一线大厂普遍顶格 12%，也由城市 override 指定。
  "中国": {
    brackets: [
      { upTo: 36000, rate: 0.03 },
      { upTo: 144000, rate: 0.10 },
      { upTo: 300000, rate: 0.20 },
      { upTo: 420000, rate: 0.25 },
      { upTo: 660000, rate: 0.30 },
      { upTo: 960000, rate: 0.35 },
      { upTo: INF, rate: 0.45 },
    ],
    standardDeduction: 60000,
    social: [
      { name: "pension", rate: 0.08 },
      { name: "medical", rate: 0.02 },
      { name: "unemployment", rate: 0.005 },
      { name: "housing_fund", rate: 0.12 },
    ],
    usdToLocal: 7.24,
    confidence: "medium",
    dataIsLikelyNet: false, // declared pre-tax but some ambiguity
  },

  // ── Southeast Asia ──

  "新加坡": {
    brackets: [
      { upTo: 20000, rate: 0 },
      { upTo: 30000, rate: 0.02 },
      { upTo: 40000, rate: 0.035 },
      { upTo: 80000, rate: 0.07 },
      { upTo: 120000, rate: 0.115 },
      { upTo: 160000, rate: 0.15 },
      { upTo: 200000, rate: 0.18 },
      { upTo: 240000, rate: 0.19 },
      { upTo: 280000, rate: 0.195 },
      { upTo: 320000, rate: 0.20 },
      { upTo: 500000, rate: 0.22 },
      { upTo: 1000000, rate: 0.23 },
      { upTo: INF, rate: 0.24 },
    ],
    standardDeduction: 0,
    social: [
      { name: "CPF", rate: 0.20, annualBaseCap: 6800 * 12 },
    ],
    usdToLocal: 1.34,
    expatScheme: { name: "expatSchemeCPF", type: "no_social" },
    confidence: "high",
  },
  "泰国": {
    brackets: [
      { upTo: 150000, rate: 0 },
      { upTo: 300000, rate: 0.05 },
      { upTo: 500000, rate: 0.10 },
      { upTo: 750000, rate: 0.15 },
      { upTo: 1000000, rate: 0.20 },
      { upTo: 2000000, rate: 0.25 },
      { upTo: 5000000, rate: 0.30 },
      { upTo: INF, rate: 0.35 },
    ],
    standardDeduction: 100000, // expense deduction
    social: [{ name: "SSF", rate: 0.05, annualAbsCap: 9000 }],
    usdToLocal: 35.7,
    confidence: "medium",
    dataIsLikelyNet: false,
  },
  "马来西亚": {
    brackets: [
      { upTo: 5000, rate: 0 },
      { upTo: 20000, rate: 0.01 },
      { upTo: 35000, rate: 0.03 },
      { upTo: 50000, rate: 0.06 },
      { upTo: 70000, rate: 0.11 },
      { upTo: 100000, rate: 0.19 },
      { upTo: 400000, rate: 0.25 },
      { upTo: 600000, rate: 0.26 },
      { upTo: 2000000, rate: 0.28 },
      { upTo: INF, rate: 0.30 },
    ],
    standardDeduction: 9000, // individual relief
    social: [{ name: "EPF", rate: 0.11 }],
    usdToLocal: 4.47,
    confidence: "medium",
  },
  "越南": {
    brackets: [
      { upTo: 60000000, rate: 0.05 },
      { upTo: 120000000, rate: 0.10 },
      { upTo: 216000000, rate: 0.15 },
      { upTo: 384000000, rate: 0.20 },
      { upTo: 624000000, rate: 0.25 },
      { upTo: 960000000, rate: 0.30 },
      { upTo: INF, rate: 0.35 },
    ],
    standardDeduction: 132000000, // 11M/month personal deduction
    social: [
      { name: "SI", rate: 0.08 },
      { name: "HI", rate: 0.015 },
      { name: "UI", rate: 0.01 },
    ],
    usdToLocal: 25000,
    confidence: "medium",
    dataIsLikelyNet: false,
  },
  "印度尼西亚": {
    brackets: [
      { upTo: 60000000, rate: 0.05 },
      { upTo: 250000000, rate: 0.15 },
      { upTo: 500000000, rate: 0.25 },
      { upTo: 5000000000, rate: 0.30 },
      { upTo: INF, rate: 0.35 },
    ],
    standardDeduction: 54000000, // PTKP single
    social: [{ name: "BPJS", rate: 0.05 }],
    usdToLocal: 15800,
    confidence: "medium",
  },
  "菲律宾": {
    brackets: [
      { upTo: 250000, rate: 0 },
      { upTo: 400000, rate: 0.15 },
      { upTo: 800000, rate: 0.20 },
      { upTo: 2000000, rate: 0.25 },
      { upTo: 8000000, rate: 0.30 },
      { upTo: INF, rate: 0.35 },
    ],
    standardDeduction: 0,
    social: [
      { name: "SSS", rate: 0.045 },
      { name: "PhilHealth", rate: 0.025 },
      { name: "PAGIBIG", rate: 0.02 },
    ],
    usdToLocal: 56,
    confidence: "medium",
  },
  "柬埔寨": {
    brackets: [
      { upTo: 1500000 * 12, rate: 0 },
      { upTo: 2000000 * 12, rate: 0.05 },
      { upTo: 8500000 * 12, rate: 0.10 },
      { upTo: 12500000 * 12, rate: 0.15 },
      { upTo: INF, rate: 0.20 },
    ],
    standardDeduction: 0,
    social: [{ name: "NSSF", rate: 0.026 }],
    usdToLocal: 4100,
    confidence: "low",
  },
  "缅甸": {
    brackets: [
      { upTo: 4800000, rate: 0 },
      { upTo: 6800000, rate: 0.05 },
      { upTo: 10800000, rate: 0.10 },
      { upTo: 18800000, rate: 0.15 },
      { upTo: 38800000, rate: 0.20 },
      { upTo: INF, rate: 0.25 },
    ],
    standardDeduction: 0,
    social: [{ name: "SSB", rate: 0.02 }],
    usdToLocal: 2100,
    confidence: "low",
  },

  // ── South Asia ──

  "印度": {
    brackets: [
      { upTo: 300000, rate: 0 },
      { upTo: 700000, rate: 0.05 },
      { upTo: 1000000, rate: 0.10 },
      { upTo: 1200000, rate: 0.15 },
      { upTo: 1500000, rate: 0.20 },
      { upTo: INF, rate: 0.30 },
    ],
    standardDeduction: 75000, // standard deduction for salaried
    social: [{ name: "EPF", rate: 0.12, annualBaseCap: 15000 * 12 }],
    usdToLocal: 83.5,
    confidence: "medium",
    dataIsLikelyNet: false,
  },
  "巴基斯坦": {
    brackets: [
      { upTo: 600000, rate: 0 },
      { upTo: 1200000, rate: 0.05 },
      { upTo: 2400000, rate: 0.15 },
      { upTo: 3600000, rate: 0.20 },
      { upTo: 6000000, rate: 0.25 },
      { upTo: 12000000, rate: 0.325 },
      { upTo: INF, rate: 0.35 },
    ],
    standardDeduction: 0,
    social: [{ name: "EOBI", rate: 0.01 }],
    usdToLocal: 280,
    confidence: "low",
  },
  "孟加拉国": {
    brackets: [
      { upTo: 350000, rate: 0 },
      { upTo: 450000, rate: 0.05 },
      { upTo: 750000, rate: 0.10 },
      { upTo: 1100000, rate: 0.15 },
      { upTo: 1650000, rate: 0.20 },
      { upTo: INF, rate: 0.25 },
    ],
    standardDeduction: 0,
    social: [],
    usdToLocal: 110,
    confidence: "low",
  },
  "斯里兰卡": {
    brackets: [
      { upTo: 1200000, rate: 0 },
      { upTo: 1700000, rate: 0.06 },
      { upTo: 2200000, rate: 0.12 },
      { upTo: 2700000, rate: 0.18 },
      { upTo: 3200000, rate: 0.24 },
      { upTo: 3700000, rate: 0.30 },
      { upTo: INF, rate: 0.36 },
    ],
    standardDeduction: 0,
    social: [{ name: "EPF", rate: 0.08 }],
    usdToLocal: 310,
    confidence: "low",
  },
  "尼泊尔": {
    brackets: [
      { upTo: 500000, rate: 0.01 },
      { upTo: 700000, rate: 0.10 },
      { upTo: 1000000, rate: 0.20 },
      { upTo: INF, rate: 0.30 },
    ],
    standardDeduction: 0,
    social: [{ name: "SSF", rate: 0.10 }],
    usdToLocal: 133,
    confidence: "low",
  },

  // ── Oceania ──

  "澳大利亚": {
    brackets: [
      { upTo: 18200, rate: 0 },
      { upTo: 45000, rate: 0.16 },
      { upTo: 135000, rate: 0.30 },
      { upTo: 190000, rate: 0.37 },
      { upTo: INF, rate: 0.45 },
    ],
    standardDeduction: 0,
    social: [{ name: "medicare_levy", rate: 0.02 }], // Super paid by employer, not deducted
    usdToLocal: 1.55,
    confidence: "high",
  },
  "新西兰": {
    brackets: [
      { upTo: 15600, rate: 0.105 },
      { upTo: 53500, rate: 0.175 },
      { upTo: 78100, rate: 0.30 },
      { upTo: 180000, rate: 0.33 },
      { upTo: INF, rate: 0.39 },
    ],
    standardDeduction: 0,
    social: [{ name: "ACC", rate: 0.016 }],
    usdToLocal: 1.72,
    confidence: "high",
  },

  // ── Middle East (non-zero tax) ──

  "以色列": {
    brackets: [
      { upTo: 84120, rate: 0.10 },
      { upTo: 120720, rate: 0.14 },
      { upTo: 193800, rate: 0.20 },
      { upTo: 269280, rate: 0.31 },
      { upTo: 560280, rate: 0.35 },
      { upTo: 721560, rate: 0.47 },
      { upTo: INF, rate: 0.50 },
    ],
    standardDeduction: 0, // credit points applied differently
    social: [
      { name: "NII", rate: 0.07, annualBaseCap: 721560 },
      { name: "health", rate: 0.05, annualBaseCap: 721560 },
    ],
    usdToLocal: 3.70,
    confidence: "high",
  },
  "约旦": {
    brackets: [
      { upTo: 10000, rate: 0.05 },
      { upTo: 20000, rate: 0.10 },
      { upTo: 30000, rate: 0.15 },
      { upTo: 40000, rate: 0.20 },
      { upTo: INF, rate: 0.25 },
    ],
    standardDeduction: 10000,
    social: [{ name: "SSC", rate: 0.075 }],
    usdToLocal: 0.709,
    confidence: "medium",
  },
  "黎巴嫩": {
    brackets: [
      { upTo: 27000000, rate: 0.02 },
      { upTo: 54000000, rate: 0.04 },
      { upTo: 81000000, rate: 0.07 },
      { upTo: 108000000, rate: 0.11 },
      { upTo: 135000000, rate: 0.15 },
      { upTo: 162000000, rate: 0.20 },
      { upTo: INF, rate: 0.25 },
    ],
    standardDeduction: 7500000,
    social: [{ name: "NSSF", rate: 0.035 }],
    usdToLocal: 89500, // market rate
    confidence: "low",
  },
  "伊朗": {
    brackets: [
      { upTo: 1_200_000_000, rate: 0 },
      { upTo: 1_920_000_000, rate: 0.10 },
      { upTo: 3_120_000_000, rate: 0.15 },
      { upTo: 4_320_000_000, rate: 0.20 },
      { upTo: INF, rate: 0.30 },
    ],
    standardDeduction: 0,
    social: [{ name: "SSO", rate: 0.07 }],
    usdToLocal: 42000,
    confidence: "low",
  },

  // ── Africa ──

  "南非": {
    brackets: [
      { upTo: 237100, rate: 0.18 },
      { upTo: 370500, rate: 0.26 },
      { upTo: 512800, rate: 0.31 },
      { upTo: 673000, rate: 0.36 },
      { upTo: 857900, rate: 0.39 },
      { upTo: 1817000, rate: 0.41 },
      { upTo: INF, rate: 0.45 },
    ],
    standardDeduction: 0, // primary rebate R17,235 applied as credit
    social: [{ name: "UIF", rate: 0.01, annualAbsCap: 177.12 * 12 }],
    usdToLocal: 18.5,
    confidence: "high",
  },
  "肯尼亚": {
    brackets: [
      { upTo: 288000, rate: 0.10 },
      { upTo: 388000, rate: 0.25 },
      { upTo: 6000000, rate: 0.30 },
      { upTo: 9600000, rate: 0.325 },
      { upTo: INF, rate: 0.35 },
    ],
    standardDeduction: 28800, // personal relief
    social: [
      { name: "NSSF", rate: 0.06 },
      { name: "NHIF", rate: 0.015 },
    ],
    usdToLocal: 154,
    confidence: "medium",
  },
  "尼日利亚": {
    brackets: [
      { upTo: 300000, rate: 0.07 },
      { upTo: 600000, rate: 0.11 },
      { upTo: 1100000, rate: 0.15 },
      { upTo: 1600000, rate: 0.19 },
      { upTo: 3200000, rate: 0.21 },
      { upTo: INF, rate: 0.24 },
    ],
    standardDeduction: 200000, // CRA
    social: [
      { name: "pension", rate: 0.08 },
      { name: "NHF", rate: 0.025 },
    ],
    usdToLocal: 1550,
    confidence: "medium",
  },
  "埃及": {
    brackets: [
      { upTo: 40000, rate: 0 },
      { upTo: 55000, rate: 0.10 },
      { upTo: 70000, rate: 0.15 },
      { upTo: 200000, rate: 0.20 },
      { upTo: 400000, rate: 0.225 },
      { upTo: 800000, rate: 0.25 },
      { upTo: INF, rate: 0.275 },
    ],
    standardDeduction: 20000,
    social: [{ name: "SI", rate: 0.11, annualBaseCap: 148200 }],
    usdToLocal: 50,
    confidence: "medium",
  },
  "摩洛哥": {
    brackets: [
      { upTo: 40000, rate: 0 },
      { upTo: 60000, rate: 0.10 },
      { upTo: 80000, rate: 0.20 },
      { upTo: 100000, rate: 0.30 },
      { upTo: 180000, rate: 0.34 },
      { upTo: INF, rate: 0.37 },
    ],
    standardDeduction: 0,
    social: [
      { name: "CNSS", rate: 0.0448, annualBaseCap: 72000 },
      { name: "AMO", rate: 0.0226 },
    ],
    employeeDeduction: { rate: 0.20, max: 30000, afterSocial: true },
    usdToLocal: 10,
    confidence: "medium",
  },

  // ── New countries (2026-04 batch) ──

  "立陶宛": {
    brackets: [{ upTo: INF, rate: 0.20 }], // flat 20% (>90k EUR: 32%)
    standardDeduction: 5856, // EUR 488/month basic exemption
    social: [
      { name: "pension", rate: 0.0252 },
      { name: "health", rate: 0.0698 },
    ],
    usdToLocal: 0.92,
    confidence: "high",
  },
  "拉脱维亚": {
    brackets: [
      { upTo: 62800, rate: 0.20 },
      { upTo: INF, rate: 0.23 },
    ],
    standardDeduction: 6000, // differentiated, simplified
    social: [
      { name: "employee_social", rate: 0.105 },
    ],
    usdToLocal: 0.92,
    confidence: "high",
  },
  "塞浦路斯": {
    brackets: [
      { upTo: 19500, rate: 0 },
      { upTo: 28000, rate: 0.20 },
      { upTo: 36300, rate: 0.25 },
      { upTo: 60000, rate: 0.30 },
      { upTo: INF, rate: 0.35 },
    ],
    standardDeduction: 0,
    social: [
      { name: "social_insurance", rate: 0.083 },
      { name: "GESY_health", rate: 0.028 },
    ],
    usdToLocal: 0.92,
    confidence: "high",
  },
  "多米尼加": {
    brackets: [
      { upTo: 416220, rate: 0 },
      { upTo: 624329, rate: 0.15 },
      { upTo: 867123, rate: 0.20 },
      { upTo: INF, rate: 0.25 },
    ],
    standardDeduction: 0,
    social: [
      { name: "SFS", rate: 0.0304 },
      { name: "AFP_pension", rate: 0.0287 },
    ],
    usdToLocal: 57,
    confidence: "medium",
  },
  "厄瓜多尔": {
    brackets: [
      { upTo: 11902, rate: 0 },
      { upTo: 15159, rate: 0.05 },
      { upTo: 19682, rate: 0.10 },
      { upTo: 26031, rate: 0.12 },
      { upTo: 34255, rate: 0.15 },
      { upTo: 45407, rate: 0.20 },
      { upTo: 60450, rate: 0.25 },
      { upTo: 80605, rate: 0.30 },
      { upTo: 107199, rate: 0.35 },
      { upTo: INF, rate: 0.37 },
    ],
    standardDeduction: 0,
    social: [
      { name: "IESS", rate: 0.0945 },
    ],
    usdToLocal: 1, // Ecuador uses USD
    confidence: "high",
  },
  "加纳": {
    brackets: [
      { upTo: 4824, rate: 0 },
      { upTo: 6024, rate: 0.05 },
      { upTo: 7224, rate: 0.10 },
      { upTo: 44016, rate: 0.175 },
      { upTo: 240000, rate: 0.25 },
      { upTo: INF, rate: 0.30 },
    ],
    standardDeduction: 0,
    social: [
      { name: "SSNIT", rate: 0.055 },
    ],
    usdToLocal: 15.5,
    confidence: "medium",
  },
  "埃塞俄比亚": {
    brackets: [
      { upTo: 7200, rate: 0 },
      { upTo: 19800, rate: 0.10 },
      { upTo: 38400, rate: 0.15 },
      { upTo: 63000, rate: 0.20 },
      { upTo: 93600, rate: 0.25 },
      { upTo: 130800, rate: 0.30 },
      { upTo: INF, rate: 0.35 },
    ],
    standardDeduction: 0,
    social: [
      { name: "pension", rate: 0.07 },
    ],
    usdToLocal: 57,
    confidence: "low",
  },
};

/* ── City-level Tax Overrides ─────────────────────────── */
// Key = city.id (from cities.json)

export const CITY_TAX_OVERRIDES: Record<number, CityTaxOverride> = {
  // ── US States ──
  // NY (NYC): state 4-10.9% + city 3.078-3.876%
  1: {
    localBrackets: [
      { upTo: 8500, rate: 0.04 },
      { upTo: 11700, rate: 0.045 },
      { upTo: 13900, rate: 0.0525 },
      { upTo: 80650, rate: 0.0585 },
      { upTo: 215400, rate: 0.0625 },
      { upTo: 1077550, rate: 0.0685 },
      { upTo: 5000000, rate: 0.0965 },
      { upTo: 25000000, rate: 0.103 },
      { upTo: INF, rate: 0.109 },
    ],
  },
  // LA, SF, San Diego — CA state 1-13.3%
  11: { localBrackets: [{ upTo: 10412, rate: 0.01 }, { upTo: 24684, rate: 0.02 }, { upTo: 38959, rate: 0.04 }, { upTo: 54081, rate: 0.06 }, { upTo: 68350, rate: 0.08 }, { upTo: 349137, rate: 0.093 }, { upTo: 418961, rate: 0.103 }, { upTo: 698271, rate: 0.113 }, { upTo: 1000000, rate: 0.123 }, { upTo: INF, rate: 0.133 }] },
  12: { localBrackets: [{ upTo: 10412, rate: 0.01 }, { upTo: 24684, rate: 0.02 }, { upTo: 38959, rate: 0.04 }, { upTo: 54081, rate: 0.06 }, { upTo: 68350, rate: 0.08 }, { upTo: 349137, rate: 0.093 }, { upTo: 418961, rate: 0.103 }, { upTo: 698271, rate: 0.113 }, { upTo: 1000000, rate: 0.123 }, { upTo: INF, rate: 0.133 }] },
  98: { localBrackets: [{ upTo: 10412, rate: 0.01 }, { upTo: 24684, rate: 0.02 }, { upTo: 38959, rate: 0.04 }, { upTo: 54081, rate: 0.06 }, { upTo: 68350, rate: 0.08 }, { upTo: 349137, rate: 0.093 }, { upTo: 418961, rate: 0.103 }, { upTo: 698271, rate: 0.113 }, { upTo: 1000000, rate: 0.123 }, { upTo: INF, rate: 0.133 }] },
  // Chicago — IL flat 4.95%
  13: { localFlatRate: 0.0495 },
  // Miami, Tampa — FL 0%
  34: { localFlatRate: 0 },
  100: { localFlatRate: 0 },
  // DC — 4-10.75%
  35: { localBrackets: [{ upTo: 10000, rate: 0.04 }, { upTo: 40000, rate: 0.06 }, { upTo: 60000, rate: 0.065 }, { upTo: 250000, rate: 0.085 }, { upTo: 500000, rate: 0.0925 }, { upTo: 1000000, rate: 0.0975 }, { upTo: INF, rate: 0.1075 }] },
  // Boston — MA flat 5%
  36: { localFlatRate: 0.05 },
  // Seattle — WA 0%
  37: { localFlatRate: 0 },
  // Denver — CO flat 4.4%
  38: { localFlatRate: 0.044 },
  // Austin, Houston — TX 0%
  39: { localFlatRate: 0 },
  125: { localFlatRate: 0 },
  // Atlanta — GA 1-5.49%
  95: { localBrackets: [{ upTo: 750, rate: 0.01 }, { upTo: 2250, rate: 0.02 }, { upTo: 3750, rate: 0.03 }, { upTo: 5250, rate: 0.04 }, { upTo: 7000, rate: 0.05 }, { upTo: INF, rate: 0.0549 }] },
  // Phoenix — AZ flat 2.5%
  96: { localFlatRate: 0.025 },
  // Portland — OR 4.75-9.9% + ~1% local
  97: { localBrackets: [{ upTo: 3750, rate: 0.0475 }, { upTo: 9450, rate: 0.0675 }, { upTo: 125000, rate: 0.0875 }, { upTo: INF, rate: 0.099 }] },
  // Las Vegas — NV 0%
  99: { localFlatRate: 0 },
  // Philadelphia — PA 3.07% + city 3.75%
  126: { localFlatRate: 0.0682 },

  // ── Canada Provinces ──
  // Toronto, Ottawa — ON
  9: { localBrackets: [{ upTo: 51446, rate: 0.0505 }, { upTo: 102894, rate: 0.0915 }, { upTo: 150000, rate: 0.1116 }, { upTo: 220000, rate: 0.1216 }, { upTo: INF, rate: 0.1316 }] },
  135: { localBrackets: [{ upTo: 51446, rate: 0.0505 }, { upTo: 102894, rate: 0.0915 }, { upTo: 150000, rate: 0.1116 }, { upTo: 220000, rate: 0.1216 }, { upTo: INF, rate: 0.1316 }] },
  // Vancouver — BC
  40: { localBrackets: [{ upTo: 47937, rate: 0.0506 }, { upTo: 95875, rate: 0.077 }, { upTo: 110076, rate: 0.105 }, { upTo: 133664, rate: 0.1229 }, { upTo: 181232, rate: 0.147 }, { upTo: 252752, rate: 0.168 }, { upTo: INF, rate: 0.205 }] },
  // Montreal — QC
  41: { localBrackets: [{ upTo: 51780, rate: 0.14 }, { upTo: 103545, rate: 0.19 }, { upTo: 126000, rate: 0.24 }, { upTo: INF, rate: 0.2575 }] },
  // Calgary — AB
  127: { localBrackets: [{ upTo: 148269, rate: 0.10 }, { upTo: 177922, rate: 0.12 }, { upTo: 237230, rate: 0.13 }, { upTo: 355845, rate: 0.14 }, { upTo: INF, rate: 0.15 }] },

  // ── Switzerland cantons ──
  // Zurich — ZH ~24-28%
  16: { localFlatRate: 0.26 },
  // Geneva — GE ~33-35%
  17: { localFlatRate: 0.34 },

  // ── China: 三险一金城市级覆盖 ──
  // annualBaseCap = 当地社平工资 × 3 × 12 (各险种 & 公积金共用同一基数上限)
  // 公积金比例: 北京 12%, 上海 7%, 深圳 5%, 其余 12%
  4: { socialOverrides: {
    pension: { annualBaseCap: 35283 * 12 }, medical: { annualBaseCap: 35283 * 12 },
    unemployment: { annualBaseCap: 35283 * 12 }, housing_fund: { rate: 0.12, annualBaseCap: 35283 * 12 },
  }},
  5: { socialOverrides: {
    pension: { annualBaseCap: 36549 * 12 }, medical: { annualBaseCap: 36549 * 12 },
    unemployment: { annualBaseCap: 36549 * 12 }, housing_fund: { rate: 0.07, annualBaseCap: 36549 * 12 },
  }},
  101: { socialOverrides: {
    pension: { annualBaseCap: 33786 * 12 }, medical: { annualBaseCap: 33786 * 12 },
    unemployment: { annualBaseCap: 33786 * 12 }, housing_fund: { rate: 0.12, annualBaseCap: 33786 * 12 },
  }},
  102: { socialOverrides: {
    pension: { annualBaseCap: 38892 * 12 }, medical: { annualBaseCap: 38892 * 12 },
    unemployment: { annualBaseCap: 38892 * 12 }, housing_fund: { rate: 0.05, annualBaseCap: 38892 * 12 },
  }},
  103: { socialOverrides: {
    pension: { annualBaseCap: 27912 * 12 }, medical: { annualBaseCap: 27912 * 12 },
    unemployment: { annualBaseCap: 27912 * 12 }, housing_fund: { rate: 0.12, annualBaseCap: 27912 * 12 },
  }},
  104: { socialOverrides: {
    pension: { annualBaseCap: 36675 * 12 }, medical: { annualBaseCap: 36675 * 12 },
    unemployment: { annualBaseCap: 36675 * 12 }, housing_fund: { rate: 0.12, annualBaseCap: 36675 * 12 },
  }},
  105: { socialOverrides: {
    pension: { annualBaseCap: 25434 * 12 }, medical: { annualBaseCap: 25434 * 12 },
    unemployment: { annualBaseCap: 25434 * 12 }, housing_fund: { rate: 0.12, annualBaseCap: 25434 * 12 },
  }},

  // NYC city tax (added on top of NY state via localBrackets above — combined)
  // Note: NYC city tax is already included in the NY state bracket approximation above for simplicity
};

/* ── Japan employment income deduction helper ─────────── */
export function japanEmploymentDeduction(grossJPY: number): number {
  if (grossJPY <= 1625000) return 550000;
  if (grossJPY <= 1800000) return grossJPY * 0.40 - 100000;
  if (grossJPY <= 3600000) return grossJPY * 0.30 + 80000;
  if (grossJPY <= 6600000) return grossJPY * 0.20 + 440000;
  if (grossJPY <= 8500000) return grossJPY * 0.10 + 1100000;
  return 1950000;
}

/* ── Korea employment income deduction (근로소득공제) ─── */
export function koreanEmploymentDeduction(grossKRW: number): number {
  if (grossKRW <= 5_000_000) return grossKRW * 0.70;
  if (grossKRW <= 15_000_000) return 3_500_000 + (grossKRW - 5_000_000) * 0.40;
  if (grossKRW <= 45_000_000) return 7_500_000 + (grossKRW - 15_000_000) * 0.15;
  if (grossKRW <= 100_000_000) return 12_000_000 + (grossKRW - 45_000_000) * 0.05;
  return 14_750_000 + (grossKRW - 100_000_000) * 0.02;
}

/* ── Country → ISO currency code mapping ─────────────── */
// Used to look up daily exchange rates for tax calculations.
// Keys match COUNTRY_TAX keys (Chinese country names from cities.json).
export const COUNTRY_CURRENCY_CODE: Record<string, string> = {
  "阿联酋": "AED", "卡塔尔": "QAR", "巴林": "BHD", "阿曼": "OMR", "沙特阿拉伯": "SAR",
  "中国香港": "HKD", "俄罗斯": "RUB", "乌克兰": "UAH", "格鲁吉亚": "GEL",
  "保加利亚": "BGN", "罗马尼亚": "RON", "匈牙利": "HUF", "塞尔维亚": "RSD",
  "哈萨克斯坦": "KZT", "乌兹别克斯坦": "UZS", "阿塞拜疆": "AZN", "蒙古": "MNT",
  "爱沙尼亚": "EUR", "美国": "USD", "加拿大": "CAD", "波多黎各": "USD",
  "墨西哥": "MXN", "巴西": "BRL", "哥伦比亚": "COP", "智利": "CLP",
  "秘鲁": "PEN", "阿根廷": "ARS", "哥斯达黎加": "CRC", "巴拿马": "USD",
  "英国": "GBP", "爱尔兰": "EUR", "德国": "EUR", "法国": "EUR",
  "荷兰": "EUR", "比利时": "EUR", "奥地利": "EUR", "瑞士": "CHF",
  "卢森堡": "EUR", "西班牙": "EUR", "意大利": "EUR", "葡萄牙": "EUR",
  "希腊": "EUR", "捷克": "CZK", "波兰": "PLN", "斯洛伐克": "EUR",
  "斯洛文尼亚": "EUR", "克罗地亚": "EUR", "芬兰": "EUR", "瑞典": "SEK",
  "丹麦": "DKK", "挪威": "NOK",
  "日本": "JPY", "韩国": "KRW", "中国": "CNY", "台湾": "TWD",
  "印度": "INR", "巴基斯坦": "PKR", "孟加拉国": "BDT", "斯里兰卡": "LKR",
  "尼泊尔": "NPR",
  "泰国": "THB", "马来西亚": "MYR", "越南": "VND", "菲律宾": "PHP",
  "印度尼西亚": "IDR", "新加坡": "SGD", "柬埔寨": "USD", "缅甸": "MMK",
  "澳大利亚": "AUD", "新西兰": "NZD",
  "南非": "ZAR", "肯尼亚": "KES", "尼日利亚": "NGN", "埃及": "EGP",
  "乌拉圭": "UYU", "摩洛哥": "MAD",
  "立陶宛": "EUR", "拉脱维亚": "EUR", "塞浦路斯": "EUR",
  "多米尼加": "DOP", "厄瓜多尔": "USD", "加纳": "GHS", "埃塞俄比亚": "ETB",
  "以色列": "ILS", "土耳其": "TRY", "黎巴嫩": "LBP", "约旦": "JOD",
  "伊朗": "IRR",
};
