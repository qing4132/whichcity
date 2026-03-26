"use client";

import Link from "next/link";
import { CITY_SLUGS, POPULAR_PAIRS } from "@/lib/citySlug";
import { CITY_FLAG_EMOJIS, REGIONS, REGION_LABELS } from "@/lib/constants";
import { CITY_NAME_TRANSLATIONS } from "@/lib/i18n";
import { useCompare } from "@/lib/CompareContext";

/** SEO internal links section shown at the bottom of the main comparison page */
export default function CityLinks() {
  const { darkMode, locale, t } = useCompare();

  const getCityName = (id: number) => CITY_NAME_TRANSLATIONS[id]?.[locale] || CITY_NAME_TRANSLATIONS[id]?.en || "";

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
        {REGIONS.map((region) => (
          <div key={region.key}>
            <h3 className={`text-xs font-bold uppercase tracking-wider mb-2.5 ${regionCls}`}>{REGION_LABELS[region.key]?.[locale] || region.key}</h3>
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
