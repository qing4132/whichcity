"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { City, ComparisonMode, CostTier, Locale, ClimateInfo, ExchangeRates } from "@/lib/types";
import { TRANSLATIONS, LANGUAGE_LABELS, CONTINENT_TRANSLATIONS, PROFESSION_TRANSLATIONS, COUNTRY_TRANSLATIONS, CITY_NAME_TRANSLATIONS } from "@/lib/i18n";
import { POPULAR_CURRENCIES, CITY_CLIMATE } from "@/lib/constants";
import { CompareCtx, type CompareContextValue } from "@/lib/CompareContext";
import { readUrlParams, writeUrlParams } from "@/hooks/useUrlState";
import ChartSection from "./ChartSection";
import CityCard from "./CityCard";
import KeyInsights from "./KeyInsights";
import DataSources from "./DataSources";
import CityLinks from "./CityLinks";

export default function CityComparison() {
  const [cities, setCities] = useState<City[]>([]);
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [selectedProfession, setSelectedProfession] = useState<string>("");
  const [comparisonData, setComparisonData] = useState<City[] | null>(null);
  const [baseCityId, setBaseCityId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>("normal");
  const [costTier, setCostTier] = useState<CostTier>("moderate");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedContinent, setSelectedContinent] = useState<string>("all");
  const [windowWidth, setWindowWidth] = useState(1200);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<string>("USD");
  const [darkMode, setDarkMode] = useState(false);
  const [locale, setLocale] = useState<Locale>("zh");
  const [shareToast, setShareToast] = useState(false);
  const comparisonRef = useRef<HTMLDivElement>(null);
  const urlInitRef = useRef(false);

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

    if (url.mode && ["normal", "ratio", "bigmac"].includes(url.mode)) setComparisonMode(url.mode as ComparisonMode);
    if (url.tier && ["comfort", "moderate", "budget", "minimal"].includes(url.tier)) setCostTier(url.tier as CostTier);

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
        const initProf = url.prof && profs.includes(url.prof) ? url.prof : profs[0] || "";
        setSelectedProfession(initProf);

        // Restore city selection from URL
        if (url.cities) {
          const ids = url.cities.split(",").filter(Boolean);
          const valid = ids.filter(id => citiesData.cities.some((c: City) => c.id.toString() === id));
          if (valid.length >= 2) {
            setSelectedCities(valid);
            const selected = valid.map((id: string) => citiesData.cities.find((c: City) => c.id.toString() === id)).filter(Boolean) as City[];
            setComparisonData(selected);
            setBaseCityId(url.base && valid.includes(url.base) ? url.base : selected[0]?.id.toString() || "");
          }
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
      mode: comparisonMode !== "normal" ? comparisonMode : undefined,
      tier: costTier !== "moderate" ? costTier : undefined,
      lang: locale !== "zh" ? locale : undefined,
      cur: selectedCurrency !== "USD" ? selectedCurrency : undefined,
      dark: darkMode ? "1" : undefined,
      base: baseCityId || undefined,
    });
  }, [selectedCities, selectedProfession, comparisonMode, costTier, locale, selectedCurrency, darkMode, baseCityId]);

  // ── Persist to localStorage ──
  useEffect(() => { localStorage.setItem("darkMode", JSON.stringify(darkMode)); }, [darkMode]);
  useEffect(() => { localStorage.setItem("locale", locale); }, [locale]);

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
    if (costTier === "comfort") return city.costComfort;
    if (costTier === "budget") return city.costBudget;
    if (costTier === "minimal") return city.costMinimal;
    return city.costModerate;
  };

  const getClimate = (city: City): ClimateInfo =>
    CITY_CLIMATE[city.id] || { type: "temperate" as const, avgTempC: 15, annualRainMm: 800, sunshineHours: 2000 };

  const getAqiLevel = (aqi: number): { key: string; color: string } => {
    if (aqi <= 50) return { key: "aqiGood", color: "text-green-300" };
    if (aqi <= 100) return { key: "aqiModerate", color: "text-yellow-300" };
    if (aqi <= 150) return { key: "aqiUSG", color: "text-orange-300" };
    if (aqi <= 200) return { key: "aqiUnhealthy", color: "text-red-300" };
    if (aqi <= 300) return { key: "aqiVeryUnhealthy", color: "text-purple-300" };
    return { key: "aqiHazardous", color: "text-rose-400" };
  };

  const getRatioValue = (value: number, baseValue: number): number =>
    parseFloat((value / baseValue).toFixed(2));

  const toBigMacCount = (value: number, bigMacPrice: number): number =>
    bigMacPrice <= 0 ? 0 : parseFloat((value / bigMacPrice).toFixed(2));

  // ── City selection / comparison logic ──
  const continents = [...new Set(cities.map(c => c.continent))].sort();
  const professions = cities[0]?.professions ? Object.keys(cities[0].professions) : [];

  const filteredCities = cities.filter((city) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch = city.name.toLowerCase().includes(q) ||
      city.country.toLowerCase().includes(q) ||
      getCityLabel(city).toLowerCase().includes(q) ||
      getCountryLabel(city.country).toLowerCase().includes(q);
    return matchesSearch && (selectedContinent === "all" || city.continent === selectedContinent);
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
    darkMode, locale, comparisonMode, costTier, baseCityId, selectedProfession,
    t, getCityLabel, getCountryLabel, getContinentLabel, getProfessionLabel,
    convertAmount, currencySymbol, formatCurrency, formatPrice, getCost, getClimate, getAqiLevel, getRatioValue, toBigMacCount,
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
      <div className={`min-h-screen py-4 sm:py-8 px-3 sm:px-4 transition-colors ${darkMode ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"}`}>
        <div className="max-w-7xl mx-auto">

          {/* ── Top Bar (switchers) ── */}
          <div className={`border-b px-4 py-2.5 -mx-3 sm:-mx-4 -mt-4 sm:-mt-8 mb-6 sm:mb-8 ${darkMode ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"}`}>
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 flex-wrap">
              <span className={`font-bold text-sm ${darkMode ? "text-slate-200" : "text-slate-700"}`}>🌍 City Compare</span>
              <div className="flex items-center gap-2 flex-wrap">
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

          {/* ── Header ── */}
          <div className="text-center mb-8 sm:mb-10">
            <h1 className={`text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-3 ${darkMode ? "text-white" : "text-slate-900"}`}>
              {t("appTitle")}
            </h1>
            <p className={`text-base sm:text-lg max-w-2xl mx-auto ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
              {t("appSubtitle", { count: cities.length })}
            </p>
          </div>

          {/* ── Control Panel ── */}
          <div className={`rounded-xl shadow-md p-4 sm:p-6 mb-6 ${darkMode ? "bg-gray-800 border border-gray-700" : "bg-white border border-gray-100"}`}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-6">
              {/* Profession */}
              <div>
                <label className={`block text-sm font-semibold mb-3 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                  {t("selectProfession")}
                </label>
                <select value={selectedProfession} onChange={e => setSelectedProfession(e.target.value)}
                  className={`w-full px-4 py-2.5 rounded-lg font-medium transition ${darkMode ? "bg-gray-700 text-white border border-gray-600 focus:border-blue-400" : "bg-white border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"} focus:outline-none`}>
                  {professions.map(prof => <option key={prof} value={prof}>{getProfessionLabel(prof)}</option>)}
                </select>
              </div>

              {/* Comparison Mode */}
              <div>
                <label className={`block text-sm font-semibold mb-3 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                  {t("comparisonMode", { count: maxComparisons })}
                </label>
                <div className="flex gap-2">
                  {(["normal", "ratio", "bigmac"] as const).map(mode => (
                    <button key={mode} onClick={() => setComparisonMode(mode)}
                      className={`flex-1 px-3 sm:px-4 py-2 rounded-lg font-medium transition text-sm sm:text-base ${
                        comparisonMode === mode
                          ? mode === "normal" ? "bg-blue-600 text-white" : mode === "ratio" ? "bg-purple-600 text-white" : "bg-amber-600 text-white"
                          : darkMode ? "bg-gray-700 text-gray-300 hover:bg-gray-600" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}>
                      {t(mode === "normal" ? "modeNormal" : mode === "ratio" ? "modeRatio" : "modeBigMac")}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cost Tier — 2x2 on mobile, 4-col on sm+ */}
              <div>
                <label className={`block text-sm font-semibold mb-3 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                  {t("costTierLabel")}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(["comfort", "moderate", "budget", "minimal"] as const).map(tier => {
                    const colors: Record<CostTier, string> = { comfort: "bg-rose-600", moderate: "bg-sky-600", budget: "bg-emerald-600", minimal: "bg-orange-600" };
                    return (
                      <button key={tier} onClick={() => setCostTier(tier)}
                        className={`px-3 py-2 rounded-lg font-medium transition text-sm ${
                          costTier === tier ? `${colors[tier]} text-white`
                            : darkMode ? "bg-gray-700 text-gray-300 hover:bg-gray-600" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                        }`}>
                        {t(`costTier${tier.charAt(0).toUpperCase()}${tier.slice(1)}`)}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Search + continent filter */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <input type="text" placeholder={t("searchPlaceholder")} value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className={`px-4 py-2.5 rounded-lg focus:outline-none transition ${darkMode ? "bg-gray-700 text-white border border-gray-600 focus:border-blue-400" : "bg-white border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"}`} />
              <select value={selectedContinent} onChange={e => setSelectedContinent(e.target.value)}
                className={`px-4 py-2.5 rounded-lg focus:outline-none transition font-medium ${darkMode ? "bg-gray-700 text-white border border-gray-600 focus:border-blue-400" : "bg-white border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"}`}>
                <option value="all">{t("allContinents")}</option>
                {continents.map(c => <option key={c} value={c}>{getContinentLabel(c)}</option>)}
              </select>
            </div>

            {/* City grid — responsive columns */}
            <div className="mb-4">
              <p className={`text-sm font-semibold mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>{t("chooseCity")}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2">
                {filteredCities.slice(0, 100).map(city => (
                  <button key={city.id}
                    onClick={() => handleCitySelect(city.id.toString())}
                    disabled={selectedCities.length >= maxComparisons && !selectedCities.includes(city.id.toString())}
                    title={`${getCityLabel(city)}, ${getCountryLabel(city.country)}`}
                    className={`px-2 py-2 sm:py-1.5 rounded-lg font-medium transition text-xs whitespace-nowrap overflow-hidden text-ellipsis min-h-[40px] sm:min-h-0 ${
                      selectedCities.includes(city.id.toString())
                        ? "bg-blue-600 text-white shadow-sm ring-2 ring-blue-300 ring-opacity-50"
                        : selectedCities.length >= maxComparisons
                          ? darkMode ? "bg-gray-700 text-gray-500 cursor-not-allowed" : "bg-gray-100 text-gray-400 cursor-not-allowed"
                          : darkMode ? "bg-gray-700 text-gray-300 hover:bg-gray-600" : "bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-700"
                    }`}>
                    {selectedCities.includes(city.id.toString()) && "✓ "}{getCityLabel(city)}
                  </button>
                ))}
              </div>
              {filteredCities.length > 100 && (
                <p className={`text-xs mt-1.5 ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                  {t("showingCities", { total: filteredCities.length })}
                </p>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 sm:gap-4 flex-wrap">
              <button onClick={handleCompare}
                disabled={selectedCities.length < 2}
                className={`flex-1 min-w-[160px] py-3 px-6 rounded-lg font-bold text-base sm:text-lg transition ${
                  selectedCities.length < 2
                    ? darkMode ? "bg-gray-700 text-gray-500 cursor-not-allowed" : "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:shadow-lg hover:from-blue-700 hover:to-blue-800"
                }`}>
                {t("compareCities", { count: selectedCities.length })}
              </button>

              {selectedCities.length > 0 && (
                <button onClick={handleClearSelection}
                  className={`px-6 py-3 rounded-lg font-medium text-base sm:text-lg transition ${darkMode ? "bg-gray-700 text-gray-300 hover:bg-gray-600" : "bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200"}`}>
                  {t("clear")}
                </button>
              )}

              {/* Share button */}
              {comparisonData && (
                <button onClick={handleShare}
                  className={`px-5 py-3 rounded-lg font-medium text-base transition flex items-center gap-2 ${
                    shareToast
                      ? "bg-green-600 text-white"
                      : darkMode ? "bg-gray-700 text-gray-300 hover:bg-gray-600" : "bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200"
                  }`}>
                  {shareToast ? "✓ " : "🔗 "}{shareToast ? t("shareCopied") : t("shareLink")}
                </button>
              )}
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

          {/* SEO internal links — always visible */}
          <CityLinks />
        </div>
      </div>
    </CompareCtx.Provider>
  );
}
