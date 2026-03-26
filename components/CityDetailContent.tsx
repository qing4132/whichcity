"use client";

import { useState } from "react";
import Link from "next/link";
import type { City, CostTier } from "@/lib/types";
import { CITY_FLAG_EMOJIS } from "@/lib/constants";
import { CITY_SLUGS } from "@/lib/citySlug";
import { CITY_NAME_TRANSLATIONS, COUNTRY_TRANSLATIONS, PROFESSION_TRANSLATIONS } from "@/lib/i18n";
import { getCityClimate, getCityEnName, getAqiLabel, getClimateLabel } from "@/lib/clientUtils";
import { CITY_INTROS } from "@/lib/cityIntros";
import { useSettings } from "@/hooks/useSettings";
import PageShell from "./PageShell";

interface Props {
  city: City;
  relatedIds: number[];
  slug: string;
}

const TIER_KEYS: { key: CostTier; field: "costComfort" | "costModerate" | "costBudget" | "costMinimal"; labelKey: string; descKey: string }[] = [
  { key: "comfort", field: "costComfort", labelKey: "costTierComfort", descKey: "comfortDesc" },
  { key: "moderate", field: "costModerate", labelKey: "costTierModerate", descKey: "moderateDesc" },
  { key: "budget", field: "costBudget", labelKey: "costTierBudget", descKey: "budgetDesc" },
  { key: "minimal", field: "costMinimal", labelKey: "costTierMinimal", descKey: "minimalDesc" },
];

