"use client";

/**
 * Plan D 字号映射表（2026-04-12）
 * 适用范围：CityDetailContent / HeroSection / FeedPost / NomadSection / SimilarCities
 *
 *  用途              旧值            新值
 *  ─────────────────────────────────────────
 *  footer            text-xs (12px)   text-[12px]
 *  值标签            text-[9px]       text-[12px]
 *  子描述/税务明细    text-[10px]      text-[13px]
 *  排名/对比按钮      text-[10px]      text-[13px]
 *  展开提示           text-[11px]      text-[14px]
 *  行标题/section头   text-xs (12px)   text-[15px]
 *  城市简介/安全警告   text-sm (14px)   text-[15px]
 *  小数字(工时/AQI等) text-base (16px) text-[20px]
 *  城市名 h1         text-xl (20px)   text-[24px]
 *  中数字(住房/消费)  text-2xl (24px)  text-[30px]
 *  国旗 emoji        text-[28px]      text-[32px]
 *  CJK 万/亿         text-[30px]      text-[37px]
 *  大数字(收入/安全)  text-4xl (36px)  text-[45px]
 *  相似城市旗帜       text-xl (20px)   text-[24px]
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import type { City, CostTier } from "@/lib/types";
import type { NomadCityData, VisaFreeMatrix } from "@/lib/nomadData";
import { CITY_FLAG_EMOJIS } from "@/lib/constants";
import { CITY_NAME_TRANSLATIONS, COUNTRY_TRANSLATIONS, socialCompLabel } from "@/lib/i18n";
import { CITY_LANGUAGES, LANGUAGE_NAME_TRANSLATIONS } from "@/lib/cityLanguages";
import NavBar from "./NavBar";
import { computeLifePressure, getClimateLabel } from "@/lib/clientUtils";
import { trackEvent } from "@/lib/analytics";
import { useSettings } from "@/hooks/useSettings";
import { computeNetIncome, computeAllNetIncomes, getExpatSchemeName, computeTaxBreakdown } from "@/lib/taxUtils";
import ClimateChart from "./ClimateChart";
import HeroSection from "./city-detail/HeroSection";
import FeedPost from "./city-detail/FeedPost";
import NomadSection from "./city-detail/NomadSection";
import SimilarCities from "./city-detail/SimilarCities";

interface Props {
  city: City; slug: string; allCities: City[]; locale: string;
  nomadData?: NomadCityData | null; visaMatrix?: VisaFreeMatrix | null;
}

const TIER_KEYS: { key: CostTier; field: "costModerate" | "costBudget"; labelKey: string }[] = [
  { key: "moderate", field: "costModerate", labelKey: "costTierModerate" },
  { key: "budget", field: "costBudget", labelKey: "costTierBudget" },
];

export default function CityDetailContent({ city, slug, allCities, locale: urlLocale, nomadData, visaMatrix }: Props) {
  const s = useSettings(urlLocale);
  const { locale, darkMode, t, formatCurrency, formatCompact, costTier, profession, incomeMode, salaryMultiplier } = s;
  const cjk = locale === "zh" || locale === "ja";
  const compactVal = (amount: number, unitPx = 37) => {
    const { num, unit } = formatCompact(amount);
    if (!unit || !cjk) return <>{num}{unit}</>;
    return <>{num}<span className="relative -top-[2px] font-[var(--font-cjk)]" style={{ fontSize: `${unitPx}px`, WebkitTextStroke: unitPx >= 30 ? "2px" : "1px" }}>{unit}</span></>;
  };

  const cityName = CITY_NAME_TRANSLATIONS[city.id]?.[locale] || city.name;
  const countryName = COUNTRY_TRANSLATIONS[city.country]?.[locale] || city.country;
  useEffect(() => { document.title = `${cityName} | WhichCity`; }, [locale, cityName]);
  useEffect(() => { trackEvent("city_view", { city_slug: slug }); }, [slug]);
  const [shfOpen, setShfOpen] = useState(false);
  const [incomeOpen, setIncomeOpen] = useState(false);
  const [costOpen, setCostOpen] = useState(false);
  // Delayed label: text switches immediately on open, delays 200ms on close
  const [incomeLabel, setIncomeLabel] = useState(false);
  const [shfLabel, setShfLabel] = useState(false);
  useEffect(() => { if (incomeOpen) { setIncomeLabel(true); } else { const t = setTimeout(() => setIncomeLabel(false), 200); return () => clearTimeout(t); } }, [incomeOpen]);
  useEffect(() => { if (shfOpen) { setShfLabel(true); } else { const t = setTimeout(() => setShfLabel(false), 200); return () => clearTimeout(t); } }, [shfOpen]);
  const [showCityInNav, setShowCityInNav] = useState(false);
  const [heroEl, setHeroEl] = useState<HTMLDivElement | null>(null);
  const heroRef = useCallback((node: HTMLDivElement | null) => setHeroEl(node), []);

  /* Intersection Observer: show city flag+name in NavBar when identity row scrolls out */
  useEffect(() => {
    if (!heroEl) return;
    const ob = new IntersectionObserver(([entry]) => setShowCityInNav(!entry.isIntersecting), { threshold: 0, rootMargin: "-48px 0px 0px 0px" });
    ob.observe(heroEl);
    return () => ob.disconnect();
  }, [heroEl]);

  if (!s.mounted) return null;
  if (!s.ready) return (
    <div className={`min-h-screen transition-colors ${darkMode ? "bg-slate-950 text-slate-100" : "bg-white text-slate-900"}`}>
      <NavBar s={s} compareHref={`/${locale}/compare/${slug}`} excludeSlug={slug} showShare isCityDetail />
    </div>
  );

  const id = city.id;
  const flag = CITY_FLAG_EMOJIS[id] || "🏤️";
  const climate = city.climate ?? null;
  const professions = city.professions ? Object.keys(city.professions) : [];
  const activeProfession = profession && professions.includes(profession) ? profession : professions[0] || "";
  const grossIncome = activeProfession && city.professions[activeProfession] != null ? city.professions[activeProfession] * salaryMultiplier : null;
  const taxResult = grossIncome !== null ? computeNetIncome(grossIncome, city.country, city.id, incomeMode, s.rates?.rates) : null;
  const income = taxResult?.netUSD ?? null;
  const costTierField = TIER_KEYS.find(tk => tk.key === costTier)!.field;
  const tierCost = city[costTierField];
  const savings = income !== null ? income - tierCost * 12 : null;
  const savingsRate = income !== null && income > 0 ? Math.round((savings! / income) * 100) : 0;

  const allGross = allCities.map(c => activeProfession && c.professions[activeProfession] != null ? c.professions[activeProfession] * salaryMultiplier : 0);
  const allIncomes = computeAllNetIncomes(allCities, allGross, incomeMode, s.rates?.rates);
  const allCosts = allCities.map(c => c[costTierField]);
  const allSavings = allCities.map((c, i) => allIncomes[i] - allCosts[i] * 12);
  const nn = (arr: (number | null)[]): number[] => arr.filter((v): v is number => v !== null);
  const allSafety = allCities.map(c => c.safetyIndex);
  const allHealth = allCities.map(c => c.healthcareIndex);
  const allGovernance = allCities.map(c => c.governanceIndex);
  const allHouse = nn(allCities.map(c => c.housePrice));
  const hourlyWage = city.annualWorkHours != null && city.annualWorkHours > 0 && income !== null ? income / city.annualWorkHours : 0;
  const yearsVal = city.housePrice != null && savings !== null && savings > 0 ? (city.housePrice * 70) / savings : Infinity;

  const lpResult = computeLifePressure(city, allCities, income ?? 0, allIncomes, costTierField);
  const allLifePressure = allCities.map((c, i) => computeLifePressure(c, allCities, allIncomes[i], allIncomes, costTierField).value);

  const n = allCities.length;
  const rankHigher = (values: number[], val: number) => {
    const unique = [...new Set(values)].sort((a, b) => b - a);
    let rank = 1;
    for (const v of unique) { if (val >= v) return rank; rank += values.filter(x => x === v).length; }
    return values.length;
  };
  const rankLower = (values: number[], val: number) => {
    const unique = [...new Set(values)].sort((a, b) => a - b);
    let rank = 1;
    for (const v of unique) { if (val <= v) return rank; rank += values.filter(x => x === v).length; }
    return values.length;
  };
  type Tier = "good" | "mid" | "bad";
  const tierHigh = (values: number[], val: number): Tier => {
    const r = rankHigher(values, val), tot = values.length;
    return r <= tot * 0.2 ? "good" : r > tot * 0.8 ? "bad" : "mid";
  };
  const tierLow = (values: number[], val: number): Tier => {
    const r = rankLower(values, val), tot = values.length;
    return r <= tot * 0.2 ? "good" : r > tot * 0.8 ? "bad" : "mid";
  };
  const headCls = darkMode ? "text-slate-100" : "text-slate-900";
  const labelCls = darkMode ? "text-slate-400" : "text-slate-400";
  const subCls = darkMode ? "text-slate-500" : "text-slate-500";
  const divider = darkMode ? "border-slate-800" : "border-slate-100";
  const cardValCls = (tier: Tier) => {
    if (tier === "good") return darkMode ? "text-green-400" : "text-green-600";
    if (tier === "bad") return darkMode ? "text-rose-400" : "text-rose-500";
    return headCls;
  };

  const vpnRestricted = nomadData?.internet?.vpnRestricted;
  const vpnLabel = vpnRestricted === true ? t("nomadVPN") : vpnRestricted === "partial" ? t("nomadVPNPartial") : t("nomadVPNFree");
  const langs = CITY_LANGUAGES[id] || [];
  const localizedLangs = langs.map(l => LANGUAGE_NAME_TRANSLATIONS[l]?.[locale] || l);

  // ── Hero grade info (基本保障评级) ──
  const heroGrade = (() => {
    const shfSum = city.safetyIndex + city.healthcareIndex + city.governanceIndex;
    const allShfSums = allCities.map(c => c.safetyIndex + c.healthcareIndex + c.governanceIndex);
    const shfRank = rankHigher(allShfSums, shfSum);
    const baseGrade = shfRank <= n * 0.25 ? "A" : shfRank <= n * 0.50 ? "B" : shfRank <= n * 0.75 ? "C" : "D";
    const allGreen = tierHigh(allSafety, city.safetyIndex) === "good" && tierHigh(allHealth, city.healthcareIndex) === "good" && tierHigh(allGovernance, city.governanceIndex) === "good";
    const grade = baseGrade === "A" && allGreen ? "S" : baseGrade;
    const confLevel = (city.securityConfidence >= 90 ? "high" : city.securityConfidence >= 70 ? "medium" : "low") as "high" | "medium" | "low";
    const hasSafetyWarn = !!city.safetyWarning;
    const hasConfWarn = confLevel !== "high";
    const hasWarn = hasSafetyWarn || hasConfWarn;
    const warnAmberCls = darkMode ? "text-amber-400" : "text-amber-600";
    const warnRedCls = darkMode ? "text-rose-400" : "text-rose-500";
    const warnCls0 = hasSafetyWarn ? warnRedCls : warnAmberCls;
    const gradeDisplay = hasWarn ? `* ${grade}` : grade;
    const gradeCls = hasWarn ? warnCls0 : grade === "S" || grade === "A" ? (darkMode ? "text-green-400" : "text-green-600") : grade === "D" ? (darkMode ? "text-rose-400" : "text-rose-500") : headCls;
    return { grade, gradeDisplay, gradeCls, hasSafetyWarn, confLevel, safetyWarning: city.safetyWarning, warnRedCls, warnAmberCls };
  })();

  // ── Hero expand content (基本保障子指标) ──
  const heroShfContent = (() => {
    const warnCls = darkMode ? "text-amber-400" : "text-amber-600";
    const greenCls = darkMode ? "text-green-400" : "text-green-600";
    const redCls = darkMode ? "text-rose-400" : "text-rose-500";
    const cache: Record<string, number[]> = {};
    const getSorted = (field: string) => cache[field] ??= allCities.map(c => (c as unknown as Record<string, unknown>)[field]).filter((v): v is number => typeof v === "number").sort((a, b) => a - b);
    const judge = (val: number | null | undefined, field: string, higherBetter: boolean) => {
      if (val == null) return null;
      const s = getSorted(field);
      if (s.length < 3) return null;
      const pct = s.filter(v => v <= val).length / s.length;
      return higherBetter ? (pct >= 0.7 ? "up" : pct <= 0.3 ? "down" : "mid") : (pct <= 0.3 ? "up" : pct >= 0.7 ? "down" : "mid");
    };
    const sym = (j: string | null) => {
      if (j === "up") return <span className={`font-bold ${greenCls}`}>⬆︎</span>;
      if (j === "down") return <span className={`font-bold ${redCls}`}>⬇︎</span>;
      return <span className={headCls}>—</span>;
    };
    type Sub = { label: string; val: number | null | undefined; range: string; field: string; inv?: boolean; fmt: (v: number) => string };
    const groups: { name: string; score: number; rank: number; all: number[]; conf: number; subs: Sub[] }[] = [
      { name: t("safetyShort"), score: city.safetyIndex, rank: rankHigher(allSafety, city.safetyIndex), all: allSafety, conf: city.safetyConfidence, subs: [
        { label: `${t("safetyHomicide")} (35%)`, val: city.homicideRate, range: "0.1–46", field: "homicideRate", inv: true, fmt: v => v.toFixed(1) },
        { label: `${t("politicalStability")} (25%)`, val: city.politicalStability, range: "0–100", field: "politicalStability", fmt: v => v.toFixed(1) },
        { label: `${t("ruleLaw")} (20%)`, val: city.ruleLawWGI, range: "0–100", field: "ruleLawWGI", fmt: v => v.toFixed(1) },
        { label: `${t("controlOfCorruption")} (20%)`, val: city.controlOfCorruption, range: "0–100", field: "controlOfCorruption", fmt: v => v.toFixed(1) },
      ]},
      { name: t("healthcareShort"), score: city.healthcareIndex, rank: rankHigher(allHealth, city.healthcareIndex), all: allHealth, conf: city.healthcareConfidence, subs: [
        { label: `${t("doctorsPerThousand")} (25%)`, val: city.doctorsPerThousand, range: "0.2–7.0", field: "doctorsPerThousand", fmt: v => v.toFixed(1) },
        { label: `${t("hospitalBeds")} (20%)`, val: city.hospitalBedsPerThousand, range: "0.3–13", field: "hospitalBedsPerThousand", fmt: v => v.toFixed(1) },
        { label: `${t("uhcCoverage")} (25%)`, val: city.uhcCoverageIndex, range: "40–92", field: "uhcCoverageIndex", fmt: v => String(Math.round(v)) },
        { label: `${t("lifeExpectancy")} (15%)`, val: city.lifeExpectancy, range: "54–85", field: "lifeExpectancy", fmt: v => v.toFixed(1) },
        { label: `${t("outOfPocket")} (15%)`, val: city.outOfPocketPct, range: "7–71%", field: "outOfPocketPct", inv: true, fmt: v => `${Math.round(v)}%` },
      ]},
      { name: t("governanceShort"), score: city.governanceIndex, rank: rankHigher(allGovernance, city.governanceIndex), all: allGovernance, conf: city.governanceConfidence, subs: [
        { label: `${t("corruptionIdx")} (50%)`, val: city.corruptionPerceptionIndex, range: "22–90", field: "corruptionPerceptionIndex", fmt: v => String(Math.round(v)) },
        { label: `${t("govEffect")} (50%)`, val: city.govEffectiveness, range: "21–96", field: "govEffectiveness", fmt: v => v.toFixed(1) },
      ]},
    ];
    const allSubs = [city.homicideRate, city.politicalStability, city.ruleLawWGI, city.controlOfCorruption,
      city.doctorsPerThousand, city.hospitalBedsPerThousand, city.uhcCoverageIndex, city.lifeExpectancy, city.outOfPocketPct,
      city.corruptionPerceptionIndex, city.govEffectiveness];
    return (
      <div>
        <div className={`text-[13px] ${subCls} space-y-0.5`}>
          {groups.map((g, gi) => {
            const present = g.subs.filter(s => s.val != null).length;
            const total = g.subs.length;
            return (
              <div key={gi}>
                {gi > 0 && <div className={`border-t ${divider} my-1`} />}
                <div className="flex justify-between font-bold">
                  <span>{g.name}</span>
                  <span className={cardValCls(tierHigh(g.all, g.score))}>{g.score.toFixed(1)}</span>
                </div>
                {g.subs.map(s => {
                  const missing = s.val == null;
                  const j = judge(s.val, s.field, !s.inv);
                  return (
                    <div key={s.field} className={`flex items-center py-0.5 pl-3 ${missing ? `opacity-40 ${warnCls}` : "opacity-60"}`}>
                      <span className={`flex-1 min-w-0 truncate ${missing ? "line-through" : ""}`}>{s.label}</span>
                      <span className="w-11 text-right shrink-0">{missing ? "" : s.fmt(s.val!)}</span>
                      <span className="w-[50px] text-right text-[11px] shrink-0">{missing ? "" : s.range}</span>
                      <span className="w-6 text-right shrink-0">{missing ? "" : sym(j)}</span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
        {allSubs.some(v => v == null) && (
          <>
            <div className={`border-t ${divider} mt-2`} />
            <div className={`text-[13px] ${subCls} mt-1.5 opacity-60`}>† {t("shfWeightNote")}</div>
          </>
        )}
      </div>
    );
  })();

  return (
    <div className={`min-h-screen transition-colors ${darkMode ? "bg-slate-950 text-slate-100" : "bg-white text-slate-900"}`}>
      <NavBar s={s} professionValue={activeProfession} professions={professions} compareHref={`/${locale}/compare/${slug}`} excludeSlug={slug} showShare
        isCityDetail cityFlag={flag} cityNameText={cityName} showCityInNav={showCityInNav} />

      <div className="max-w-2xl mx-auto px-4 pt-6">

        {/* Profile header */}
        <HeroSection ref={heroRef} city={city} cityName={cityName} countryName={countryName} flag={flag} slug={slug} locale={locale} darkMode={darkMode} t={t}
          gradeInfo={heroGrade} shfOpen={shfOpen} onShfToggle={() => { setShfOpen(!shfOpen); setShfLabel(!shfOpen); }} shfLabel={shfLabel} shfExpandContent={heroShfContent}
          englishLabel={nomadData?.english?.cityRating ? t(`nomadEnglish${nomadData.english.cityRating}`) : undefined} />

        {/* Row 0: Basic Security Grade */}
        {heroGrade && (
          <div className={`py-3.5 border-b ${divider} cursor-pointer select-none active:${darkMode ? "bg-slate-900" : "bg-slate-50"}`} onClick={() => { setShfOpen(!shfOpen); setShfLabel(!shfOpen); }}
            role="button" aria-expanded={shfOpen} tabIndex={0} onKeyDown={e => e.key === "Enter" && (setShfOpen(!shfOpen), setShfLabel(!shfOpen))}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className={`text-[15px] font-extrabold ${headCls}`}>{t("basicSecurityTitle")}</span>
              <span className={`ml-auto text-[14px] ${subCls}`}>{t(shfLabel ? "tapToCollapse" : "tapForDetails")}</span>
            </div>
            <div className="flex gap-4 mb-1 flex-wrap">
              <div>
                <div className={`text-[45px] font-black leading-none ${heroGrade.gradeCls}`}>
                  {heroGrade.gradeDisplay}
                </div>
                {(heroGrade.hasSafetyWarn || heroGrade.confLevel !== "high") && (
                  <div className={`text-[12px] ${heroGrade.hasSafetyWarn ? heroGrade.warnRedCls : heroGrade.warnAmberCls}`}>
                    * {heroGrade.hasSafetyWarn
                      ? (heroGrade.safetyWarning === "active_conflict" ? t("safetyWarningConflict") : heroGrade.safetyWarning === "extreme_instability" ? t("safetyWarningInstability") : t("safetyWarningBlocked"))
                      : heroGrade.confLevel === "medium" ? t("confMedium") : t("confLow")}
                  </div>
                )}
              </div>
            </div>
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${shfOpen ? "max-h-[800px] opacity-100 mt-2" : "max-h-0 opacity-0"}`}>
              {heroShfContent}
            </div>
          </div>
        )}

        {/* Row 1: Income (大) */}
        <div className={`py-3.5 border-b ${divider} cursor-pointer select-none active:${darkMode ? "bg-slate-900" : "bg-slate-50"}`} onClick={() => setIncomeOpen(!incomeOpen)}
          role="button" aria-expanded={incomeOpen} tabIndex={0} onKeyDown={e => e.key === "Enter" && setIncomeOpen(!incomeOpen)}>
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className={`text-[15px] font-extrabold ${headCls}`}>{t("incomeExpenseTitle")}</span>
            <span className={`ml-auto text-[14px] ${subCls}`}>{t(incomeLabel ? "tapToCollapse" : "tapForDetails")}</span>
          </div>
          <div className="flex gap-4 mb-1 flex-wrap">
            <div>
              <div className={`text-[45px] font-black leading-none ${income !== null ? cardValCls(tierHigh(allIncomes, income)) : headCls}`}>
                {income !== null ? compactVal(income) : "—"}
              </div>
              <div className={`text-[12px] ${labelCls}`}>{s.getProfessionLabel(activeProfession)} · {t(`salaryTier_${salaryMultiplier}`)}</div>
            </div>
          </div>
          <div className={`overflow-hidden transition-all duration-300 ease-in-out ${incomeOpen ? "max-h-[600px] opacity-100 mt-2" : "max-h-0 opacity-0"}`}>
            {(() => {
              const bd = grossIncome !== null ? computeTaxBreakdown(grossIncome, city.country, city.id, s.rates?.rates) : null;
              if (!bd) return null;
              const fmt = (v: number) => `${bd.currencyCode} ${Math.round(Math.abs(v)).toLocaleString()}`;
              const fmtUser = (usd: number) => { const r = s.rates?.rates; const val = r && s.currency !== "USD" ? usd * (r[s.currency] ?? 1) : usd; return `${s.currency} ${Math.round(val).toLocaleString()}`; };
              const redCls = darkMode ? "text-rose-400" : "text-rose-500";
              const greenCls = darkMode ? "text-green-400" : "text-green-600";
              return (
                <>
                <div className={`text-[13px] ${subCls} space-y-0.5`}>
                  {/* Gross */}
                  <div className="flex justify-between font-bold"><span>{t("taxBkGross")}</span><span className={headCls}>{fmt(bd.grossLocal)}</span></div>
                  {/* Sections */}
                  {bd.sections.map((sec, i) => {
                    const prev = i > 0 ? bd.sections[i - 1] : null;
                    const needDivider = (sec.isInfo && (!prev || !prev.isInfo)) || (sec.isResult && prev?.isInfo);
                    return (
                      <div key={i}>
                        {needDivider && <div className={`border-t ${divider} mt-0.5`} />}
                        {sec.isResult ? (
                          <div className="flex justify-between font-semibold pt-0.5">
                            <span>{t(sec.label)}</span><span className={headCls}>{fmt(sec.total)}</span>
                          </div>
                        ) : sec.isInfo ? (
                          <div className="flex justify-between pt-0.5">
                            <span>{t(sec.label)}</span><span>{fmt(sec.total)}</span>
                          </div>
                        ) : (
                          <div className={`flex justify-between font-semibold ${sec.total < 0 ? redCls : ""}`}>
                            <span>{sec.total < 0 ? "−" : ""} {t(sec.label)}</span><span>{fmt(sec.total)}</span>
                          </div>
                        )}
                        {sec.details && sec.details.map((d, j) => (
                          <div key={j} className="flex justify-between pl-3 opacity-60">
                            <span>{d.rate ? `${socialCompLabel(d.label, locale)} ${d.rate}` : d.label}</span><span>{d.capped ? "* " : ""}{fmt(d.amount)}</span>
                          </div>
                        ))}
                        {sec.details?.some(d => d.capped) && (
                          <div className="pl-3 opacity-40 text-[12px] mt-0.5">* {t("taxBkCapped")}</div>
                        )}
                      </div>
                    );
                  })}
                  {/* Net */}
                  <div className={`flex justify-between border-t pt-1 font-bold ${divider}`}><span>{t("taxBkNet")}</span><span className={greenCls}>{fmt(bd.netLocal)}</span></div>
                  {incomeMode !== "gross" && taxResult !== null && !taxResult.dataIsLikelyNet && (
                    <div className="flex justify-between mt-1"><span>{t("effectiveTaxRate")}</span><span>~{(taxResult.effectiveRate * 100).toFixed(1)}%</span></div>
                  )}
                  {bd.currencyCode !== s.currency && (
                    <div className="flex justify-between">
                      <span>→ {s.currency} <span className="opacity-60">(× {(s.currency === "USD" ? (1 / bd.fxRate) : (s.rates?.rates[s.currency] ?? 1) / bd.fxRate).toFixed(4)})</span></span>
                      <span className={greenCls}>{fmtUser(bd.netUSD)}</span>
                    </div>
                  )}
                </div>
                {bd.expatSchemeName && (() => {
                    const expatResult = computeNetIncome(grossIncome!, city.country, city.id, "expatNet", s.rates?.rates);
                    if (!expatResult.hasExpatScheme || expatResult.netUSD <= bd.netUSD) return null;
                    const expatNetLocal = expatResult.netUSD * bd.fxRate;
                    const expatRate = (expatResult.effectiveRate * 100).toFixed(1);
                    const condKey: Record<string, string> = {
                      expatScheme30Ruling: "expatCond30Ruling", expatSchemeBeckham: "expatCondBeckham",
                      expatSchemeImpatriati: "expatCondImpatriati", expatSchemeNHR: "expatCondNHR",
                      expatScheme19Flat: "expatCond19Flat", expatSchemeCPF: "expatCondCPF",
                    };
                    const tipKey = bd.expatSchemeName === "expatSchemeCPF" ? "expatTipCPF" : "expatTip";
                    const converted = bd.currencyCode !== s.currency ? `（${fmtUser(expatResult.netUSD)}）` : "";
                    return (
                      <>
                        <div className={`border-t ${divider} mt-2`} />
                        <div className={`text-[13px] ${subCls} mt-1.5 opacity-60`}>
                          † {t(tipKey, { scheme: t(bd.expatSchemeName!), cond: t(condKey[bd.expatSchemeName!] || ""), net: fmt(expatNetLocal), converted, rate: expatRate })}
                        </div>
                      </>
                    );
                  })()}
                </>
              );
            })()}
          </div>
        </div>

        {/* Row 3: Living Cost (L2) */}
        <div className={`py-3.5 border-b ${divider} cursor-pointer select-none active:${darkMode ? "bg-slate-900" : "bg-slate-50"}`} onClick={() => setCostOpen(!costOpen)}
          role="button" aria-expanded={costOpen} tabIndex={0} onKeyDown={e => e.key === "Enter" && setCostOpen(!costOpen)}>
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className={`text-[15px] font-extrabold ${headCls}`}>{t("monthlyCost")}</span>
            <span className="ml-auto text-[13px] font-semibold">
              <span className={cardValCls(tierLow(allCosts, tierCost))}>#{rankLower(allCosts, tierCost)}</span>
              <span className={headCls}> / {n}</span>
            </span>
          </div>
          <div className="flex gap-4 mb-1 flex-wrap">
            <div>
              <div className={`text-[30px] font-black ${cardValCls(tierLow(allCosts, tierCost))}`}>{compactVal(tierCost, 25)}</div>
              <div className={`text-[12px] ${labelCls}`}>{t("monthlyCostWithTier")}</div>
            </div>
            <div>
              <div className={`text-[30px] font-black ${headCls}`}>{city.monthlyRent != null ? compactVal(city.monthlyRent, 25) : "—"}</div>
              <div className={`text-[12px] ${labelCls}`}>{t("avgMonthlyRent1BR")}</div>
            </div>
          </div>
          <div className={`text-[14px] ${subCls}`}>{t(costOpen ? "costTapToCollapse" : "costTapForDetails")}</div>
          <div className={`overflow-hidden transition-all duration-300 ease-in-out ${costOpen ? "max-h-[400px] opacity-100 mt-2" : "max-h-0 opacity-0"}`}>
            {(() => {
              const fmtC = (v: number) => formatCurrency(Math.round(v));
              const rentPct = city.monthlyRent != null && tierCost > 0 ? Math.round((city.monthlyRent / tierCost) * 100) : null;
              const nonRent = city.monthlyRent != null ? tierCost - city.monthlyRent : null;
              const otherKey = costTier === "moderate" ? "budget" : "moderate";
              const otherField = TIER_KEYS.find(tk => tk.key === otherKey)!.field;
              const otherCost = city[otherField];
              const rowBdr = darkMode ? "border-slate-800" : "border-slate-50";
              return (
                <div className={`text-[13px] ${subCls} space-y-0.5`}>
                  <div className="opacity-60">{t(costTier === "moderate" ? "costBkModerateDesc" : "costBkBudgetDesc")}</div>
                  <div className={`opacity-60 mb-1`}>{t("costBkIncludes")}</div>
                  {city.monthlyRent != null && (
                    <>
                      <div className={`flex justify-between py-0.5 border-b ${rowBdr}`}>
                        <span>{t("costBkRent")}</span><span className={headCls}>{fmtC(city.monthlyRent)}</span>
                      </div>
                      {nonRent !== null && (
                        <div className={`flex justify-between py-0.5 border-b ${rowBdr}`}>
                          <span>{t("costBkNonRent")}</span><span className={headCls}>{fmtC(nonRent)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold pt-0.5">
                        <span>{t("monthlyCost")}</span><span className={headCls}>{fmtC(tierCost)}</span>
                      </div>
                      {rentPct !== null && (
                        <div className="opacity-60">{t("costBkRentPct", { pct: rentPct })}</div>
                      )}
                    </>
                  )}
                  <div className={`border-t ${divider} mt-1 pt-1 opacity-60`}>
                    {t("costBkOtherTier", { tier: t(TIER_KEYS.find(tk => tk.key === otherKey)!.labelKey), cost: fmtC(otherCost) })}
                  </div>
                  <div className="opacity-40">{t("costBkDataSrc")}</div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Row 4: Housing (中) */}
        <FeedPost title={t("housePrice")} darkMode={darkMode} cardValCls={cardValCls}>
          <div className="flex gap-4 mb-1">
            <div>
              <div className={`text-[30px] font-black ${city.housePrice != null ? cardValCls(tierLow(allHouse, city.housePrice)) : headCls}`}>{city.housePrice != null ? `${formatCurrency(city.housePrice)}/m²` : "—"}</div>
              <div className={`text-[12px] ${labelCls}`}>{t("housePrice")}</div>
            </div>
          </div>
          {isFinite(yearsVal) && <div className={`text-[13px] ${subCls}`}>{t("yearsToBuy")}: {yearsVal.toFixed(1)} {t("insightYears")}</div>}
        </FeedPost>

        {/* Row 4: Life Pressure (中) */}
        <FeedPost title={t("lifePressureIndex")} rank={`#${rankLower(allLifePressure, lpResult.value)} / ${n}`}
          darkMode={darkMode} cardValCls={cardValCls}
          description={lpResult.confidence === "low" ? t("lowConfidence") : undefined}>
          <div className={`text-[30px] font-black leading-none mb-1 ${cardValCls(tierLow(allLifePressure, lpResult.value))}`}>
            {lpResult.value.toFixed(1)}
          </div>
        </FeedPost>

        {/* Row 5: Living Cost (中) */}
        <FeedPost title={t("monthlyCost")} darkMode={darkMode} cardValCls={cardValCls}>
          <div className="flex gap-4 mb-1 flex-wrap">
            <div>
              <div className={`text-[30px] font-black ${cardValCls(tierLow(allCosts, tierCost))}`}>
                {compactVal(tierCost, 25)}
              </div>
              <div className={`text-[12px] ${labelCls}`}>{t("monthlyCostWithTier")}</div>
            </div>
            <div>
              <div className={`text-[30px] font-black ${headCls}`}>
                {city.monthlyRent != null ? compactVal(city.monthlyRent, 25) : "—"}
              </div>
              <div className={`text-[12px] ${labelCls}`}>{t("avgMonthlyRent1BR")}</div>
            </div>
            <div>
              <div className={`text-[30px] font-black ${savings !== null ? cardValCls(tierHigh(allSavings, savings)) : headCls}`}>
                {savings !== null ? compactVal(savings, 25) : "—"}
              </div>
              <div className={`text-[12px] ${labelCls}`}>{t("yearlySavings")}</div>
            </div>
          </div>
          <div className={`text-[13px] ${subCls}`}>
            {t("savingsRateLabel")} {savingsRate}%
          </div>
        </FeedPost>

        {/* Row 6: Work (小) */}
        <FeedPost title={t("annualWorkHours")} darkMode={darkMode} cardValCls={cardValCls}>
          <div className="flex gap-4 mb-1 flex-wrap">
            <div>
              <div className={`text-[20px] font-black ${headCls}`}>{city.annualWorkHours != null ? `${city.annualWorkHours} ${t("unitH")}` : "—"}</div>
              <div className={`text-[12px] ${labelCls}`}>{t("annualWorkHours")}</div>
            </div>
            {hourlyWage > 0 && <div>
              <div className={`text-[20px] font-black ${headCls}`}>{formatCurrency(Math.round(hourlyWage * 100) / 100)}</div>
              <div className={`text-[12px] ${labelCls}`}>{t("hourlyWage")}</div>
            </div>}
            <div>
              <div className={`text-[20px] font-black ${headCls}`}>{city.paidLeaveDays != null ? `${city.paidLeaveDays} ${t("paidLeaveDaysUnit")}` : "—"}</div>
              <div className={`text-[12px] ${labelCls}`}>{t("paidLeaveDays")}</div>
            </div>
          </div>
        </FeedPost>

        {/* Row 6: Environment (小) */}
        <FeedPost title={t("climateEnv")} darkMode={darkMode} cardValCls={cardValCls}>
          <div className="flex gap-4 mb-1 flex-wrap">
            {[
              { label: t("airQuality"), value: city.airQuality != null ? `AQI ${city.airQuality}` : "—" },
              { label: t("internetSpeed"), value: city.internetSpeedMbps != null ? `${city.internetSpeedMbps} Mbps` : "—" },
              { label: t("directFlights"), value: city.directFlightCities != null ? String(city.directFlightCities) : "—" },
              { label: t("nomadVPNLabel"), value: vpnLabel },
              ...(localizedLangs.length > 0 ? [{ label: t("officialLanguages"), value: localizedLangs.slice(0, 2).join(" · ") }] : []),
              ...(nomadData?.english?.cityRating ? [{ label: t("nomadEnglish"), value: t(`nomadEnglish${nomadData.english.cityRating}`) }] : []),
            ].map(item => (
              <div key={item.label}>
                <div className={`text-[20px] font-black ${headCls}`}>{item.value}</div>
                <div className={`text-[12px] ${labelCls}`}>{item.label}</div>
              </div>
            ))}
          </div>
        </FeedPost>

        {/* Climate */}
        {climate && (
          <div className={`py-3.5 border-b ${divider}`}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className={`text-[15px] font-extrabold ${headCls}`}>{t("climateType")}: {getClimateLabel(climate.type, locale)}</span>
            </div>
            <div className="flex gap-4 mb-3 flex-wrap">
              {[
                [t("avgTemp"), `${climate.avgTempC.toFixed(1)}°C`],
                [t("tempRange"), `${(climate.summerAvgC - climate.winterAvgC).toFixed(1)}°C`],
                [t("annualRain"), `${Math.round(climate.annualRainMm)} mm`],
                [t("humidity"), `${climate.humidityPct}%`],
                [t("sunshine"), `${Math.round(climate.sunshineHours)} ${t("unitH")}`],
              ].map(([label, val]) => (
                <div key={label}>
                  <div className={`text-[20px] font-black ${headCls}`}>{val}</div>
                  <div className={`text-[12px] ${labelCls}`}>{label}</div>
                </div>
              ))}
            </div>
            <ClimateChart climate={climate} locale={locale} darkMode={darkMode} t={t} />
          </div>
        )}

        {/* Nomad */}
        {nomadData && (
          <NomadSection city={city} cityName={cityName} locale={locale} darkMode={darkMode} t={t} nomadData={nomadData} visaMatrix={visaMatrix ?? null} />
        )}

        {/* Similar Cities */}
        <SimilarCities
          city={city} slug={slug} allCities={allCities} allIncomes={allIncomes}
          allLifePressure={allLifePressure} costTierField={costTierField}
          income={income} tierCost={tierCost} savings={savings}
          hourlyWage={hourlyWage} lifePressure={lpResult.value}
          locale={locale} darkMode={darkMode} t={t}
          costTier={costTier} incomeMode={incomeMode} salaryMultiplier={salaryMultiplier}
          activeProfession={activeProfession} rates={s.rates?.rates}
        />

      </div>

      <footer className={`px-4 py-5 text-center text-[12px] ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
        <div className={`max-w-2xl mx-auto border-t pt-4 ${divider}`}>
          <p>{t("dataSourcesDisclaimer")}</p>
          <p className="mt-1">
            <a href={`/${locale}/methodology`} className="underline hover:text-blue-500">{t("navMethodology")}</a>
            {" · "}<a href="https://github.com/qing4132/whichcity/issues" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-500">GitHub</a>
            {" · "}<a href="mailto:qing4132@users.noreply.github.com" className="underline hover:text-blue-500">{t("footerFeedback")}</a>
          </p>
        </div>
      </footer>
    </div>
  );
}
