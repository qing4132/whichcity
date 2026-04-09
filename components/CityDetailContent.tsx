"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { City, CostTier, IncomeMode, Locale } from "@/lib/types";
import type { NomadCityData, VisaFreeMatrix } from "@/lib/nomadData";
import { CITY_FLAG_EMOJIS } from "@/lib/constants";
import { CITY_SLUGS } from "@/lib/citySlug";
import { CITY_NAME_TRANSLATIONS, COUNTRY_TRANSLATIONS } from "@/lib/i18n";
import NavBar from "./NavBar";
import { computeLifePressure, getCityEnName, getClimateLabel } from "@/lib/clientUtils";
import { trackEvent } from "@/lib/analytics";
import { CITY_INTROS } from "@/lib/cityIntros";
import { CITY_LANGUAGES, LANGUAGE_NAME_TRANSLATIONS } from "@/lib/cityLanguages";
import { useSettings } from "@/hooks/useSettings";
import { computeNetIncome, computeAllNetIncomes, getExpatSchemeName } from "@/lib/taxUtils";
import ClimateChart from "./ClimateChart";
import { localizeVisaName, localizeTax, localizeNote, getLegalIncome, localizeVpnNote } from "@/lib/nomadI18n";

interface Props {
  city: City;
  slug: string;
  allCities: City[];
  locale: string;
  nomadData?: NomadCityData | null;
  visaMatrix?: VisaFreeMatrix | null;
}

const TIER_KEYS: { key: CostTier; field: "costModerate" | "costBudget"; labelKey: string }[] = [
  { key: "moderate", field: "costModerate", labelKey: "costTierModerate" },
  { key: "budget", field: "costBudget", labelKey: "costTierBudget" },
];

type Tier = "good" | "mid" | "bad";

