"use client";

import { useState, useEffect, useCallback } from "react";
import type { City, Locale, ExchangeRates, CostTier } from "@/lib/types";
import { TRANSLATIONS, LANGUAGE_LABELS, PROFESSION_TRANSLATIONS, COUNTRY_TRANSLATIONS, CITY_NAME_TRANSLATIONS } from "@/lib/i18n";
import { POPULAR_CURRENCIES, CITY_FLAG_EMOJIS } from "@/lib/constants";
import { CITY_SLUGS } from "@/lib/citySlug";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Tab = "savings" | "ppp" | "housing" | "air" | "flights";

interface RankingContentProps {
  cities: City[];
}

export default function RankingContent({ cities }: RankingContentProps) {
  const router = useRouter();
  const [locale, setLocale] = useState<Locale>("zh");
  const [darkMode, setDarkMode] = useState(false);
  const [selectedProfession, setSelectedProfession] = useState("");
  const [selectedCurrency, setSelectedCurrency] = useState("USD");
  const [costTier, setCostTier] = useState<CostTier>("moderate");
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
    if (savedTier && ["comfort", "moderate", "budget", "minimal"].includes(savedTier)) setCostTier(savedTier as CostTier);
    fetch("/data/exchange-rates.json").then(r => r.json()).then(setExchangeRates).catch(() => {});
  }, []);

  const t = useCallback((key: string, params?: Record<string, string | number>) => {
    const template = TRANSLATIONS[locale]?.[key] || TRANSLATIONS.zh[key] || key;
    if (!params) return template;
    return Object.entries(params).reduce((acc, [k, v]) => acc.replaceAll(`{${k}}`, String(v)), template);
  }, [locale]);

  const getCityLabel = (city: City) => CITY_NAME_TRANSLATIONS[city.id]?.[locale] || city.name;
  const getCountryLabel = (c: string) => COUNTRY_TRANSLATIONS[c]?.[locale] || c;
  const getProfessionLabel = (p: string) => PROFESSION_TRANSLATIONS[p]?.[locale] || p;
  const getAqiLevel = (aqi: number) => {
    if (aqi <= 50) return { key: "aqiGood", color: "text-green-500" };
    if (aqi <= 100) return { key: "aqiModerate", color: "text-yellow-500" };
    if (aqi <= 150) return { key: "aqiUSG", color: "text-orange-500" };
    if (aqi <= 200) return { key: "aqiUnhealthy", color: "text-red-500" };
    if (aqi <= 300) return { key: "aqiVeryUnhealthy", color: "text-purple-500" };
    return { key: "aqiHazardous", color: "text-rose-600" };
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
    const income = selectedProfession ? city.professions[selectedProfession] || 0 : city.averageIncome;
    const costKey = `cost${costTier.charAt(0).toUpperCase()}${costTier.slice(1)}` as keyof City;
    const annualCost = (city[costKey] as number) * 12;
    const savings = income - annualCost;
    const savingsRate = income > 0 ? savings / income : 0;
    const yearsToHome = savings > 0 ? (city.housePrice * 70) / savings : Infinity;
    const ppp = annualCost > 0 ? income / annualCost : 0;
    return { city, income, annualCost, savings, savingsRate, yearsToHome, ppp };
  });

  const sorted = [...ranked].sort((a, b) => {
    if (tab === "savings") return b.savings - a.savings;
    if (tab === "ppp") return b.ppp - a.ppp;
    if (tab === "air") return a.city.airQuality - b.city.airQuality; // lower AQI = better
    if (tab === "flights") return b.city.directFlightCities - a.city.directFlightCities;
    // housing: ascending years
    const aY = isFinite(a.yearsToHome) ? a.yearsToHome : 999999;
    const bY = isFinite(b.yearsToHome) ? b.yearsToHome : 999999;
    return aY - bY;
  });

  const tabs: { key: Tab; label: string }[] = [
    { key: "savings", label: t("rankTab_savings") },
    { key: "ppp", label: t("rankTab_ppp") },
    { key: "housing", label: t("rankTab_housing") },
    { key: "air", label: t("rankTab_air") },
    { key: "flights", label: t("rankTab_flights") },
  ];

  const headerCls = `sticky top-0 z-10 ${darkMode ? "bg-slate-800" : "bg-slate-100"}`;
  const thCls = `px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide ${darkMode ? "text-slate-400" : "text-slate-500"}`;
  const tdCls = `px-3 py-2.5 text-sm ${darkMode ? "text-slate-300" : "text-slate-600"}`;

  return (
    <div className={`min-h-screen py-4 sm:py-8 px-3 sm:px-4 transition-colors ${darkMode ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"}`}>
      <div className="max-w-6xl mx-auto">

        {/* Top bar */}
        <div className={`sticky top-0 z-50 border-b px-4 py-2.5 -mx-3 sm:-mx-4 -mt-4 sm:-mt-8 mb-6 ${darkMode ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"}`}>
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-2 flex-wrap">
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
                {(["comfort", "moderate", "budget", "minimal"] as const).map(tier => (
                  <option key={tier} value={tier}>{t(`costTier${tier.charAt(0).toUpperCase()}${tier.slice(1)}`)}</option>
                ))}
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
        <div className="flex gap-1.5 flex-wrap mb-4">
          {tabs.map(({ key, label }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`px-3 py-2 rounded-lg font-medium text-sm transition ${
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
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className={headerCls}>
                  <th className={`${thCls} w-10`}>{t("rankCol_rank")}</th>
                  <th className={thCls}>{t("rankCol_city")}</th>
                  <th className={`${thCls} hidden sm:table-cell`}>{t("rankCol_country")}</th>
                  {tab === "air" ? (
                    <th className={thCls}>{t("rankCol_aqi")}</th>
                  ) : tab === "flights" ? (
                    <th className={thCls}>{t("directFlights")}</th>
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
                          <span className={`font-bold ${getAqiLevel(item.city.airQuality).color}`}>
                            AQI {item.city.airQuality} · {t(getAqiLevel(item.city.airQuality).key)}
                          </span>
                        </td>
                      ) : tab === "flights" ? (
                        <td className={tdCls}>
                          <span className={`font-bold ${item.city.directFlightCities >= 150 ? (darkMode ? "text-emerald-400" : "text-emerald-600") : item.city.directFlightCities >= 50 ? (darkMode ? "text-amber-400" : "text-amber-600") : (darkMode ? "text-slate-400" : "text-slate-500")}`}>
                            {item.city.directFlightCities} {t("directFlightsUnit")}
                          </span>
                        </td>
                      ) : (
                        <>
                          <td className={tdCls}>{formatCurrency(item.income)}</td>
                          {tab === "savings" && <td className={tdCls}>{formatCurrency(item.annualCost)}</td>}
                          <td className={tdCls}>
                            {tab === "ppp" ? (
                              <span className={`font-bold ${item.ppp >= 1.5 ? (darkMode ? "text-green-400" : "text-green-600") : item.ppp >= 1 ? (darkMode ? "text-amber-400" : "text-amber-600") : (darkMode ? "text-red-400" : "text-red-500")}`}>
                                {item.ppp > 0 ? item.ppp.toFixed(2) + "x" : "—"}
                              </span>
                            ) : tab === "housing" ? (
                              <span className={`font-bold ${
                                isFinite(item.yearsToHome) && item.yearsToHome <= 15
                                  ? (darkMode ? "text-green-400" : "text-green-600")
                                  : isFinite(item.yearsToHome)
                                    ? (darkMode ? "text-amber-400" : "text-amber-600")
                                    : (darkMode ? "text-red-400" : "text-red-500")
                              }`}>
                                {isFinite(item.yearsToHome) ? `${item.yearsToHome.toFixed(1)} ${t("insightYears")}` : t("rankNoSavings")}
                              </span>
                            ) : (
                              <span className={`font-bold ${item.savings > 0 ? (darkMode ? "text-green-400" : "text-green-600") : (darkMode ? "text-red-400" : "text-red-500")}`}>
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
                              {formatCurrency(item.city.housePrice)}{t("housePriceUnit")}
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
