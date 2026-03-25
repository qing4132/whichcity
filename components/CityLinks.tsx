"use client";

import Link from "next/link";
import { CITY_SLUGS, POPULAR_PAIRS } from "@/lib/citySlug";
import { CITY_FLAG_EMOJIS } from "@/lib/constants";
import { CITY_NAME_TRANSLATIONS } from "@/lib/i18n";
import { useCompare } from "@/lib/CompareContext";

/** SEO internal links section shown at the bottom of the main comparison page */
export default function CityLinks() {
  const { darkMode, locale, t } = useCompare();

  const getCityName = (id: number) => CITY_NAME_TRANSLATIONS[id]?.[locale] || CITY_NAME_TRANSLATIONS[id]?.en || "";

  // Group cities by continent-like regions for display
  const regions: { label: string; ids: number[] }[] = [
    { label: locale === "zh" ? "北美洲" : locale === "ja" ? "北米" : locale === "es" ? "América del Norte" : "North America", ids: [1, 11, 12, 13, 34, 35, 36, 37, 38, 39, 95, 96, 97, 98, 99, 100, 9, 40, 41] },
    { label: locale === "zh" ? "欧洲" : locale === "ja" ? "ヨーロッパ" : locale === "es" ? "Europa" : "Europe", ids: [2, 8, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94] },
    { label: locale === "zh" ? "东亚" : locale === "ja" ? "東アジア" : locale === "es" ? "Asia Oriental" : "East Asia", ids: [3, 4, 5, 10, 59, 60, 61] },
    { label: locale === "zh" ? "东南亚" : locale === "ja" ? "東南アジア" : locale === "es" ? "Sudeste Asiático" : "Southeast Asia", ids: [7, 45, 46, 47, 48, 57, 58] },
    { label: locale === "zh" ? "南亚" : locale === "ja" ? "南アジア" : locale === "es" ? "Asia del Sur" : "South Asia", ids: [49, 50, 51, 83, 84, 55, 56] },
    { label: locale === "zh" ? "大洋洲" : locale === "ja" ? "オセアニア" : locale === "es" ? "Oceanía" : "Oceania", ids: [6, 42, 43, 44] },
    { label: locale === "zh" ? "中东" : locale === "ja" ? "中東" : locale === "es" ? "Medio Oriente" : "Middle East", ids: [14, 75, 76, 77, 78, 79, 80, 81, 82, 54] },
    { label: locale === "zh" ? "拉美" : locale === "ja" ? "中南米" : locale === "es" ? "América Latina" : "Latin America", ids: [31, 32, 33, 62, 63, 64, 65, 66, 69, 70, 71, 72, 73, 74] },
    { label: locale === "zh" ? "非洲" : locale === "ja" ? "アフリカ" : locale === "es" ? "África" : "Africa", ids: [52, 53, 67, 68] },
  ];

  // Popular pairs for compare links
  const topPairs = POPULAR_PAIRS.slice(0, 12);
  const seen = new Set<string>();

  const cardBg = darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100";
  const headingCls = darkMode ? "text-white" : "text-gray-800";
  const subCls = darkMode ? "text-gray-400" : "text-gray-500";
  const regionCls = darkMode ? "text-gray-300" : "text-gray-700";
  const pillBg = darkMode
    ? "bg-slate-700/60 border-slate-600 text-slate-200 hover:bg-blue-900/40 hover:border-blue-500 hover:text-blue-300"
    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-600";
  const comparePill = darkMode
    ? "bg-slate-700/60 border-slate-600 text-blue-400 hover:bg-blue-900/40 hover:border-blue-500"
    : "bg-white border-slate-200 text-blue-600 hover:bg-blue-50 hover:border-blue-400";

  return (
    <div className={`rounded-xl shadow-md p-4 sm:p-8 border ${cardBg}`}>
      <h2 className={`text-2xl sm:text-3xl font-bold mb-2 ${headingCls}`}>
        {t("exploreAllCities")}
      </h2>
      <p className={`text-sm mb-6 ${subCls}`}>
        {t("exploreDesc")}
      </p>

      {/* City links by region */}
      <div className="space-y-5 mb-8">
        {regions.map((region) => (
          <div key={region.label}>
            <h3 className={`text-xs font-bold uppercase tracking-wider mb-2.5 ${regionCls}`}>{region.label}</h3>
            <div className="flex flex-wrap gap-1.5">
              {region.ids.map((id) => {
                const slug = CITY_SLUGS[id];
                if (!slug) return null;
                return (
                  <Link
                    key={id}
                    href={`/city/${slug}`}
                    className={`inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border transition-all ${pillBg}`}
                  >
                    <span>{CITY_FLAG_EMOJIS[id] || "🏙️"}</span>
                    <span className="font-medium">{getCityName(id)}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Popular comparisons */}
      <h3 className={`text-lg font-bold mb-3 ${headingCls}`}>
        {t("popularComparisons")}
      </h3>
      <div className="flex flex-wrap gap-2">
        {topPairs.map(([a, b]) => {
          const pair = [CITY_SLUGS[a], CITY_SLUGS[b]].sort().join("-vs-");
          if (seen.has(pair)) return null;
          seen.add(pair);
          return (
            <Link
              key={pair}
              href={`/compare/${pair}`}
              className={`inline-flex items-center gap-1.5 text-sm px-3.5 py-2 rounded-full border font-medium transition-all ${comparePill}`}
            >
              <span>{CITY_FLAG_EMOJIS[a]}</span>
              <span>{getCityName(a)}</span>
              <span className={`text-xs font-bold ${darkMode ? "text-slate-500" : "text-slate-300"}`}>vs</span>
              <span>{CITY_FLAG_EMOJIS[b]}</span>
              <span>{getCityName(b)}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
