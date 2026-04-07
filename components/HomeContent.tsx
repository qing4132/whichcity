"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CITY_NAME_TRANSLATIONS, COUNTRY_TRANSLATIONS } from "@/lib/i18n";
import { CITY_FLAG_EMOJIS, CITY_COUNTRY } from "@/lib/constants";
import { CITY_SLUGS } from "@/lib/citySlug";
import { useSettings } from "@/hooks/useSettings";
import { trackEvent } from "@/lib/analytics";
import NavBar from "./NavBar";

/* ── Static city list for search (no fetch needed) ── */
const CITY_LIST = Object.entries(CITY_SLUGS).map(([idStr, slug]) => {
  const id = Number(idStr);
  return { id, slug, flag: CITY_FLAG_EMOJIS[id] || "🏙️" };
});

const POPULAR_HOME = ["new-york", "london", "tokyo", "singapore", "paris", "sydney"]
  .map(slug => CITY_LIST.find(c => c.slug === slug))
  .filter((c): c is NonNullable<typeof c> => c !== undefined);

export default function HomeContent({ locale: urlLocale }: { locale: string }) {
  const router = useRouter();
  const s = useSettings(urlLocale);
  const { locale, darkMode, t } = s;

  const [search, setSearch] = useState("");
  const [focused, setFocused] = useState(false);
  const [hlIdx, setHlIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  /* ── Search results ── */
  const results = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    setHlIdx(-1);
    return CITY_LIST.filter(c => {
      const names = CITY_NAME_TRANSLATIONS[c.id];
      if (!names) return false;
      // Match city name in any locale
      if (Object.values(names).some(n => n.toLowerCase().includes(q))) return true;
      // Match slug
      if (c.slug.replace(/-/g, " ").includes(q)) return true;
      // Match country name in any locale
      const countryZh = CITY_COUNTRY[c.id];
      if (countryZh) {
        const countryNames = COUNTRY_TRANSLATIONS[countryZh];
        if (countryNames && Object.values(countryNames).some(n => n.toLowerCase().includes(q))) return true;
      }
      return false;
    });
  }, [search]);

  /* ── Close dropdown on outside click ── */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setFocused(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const getCityName = (id: number) => CITY_NAME_TRANSLATIONS[id]?.[locale] || CITY_NAME_TRANSLATIONS[id]?.en || "";
  const getCountryName = (id: number) => {
    const zh = CITY_COUNTRY[id];
    return zh ? (COUNTRY_TRANSLATIONS[zh]?.[locale] || zh) : "";
  };

  useEffect(() => { document.title = "WhichCity"; }, [locale]);

  if (!s.ready) return null;

  return (
    <div className={`min-h-screen flex flex-col transition-colors ${darkMode ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"}`}>

      <NavBar s={s} activePage="home" showShare />

      {/* Main – vertically centered */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 -mt-16">

        {/* Hero */}
        <h1 className={`text-4xl sm:text-5xl font-extrabold tracking-tight text-center mb-3 ${darkMode ? "text-white" : "text-slate-900"}`}>
          {t("appTitle")}
        </h1>
        <p className={`text-base sm:text-lg text-center max-w-lg mb-6 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
          {t("appSubtitle")}
        </p>

        {/* Search bar */}
        <div className="relative w-full max-w-md mb-5">
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onFocus={() => setFocused(true)}
            onKeyDown={e => {
              if (!focused || !results.length) return;
              if (e.key === "ArrowDown") { e.preventDefault(); setHlIdx(i => (i + 1) % results.length); }
              else if (e.key === "ArrowUp") { e.preventDefault(); setHlIdx(i => (i - 1 + results.length) % results.length); }
              else if (e.key === "Enter" && hlIdx >= 0 && hlIdx < results.length) {
                e.preventDefault(); setSearch(""); setFocused(false);
                router.push(`/${locale}/city/${results[hlIdx].slug}`);
              }
              else if (e.key === "Escape") { setFocused(false); }
            }}
            placeholder={t("homeSearchPlaceholder")}
            className={`w-full px-4 py-3 rounded-xl text-sm border-2 transition focus:outline-none ${darkMode
              ? "bg-slate-800 border-slate-600 text-white placeholder-slate-500 focus:border-blue-500"
              : "bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              }`}
          />
          <svg className={`absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${darkMode ? "text-slate-500" : "text-slate-400"}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>

          {/* Dropdown */}
          {focused && search.trim() && results.length > 0 && (
            <div ref={dropRef}
              className={`absolute top-full mt-1 w-full rounded-xl shadow-lg border overflow-y-auto z-50 ${darkMode ? "bg-slate-800 border-slate-600" : "bg-white border-slate-200"
                }`}
              style={{ maxHeight: "min(360px, 50vh)" }}>
              {results.map((c, i) => (
                <Link key={c.id} href={`/${locale}/city/${c.slug}`}
                  onClick={() => { trackEvent("search_city", { city_slug: c.slug }); setSearch(""); setFocused(false); }}
                  onMouseEnter={() => setHlIdx(i)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm transition ${i === hlIdx
                    ? (darkMode ? "bg-slate-700 text-slate-200" : "bg-blue-50 text-slate-700")
                    : (darkMode ? "hover:bg-slate-700 text-slate-200" : "hover:bg-blue-50 text-slate-700")
                    }`}>
                  <span>{c.flag}</span>
                  <span className="font-medium">{getCityName(c.id)}</span>
                  <span className={`text-xs ${darkMode ? "text-slate-500" : "text-slate-400"}`}>{getCountryName(c.id)}</span>
                </Link>
              ))}
            </div>
          )}
          {focused && search.trim() && results.length === 0 && (
            <div ref={dropRef}
              className={`absolute top-full mt-1 w-full rounded-xl shadow-lg border z-50 px-4 py-3 text-sm ${darkMode ? "bg-slate-800 border-slate-600 text-slate-400" : "bg-white border-slate-200 text-slate-500"
                }`}>
              {t("homeNoResults")}
            </div>
          )}
        </div>

        {/* Popular cities */}
        <div className="grid grid-cols-3 gap-x-4 gap-y-1.5 mt-5 max-w-xs w-full justify-items-center">
          {POPULAR_HOME.map(c => (
            <Link key={c.id} href={`/${locale}/city/${c.slug}`}
              className={`text-xs transition ${darkMode ? "text-slate-400 hover:text-blue-400" : "text-slate-500 hover:text-blue-600"}`}>
              {c.flag} {getCityName(c.id)}
            </Link>
          ))}
        </div>

        {/* Stats line */}
        <p className={`mt-5 text-xs text-center ${darkMode ? "text-slate-600" : "text-slate-400"}`}>
          100+ {t("homeCities")} · 20+ {t("homeProfessions")} · {t("homeDataCoverage")}
        </p>
      </div>

      {/* Footer */}
      <footer className={`px-4 py-5 text-center text-xs ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
        <div className={`max-w-5xl mx-auto border-t pt-4 ${darkMode ? "border-slate-700" : "border-slate-200"}`}>
          <p>{t("dataSourcesDisclaimer")}</p>
          <p className="mt-1"><a href={`/${locale}/methodology`} className="underline hover:text-blue-500">{t("navMethodology")}</a> · <a href="https://github.com/qing4132/whichcity/issues" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-500">GitHub</a> · <a href="mailto:qing4132@users.noreply.github.com" className="underline hover:text-blue-500">{t("footerFeedback")}</a></p>
        </div>
      </footer>
    </div>
  );
}