export default function CityDetailContent({ city, relatedIds, slug }: Props) {
  const s = useSettings();
  const { locale, darkMode, t, formatCurrency } = s;
  const [selectedTier, setSelectedTier] = useState<CostTier>("moderate");

  if (!s.ready) return null;

  const id = city.id;
  const flag = CITY_FLAG_EMOJIS[id] || "🏙️";
  const cityName = CITY_NAME_TRANSLATIONS[id]?.[locale] || city.name;
  const countryName = COUNTRY_TRANSLATIONS[city.country]?.[locale] || city.country;
  const climate = getCityClimate(id);
  const aqiLabel = getAqiLabel(city.airQuality, locale);

  const tierCost = city[TIER_KEYS.find((tk) => tk.key === selectedTier)!.field];
  const annualExpense = tierCost * 12;
  const savings = city.averageIncome - annualExpense;
  const savingsRate = city.averageIncome > 0 ? ((savings / city.averageIncome) * 100).toFixed(1) : "0";
  const yearsToHome = savings > 0 ? ((city.housePrice * 70) / savings).toFixed(1) : "N/A";

  const professions = Object.entries(city.professions)
    .map(([key, salary]) => ({ key, salary, name: PROFESSION_TRANSLATIONS[key]?.[locale] || key }))
    .sort((a, b) => b.salary - a.salary);

  const cardCls = darkMode
    ? "bg-slate-800 border-slate-700 rounded-xl border p-4 text-center"
    : "bg-white border-slate-200 rounded-xl border p-4 text-center";
  const headingCls = darkMode ? "text-slate-100" : "text-slate-800";
  const subCls = darkMode ? "text-slate-400" : "text-slate-500";
  const sectionBg = darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200";
  const rowHover = darkMode ? "hover:bg-slate-700/50" : "hover:bg-slate-50";
  const thBg = darkMode ? "bg-slate-700 border-slate-600 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-600";
  const borderRow = darkMode ? "border-slate-700" : "border-slate-100";

  return (
    <PageShell
      locale={locale}
      darkMode={darkMode}
      currency={s.currency}
      onLocaleChange={s.setLocale}
      onDarkModeChange={s.setDarkMode}
      onCurrencyChange={s.setCurrency}
      t={t}
    >
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
          <p className={`mt-4 leading-relaxed text-sm sm:text-base ${subCls}`}>{CITY_INTROS[id]}</p>
        )}
      </header>

      {/* Key Stats */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-10">
        {[
          { label: t("avgIncome"), value: formatCurrency(city.averageIncome), sub: t("perYear") },
          { label: t("monthlyCost"), value: formatCurrency(tierCost), sub: t(`costTier${selectedTier.charAt(0).toUpperCase()}${selectedTier.slice(1)}`) },
          { label: t("yearlySavings"), value: formatCurrency(savings), sub: `${savingsRate}%` },
          { label: t("housePrice"), value: formatCurrency(city.housePrice), sub: t("housePriceUnit") },
          { label: t("airQuality"), value: `AQI ${city.airQuality}`, sub: aqiLabel },
          { label: t("doctorsPerThousand"), value: String(city.doctorsPerThousand), sub: t("doctorsUnit") },
        ].map((stat) => (
          <div key={stat.label} className={cardCls}>
            <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${subCls}`}>{stat.label}</p>
            <p className={`text-xl font-extrabold ${headingCls}`}>{stat.value}</p>
            <p className={`text-xs mt-0.5 ${subCls}`}>{stat.sub}</p>
          </div>
        ))}
      </section>

      {/* Cost of Living Tiers — clickable */}
      <section className="mb-10">
        <h2 className={`text-2xl font-bold mb-4 ${headingCls}`}>{t("costByLifestyle")}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {TIER_KEYS.map((tier) => {
            const cost = city[tier.field];
            const isActive = selectedTier === tier.key;
            return (
              <button
                key={tier.key}
                onClick={() => setSelectedTier(tier.key)}
                className={`rounded-xl border p-4 text-left transition ${
                  isActive
                    ? "ring-2 ring-blue-500 " + (darkMode ? "bg-blue-900/30 border-blue-500" : "bg-blue-50 border-blue-400")
                    : sectionBg
                } cursor-pointer`}
              >
                <p className={`text-sm font-bold ${headingCls}`}>{t(tier.labelKey)}</p>
                <p className="text-2xl font-extrabold text-blue-600 mt-1">{formatCurrency(cost)}</p>
                <p className={`text-xs ${subCls}`}>{t("perMonth")} · {t(tier.descKey)}</p>
                <p className={`text-xs mt-1 ${subCls}`}>{t("annual")}: {formatCurrency(cost * 12)}</p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Salary Table */}
      <section className="mb-10">
        <h2 className={`text-2xl font-bold mb-4 ${headingCls}`}>{t("salaryByProfession")}</h2>
        <div className={`rounded-xl border overflow-hidden ${sectionBg}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={`border-b ${thBg}`}>
                  <th className="text-left px-4 py-3 font-semibold">{t("profession")}</th>
                  <th className="text-right px-4 py-3 font-semibold">{t("annualSalaryCol")}</th>
                  <th className="text-right px-4 py-3 font-semibold">{t("monthlyGross")}</th>
                  <th className="text-right px-4 py-3 font-semibold">{t("savingsPotential")}</th>
                </tr>
              </thead>
              <tbody>
                {professions.map(({ key, salary, name }) => {
                  const monthlySavings = salary / 12 - tierCost;
                  return (
                    <tr key={key} className={`border-b ${borderRow} ${rowHover}`}>
                      <td className={`px-4 py-2.5 font-medium ${headingCls}`}>{name}</td>
                      <td className={`px-4 py-2.5 text-right font-bold ${headingCls}`}>
                        {formatCurrency(salary)}
                      </td>
                      <td className={`px-4 py-2.5 text-right ${subCls}`}>
                        {formatCurrency(salary / 12)}
                      </td>
                      <td className={`px-4 py-2.5 text-right font-semibold ${monthlySavings > 0 ? "text-green-500" : "text-red-500"}`}>
                        {formatCurrency(monthlySavings)}{t("perMonth")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className={`px-4 py-2 text-xs border-t ${borderRow} ${subCls}`}>{t("salaryNote")}</p>
        </div>
      </section>

      {/* Housing & Climate */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10">
        <div className={`rounded-xl border p-6 ${sectionBg}`}>
          <h2 className={`text-xl font-bold mb-4 ${headingCls}`}>{t("housing")}</h2>
          <div className="space-y-3">
            {[
              [t("pricePerSqm"), formatCurrency(city.housePrice)],
              [t("apt70sqm"), formatCurrency(city.housePrice * 70)],
              [t("yearsToBuy"), `${yearsToHome} ${t("insightYears")}`],
              [t("bigMac"), city.bigMacPrice !== null ? formatCurrency(city.bigMacPrice) : t("noMcDonalds")],
            ].map(([label, val]) => (
              <div key={label} className="flex justify-between">
                <span className={subCls}>{label}</span>
                <span className={`font-bold ${headingCls}`}>{val}</span>
              </div>
            ))}
          </div>
        </div>
        <div className={`rounded-xl border p-6 ${sectionBg}`}>
          <h2 className={`text-xl font-bold mb-4 ${headingCls}`}>{t("climateEnv")}</h2>
          <div className="space-y-3">
            {[
              [t("climateType"), getClimateLabel(climate.type, locale)],
              [t("avgTemp"), `${climate.avgTempC.toFixed(1)}°C`],
              [t("annualRain"), `${Math.round(climate.annualRainMm)} mm`],
              [t("sunshine"), `${Math.round(climate.sunshineHours)} h`],
              [t("airQuality"), `${city.airQuality} – ${aqiLabel}`],
              [t("doctorsPerThousand"), `${city.doctorsPerThousand}`],
            ].map(([label, val]) => (
              <div key={label} className="flex justify-between">
                <span className={subCls}>{label}</span>
                <span className={`font-bold ${headingCls}`}>{val}</span>
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
          {["dataSalarySrc", "dataCostSrc", "dataHouseSrc", "dataBigMacSrc", "dataClimateSrc", "dataAqiSrc", "dataDoctorSrc"].map((k) => (
            <p key={k}>• {t(k)}</p>
          ))}
        </div>
        <div className={`mt-4 pt-3 border-t ${borderRow}`}>
          <p className={`text-xs ${subCls}`}>{t("dataSourcesDisclaimer")}</p>
        </div>
      </section>

      {/* CTA */}
      <section className={`text-center py-8 border-t ${borderRow}`}>
        <p className={`mb-3 ${subCls}`}>{t("wantCompareMore")}</p>
        <Link
          href={`/?cities=${id}`}
          className="inline-block bg-blue-600 text-white font-semibold px-6 py-3 rounded-lg hover:bg-blue-700 transition"
        >
          ← {t("openTool")}
        </Link>
      </section>
    </PageShell>
  );
}
