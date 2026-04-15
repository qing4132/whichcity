import { forwardRef, useState, useEffect } from "react";
import type { City } from "@/lib/types";
import { CITY_INTROS } from "@/lib/cityIntros";
import { CITY_LANGUAGES, LANGUAGE_NAME_TRANSLATIONS } from "@/lib/cityLanguages";
import type { Locale } from "@/lib/types";

interface GradeInfo {
    grade: string;
    gradeDisplay: string;
    gradeCls: string;
    hasSafetyWarn: boolean;
    confLevel: "high" | "medium" | "low";
    safetyWarning?: string;
    warnRedCls: string;
    warnAmberCls: string;
}

interface Props {
    city: City;
    cityName: string;
    countryName: string;
    flag: string;
    slug: string;
    locale: string;
    darkMode: boolean;
    t: (k: string) => string;
    gradeInfo?: GradeInfo;
    shfOpen?: boolean;
    onShfToggle?: () => void;
    shfLabel?: boolean;
    shfExpandContent?: React.ReactNode;
    englishLabel?: string;
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
const HeroSection = forwardRef<HTMLDivElement, Props>(function HeroSection({ city, cityName, countryName, flag, slug, locale, darkMode, t, gradeInfo, shfOpen, onShfToggle, shfLabel, shfExpandContent, englishLabel }, ref) {
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
        <>
        <div className={`pb-4 border-b ${divider}`}>

            <div ref={ref}>
                <div className="flex-1 min-w-0">
                    <h1 className={`text-[24px] font-black ${headCls}`}>{flag} {cityName}</h1>
                {(() => {
                    const langs = CITY_LANGUAGES[city.id] || [];
                    const localized = langs.map(l => LANGUAGE_NAME_TRANSLATIONS[l]?.[locale as Locale] || l);
                    const show = localized.slice(0, 3);
                    const more = localized.length - 3;
                    const langStr = show.length > 0 ? show.join(" · ") + (more > 0 ? ` +${more}` : "") : "";
                    const infoParts = [countryName, tzInfo].filter(Boolean);
                    return (
                        <>
                            {infoParts.length > 0 && <p className={`text-[13px] ${subCls}`}>{infoParts.join("  ·  ")}</p>}
                        </>
                    );
                })()}
                </div>
            </div>
            {CITY_INTROS[city.id] && (
                <p className={`mt-2 text-[13px] leading-relaxed ${subCls}`}>
                    {CITY_INTROS[city.id][locale] || CITY_INTROS[city.id].zh}
                </p>
            )}
        </div>
        </>
    );
});

export default HeroSection;
