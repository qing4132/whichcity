"use client";

import { useCompare } from "@/lib/CompareContext";
import type { City } from "@/lib/types";

interface InsightSummaryProps {
  comparisonData: City[];
}

export default function InsightSummary({ comparisonData }: InsightSummaryProps) {
  const { darkMode, baseCityId, selectedProfession, t, getCityLabel, getProfessionLabel, formatCurrency, getCost } = useCompare();

  if (comparisonData.length < 2) return null;

  const baseCity = comparisonData.find(c => c.id.toString() === baseCityId) || comparisonData[0];
  const others = comparisonData.filter(c => c.id !== baseCity.id);

  const getIncome = (city: City) => selectedProfession ? city.professions[selectedProfession] || 0 : city.averageIncome;
  const baseSalary = getIncome(baseCity);
  const baseCost = getCost(baseCity);
  const baseSavings = baseSalary - baseCost * 12;
  const baseYearsToHome = baseSavings > 0 ? (baseCity.housePrice * 70) / baseSavings : Infinity;

  const conclusions: string[] = [];

  // Best saver among all cities
  const allMetrics = comparisonData.map(c => {
    const income = getIncome(c);
    const cost = getCost(c) * 12;
    const savings = income - cost;
    const rate = income > 0 ? savings / income : 0;
    return { city: c, income, savings, rate };
  });
  const bestSaver = [...allMetrics].sort((a, b) => b.savings - a.savings)[0];
  if (bestSaver && bestSaver.savings > 0) {
    conclusions.push(t("conclusionBestSaver", {
      city: getCityLabel(bestSaver.city),
      rate: `${Math.round(bestSaver.rate * 100)}%`,
    }));
  }

  // Per-other-city comparisons vs base
  for (const other of others) {
    const otherSalary = getIncome(other);
    const otherCost = getCost(other);
    const otherSavings = otherSalary - otherCost * 12;
    const otherYearsToHome = otherSavings > 0 ? (other.housePrice * 70) / otherSavings : Infinity;

    // Income comparison
    if (baseSalary > 0 && otherSalary > 0) {
      const incPct = Math.abs(((otherSalary - baseSalary) / baseSalary) * 100);
      if (incPct >= 5) {
        const key = otherSalary > baseSalary ? "conclusionIncomeHigher" : "conclusionIncomeLower";
        conclusions.push(t(key, {
          cityA: getCityLabel(other),
          cityB: getCityLabel(baseCity),
          profession: getProfessionLabel(selectedProfession),
          percent: `${Math.round(incPct)}%`,
        }));
      }
    }

    // Cost comparison
    if (baseCost > 0 && otherCost > 0) {
      const costPct = Math.abs(((otherCost - baseCost) / baseCost) * 100);
      if (costPct >= 5) {
        const key = otherCost > baseCost ? "conclusionCostHigher" : "conclusionCostLower";
        conclusions.push(t(key, {
          cityA: getCityLabel(other),
          cityB: getCityLabel(baseCity),
          percent: `${Math.round(costPct)}%`,
        }));
      }
    }

    // Savings comparison
    if (baseSavings > 0 && otherSavings > baseSavings) {
      const diff = otherSavings - baseSavings;
      const pct = Math.round((diff / baseSavings) * 100);
      if (pct >= 5) {
        conclusions.push(t("conclusionSaveMore", {
          cityA: getCityLabel(other),
          cityB: getCityLabel(baseCity),
          amount: formatCurrency(diff),
          percent: `${pct}%`,
        }));
      }
    }

    // Housing comparison
    if (isFinite(baseYearsToHome) && isFinite(otherYearsToHome)) {
      const diff = Math.abs(otherYearsToHome - baseYearsToHome);
      if (diff >= 1) {
        const key = otherYearsToHome > baseYearsToHome ? "conclusionHousingMore" : "conclusionHousingLess";
        conclusions.push(t(key, {
          cityA: getCityLabel(other),
          cityB: getCityLabel(baseCity),
          years: diff.toFixed(1),
        }));
      }
    }
  }

  if (conclusions.length === 0) return null;

  const iconColors = [
    darkMode ? "text-green-400" : "text-green-600",
    darkMode ? "text-blue-400" : "text-blue-600",
    darkMode ? "text-purple-400" : "text-purple-600",
    darkMode ? "text-amber-400" : "text-amber-600",
    darkMode ? "text-pink-400" : "text-pink-600",
  ];

  return (
    <div className={`rounded-xl shadow-md p-4 sm:p-6 ${darkMode ? "bg-gray-800 border border-gray-700" : "bg-white border border-gray-100"}`}>
      <h2 className={`text-xl sm:text-2xl font-bold mb-4 ${darkMode ? "text-white" : "text-gray-800"}`}>
        {t("insightSummaryTitle")}
      </h2>
      <div className="space-y-2.5">
        {conclusions.map((text, i) => (
          <div key={i} className={`flex items-start gap-2.5 p-3 rounded-lg ${darkMode ? "bg-slate-700/50" : "bg-slate-50"}`}>
            <span className={`text-lg flex-shrink-0 ${iconColors[i % iconColors.length]}`}>▸</span>
            <p className={`text-sm sm:text-base leading-relaxed ${darkMode ? "text-slate-200" : "text-slate-700"}`}>
              {text}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
