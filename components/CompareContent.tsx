"use client";

import Link from "next/link";
import type { City, CostTier, ClimateInfo } from "@/lib/types";
import { CITY_FLAG_EMOJIS, POPULAR_CURRENCIES, CITY_CLIMATE } from "@/lib/constants";
import { CITY_SLUGS } from "@/lib/citySlug";
import { CITY_NAME_TRANSLATIONS, COUNTRY_TRANSLATIONS, PROFESSION_TRANSLATIONS, LANGUAGE_LABELS } from "@/lib/i18n";
import { getCityClimate, getAqiLabel, getClimateLabel } from "@/lib/clientUtils";
import { CompareCtx, type CompareContextValue } from "@/lib/CompareContext";
import { useSettings } from "@/hooks/useSettings";
import KeyInsights from "./KeyInsights";

interface Props {
  cityA: City;
  cityB: City;
  slugA: string;
  slugB: string;
}

export default function CompareContent({ cityA, cityB, slugA, slugB }: Props) {
  const s = useSettings();
  const { locale, darkMode, t, formatCurrency, costTier, profession, convertAmount } = s;

  if (!s.ready) return null;

  const idA = cityA.id, idB = cityB.id;
  const flagA = CITY_FLAG_EMOJIS[idA] || "🏙️";
  const flagB = CITY_FLAG_EMOJIS[idB] || "🏙️";
  const nameA = CITY_NAME_TRANSLATIONS[idA]?.[locale] || cityA.name;
  const nameB = CITY_NAME_TRANSLATIONS[idB]?.[locale] || cityB.name;
  const countryA = COUNTRY_TRANSLATIONS[cityA.country]?.[locale] || cityA.country;
  const countryB = COUNTRY_TRANSLATIONS[cityB.country]?.[locale] || cityB.country;
  const climateA = getCityClimate(idA);
  const climateB = getCityClimate(idB);

  const professions = cityA.professions ? Object.keys(cityA.professions) : [];
  const activeProfession = profession && professions.includes(profession) ? profession : professions[0] || "";

  const getCost = (city: City): number => {
    if (costTier === "comfort") return city.costComfort;
    if (costTier === "budget") return city.costBudget;
    if (costTier === "minimal") return city.costMinimal;
    return city.costModerate;
  };

  const fc = formatCurrency;
  const costA = getCost(cityA);
  const costB = getCost(cityB);
  const incomeA = activeProfession ? cityA.professions[activeProfession] || 0 : cityA.averageIncome;
  const incomeB = activeProfession ? cityB.professions[activeProfession] || 0 : cityB.averageIncome;
  const savingsA = incomeA - costA * 12;
  const savingsB = incomeB - costB * 12;
  const yearsA = savingsA > 0 ? ((cityA.housePrice * 70) / savingsA).toFixed(1) : "N/A";
  const yearsB = savingsB > 0 ? ((cityB.housePrice * 70) / savingsB).toFixed(1) : "N/A";

  const wins = {
    income: incomeA >= incomeB ? "A" : "B",
    cost: costA <= costB ? "A" : "B",
    savings: savingsA >= savingsB ? "A" : "B",
    housing: cityA.housePrice <= cityB.housePrice ? "A" : "B",
    air: cityA.airQuality <= cityB.airQuality ? "A" : "B",
    doctors: cityA.doctorsPerThousand >= cityB.doctorsPerThousand ? "A" : "B",
  };
  const winsA = Object.values(wins).filter((v) => v === "A").length;
  const winsB = Object.values(wins).filter((v) => v === "B").length;

  const rows: { label: string; a: string; b: string; winner: "A" | "B" | "tie" }[] = [
    { label: `${t("avgIncome")} (${s.getProfessionLabel(activeProfession)})`, a: fc(incomeA), b: fc(incomeB), winner: wins.income as "A" | "B" },
    { label: `${t("monthlyCost")} (${t(`costTier${costTier.charAt(0).toUpperCase()}${costTier.slice(1)}`)})`, a: fc(costA), b: fc(costB), winner: wins.cost as "A" | "B" },
    { label: t("yearlySavings"), a: fc(savingsA), b: fc(savingsB), winner: wins.savings as "A" | "B" },
    { label: t("housePrice") + " " + t("housePriceUnit"), a: fc(cityA.housePrice), b: fc(cityB.housePrice), winner: wins.housing as "A" | "B" },
    { label: t("yearsToBuy"), a: `${yearsA} ${t("insightYears")}`, b: `${yearsB} ${t("insightYears")}`, winner: yearsA !== "N/A" && yearsB !== "N/A" ? (Number(yearsA) <= Number(yearsB) ? "A" : "B") : "tie" },
    { label: t("airQuality") + " (AQI)", a: `${cityA.airQuality} – ${getAqiLabel(cityA.airQuality, locale)}`, b: `${cityB.airQuality} – ${getAqiLabel(cityB.airQuality, locale)}`, winner: wins.air as "A" | "B" },
    { label: t("doctorsPerThousand"), a: String(cityA.doctorsPerThousand), b: String(cityB.doctorsPerThousand), winner: wins.doctors as "A" | "B" },
    { label: t("bigMac"), a: cityA.bigMacPrice !== null ? fc(cityA.bigMacPrice) : t("noMcDonalds"), b: cityB.bigMacPrice !== null ? fc(cityB.bigMacPrice) : t("noMcDonalds"), winner: cityA.bigMacPrice !== null && cityB.bigMacPrice !== null ? (cityA.bigMacPrice <= cityB.bigMacPrice ? "A" : "B") : "tie" },
    { label: t("climateType"), a: getClimateLabel(climateA.type, locale), b: getClimateLabel(climateB.type, locale), winner: "tie" },
    { label: t("avgTemp"), a: `${climateA.avgTempC.toFixed(1)}°C`, b: `${climateB.avgTempC.toFixed(1)}°C`, winner: "tie" },
    { label: t("sunshine"), a: `${Math.round(climateA.sunshineHours)} h`, b: `${Math.round(climateB.sunshineHours)} h`, winner: "tie" },
  ];

  const headingCls = darkMode ? "text-slate-100" : "text-slate-800";
  const subCls = darkMode ? "text-slate-400" : "text-slate-500";
  const sectionBg = darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200";
  const thBg = darkMode ? "bg-slate-700 border-slate-600 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-600";
  const borderRow = darkMode ? "border-slate-700" : "border-slate-100";
  const winCls = darkMode ? "text-green-400 bg-green-900/30" : "text-green-600 bg-green-50";
  const normalCell = darkMode ? "text-slate-200" : "text-slate-700";
  const selectCls = `text-xs rounded px-1.5 py-1 border ${darkMode ? "bg-slate-800 border-slate-600 text-slate-200" : "bg-white border-slate-300 text-slate-700"}`;
  const navBg = darkMode ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200";

  // Build a CompareContext so KeyInsights can work
  const ctxValue: CompareContextValue = {
    darkMode, locale, costTier, baseCityId: String(idA), selectedProfession: activeProfession,
    t, getCityLabel: (city: City) => CITY_NAME_TRANSLATIONS[city.id]?.[locale] || city.name,
    getCountryLabel: (c: string) => COUNTRY_TRANSLATIONS[c]?.[locale] || c,
    getContinentLabel: (c: string) => c,
    getProfessionLabel: s.getProfessionLabel,
    convertAmount, currencySymbol: s.currencySymbol, formatCurrency: fc,
    formatPrice: (amount: number) => fc(amount),
    getCost,
    getClimate: (city: City) => CITY_CLIMATE[city.id] || { type: "temperate" as const, avgTempC: 15, annualRainMm: 800, sunshineHours: 2000 },
    getAqiLevel: (aqi: number) => {
      if (aqi <= 50) return { key: "aqiGood", color: "text-green-300" };
      if (aqi <= 100) return { key: "aqiModerate", color: "text-yellow-300" };
      if (aqi <= 150) return { key: "aqiUSG", color: "text-orange-300" };
      if (aqi <= 200) return { key: "aqiUnhealthy", color: "text-red-300" };
      if (aqi <= 300) return { key: "aqiVeryUnhealthy", color: "text-purple-300" };
      return { key: "aqiHazardous", color: "text-rose-400" };
    },
  };

  return (
    <CompareCtx.Provider value={ctxValue}>
    <div className={`min-h-screen ${darkMode ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"}`}>
      {/* Top Bar — same style as homepage */}
      <div className={`sticky top-0 z-50 border-b px-4 py-2.5 ${navBg}`}>
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Link href="/" className={`text-xs px-2 py-1 rounded border font-semibold transition ${darkMode ? "bg-slate-800 border-slate-600 text-blue-300 hover:bg-slate-700" : "bg-white border-slate-300 text-blue-700 hover:bg-blue-50"}`}>
              {t("navHome")}
            </Link>
            <Link href="/ranking" className={`text-xs px-2 py-1 rounded border transition ${darkMode ? "bg-slate-800 border-slate-600 text-amber-300 hover:bg-slate-700" : "bg-white border-slate-300 text-amber-700 hover:bg-amber-50"}`}>
              {t("navRanking")}
            </Link>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select value={activeProfession} onChange={e => s.setProfession(e.target.value)} className={selectCls}>
              {professions.map(prof => <option key={prof} value={prof}>{s.getProfessionLabel(prof)}</option>)}
            </select>
            <select value={costTier} onChange={e => s.setCostTier(e.target.value as CostTier)} className={selectCls}>
              {(["comfort", "moderate", "budget", "minimal"] as const).map(tier => (
                <option key={tier} value={tier}>{t(`costTier${tier.charAt(0).toUpperCase()}${tier.slice(1)}`)}</option>
              ))}
            </select>
            <select value={locale} onChange={e => s.setLocale(e.target.value as any)} className={selectCls}>
              {(Object.keys(LANGUAGE_LABELS) as any[]).map(lang => (
                <option key={lang} value={lang}>{LANGUAGE_LABELS[lang]}</option>
              ))}
            </select>
            <select value={s.currency} onChange={e => s.setCurrency(e.target.value)} className={selectCls}>
              {POPULAR_CURRENCIES.map(cur => <option key={cur} value={cur}>{cur}</option>)}
            </select>
            <button onClick={() => s.setDarkMode(!darkMode)} className={`text-xs px-2 py-1 rounded border ${darkMode ? "bg-slate-800 border-slate-600 text-yellow-300" : "bg-white border-slate-300 text-slate-600"}`}>
              {darkMode ? "☀️" : "🌙"}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Hero */}
        <header className="text-center mb-10">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="text-center">
              <span className="text-4xl">{flagA}</span>
              <p className={`text-xl font-bold mt-1 ${headingCls}`}>{nameA}</p>
              <p className={`text-sm ${subCls}`}>{countryA}</p>
            </div>
            <span className={`text-3xl font-extrabold ${darkMode ? "text-slate-600" : "text-slate-300"}`}>VS</span>
            <div className="text-center">
              <span className="text-4xl">{flagB}</span>
              <p className={`text-xl font-bold mt-1 ${headingCls}`}>{nameB}</p>
              <p className={`text-sm ${subCls}`}>{countryB}</p>
            </div>
          </div>
          <p className={`text-sm ${subCls}`}>
            {t("winsIn", { name: nameA, count: winsA })}, {t("winsIn", { name: nameB, count: winsB })}
          </p>
        </header>

        {/* Key Metrics */}
        <section className="mb-10">
          <h2 className={`text-2xl font-bold mb-4 ${headingCls}`}>{t("keyMetrics")}</h2>
          <div className={`rounded-xl border overflow-hidden ${sectionBg}`}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={`border-b ${thBg}`}>
                    <th className="text-left px-4 py-3 font-semibold">{t("metric")}</th>
                    <th className="text-center px-4 py-3 font-semibold">{flagA} {nameA}</th>
                    <th className="text-center px-4 py-3 font-semibold">{flagB} {nameB}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.label} className={`border-b ${borderRow}`}>
                      <td className={`px-4 py-2.5 font-medium ${normalCell}`}>{row.label}</td>
                      <td className={`px-4 py-2.5 text-center font-semibold ${row.winner === "A" ? winCls : normalCell}`}>
                        {row.a} {row.winner === "A" && "✓"}
                      </td>
                      <td className={`px-4 py-2.5 text-center font-semibold ${row.winner === "B" ? winCls : normalCell}`}>
                        {row.b} {row.winner === "B" && "✓"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Key Insights */}
        <div className="mb-10">
          <KeyInsights comparisonData={[cityA, cityB]} />
        </div>

        {/* City Guide Links */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
          {[[idA, slugA, flagA, nameA, countryA], [idB, slugB, flagB, nameB, countryB]].map(([id, sl, fl, nm, co]) => (
            <Link
              key={String(id)}
              href={`/city/${sl}`}
              className={`rounded-xl border p-5 transition ${sectionBg} hover:border-blue-400 hover:shadow`}
            >
              <p className="text-2xl mb-1">{fl}</p>
              <p className={`font-bold text-lg ${headingCls}`}>{nm} {t("cityGuide")}</p>
              <p className={`text-sm ${subCls}`}>{co} · {t("cityGuideDesc")}</p>
            </Link>
          ))}
        </section>

        {/* Data Sources */}
        <section className={`rounded-xl border p-4 sm:p-6 mb-10 ${sectionBg}`}>
          <h3 className={`text-base sm:text-lg font-semibold mb-3 ${headingCls}`}>{t("dataSourcesTitle")}</h3>
          <p className={`text-sm mb-3 ${subCls}`}>{t("dataSourcesDesc")}</p>
          <div className={`space-y-1.5 text-xs ${subCls}`}>
            {["dataSalarySrc", "dataCostSrc", "dataHouseSrc", "dataBigMacSrc", "dataClimateSrc", "dataAqiSrc", "dataDoctorSrc"].map((k) => (
              <p key={k}>• {t(k)}</p>
            ))}
          </div>
          <div className={`mt-4 pt-3 border-t ${borderRow}`}>
            <p className={`text-xs ${subCls}`}>{t("dataSourcesDisclaimer")}</p>
          </div>
        </section>

        {/* Footer */}
        <footer className={`border-t px-4 py-6 text-center text-xs ${darkMode ? "border-slate-700 text-slate-500" : "border-slate-200 text-slate-400"}`}>
          <p>{t("dataSourcesDisclaimer")}</p>
          <p className="mt-1 font-medium">{t("dataLastUpdated")}</p>
          <p className="mt-1">
            {t("feedbackText")}{" "}
            <a href="https://github.com/qing4132/citycompare/issues" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-500">GitHub Issues</a>
            {" / "}
            <a href="mailto:qing4132@users.noreply.github.com" className="underline hover:text-blue-500">Email</a>
          </p>
        </footer>
      </div>
    </div>
    </CompareCtx.Provider>
  );
}
