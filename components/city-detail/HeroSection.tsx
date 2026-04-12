import { forwardRef } from "react";
import Link from "next/link";
import type { City } from "@/lib/types";
import { CITY_INTROS } from "@/lib/cityIntros";
import { CONTINENT_TRANSLATIONS } from "@/lib/i18n";
import type { Locale } from "@/lib/types";

interface Props {
    city: City;
    cityName: string;
    countryName: string;
    flag: string;
    slug: string;
    locale: string;
    darkMode: boolean;
    t: (k: string) => string;
}

/** Feed-style profile header */
const HeroSection = forwardRef<HTMLDivElement, Props>(function HeroSection({ city, cityName, countryName, flag, slug, locale, darkMode, t }, ref) {
    const headCls = darkMode ? "text-slate-100" : "text-slate-900";
    const subCls = darkMode ? "text-slate-400" : "text-slate-500";
    const divider = darkMode ? "border-slate-800" : "border-slate-100";

    return (
        <div className={`pb-4 border-b ${divider}`}>
            {city.safetyWarning && (
                <div className={`rounded-lg px-4 py-2 mb-4 text-[15px] flex items-start gap-2 ${city.safetyWarning === "active_conflict"
                    ? (darkMode ? "bg-red-900/40 text-red-300 border border-red-500/50" : "bg-red-50 text-red-700 border border-red-300")
                    : city.safetyWarning === "extreme_instability"
                        ? (darkMode ? "bg-orange-900/40 text-orange-300 border border-orange-500/50" : "bg-orange-50 text-orange-700 border border-orange-300")
                        : (darkMode ? "bg-amber-900/40 text-amber-300 border border-amber-500/50" : "bg-amber-50 text-amber-700 border border-amber-300")
                    }`}>
                    <span className="font-bold shrink-0">{t("safetyWarningTitle")}</span>
                    <span>{city.safetyWarning === "active_conflict" ? t("safetyWarningConflict") : city.safetyWarning === "extreme_instability" ? t("safetyWarningInstability") : t("safetyWarningBlocked")}</span>
                </div>
            )}
            <div ref={ref} className="flex items-center gap-2.5">
                <span className="text-[32px]">{flag}</span>
                <div className="flex-1 min-w-0">
                    <h1 className={`text-[24px] font-black ${headCls}`}>{cityName}</h1>
                    <p className={`text-[13px] ${subCls}`}>@{slug} · {countryName} · {CONTINENT_TRANSLATIONS[city.continent]?.[locale as Locale] || city.continent}</p>
                </div>
                <Link href={`/${locale}/compare/${slug}`}
                    className={`text-[13px] px-3 py-1 rounded-md font-semibold shrink-0 ${darkMode ? "bg-slate-800 text-slate-200" : "bg-slate-900 text-white"}`}>
                    + {t("navCompare")}
                </Link>
            </div>
            {CITY_INTROS[city.id] && (
                <p className={`mt-3 text-[15px] leading-relaxed ${subCls}`}>
                    {CITY_INTROS[city.id][locale] || CITY_INTROS[city.id].zh}
                </p>
            )}
        </div>
    );
});

export default HeroSection;
