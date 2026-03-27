"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { City, CostTier } from "@/lib/types";
import { CITY_FLAG_EMOJIS, POPULAR_CURRENCIES } from "@/lib/constants";
import { CITY_SLUGS } from "@/lib/citySlug";
import { CITY_NAME_TRANSLATIONS, COUNTRY_TRANSLATIONS, LANGUAGE_LABELS } from "@/lib/i18n";
import { getCityClimate, getCityEnName, getClimateLabel } from "@/lib/clientUtils";
import { CITY_INTROS } from "@/lib/cityIntros";
import { useSettings } from "@/hooks/useSettings";

interface Props {
  city: City;
  relatedIds: number[];
  slug: string;
  allCities: City[];
}

const TIER_KEYS: { key: CostTier; field: "costComfort" | "costModerate" | "costBudget" | "costMinimal"; labelKey: string }[] = [
  { key: "comfort", field: "costComfort", labelKey: "costTierComfort" },
  { key: "moderate", field: "costModerate", labelKey: "costTierModerate" },
  { key: "budget", field: "costBudget", labelKey: "costTierBudget" },
  { key: "minimal", field: "costMinimal", labelKey: "costTierMinimal" },
];

export default function CityDetailContent({ city, relatedIds, slug, allCities }: Props) {
  const s = useSettings();
  const router = useRouter();
  const { locale, darkMode, t, formatCurrency, costTier, profession } = s;

  if (!s.ready) return null;

  const id = city.id;
  const flag = CITY_FLAG_EMOJIS[id] || "🏙️";
  const cityName = CITY_NAME_TRANSLATIONS[id]?.[locale] || city.name;
  const countryName = COUNTRY_TRANSLATIONS[city.country]?.[locale] || city.country;
  const climate = getCityClimate(id);

  const professions = city.professions ? Object.keys(city.professions) : [];
  const activeProfession = profession && professions.includes(profession) ? profession : professions[0] || "";
  const income = activeProfession ? city.professions[activeProfession] || 0 : city.averageIncome;

  const tierCost = city[TIER_KEYS.find((tk) => tk.key === costTier)!.field];
  const annualExpense = tierCost * 12;
  const savings = income - annualExpense;

  const headingCls = darkMode ? "text-slate-100" : "text-slate-800";
  const subCls = darkMode ? "text-slate-400" : "text-slate-500";
  const sectionBg = darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200";
  const borderRow = darkMode ? "border-slate-700" : "border-slate-100";
  const selectCls = `text-xs rounded px-1.5 py-1 border ${darkMode ? "bg-slate-800 border-slate-600 text-slate-200" : "bg-white border-slate-300 text-slate-700"}`;
  const navBg = darkMode ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200";

  // Percentile ranking: compute where this city stands for each metric
  const pct = (values: number[], val: number) => {
    const sorted = [...values].sort((a, b) => a - b);
    const idx = sorted.findIndex((v) => v >= val);
    return idx === -1 ? 1 : idx / sorted.length;
  };
  const allIncomes = allCities.map((c) => activeProfession ? c.professions[activeProfession] || 0 : c.averageIncome);
  const allCosts = allCities.map((c) => c[TIER_KEYS.find((tk) => tk.key === costTier)!.field]);
  const allSavings = allCities.map((c, i) => allIncomes[i] - allCosts[i] * 12);
  const allHouse = allCities.map((c) => c.housePrice);
  const allAqi = allCities.map((c) => c.airQuality);
  const allDoctors = allCities.map((c) => c.doctorsPerThousand);
  const allFlights = allCities.map((c) => c.directFlightCities);
  const allSafety = allCities.map((c) => c.safetyIndex);
  const allWorkHours = allCities.map((c) => c.annualWorkHours);
  const hourlyWage = city.annualWorkHours > 0 ? income / city.annualWorkHours : 0;
  const allHourly = allCities.map((c, i) => c.annualWorkHours > 0 ? allIncomes[i] / c.annualWorkHours : 0);
  const bigMacPrices = allCities.filter((c) => c.bigMacPrice !== null).map((c) => c.bigMacPrice as number);
  const bigMacMedian = [...bigMacPrices].sort((a, b) => a - b)[Math.floor(bigMacPrices.length / 2)];
  const bigMacRatio = city.bigMacPrice !== null && bigMacMedian > 0 ? city.bigMacPrice / bigMacMedian : null;
  const allBigMacRatio = allCities.filter((c) => c.bigMacPrice !== null).map((c) => (c.bigMacPrice as number) / bigMacMedian);
  const allYearsToHome = allCities.map((c, i) => { const sav = allIncomes[i] - allCosts[i] * 12; return sav > 0 ? (c.housePrice * 70) / sav : Infinity; });
  const yearsVal = savings > 0 ? (city.housePrice * 70) / savings : Infinity;

  // Ranking helper: 1-based rank (lower rank number = better)
  const rankHigher = (values: number[], val: number) => {
    const sorted = [...values].sort((a, b) => b - a);
    return sorted.findIndex((v) => v <= val) + 1;
  };
  const rankLower = (values: number[], val: number) => {
    const sorted = [...values].sort((a, b) => a - b);
    return sorted.findIndex((v) => v >= val) + 1;
  };
  const n = allCities.length;

  // "good"=top25%, "bad"=bottom25%, "mid"=middle — higher-is-better: pct>=0.75=good; lower-is-better: pct<=0.25=good
  type Tier = "good" | "mid" | "bad";
  const tierHigh = (values: number[], val: number): Tier => { const p = pct(values, val); return p >= 0.75 ? "good" : p <= 0.25 ? "bad" : "mid"; };
  const tierLow = (values: number[], val: number): Tier => { const p = pct(values, val); return p <= 0.25 ? "good" : p >= 0.75 ? "bad" : "mid"; };

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
  const baseCard = "rounded-xl border p-4 text-center " + (darkMode ? "bg-slate-800" : "bg-white");

  return (
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
            <button onClick={() => { const slugs = Object.values(CITY_SLUGS).filter(s => s !== slug); router.push(`/city/${slugs[Math.floor(Math.random() * slugs.length)]}`); }}
              className={`text-xs px-2 py-1 rounded border transition ${darkMode ? "bg-slate-800 border-slate-600 text-emerald-300 hover:bg-slate-700" : "bg-white border-slate-300 text-emerald-700 hover:bg-emerald-50"}`}>
              {t("navRandomCity")}
            </button>
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
      <header className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-4xl">{flag}</span>
          <div>
            <h1 className={`text-3xl sm:text-4xl font-extrabold ${headingCls}`}>{cityName}</h1>
            <p className={`text-lg ${subCls}`}>{countryName}</p>
          </div>
        </div>
        {CITY_INTROS[id] && (
          <p className={`mt-4 leading-relaxed text-sm sm:text-base ${subCls}`}>{CITY_INTROS[id][locale] || CITY_INTROS[id].zh}</p>
        )}
      </header>

      {/* Key Stats — 12 cards, 6 per row */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-10">
        {[
          { label: `💰 ${t("avgIncome")} (${s.getProfessionLabel(activeProfession)})`, value: formatCurrency(income), sub: `#${rankHigher(allIncomes, income)} / ${n}`, tier: tierHigh(allIncomes, income) },
          { label: `🛒 ${t("monthlyCost")} (${t(`costTier${costTier.charAt(0).toUpperCase()}${costTier.slice(1)}`)})`, value: formatCurrency(tierCost), sub: `#${rankLower(allCosts, tierCost)} / ${n}`, tier: tierLow(allCosts, tierCost) },
          { label: `🏦 ${t("yearlySavings")}`, value: formatCurrency(savings), sub: `#${rankHigher(allSavings, savings)} / ${n}`, tier: tierHigh(allSavings, savings) },
          { label: `⏰ ${t("annualWorkHours")}`, value: `${city.annualWorkHours}h`, sub: `#${rankLower(allWorkHours, city.annualWorkHours)} / ${n}`, tier: tierLow(allWorkHours, city.annualWorkHours) },
          { label: `💵 ${t("hourlyWage")}`, value: formatCurrency(Math.round(hourlyWage * 100) / 100), sub: `#${rankHigher(allHourly, hourlyWage)} / ${n}`, tier: tierHigh(allHourly, hourlyWage) },
          { label: `🍔 ${t("bigMacIndex")}`, value: bigMacRatio !== null ? `${bigMacRatio.toFixed(2)}x` : t("noMcDonalds"), sub: bigMacRatio !== null ? `#${rankLower(allBigMacRatio, bigMacRatio)} / ${allBigMacRatio.length}` : "—", tier: bigMacRatio !== null ? tierLow(allBigMacRatio, bigMacRatio) : "mid" as Tier },
          { label: `🏠 ${t("housePrice")}`, value: `${formatCurrency(city.housePrice)}/m²`, sub: `#${rankLower(allHouse, city.housePrice)} / ${n}`, tier: tierLow(allHouse, city.housePrice) },
          { label: `🔑 ${t("yearsToBuy")}`, value: isFinite(yearsVal) ? `${yearsVal.toFixed(1)}y` : "N/A", sub: isFinite(yearsVal) ? `#${rankLower(allYearsToHome.filter(isFinite), yearsVal)} / ${allYearsToHome.filter(isFinite).length}` : "—", tier: isFinite(yearsVal) ? tierLow(allYearsToHome.filter(isFinite), yearsVal) : "bad" as Tier },
          { label: `🌬️ ${t("airQuality")}`, value: `AQI ${city.airQuality}`, sub: `#${rankLower(allAqi, city.airQuality)} / ${n}`, tier: tierLow(allAqi, city.airQuality) },
          { label: `🛡️ ${t("safetyIndex")}`, value: `${city.safetyIndex}${city.safetyConfidence === "low" ? " *" : ""} / 100`, sub: `#${rankHigher(allSafety, city.safetyIndex)} / ${n}`, tier: tierHigh(allSafety, city.safetyIndex) },
          { label: `🩺 ${t("doctorsPerThousand")}`, value: String(city.doctorsPerThousand), sub: `#${rankHigher(allDoctors, city.doctorsPerThousand)} / ${n}`, tier: tierHigh(allDoctors, city.doctorsPerThousand) },
          { label: `✈️ ${t("directFlights")}`, value: String(city.directFlightCities), sub: `#${rankHigher(allFlights, city.directFlightCities)} / ${n}`, tier: tierHigh(allFlights, city.directFlightCities) },
        ].map((stat) => (
          <div key={stat.label} className={`${baseCard} ${cardBorder(stat.tier)}`}>
            <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${subCls}`}>{stat.label}</p>
            <p className={`text-xl font-extrabold ${cardValCls(stat.tier)}`}>{stat.value}</p>
            <p className={`text-xs mt-0.5 ${subCls}`}>{stat.sub}</p>
          </div>
        ))}
      </section>

      {/* Climate */}
      <section className="mb-10">
        <div className={`rounded-xl border p-6 ${sectionBg}`}>
          <h2 className={`text-xl font-bold mb-4 ${headingCls}`}>{t("climateEnv")}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              [t("climateType"), getClimateLabel(climate.type, locale)],
              [t("avgTemp"), `${climate.avgTempC.toFixed(1)}°C`],
              [t("annualRain"), `${Math.round(climate.annualRainMm)} mm`],
              [t("sunshine"), `${Math.round(climate.sunshineHours)} h`],
            ].map(([label, val]) => (
              <div key={label} className="text-center">
                <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${subCls}`}>{label}</p>
                <p className={`text-lg font-bold ${headingCls}`}>{val}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Compare with */}
      <section className="mb-10">
        <h2 className={`text-2xl font-bold mb-4 ${headingCls}`}>{t("compareWith", { city: cityName })}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {relatedIds.map((otherId) => {
            const otherSlug = CITY_SLUGS[otherId];
            if (!otherSlug) return null;
            const otherName = CITY_NAME_TRANSLATIONS[otherId]?.[locale] || getCityEnName(otherId);
            const pair = [slug, otherSlug].sort().join("-vs-");
            return (
              <Link
                key={otherId}
                href={`/compare/${pair}`}
                className={`rounded-xl border p-3 text-center transition ${sectionBg} hover:border-blue-400 hover:shadow`}
              >
                <span className="text-2xl">{CITY_FLAG_EMOJIS[otherId] || "🏙️"}</span>
                <p className={`text-sm font-semibold mt-1 ${headingCls}`}>{otherName}</p>
                <p className="text-xs text-blue-600 mt-0.5">vs {cityName} →</p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Data Sources */}
      <section className={`rounded-xl border p-4 sm:p-6 mb-10 ${sectionBg}`}>
        <h3 className={`text-base sm:text-lg font-semibold mb-3 ${headingCls}`}>{t("dataSourcesTitle")}</h3>
        <p className={`text-sm mb-3 ${subCls}`}>{t("dataSourcesDesc")}</p>
        <div className={`space-y-1.5 text-xs ${subCls}`}>
          {["dataSalarySrc", "dataCostSrc", "dataHouseSrc", "dataBigMacSrc", "dataClimateSrc", "dataAqiSrc", "dataDoctorSrc", "dataFlightSrc", "dataSafetySrc", "dataWorkHoursSrc"].map((k) => (
            <p key={k}>• {t(k)}</p>
          ))}
          <p className={`mt-2 italic`}>• {t("safetyMethodNote")}</p>
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
  );
}
