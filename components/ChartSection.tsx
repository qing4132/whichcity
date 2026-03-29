"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { useCompare } from "@/lib/CompareContext";
import type { City } from "@/lib/types";
import { computeNetIncome } from "@/lib/taxUtils";

interface ChartSectionProps {
  comparisonData: City[];
}

export default function ChartSection({ comparisonData }: ChartSectionProps) {
  const ctx = useCompare();
  const { darkMode, selectedProfession, incomeMode, t, getCityLabel, convertAmount, currencySymbol, formatCurrency, getCost, getClimate } = ctx;

  const fmtYAxis = (value: number): string => {
    const converted = convertAmount(value);
    const abs = Math.abs(converted);
    if (abs >= 1_000_000) return `${currencySymbol}${(converted / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000) return `${currencySymbol}${(converted / 1_000).toFixed(0)}K`;
    return `${currencySymbol}${Math.round(converted)}`;
  };

  const chartData = comparisonData.map((city) => {
    const grossSalary = selectedProfession ? city.professions[selectedProfession] || 0 : 0;
    const salary = computeNetIncome(grossSalary, city.country, city.id, incomeMode).netUSD;
    const cityCost = getCost(city);

    return {
      name: getCityLabel(city),
      income: salary,
      yearlyExpense: cityCost * 12,
      savings: salary - cityCost * 12,
    };
  });

  const tooltipStyle = {
    backgroundColor: darkMode ? "#333" : "#fff",
    border: `1px solid ${darkMode ? "#555" : "#ddd"}`,
    color: darkMode ? "#fff" : "#000",
  };

  const fmtTooltip = (value: any) => formatCurrency(Number(value));

  const axisStroke = darkMode ? "#999" : "#666";
  const gridStroke = darkMode ? "#444" : "#ddd";

  return (
    <div className={`rounded-xl shadow-md p-4 sm:p-8 ${darkMode ? "bg-gray-800 border border-gray-700" : "bg-white border border-gray-100"}`}>
      <h2 className={`text-2xl sm:text-3xl font-bold mb-2 ${darkMode ? "text-white" : "text-gray-800"}`}>
        {t("chartAnalysis")}
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Annual Finance */}
        <div className={`p-4 rounded-lg lg:col-span-2 ${darkMode ? "bg-gray-700" : "bg-gray-50"}`}>
          <h3 className={`text-lg font-bold mb-4 ${darkMode ? "text-white" : "text-gray-800"}`}>
            {t("annualFinanceCompare")}
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis dataKey="name" stroke={axisStroke} tick={{ fontSize: 12 }} />
              <YAxis stroke={axisStroke} tickFormatter={fmtYAxis} />
              <Tooltip contentStyle={tooltipStyle} formatter={fmtTooltip} />
              <Legend />
              <Bar dataKey="income" fill="#3b82f6" name={t("annualIncome")} radius={[8, 8, 0, 0]} />
              <Bar dataKey="yearlyExpense" fill="#ef4444" name={t("annualExpense")} radius={[8, 8, 0, 0]} />
              <Bar dataKey="savings" fill="#10b981" name={t("annualSavings")} radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Climate */}
        <div className={`p-4 rounded-lg lg:col-span-2 ${darkMode ? "bg-gray-700" : "bg-gray-50"}`}>
          <h3 className={`text-lg font-bold mb-4 ${darkMode ? "text-white" : "text-gray-800"}`}>
            {t("climateCompare")}
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {[
              { label: t("avgTemp"), unit: t("unitC"), fill: "#38bdf8", key: "avgTempC", fmt: (v: number) => v.toFixed(1) },
              { label: t("annualRain"), unit: t("unitMm"), fill: "#a78bfa", key: "annualRainMm", fmt: (v: number) => String(Math.round(v)) },
              { label: t("sunshine"), unit: t("unitH"), fill: "#fbbf24", key: "sunshineHours", fmt: (v: number) => String(Math.round(v)) },
            ].map(({ label, unit, fill, key, fmt }) => (
              <div key={key}>
                <p className={`text-sm font-semibold mb-2 ${darkMode ? "text-gray-200" : "text-gray-700"}`}>
                  {label} ({unit})
                </p>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={comparisonData.map(city => {
                    const climate = getClimate(city);
                    return { name: getCityLabel(city), value: (climate as any)[key] };
                  })}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                    <XAxis dataKey="name" stroke={axisStroke} tick={{ fontSize: 11 }} />
                    <YAxis stroke={axisStroke} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => `${fmt(Number(v))} ${unit}`} />
                    <Bar dataKey="value" fill={fill} radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ))}
          </div>
        </div>

        {/* Air Quality */}
        <div className={`p-4 rounded-lg ${darkMode ? "bg-gray-700" : "bg-gray-50"}`}>
          <h3 className={`text-lg font-bold mb-4 ${darkMode ? "text-white" : "text-gray-800"}`}>
            {t("airQuality")} (AQI)
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={comparisonData.map(city => ({ name: getCityLabel(city), value: city.airQuality }))}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis dataKey="name" stroke={axisStroke} tick={{ fontSize: 12 }} />
              <YAxis stroke={axisStroke} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => `AQI ${v}`} />
              <Bar dataKey="value" fill="#14b8a6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Doctors per 1000 */}
        <div className={`p-4 rounded-lg ${darkMode ? "bg-gray-700" : "bg-gray-50"}`}>
          <h3 className={`text-lg font-bold mb-4 ${darkMode ? "text-white" : "text-gray-800"}`}>
            {t("doctorsPerThousand")}
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={comparisonData.map(city => ({ name: getCityLabel(city), value: city.doctorsPerThousand }))}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis dataKey="name" stroke={axisStroke} tick={{ fontSize: 12 }} />
              <YAxis stroke={axisStroke} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => `${v} ${t("doctorsUnit")}`} />
              <Bar dataKey="value" fill="#f472b6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
