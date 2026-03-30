"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CostTier, IncomeMode } from "@/lib/types";
import { CITY_NAME_TRANSLATIONS, LANGUAGE_LABELS, PROFESSION_TRANSLATIONS } from "@/lib/i18n";
import { CITY_FLAG_EMOJIS, POPULAR_CURRENCIES } from "@/lib/constants";
import { CITY_SLUGS, POPULAR_PAIRS } from "@/lib/citySlug";
import { useSettings } from "@/hooks/useSettings";

/* ── Static city list for search (no fetch needed) ── */
const CITY_LIST = Object.entries(CITY_SLUGS).map(([idStr, slug]) => {
  const id = Number(idStr);
  return { id, slug, flag: CITY_FLAG_EMOJIS[id] || "🏙️" };
});

export default function HomeContent() {
  const router = useRouter();
  const s = useSettings();
  const { locale, darkMode, t } = s;

  const [search, setSearch] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  /* ── Search results ── */
  const results = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return CITY_LIST.filter(c => {
      const names = CITY_NAME_TRANSLATIONS[c.id];
      if (!names) return false;
      return Object.values(names).some(n => n.toLowerCase().includes(q))
        || c.slug.replace(/-/g, " ").includes(q);
    }).slice(0, 8);
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

  /* ── Random compare pair from popular pairs ── */
  const randomCompare = () => {
    const pair = POPULAR_PAIRS[Math.floor(Math.random() * POPULAR_PAIRS.length)];
    const slugA = CITY_SLUGS[pair[0]];
    const slugB = CITY_SLUGS[pair[1]];
    if (slugA && slugB) {
      const sorted = [slugA, slugB].sort().join("-vs-");
      router.push(`/compare/${sorted}`);
    }
  };

  /* ── Random city ── */
  const randomCity = () => {
    const slugs = Object.values(CITY_SLUGS);
    router.push(`/city/${slugs[Math.floor(Math.random() * slugs.length)]}`);
  };

  const getCityName = (id: number) => CITY_NAME_TRANSLATIONS[id]?.[locale] || CITY_NAME_TRANSLATIONS[id]?.en || "";

  const selectCls = `text-xs rounded px-1.5 py-1 border ${darkMode ? "bg-slate-800 border-slate-600 text-slate-200" : "bg-white border-slate-300 text-slate-700"}`;
  const professions = Object.keys(PROFESSION_TRANSLATIONS);
  const navBg = darkMode ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200";

  if (!s.ready) return null;

  return (
    <div className={`min-h-screen flex flex-col transition-colors ${darkMode ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"}`}>

      {/* Top bar */}
      <div className={`sticky top-0 z-50 border-b px-4 py-2.5 ${navBg}`}>
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-1 rounded border font-semibold ${darkMode ? "bg-blue-900/40 border-blue-500/50 text-blue-300" : "bg-blue-50 border-blue-300 text-blue-700"}`}>
              {t("navHome")}
            </span>
            <Link href="/ranking"
              className={`text-xs px-2 py-1 rounded border transition ${darkMode ? "bg-slate-800 border-slate-600 text-amber-300 hover:bg-slate-700" : "bg-white border-slate-300 text-amber-700 hover:bg-amber-50"}`}>
              {t("navRanking")}
            </Link>
            <button onClick={randomCity}
              className={`text-xs px-2 py-1 rounded border transition ${darkMode ? "bg-slate-800 border-slate-600 text-emerald-300 hover:bg-slate-700" : "bg-white border-slate-300 text-emerald-700 hover:bg-emerald-50"}`}>
              {t("navRandomCity")}
            </button>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
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
            <button onClick={() => s.setDarkMode(!darkMode)}
              className={`text-xs px-2 py-1 rounded border ${darkMode ? "bg-slate-800 border-slate-600 text-yellow-300" : "bg-white border-slate-300 text-slate-600"}`}>
              {darkMode ? "☀️" : "🌙"}
            </button>
          </div>
        </div>
      </div>

      {/* Main – vertically centered */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 -mt-8">

        {/* Hero */}
        <h1 className={`text-4xl sm:text-5xl font-extrabold tracking-tight text-center mb-3 ${darkMode ? "text-white" : "text-slate-900"}`}>
          {t("appTitle")}
        </h1>
        <p className={`text-base sm:text-lg text-center max-w-lg mb-8 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
          {t("appSubtitle", { count: CITY_LIST.length })}
        </p>

        {/* Search bar */}
        <div className="relative w-full max-w-md mb-10">
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onFocus={() => setFocused(true)}
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
              className={`absolute top-full mt-1 w-full rounded-xl shadow-lg border overflow-hidden z-50 ${
                darkMode ? "bg-slate-800 border-slate-600" : "bg-white border-slate-200"
              }`}>
              {results.map(c => (
                <Link key={c.id} href={`/city/${c.slug}`}
                  onClick={() => { setSearch(""); setFocused(false); }}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm transition ${
                    darkMode ? "hover:bg-slate-700 text-slate-200" : "hover:bg-blue-50 text-slate-700"
                  }`}>
                  <span>{c.flag}</span>
                  <span className="font-medium">{getCityName(c.id)}</span>
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

        {/* Action cards */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-lg">
          <Link href="/ranking"
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border text-center transition group ${
              darkMode
                ? "bg-slate-800/60 border-slate-700 hover:bg-slate-800 hover:border-amber-500/50"
                : "bg-white border-slate-200 hover:border-amber-400 hover:shadow-md"
            }`}>
            <span className="text-2xl">🏆</span>
            <span className={`text-xs font-bold ${darkMode ? "text-amber-300" : "text-amber-700"}`}>{t("homeCardRanking")}</span>
          </Link>
          <button onClick={randomCity}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border text-center transition group ${
              darkMode
                ? "bg-slate-800/60 border-slate-700 hover:bg-slate-800 hover:border-emerald-500/50"
                : "bg-white border-slate-200 hover:border-emerald-400 hover:shadow-md"
            }`}>
            <span className="text-2xl">🎲</span>
            <span className={`text-xs font-bold ${darkMode ? "text-emerald-300" : "text-emerald-700"}`}>{t("homeCardRandomCity")}</span>
          </button>
          <button onClick={randomCompare}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border text-center transition group ${
              darkMode
                ? "bg-slate-800/60 border-slate-700 hover:bg-slate-800 hover:border-blue-500/50"
                : "bg-white border-slate-200 hover:border-blue-400 hover:shadow-md"
            }`}>
            <span className="text-2xl">⚖️</span>
            <span className={`text-xs font-bold ${darkMode ? "text-blue-300" : "text-blue-700"}`}>{t("homeCardCompare")}</span>
          </button>
        </div>

        {/* Stats line */}
        <p className={`mt-8 text-xs text-center ${darkMode ? "text-slate-600" : "text-slate-400"}`}>
          {CITY_LIST.length} {t("homeCities")} · 26 {t("homeProfessions")} · 16 {t("homeDataPoints")} · 4 {t("homeIndexes")}
        </p>
      </div>
    </div>
  );
}
