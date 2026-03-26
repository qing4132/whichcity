"use client";

import { useEffect } from "react";
import Link from "next/link";
import type { Locale } from "@/lib/types";
import { POPULAR_CURRENCIES } from "@/lib/constants";
import { LANGUAGE_LABELS } from "@/lib/i18n";

interface Props {
  locale: Locale;
  darkMode: boolean;
  currency: string;
  onLocaleChange: (l: Locale) => void;
  onDarkModeChange: (d: boolean) => void;
  onCurrencyChange: (c: string) => void;
  t: (key: string) => string;
  children: React.ReactNode;
}

export default function PageShell({
  locale, darkMode, currency,
  onLocaleChange, onDarkModeChange, onCurrencyChange,
  t, children,
}: Props) {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  const bg = darkMode ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900";
  const navBg = darkMode ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200";
  const footerBg = darkMode ? "bg-slate-900 border-slate-700 text-slate-500" : "bg-white border-slate-200 text-slate-400";
  const selectCls = `text-xs rounded px-1.5 py-1 border ${
    darkMode ? "bg-slate-800 border-slate-600 text-slate-200" : "bg-white border-slate-300 text-slate-700"
  }`;

  return (
    <div className={`min-h-screen ${bg}`}>
      <nav className={`border-b px-4 py-2.5 ${navBg}`}>
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-2 flex-wrap">
          <Link href="/" className="text-blue-600 font-semibold hover:underline text-sm whitespace-nowrap">
            {t("backToHome")}
          </Link>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Language */}
            <select
              value={locale}
              onChange={(e) => onLocaleChange(e.target.value as Locale)}
              className={selectCls}
            >
              {(Object.entries(LANGUAGE_LABELS) as [Locale, string][]).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            {/* Currency */}
            <select
              value={currency}
              onChange={(e) => onCurrencyChange(e.target.value)}
              className={selectCls}
            >
              {POPULAR_CURRENCIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            {/* Dark mode */}
            <button
              onClick={() => onDarkModeChange(!darkMode)}
              className={`text-xs px-2 py-1 rounded border ${
                darkMode ? "bg-slate-800 border-slate-600 text-yellow-300" : "bg-white border-slate-300 text-slate-600"
              }`}
            >
              {darkMode ? "☀️" : "🌙"}
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {children}
      </main>

      <footer className={`border-t px-4 py-6 text-center text-xs ${footerBg}`}>
        <p>{t("dataSourcesDisclaimer")}</p>
        <p className="mt-1 font-medium">{t("dataLastUpdated")}</p>
        <p className="mt-1">
          {t("feedbackText")}{" "}
          <a href="https://github.com/qing4132/citycompare/issues" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-500">GitHub Issues</a>
          {" / "}
          <a href="mailto:qing4132@users.noreply.github.com" className="underline hover:text-blue-500">Email</a>
        </p>
      </footer>
    </div>
  );
}
