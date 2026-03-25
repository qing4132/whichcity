"use client";

import Link from "next/link";
import type { City } from "@/lib/types";
import { CITY_FLAG_EMOJIS } from "@/lib/constants";
import { CITY_SLUGS } from "@/lib/citySlug";
import { CITY_NAME_TRANSLATIONS, COUNTRY_TRANSLATIONS, PROFESSION_TRANSLATIONS } from "@/lib/i18n";
import { getCityClimate, getAqiLabel, getClimateLabel } from "@/lib/clientUtils";
import { useSettings } from "@/hooks/useSettings";
import PageShell from "./PageShell";

interface Props {
  cityA: City;
  cityB: City;
  slugA: string;
  slugB: string;
}

export default function CompareContent({ cityA, cityB, slugA, slugB }: Props) {
  const s = useSettings();
  const { locale, darkMode, t, formatCurrency } = s;

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

  const fc = formatCurrency;
  const savingsA = cityA.averageIncome - cityA.costModerate * 12;
  const savingsB = cityB.averageIncome - cityB.costModerate * 12;
  const yearsA = savingsA > 0 ? ((cityA.housePrice * 70) / savingsA).toFixed(1) : "N/A";
  const yearsB = savingsB > 0 ? ((cityB.housePrice * 70) / savingsB).toFixed(1) : "N/A";

  const wins = {
    income: cityA.averageIncome >= cityB.averageIncome ? "A" : "B",
    cost: cityA.costModerate <= cityB.costModerate ? "A" : "B",
    savings: savingsA >= savingsB ? "A" : "B",
    housing: cityA.housePrice <= cityB.housePrice ? "A" : "B",
    air: cityA.airQuality <= cityB.airQuality ? "A" : "B",
    doctors: cityA.doctorsPerThousand >= cityB.doctorsPerThousand ? "A" : "B",
  };
  const winsA = Object.values(wins).filter((v) => v === "A").length;
  const winsB = Object.values(wins).filter((v) => v === "B").length;

  const pctFn = (a: number, b: number) => {
    if (b === 0) return "N/A";
    const d = ((a - b) / b) * 100;
    return (d > 0 ? "+" : "") + d.toFixed(0) + "%";
  };

  const rows: { label: string; a: string; b: string; winner: "A" | "B" | "tie" }[] = [
    { label: t("avgIncome"), a: fc(cityA.averageIncome), b: fc(cityB.averageIncome), winner: wins.income as "A" | "B" },
    { label: t("monthlyCost"), a: fc(cityA.costModerate), b: fc(cityB.costModerate), winner: wins.cost as "A" | "B" },
    { label: t("yearlySavings"), a: fc(savingsA), b: fc(savingsB), winner: wins.savings as "A" | "B" },
    { label: t("housePrice") + " " + t("housePriceUnit"), a: fc(cityA.housePrice), b: fc(cityB.housePrice), winner: wins.housing as "A" | "B" },
    { label: t("yearsToBuy"), a: `${yearsA} ${t("insightYears")}`, b: `${yearsB} ${t("insightYears")}`, winner: yearsA !== "N/A" && yearsB !== "N/A" ? (Number(yearsA) <= Number(yearsB) ? "A" : "B") : "tie" },
    { label: t("airQuality") + " (AQI)", a: `${cityA.airQuality} – ${getAqiLabel(cityA.airQuality)}`, b: `${cityB.airQuality} – ${getAqiLabel(cityB.airQuality)}`, winner: wins.air as "A" | "B" },
    { label: t("doctorsPerThousand"), a: String(cityA.doctorsPerThousand), b: String(cityB.doctorsPerThousand), winner: wins.doctors as "A" | "B" },
    { label: t("bigMac"), a: fc(cityA.bigMacPrice), b: fc(cityB.bigMacPrice), winner: cityA.bigMacPrice <= cityB.bigMacPrice ? "A" : "B" },
    { label: t("climateType"), a: getClimateLabel(climateA.type), b: getClimateLabel(climateB.type), winner: "tie" },
    { label: t("avgTemp"), a: `${climateA.avgTempC.toFixed(1)}°C`, b: `${climateB.avgTempC.toFixed(1)}°C`, winner: "tie" },
    { label: t("sunshine"), a: `${Math.round(climateA.sunshineHours)} h`, b: `${Math.round(climateB.sunshineHours)} h`, winner: "tie" },
  ];

  const profData = Object.keys(cityA.professions)
    .map((key) => ({
      name: PROFESSION_TRANSLATIONS[key]?.[locale] || key,
      salaryA: cityA.professions[key] || 0,
      salaryB: cityB.professions[key] || 0,
    }))
    .sort((a, b) => b.salaryA - a.salaryA);

  const headingCls = darkMode ? "text-slate-100" : "text-slate-800";
  const subCls = darkMode ? "text-slate-400" : "text-slate-500";
  const sectionBg = darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200";
  const thBg = darkMode ? "bg-slate-700 border-slate-600 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-600";
  const borderRow = darkMode ? "border-slate-700" : "border-slate-100";
  const rowHover = darkMode ? "hover:bg-slate-700/50" : "hover:bg-slate-50";
  const winClsA = darkMode ? "text-green-400 bg-green-900/30" : "text-green-600 bg-green-50";
  const winClsB = winClsA;
  const normalCell = darkMode ? "text-slate-200" : "text-slate-700";

  return (
    <PageShell
      locale={locale} darkMode={darkMode} currency={s.currency}
      onLocaleChange={s.setLocale} onDarkModeChange={s.setDarkMode} onCurrencyChange={s.setCurrency}
      t={t}
    >
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
                    <td className={`px-4 py-2.5 text-center font-semibold ${row.winner === "A" ? winClsA : normalCell}`}>
                      {row.a} {row.winner === "A" && "✓"}
                    </td>
                    <td className={`px-4 py-2.5 text-center font-semibold ${row.winner === "B" ? winClsB : normalCell}`}>
                      {row.b} {row.winner === "B" && "✓"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Cost Tiers */}
      <section className="mb-10">
        <h2 className={`text-2xl font-bold mb-4 ${headingCls}`}>{t("costMonthly")}</h2>
        <div className={`rounded-xl border overflow-hidden ${sectionBg}`}>
          <table className="w-full text-sm">
            <thead>
              <tr className={`border-b ${thBg}`}>
                <th className="text-left px-4 py-3 font-semibold">{t("costTierLabel")}</th>
                <th className="text-center px-4 py-3 font-semibold">{nameA}</th>
                <th className="text-center px-4 py-3 font-semibold">{nameB}</th>
                <th className="text-center px-4 py-3 font-semibold">{t("diff")}</th>
              </tr>
            </thead>
            <tbody>
              {[
                { labelKey: "costTierComfort", a: cityA.costComfort, b: cityB.costComfort },
                { labelKey: "costTierModerate", a: cityA.costModerate, b: cityB.costModerate },
                { labelKey: "costTierBudget", a: cityA.costBudget, b: cityB.costBudget },
                { labelKey: "costTierMinimal", a: cityA.costMinimal, b: cityB.costMinimal },
              ].map((tier) => (
                <tr key={tier.labelKey} className={`border-b ${borderRow}`}>
                  <td className={`px-4 py-2.5 font-medium ${normalCell}`}>{t(tier.labelKey)}</td>
                  <td className="px-4 py-2.5 text-center font-semibold">{fc(tier.a)}</td>
                  <td className="px-4 py-2.5 text-center font-semibold">{fc(tier.b)}</td>
                  <td className={`px-4 py-2.5 text-center font-semibold ${tier.a > tier.b ? "text-red-500" : "text-green-500"}`}>
                    {pctFn(tier.a, tier.b)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Salary */}
      <section className="mb-10">
        <h2 className={`text-2xl font-bold mb-4 ${headingCls}`}>{t("salaryComparison")}</h2>
        <div className={`rounded-xl border overflow-hidden ${sectionBg}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={`border-b ${thBg}`}>
                  <th className="text-left px-4 py-3 font-semibold">{t("profession")}</th>
                  <th className="text-center px-4 py-3 font-semibold">{nameA}</th>
                  <th className="text-center px-4 py-3 font-semibold">{nameB}</th>
                  <th className="text-center px-4 py-3 font-semibold">{t("diff")}</th>
                </tr>
              </thead>
              <tbody>
                {profData.map((p) => (
                  <tr key={p.name} className={`border-b ${borderRow} ${rowHover}`}>
                    <td className={`px-4 py-2 font-medium ${headingCls}`}>{p.name}</td>
                    <td className={`px-4 py-2 text-center font-semibold ${p.salaryA >= p.salaryB ? "text-green-500" : normalCell}`}>
                      {fc(p.salaryA)}
                    </td>
                    <td className={`px-4 py-2 text-center font-semibold ${p.salaryB >= p.salaryA ? "text-green-500" : normalCell}`}>
                      {fc(p.salaryB)}
                    </td>
                    <td className={`px-4 py-2 text-center ${subCls}`}>{pctFn(p.salaryA, p.salaryB)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

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

      {/* CTA */}
      <section className={`text-center py-8 border-t ${borderRow}`}>
        <p className={`mb-3 ${subCls}`}>{t("wantCompareMore")}</p>
        <Link
          href={`/?cities=${idA},${idB}`}
          className="inline-block bg-blue-600 text-white font-semibold px-6 py-3 rounded-lg hover:bg-blue-700 transition"
        >
          ← {t("openTool")}
        </Link>
      </section>
    </PageShell>
  );
}
