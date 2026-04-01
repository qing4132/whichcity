"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CostTier, IncomeMode } from "@/lib/types";
import { CITY_NAME_TRANSLATIONS, LANGUAGE_LABELS, PROFESSION_TRANSLATIONS, COUNTRY_TRANSLATIONS } from "@/lib/i18n";
import { CITY_FLAG_EMOJIS, POPULAR_CURRENCIES, CITY_COUNTRY } from "@/lib/constants";
import { CITY_SLUGS } from "@/lib/citySlug";
import { useSettings } from "@/hooks/useSettings";

/* ── Static city list for search (no fetch needed) ── */
const CITY_LIST = Object.entries(CITY_SLUGS).map(([idStr, slug]) => {
  const id = Number(idStr);
  return { id, slug, flag: CITY_FLAG_EMOJIS[id] || "🏙️" };
});

const POPULAR_HOME = ["new-york", "london", "tokyo", "singapore", "paris", "sydney"]
  .map(slug => CITY_LIST.find(c => c.slug === slug))
  .filter((c): c is NonNullable<typeof c> => c !== undefined);

export default function HomeContent() {
  const router = useRouter();
  const s = useSettings();
  const { locale, darkMode, themeMode, t } = s;

  const [search, setSearch] = useState("");
  const [focused, setFocused] = useState(false);
  const [hlIdx, setHlIdx] = useState(-1);
  const [navOpen, setNavOpen] = useState(false);
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

  /* ── Random city ── */
  const randomCity = () => {
    const slugs = Object.values(CITY_SLUGS);
    router.push(`/city/${slugs[Math.floor(Math.random() * slugs.length)]}`);
  };

  const getCityName = (id: number) => CITY_NAME_TRANSLATIONS[id]?.[locale] || CITY_NAME_TRANSLATIONS[id]?.en || "";
  const getCountryName = (id: number) => {
    const zh = CITY_COUNTRY[id];
    return zh ? (COUNTRY_TRANSLATIONS[zh]?.[locale] || zh) : "";
  };

  const selectCls = `text-xs rounded px-1.5 py-1 border ${darkMode ? "bg-slate-800 border-slate-600 text-slate-200" : "bg-white border-slate-300 text-slate-700"}`;
  const professions = Object.keys(PROFESSION_TRANSLATIONS);
  const navBg = darkMode ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200";

  if (!s.ready) return null;

  return (
    <div className={`min-h-screen flex flex-col transition-colors ${darkMode ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"}`}>

      {/* Top bar */}
      <div className={`sticky top-0 z-50 border-b py-2.5 ${navBg}`}>
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between gap-x-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Link href="/"
              className={`text-xs px-2 py-1 rounded border ${darkMode ? "bg-blue-900/40 border-blue-500/50 text-blue-300" : "bg-blue-50 border-blue-300 text-blue-700"}`}>
              {t("navHome")}
            </Link>
            <Link href="/ranking"
              className={`text-xs px-2 py-1 rounded border transition ${darkMode ? "bg-slate-800 border-slate-600 text-amber-300 hover:bg-slate-700" : "bg-white border-slate-300 text-amber-700 hover:bg-amber-50"}`}>
              {t("navRanking")}
            </Link>
            <button onClick={randomCity}
              className={`text-xs px-2 py-1 rounded border transition ${darkMode ? "bg-slate-800 border-slate-600 text-emerald-300 hover:bg-slate-700" : "bg-white border-slate-300 text-emerald-700 hover:bg-emerald-50"}`}>
              {t("navRandomCity")}
            </button>
            <Link href="/compare"
              className={`text-xs px-2 py-1 rounded border transition ${darkMode ? "bg-slate-800 border-slate-600 text-violet-300 hover:bg-slate-700" : "bg-white border-slate-300 text-violet-700 hover:bg-violet-50"}`}>
              {t("navCompare")}
            </Link>
          </div>
          <button onClick={() => setNavOpen(v => !v)}
            className={`sm:hidden text-xs px-2 py-1 rounded border transition ${darkMode ? "bg-slate-800 border-slate-600 text-slate-300" : "bg-white border-slate-300 text-slate-500"}`}>
            <svg className={`w-3.5 h-3.5 transition-transform duration-300 ${navOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
          </button>
          <div className={`basis-full sm:basis-auto grid sm:flex sm:items-center sm:gap-2 transition-[grid-template-rows] duration-300 ease-in-out ${navOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
            <div className="overflow-hidden sm:overflow-visible flex items-center gap-2 flex-wrap pt-1 sm:pt-0">
            <select value={s.profession} onChange={e => s.setProfession(e.target.value)} className={selectCls}>
              {professions.map(p => <option key={p} value={p}>{s.getProfessionLabel(p)}</option>)}
            </select>
            <select value={s.costTier} onChange={e => s.setCostTier(e.target.value as CostTier)} className={selectCls}>
              {(["moderate", "budget"] as const).map(tier => (
                <option key={tier} value={tier}>{t(`costTier${tier.charAt(0).toUpperCase()}${tier.slice(1)}`)}</option>
              ))}
            </select>
            <select value={s.incomeMode} onChange={e => s.setIncomeMode(e.target.value as IncomeMode)} className={selectCls}>
              <option value="gross">{t("incomeModeGross")}</option>
              <option value="net">{t("incomeModeNet")}</option>
              <option value="expatNet">{t("incomeModeExpatNet")}</option>
            </select>
            <select value={locale} onChange={e => s.setLocale(e.target.value as any)} className={selectCls}>
              {(Object.keys(LANGUAGE_LABELS) as any[]).map(lang => (
                <option key={lang} value={lang}>{LANGUAGE_LABELS[lang]}</option>
              ))}
            </select>
            <select value={s.currency} onChange={e => s.setCurrency(e.target.value)} className={selectCls}>
              {POPULAR_CURRENCIES.map(cur => <option key={cur} value={cur}>{cur}</option>)}
            </select>
            <select value={themeMode} onChange={e => s.setThemeMode(e.target.value as "auto"|"light"|"dark")} className={selectCls}>
              <option value="auto">{t("themeAuto")}</option>
              <option value="light">{t("dayMode")}</option>
              <option value="dark">{t("nightMode")}</option>
            </select>
            </div>
          </div>
        </div>
      </div>

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
                router.push(`/city/${results[hlIdx].slug}`);
              }
              else if (e.key === "Escape") { setFocused(false); }
            }}
            placeholder={t("homeSearchPlaceholder")}
            className={`w-full px-4 py-3 rounded-xl text-sm border-2 transition focus:outline-none ${
              darkMode
                ? "bg-slate-800 border-slate-600 text-white placeholder-slate-500 focus:border-blue-500"
                : "bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            }`}
          />
          <span className={`absolute right-3 top-3.5 text-sm ${darkMode ? "text-slate-500" : "text-slate-400"}`}>🔍</span>

          {/* Dropdown */}
          {focused && search.trim() && results.length > 0 && (
            <div ref={dropRef}
              className={`absolute top-full mt-1 w-full rounded-xl shadow-lg border overflow-y-auto z-50 ${
                darkMode ? "bg-slate-800 border-slate-600" : "bg-white border-slate-200"
              }`}
              style={{ maxHeight: "min(360px, 50vh)" }}>
              {results.map((c, i) => (
                <Link key={c.id} href={`/city/${c.slug}`}
                  onClick={() => { setSearch(""); setFocused(false); }}
                  onMouseEnter={() => setHlIdx(i)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm transition ${
                    i === hlIdx
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
              className={`absolute top-full mt-1 w-full rounded-xl shadow-lg border z-50 px-4 py-3 text-sm ${
                darkMode ? "bg-slate-800 border-slate-600 text-slate-400" : "bg-white border-slate-200 text-slate-500"
              }`}>
              {t("homeNoResults")}
            </div>
          )}
        </div>

        {/* Popular cities */}
        <div className="grid grid-cols-3 gap-x-4 gap-y-1.5 mt-5 max-w-xs w-full justify-items-center">
          {POPULAR_HOME.map(c => (
            <Link key={c.id} href={`/city/${c.slug}`}
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
      <footer className={`px-4 py-6 text-center text-xs ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
        <div className={`max-w-6xl mx-auto border-t pt-6 ${darkMode ? "border-slate-700" : "border-slate-200"}`}>
        <p>{t("dataSourcesDisclaimer")}</p>
        <p className="mt-1"><a href="/methodology" className="underline hover:text-blue-500">{t("navMethodology")}</a> · <a href="https://github.com/qing4132/citycompare/issues" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-500">GitHub</a> · <a href="mailto:qing4132@users.noreply.github.com" className="underline hover:text-blue-500">{t("footerFeedback")}</a></p>
        </div>
      </footer>
    </div>
  );
}
