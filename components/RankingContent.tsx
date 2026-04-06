"use client";

import { useEffect, useDeferredValue, useMemo, useState } from "react";
import type { City, CostTier, IncomeMode, ClimateType } from "@/lib/types";
import { COUNTRY_TRANSLATIONS, CITY_NAME_TRANSLATIONS, LANGUAGE_LABELS } from "@/lib/i18n";
import { POPULAR_CURRENCIES, CITY_FLAG_EMOJIS, CITY_CLIMATE } from "@/lib/constants";
import { CITY_SLUGS } from "@/lib/citySlug";
import { computeLifePressure, getCityClimate } from "@/lib/clientUtils";
import { computeAllNetIncomes } from "@/lib/taxUtils";
import { useSettings } from "@/hooks/useSettings";
import Link from "next/link";
import { useRouter } from "next/navigation";

/* ── Types ── */

type Tab =
  | "income" | "expense" | "savings"
  | "housePrice" | "housing" | "rent"
  | "workhours" | "hourlyWage" | "vacation"
  | "air" | "internet" | "flights"
  | "lifePressure" | "safety" | "healthcare" | "freedom";

type SubSort =
  | "savingsRate" | "bigMacPower" | "subWorkHours" | "yearsToHome"
  | "numbeo" | "homicide" | "gpi" | "gallup"
  | "doctors" | "beds" | "uhc" | "lifeExp"
  | "press" | "democracy" | "cpi"
  | null;

/* ── Config ── */

const GROUPS: { labelKey: string; tabs: Tab[] }[] = [
  { labelKey: "rankGroup_income", tabs: ["income", "expense", "savings"] },
  { labelKey: "rankGroup_housing", tabs: ["housePrice", "housing", "rent"] },
  { labelKey: "rankGroup_work", tabs: ["workhours", "hourlyWage", "vacation"] },
  { labelKey: "rankGroup_environment", tabs: ["air", "internet", "flights"] },
  { labelKey: "rankGroup_index", tabs: ["lifePressure", "safety", "healthcare", "freedom"] },
];

const INDEX_TABS = new Set<Tab>(["lifePressure", "safety", "healthcare", "freedom"]);

const TAB_I18N: Record<Tab, string> = {
  income: "rankTab_income", expense: "rankTab_expense", savings: "rankTab_savings",
  housePrice: "rankTab_housePrice", housing: "rankTab_housing", rent: "rankTab_rent",
  workhours: "rankTab_workhours", hourlyWage: "rankTab_hourlyWage", vacation: "rankTab_vacation",
  air: "rankTab_air", internet: "rankTab_internet", flights: "rankTab_flights",
  lifePressure: "rankTab_lifePressure", safety: "rankTab_safety",
  healthcare: "rankTab_healthcare", freedom: "rankTab_freedom",
};

/* ── Tab "higher is better" map (true = higher is better, false = lower is better) ── */
const TAB_HIGHER: Record<Tab, boolean> = {
  income: true, expense: false, savings: true,
  housePrice: false, housing: false, rent: false,
  workhours: false, hourlyWage: true, vacation: true,
  air: false, internet: true, flights: true,
  lifePressure: false, safety: true, healthcare: true, freedom: true,
};

const tabGroupIdx = (tab: Tab) => GROUPS.findIndex(g => g.tabs.includes(tab));

/* ── Climate filter config ── */
const CLIMATE_TYPES: ClimateType[] = ["tropical", "temperate", "continental", "arid", "mediterranean", "oceanic"];
const CLIMATE_TYPE_I18N: Record<ClimateType, string> = {
  tropical: "climTropical", temperate: "climTemperate", continental: "climContinental",
  arid: "climArid", mediterranean: "climMediterranean", oceanic: "climOceanic",
};

type ClimTier = 0 | 1 | 2;
interface ClimDim { key: string; labelKey: string; tiers: { labelKey: string; test: (v: number) => boolean }[] }

/* Compute p33/p66 percentile thresholds from actual data */
const _climIds = Object.keys(CITY_CLIMATE).map(Number);
const _climVals = (fn: (c: (typeof CITY_CLIMATE)[number]) => number) =>
  _climIds.map(id => fn(CITY_CLIMATE[id])).filter(v => v != null && isFinite(v)).sort((a, b) => a - b);
const _pct = (arr: number[], p: number) => arr[Math.min(Math.floor(arr.length * p), arr.length - 1)];
const _round = (v: number, d = 0) => Math.round(v * 10 ** d) / 10 ** d;

const _tempArr = _climVals(c => c.avgTempC);
const _diffArr = _climVals(c => c.summerAvgC - c.winterAvgC);
const _humArr = _climVals(c => c.humidityPct);
const _sunArr = _climVals(c => c.sunshineHours);

const _tLo = _round(_pct(_tempArr, 1 / 3));
const _tHi = _round(_pct(_tempArr, 2 / 3));
const _dLo = _round(_pct(_diffArr, 1 / 3));
const _dHi = _round(_pct(_diffArr, 2 / 3));
const _hLo = _round(_pct(_humArr, 1 / 3));
const _hHi = _round(_pct(_humArr, 2 / 3));
const _sLo = _round(_pct(_sunArr, 1 / 3));
const _sHi = _round(_pct(_sunArr, 2 / 3));

const _mkTiers = (lo: number, hi: number, keys: [string, string, string]): ClimDim["tiers"] => [
  { labelKey: keys[0], test: v => v < lo },
  { labelKey: keys[1], test: v => v >= lo && v <= hi },
  { labelKey: keys[2], test: v => v > hi },
];

const CLIM_DIMS: ClimDim[] = [
  { key: "temp", labelKey: "climTemp",
    tiers: _mkTiers(_tLo, _tHi, ["climTempLo", "climTempMid", "climTempHi"]) },
  { key: "diff", labelKey: "climTempDiff",
    tiers: _mkTiers(_dLo, _dHi, ["climDiffLo", "climDiffMid", "climDiffHi"]) },
  { key: "rain", labelKey: "climRain",
    tiers: _mkTiers(600, 1200, ["climRainLo", "climRainMid", "climRainHi"]) },
  { key: "humidity", labelKey: "climHumidity",
    tiers: _mkTiers(_hLo, _hHi, ["climHumLo", "climHumMid", "climHumHi"]) },
  { key: "sun", labelKey: "climSun",
    tiers: _mkTiers(_sLo, _sHi, ["climSunLo", "climSunMid", "climSunHi"]) },
];

const climDimVal = (cityId: number, dimKey: string): number | null => {
  const c = getCityClimate(cityId);
  if (!c) return null;
  switch (dimKey) {
    case "temp": return c.avgTempC;
    case "diff": return c.summerAvgC - c.winterAvgC;
    case "rain": return c.annualRainMm;
    case "humidity": return c.humidityPct;
    case "sun": return c.sunshineHours;
    default: return null;
  }
};

/* ── Helpers ── */

type Tier = "good" | "mid" | "bad";

function rankHigher(values: number[], val: number) {
  const unique = [...new Set(values)].sort((a, b) => b - a);
  let rank = 1;
  for (const v of unique) { if (val >= v) return rank; rank += values.filter(x => x === v).length; }
  return values.length;
}

function rankLower(values: number[], val: number) {
  const unique = [...new Set(values)].sort((a, b) => a - b);
  let rank = 1;
  for (const v of unique) { if (val <= v) return rank; rank += values.filter(x => x === v).length; }
  return values.length;
}

function tierHigh(values: number[], val: number): Tier {
  const r = rankHigher(values, val), n = values.length;
  if (r <= n * 0.2) return "good"; if (r > n * 0.8) return "bad"; return "mid";
}

function tierLow(values: number[], val: number): Tier {
  const r = rankLower(values, val), n = values.length;
  if (r <= n * 0.2) return "good"; if (r > n * 0.8) return "bad"; return "mid";
}

