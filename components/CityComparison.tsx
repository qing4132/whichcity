"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { City, CostTier, Locale, ClimateInfo, ExchangeRates } from "@/lib/types";
import { TRANSLATIONS, LANGUAGE_LABELS, CONTINENT_TRANSLATIONS, PROFESSION_TRANSLATIONS, COUNTRY_TRANSLATIONS, CITY_NAME_TRANSLATIONS } from "@/lib/i18n";
import { POPULAR_CURRENCIES, CITY_CLIMATE, CITY_FLAG_EMOJIS, REGIONS, REGION_LABELS } from "@/lib/constants";
import { CompareCtx, type CompareContextValue } from "@/lib/CompareContext";
import { readUrlParams, writeUrlParams } from "@/hooks/useUrlState";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CITY_SLUGS } from "@/lib/citySlug";
import ChartSection from "./ChartSection";
import CityCard from "./CityCard";
import KeyInsights from "./KeyInsights";
import ShareCard from "./ShareCard";
import DataSources from "./DataSources";

export default function CityComparison() {
  const [cities, setCities] = useState<City[]>([]);
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [selectedProfession, setSelectedProfession] = useState<string>("");
  const [comparisonData, setComparisonData] = useState<City[] | null>(null);
  const [baseCityId, setBaseCityId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [costTier, setCostTier] = useState<CostTier>("moderate");
  const [searchTerm, setSearchTerm] = useState("");
  const [windowWidth, setWindowWidth] = useState(1200);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<string>("USD");
  const [darkMode, setDarkMode] = useState(false);
  const [locale, setLocale] = useState<Locale>("zh");
  const [shareToast, setShareToast] = useState(false);
  const comparisonRef = useRef<HTMLDivElement>(null);
  const urlInitRef = useRef(false);

  const router = useRouter();
  const maxComparisons = windowWidth < 768 ? 2 : windowWidth < 1024 ? 3 : 5;

  // ── Init: read URL params (priority) → localStorage → defaults ──
  useEffect(() => {
    const url = readUrlParams();

    const savedCurrency = url.cur || localStorage.getItem("selectedCurrency");
    if (savedCurrency) setSelectedCurrency(savedCurrency);

    const savedDarkMode = url.dark !== undefined ? url.dark === "1" : localStorage.getItem("darkMode") === "true";
    setDarkMode(savedDarkMode);

    const savedLocale = url.lang || localStorage.getItem("locale");
    if (savedLocale && ["zh", "en", "ja", "es"].includes(savedLocale)) setLocale(savedLocale as Locale);

    const savedTier = url.tier || localStorage.getItem("costTier");
    if (savedTier && ["moderate", "budget"].includes(savedTier)) setCostTier(savedTier as CostTier);
    else setCostTier("moderate");

    const fetchData = async () => {
      try {
        const [citiesRes, ratesRes] = await Promise.all([
          fetch("/data/cities.json"),
          fetch("/data/exchange-rates.json"),
        ]);
        const citiesData = await citiesRes.json();
        const ratesData = await ratesRes.json();

        setCities(citiesData.cities);
        setExchangeRates(ratesData);

        const profs = citiesData.cities[0]?.professions ? Object.keys(citiesData.cities[0].professions) : [];
        const savedProf = url.prof || localStorage.getItem("selectedProfession");
        const initProf = savedProf && profs.includes(savedProf) ? savedProf : profs[0] || "";
        setSelectedProfession(initProf);

        // Restore city selection from URL → localStorage → defaults
        let restoredIds: string[] | null = null;
        if (url.cities) {
          const ids = url.cities.split(",").filter(Boolean);
          const valid = ids.filter(id => citiesData.cities.some((c: City) => c.id.toString() === id));
          if (valid.length >= 2) restoredIds = valid;
        }
        if (!restoredIds) {
          const saved = localStorage.getItem("selectedCities");
          if (saved) {
            try {
              const ids = JSON.parse(saved) as string[];
              const valid = ids.filter(id => citiesData.cities.some((c: City) => c.id.toString() === id));
              if (valid.length >= 2) restoredIds = valid;
            } catch { /* ignore */ }
          }
        }
        if (!restoredIds) {
          restoredIds = ["1", "3", "4"];
        }
        const selected = restoredIds
          .map(id => citiesData.cities.find((c: City) => c.id.toString() === id))
          .filter(Boolean) as City[];
        if (selected.length >= 2) {
          setSelectedCities(restoredIds);
          setComparisonData(selected);
          setBaseCityId(url.base && restoredIds.includes(url.base) ? url.base : selected[0]?.id.toString() || "");
        }

        setLoading(false);
        urlInitRef.current = true;
      } catch (error) {
        console.error("Failed to fetch data:", error);
        setLoading(false);
      }
    };

    fetchData();

    const handleResize = () => setWindowWidth(window.innerWidth);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ── Sync state → URL ──
  useEffect(() => {
    if (!urlInitRef.current) return;
    writeUrlParams({
      cities: selectedCities.length ? selectedCities.join(",") : undefined,
      prof: selectedProfession || undefined,
      tier: costTier !== "moderate" ? costTier : undefined,
      lang: locale !== "zh" ? locale : undefined,
      cur: selectedCurrency !== "USD" ? selectedCurrency : undefined,
      dark: darkMode ? "1" : undefined,
      base: baseCityId || undefined,
    });
  }, [selectedCities, selectedProfession, costTier, locale, selectedCurrency, darkMode, baseCityId]);

  // ── Persist to localStorage ──
  useEffect(() => { localStorage.setItem("darkMode", JSON.stringify(darkMode)); }, [darkMode]);
  useEffect(() => { localStorage.setItem("locale", locale); }, [locale]);
  useEffect(() => { if (selectedCities.length >= 2) localStorage.setItem("selectedCities", JSON.stringify(selectedCities)); }, [selectedCities]);
  useEffect(() => { if (selectedProfession) localStorage.setItem("selectedProfession", selectedProfession); }, [selectedProfession]);
  useEffect(() => { localStorage.setItem("costTier", costTier); }, [costTier]);

  // ── i18n helpers ──
  const t = useCallback((key: string, params?: Record<string, string | number>) => {
    const template = TRANSLATIONS[locale]?.[key] || TRANSLATIONS.zh[key] || key;
    if (!params) return template;
    return Object.entries(params).reduce(
      (acc, [k, v]) => acc.replaceAll(`{${k}}`, String(v)),
      template,
    );
  }, [locale]);

  const getProfessionLabel = (p: string): string => PROFESSION_TRANSLATIONS[p]?.[locale] || p;
  const getContinentLabel = (c: string): string => CONTINENT_TRANSLATIONS[c]?.[locale] || c;
  const getCountryLabel = (c: string): string => COUNTRY_TRANSLATIONS[c]?.[locale] || c;
  const getCityLabel = (city: City): string => CITY_NAME_TRANSLATIONS[city.id]?.[locale] || city.name;

  // ── Currency helpers ──
  const handleCurrencyChange = (currency: string) => {
    setSelectedCurrency(currency);
    localStorage.setItem("selectedCurrency", currency);
  };

  const convertAmount = (amount: number): number => {
    if (!exchangeRates) return amount;
    return Math.round(amount * (exchangeRates.rates[selectedCurrency] || 1) * 100) / 100;
  };

  const formatCurrency = (amount: number): string => {
    if (!exchangeRates) return `$${Math.round(amount).toLocaleString()}`;
    const symbol = exchangeRates.symbols[selectedCurrency] || selectedCurrency;
    const rounded = Math.round(convertAmount(amount));
    if (selectedCurrency === "INR" || selectedCurrency === "PKR") return `${symbol}${rounded.toLocaleString("en-IN")}`;
    return `${symbol}${rounded.toLocaleString()}`;
  };

  const formatPrice = (amount: number): string => {
    if (!exchangeRates) return `$${amount.toFixed(2)}`;
    const symbol = exchangeRates.symbols[selectedCurrency] || selectedCurrency;
    return `${symbol}${convertAmount(amount).toFixed(2)}`;
  };

  // ── Data helpers ──
  const getCost = (city: City): number => {
    if (costTier === "budget") return city.costBudget;
    return city.costModerate;
  };

  const getClimate = (city: City): ClimateInfo | null =>
    CITY_CLIMATE[city.id] ?? null;

  const getAqiLevel = (aqi: number | null): { key: string; color: string } => {
    if (aqi === null) return { key: "noData", color: "text-slate-400" };
    if (aqi <= 50) return { key: "aqiGood", color: "text-green-300" };
    if (aqi <= 100) return { key: "aqiModerate", color: "text-yellow-300" };
    if (aqi <= 150) return { key: "aqiUSG", color: "text-orange-300" };
    if (aqi <= 200) return { key: "aqiUnhealthy", color: "text-red-300" };
    if (aqi <= 300) return { key: "aqiVeryUnhealthy", color: "text-purple-300" };
    return { key: "aqiHazardous", color: "text-rose-400" };
  };

  // ── City selection / comparison logic ──
  const professions = cities[0]?.professions ? Object.keys(cities[0].professions) : [];

  const filteredCities = cities.filter((city) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return city.name.toLowerCase().includes(q) ||
      city.country.toLowerCase().includes(q) ||
      getCityLabel(city).toLowerCase().includes(q) ||
      getCountryLabel(city.country).toLowerCase().includes(q);
  });

  const handleCitySelect = (cityId: string) => {
    const id = cityId.toString();
    setSelectedCities(prev =>
      prev.includes(id) ? prev.filter(c => c !== id)
        : prev.length < maxComparisons ? [...prev, id] : prev
    );
  };

  const handleCompare = () => {
    if (selectedCities.length < 2) { alert(t("needAtLeastTwoCities")); return; }
    const selected = selectedCities
      .map(id => cities.find(c => c.id.toString() === id))
      .filter((c): c is City => !!c);
    if (selected.length > 0) {
      setComparisonData(selected);
      setBaseCityId(selected[0].id.toString());
      setTimeout(() => comparisonRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    }
  };

  const handleClearSelection = () => {
    setSelectedCities([]);
    setComparisonData(null);
    setBaseCityId("");
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareToast(true);
      setTimeout(() => setShareToast(false), 2000);
    } catch {
      // fallback
      const input = document.createElement("input");
      input.value = window.location.href;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setShareToast(true);
      setTimeout(() => setShareToast(false), 2000);
    }
  };

  // ── Context value ──
  const currencySymbol = exchangeRates?.symbols[selectedCurrency] || '$';

  const ctxValue: CompareContextValue = {
    darkMode, locale, costTier, baseCityId, selectedProfession,
    t, getCityLabel, getCountryLabel, getContinentLabel, getProfessionLabel,
    convertAmount, currencySymbol, formatCurrency, formatPrice, getCost, getClimate, getAqiLevel,
  };

  // ── Loading ──
  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${darkMode ? "bg-slate-950" : "bg-slate-50"}`}>
        <div className="text-center">
          <div className={`animate-spin rounded-full h-12 w-12 border-4 ${darkMode ? "border-blue-400 border-t-transparent" : "border-blue-500 border-t-transparent"} mx-auto mb-4`} />
          <p className={`text-lg ${darkMode ? "text-gray-300" : "text-gray-700"}`}>{t("loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <CompareCtx.Provider value={ctxValue}>
      <div className={`min-h-screen transition-colors ${darkMode ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"}`}>

          {/* ── Top Bar (switchers) ── */}
          <div className={`sticky top-0 z-50 border-b px-4 py-2.5 ${darkMode ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"}`}>
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
                <select value={selectedProfession} onChange={e => setSelectedProfession(e.target.value)}
                  className={`text-xs rounded px-1.5 py-1 border ${darkMode ? "bg-slate-800 border-slate-600 text-slate-200" : "bg-white border-slate-300 text-slate-700"}`}>
                  {professions.map(prof => <option key={prof} value={prof}>{getProfessionLabel(prof)}</option>)}
                </select>
                <select value={costTier} onChange={e => setCostTier(e.target.value as CostTier)}
                  className={`text-xs rounded px-1.5 py-1 border ${darkMode ? "bg-slate-800 border-slate-600 text-slate-200" : "bg-white border-slate-300 text-slate-700"}`}>
                  {(["moderate", "budget"] as const).map(tier => (
                    <option key={tier} value={tier}>{t(`costTier${tier.charAt(0).toUpperCase()}${tier.slice(1)}`)}</option>
                  ))}
                </select>
                <select value={locale} onChange={e => setLocale(e.target.value as Locale)}
                  className={`text-xs rounded px-1.5 py-1 border ${darkMode ? "bg-slate-800 border-slate-600 text-slate-200" : "bg-white border-slate-300 text-slate-700"}`}>
                  {(Object.keys(LANGUAGE_LABELS) as Locale[]).map(lang => (
                    <option key={lang} value={lang}>{LANGUAGE_LABELS[lang]}</option>
                  ))}
                </select>
                <select value={selectedCurrency} onChange={e => handleCurrencyChange(e.target.value)}
                  className={`text-xs rounded px-1.5 py-1 border ${darkMode ? "bg-slate-800 border-slate-600 text-slate-200" : "bg-white border-slate-300 text-slate-700"}`}>
                  {POPULAR_CURRENCIES.map(cur => <option key={cur} value={cur}>{cur}</option>)}
                </select>
                <button onClick={() => setDarkMode(!darkMode)}
                  className={`text-xs px-2 py-1 rounded border ${darkMode ? "bg-slate-800 border-slate-600 text-yellow-300" : "bg-white border-slate-300 text-slate-600"}`}>
                  {darkMode ? "☀️" : "🌙"}
                </button>
              </div>
            </div>
          </div>
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-8">

          {/* ── Header ── */}
          <div className="text-center mb-8 sm:mb-10">
            <h1 className={`text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-3 ${darkMode ? "text-white" : "text-slate-900"}`}>
              {t("appTitle")}
            </h1>
            <p className={`text-base sm:text-lg max-w-2xl mx-auto ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
              {t("appSubtitle", { count: cities.length })}
            </p>
            <p className={`text-xs mt-2 ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
              📅 {t("dataLastUpdated")}
            </p>
          </div>

          {/* ── City Selector ── */}
          <div className={`rounded-xl shadow-md p-4 sm:p-6 mb-6 ${darkMode ? "bg-gray-800 border border-gray-700" : "bg-white border border-gray-100"}`}>
            {/* Search */}
            <div className="mb-4">
              <input type="text" placeholder={t("searchPlaceholder")} value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className={`w-full px-4 py-2.5 rounded-lg focus:outline-none transition ${darkMode ? "bg-gray-700 text-white border border-gray-600 focus:border-blue-400 placeholder-gray-400" : "bg-white border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"}`} />
            </div>

            {/* Selected cities strip + action buttons */}
            {selectedCities.length > 0 && (
              <div className={`rounded-lg p-3 sm:p-4 mb-5 ${darkMode ? "bg-gray-700/50 border border-gray-600" : "bg-blue-50/60 border border-blue-100"}`}>
                <p className={`text-xs font-semibold mb-2 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                  {t("selectedCities", { selected: selectedCities.length, max: maxComparisons })}
                </p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {selectedCities.map(id => {
                    const city = cities.find(c => c.id.toString() === id);
                    if (!city) return null;
                    const slug = CITY_SLUGS[city.id];
                    return (
                      <span key={id} className={`inline-flex items-center gap-1 pl-2 pr-1 py-1 rounded-lg text-sm font-medium ${darkMode ? "bg-blue-900/60 text-blue-200 border border-blue-700" : "bg-blue-100 text-blue-800 border border-blue-200"}`}>
                        <span>{CITY_FLAG_EMOJIS[city.id] || "🏙️"}</span>
                        {slug ? (
                          <Link href={`/city/${slug}`} className="hover:underline" title={t("backToHome")}>{getCityLabel(city)}</Link>
                        ) : (
                          <span>{getCityLabel(city)}</span>
                        )}
                        <button onClick={() => handleCitySelect(id)}
                          className={`ml-0.5 rounded px-1 py-0.5 text-xs leading-none ${darkMode ? "hover:bg-white/10" : "hover:bg-black/10"}`}>✕</button>
                      </span>
                    );
                  })}
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button onClick={handleCompare}
                    disabled={selectedCities.length < 2}
                    className={`px-4 py-2 rounded-lg font-bold text-sm transition ${
                      selectedCities.length < 2
                        ? darkMode ? "bg-gray-600 text-gray-400 cursor-not-allowed" : "bg-gray-200 text-gray-400 cursor-not-allowed"
                        : "bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:shadow-md"
                    }`}>
                    {t("compareCities", { count: selectedCities.length })}
                  </button>
                  {selectedCities.length === 2 && (() => {
                    const [idA, idB] = selectedCities;
                    const slugA = CITY_SLUGS[Number(idA)];
                    const slugB = CITY_SLUGS[Number(idB)];
                    if (!slugA || !slugB) return null;
                    const pair = [slugA, slugB].sort().join("-vs-");
                    const cityA = cities.find(c => c.id.toString() === idA);
                    const cityB = cities.find(c => c.id.toString() === idB);
                    return (
                      <Link href={`/compare/${pair}`}
                        className={`px-4 py-2 rounded-lg font-bold text-sm transition inline-flex items-center gap-1 ${darkMode ? "bg-indigo-700 text-white hover:bg-indigo-600" : "bg-indigo-600 text-white hover:bg-indigo-500"}`}>
                        {getCityLabel(cityA!)} vs {getCityLabel(cityB!)} →
                      </Link>
                    );
                  })()}
                  <button onClick={handleClearSelection}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition ${darkMode ? "bg-gray-600 text-gray-300 hover:bg-gray-500" : "bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200"}`}>
                    {t("clear")}
                  </button>
                  {comparisonData && (
                    <button onClick={handleShare}
                      className={`px-4 py-2 rounded-lg font-medium text-sm transition flex items-center gap-1.5 ${
                        shareToast ? "bg-green-600 text-white"
                          : darkMode ? "bg-gray-600 text-gray-300 hover:bg-gray-500" : "bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200"
                      }`}>
                      {shareToast ? "✓ " : "🔗 "}{shareToast ? t("shareCopied") : t("shareLink")}
                    </button>
                  )}
                  {comparisonData && (
                    <ShareCard comparisonData={comparisonData} />
                  )}
                </div>
              </div>
            )}

            {/* Region-grouped city grid */}
            <div className="space-y-4">
              {REGIONS.map(region => {
                const regionCities = region.ids
                  .map(id => cities.find(c => c.id === id))
                  .filter((c): c is City => !!c)
                  .filter(c => filteredCities.some(fc => fc.id === c.id));
                if (regionCities.length === 0) return null;
                return (
                  <div key={region.key}>
                    <h3 className={`text-xs font-bold uppercase tracking-wider mb-2 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                      {REGION_LABELS[region.key]?.[locale] || region.key}
                      <span className="ml-1 font-normal opacity-60">({regionCities.length})</span>
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-1.5">
                      {regionCities.map(city => {
                        const isSelected = selectedCities.includes(city.id.toString());
                        const isDisabled = selectedCities.length >= maxComparisons && !isSelected;
                        return (
                          <button key={city.id}
                            onClick={() => handleCitySelect(city.id.toString())}
                            disabled={isDisabled}
                            title={`${getCityLabel(city)}, ${getCountryLabel(city.country)}`}
                            className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg font-medium transition text-xs text-left ${
                              isSelected
                                ? "bg-blue-600 text-white shadow-sm ring-2 ring-blue-300/50"
                                : isDisabled
                                  ? darkMode ? "bg-gray-700/50 text-gray-500 cursor-not-allowed" : "bg-gray-50 text-gray-400 cursor-not-allowed"
                                  : darkMode ? "bg-gray-700/50 text-gray-300 hover:bg-gray-600 hover:text-white" : "bg-gray-50 text-gray-600 hover:bg-blue-50 hover:text-blue-700"
                            }`}>
                            <span className="flex-shrink-0">{CITY_FLAG_EMOJIS[city.id] || "🏙️"}</span>
                            <span className="truncate">{getCityLabel(city)}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Comparison Results ── */}
          {comparisonData && (
            <div ref={comparisonRef} className="space-y-6 sm:space-y-8">
              <ChartSection comparisonData={comparisonData} />

              {/* City Cards */}
              <div className={`rounded-xl shadow-md p-4 sm:p-8 ${darkMode ? "bg-gray-800 border border-gray-700" : "bg-white border border-gray-100"}`}>
                <h2 className={`text-2xl sm:text-3xl font-bold mb-2 ${darkMode ? "text-white" : "text-gray-800"}`}>
                  {t("cityDetails")}
                </h2>
                <p className={`text-sm mb-6 ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                  {t("clickSetBase")}
                </p>
                <div className={`grid gap-4 sm:gap-6 ${
                  comparisonData.length === 2 ? "grid-cols-1 md:grid-cols-2"
                    : comparisonData.length === 3 ? "grid-cols-1 md:grid-cols-3"
                      : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
                }`}>
                  {comparisonData.map(city => {
                    const baseCity = comparisonData.find(c => c.id.toString() === baseCityId) || comparisonData[0];
                    return (
                      <CityCard
                        key={city.id}
                        city={city}
                        isBase={city.id.toString() === baseCityId}
                        baseCity={baseCity}
                        onClick={() => setBaseCityId(city.id.toString())}
                      />
                    );
                  })}
                </div>
              </div>

              <KeyInsights comparisonData={comparisonData} />
              <DataSources />
            </div>
          )}

        </div>
      </div>
    </CompareCtx.Provider>
  );
}
