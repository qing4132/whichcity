"use client";

import { useState, useEffect, useCallback } from "react";
import type { City, Locale, ExchangeRates, CostTier, IncomeMode } from "@/lib/types";
import { TRANSLATIONS, LANGUAGE_LABELS, PROFESSION_TRANSLATIONS, COUNTRY_TRANSLATIONS, CITY_NAME_TRANSLATIONS } from "@/lib/i18n";
import { POPULAR_CURRENCIES, CITY_FLAG_EMOJIS } from "@/lib/constants";
import { CITY_SLUGS } from "@/lib/citySlug";
import { computeLifePressure } from "@/lib/clientUtils";
import { computeNetIncome, computeAllNetIncomes } from "@/lib/taxUtils";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Tab = "savings" | "ppp" | "housing" | "air" | "flights" | "safety" | "workhours" | "rent" | "vacation" | "internet" | "lifePressure" | "healthcare" | "freedom";

interface RankingContentProps {
  cities: City[];
}

export default function RankingContent({ cities }: RankingContentProps) {
  const router = useRouter();
  const [locale, setLocale] = useState<Locale>("en");
  const [darkMode, setDarkMode] = useState(false);
  const [selectedProfession, setSelectedProfession] = useState("");
  const [selectedCurrency, setSelectedCurrency] = useState("USD");
  const [costTier, setCostTier] = useState<CostTier>("moderate");
  const [incomeMode, setIncomeMode] = useState<IncomeMode>("net");
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates | null>(null);
  const [tab, setTab] = useState<Tab>("savings");

  const professions = cities[0]?.professions ? Object.keys(cities[0].professions) : [];

  useEffect(() => {
    const savedLocale = localStorage.getItem("locale");
    if (savedLocale && ["zh", "en", "ja", "es"].includes(savedLocale)) setLocale(savedLocale as Locale);
    const savedDark = localStorage.getItem("darkMode") === "true";
    setDarkMode(savedDark);
    const savedCur = localStorage.getItem("selectedCurrency");
    if (savedCur) setSelectedCurrency(savedCur);
    const savedProf = localStorage.getItem("selectedProfession");
    if (savedProf && professions.includes(savedProf)) setSelectedProfession(savedProf);
    else if (professions.length) setSelectedProfession(professions[0]);
    const savedTier = localStorage.getItem("costTier");
    if (savedTier && ["moderate", "budget"].includes(savedTier)) setCostTier(savedTier as CostTier);
    else setCostTier("moderate");
    const savedIM = localStorage.getItem("incomeMode");
    if (savedIM && ["gross", "net", "expatNet"].includes(savedIM)) setIncomeMode(savedIM as IncomeMode);
    fetch("/data/exchange-rates.json").then(r => r.json()).then(setExchangeRates).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [professions.length]);

  const t = useCallback((key: string, params?: Record<string, string | number>) => {
    const template = TRANSLATIONS[locale]?.[key] || TRANSLATIONS.zh[key] || key;
    if (!params) return template;
    return Object.entries(params).reduce((acc, [k, v]) => acc.replaceAll(`{${k}}`, String(v)), template);
  }, [locale]);

  const getCityLabel = (city: City) => CITY_NAME_TRANSLATIONS[city.id]?.[locale] || city.name;
  const getCountryLabel = (c: string) => COUNTRY_TRANSLATIONS[c]?.[locale] || c;
  const getProfessionLabel = (p: string) => PROFESSION_TRANSLATIONS[p]?.[locale] || p;
  const getAqiColor = (aqi: number | null) => {
    if (aqi === null) return darkMode ? "text-slate-500" : "text-slate-400";
    if (aqi <= 50) return darkMode ? "text-emerald-400" : "text-emerald-600";
    if (aqi <= 100) return darkMode ? "text-amber-400" : "text-amber-600";
    return darkMode ? "text-red-400" : "text-red-500";
  };

  const convertAmount = (amount: number) => {
    if (!exchangeRates) return amount;
    return Math.round(amount * (exchangeRates.rates[selectedCurrency] || 1));
  };

  const formatCurrency = (amount: number) => {
    if (!exchangeRates) return `$${Math.round(amount).toLocaleString()}`;
    const symbol = exchangeRates.symbols[selectedCurrency] || selectedCurrency;
    return `${symbol}${convertAmount(amount).toLocaleString()}`;
  };

  // Compute rankings
  const ranked = cities.map(city => {
    const grossIncome = selectedProfession && city.professions[selectedProfession] != null ? city.professions[selectedProfession] : null;
    const income = grossIncome !== null ? computeNetIncome(grossIncome, city.country, city.id, incomeMode).netUSD : 0;
    const costKey = `cost${costTier.charAt(0).toUpperCase()}${costTier.slice(1)}` as keyof City;
    const costTierField = `cost${costTier.charAt(0).toUpperCase()}${costTier.slice(1)}` as keyof City;
    const annualCost = (city[costKey] as number) * 12;
    const savings = income - annualCost;
    const savingsRate = income > 0 ? savings / income : 0;
    const yearsToHome = city.housePrice !== null && savings > 0 ? (city.housePrice * 70) / savings : Infinity;
    const ppp = annualCost > 0 ? income / annualCost : 0;
    return { city, income, annualCost, savings, savingsRate, yearsToHome, ppp, costTierField };
  });

  // Pre-compute all incomes for index calculations
  const allIncomes = ranked.map(r => r.income);
  const costTierField = `cost${costTier.charAt(0).toUpperCase()}${costTier.slice(1)}` as keyof City;

  // Pre-compute indices for all cities
  const indexCache = ranked.map((r, i) => {
    const lp = computeLifePressure(r.city, cities, r.income, allIncomes, costTierField);
    return {
      lifePressure: lp.value,
      lifePressureConf: lp.confidence,
      healthcare: r.city.healthcareIndex,
      healthcareConf: r.city.healthcareConfidence,
      freedom: r.city.freedomIndex,
      freedomConf: r.city.freedomConfidence,
    };
  });

  const nullLast = (aV: number | null, bV: number | null, lower: boolean): number => {
    if (aV === null && bV === null) return 0;
    if (aV === null) return 1;
    if (bV === null) return -1;
    return lower ? aV - bV : bV - aV;
  };

  const sorted = [...ranked.map((r, i) => ({ ...r, idx: i }))].sort((a, b) => {
    if (tab === "savings") return b.savings - a.savings;
    if (tab === "ppp") return b.ppp - a.ppp;
    if (tab === "air") return nullLast(a.city.airQuality, b.city.airQuality, true);
    if (tab === "flights") return nullLast(a.city.directFlightCities, b.city.directFlightCities, false);
    if (tab === "safety") return b.city.safetyIndex - a.city.safetyIndex;
    if (tab === "workhours") return nullLast(a.city.annualWorkHours, b.city.annualWorkHours, true);
    if (tab === "rent") return nullLast(a.city.monthlyRent, b.city.monthlyRent, true);
    if (tab === "vacation") return nullLast(a.city.paidLeaveDays, b.city.paidLeaveDays, false);
    if (tab === "internet") return nullLast(a.city.internetSpeedMbps, b.city.internetSpeedMbps, false);
    if (tab === "lifePressure") return indexCache[a.idx].lifePressure - indexCache[b.idx].lifePressure;
    if (tab === "healthcare") return indexCache[b.idx].healthcare - indexCache[a.idx].healthcare;
    if (tab === "freedom") return indexCache[b.idx].freedom - indexCache[a.idx].freedom;
    // housing
    const aY = isFinite(a.yearsToHome) ? a.yearsToHome : 999999;
    const bY = isFinite(b.yearsToHome) ? b.yearsToHome : 999999;
    return aY - bY;
  });

  const tabs: { key: Tab; label: string }[] = [
    { key: "savings", label: t("rankTab_savings") },
    { key: "ppp", label: t("rankTab_ppp") },
    { key: "housing", label: t("rankTab_housing") },
    { key: "rent", label: t("rankTab_rent") },
    { key: "air", label: t("rankTab_air") },
    { key: "flights", label: t("rankTab_flights") },
    { key: "safety", label: t("rankTab_safety") },
    { key: "workhours", label: t("rankTab_workhours") },
    { key: "vacation", label: t("rankTab_vacation") },
    { key: "internet", label: t("rankTab_internet") },
    { key: "lifePressure", label: t("rankTab_lifePressure") },
    { key: "healthcare", label: t("rankTab_healthcare") },
    { key: "freedom", label: t("rankTab_freedom") },
  ];

  const headerCls = `sticky top-0 z-10 ${darkMode ? "bg-slate-800" : "bg-slate-100"}`;
  const thCls = `px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide ${darkMode ? "text-slate-400" : "text-slate-500"}`;
  const tdCls = `px-3 py-2.5 text-sm ${darkMode ? "text-slate-300" : "text-slate-600"}`;

  return (
    <div className={`min-h-screen transition-colors ${darkMode ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"}`}>

        {/* Top bar */}
        <div className={`sticky top-0 z-50 border-b px-4 py-2.5 ${darkMode ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"}`}>
          <div className="max-w-6xl mx-auto px-4 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Link href="/"
                className={`text-xs px-2 py-1 rounded border font-semibold transition ${darkMode ? "bg-slate-800 border-slate-600 text-blue-300 hover:bg-slate-700" : "bg-white border-slate-300 text-blue-700 hover:bg-blue-50"}`}>
                {t("navHome")}
              </Link>
              <Link href="/ranking"
                className={`text-xs px-2 py-1 rounded border transition ${darkMode ? "bg-slate-800 border-slate-600 text-amber-300 hover:bg-slate-700" : "bg-white border-slate-300 text-amber-700 hover:bg-amber-50"}`}>
                {t("navRanking")}
              </Link>
              <button onClick={() => { const slugs = Object.values(CITY_SLUGS); router.push(`/city/${slugs[Math.floor(Math.random() * slugs.length)]}`); }}
                className={`text-xs px-2 py-1 rounded border transition ${darkMode ? "bg-slate-800 border-slate-600 text-emerald-300 hover:bg-slate-700" : "bg-white border-slate-300 text-emerald-700 hover:bg-emerald-50"}`}>
                {t("navRandomCity")}
              </button>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <select value={selectedProfession} onChange={e => { setSelectedProfession(e.target.value); localStorage.setItem("selectedProfession", e.target.value); }}
                className={`text-xs rounded px-1.5 py-1 border ${darkMode ? "bg-slate-800 border-slate-600 text-slate-200" : "bg-white border-slate-300 text-slate-700"}`}>
                {professions.map(p => <option key={p} value={p}>{getProfessionLabel(p)}</option>)}
              </select>
              <select value={costTier} onChange={e => { const v = e.target.value as CostTier; setCostTier(v); localStorage.setItem("costTier", v); }}
                className={`text-xs rounded px-1.5 py-1 border ${darkMode ? "bg-slate-800 border-slate-600 text-slate-200" : "bg-white border-slate-300 text-slate-700"}`}>
                {(["moderate", "budget"] as const).map(tier => (
                  <option key={tier} value={tier}>{t(`costTier${tier.charAt(0).toUpperCase()}${tier.slice(1)}`)}</option>
                ))}
              </select>
              <select value={incomeMode} onChange={e => { const v = e.target.value as IncomeMode; setIncomeMode(v); localStorage.setItem("incomeMode", v); }}
                className={`text-xs rounded px-1.5 py-1 border ${darkMode ? "bg-slate-800 border-slate-600 text-slate-200" : "bg-white border-slate-300 text-slate-700"}`}>
                <option value="gross">{t("incomeModeGross")}</option>
                <option value="net">{t("incomeModeNet")}</option>
                <option value="expatNet">{t("incomeModeExpatNet")}</option>
              </select>
              <select value={locale} onChange={e => { setLocale(e.target.value as Locale); localStorage.setItem("locale", e.target.value); }}
                className={`text-xs rounded px-1.5 py-1 border ${darkMode ? "bg-slate-800 border-slate-600 text-slate-200" : "bg-white border-slate-300 text-slate-700"}`}>
                {(Object.keys(LANGUAGE_LABELS) as Locale[]).map(lang => <option key={lang} value={lang}>{LANGUAGE_LABELS[lang]}</option>)}
              </select>
              <select value={selectedCurrency} onChange={e => { setSelectedCurrency(e.target.value); localStorage.setItem("selectedCurrency", e.target.value); }}
                className={`text-xs rounded px-1.5 py-1 border ${darkMode ? "bg-slate-800 border-slate-600 text-slate-200" : "bg-white border-slate-300 text-slate-700"}`}>
                {POPULAR_CURRENCIES.map(cur => <option key={cur} value={cur}>{cur}</option>)}
              </select>
              <button onClick={() => { setDarkMode(!darkMode); localStorage.setItem("darkMode", JSON.stringify(!darkMode)); }}
                className={`text-xs px-2 py-1 rounded border ${darkMode ? "bg-slate-800 border-slate-600 text-yellow-300" : "bg-white border-slate-300 text-slate-600"}`}>
                {darkMode ? "☀️" : "🌙"}
              </button>
            </div>
          </div>
        </div>
      <div className="max-w-6xl mx-auto px-4 py-4 sm:py-8">

        {/* Header */}
        <div className="text-center mb-6">
          <h1 className={`text-3xl sm:text-4xl font-extrabold tracking-tight mb-2 ${darkMode ? "text-white" : "text-slate-900"}`}>
            {t("rankingTitle")}
          </h1>
          <p className={`text-base max-w-xl mx-auto ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
            {t("rankingSubtitle")}
          </p>
        </div>

        {/* Tab selector */}
        <div className="grid grid-cols-4 sm:grid-cols-7 lg:grid-cols-13 gap-1.5 mb-4">
          {tabs.map(({ key, label }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`px-2 py-2 rounded-lg font-medium text-sm transition text-center ${
                tab === key
                  ? "bg-blue-600 text-white"
                  : darkMode ? "bg-gray-700 text-gray-300 hover:bg-gray-600" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}>
              {label}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className={`rounded-xl shadow-md overflow-hidden ${darkMode ? "bg-gray-800 border border-gray-700" : "bg-white border border-gray-100"}`}>
          <div className="overflow-x-auto">
            <table className="w-full table-fixed">
              <thead>
                <tr className={headerCls}>
                  <th className={`${thCls} w-[8%]`}>{t("rankCol_rank")}</th>
                  <th className={`${thCls} w-[22%]`}>{t("rankCol_city")}</th>
                  <th className={`${thCls} w-[15%] hidden sm:table-cell`}>{t("rankCol_country")}</th>
                  {tab === "air" ? (
                    <th className={`${thCls} w-[55%] sm:w-[55%]`}>{t("rankCol_aqi")}</th>
                  ) : tab === "flights" ? (
                    <th className={`${thCls} w-[55%] sm:w-[55%]`}>{t("directFlights")}</th>
                  ) : tab === "safety" ? (
                    <th className={`${thCls} w-[55%] sm:w-[55%]`}>{t("safetyIndex")}</th>
                  ) : tab === "workhours" ? (
                    <th className={`${thCls} w-[55%] sm:w-[55%]`}>{t("annualWorkHours")}</th>
                  ) : tab === "rent" ? (
                    <th className={`${thCls} w-[55%] sm:w-[55%]`}>{t("monthlyRent")}</th>
                  ) : tab === "vacation" ? (
                    <th className={`${thCls} w-[55%] sm:w-[55%]`}>{t("paidLeaveDays")}</th>
                  ) : tab === "internet" ? (
                    <th className={`${thCls} w-[55%] sm:w-[55%]`}>{t("internetSpeed")}</th>
                  ) : tab === "lifePressure" ? (
                    <th className={`${thCls} w-[55%] sm:w-[55%]`}>{t("lifePressureIndex")}</th>
                  ) : tab === "healthcare" ? (
                    <th className={`${thCls} w-[55%] sm:w-[55%]`}>{t("healthcareIndex")}</th>
                  ) : tab === "freedom" ? (
                    <th className={`${thCls} w-[55%] sm:w-[55%]`}>{t("institutionalFreedom")}</th>
                  ) : (
                    <>
                      <th className={thCls}>{t("rankCol_income")}</th>
                      {tab === "savings" && <th className={thCls}>{t("rankCol_expense")}</th>}
                      <th className={thCls}>
                        {tab === "ppp" ? t("rankCol_ppp") : tab === "housing" ? t("rankCol_homeYears") : t("rankCol_savings")}
                      </th>
                      <th className={thCls}>{t("rankCol_savingsRate")}</th>
                      {tab === "housing" && <th className={thCls}>{t("housePrice")}</th>}
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {sorted.map((item, idx) => {
                  const slug = CITY_SLUGS[item.city.id];
                  const isTop3 = idx < 3;
                  const rankBadge = isTop3 ? ["🥇", "🥈", "🥉"][idx] : `${idx + 1}`;
                  return (
                    <tr key={item.city.id}
                      className={`${idx < sorted.length - 1 ? (darkMode ? "border-b border-slate-700/50" : "border-b border-slate-100") : ""} ${
                        isTop3 ? (darkMode ? "bg-blue-900/10" : "bg-blue-50/50") : ""
                      } hover:${darkMode ? "bg-slate-700/30" : "bg-slate-50"} transition`}>
                      <td className={`${tdCls} font-bold text-center`}>{rankBadge}</td>
                      <td className={tdCls}>
                        <span className="mr-1.5">{CITY_FLAG_EMOJIS[item.city.id] || "🏙️"}</span>
                        {slug ? (
                          <Link href={`/city/${slug}`} className={`font-semibold hover:underline ${darkMode ? "text-blue-400" : "text-blue-600"}`}>
                            {getCityLabel(item.city)}
                          </Link>
                        ) : (
                          <span className="font-semibold">{getCityLabel(item.city)}</span>
                        )}
                      </td>
                      <td className={`${tdCls} hidden sm:table-cell`}>{getCountryLabel(item.city.country)}</td>
                      {tab === "air" ? (
                        <td className={tdCls}>
                          <span className={`font-bold ${getAqiColor(item.city.airQuality)}`}>
                            {item.city.airQuality !== null ? `${item.city.country === "中国" ? "AQI (CN)" : "AQI"} ${item.city.airQuality}` : "—"}
                          </span>
                        </td>
                      ) : tab === "flights" ? (
                        <td className={tdCls}>
                          {item.city.directFlightCities !== null ? (
                          <span className={`font-bold ${item.city.directFlightCities >= 150 ? (darkMode ? "text-emerald-400" : "text-emerald-600") : item.city.directFlightCities >= 50 ? (darkMode ? "text-amber-400" : "text-amber-600") : (darkMode ? "text-red-400" : "text-red-500")}`}>
                            {item.city.directFlightCities} {t("directFlightsUnit")}
                          </span>
                          ) : <span className={darkMode ? "text-slate-500" : "text-slate-400"}>—</span>}
                        </td>
                      ) : tab === "safety" ? (
                        <td className={tdCls}>
                          <span className={`font-bold ${item.city.safetyIndex >= 70 ? (darkMode ? "text-emerald-400" : "text-emerald-600") : item.city.safetyIndex >= 40 ? (darkMode ? "text-amber-400" : "text-amber-600") : (darkMode ? "text-red-400" : "text-red-500")}`}>
                            {item.city.safetyIndex.toFixed(1)}
                            {item.city.safetyConfidence === "low" && " *"}
                          </span>
                        </td>
                      ) : tab === "workhours" ? (
                        <td className={tdCls}>
                          {item.city.annualWorkHours !== null ? (
                          <span className={`font-bold ${item.city.annualWorkHours <= 1600 ? (darkMode ? "text-emerald-400" : "text-emerald-600") : item.city.annualWorkHours <= 1900 ? (darkMode ? "text-amber-400" : "text-amber-600") : (darkMode ? "text-red-400" : "text-red-500")}`}>
                            {item.city.annualWorkHours} {t("workHoursUnit")}
                          </span>
                          ) : <span className={darkMode ? "text-slate-500" : "text-slate-400"}>—</span>}
                        </td>
                      ) : tab === "rent" ? (
                        <td className={tdCls}>
                          {item.city.monthlyRent !== null ? (
                          <span className={`font-bold ${item.city.monthlyRent <= 500 ? (darkMode ? "text-emerald-400" : "text-emerald-600") : item.city.monthlyRent <= 1500 ? (darkMode ? "text-amber-400" : "text-amber-600") : (darkMode ? "text-red-400" : "text-red-500")}`}>
                            {formatCurrency(item.city.monthlyRent)}
                          </span>
                          ) : <span className={darkMode ? "text-slate-500" : "text-slate-400"}>—</span>}
                        </td>
                      ) : tab === "vacation" ? (
                        <td className={tdCls}>
                          {item.city.paidLeaveDays !== null ? (
                          <span className={`font-bold ${item.city.paidLeaveDays >= 20 ? (darkMode ? "text-emerald-400" : "text-emerald-600") : item.city.paidLeaveDays >= 10 ? (darkMode ? "text-amber-400" : "text-amber-600") : (darkMode ? "text-red-400" : "text-red-500")}`}>
                            {item.city.paidLeaveDays} {t("paidLeaveDaysUnit")}
                          </span>
                          ) : <span className={darkMode ? "text-slate-500" : "text-slate-400"}>—</span>}
                        </td>
                      ) : tab === "internet" ? (
                        <td className={tdCls}>
                          {item.city.internetSpeedMbps !== null ? (
                          <span className={`font-bold ${item.city.internetSpeedMbps >= 150 ? (darkMode ? "text-emerald-400" : "text-emerald-600") : item.city.internetSpeedMbps >= 50 ? (darkMode ? "text-amber-400" : "text-amber-600") : (darkMode ? "text-red-400" : "text-red-500")}`}>
                            {item.city.internetSpeedMbps} Mbps
                          </span>
                          ) : <span className={darkMode ? "text-slate-500" : "text-slate-400"}>—</span>}
                        </td>
                      ) : tab === "lifePressure" ? (
                        <td className={tdCls}>
                          <span className={`font-bold ${indexCache[item.idx].lifePressure <= 35 ? (darkMode ? "text-emerald-400" : "text-emerald-600") : indexCache[item.idx].lifePressure <= 65 ? (darkMode ? "text-amber-400" : "text-amber-600") : (darkMode ? "text-red-400" : "text-red-500")}`}>
                            {indexCache[item.idx].lifePressure.toFixed(1)}
                            {indexCache[item.idx].lifePressureConf === "low" && " *"}
                          </span>
                        </td>
                      ) : tab === "healthcare" ? (
                        <td className={tdCls}>
                          <span className={`font-bold ${indexCache[item.idx].healthcare >= 65 ? (darkMode ? "text-emerald-400" : "text-emerald-600") : indexCache[item.idx].healthcare >= 35 ? (darkMode ? "text-amber-400" : "text-amber-600") : (darkMode ? "text-red-400" : "text-red-500")}`}>
                            {indexCache[item.idx].healthcare.toFixed(1)}
                            {indexCache[item.idx].healthcareConf === "low" && " *"}
                          </span>
                        </td>
                      ) : tab === "freedom" ? (
                        <td className={tdCls}>
                          <span className={`font-bold ${indexCache[item.idx].freedom >= 65 ? (darkMode ? "text-emerald-400" : "text-emerald-600") : indexCache[item.idx].freedom >= 35 ? (darkMode ? "text-amber-400" : "text-amber-600") : (darkMode ? "text-red-400" : "text-red-500")}`}>
                            {indexCache[item.idx].freedom.toFixed(1)}
                            {indexCache[item.idx].freedomConf === "low" && " *"}
                          </span>
                        </td>
                      ) : (
                        <>
                          <td className={tdCls}>{formatCurrency(item.income)}</td>
                          {tab === "savings" && <td className={tdCls}>{formatCurrency(item.annualCost)}</td>}
                          <td className={tdCls}>
                            {tab === "ppp" ? (
                              <span className={`font-bold ${item.ppp >= 1.5 ? (darkMode ? "text-emerald-400" : "text-emerald-600") : item.ppp >= 1 ? (darkMode ? "text-amber-400" : "text-amber-600") : (darkMode ? "text-red-400" : "text-red-500")}`}>
                                {item.ppp > 0 ? item.ppp.toFixed(2) + "x" : "—"}
                              </span>
                            ) : tab === "housing" ? (
                              <span className={`font-bold ${
                                isFinite(item.yearsToHome) && item.yearsToHome <= 15
                                  ? (darkMode ? "text-emerald-400" : "text-emerald-600")
                                  : isFinite(item.yearsToHome)
                                    ? (darkMode ? "text-amber-400" : "text-amber-600")
                                    : (darkMode ? "text-red-400" : "text-red-500")
                              }`}>
                                {isFinite(item.yearsToHome) ? `${item.yearsToHome.toFixed(1)} ${t("insightYears")}` : t("rankNoSavings")}
                              </span>
                            ) : (
                              <span className={`font-bold ${item.savings > 0 ? (darkMode ? "text-emerald-400" : "text-emerald-600") : (darkMode ? "text-red-400" : "text-red-500")}`}>
                                {formatCurrency(item.savings)}
                              </span>
                            )}
                          </td>
                          <td className={tdCls}>
                            <span className={item.savingsRate > 0 ? (darkMode ? "text-emerald-400" : "text-emerald-600") : (darkMode ? "text-red-400" : "text-red-500")}>
                              {item.income > 0 ? `${Math.round(item.savingsRate * 100)}%` : "—"}
                            </span>
                          </td>
                          {tab === "housing" && (
                            <td className={tdCls}>
                              {item.city.housePrice !== null ? `${formatCurrency(item.city.housePrice)}${t("housePriceUnit")}` : "—"}
                            </td>
                          )}
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