function nullLast(aV: number | null, bV: number | null, ascending: boolean): number {
  if (aV === null && bV === null) return 0;
  if (aV === null) return 1; if (bV === null) return -1;
  return ascending ? aV - bV : bV - aV;
}

/* ── Component ── */

interface Props { cities: City[]; locale: string; }

export default function RankingContent({ cities, locale: urlLocale }: Props) {
  const router = useRouter();
  const s = useSettings(urlLocale);
  const { locale, darkMode, themeMode, t, formatCurrency, costTier, profession, incomeMode } = s;
  const [tab, setTabState] = useState<Tab>(() => {
    if (typeof window === "undefined") return "income";
    const saved = localStorage.getItem("rankingTab");
    return saved && Object.keys(TAB_I18N).includes(saved) ? (saved as Tab) : "income";
  });
  const [subSort, setSubSort] = useState<SubSort>(null);
  const [navOpen, setNavOpen] = useState(false);
  const [composite, setCompositeState] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("rankingComposite") === "1";
  });
  const deferredComposite = useDeferredValue(composite);
  const [customTabs, setCustomTabsState] = useState<Set<Tab>>(() => {
    if (typeof window === "undefined") return new Set();
    const saved = localStorage.getItem("rankingCustomTabs");
    if (!saved) return new Set();
    const arr = JSON.parse(saved) as string[];
    return new Set(arr.filter(t => Object.keys(TAB_I18N).includes(t)) as Tab[]);
  });
  const deferredCustomTabs = useDeferredValue(customTabs);
  const [climTypeFilter, setClimTypeFilterState] = useState<Set<ClimateType>>(() => {
    if (typeof window === "undefined") return new Set();
    const saved = localStorage.getItem("rankingClimTypes");
    if (!saved) return new Set();
    return new Set(JSON.parse(saved) as ClimateType[]);
  });
  const [climDimFilter, setClimDimFilterState] = useState<Record<string, Set<ClimTier>>>(() => {
    if (typeof window === "undefined") return {};
    const saved = localStorage.getItem("rankingClimDims");
    if (!saved) return {};
    const obj = JSON.parse(saved) as Record<string, number[]>;
    const result: Record<string, Set<ClimTier>> = {};
    for (const [k, v] of Object.entries(obj)) result[k] = new Set(v as ClimTier[]);
    return result;
  });
  const [climOpen, setClimOpen] = useState(false);
  const [tabsExpanded, setTabsExpanded] = useState(false);
  const setTab = (t: Tab) => { setTabState(t); localStorage.setItem("rankingTab", t); };
  const setComposite: typeof setCompositeState = (v) => {
    setCompositeState(prev => {
      const next = typeof v === "function" ? v(prev) : v;
      localStorage.setItem("rankingComposite", next ? "1" : "0");
      return next;
    });
  };
  const setCustomTabs: typeof setCustomTabsState = (v) => {
    setCustomTabsState(prev => {
      const next = typeof v === "function" ? v(prev) : v;
      localStorage.setItem("rankingCustomTabs", JSON.stringify([...next]));
      return next;
    });
  };
  const setClimTypeFilter: typeof setClimTypeFilterState = (v) => {
    setClimTypeFilterState(prev => {
      const next = typeof v === "function" ? v(prev) : v;
      localStorage.setItem("rankingClimTypes", JSON.stringify([...next]));
      return next;
    });
  };
  const setClimDimFilter: typeof setClimDimFilterState = (v) => {
    setClimDimFilterState(prev => {
      const next = typeof v === "function" ? v(prev) : v;
      const obj: Record<string, number[]> = {};
      for (const [k, s] of Object.entries(next)) obj[k] = [...s];
      localStorage.setItem("rankingClimDims", JSON.stringify(obj));
      return next;
    });
  };

  const professions = cities[0]?.professions ? Object.keys(cities[0].professions) : [];
  const activeProfession = profession && professions.includes(profession) ? profession : professions[0] || "";
  const costField = `cost${costTier.charAt(0).toUpperCase()}${costTier.slice(1)}` as keyof City;

  const selectCls = `text-xs rounded px-1.5 py-1 border ${darkMode ? "bg-slate-800 border-slate-600 text-slate-200" : "bg-white border-slate-300 text-slate-700"}`;
  const navBg = darkMode ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200";

  const tierCls = (tier: Tier) =>
    tier === "good" ? (darkMode ? "text-emerald-400" : "text-emerald-600")
    : tier === "bad" ? (darkMode ? "text-rose-400" : "text-rose-500")
    : (darkMode ? "text-slate-300" : "text-slate-700");

  /* ── Compute data ── */

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const allIncomes = useMemo(() => {
    const gross = cities.map(c => activeProfession && c.professions[activeProfession] != null ? c.professions[activeProfession] : 0);
    return computeAllNetIncomes(cities, gross, incomeMode, s.rates?.rates);
  }, [cities, activeProfession, incomeMode, s.rates]);

  const rows = useMemo(() => cities.map((city, i) => {
    const income = allIncomes[i];
    const cost = city[costField] as number;
    const savings = income - cost * 12;
    const yearsToHome = city.housePrice !== null && savings > 0 ? (city.housePrice * 70) / savings : Infinity;
    const hourlyWage = city.annualWorkHours !== null && city.annualWorkHours > 0 ? income / city.annualWorkHours : 0;
    const savingsRate = income > 0 ? Math.round((savings / income) * 100) : 0;
    const bigMacPower = city.bigMacPrice !== null && city.bigMacPrice > 0 && city.annualWorkHours !== null && city.annualWorkHours > 0
      ? (income / city.annualWorkHours) / city.bigMacPrice : null;
    const lp = computeLifePressure(city, cities, income, allIncomes, costField);
    return {
      city, i, income, monthlyCost: cost, savings, yearsToHome, hourlyWage, savingsRate, bigMacPower,
      housePrice: city.housePrice, monthlyRent: city.monthlyRent,
      annualWorkHours: city.annualWorkHours, paidLeaveDays: city.paidLeaveDays,
      airQuality: city.airQuality, internetSpeedMbps: city.internetSpeedMbps, directFlightCities: city.directFlightCities,
      lifePressure: lp.value, lifePressureConf: lp.confidence,
      safetyIndex: city.safetyIndex, safetyConf: city.safetyConfidence,
      healthcareIndex: city.healthcareIndex, healthcareConf: city.healthcareConfidence,
      freedomIndex: city.freedomIndex, freedomConf: city.freedomConfidence,
      numbeoSafety: city.numbeoSafetyIndex, homicideInv: city.homicideRateInv,
      gpiInv: city.gpiScoreInv, gallupLO: city.gallupLawOrder,
      doctors: city.doctorsPerThousand, beds: city.hospitalBedsPerThousand,
      uhc: city.uhcCoverageIndex, lifeExpectancy: city.lifeExpectancy,
      pressFreedom: city.pressFreedomScore, democracy: city.democracyIndex,
      cpi: city.corruptionPerceptionIndex,
    };
  }), [cities, allIncomes, costField]);

  /* ── Ranking arrays for tier coloring ── */
  const nn = (arr: (number | null)[]): number[] => arr.filter((v): v is number => v !== null);
  const V = useMemo(() => ({
    income: rows.map(r => r.income),
    monthlyCost: rows.map(r => r.monthlyCost),
    savings: rows.map(r => r.savings),
    housePrice: nn(rows.map(r => r.housePrice)),
    yearsToHome: rows.map(r => r.yearsToHome).filter(isFinite),
    monthlyRent: nn(rows.map(r => r.monthlyRent)),
    workHours: nn(rows.map(r => r.annualWorkHours)),
    hourlyWage: rows.filter(r => r.hourlyWage > 0).map(r => r.hourlyWage),
    paidLeave: nn(rows.map(r => r.paidLeaveDays)),
    air: nn(rows.map(r => r.airQuality)),
    internet: nn(rows.map(r => r.internetSpeedMbps)),
    flights: nn(rows.map(r => r.directFlightCities)),
    lp: rows.map(r => r.lifePressure),
    safety: rows.map(r => r.safetyIndex),
    hc: rows.map(r => r.healthcareIndex),
    freedom: rows.map(r => r.freedomIndex),
    savingsRate: rows.map(r => r.savingsRate),
    bigMac: nn(rows.map(r => r.bigMacPower)),
    numbeo: nn(rows.map(r => r.numbeoSafety)),
    homicide: nn(rows.map(r => r.homicideInv)),
    gpi: nn(rows.map(r => r.gpiInv)),
    gallup: nn(rows.map(r => r.gallupLO)),
    doctors: nn(rows.map(r => r.doctors)),
    beds: nn(rows.map(r => r.beds)),
    uhc: nn(rows.map(r => r.uhc)),
    lifeExp: nn(rows.map(r => r.lifeExpectancy)),
    press: nn(rows.map(r => r.pressFreedom)),
    demo: nn(rows.map(r => r.democracy)),
    cpi: nn(rows.map(r => r.cpi)),
  }), [rows]);

  /* ── Composite scoring ── */
  /* ── Tab value accessor for composite scoring ── */
  const tabVal = (r: typeof rows[0], tb: Tab): number | null => {
    switch (tb) {
      case "income": return r.income;
      case "expense": return r.monthlyCost;
      case "savings": return r.savings;
      case "housePrice": return r.housePrice;
      case "housing": return isFinite(r.yearsToHome) ? r.yearsToHome : null;
      case "rent": return r.monthlyRent;
      case "workhours": return r.annualWorkHours;
      case "hourlyWage": return r.hourlyWage > 0 ? r.hourlyWage : null;
      case "vacation": return r.paidLeaveDays;
      case "air": return r.airQuality;
      case "internet": return r.internetSpeedMbps;
      case "flights": return r.directFlightCities;
      case "lifePressure": return r.lifePressure;
      case "safety": return r.safetyIndex;
      case "healthcare": return r.healthcareIndex;
      case "freedom": return r.freedomIndex;
    }
  };

  const compositeScores = useMemo(() => {
    if (!deferredComposite || deferredCustomTabs.size === 0) return null;
    const active = [...deferredCustomTabs];
    const ranges = active.map(tb => {
      const vals = rows.map(r => tabVal(r, tb)).filter((v): v is number => v !== null && isFinite(v));
      return { min: Math.min(...vals), max: Math.max(...vals), higher: TAB_HIGHER[tb] };
    });
    return rows.map(r => {
      let sum = 0, count = 0;
      active.forEach((tb, ti) => {
        const v = tabVal(r, tb);
        if (v === null || !isFinite(v)) return;
        const { min, max, higher } = ranges[ti];
        if (max === min) { sum += 50; count++; return; }
        const norm = ((v - min) / (max - min)) * 100;
        sum += higher ? norm : (100 - norm);
        count++;
      });
      return count > 0 ? sum / count : -1;
    });
  }, [deferredComposite, deferredCustomTabs, rows]);

  /* ── Sort ── */
  const sorted = useMemo(() => {
    if (deferredComposite && compositeScores) {
      const indexed = rows.map((r, i) => ({ r, s: compositeScores[i] }));
      indexed.sort((a, b) => b.s - a.s);
      return indexed.map(x => x.r);
    }
    const key = subSort || tab;
    return [...rows].sort((a, b) => {
      switch (key) {
        case "income": return b.income - a.income;
        case "expense": return a.monthlyCost - b.monthlyCost;
        case "savings": return b.savings - a.savings;
        case "housePrice": return nullLast(a.housePrice, b.housePrice, true);
        case "housing": {
          const ay = isFinite(a.yearsToHome) ? a.yearsToHome : 999999;
          const by = isFinite(b.yearsToHome) ? b.yearsToHome : 999999;
          return ay - by;
        }
        case "rent": return nullLast(a.monthlyRent, b.monthlyRent, true);
        case "workhours": return nullLast(a.annualWorkHours, b.annualWorkHours, true);
        case "hourlyWage": return b.hourlyWage - a.hourlyWage;
        case "vacation": return nullLast(a.paidLeaveDays, b.paidLeaveDays, false);
        case "air": return nullLast(a.airQuality, b.airQuality, true);
        case "internet": return nullLast(a.internetSpeedMbps, b.internetSpeedMbps, false);
        case "flights": return nullLast(a.directFlightCities, b.directFlightCities, false);
        case "lifePressure": return a.lifePressure - b.lifePressure;
        case "safety": return b.safetyIndex - a.safetyIndex;
        case "healthcare": return b.healthcareIndex - a.healthcareIndex;
        case "freedom": return b.freedomIndex - a.freedomIndex;
        case "savingsRate": return b.savingsRate - a.savingsRate;
        case "bigMacPower": return nullLast(a.bigMacPower, b.bigMacPower, false);
        case "subWorkHours": return nullLast(a.annualWorkHours, b.annualWorkHours, true);
        case "yearsToHome": {
          const ay = isFinite(a.yearsToHome) ? a.yearsToHome : 999999;
          const by = isFinite(b.yearsToHome) ? b.yearsToHome : 999999;
          return ay - by;
        }
        case "numbeo": return nullLast(a.numbeoSafety, b.numbeoSafety, false);
        case "homicide": return nullLast(a.homicideInv, b.homicideInv, false);
        case "gpi": return nullLast(a.gpiInv, b.gpiInv, false);
        case "gallup": return nullLast(a.gallupLO, b.gallupLO, false);
        case "doctors": return nullLast(a.doctors, b.doctors, false);
        case "beds": return nullLast(a.beds, b.beds, false);
        case "uhc": return nullLast(a.uhc, b.uhc, false);
        case "lifeExp": return nullLast(a.lifeExpectancy, b.lifeExpectancy, false);
        case "press": return nullLast(a.pressFreedom, b.pressFreedom, false);
        case "democracy": return nullLast(a.democracy, b.democracy, false);
        case "cpi": return nullLast(a.cpi, b.cpi, false);
        default: return 0;
      }
    });
  }, [rows, tab, subSort, deferredComposite, compositeScores]);

  /* ── Climate filtering ── */
  const hasClimFilter = climTypeFilter.size > 0 || Object.values(climDimFilter).some(s => s.size > 0);
  const filtered = useMemo(() => {
    if (!hasClimFilter) return sorted;
    return sorted.filter(r => {
      const clim = getCityClimate(r.city.id);
      if (!clim) return false;
      if (climTypeFilter.size > 0 && !climTypeFilter.has(clim.type)) return false;
      for (const dim of CLIM_DIMS) {
        const sel = climDimFilter[dim.key];
        if (!sel || sel.size === 0) continue;
        const v = climDimVal(r.city.id, dim.key);
        if (v === null) return false;
        const matchesTier = [...sel].some(ti => dim.tiers[ti].test(v));
        if (!matchesTier) return false;
      }
      return true;
    });
  }, [sorted, climTypeFilter, climDimFilter, hasClimFilter]);

  const toggleClimType = (ct: ClimateType) => {
    setClimTypeFilter(prev => {
      const next = new Set(prev);
      if (next.has(ct)) next.delete(ct); else next.add(ct);
      return next;
    });
  };
  const toggleClimDim = (dimKey: string, tier: ClimTier) => {
    setClimDimFilter(prev => {
      const cur = prev[dimKey] || new Set<ClimTier>();
      const next = new Set(cur);
      if (next.has(tier)) next.delete(tier); else next.add(tier);
      return { ...prev, [dimKey]: next };
    });
  };
  const clearClimFilter = () => { setClimTypeFilter(new Set()); setClimDimFilter({}); };

  /* ── Tab handlers ── */
  const handleTab = (newTab: Tab) => {
    if (composite) {
      setCustomTabs(prev => {
        const next = new Set(prev);
        if (next.has(newTab)) { if (next.size > 1) next.delete(newTab); }
        else next.add(newTab);
        return next;
      });
    } else {
      setTab(newTab); setSubSort(null);
    }
  };
  const handleSubSort = (ss: SubSort) => setSubSort(prev => prev === ss ? null : ss);
  const toggleComposite = () => {
    setComposite(prev => {
      if (!prev) {
        // Entering composite: pre-select the current normal-mode tab
        setCustomTabs(new Set([tab]));
      } else {
        // Leaving composite: pick the first selected tab in GROUPS order, or fallback to first tab
        const allTabs = GROUPS.flatMap(g => g.tabs);
        const first = allTabs.find(t => customTabs.has(t));
        setTab(first || allTabs[0]);
      }
      return !prev;
    });
    setSubSort(null);
  };

  const activeGroup = tabGroupIdx(tab);
  const isIndex = INDEX_TABS.has(tab);
  const sortKey = subSort || tab;

  /* ── Compute display ranks (dense — ties get same rank) ── */
  const displayRanks = useMemo(() => {
    const ranks: number[] = new Array(filtered.length);
    if (filtered.length === 0) return ranks;
    ranks[0] = 1;
    for (let i = 1; i < filtered.length; i++) {
      if (deferredComposite && compositeScores) {
        const ai = rows.indexOf(filtered[i - 1]);
        const bi = rows.indexOf(filtered[i]);
        const va = ai >= 0 ? Math.round(compositeScores[ai] * 10) : null;
        const vb = bi >= 0 ? Math.round(compositeScores[bi] * 10) : null;
        ranks[i] = (va !== null && vb !== null && va === vb) ? ranks[i - 1] : i + 1;
        continue;
      }
      // Compare the sort-determining values of adjacent rows
      const a = filtered[i - 1];
      const b = filtered[i];
      let same = false;
      const key = subSort || tab;
      const getVal = (r: typeof sorted[0]): number | null => {
        switch (key) {
          case "income": return r.income;
          case "expense": return r.monthlyCost;
          case "savings": return r.savings;
          case "housePrice": return r.housePrice;
          case "housing": return isFinite(r.yearsToHome) ? Math.round(r.yearsToHome * 10) : null;
          case "rent": return r.monthlyRent;
          case "workhours": return r.annualWorkHours;
          case "hourlyWage": return r.hourlyWage > 0 ? Math.round(r.hourlyWage * 100) : null;
          case "vacation": return r.paidLeaveDays;
          case "air": return r.airQuality;
          case "internet": return r.internetSpeedMbps;
          case "flights": return r.directFlightCities;
          case "lifePressure": return Math.round(r.lifePressure * 10);
          case "safety": return Math.round(r.safetyIndex * 10);
          case "healthcare": return Math.round(r.healthcareIndex * 10);
          case "freedom": return Math.round(r.freedomIndex * 10);
          case "savingsRate": return r.savingsRate;
          case "bigMacPower": return r.bigMacPower !== null ? Math.round(r.bigMacPower * 10) : null;
          case "subWorkHours": return r.annualWorkHours;
          case "yearsToHome": return isFinite(r.yearsToHome) ? Math.round(r.yearsToHome * 10) : null;
          case "numbeo": return r.numbeoSafety;
          case "homicide": return r.homicideInv;
          case "gpi": return r.gpiInv;
          case "gallup": return r.gallupLO;
          case "doctors": return r.doctors !== null ? Math.round(r.doctors * 10) : null;
          case "beds": return r.beds !== null ? Math.round(r.beds * 10) : null;
          case "uhc": return r.uhc;
          case "lifeExp": return r.lifeExpectancy !== null ? Math.round(r.lifeExpectancy * 10) : null;
          case "press": return r.pressFreedom;
          case "democracy": return r.democracy !== null ? Math.round(r.democracy * 10) : null;
          case "cpi": return r.cpi;
          default: return null;
        }
      };
      const va = getVal(a);
      const vb = getVal(b);
      same = va !== null && vb !== null && va === vb;
      ranks[i] = same ? ranks[i - 1] : i + 1;
    }
    return ranks;
  }, [filtered, tab, subSort, deferredComposite, compositeScores, rows]);

  /* ── Rendering helpers ── */
  const getCityLabel = (c: City) => CITY_NAME_TRANSLATIONS[c.id]?.[locale] || c.name;
  const getCountryLabel = (c: string) => COUNTRY_TRANSLATIONS[c]?.[locale] || c;
  const fmtN = (v: number | null, unit = "", decimals = 0) =>
    v !== null ? `${decimals > 0 ? v.toFixed(decimals) : v}${unit ? " " + unit : ""}` : "\u2014";

  const thBase = `px-3 py-2.5 text-left text-xs font-semibold tracking-wide whitespace-nowrap ${darkMode ? "text-slate-400" : "text-slate-500"}`;
  const tdBase = "px-3 py-2.5 text-sm";
  const headerBg = darkMode ? "bg-slate-800" : "bg-slate-100";
  const sortColBg = darkMode ? "bg-blue-900/20" : "bg-blue-50/60";

  const sortArrow = (_key: string) => "";

  /* ── Sub-sort column header ── */
  const SubTh = ({ sk, label, weight, className = "" }: { sk: SubSort; label: string; weight?: string; className?: string }) => {
    const isActive = sk === null ? (subSort === null) : (sortKey === sk);
    return (
      <th className={`${thBase} cursor-pointer hover:underline ${isActive ? sortColBg : ""} ${className}`}
        onClick={() => sk === null ? setSubSort(null) : handleSubSort(sk)}>
        {label}{weight && <span className="opacity-50 ml-0.5">({weight})</span>}{sortArrow(sk === null ? tab : (sk as string))}
      </th>
    );
  };

  /* ── Tier-colored cell ── */
  const TC = ({ val, formatted, vals, higher, conf, active }: {
    val: number | null; formatted: string; vals: number[]; higher: boolean; conf?: string; active?: boolean;
  }) => {
    const bg = active ? sortColBg : "";
    if (val === null || (typeof val === "number" && !isFinite(val)))
      return <td className={`${tdBase} ${bg} ${darkMode ? "text-slate-500" : "text-slate-400"}`}>{formatted}</td>;
    const tier = higher ? tierHigh(vals, val) : tierLow(vals, val);
    return (
      <td className={`${tdBase} ${bg} font-semibold ${tierCls(tier)}`}>
        {formatted}{conf === "low" && <span className={`ml-1 text-xs font-normal ${darkMode ? "text-amber-400" : "text-amber-600"}`}>*</span>}
      </td>
    );
  };

  /* ── Column headers ── */
  const renderHeaders = () => {
    if (deferredComposite) {
      const activeTabs = GROUPS.flatMap(g => g.tabs).filter(t => deferredCustomTabs.has(t));
      return (<>
        <th className={`${thBase} ${sortColBg}`}>{t("compositeScore")}</th>
        {activeTabs.map(ct => (
          <th key={ct} className={thBase}>{t(TAB_I18N[ct]).replace(/^[^\s]+\s/, "")}</th>
        ))}
      </>);
    }
    if (isIndex) {
      switch (tab) {
        case "lifePressure": return (<>
          <SubTh sk={null} label={t("lifePressureIndex")} />
          <SubTh sk="savingsRate" label={t("savingsRateLabel")} weight="30%" />
          <SubTh sk="bigMacPower" label={t("bigMacPower")} weight="25%" />
          <SubTh sk="subWorkHours" label={t("annualWorkHours")} weight="25%" />
          <SubTh sk="yearsToHome" label={t("homePurchaseYears")} weight="20%" />
        </>);
        case "safety": return (<>
          <SubTh sk={null} label={t("safetyIndex")} />
          <SubTh sk="numbeo" label={t("safetyNumbeo")} weight="35%" />
          <SubTh sk="homicide" label={t("safetyHomicide")} weight="30%" />
          <SubTh sk="gpi" label={t("safetyGpi")} weight="20%" />
          <SubTh sk="gallup" label={t("safetyGallup")} weight="15%" />
        </>);
        case "healthcare": return (<>
          <SubTh sk={null} label={t("healthcareIndex")} />
          <SubTh sk="doctors" label={t("doctorsPerThousand")} weight="35%" />
          <SubTh sk="beds" label={t("hospitalBeds")} weight="25%" />
          <SubTh sk="uhc" label={t("uhcCoverage")} weight="25%" />
          <SubTh sk="lifeExp" label={t("lifeExpectancy")} weight="15%" />
        </>);
        case "freedom": return (<>
          <SubTh sk={null} label={t("institutionalFreedom")} />
          <SubTh sk="press" label={t("pressFreedom")} weight="35%" />
          <SubTh sk="democracy" label={t("democracyIdx")} weight="35%" />
          <SubTh sk="cpi" label={t("corruptionIdx")} weight="30%" />
        </>);
      }
    }
    const group = GROUPS[activeGroup];
    return group.tabs.map(gTab => (
      <th key={gTab} className={`${thBase} cursor-pointer hover:underline ${sortKey === gTab ? sortColBg : ""}`}
        onClick={() => handleTab(gTab)}>
        {t(TAB_I18N[gTab]).replace(/^[^\s]+\s/, "")}{sortArrow(gTab)}
      </th>
    ));
  };

  /* ── Row cells ── */
  const tabValsMap: Record<Tab, number[]> = {
    income: V.income, expense: V.monthlyCost, savings: V.savings,
    housePrice: V.housePrice, housing: V.yearsToHome, rent: V.monthlyRent,
    workhours: V.workHours, hourlyWage: V.hourlyWage, vacation: V.paidLeave,
    air: V.air, internet: V.internet, flights: V.flights,
    lifePressure: V.lp, safety: V.safety, healthcare: V.hc, freedom: V.freedom,
  };

  const fmtTabVal = (r: typeof rows[0], tb: Tab): string => {
    switch (tb) {
      case "income": return formatCurrency(r.income);
      case "expense": return formatCurrency(r.monthlyCost);
      case "savings": return formatCurrency(r.savings);
      case "housePrice": return r.housePrice !== null ? `${formatCurrency(r.housePrice)}/m\u00b2` : "\u2014";
      case "housing": return isFinite(r.yearsToHome) ? `${r.yearsToHome.toFixed(1)} ${t("insightYears")}` : "\u2014";
      case "rent": return r.monthlyRent !== null ? formatCurrency(r.monthlyRent) : "\u2014";
      case "workhours": return r.annualWorkHours !== null ? `${r.annualWorkHours} ${t("unitH")}` : "\u2014";
      case "hourlyWage": return r.hourlyWage > 0 ? formatCurrency(Math.round(r.hourlyWage * 100) / 100) : "\u2014";
      case "vacation": return r.paidLeaveDays !== null ? `${r.paidLeaveDays} ${t("paidLeaveDaysUnit")}` : "\u2014";
      case "air": return r.airQuality !== null ? `AQI ${r.airQuality}` : "\u2014";
      case "internet": return r.internetSpeedMbps !== null ? `${r.internetSpeedMbps} Mbps` : "\u2014";
      case "flights": return r.directFlightCities !== null ? `${r.directFlightCities}` : "\u2014";
      case "lifePressure": return r.lifePressure.toFixed(1);
      case "safety": return r.safetyIndex.toFixed(1);
      case "healthcare": return r.healthcareIndex.toFixed(1);
      case "freedom": return r.freedomIndex.toFixed(1);
    }
  };

  const renderCells = (r: typeof rows[0]) => {
    if (deferredComposite && compositeScores) {
      const idx = rows.indexOf(r);
      const score = idx >= 0 ? compositeScores[idx] : -1;
      const allScores = compositeScores.filter(s => s >= 0);
      const activeTabs = GROUPS.flatMap(g => g.tabs).filter(ct => deferredCustomTabs.has(ct));
      return (<>
        <TC val={score >= 0 ? score : null} formatted={score >= 0 ? score.toFixed(1) : "\u2014"} vals={allScores} higher={true} active />
        {activeTabs.map(ct => {
          const v = tabVal(r, ct);
          return <TC key={ct} val={v} formatted={fmtTabVal(r, ct)} vals={tabValsMap[ct]} higher={TAB_HIGHER[ct]} />;
        })}
      </>);
    }
    if (isIndex) {
      switch (tab) {
        case "lifePressure": return (<>
          <TC val={r.lifePressure} formatted={r.lifePressure.toFixed(1)} vals={V.lp} higher={false} conf={r.lifePressureConf} active={sortKey === "lifePressure"} />
          <TC val={r.savingsRate} formatted={`${r.savingsRate}%`} vals={V.savingsRate} higher={true} active={sortKey === "savingsRate"} />
          <TC val={r.bigMacPower} formatted={r.bigMacPower !== null ? r.bigMacPower.toFixed(1) : "\u2014"} vals={V.bigMac} higher={true} active={sortKey === "bigMacPower"} />
          <TC val={r.annualWorkHours} formatted={r.annualWorkHours !== null ? `${r.annualWorkHours} ${t("unitH")}` : "\u2014"} vals={V.workHours} higher={false} active={sortKey === "subWorkHours"} />
          <TC val={isFinite(r.yearsToHome) ? r.yearsToHome : null} formatted={isFinite(r.yearsToHome) ? `${r.yearsToHome.toFixed(1)} ${t("insightYears")}` : "\u2014"} vals={V.yearsToHome} higher={false} active={sortKey === "yearsToHome"} />
        </>);
        case "safety": return (<>
          <TC val={r.safetyIndex} formatted={r.safetyIndex.toFixed(1)} vals={V.safety} higher={true} conf={r.safetyConf} active={sortKey === "safety"} />
          <TC val={r.numbeoSafety} formatted={fmtN(r.numbeoSafety)} vals={V.numbeo} higher={true} active={sortKey === "numbeo"} />
          <TC val={r.homicideInv} formatted={fmtN(r.homicideInv)} vals={V.homicide} higher={true} active={sortKey === "homicide"} />
          <TC val={r.gpiInv} formatted={fmtN(r.gpiInv)} vals={V.gpi} higher={true} active={sortKey === "gpi"} />
          <TC val={r.gallupLO} formatted={fmtN(r.gallupLO)} vals={V.gallup} higher={true} active={sortKey === "gallup"} />
        </>);
        case "healthcare": return (<>
          <TC val={r.healthcareIndex} formatted={r.healthcareIndex.toFixed(1)} vals={V.hc} higher={true} conf={r.healthcareConf} active={sortKey === "healthcare"} />
          <TC val={r.doctors} formatted={fmtN(r.doctors, "", 1)} vals={V.doctors} higher={true} active={sortKey === "doctors"} />
          <TC val={r.beds} formatted={fmtN(r.beds, "", 1)} vals={V.beds} higher={true} active={sortKey === "beds"} />
          <TC val={r.uhc} formatted={fmtN(r.uhc)} vals={V.uhc} higher={true} active={sortKey === "uhc"} />
          <TC val={r.lifeExpectancy} formatted={fmtN(r.lifeExpectancy, t("lifeExpectancyUnit"), 1)} vals={V.lifeExp} higher={true} active={sortKey === "lifeExp"} />
        </>);
        case "freedom": return (<>
          <TC val={r.freedomIndex} formatted={r.freedomIndex.toFixed(1)} vals={V.freedom} higher={true} conf={r.freedomConf} active={sortKey === "freedom"} />
          <TC val={r.pressFreedom} formatted={fmtN(r.pressFreedom)} vals={V.press} higher={true} active={sortKey === "press"} />
          <TC val={r.democracy} formatted={fmtN(r.democracy, "", 1)} vals={V.demo} higher={true} active={sortKey === "democracy"} />
          <TC val={r.cpi} formatted={fmtN(r.cpi)} vals={V.cpi} higher={true} active={sortKey === "cpi"} />
        </>);
      }
    }
    const g = activeGroup;
    if (g === 0) return (<>
      <TC val={r.income} formatted={formatCurrency(r.income)} vals={V.income} higher={true} active={sortKey === "income"} />
      <TC val={r.monthlyCost} formatted={formatCurrency(r.monthlyCost)} vals={V.monthlyCost} higher={false} active={sortKey === "expense"} />
      <TC val={r.savings} formatted={formatCurrency(r.savings)} vals={V.savings} higher={true} active={sortKey === "savings"} />
    </>);
    if (g === 1) return (<>
      <TC val={r.housePrice} formatted={r.housePrice !== null ? `${formatCurrency(r.housePrice)}/m\u00b2` : "\u2014"} vals={V.housePrice} higher={false} active={sortKey === "housePrice"} />
      <TC val={isFinite(r.yearsToHome) ? r.yearsToHome : null} formatted={isFinite(r.yearsToHome) ? `${r.yearsToHome.toFixed(1)} ${t("insightYears")}` : t("rankNoSavings")} vals={V.yearsToHome} higher={false} active={sortKey === "housing"} />
      <TC val={r.monthlyRent} formatted={r.monthlyRent !== null ? formatCurrency(r.monthlyRent) : "\u2014"} vals={V.monthlyRent} higher={false} active={sortKey === "rent"} />
    </>);
    if (g === 2) return (<>
      <TC val={r.annualWorkHours} formatted={r.annualWorkHours !== null ? `${r.annualWorkHours} ${t("unitH")}` : "\u2014"} vals={V.workHours} higher={false} active={sortKey === "workhours"} />
      <TC val={r.hourlyWage > 0 ? r.hourlyWage : null} formatted={r.hourlyWage > 0 ? formatCurrency(Math.round(r.hourlyWage * 100) / 100) : "\u2014"} vals={V.hourlyWage} higher={true} active={sortKey === "hourlyWage"} />
      <TC val={r.paidLeaveDays} formatted={r.paidLeaveDays !== null ? `${r.paidLeaveDays} ${t("paidLeaveDaysUnit")}` : "\u2014"} vals={V.paidLeave} higher={true} active={sortKey === "vacation"} />
    </>);
    if (g === 3) return (<>
      <TC val={r.airQuality} formatted={r.airQuality !== null ? `AQI ${r.airQuality}` : "\u2014"} vals={V.air} higher={false} active={sortKey === "air"} />
      <TC val={r.internetSpeedMbps} formatted={r.internetSpeedMbps !== null ? `${r.internetSpeedMbps} Mbps` : "\u2014"} vals={V.internet} higher={true} active={sortKey === "internet"} />
      <TC val={r.directFlightCities} formatted={r.directFlightCities !== null ? `${r.directFlightCities} ${t("directFlightsUnit")}` : "\u2014"} vals={V.flights} higher={true} active={sortKey === "flights"} />
    </>);
    return null;
  };

  /* ── JSX ── */
  useEffect(() => { document.title = `${t("navRanking")} | WhichCity`; }, [locale]);

  if (!s.ready) return null;
  return (
    <div className={`min-h-screen transition-colors ${darkMode ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"}`}>

      {/* Top bar */}
      <div className={`sticky top-0 z-50 border-b py-2.5 ${navBg}`}>
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Link href={`/${locale}`} className={`text-xs px-2 py-1 rounded border transition ${darkMode ? "bg-slate-800 border-slate-600 text-blue-300 hover:bg-slate-700" : "bg-white border-slate-300 text-blue-700 hover:bg-blue-50"}`}>
                {t("navHome")}
              </Link>
              <Link href={`/${locale}/ranking`} className={`text-xs px-2 py-1 rounded border ${darkMode ? "bg-amber-900/40 border-amber-500/50 text-amber-300" : "bg-amber-50 border-amber-300 text-amber-700"}`}>
                {t("navRanking")}
              </Link>
              <button onClick={() => { const slugs = Object.values(CITY_SLUGS); router.push(`/${locale}/city/${slugs[Math.floor(Math.random() * slugs.length)]}`); }}
                className={`text-xs px-2 py-1 rounded border transition ${darkMode ? "bg-slate-800 border-slate-600 text-emerald-300 hover:bg-slate-700" : "bg-white border-slate-300 text-emerald-700 hover:bg-emerald-50"}`}>
                {t("navRandomCity")}
              </button>
              <Link href={`/${locale}/compare`}
                className={`text-xs px-2 py-1 rounded border transition ${darkMode ? "bg-slate-800 border-slate-600 text-violet-300 hover:bg-slate-700" : "bg-white border-slate-300 text-violet-700 hover:bg-violet-50"}`}>
                {t("navCompare")}
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setNavOpen(v => !v)}
                className={`min-[1080px]:hidden text-xs px-2 py-1 rounded border transition ${darkMode ? "bg-slate-800 border-slate-600 text-slate-300" : "bg-white border-slate-300 text-slate-500"}`}>
                <svg className={`w-3.5 h-3.5 transition-transform duration-300 ${navOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
              </button>
              <div className="hidden min-[1080px]:flex items-center gap-2">
                <select value={activeProfession} onChange={e => s.setProfession(e.target.value)} className={selectCls}>
                  {professions.map(p => <option key={p} value={p}>{s.getProfessionLabel(p)}</option>)}
                </select>
                <select value={costTier} onChange={e => s.setCostTier(e.target.value as CostTier)} className={selectCls}>
                  {(["moderate", "budget"] as const).map(tier => (
                    <option key={tier} value={tier}>{t(`costTier${tier.charAt(0).toUpperCase()}${tier.slice(1)}`)}</option>
                  ))}
                </select>
                <select value={incomeMode} onChange={e => s.setIncomeMode(e.target.value as IncomeMode)} className={selectCls}>
                  <option value="gross">{t("incomeModeGross")}</option>
                  <option value="net">{t("incomeModeNet")}</option>
                  <option value="expatNet">{t("incomeModeExpatNet")}</option>
                </select>
                <select value={locale} onChange={e => s.setLocale(e.target.value as any)} className={selectCls}>
                  {(Object.keys(LANGUAGE_LABELS) as any[]).map(lang => (
                    <option key={lang} value={lang}>{LANGUAGE_LABELS[lang]}</option>
                  ))}
                </select>
                <select value={s.currency} onChange={e => s.setCurrency(e.target.value)} className={selectCls}>
                  {POPULAR_CURRENCIES.map(cur => <option key={cur} value={cur}>{cur}</option>)}
                </select>
                <select value={themeMode} onChange={e => s.setThemeMode(e.target.value as "auto"|"light"|"dark")} className={selectCls}>
                  <option value="auto">{t("themeAuto")}</option>
                  <option value="light">{t("dayMode")}</option>
                  <option value="dark">{t("nightMode")}</option>
                </select>
              </div>
            </div>
          </div>
          <div className={`min-[1080px]:hidden grid transition-[grid-template-rows] duration-300 ease-in-out ${navOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
            <div className="overflow-hidden min-h-0">
              <div className="flex items-center gap-2 flex-wrap pt-2">
                <select value={activeProfession} onChange={e => s.setProfession(e.target.value)} className={selectCls}>
                  {professions.map(p => <option key={p} value={p}>{s.getProfessionLabel(p)}</option>)}
                </select>
                <select value={costTier} onChange={e => s.setCostTier(e.target.value as CostTier)} className={selectCls}>
                  {(["moderate", "budget"] as const).map(tier => (
                    <option key={tier} value={tier}>{t(`costTier${tier.charAt(0).toUpperCase()}${tier.slice(1)}`)}</option>
                  ))}
                </select>
                <select value={incomeMode} onChange={e => s.setIncomeMode(e.target.value as IncomeMode)} className={selectCls}>
                  <option value="gross">{t("incomeModeGross")}</option>
                  <option value="net">{t("incomeModeNet")}</option>
                  <option value="expatNet">{t("incomeModeExpatNet")}</option>
                </select>
                <select value={locale} onChange={e => s.setLocale(e.target.value as any)} className={selectCls}>
                  {(Object.keys(LANGUAGE_LABELS) as any[]).map(lang => (
                    <option key={lang} value={lang}>{LANGUAGE_LABELS[lang]}</option>
                  ))}
                </select>
                <select value={s.currency} onChange={e => s.setCurrency(e.target.value)} className={selectCls}>
                  {POPULAR_CURRENCIES.map(cur => <option key={cur} value={cur}>{cur}</option>)}
                </select>
                <select value={themeMode} onChange={e => s.setThemeMode(e.target.value as "auto"|"light"|"dark")} className={selectCls}>
                  <option value="auto">{t("themeAuto")}</option>
                  <option value="light">{t("dayMode")}</option>
                  <option value="dark">{t("nightMode")}</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 pt-4 sm:pt-8">

        {/* Header */}
        <div className="text-center mb-6">
          <h1 className={`text-3xl sm:text-4xl font-extrabold tracking-tight mb-2 ${darkMode ? "text-white" : "text-slate-900"}`}>
            {t("rankingTitle")}
          </h1>
          <p className={`text-base max-w-xl mx-auto ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
            {t("rankingSubtitle")}
          </p>
        </div>

        {/* Grouped tab selector */}
        <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-x-2">
          {/* Climate filter button */}
          <button onClick={() => { setClimOpen(v => !v); setTabsExpanded(false); }}
            className={`order-1 py-2 px-3 rounded-lg text-xs font-medium transition-colors flex items-center ${
              climOpen
                ? (darkMode ? "bg-emerald-900/40 text-emerald-300 ring-1 ring-emerald-500/50" : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200")
                : (darkMode ? "bg-slate-800 text-slate-400" : "bg-slate-100 text-slate-500")
            }`}>
            <span className="w-4 shrink-0" />
            <span className="flex-1 min-w-0 truncate text-center">
            {hasClimFilter
              ? (() => {
                  const parts: React.ReactNode[] = [];
                  if (climTypeFilter.size > 0) {
                    const suffix = t("climSuffix");
                    const typeNames = CLIMATE_TYPES.filter(ct => climTypeFilter.has(ct)).map(ct => t(CLIMATE_TYPE_I18N[ct]));
                    parts.push(<span key="types" className="font-bold text-emerald-500">{typeNames.join("/") + suffix}</span>);
                  }
                  CLIM_DIMS.forEach(dim => {
                    const sel = climDimFilter[dim.key];
                    if (!sel || sel.size === 0) return;
                    const prefix = t(dim.labelKey);
                    const tierNames = dim.tiers.filter((_, ti) => sel.has(ti as ClimTier)).map(tier => t(tier.labelKey));
                    parts.push(<span key={dim.key} className="font-bold text-emerald-500">{prefix + tierNames.join("/")}</span>);
                  });
                  return parts.map((p, i) => <span key={i}>{i > 0 && <span className="opacity-40"> · </span>}{p}</span>);
                })()
              : <span className="text-emerald-500">{t("allClimates")}</span>}
            </span>
            <svg className="w-4 h-4 shrink-0 opacity-40 transition-transform" style={{ transform: climOpen ? "rotate(180deg)" : "" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Climate filter dropdown – between buttons on narrow, below both on wide */}
          <div className="order-2 sm:order-3 sm:col-span-2 grid transition-[grid-template-rows] duration-300 ease-in-out" style={{ gridTemplateRows: climOpen ? "1fr" : "0fr" }}>
            <div className="overflow-hidden">
              <div className="space-y-2 pt-1.5">
              <div className="flex justify-end gap-0.5 text-xs">
                <button onClick={clearClimFilter}
                  className={`px-2 py-0.5 transition-colors ${
                    hasClimFilter
                      ? (darkMode ? "text-emerald-400 font-semibold" : "text-emerald-600 font-semibold")
                      : (darkMode ? "text-slate-600" : "text-slate-400")
                  }`}>
                  {t("clear")}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <div className={`text-xs font-medium shrink-0 w-16 ml-1 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{t("climType")}</div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1 flex-1">
                  {CLIMATE_TYPES.map(ct => {
                    const sel = climTypeFilter.has(ct);
                    return (
                      <button key={ct} onClick={() => toggleClimType(ct)}
                        className={`py-1.5 rounded-lg font-medium text-xs transition text-center truncate ${
                          sel
                            ? "bg-emerald-500 text-white shadow-sm"
                            : (darkMode ? "bg-slate-700 text-slate-400" : "bg-slate-100 text-slate-600")
                        }`}>
                        {t(CLIMATE_TYPE_I18N[ct])}
                      </button>
                    );
                  })}
                </div>
              </div>
              {CLIM_DIMS.map(dim => (
                <div key={dim.key} className="flex items-center gap-2">
                  <div className={`text-xs font-medium shrink-0 w-16 ml-1 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{t(dim.labelKey)}</div>
                  <div className="grid grid-cols-3 gap-1 flex-1">
                    {dim.tiers.map((tier, ti) => {
                      const sel = climDimFilter[dim.key]?.has(ti as ClimTier);
                      return (
                        <button key={ti} onClick={() => toggleClimDim(dim.key, ti as ClimTier)}
                          className={`py-1.5 rounded-lg font-medium text-xs transition text-center truncate ${
                            sel
                              ? "bg-emerald-500 text-white shadow-sm"
                              : (darkMode ? "bg-slate-700 text-slate-400" : "bg-slate-100 text-slate-600")
                          }`}>
                          {t(tier.labelKey)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            </div>
          </div>

          {/* Tab selection button */}
          <button onClick={() => { setTabsExpanded(v => !v); setClimOpen(false); }}
            className={`order-3 sm:order-2 mt-2 sm:mt-0 py-2 px-3 rounded-lg text-xs font-medium transition-colors flex items-center ${
              tabsExpanded
                ? (composite
                    ? (darkMode ? "bg-amber-900/40 text-amber-300 ring-1 ring-amber-500/50" : "bg-amber-50 text-amber-700 ring-1 ring-amber-200")
                    : (darkMode ? "bg-blue-900/40 text-blue-300 ring-1 ring-blue-500/50" : "bg-blue-50 text-blue-700 ring-1 ring-blue-200"))
                : (darkMode ? "bg-slate-800 text-slate-400" : "bg-slate-100 text-slate-500")
            }`}>
            <span className="w-4 shrink-0" />
            <span className="flex-1 min-w-0 truncate text-center">
            {composite
              ? (customTabs.size > 0
                  ? GROUPS.flatMap(g => g.tabs).filter(ct => customTabs.has(ct)).map((ct, i) => (
                      <span key={ct}>
                        {i > 0 && <span className="opacity-40"> · </span>}
                        <span className="font-bold text-amber-500">{t(TAB_I18N[ct])}</span>
                      </span>
                    ))
                  : t("customModeBtn"))
              : INDEX_TABS.has(tab)
                ? <span className="font-bold text-blue-500">{t(TAB_I18N[tab])}</span>
                : GROUPS[tabGroupIdx(tab)].tabs.map((gt, i) => (
                    <span key={gt}>
                      {i > 0 && <span className="opacity-40">/</span>}
                      <span className={gt === tab ? "font-bold text-blue-500" : "opacity-60"}>{t(TAB_I18N[gt])}</span>
                    </span>
                  ))}
            </span>
            <svg className="w-4 h-4 shrink-0 opacity-40 transition-transform" style={{ transform: tabsExpanded ? "rotate(180deg)" : "" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Tab selection dropdown */}
          <div className="order-4 sm:col-span-2 grid transition-[grid-template-rows] duration-300 ease-in-out" style={{ gridTemplateRows: tabsExpanded ? "1fr" : "0fr" }}>
            <div className="overflow-hidden">
              <div className="space-y-1.5 pt-1.5">
              {/* Single/Multi toggle – top right */}
              <div className="flex justify-end gap-0.5 text-xs">
                <button onClick={() => { if (composite) toggleComposite(); }}
                  className={`px-2 py-0.5 rounded-l transition-colors ${
                    !composite
                      ? (darkMode ? "text-blue-400 font-semibold" : "text-blue-600 font-semibold")
                      : (darkMode ? "text-slate-600" : "text-slate-400")
                  }`}>
                  {t("singleSelect")}
                </button>
                <span className={darkMode ? "text-slate-700" : "text-slate-300"}>|</span>
                <button onClick={() => { if (!composite) toggleComposite(); }}
                  className={`px-2 py-0.5 rounded-r transition-colors ${
                    composite
                      ? (darkMode ? "text-amber-400 font-semibold" : "text-amber-600 font-semibold")
                      : (darkMode ? "text-slate-600" : "text-slate-400")
                  }`}>
                  {t("multiSelect")}
                </button>
              </div>
              {/* Tab grids */}
              {[[0, 1], [2, 3]].map((pair, ri) => (
                <div key={ri} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {pair.map(gi => (
                    <div key={GROUPS[gi].labelKey} className="grid grid-cols-3 gap-1">
                      {GROUPS[gi].tabs.map(gTab => {
                        const selected = composite ? customTabs.has(gTab) : tab === gTab;
                        return (
                          <button key={gTab} onClick={() => handleTab(gTab)}
                            className={`py-2 rounded-lg font-medium text-xs transition text-center truncate ${
                              composite
                                ? (selected
                                    ? "bg-amber-500 text-white shadow-sm"
                                    : (darkMode ? "bg-slate-800 text-slate-400 opacity-50" : "bg-slate-100/70 text-slate-500 opacity-50"))
                                : (selected
                                    ? "bg-blue-600 text-white shadow-sm"
                                    : gi === activeGroup
                                      ? (darkMode ? "bg-slate-700 text-slate-200" : "bg-blue-50 text-blue-700")
                                      : (darkMode ? "bg-slate-800 text-slate-400" : "bg-slate-100/70 text-slate-600"))
                            }`}>
                            {t(TAB_I18N[gTab])}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              ))}
              {/* Row 3: Indexes */}
              <div className="grid grid-cols-4 gap-1">
                {GROUPS[4].tabs.map(gTab => {
                  const selected = composite ? customTabs.has(gTab) : tab === gTab;
                  return (
                    <button key={gTab} onClick={() => handleTab(gTab)}
                      className={`py-2 rounded-lg font-medium text-xs transition text-center truncate ${
                        composite
                          ? (selected
                              ? "bg-amber-500 text-white shadow-sm"
                              : (darkMode ? "bg-slate-800 text-slate-400 opacity-50" : "bg-slate-100/70 text-slate-500 opacity-50"))
                          : (selected
                              ? "bg-blue-600 text-white shadow-sm"
                              : activeGroup === 4
                                ? (darkMode ? "bg-slate-700 text-slate-200" : "bg-blue-50 text-blue-700")
                                : (darkMode ? "bg-slate-800 text-slate-400" : "bg-slate-100/70 text-slate-600"))
                      }`}>
                      {t(TAB_I18N[gTab])}
                    </button>
                  );
                })}
              </div>
              </div>
            </div>
          </div>
        </div>



        {/* Table */}
        {deferredComposite && deferredCustomTabs.size === 0 ? (
          <div className={`rounded-xl py-16 text-center ${darkMode ? "bg-slate-800 border border-slate-700 text-slate-400" : "bg-white border border-slate-100 text-slate-400"}`}>
            <p className="text-lg">{t("customModeHint")}</p>
          </div>
        ) : (
        <div className={`rounded-xl shadow-md overflow-hidden ${darkMode ? "bg-slate-800 border border-slate-700" : "bg-white border border-slate-100"}`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={headerBg}>
                  <th className={`${thBase} w-[52px] text-center`}>{t("rankCol_rank")}</th>
                  <th className={`${thBase} min-w-[120px]`}>{t("rankCol_city")}</th>
                  <th className={`${thBase} hidden sm:table-cell min-w-[80px]`}>{t("rankCol_country")}</th>
                  {renderHeaders()}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, idx) => {
                  const slug = CITY_SLUGS[r.city.id];
                  const rank = displayRanks[idx];
                  const isTop3 = rank <= 3;
                  const badge = rank === 1 ? "\ud83e\udd47" : rank === 2 ? "\ud83e\udd48" : rank === 3 ? "\ud83e\udd49" : `${rank}`;
                  return (
                    <tr key={r.city.id}
                      className={`${
                        idx < filtered.length - 1 ? (darkMode ? "border-b border-slate-700/50" : "border-b border-slate-100") : ""
                      } ${isTop3 ? (darkMode ? "bg-blue-900/10" : "bg-blue-50/50") : idx % 2 === 1 ? (darkMode ? "bg-slate-700/20" : "bg-slate-50/60") : ""
                      } hover:${darkMode ? "bg-slate-700/30" : "bg-slate-50"} transition`}>
                      <td className={`${tdBase} font-bold text-center ${darkMode ? "text-slate-300" : "text-slate-600"}`}>{badge}</td>
                      <td className={tdBase}>
                        <span className="mr-1.5">{CITY_FLAG_EMOJIS[r.city.id] || "\ud83c\udfd9\ufe0f"}</span>
                        {slug ? (
                          <Link href={`/${locale}/city/${slug}`} className={`font-semibold hover:underline ${darkMode ? "text-blue-400" : "text-blue-600"}`}>
                            {getCityLabel(r.city)}
                          </Link>
                        ) : (
                          <span className="font-semibold">{getCityLabel(r.city)}</span>
                        )}
                      </td>
                      <td className={`${tdBase} hidden sm:table-cell ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{getCountryLabel(r.city.country)}</td>
                      {renderCells(r)}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        )}

      </div>
      <footer className={`px-4 py-5 text-center text-xs ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
        <div className={`max-w-5xl mx-auto border-t pt-4 ${darkMode ? "border-slate-700" : "border-slate-200"}`}>
        <p>{t("dataSourcesDisclaimer")}</p>
        <p className="mt-1"><a href={`/${locale}/methodology`} className="underline hover:text-blue-500">{t("navMethodology")}</a> · <a href="https://github.com/qing4132/whichcity/issues" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-500">GitHub</a> · <a href="mailto:qing4132@users.noreply.github.com" className="underline hover:text-blue-500">{t("footerFeedback")}</a></p>
        </div>
      </footer>
    </div>
  );
}
