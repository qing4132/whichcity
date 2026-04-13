import { forwardRef, useState, useEffect } from "react";
import type { City } from "@/lib/types";
import { CITY_INTROS } from "@/lib/cityIntros";
import { CITY_LANGUAGES, LANGUAGE_NAME_TRANSLATIONS } from "@/lib/cityLanguages";
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

function formatTz(tz: string, locale: string, now: Date): string {
    const localeTag = locale === "zh" ? "zh-CN" : locale === "ja" ? "ja-JP" : locale === "es" ? "es-ES" : "en-US";
    const fmt = new Intl.DateTimeFormat(localeTag, { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false });
    const offsetMin = (() => { const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "shortOffset" }).formatToParts(now); const o = parts.find(p => p.type === "timeZoneName")?.value || ""; const m = o.match(/GMT([+-]?)(\d{1,2})(?::(\d{2}))?/); if (!m) return 0; const sign = m[1] === "-" ? -1 : 1; return sign * (parseInt(m[2]) * 60 + parseInt(m[3] || "0")); })();
    const h = Math.floor(Math.abs(offsetMin) / 60);
    const m = Math.abs(offsetMin) % 60;
    const utcLabel = `UTC${offsetMin >= 0 ? "+" : "-"}${h}${m ? ":" + String(m).padStart(2, "0") : ""}`;
    return `${utcLabel} · ${fmt.format(now)}`;
}

/** Feed-style profile header */
const HeroSection = forwardRef<HTMLDivElement, Props>(function HeroSection({ city, cityName, countryName, flag, slug, locale, darkMode, t }, ref) {
    const headCls = darkMode ? "text-slate-100" : "text-slate-900";
    const subCls = darkMode ? "text-slate-400" : "text-slate-500";
    const divider = darkMode ? "border-slate-800" : "border-slate-100";

    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
        const tick = () => setNow(new Date());
        const msToNextMin = (60 - new Date().getSeconds()) * 1000;
        const timeout = setTimeout(() => { tick(); const id = setInterval(tick, 60_000); cleanup = () => clearInterval(id); }, msToNextMin);
        let cleanup = () => clearTimeout(timeout);
        return () => cleanup();
    }, []);

    const tzInfo = city.timezone ? formatTz(city.timezone, locale, now) : null;

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
            <div ref={ref}>
                <div className="flex items-baseline justify-between">
                    <h1 className={`text-[24px] font-black ${headCls}`}>{flag} {cityName}</h1>
                    {tzInfo && <span className={`text-[15px] font-semibold shrink-0 ${headCls}`}>{tzInfo}</span>}
                </div>
                {(() => {
                    const langs = CITY_LANGUAGES[city.id] || [];
                    const localized = langs.map(l => LANGUAGE_NAME_TRANSLATIONS[l]?.[locale as Locale] || l);
                    const show = localized.slice(0, 3);
                    const more = localized.length - 3;
                    return show.length > 0 ? <p className={`text-[13px] ${subCls}`}>{show.join(" · ")}{more > 0 && ` +${more}`}</p> : null;
                })()}
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