/** Row 3: Four expandable index cards */
function IndexCardRow({ darkMode, headingCls, subCls, baseCard, cardBorder, cardValCls, t, n, rankHigher, rankLower,
  formatCurrency, city, income, tierCost, savings, yearsVal, hourlyWage,
  lifePressure, lifePressureConfidence, allLifePressure, healthcareIdx, allHealthcare, freedomIdx, allFreedom,
  safetyIndex, allSafety, tierHigh, tierLow, allCities, allIncomes, costTierField,
}: {
  darkMode: boolean; headingCls: string; subCls: string; baseCard: string;
  cardBorder: (t: Tier) => string; cardValCls: (t: Tier) => string;
  t: (k: string) => string; n: number;
  rankHigher: (values: number[], val: number) => number;
  rankLower: (values: number[], val: number) => number;
  formatCurrency: (v: number) => string;
  city: City; income: number; tierCost: number; savings: number; yearsVal: number; hourlyWage: number;
  lifePressure: number; lifePressureConfidence: "high" | "medium" | "low"; allLifePressure: number[];
  healthcareIdx: number; allHealthcare: number[];
  freedomIdx: number; allFreedom: number[];
  safetyIndex: number; allSafety: number[];
  tierHigh: (values: number[], val: number) => Tier;
  tierLow: (values: number[], val: number) => Tier;
  allCities: City[]; allIncomes: number[];
  costTierField: "costModerate" | "costBudget";
}) {
  const savingsRate = income > 0 ? Math.round((savings / income) * 100) : 0;
  const bigMacPower = city.bigMacPrice !== null && city.bigMacPrice > 0 && city.annualWorkHours > 0
    ? ((income / city.annualWorkHours) / city.bigMacPrice).toFixed(1)
    : "—";

  const detailBg = darkMode ? "bg-slate-900/50" : "bg-slate-50";
  const detailBorder = darkMode ? "border-slate-700" : "border-slate-200";

  // Sub-indicator ranking arrays
  const allSavingsRate = allCities.map((c, i) => { const inc = allIncomes[i]; return inc > 0 ? Math.round(((inc - c[costTierField] * 12) / inc) * 100) : 0; });
  const allBigMacPowerArr = allCities.filter(c => c.bigMacPrice !== null && c.bigMacPrice > 0 && c.annualWorkHours > 0).map(c => { const i = allCities.indexOf(c); return (allIncomes[i] / c.annualWorkHours) / (c.bigMacPrice as number); });
  const allWorkHoursArr = allCities.map(c => c.annualWorkHours);
  const allYearsValid = allCities.map((c, i) => { const s = allIncomes[i] - c[costTierField] * 12; return s > 0 ? (c.housePrice * 70) / s : Infinity; }).filter(isFinite);
  const allNumbeoSafety = allCities.map(c => c.numbeoSafetyIndex).filter((v): v is number => v !== null);
  const allHomicideInv = allCities.map(c => c.homicideRateInv).filter((v): v is number => v !== null);
  const allGpiInv = allCities.map(c => c.gpiScoreInv).filter((v): v is number => v !== null);
  const allGallupLO = allCities.map(c => c.gallupLawOrder).filter((v): v is number => v !== null);
  const allDoctorsArr = allCities.map(c => c.doctorsPerThousand);
  const allBedsArr = allCities.map(c => c.hospitalBedsPerThousand);
  const allUhcArr = allCities.map(c => c.uhcCoverageIndex);
  const allLifeExpArr = allCities.map(c => c.lifeExpectancy);
  const allPressArr = allCities.map(c => c.pressFreedomScore);
  const allDemocracyArr = allCities.map(c => c.democracyIndex);
  const allCpiArr = allCities.map(c => c.corruptionPerceptionIndex);
  const nullMark = (v: number | null) => v === null ? " *" : "";
  const bigMacPowerNum = city.bigMacPrice !== null && city.bigMacPrice > 0 && city.annualWorkHours > 0 ? (income / city.annualWorkHours) / city.bigMacPrice : null;

  const indices = [
    {
      key: "lifePressure",
      label: t("lifePressureIndex"),
      value: lifePressure.toFixed(1),
      sub: `#${rankLower(allLifePressure, lifePressure)} / ${n}`,
      tier: tierLow(allLifePressure, lifePressure),
      confidence: lifePressureConfidence,
      details: [
        { label: t("savingsRateLabel"), value: `${savingsRate}%`, weight: "30%", tier: tierHigh(allSavingsRate, savingsRate) },
        { label: t("bigMacPower"), value: bigMacPower, weight: "25%", tier: bigMacPowerNum !== null ? tierHigh(allBigMacPowerArr, bigMacPowerNum) : "mid" as Tier, missing: bigMacPowerNum === null },
        { label: t("annualWorkHours"), value: city.annualWorkHours !== null ? `${city.annualWorkHours} ${t("unitH")}` : "—", weight: "25%", tier: city.annualWorkHours !== null ? tierLow(allWorkHoursArr, city.annualWorkHours) : "mid" as Tier, missing: city.annualWorkHours === null },
        { label: t("homePurchaseYears"), value: isFinite(yearsVal) ? `${yearsVal.toFixed(1)} ${t("insightYears")}` : "N/A", weight: "20%", tier: isFinite(yearsVal) ? tierLow(allYearsValid, yearsVal) : "bad" as Tier },
      ],
    },
    {
      key: "safety",
      label: t("safetyIndex"),
      value: safetyIndex.toFixed(1),
      sub: `#${rankHigher(allSafety, safetyIndex)} / ${n}`,
      tier: tierHigh(allSafety, safetyIndex),
      confidence: city.safetyConfidence,
      details: [
        { label: t("safetyNumbeo"), value: city.numbeoSafetyIndex !== null ? `${city.numbeoSafetyIndex}` : "—", weight: "35%", tier: city.numbeoSafetyIndex !== null ? tierHigh(allNumbeoSafety, city.numbeoSafetyIndex) : "mid" as Tier, missing: city.numbeoSafetyIndex === null },
        { label: t("safetyHomicide"), value: city.homicideRateInv !== null ? `${city.homicideRateInv}` : "—", weight: "30%", tier: city.homicideRateInv !== null ? tierHigh(allHomicideInv, city.homicideRateInv) : "mid" as Tier, missing: city.homicideRateInv === null },
        { label: t("safetyGpi"), value: city.gpiScoreInv !== null ? `${city.gpiScoreInv}` : "—", weight: "20%", tier: city.gpiScoreInv !== null ? tierHigh(allGpiInv, city.gpiScoreInv) : "mid" as Tier, missing: city.gpiScoreInv === null },
        { label: t("safetyGallup"), value: city.gallupLawOrder !== null ? `${city.gallupLawOrder}` : "—", weight: "15%", tier: city.gallupLawOrder !== null ? tierHigh(allGallupLO, city.gallupLawOrder) : "mid" as Tier, missing: city.gallupLawOrder === null },
      ],
    },
    {
      key: "healthcare",
      label: t("healthcareIndex"),
      value: healthcareIdx.toFixed(1),
      sub: `#${rankHigher(allHealthcare, healthcareIdx)} / ${n}`,
      tier: tierHigh(allHealthcare, healthcareIdx),
      confidence: city.healthcareConfidence,
      details: [
        { label: t("doctorsPerThousand"), value: city.doctorsPerThousand !== null ? `${city.doctorsPerThousand}` : "—", weight: "35%", tier: city.doctorsPerThousand !== null ? tierHigh(allDoctorsArr, city.doctorsPerThousand) : "mid" as Tier, missing: city.doctorsPerThousand === null },
        { label: t("hospitalBeds"), value: city.hospitalBedsPerThousand !== null ? `${city.hospitalBedsPerThousand}` : "—", weight: "25%", tier: city.hospitalBedsPerThousand !== null ? tierHigh(allBedsArr, city.hospitalBedsPerThousand) : "mid" as Tier, missing: city.hospitalBedsPerThousand === null },
        { label: t("uhcCoverage"), value: city.uhcCoverageIndex !== null ? `${city.uhcCoverageIndex}` : "—", weight: "25%", tier: city.uhcCoverageIndex !== null ? tierHigh(allUhcArr, city.uhcCoverageIndex) : "mid" as Tier, missing: city.uhcCoverageIndex === null },
        { label: t("lifeExpectancy"), value: city.lifeExpectancy !== null ? `${city.lifeExpectancy} ${t("lifeExpectancyUnit")}` : "—", weight: "15%", tier: city.lifeExpectancy !== null ? tierHigh(allLifeExpArr, city.lifeExpectancy) : "mid" as Tier, missing: city.lifeExpectancy === null },
      ],
    },
    {
      key: "freedom",
      label: t("institutionalFreedom"),
      value: freedomIdx.toFixed(1),
      sub: `#${rankHigher(allFreedom, freedomIdx)} / ${n}`,
      tier: tierHigh(allFreedom, freedomIdx),
      confidence: city.freedomConfidence,
      details: [
        { label: t("pressFreedom"), value: city.pressFreedomScore !== null ? `${city.pressFreedomScore}` : "—", weight: "35%", tier: city.pressFreedomScore !== null ? tierHigh(allPressArr, city.pressFreedomScore) : "mid" as Tier, missing: city.pressFreedomScore === null },
        { label: t("democracyIdx"), value: city.democracyIndex !== null ? `${city.democracyIndex}` : "—", weight: "35%", tier: city.democracyIndex !== null ? tierHigh(allDemocracyArr, city.democracyIndex) : "mid" as Tier, missing: city.democracyIndex === null },
        { label: t("corruptionIdx"), value: city.corruptionPerceptionIndex !== null ? `${city.corruptionPerceptionIndex}` : "—", weight: "30%", tier: city.corruptionPerceptionIndex !== null ? tierHigh(allCpiArr, city.corruptionPerceptionIndex) : "mid" as Tier, missing: city.corruptionPerceptionIndex === null },
      ],
    },
  ];

  return (
    <section className="mb-10">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {indices.map((idx) => (
          <div key={idx.key}>
            <div className={`${baseCard} ${cardBorder(idx.tier)} flex flex-col items-center justify-between rounded-b-none`}>
              <p className={`text-xs font-semibold tracking-wide h-8 flex items-center justify-center text-center leading-tight ${subCls}`}>
                {idx.label}
              </p>
              <p className={`text-xl font-extrabold my-1 ${cardValCls(idx.tier)}`}>
                {idx.value}
                {idx.confidence === "low" && <span className={`ml-1 text-xs font-normal ${darkMode ? "text-amber-400" : "text-amber-600"}`}>{t("confidenceLow")}</span>}
              </p>
              <p className={`text-xs h-8 flex items-center justify-center text-center ${subCls}`}>{idx.sub}</p>
            </div>
            <div className={`rounded-b-xl border border-t-0 p-3 text-xs ${detailBg} ${detailBorder}`}>
              <div className="space-y-1.5">
                {idx.details.map((d: any) => (
                  <div key={d.label} className="flex justify-between">
                    <span className={subCls}>{d.label} <span className="opacity-60">({d.weight})</span></span>
                    <span className={`font-semibold ${d.missing ? subCls : cardValCls(d.tier)}`}>{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function CityDetailContent({ city, slug, allCities, locale: urlLocale, nomadData, visaMatrix }: Props) {
  const s = useSettings(urlLocale);
  const router = useRouter();
  const { locale, darkMode, t, formatCurrency, costTier, profession, incomeMode, salaryMultiplier } = s;

  const cityName = CITY_NAME_TRANSLATIONS[city.id]?.[locale] || city.name;
  useEffect(() => { document.title = `${cityName} | WhichCity`; }, [locale, cityName]);
  useEffect(() => { trackEvent("city_view", { city_slug: slug }); }, [slug]);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = () => setNow(new Date());
    const msToNextMin = (60 - new Date().getSeconds()) * 1000;
    const timeout = setTimeout(() => { tick(); const id = setInterval(tick, 60_000); cleanup = () => clearInterval(id); }, msToNextMin);
    let cleanup = () => clearTimeout(timeout);
    return () => cleanup();
  }, []);

  if (!s.ready) return (
    <div className={`min-h-screen transition-colors ${darkMode ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"}`}>
      <NavBar s={s} compareHref={`/${locale}/compare/${slug}`} excludeSlug={slug} showShare />
    </div>
  );

  const id = city.id;
  const flag = CITY_FLAG_EMOJIS[id] || "🏤️";
  const countryName = COUNTRY_TRANSLATIONS[city.country]?.[locale] || city.country;
  const climate = city.climate ?? null;

  const professions = city.professions ? Object.keys(city.professions) : [];
  const activeProfession = profession && professions.includes(profession) ? profession : professions[0] || "";
  const grossIncome = activeProfession && city.professions[activeProfession] != null ? city.professions[activeProfession] * salaryMultiplier : null;
  const taxResult = grossIncome !== null ? computeNetIncome(grossIncome, city.country, city.id, incomeMode, s.rates?.rates) : null;
  const income = taxResult?.netUSD ?? null;

  const tierCost = city[TIER_KEYS.find((tk) => tk.key === costTier)!.field];
  const annualExpense = tierCost * 12;
  const savings = income !== null ? income - annualExpense : null;

  const headingCls = darkMode ? "text-slate-100" : "text-slate-800";
  const subCls = darkMode ? "text-slate-400" : "text-slate-500";
  const sectionBg = darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200";
  const borderRow = darkMode ? "border-slate-700" : "border-slate-100";


  // Percentile ranking: compute where this city stands for each metric
  const pct = (values: number[], val: number) => {
    const sorted = [...values].sort((a, b) => a - b);
    const idx = sorted.findIndex((v) => v >= val);
    return idx === -1 ? 1 : idx / sorted.length;
  };
  const allGrossIncomes = allCities.map((c) => activeProfession && c.professions[activeProfession] != null ? c.professions[activeProfession] * salaryMultiplier : 0);
  const allIncomes = computeAllNetIncomes(allCities, allGrossIncomes, incomeMode, s.rates?.rates);
  const allCosts = allCities.map((c) => c[TIER_KEYS.find((tk) => tk.key === costTier)!.field]);
  const allSavings = allCities.map((c, i) => allIncomes[i] - allCosts[i] * 12);
  const nn = (arr: (number | null)[]): number[] => arr.filter((v): v is number => v !== null);
  const allHouse = nn(allCities.map((c) => c.housePrice));
  const allAqi = nn(allCities.map((c) => c.airQuality));
  const allDoctors = nn(allCities.map((c) => c.doctorsPerThousand));
  const allFlights = nn(allCities.map((c) => c.directFlightCities));
  const allSafety = allCities.map((c) => c.safetyIndex);
  const allWorkHours = nn(allCities.map((c) => c.annualWorkHours));
  const hourlyWage = city.annualWorkHours !== null && city.annualWorkHours > 0 && income !== null ? income / city.annualWorkHours : 0;
  const allHourly = allCities.map((c, i) => c.annualWorkHours !== null && c.annualWorkHours > 0 ? allIncomes[i] / c.annualWorkHours : 0);
  const bigMacPrices = allCities.filter((c) => c.bigMacPrice !== null).map((c) => c.bigMacPrice as number);
  const bigMacMedian = [...bigMacPrices].sort((a, b) => a - b)[Math.floor(bigMacPrices.length / 2)];
  const bigMacRatio = city.bigMacPrice !== null && bigMacMedian > 0 ? city.bigMacPrice / bigMacMedian : null;
  const allBigMacRatio = allCities.filter((c) => c.bigMacPrice !== null).map((c) => (c.bigMacPrice as number) / bigMacMedian);
  const allYearsToHome = allCities.map((c, i) => { const sav = allIncomes[i] - allCosts[i] * 12; return c.housePrice !== null && sav > 0 ? (c.housePrice * 70) / sav : Infinity; });
  const yearsVal = city.housePrice !== null && savings !== null && savings > 0 ? (city.housePrice * 70) / savings : Infinity;
  // For ranking with ties: Infinity values get the worst rank
  const rankYearsToHome = (val: number) => {
    if (!isFinite(val)) return n;  // worst rank
    const allFinite = allYearsToHome.filter(isFinite);
    const rank = rankLower(allFinite, val);
    return rank;
  };

  // New field rankings
  const allRent = nn(allCities.map(c => c.monthlyRent));
  const allLeave = nn(allCities.map(c => c.paidLeaveDays));
  const allSpeed = nn(allCities.map(c => c.internetSpeedMbps));
  const costTierField = TIER_KEYS.find(tk => tk.key === costTier)!.field;

  // Composite indices
  const lifePressureResult = computeLifePressure(city, allCities, income, allIncomes, costTierField);
  const lifePressure = lifePressureResult.value;
  const allLifePressure = allCities.map((c, i) => computeLifePressure(c, allCities, allIncomes[i], allIncomes, costTierField).value);
  const healthcareIdx = city.healthcareIndex;
  const allHealthcare = allCities.map(c => c.healthcareIndex);
  const freedomIdx = city.freedomIndex;
  const allFreedom = allCities.map(c => c.freedomIndex);

  // Real-time similar cities: 21-dim normalised Euclidean distance
  const similarIds = (() => {
    const cityIdx = allCities.findIndex(c => c.id === city.id);
    // Compute medians for nullable fields (use as fallback instead of 0)
    const median = (vals: (number | null)[]) => {
      const nums = vals.filter((v): v is number => v !== null).sort((a, b) => a - b);
      if (nums.length === 0) return 0;
      const mid = Math.floor(nums.length / 2);
      return nums.length % 2 === 0 ? (nums[mid - 1] + nums[mid]) / 2 : nums[mid];
    };
    const medHP = median(allCities.map(c => c.housePrice));
    const medRent = median(allCities.map(c => c.monthlyRent));
    const medWH = median(allCities.map(c => c.annualWorkHours));
    const medPL = median(allCities.map(c => c.paidLeaveDays));
    const medAQI = median(allCities.map(c => c.airQuality));
    const medNet = median(allCities.map(c => c.internetSpeedMbps));
    const medFlights = median(allCities.map(c => c.directFlightCities));
    const vec = (i: number): number[] => {
      const c = allCities[i];
      const ytb = allYearsToHome[i];
      const cl = c.climate ?? null;
      return [
        allIncomes[i], allCosts[i], allSavings[i],
        c.housePrice ?? medHP, isFinite(ytb) ? ytb : 999, c.monthlyRent ?? medRent,
        c.annualWorkHours ?? medWH, allHourly[i], c.paidLeaveDays ?? medPL,
        c.airQuality ?? medAQI, c.internetSpeedMbps ?? medNet, c.directFlightCities ?? medFlights,
        allLifePressure[i], c.healthcareIndex, c.freedomIndex, c.safetyIndex,
        cl?.avgTempC ?? 15,
        cl ? cl.summerAvgC - cl.winterAvgC : 15,
        cl?.annualRainMm ?? 800,
        cl?.humidityPct ?? 60,
        cl?.sunshineHours ?? 2000,
      ];
    };
    const all = allCities.map((_, i) => vec(i));
    const dims = all[0].length;
    const mins = Array(dims).fill(Infinity);
    const maxs = Array(dims).fill(-Infinity);
    for (const m of all) {
      for (let d = 0; d < dims; d++) {
        if (m[d] < mins[d]) mins[d] = m[d];
        if (m[d] > maxs[d]) maxs[d] = m[d];
      }
    }
    const norm = (v: number[]) => v.map((val, d) => {
      const r = maxs[d] - mins[d];
      return r > 0 ? (val - mins[d]) / r : 0.5;
    });
    const cur = norm(all[cityIdx]);
    return allCities
      .map((c, i) => ({ id: c.id, dist: i === cityIdx ? Infinity : Math.sqrt(norm(all[i]).reduce((s, v, d) => s + (v - cur[d]) ** 2, 0)) }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 6)
      .map(d => d.id);
  })();

  // Ranking helper: 1-based rank with ties (lower rank number = better)
  // Tied values get the same rank; the next rank skips accordingly (e.g. 1,1,3)
  const rankHigher = (values: number[], val: number) => {
    const unique = [...new Set(values)].sort((a, b) => b - a);
    let rank = 1;
    for (const v of unique) {
      if (val >= v) return rank;
      rank += values.filter(x => x === v).length;
    }
    return values.length;
  };
  const rankLower = (values: number[], val: number) => {
    const unique = [...new Set(values)].sort((a, b) => a - b);
    let rank = 1;
    for (const v of unique) {
      if (val <= v) return rank;
      rank += values.filter(x => x === v).length;
    }
    return values.length;
  };
  const n = allCities.length;

  // Coloring: top 20% → green, bottom 20% → red (based on rank/total)
  type Tier = "good" | "mid" | "bad";
  const tierHigh = (values: number[], val: number): Tier => {
    const rank = rankHigher(values, val);
    const total = values.length;
    if (rank <= total * 0.2) return "good";
    if (rank > total * 0.8) return "bad";
    return "mid";
  };
  const tierLow = (values: number[], val: number): Tier => {
    const rank = rankLower(values, val);
    const total = values.length;
    if (rank <= total * 0.2) return "good";
    if (rank > total * 0.8) return "bad";
    return "mid";
  };

  const cardBorder = (tier: Tier) => {
    if (tier === "good") return darkMode ? "border-emerald-500/60" : "border-emerald-400";
    if (tier === "bad") return darkMode ? "border-rose-500/60" : "border-rose-400";
    return darkMode ? "border-slate-600" : "border-slate-200";
  };
  const cardValCls = (tier: Tier) => {
    if (tier === "good") return darkMode ? "text-emerald-400" : "text-emerald-600";
    if (tier === "bad") return darkMode ? "text-rose-400" : "text-rose-500";
    return headingCls;
  };
  const baseCard = "rounded-xl border shadow-sm p-4 text-center " + (darkMode ? "bg-slate-800" : "bg-white");

  return (
    <div className={`min-h-screen transition-colors ${darkMode ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"}`}>
      <NavBar s={s} professionValue={activeProfession} professions={professions} compareHref={`/${locale}/compare/${slug}`} excludeSlug={slug} showShare />

      <div className="max-w-6xl mx-auto px-4 pt-8">

        {/* Safety warning banner (full-width, above hero) */}
        {city.safetyWarning && (
          <div className={`rounded-lg px-4 py-2.5 mb-6 text-sm flex items-start gap-2 ${city.safetyWarning === "active_conflict"
            ? (darkMode ? "bg-red-900/40 text-red-300 border border-red-500/50" : "bg-red-50 text-red-700 border border-red-300")
            : city.safetyWarning === "extreme_instability"
              ? (darkMode ? "bg-orange-900/40 text-orange-300 border border-orange-500/50" : "bg-orange-50 text-orange-700 border border-orange-300")
              : (darkMode ? "bg-amber-900/40 text-amber-300 border border-amber-500/50" : "bg-amber-50 text-amber-700 border border-amber-300")
            }`}>
            <span className="font-bold shrink-0">{t("safetyWarningTitle")}</span>
            <span>{
              city.safetyWarning === "active_conflict" ? t("safetyWarningConflict")
                : city.safetyWarning === "extreme_instability" ? t("safetyWarningInstability")
                  : t("safetyWarningBlocked")
            }</span>
          </div>
        )}

        {/* Hero */}
        <header className="mb-10">
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <span className="text-4xl shrink-0">{flag}</span>
              <div className="min-w-0">
                <h1 className={`text-3xl sm:text-4xl font-extrabold ${headingCls}`}>{cityName}</h1>
                <p className={`text-lg ${subCls}`}>{countryName}</p>
              </div>
            </div>
            {incomeMode !== "gross" && taxResult !== null && (
              <div className={`rounded-xl border px-4 py-3 text-sm w-full sm:w-auto sm:max-w-xs ${darkMode ? "border-slate-600 bg-slate-800/80" : "border-slate-200 bg-slate-50"}`}>
                <p className={`font-bold text-xs mb-1 ${subCls}`}>{t("effectiveTaxRate")}</p>
                <p className={`leading-snug font-medium ${headingCls}`}>
                  {taxResult.dataIsLikelyNet
                    ? <span className={`text-xs ${darkMode ? "text-amber-400" : "text-amber-600"}`}>{t("dataLikelyNet")}</span>
                    : <>~{(taxResult.effectiveRate * 100).toFixed(1)}%{taxResult.hasExpatScheme && ` · ${t("expatSchemeNote", { scheme: t(getExpatSchemeName(city.country)) })}`}</>
                  }
                </p>
              </div>
            )}
            {city.timezone && (() => {
              const fmt = new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : locale === "ja" ? "ja-JP" : locale === "es" ? "es-ES" : "en-US", { timeZone: city.timezone, hour: "2-digit", minute: "2-digit", hour12: false });
              const offsetMin = (() => { const parts = new Intl.DateTimeFormat("en-US", { timeZone: city.timezone, timeZoneName: "shortOffset" }).formatToParts(now); const o = parts.find(p => p.type === "timeZoneName")?.value || ""; const m = o.match(/GMT([+-]?)(\d{1,2})(?::(\d{2}))?/); if (!m) return 0; const sign = m[1] === "-" ? -1 : 1; return sign * (parseInt(m[2]) * 60 + parseInt(m[3] || "0")); })();
              const h = Math.floor(Math.abs(offsetMin) / 60);
              const m = Math.abs(offsetMin) % 60;
              const utcLabel = `UTC${offsetMin >= 0 ? "+" : "-"}${h}${m ? ":" + String(m).padStart(2, "0") : ""}`;
              return (
                <div className={`rounded-xl border px-4 py-3 text-sm w-full sm:w-auto sm:max-w-xs ${darkMode ? "border-slate-600 bg-slate-800/80" : "border-slate-200 bg-slate-50"}`}>
                  <p className={`font-bold text-xs mb-1 ${subCls}`}>{t("timezone")}</p>
                  <p className={`leading-snug font-medium ${headingCls}`}>{utcLabel} · {fmt.format(now)}</p>
                </div>
              );
            })()}
            {(() => {
              const langs = CITY_LANGUAGES[id] || [];
              const localized = langs.map(l => LANGUAGE_NAME_TRANSLATIONS[l]?.[locale] || l);
              const show = localized.slice(0, 3);
              const more = localized.length - show.length;
              return langs.length > 0 ? (
                <div className={`rounded-xl border px-4 py-3 text-sm w-full sm:w-auto sm:max-w-xs ${darkMode ? "border-slate-600 bg-slate-800/80" : "border-slate-200 bg-slate-50"}`}>
                  <p className={`font-bold text-xs mb-1 ${subCls}`}>{t("officialLanguages")}</p>
                  <p className={`leading-snug font-medium ${headingCls}`}>
                    {show.join(" · ")}{more > 0 && <span className={`ml-1 ${subCls}`}>+{more}</span>}
                  </p>
                </div>
              ) : null;
            })()}
          </div>
          {CITY_INTROS[id] && (
            <p className={`mt-4 leading-relaxed text-sm sm:text-base ${subCls}`}>{CITY_INTROS[id][locale] || CITY_INTROS[id].zh}</p>
          )}
        </header>

        {/* Row 1: 收支 + 住房 (2 grouped cards, 3 data each) */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3">
          <div className={`rounded-xl border shadow-sm p-2 ${darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: `${t("avgIncome")} (${s.getProfessionLabel(activeProfession)})`, value: income !== null ? formatCurrency(income) : "—", sub: income !== null ? `#${rankHigher(allIncomes, income)} / ${n}` : `#${n} / ${n}`, tier: income !== null ? tierHigh(allIncomes, income) : "mid" as Tier },
                { label: `${t("monthlyCost")} (${t(`costTier${costTier.charAt(0).toUpperCase()}${costTier.slice(1)}`)})`, value: formatCurrency(tierCost), sub: `#${rankLower(allCosts, tierCost)} / ${n}`, tier: tierLow(allCosts, tierCost) },
                { label: t("yearlySavings"), value: savings !== null ? formatCurrency(savings) : "—", sub: savings !== null ? `#${rankHigher(allSavings, savings)} / ${n}` : `#${n} / ${n}`, tier: savings !== null ? tierHigh(allSavings, savings) : "mid" as Tier },
              ].map((stat) => (
                <div key={stat.label} className="flex flex-col items-center justify-between text-center p-3">
                  <p className={`text-xs font-semibold tracking-wide h-8 flex items-center justify-center text-center leading-tight ${subCls}`}>{stat.label}</p>
                  <p className={`text-xl font-extrabold my-1 ${cardValCls(stat.tier)}`}>{stat.value}</p>
                  <p className={`text-xs h-8 flex items-center justify-center text-center ${subCls}`}>{stat.sub}</p>
                </div>
              ))}
            </div>
          </div>
          <div className={`rounded-xl border shadow-sm p-2 ${darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: t("housePrice"), value: city.housePrice !== null ? `${formatCurrency(city.housePrice)}/m\u00b2` : "\u2014", sub: city.housePrice !== null ? `#${rankLower(allHouse, city.housePrice)} / ${n}` : `#${n} / ${n}`, tier: city.housePrice !== null ? tierLow(allHouse, city.housePrice) : "mid" as Tier },
                { label: t("yearsToBuy"), value: isFinite(yearsVal) ? `${yearsVal.toFixed(1)} ${t("insightYears")}` : "N/A", sub: `#${rankYearsToHome(yearsVal)} / ${n}`, tier: isFinite(yearsVal) ? tierLow(allYearsToHome.filter(isFinite), yearsVal) : "bad" as Tier },
                { label: t("monthlyRent"), value: city.monthlyRent !== null ? formatCurrency(city.monthlyRent) : "\u2014", sub: city.monthlyRent !== null ? `#${rankLower(allRent, city.monthlyRent)} / ${n}` : `#${n} / ${n}`, tier: city.monthlyRent !== null ? tierLow(allRent, city.monthlyRent) : "mid" as Tier },
              ].map((stat) => (
                <div key={stat.label} className="flex flex-col items-center justify-between text-center p-3">
                  <p className={`text-xs font-semibold tracking-wide h-8 flex items-center justify-center text-center leading-tight ${subCls}`}>{stat.label}</p>
                  <p className={`text-xl font-extrabold my-1 ${cardValCls(stat.tier)}`}>{stat.value}</p>
                  <p className={`text-xs h-8 flex items-center justify-center text-center ${subCls}`}>{stat.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Row 2: 工作 + 环境与连接 (2 grouped cards, 3 data each) */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3">
          <div className={`rounded-xl border shadow-sm p-2 ${darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: t("annualWorkHours"), value: city.annualWorkHours !== null ? `${city.annualWorkHours} ${t("unitH")}` : "—", sub: city.annualWorkHours !== null ? `#${rankLower(allWorkHours, city.annualWorkHours)} / ${n}` : `#${n} / ${n}`, tier: city.annualWorkHours !== null ? tierLow(allWorkHours, city.annualWorkHours) : "mid" as Tier },
                { label: t("hourlyWage"), value: hourlyWage > 0 ? formatCurrency(Math.round(hourlyWage * 100) / 100) : "—", sub: hourlyWage > 0 ? `#${rankHigher(allHourly.filter(v => v > 0), hourlyWage)} / ${n}` : `#${n} / ${n}`, tier: hourlyWage > 0 ? tierHigh(allHourly.filter(v => v > 0), hourlyWage) : "mid" as Tier },
                { label: t("paidLeaveDays"), value: city.paidLeaveDays !== null ? `${city.paidLeaveDays} ${t("paidLeaveDaysUnit")}` : "—", sub: city.paidLeaveDays !== null ? `#${rankHigher(allLeave, city.paidLeaveDays)} / ${n}` : `#${n} / ${n}`, tier: city.paidLeaveDays !== null ? tierHigh(allLeave, city.paidLeaveDays) : "mid" as Tier },
              ].map((stat) => (
                <div key={stat.label} className="flex flex-col items-center justify-between text-center p-3">
                  <p className={`text-xs font-semibold tracking-wide h-8 flex items-center justify-center text-center leading-tight ${subCls}`}>{stat.label}</p>
                  <p className={`text-xl font-extrabold my-1 ${cardValCls(stat.tier)}`}>{stat.value}</p>
                  <p className={`text-xs h-8 flex items-center justify-center text-center ${subCls}`}>{stat.sub}</p>
                </div>
              ))}
            </div>
          </div>
          <div className={`rounded-xl border shadow-sm p-2 ${darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: t("airQuality"), value: city.airQuality !== null ? `${city.country === "中国" ? "AQI (CN)" : "AQI"} ${city.airQuality}` : "—", sub: city.airQuality !== null ? `#${rankLower(allAqi, city.airQuality)} / ${n}` : `#${n} / ${n}`, tier: city.airQuality !== null ? tierLow(allAqi, city.airQuality) : "mid" as Tier },
                { label: t("internetSpeed"), value: city.internetSpeedMbps !== null ? `${city.internetSpeedMbps} ${t("internetSpeedUnit")}` : "—", sub: city.internetSpeedMbps !== null ? `#${rankHigher(allSpeed, city.internetSpeedMbps)} / ${n}` : `#${n} / ${n}`, tier: city.internetSpeedMbps !== null ? tierHigh(allSpeed, city.internetSpeedMbps) : "mid" as Tier },
                { label: t("directFlights"), value: city.directFlightCities !== null ? String(city.directFlightCities) : "—", sub: city.directFlightCities !== null ? `#${rankHigher(allFlights, city.directFlightCities)} / ${n}` : `#${n} / ${n}`, tier: city.directFlightCities !== null ? tierHigh(allFlights, city.directFlightCities) : "mid" as Tier },
              ].map((stat) => (
                <div key={stat.label} className="flex flex-col items-center justify-between text-center p-3">
                  <p className={`text-xs font-semibold tracking-wide h-8 flex items-center justify-center text-center leading-tight ${subCls}`}>{stat.label}</p>
                  <p className={`text-xl font-extrabold my-1 ${cardValCls(stat.tier)}`}>{stat.value}</p>
                  <p className={`text-xs h-8 flex items-center justify-center text-center ${subCls}`}>{stat.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Row 3: 4 index cards (expandable) */}
        <IndexCardRow
          darkMode={darkMode}
          headingCls={headingCls}
          subCls={subCls}
          baseCard={baseCard}
          cardBorder={cardBorder}
          cardValCls={cardValCls}
          t={t}
          n={n}
          rankHigher={rankHigher}
          rankLower={rankLower}
          formatCurrency={formatCurrency}
          city={city}
          income={income}
          tierCost={tierCost}
          savings={savings}
          yearsVal={yearsVal}
          hourlyWage={hourlyWage}
          lifePressure={lifePressure}
          lifePressureConfidence={lifePressureResult.confidence}
          allLifePressure={allLifePressure}
          healthcareIdx={healthcareIdx}
          allHealthcare={allHealthcare}
          freedomIdx={freedomIdx}
          allFreedom={allFreedom}
          safetyIndex={city.safetyIndex}
          allSafety={allSafety}
          tierHigh={tierHigh}
          tierLow={tierLow}
          allCities={allCities}
          allIncomes={allIncomes}
          costTierField={costTierField}
        />


        {/* Climate */}
        {climate && (
          <section className="mb-10">
            <div className={`rounded-xl border shadow-sm p-6 ${sectionBg}`}>
              <h2 className={`text-xl font-bold mb-4 ${headingCls}`}>{t("climateEnv")}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {[
                  [t("climateType"), getClimateLabel(climate.type, locale)],
                  [t("avgTemp"), `${climate.avgTempC.toFixed(1)}°C`],
                  [t("tempRange"), `${(climate.summerAvgC - climate.winterAvgC).toFixed(1)}°C`],
                  [t("annualRain"), `${Math.round(climate.annualRainMm)} mm`],
                  [t("humidity"), `${climate.humidityPct}%`],
                  [t("sunshine"), `${Math.round(climate.sunshineHours)} ${t("unitH")}`],
                ].map(([label, val]) => (
                  <div key={label} className="flex flex-col items-center text-center p-3 h-24">
                    <p className={`text-xs font-semibold tracking-wide h-8 flex items-center justify-center text-center leading-tight shrink-0 ${subCls}`}>{label}</p>
                    <div className="flex-1 flex items-center justify-center">
                      <p className={`text-xl font-extrabold ${headingCls}`}>{val}</p>
                    </div>
                  </div>
                ))}
              </div>
              <ClimateChart climate={climate} locale={locale} darkMode={darkMode} t={t} />
            </div>
          </section>
        )}

        {/* Digital Nomad Section */}
        {nomadData && (() => {
          const visa = nomadData.visa;
          const tz = nomadData.timezoneOverlap;
          const eng = nomadData.english;
          const inet = nomadData.internet;
          // Get visa-free days for 4 passports
          const countryEnName = COUNTRY_TRANSLATIONS[city.country]?.en || city.country;
          const vfm = visaMatrix?.[countryEnName] || visaMatrix?.[countryEnName.replace(/ /g, "")] || null;
          const vfmResolved = vfm || (() => {
            const aliases: Record<string, string> = { "中国香港": "Hong Kong", "阿联酋": "UAE", "波多黎各": "Puerto Rico" };
            const alias = aliases[city.country];
            return alias ? visaMatrix?.[alias] || null : null;
          })();

          const passportLabels = { US: t("nomadPassportUS"), EU: t("nomadPassportEU"), CN: t("nomadPassportCN"), JP: t("nomadPassportJP") };

          // Strip source references from visa notes for display
          const cleanNote = (note: string | null) => {
            if (!note) return null;
            return note
              .replace(/\s*Source:.*$/i, "")
              .replace(/\s*\(ranked #\d+.*\)$/i, "")
              .replace(/\s*Listed on VisaGuide\.?/gi, "")
              .replace(/\s*#\d+ on VisaGuide[^.]*\.?/gi, "")
              .replace(/\s*\d[\d,]+ permits granted[^.]*\.?/gi, "")
              .replace(/\s*per VisaGuide[^.]*\.?/gi, "")
              .replace(/\s*on VisaGuide[^.]*\.?/gi, "")
              .replace(/\s*per visaguide[^.]*\.?/gi, "")
              .replace(/\s*found in sources\.?/gi, "")
              .replace(/\s*per \d{4} survey[^.)]*\.?/gi, "")
              .replace(/\s*Most popular country for nomads[^.]*\.?/gi, "")
              .replace(/\s+/g, " ")
              .trim() || null;
          };

          const visaNote = localizeNote(city.id, cleanNote(visa?.note ?? null), locale as Locale);
          const dataCellCls = "flex flex-col items-center text-center p-3 h-24";
          const dataLabelCls = `text-xs font-semibold tracking-wide h-8 flex items-center justify-center text-center leading-tight shrink-0 ${subCls}`;
          const dataValCls = `text-xl font-extrabold ${headingCls}`;
          const nomadValCls = (v: string, color?: string) => {
            const len = v.length;
            const size = len <= 4 ? "text-xl" : len <= 8 ? "text-base" : len <= 14 ? "text-sm" : "text-xs";
            return `${size} font-extrabold leading-snug ${color ?? headingCls}`;
          };
          const nomadValWrapCls = "flex-1 flex items-center justify-center";

          const isOwnCountry = (code: string): boolean => {
            const c = city.country;
            if (code === "CN") return c === "中国";
            if (code === "US") return c === "美国" || c === "波多黎各";
            if (code === "JP") return c === "日本";
            if (code === "EU") return ["法国", "德国", "荷兰", "瑞士", "比利时", "奥地利", "捷克", "波兰", "葡萄牙", "希腊", "西班牙", "意大利", "瑞典", "丹麦", "芬兰", "挪威", "爱沙尼亚", "卢森堡", "斯洛伐克", "斯洛文尼亚", "匈牙利", "罗马尼亚", "保加利亚", "克罗地亚", "爱尔兰"].includes(c);
            return false;
          };

          return (
            <section className="mb-10">
              <div className={`rounded-xl border shadow-sm p-6 ${sectionBg}`}>
                <h2 className={`text-xl font-bold mb-4 ${headingCls}`}>{t("nomadSection")}</h2>

                {/* Row 1: 6 data cells */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                  {(() => {
                    const visaVal = visa?.hasNomadVisa ? (localizeVisaName(visa.visaName, locale as Locale) ?? "—") : t("nomadNoVisa");
                    const durVal = visa?.durationMonths != null ? (visa.durationMonths >= 12 ? `${Math.round(visa.durationMonths / 12)} ${t("nomadYears")}` : `${visa.durationMonths} ${t("nomadMonths")}`) : "—";
                    const incVal = getLegalIncome(city.id, locale as Locale) ?? "—";
                    const taxVal = visa?.taxOnForeignIncome ? (localizeTax(visa.taxOnForeignIncome, locale as Locale) ?? "—") : "—";
                    const vpnVal = inet?.vpnRestricted === true ? t("nomadVPN") : inet?.vpnRestricted === "partial" ? t("nomadVPNPartial") : t("nomadVPNFree");
                    const vpnColor = inet?.vpnRestricted === true || inet?.vpnRestricted === "partial" ? (darkMode ? "text-rose-400" : "text-rose-500") : undefined;
                    const engVal = eng?.cityRating ? t(`nomadEnglish${eng.cityRating}`) : "—";
                    const engColor = eng?.cityRating === "Great" || eng?.cityRating === "Good"
                      ? (darkMode ? "text-emerald-400" : "text-emerald-600")
                      : eng?.cityRating === "Bad" ? (darkMode ? "text-rose-400" : "text-rose-500") : undefined;
                    const cells: { label: string; val: string; color?: string }[] = [
                      { label: t("nomadVisa"), val: visaVal },
                      { label: t("nomadDuration"), val: durVal },
                      { label: t("nomadMinIncome"), val: incVal },
                      { label: t("nomadTax"), val: taxVal },
                      { label: t("nomadVPNLabel"), val: vpnVal, color: vpnColor },
                      { label: t("nomadEnglish"), val: engVal, color: engColor },
                    ];
                    return cells.map((c) => (
                      <div key={c.label} className={dataCellCls}>
                        <p className={dataLabelCls}>{c.label}</p>
                        <div className={nomadValWrapCls}>
                          <p className={nomadValCls(c.val, c.color)}>{c.val}</p>
                        </div>
                      </div>
                    ));
                  })()}
                </div>

                {/* Notes */}
                {(visaNote || inet?.vpnNote) && (
                  <div className={`mt-3 px-3 space-y-1 text-xs leading-relaxed ${subCls}`}>
                    {visaNote && <p>{t("nomadVisaNotePrefix")} {visaNote}</p>}
                    {inet?.vpnNote && <p>{t("nomadVpnNotePrefix")} {localizeVpnNote(inet.vpnNote, locale as Locale)}</p>}
                  </div>
                )}

                {/* Dashed divider */}
                <hr className={`my-5 border-dashed ${darkMode ? "border-slate-600" : "border-slate-300"}`} />

                {/* Bottom: Visa-free + Timezone */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Visa-free */}
                  <div>
                    <h3 className={`text-sm font-bold mb-3 ${headingCls}`}>{t("nomadVisaFreeDays").replace("{city}", cityName)}</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {(Object.entries(passportLabels) as [keyof typeof passportLabels, string][]).map(([code, flag]) => {
                        const own = isOwnCountry(code);
                        const days = vfmResolved?.[code] ?? null;
                        const val = own ? "—" : days !== null ? t("nomadDays").replace("{d}", String(days)) : t("nomadNeedVisa");
                        const color = own ? subCls : days !== null ? undefined : (darkMode ? "text-red-400" : "text-red-500");
                        return (
                          <div key={code} className={dataCellCls}>
                            <p className={dataLabelCls}>{flag}</p>
                            <div className={nomadValWrapCls}>
                              <p className={nomadValCls(val, color)}>{val}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  {/* Timezone overlap */}
                  <div>
                    <h3 className={`text-sm font-bold mb-3 ${headingCls}`}>{t("nomadTimezone")}</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {[
                        { label: t("nomadTzUSWest"), val: tz?.overlapWithUSWest },
                        { label: t("nomadTzUSEast"), val: tz?.overlapWithUSEast },
                        { label: t("nomadTzLondon"), val: tz?.overlapWithLondon },
                        { label: t("nomadTzEast8"), val: tz?.overlapWithEast8 },
                      ].map((item) => (
                        <div key={item.label} className={dataCellCls}>
                          <p className={dataLabelCls}>{item.label}</p>
                          <div className={nomadValWrapCls}>
                            <p className={dataValCls}>{item.val != null ? `${item.val} ${t("unitH")}` : "—"}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          );
        })()}

        {/* Similar Cities */}
        <section>
          <h2 className={`text-2xl font-bold mb-4 ${headingCls}`}>{t("similarCities")}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {similarIds.map((otherId) => {
              const other = allCities.find((c) => c.id === otherId);
              if (!other) return null;
              const otherSlug = CITY_SLUGS[otherId];
              if (!otherSlug) return null;
              const otherName = CITY_NAME_TRANSLATIONS[otherId]?.[locale] || getCityEnName(otherId);
              const pair = [slug, otherSlug].sort().join("-vs-");

              // Find the dimension where the other city beats this one by the largest margin
              const otherGross = activeProfession && other.professions[activeProfession] != null ? other.professions[activeProfession] * salaryMultiplier : null;
              const otherIncome = otherGross !== null ? computeNetIncome(otherGross, other.country, other.id, incomeMode, s.rates?.rates).netUSD : null;
              const otherHourly = other.annualWorkHours !== null && other.annualWorkHours > 0 && otherIncome !== null ? otherIncome / other.annualWorkHours : 0;
              const otherLP = computeLifePressure(other, allCities, otherIncome ?? 0, allIncomes, costTierField).value;
              const curCl = city.climate ?? null;
              const othCl = allCities.find(c => c.id === otherId)?.climate ?? null;
              const dims: { key: string; cur: number; oth: number; higher: boolean }[] = [
                { key: "avgIncome", cur: income ?? 0, oth: otherIncome ?? 0, higher: true },
                { key: "monthlyCost", cur: tierCost, oth: other[TIER_KEYS.find(tk => tk.key === costTier)!.field], higher: false },
                { key: "yearlySavings", cur: savings ?? 0, oth: (otherIncome ?? 0) - other[TIER_KEYS.find(tk => tk.key === costTier)!.field] * 12, higher: true },
                ...(city.monthlyRent !== null && other.monthlyRent !== null ? [{ key: "monthlyRent", cur: city.monthlyRent, oth: other.monthlyRent, higher: false }] : []),
                ...(city.annualWorkHours !== null && other.annualWorkHours !== null ? [{ key: "annualWorkHours", cur: city.annualWorkHours, oth: other.annualWorkHours, higher: false }] : []),
                ...(hourlyWage > 0 && otherHourly > 0 ? [{ key: "hourlyWage", cur: hourlyWage, oth: otherHourly, higher: true }] : []),
                ...(city.paidLeaveDays !== null && other.paidLeaveDays !== null ? [{ key: "paidLeaveDays", cur: city.paidLeaveDays, oth: other.paidLeaveDays, higher: true }] : []),
                ...(city.housePrice !== null && other.housePrice !== null ? [{ key: "housePrice", cur: city.housePrice, oth: other.housePrice, higher: false }] : []),
                ...(city.airQuality !== null && other.airQuality !== null ? [{ key: "airQuality", cur: city.airQuality, oth: other.airQuality, higher: false }] : []),
                ...(city.internetSpeedMbps !== null && other.internetSpeedMbps !== null ? [{ key: "internetSpeed", cur: city.internetSpeedMbps, oth: other.internetSpeedMbps, higher: true }] : []),
                ...(city.directFlightCities !== null && other.directFlightCities !== null ? [{ key: "directFlights", cur: city.directFlightCities, oth: other.directFlightCities, higher: true }] : []),
                { key: "lifePressureIndex", cur: lifePressure, oth: otherLP, higher: false },
                { key: "healthcareIndex", cur: city.healthcareIndex, oth: other.healthcareIndex, higher: true },
                { key: "institutionalFreedom", cur: city.freedomIndex, oth: other.freedomIndex, higher: true },
                { key: "safetyIndex", cur: city.safetyIndex, oth: other.safetyIndex, higher: true },
                ...(city.doctorsPerThousand !== null && other.doctorsPerThousand !== null ? [{ key: "doctorsPerThousand", cur: city.doctorsPerThousand, oth: other.doctorsPerThousand, higher: true }] : []),
                ...(curCl && othCl ? [
                  { key: "avgTemp", cur: curCl.avgTempC, oth: othCl.avgTempC, higher: true },
                  { key: "tempRange", cur: curCl.summerAvgC - curCl.winterAvgC, oth: othCl.summerAvgC - othCl.winterAvgC, higher: false },
                  { key: "annualRain", cur: curCl.annualRainMm, oth: othCl.annualRainMm, higher: false },
                  { key: "humidity", cur: curCl.humidityPct, oth: othCl.humidityPct, higher: false },
                  { key: "sunshine", cur: curCl.sunshineHours, oth: othCl.sunshineHours, higher: true },
                ] : []),
              ];
              // Compute % difference for each dimension, split into advantages & disadvantages
              const scored: { key: string; pct: number; adv: boolean; sign: string }[] = [];
              for (const d of dims) {
                if (d.cur === 0) continue;
                const pct = Math.round(Math.abs(d.oth - d.cur) / Math.abs(d.cur) * 100);
                if (pct === 0) continue;
                const better = d.higher ? d.oth > d.cur : d.oth < d.cur;
                const sign = d.oth > d.cur ? "+" : "-";
                scored.push({ key: d.key, pct, adv: better, sign });
              }
              const climateKeys = new Set(["avgTemp", "tempRange", "annualRain", "humidity", "sunshine"]);
              scored.sort((a, b) => b.pct - a.pct);
              const nonClimate = scored.filter(s => !climateKeys.has(s.key));
              const top2Adv = nonClimate.filter(s => s.adv).slice(0, 2);
              const top1Dis = nonClimate.filter(s => !s.adv).slice(0, 1);
              const highlights = [...top2Adv, ...top1Dis];

              return (
                <div key={otherId} className={`rounded-xl border shadow-sm p-3 text-center ${sectionBg}`}>
                  <span className="text-2xl">{CITY_FLAG_EMOJIS[otherId] || "🏙️"}</span>
                  <Link href={`/${locale}/city/${otherSlug}`} className={`block text-sm font-semibold mt-1 ${headingCls} hover:underline`}>{otherName}</Link>
                  <div className="min-h-[3.5rem] flex flex-col items-center justify-center mt-1">
                    {highlights.map((h, idx) => (
                      <p key={idx} className={`text-[11px] leading-snug ${h.adv ? (darkMode ? "text-emerald-400" : "text-emerald-600") : (darkMode ? "text-rose-400" : "text-rose-500")}`}>
                        {t(h.key)} {h.sign}{h.pct}%
                      </p>
                    ))}
                  </div>
                  <Link href={`/${locale}/compare/${pair}`} className={`inline-block text-xs px-3 py-1 mt-1 rounded border transition ${darkMode ? "border-violet-500/50 text-violet-300 hover:bg-violet-900/30" : "border-violet-300 text-violet-600 hover:bg-violet-50"}`}>
                    {t("compareCity")}
                  </Link>
                </div>
              );
            })}
          </div>
        </section>

      </div>

      {/* Footer */}
      <footer className={`px-4 py-5 text-center text-xs ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
        <div className={`max-w-5xl mx-auto border-t pt-4 ${darkMode ? "border-slate-700" : "border-slate-200"}`}>
          <p>{t("dataSourcesDisclaimer")}</p>
          <p className="mt-1"><a href={`/${locale}/methodology`} className="underline hover:text-blue-500">{t("navMethodology")}</a> · <a href="https://github.com/qing4132/whichcity/issues" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-500">GitHub</a> · <a href="mailto:qing4132@users.noreply.github.com" className="underline hover:text-blue-500">{t("footerFeedback")}</a></p>
        </div>
      </footer>
    </div>
  );
}
