"use client";

import { useCompare } from "@/lib/CompareContext";
import type { City } from "@/lib/types";

interface KeyInsightsProps {
  comparisonData: City[];
}

export default function KeyInsights({ comparisonData }: KeyInsightsProps) {
  const ctx = useCompare();
  const { darkMode, baseCityId, selectedProfession, t, getCityLabel, formatCurrency, getCost, getAqiLevel } = ctx;

  const withMetrics = comparisonData.map((city) => {
    const income = selectedProfession ? city.professions[selectedProfession] || 0 : city.averageIncome;
    const annualCost = getCost(city) * 12;
    const savings = income - annualCost;
    const savingsRate = income > 0 ? (savings / income) * 100 : 0;
    const yearsToHome = savings > 0 ? (city.housePrice * 70) / savings : Infinity;
    return { city, income, savings, annualCost, monthlyCost: getCost(city), savingsRate, yearsToHome };
  });

  const bestSavings = [...withMetrics].sort((a, b) => b.savings - a.savings)[0];
  const fastestHome = [...withMetrics]
    .filter(m => m.yearsToHome > 0 && isFinite(m.yearsToHome))
    .sort((a, b) => a.yearsToHome - b.yearsToHome)[0] || withMetrics[0];

  const maxSavings = Math.max(...withMetrics.map(m => Math.max(0, m.savings)), 1);
  const maxYears = Math.max(...withMetrics.filter(m => isFinite(m.yearsToHome)).map(m => m.yearsToHome), 1);
  const maxAqi = Math.max(...withMetrics.map(m => m.city.airQuality), 1);
  const maxDoctors = Math.max(...withMetrics.map(m => m.city.doctorsPerThousand), 1);

  const withScores = withMetrics.map(m => {
    const sv = maxSavings > 0 ? Math.max(0, m.savings) / maxSavings : 0;
    const af = isFinite(m.yearsToHome) && maxYears > 0 ? 1 - (m.yearsToHome / maxYears) : 0;
    const aq = maxAqi > 0 ? 1 - (m.city.airQuality / maxAqi) : 0;
    const doc = maxDoctors > 0 ? m.city.doctorsPerThousand / maxDoctors : 0;
    return { ...m, composite: sv * 0.35 + af * 0.30 + aq * 0.20 + doc * 0.15 };
  });

  const top = [...withScores].sort((a, b) => b.composite - a.composite);
  const overallBest = top[0];

  const cardCls = `rounded-lg p-4 sm:p-5 ${darkMode ? "bg-slate-800/80 border border-slate-700" : "bg-slate-50 border border-slate-200"}`;
  const labelCls = `text-xs font-semibold uppercase tracking-wide mb-3 ${darkMode ? "text-slate-400" : "text-slate-500"}`;
  const cityCls = `text-base sm:text-lg font-bold mb-1 ${darkMode ? "text-white" : "text-slate-900"}`;
  const numCls = `text-xl sm:text-2xl font-extrabold mb-1 ${darkMode ? "text-blue-400" : "text-blue-600"}`;
  const subCls = `text-xs ${darkMode ? "text-slate-400" : "text-slate-500"}`;

  return (
    <div className={`rounded-xl shadow-md p-4 sm:p-8 ${darkMode ? "bg-gray-800 border border-gray-700" : "bg-white border border-gray-100"}`}>
      <h2 className={`text-2xl md:text-3xl font-semibold mb-5 ${darkMode ? "text-slate-100" : "text-slate-800"}`}>
        {t("keyInsights")}
      </h2>

      {/* Decision cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        {/* Overall Best */}
        <div className={cardCls}>
          <p className={labelCls}>{t("insightOverallBest")}</p>
          <p className={cityCls}>{getCityLabel(overallBest.city)}</p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${darkMode ? "bg-blue-900/60 text-blue-300" : "bg-blue-100 text-blue-700"}`}>
              {t("annualSavings")} {formatCurrency(overallBest.savings)}
            </span>
            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${darkMode ? "bg-purple-900/60 text-purple-300" : "bg-purple-100 text-purple-700"}`}>
              {isFinite(overallBest.yearsToHome) ? `${overallBest.yearsToHome.toFixed(1)} ${t("insightYears")}` : "—"}
            </span>
            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${darkMode ? "bg-teal-900/60 text-teal-300" : "bg-teal-100 text-teal-700"}`}>
              AQI {overallBest.city.airQuality}
            </span>
            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${darkMode ? "bg-pink-900/60 text-pink-300" : "bg-pink-100 text-pink-700"}`}>
              {overallBest.city.doctorsPerThousand} {t("doctorsUnit")}
            </span>
          </div>
          <p className={`${subCls} mt-2`}>{t("insightCompositeNote")}</p>
        </div>

        {/* Best Savings */}
        <div className={cardCls}>
          <p className={labelCls}>{t("insightBestSavingsAmount")}</p>
          <p className={cityCls}>{getCityLabel(bestSavings.city)}</p>
          <p className={numCls}>{formatCurrency(bestSavings.savings)}</p>
          <p className={subCls}>
            {t("annualIncome")} {formatCurrency(bestSavings.income)} − {t("annualExpense")} {formatCurrency(bestSavings.annualCost)}
          </p>
        </div>

        {/* Fastest Home */}
        <div className={cardCls}>
          <p className={labelCls}>{t("insightFastestHome")}</p>
          <p className={cityCls}>{getCityLabel(fastestHome.city)}</p>
          <p className={numCls}>
            {isFinite(fastestHome.yearsToHome) ? fastestHome.yearsToHome.toFixed(1) : "—"} {t("insightYears")}
          </p>
          <p className={subCls}>
            {t("insightFor70sqm")} · {formatCurrency(fastestHome.city.housePrice)}{t("housePriceUnit")}
          </p>
        </div>

        {/* Ratio vs Base */}
        <div className={cardCls}>
          <p className={labelCls}>{t("insightVsBase")}</p>
          {(() => {
            const baseM = withMetrics.find(m => m.city.id.toString() === baseCityId);
            if (!baseM) return <p className={subCls}>{t("insightClickToSetBase")}</p>;
            const compareCity = overallBest.city.id.toString() === baseCityId ? top[1] : overallBest;
            if (!compareCity) return <p className={subCls}>—</p>;
            return (
              <>
                <p className={cityCls}>{getCityLabel(compareCity.city)} vs {getCityLabel(baseM.city)}</p>
                <div className="space-y-1 mt-2">
                  {[
                    { label: t("insightIncomeGap"), ratio: baseM.income > 0 ? compareCity.income / baseM.income : 0 },
                    { label: t("insightCostGap"), ratio: baseM.monthlyCost > 0 ? compareCity.monthlyCost / baseM.monthlyCost : 0 },
                    { label: t("annualSavings"), ratio: baseM.savings > 0 ? compareCity.savings / baseM.savings : 0 },
                  ].map(({ label, ratio }) => (
                    <div key={label} className="flex items-center justify-between">
                      <span className={`text-xs ${darkMode ? "text-slate-300" : "text-slate-600"}`}>{label}</span>
                      <span className={`text-xs font-bold ${ratio >= 1 ? (darkMode ? "text-green-400" : "text-green-600") : (darkMode ? "text-red-400" : "text-red-600")}`}>
                        {ratio.toFixed(2)}x
                      </span>
                    </div>
                  ))}
                </div>
              </>
            );
          })()}
        </div>
      </div>

      {/* Decision matrix — horizontally scrollable on mobile */}
      <div className={`rounded-lg overflow-hidden ${darkMode ? "border border-slate-700" : "border border-slate-200"}`}>
        <div className={`px-5 py-3 ${darkMode ? "bg-slate-700/60" : "bg-slate-100"}`}>
          <p className={`text-sm font-semibold ${darkMode ? "text-slate-200" : "text-slate-700"}`}>{t("insightDecisionMatrix")}</p>
        </div>
        <div className={`overflow-x-auto ${darkMode ? "bg-slate-800/50" : "bg-white"}`}>
          <div className="min-w-[600px]">
            {/* Header */}
            <div className={`grid grid-cols-6 gap-2 px-5 py-2.5 text-xs font-semibold uppercase tracking-wide ${darkMode ? "text-slate-400 border-b border-slate-700" : "text-slate-500 border-b border-slate-200"}`}>
              <span>#</span>
              <span>{t("insightCity")}</span>
              <span>{t("annualSavings")} (35%)</span>
              <span>{t("insightHomePurchaseYears")} (30%)</span>
              <span>{t("airQuality")} (20%)</span>
              <span>{t("doctorsPerThousand")} (15%)</span>
            </div>
            {/* Rows */}
            {top.map((item, idx) => (
              <div
                key={item.city.id}
                className={`grid grid-cols-6 gap-2 px-5 py-3 items-center ${
                  idx < top.length - 1 ? (darkMode ? "border-b border-slate-700/50" : "border-b border-slate-100") : ""
                }`}
              >
                <span className={`text-sm font-bold ${darkMode ? "text-slate-300" : "text-slate-500"}`}>{idx + 1}</span>
                <span className={`text-sm font-semibold truncate ${darkMode ? "text-white" : "text-slate-900"}`}>{getCityLabel(item.city)}</span>
                <span className={`text-sm font-bold ${item.savings > 0 ? (darkMode ? "text-green-400" : "text-green-600") : (darkMode ? "text-red-400" : "text-red-600")}`}>
                  {formatCurrency(item.savings)}
                </span>
                <span className={`text-sm ${darkMode ? "text-slate-300" : "text-slate-600"}`}>
                  {isFinite(item.yearsToHome) ? `${item.yearsToHome.toFixed(1)} ${t("insightYears")}` : t("insightNegativeSavings")}
                </span>
                <span className="text-sm font-medium" style={{ color: getAqiLevel(item.city.airQuality).color }}>
                  {item.city.airQuality} · {t(getAqiLevel(item.city.airQuality).key)}
                </span>
                <span className={`text-sm font-medium ${darkMode ? "text-pink-400" : "text-pink-600"}`}>
                  {item.city.doctorsPerThousand}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
