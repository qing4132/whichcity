"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CITY_NAME_TRANSLATIONS, COUNTRY_TRANSLATIONS } from "@/lib/i18n";
import { CITY_FLAG_EMOJIS, CITY_COUNTRY, HIDDEN_CITY_IDS } from "@/lib/constants";
import { CITY_SLUGS } from "@/lib/citySlug";
import { useSettings } from "@/hooks/useSettings";
import { trackEvent } from "@/lib/analytics";
import NavBar from "./NavBar";

const CITY_LIST = Object.entries(CITY_SLUGS).map(([idStr, slug]) => {
  const id = Number(idStr);
  return { id, slug, flag: CITY_FLAG_EMOJIS[id] || "🏙️" };
}).filter(c => !HIDDEN_CITY_IDS.has(c.id));

const POPULAR_HOME = ["new-york", "london", "tokyo", "singapore", "paris", "sydney",
  "berlin", "amsterdam", "dubai", "toronto", "zurich", "bangkok"]
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

  const results = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    setHlIdx(-1);
    return CITY_LIST.filter(c => {
      const names = CITY_NAME_TRANSLATIONS[c.id];
      if (!names) return false;
      if (Object.values(names).some(n => n.toLowerCase().includes(q))) return true;
      if (c.slug.replace(/-/g, " ").includes(q)) return true;
      const countryZh = CITY_COUNTRY[c.id];
      if (countryZh) {
        const countryNames = COUNTRY_TRANSLATIONS[countryZh];
        if (countryNames && Object.values(countryNames).some(n => n.toLowerCase().includes(q))) return true;
      }
      return false;
    });
  }, [search]);

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

  if (!s.mounted) return null;

  const headCls = darkMode ? "text-slate-100" : "text-slate-900";
  const subCls = darkMode ? "text-slate-500" : "text-slate-500";
  const divider = darkMode ? "border-slate-800" : "border-slate-100";

  return (
    <div className={`min-h-screen flex flex-col transition-colors ${darkMode ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"}`}>

      <NavBar s={s} activePage="home" showShare />

      {!s.ready ? null : (
        <div className="max-w-2xl mx-auto w-full px-4 pt-10 pb-8 flex-1">

          {/* Hero */}
          <div className="text-center mb-8">
            <h1 className={`text-3xl sm:text-4xl font-black tracking-tight mb-2 ${headCls}`}>
              {t("appTitle")}
            </h1>
            <p className={`text-sm max-w-md mx-auto ${subCls}`}>
              {t("appSubtitle")}
            </p>
          </div>

          {/* Search bar */}
          <div className="relative mb-8">
            <input
              ref={inputRef} type="text" value={search}
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
              className={`w-full px-4 py-3 rounded-xl text-sm border transition focus:outline-none ${darkMode
                ? "bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-blue-500"
                : "bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500"
              }`}
            />
            <svg className={`absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${subCls}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>

            {focused && search.trim() && results.length > 0 && (
              <div ref={dropRef}
                className={`absolute top-full mt-1 w-full rounded-xl shadow-lg border overflow-y-auto z-50 ${darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}
                style={{ maxHeight: "min(360px, 50vh)" }}>
                {results.map((c, i) => (
                  <Link key={c.id} href={`/${locale}/city/${c.slug}`}
                    onClick={() => { trackEvent("search_city", { city_slug: c.slug }); setSearch(""); setFocused(false); }}
                    onMouseEnter={() => setHlIdx(i)}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm transition ${i === hlIdx
                      ? (darkMode ? "bg-slate-700" : "bg-blue-50") : ""}`}>
                    <span>{c.flag}</span>
                    <span className="font-medium">{getCityName(c.id)}</span>
                    <span className={`text-xs ${subCls}`}>{getCountryName(c.id)}</span>
                  </Link>
                ))}
              </div>
            )}
            {focused && search.trim() && results.length === 0 && (
              <div ref={dropRef}
                className={`absolute top-full mt-1 w-full rounded-xl shadow-lg border z-50 px-4 py-3 text-sm ${darkMode ? "bg-slate-800 border-slate-700 text-slate-400" : "bg-white border-slate-200 text-slate-500"}`}>
                {t("homeNoResults")}
              </div>
            )}
          </div>

          {/* Popular cities — vertical feed list */}
          <div className={`text-xs font-semibold mb-3 ${subCls}`}>{t("homePopularCities")}</div>
          <div>
            {POPULAR_HOME.map(c => (
              <Link key={c.id} href={`/${locale}/city/${c.slug}`}
                className={`flex items-center gap-3 py-3 border-b transition ${divider} ${darkMode ? "hover:bg-slate-900" : "hover:bg-slate-50"}`}>
                <span className="text-xl">{c.flag}</span>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-bold ${headCls}`}>{getCityName(c.id)}</div>
                  <div className={`text-xs ${subCls}`}>{getCountryName(c.id)}</div>
                </div>
                <svg className={`w-4 h-4 shrink-0 ${subCls}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m9 5 7 7-7 7" /></svg>
              </Link>
            ))}
          </div>

          {/* Stats */}
          <p className={`mt-6 text-xs text-center ${subCls}`}>
            100+ {t("homeCities")} · 20+ {t("homeProfessions")} · {t("homeDataCoverage")}
          </p>
        </div>
      )}

      <footer className={`px-4 py-5 text-center text-xs ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
        <div className={`max-w-2xl mx-auto border-t pt-4 ${divider}`}>
          <p>{t("dataSourcesDisclaimer")}</p>
          <p className="mt-1"><a href={`/${locale}/methodology`} className="underline hover:text-blue-500">{t("navMethodology")}</a> · <a href="https://github.com/qing4132/whichcity/issues" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-500">GitHub</a> · <a href="mailto:qing4132@users.noreply.github.com" className="underline hover:text-blue-500">{t("footerFeedback")}</a></p>
        </div>
      </footer>
    </div>
  );
}
