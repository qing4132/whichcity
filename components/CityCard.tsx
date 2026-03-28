"use client";

import { useCompare } from "@/lib/CompareContext";
import { CITY_FLAG_EMOJIS } from "@/lib/constants";
import type { City } from "@/lib/types";
import { computeNetIncome } from "@/lib/taxUtils";

interface CityCardProps {
  city: City;
  isBase: boolean;
  baseCity: City;
  onClick: () => void;
}

export default function CityCard({ city, isBase, baseCity, onClick }: CityCardProps) {
  const ctx = useCompare();
  const {
    costTier, selectedProfession, incomeMode,
    t, getCityLabel, getCountryLabel, getContinentLabel, getProfessionLabel,
    formatCurrency, formatPrice, getCost, getClimate, getAqiLevel,
  } = ctx;

  const grossSalary = selectedProfession ? city.professions[selectedProfession] || 0 : city.averageIncome;
  const salary = computeNetIncome(grossSalary, city.country, city.id, incomeMode).netUSD;
  const cityCost = getCost(city);
  const savings = salary - cityCost * 12;
  const climate = getClimate(city);
  const aqiLevel = getAqiLevel(city.airQuality);

  const tierKey = `costTier${costTier.charAt(0).toUpperCase()}${costTier.slice(1)}`;

  // Localized description
  const getDesc = () => {
    if (ctx.locale === "zh") return city.description;
    return t("descriptionTemplate", {
      city: getCityLabel(city),
      country: getCountryLabel(city.country),
      income: formatCurrency(salary),
      cost: formatCurrency(cityCost),
      savings: formatCurrency(savings),
    });
  };

  return (
    <div
      onClick={onClick}
      className={`rounded-xl p-4 sm:p-6 shadow-lg transition hover:shadow-xl cursor-pointer ${
        isBase ? "ring-4 ring-yellow-400 ring-opacity-50" : ""
      } ${isBase ? "bg-gradient-to-br from-blue-600 to-blue-800" : "bg-gradient-to-br from-gray-700 to-gray-900"}`}
    >
      {/* Header */}
      <div className="text-center mb-4 sm:mb-6 pb-4 border-b-2 border-white border-opacity-20">
        <div className="text-2xl sm:text-3xl mb-2">{CITY_FLAG_EMOJIS[city.id] || "🏙️"}{isBase ? " ⭐" : ""}</div>
        <h3 className="text-xl sm:text-2xl font-bold text-white">{getCityLabel(city)}</h3>
        <p className="text-sm text-blue-100">{getCountryLabel(city.country)}</p>
        <p className="text-xs text-blue-200 mt-1">{getContinentLabel(city.continent)}</p>
      </div>

      {/* Profession Income */}
      <div className="bg-blue-500 bg-opacity-30 p-3 rounded-lg mb-3">
        <p className="text-xs text-blue-100 mb-1">💼 {getProfessionLabel(selectedProfession)}</p>
        <p className="text-lg sm:text-xl font-bold text-white">{formatCurrency(salary)}</p>
      </div>

      {/* Monthly Expense */}
      <div className="bg-red-500 bg-opacity-30 p-3 rounded-lg mb-3">
        <p className="text-xs text-red-100 mb-1">{t("monthlyExpense")} · {t(tierKey)}</p>
        <p className="text-lg sm:text-xl font-bold text-white">{formatCurrency(cityCost)}</p>
      </div>

      {/* Yearly Savings */}
      <div className="bg-green-500 bg-opacity-30 p-3 rounded-lg mb-3">
        <p className="text-xs text-green-100 mb-1">{t("yearlySavings")}</p>
        <p className={`text-lg sm:text-xl font-bold ${savings > 0 ? "text-lime-200" : "text-red-200"}`}>
          {formatCurrency(savings)}
        </p>
      </div>

      {/* Big Mac */}
      <div className="bg-yellow-500 bg-opacity-30 p-3 rounded-lg mb-3">
        <p className="text-xs text-yellow-100 mb-1">{t("bigMac")}</p>
        <p className="text-base sm:text-lg font-bold text-white">
          {city.bigMacPrice === null ? t("noMcDonalds") : formatPrice(city.bigMacPrice)}
        </p>
      </div>

      {/* House Price */}
      <div className="bg-purple-500 bg-opacity-30 p-3 rounded-lg mb-3">
        <p className="text-xs text-purple-100 mb-1">{t("housePrice")}</p>
        <p className="text-base sm:text-lg font-bold text-white">
          {city.housePrice !== null ? `${formatCurrency(city.housePrice)}${t("housePriceUnit")}` : "—"}
        </p>
      </div>

      {/* Air Quality */}
      <div className="bg-teal-500 bg-opacity-30 p-3 rounded-lg mb-3">
        <p className="text-xs text-teal-100 mb-1">{t("airQuality")}</p>
        <p className={`text-base sm:text-lg font-bold ${aqiLevel.color}`}>
          {city.airQuality !== null ? `${city.country === "\u4e2d\u56fd" ? "AQI (CN)" : "AQI"} ${city.airQuality} · ${t(aqiLevel.key)}` : "—"}
        </p>
      </div>

      {/* Doctors per 1000 */}
      <div className="bg-pink-500 bg-opacity-30 p-3 rounded-lg mb-3">
        <p className="text-xs text-pink-100 mb-1">{t("doctorsPerThousand")}</p>
        <p className="text-base sm:text-lg font-bold text-white">
          {city.doctorsPerThousand !== null ? `${city.doctorsPerThousand} ${t("doctorsUnit")}` : "—"}
        </p>
      </div>

      {/* Climate mini-cards */}
      {climate && (
      <div className="mt-3 grid grid-cols-2 gap-1.5">
        <div className="bg-white bg-opacity-10 p-2 rounded-lg">
          <p className="text-[10px] text-white/60 mb-0.5">{t("climateType")}</p>
          <p className="text-xs text-white font-semibold">{t(`climate_${climate.type}`)}</p>
        </div>
        <div className="bg-white bg-opacity-10 p-2 rounded-lg">
          <p className="text-[10px] text-white/60 mb-0.5">{t("avgTemp")}</p>
          <p className="text-xs text-white font-semibold">{climate.avgTempC.toFixed(1)}{t("unitC")}</p>
        </div>
        <div className="bg-white bg-opacity-10 p-2 rounded-lg">
          <p className="text-[10px] text-white/60 mb-0.5">{t("annualRain")}</p>
          <p className="text-xs text-white font-semibold">{Math.round(climate.annualRainMm)} {t("unitMm")}</p>
        </div>
        <div className="bg-white bg-opacity-10 p-2 rounded-lg">
          <p className="text-[10px] text-white/60 mb-0.5">{t("sunshine")}</p>
          <p className="text-xs text-white font-semibold">{Math.round(climate.sunshineHours)} {t("unitH")}</p>
        </div>
      </div>
      )}

      {/* Description */}
      <div className="mt-3 bg-white bg-opacity-10 p-3 rounded-lg">
        <p className="text-[10px] text-white/60 mb-1">{t("cityDescription")}</p>
        <p className="text-xs text-white leading-relaxed">{getDesc()}</p>
      </div>
    </div>
  );
}
