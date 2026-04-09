"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { Locale, CostTier, ExchangeRates, IncomeMode } from "@/lib/types";
import { TRANSLATIONS, LANGUAGE_LABELS, PROFESSION_TRANSLATIONS } from "@/lib/i18n";

export type ThemeMode = "auto" | "light" | "dark";

/* ── Module-level cache so exchange rates survive client-side navigations ── */
let cachedRates: ExchangeRates | null = null;

/* ── Helper: read saved themeMode from localStorage (works on client only) ── */
function readSavedThemeMode(): ThemeMode {
  if (typeof window === "undefined") return "auto";
  const saved = localStorage.getItem("themeMode");
  if (saved && ["auto", "light", "dark"].includes(saved)) return saved as ThemeMode;
  const old = localStorage.getItem("darkMode");
  if (old === "true") return "dark";
  if (old === "false") return "light";
  return "auto";
}

/** Lightweight settings hook for sub-pages (city detail, compare).
 *  Reads/writes the same localStorage keys as CityComparison so values are shared.
 *  When urlLocale is provided (from URL param), it takes precedence over localStorage. */
export function useSettings(urlLocale?: string) {
  const router = useRouter();
  const [locale, setLocaleState] = useState<Locale>(
    urlLocale && ["zh", "en", "ja", "es"].includes(urlLocale) ? urlLocale as Locale : "en"
  );
  // Initialize from localStorage/DOM so client-side navigations never flash
  const [themeMode, setThemeModeState] = useState<ThemeMode>(readSavedThemeMode);
  const [darkMode, setDarkModeState] = useState(() =>
    typeof document !== "undefined"
      ? document.documentElement.classList.contains("dark")
      : false,
  );
  const [currency, setCurrencyState] = useState("USD");
  const [costTier, setCostTierState] = useState<CostTier>("moderate");
  const [profession, setProfessionState] = useState("软件工程师");
  const [incomeMode, setIncomeModeState] = useState<IncomeMode>("net");
  const [salaryMultiplier, setSalaryMultiplierState] = useState(1.0);
  const [rates, setRates] = useState<ExchangeRates | null>(() => cachedRates);
  const [ready, setReady] = useState(() => cachedRates !== null);

  /* ── Resolve effective dark mode from themeMode + system preference ── */
  const applyTheme = useCallback((mode: ThemeMode) => {
    let dark: boolean;
    if (mode === "auto") {
      dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    } else {
      dark = mode === "dark";
    }
    setDarkModeState(dark);
    const el = document.documentElement;
    el.classList.toggle("dark", dark);
    el.classList.toggle("light", !dark);
    el.style.colorScheme = dark ? "dark" : "light";
  }, []);

  useEffect(() => {
    // When urlLocale is set (from URL), use it directly; otherwise fall back to localStorage
    if (!urlLocale) {
      const l = localStorage.getItem("locale");
      if (l && ["zh", "en", "ja", "es"].includes(l)) setLocaleState(l as Locale);
    }
    // Sync localStorage with the active locale
    localStorage.setItem("locale", urlLocale || locale);

    // Theme: read saved mode (already initialized via readSavedThemeMode,
    // but re-read here to ensure DOM is in sync after SSR hydration)
    const mode = readSavedThemeMode();
    setThemeModeState(mode);
    applyTheme(mode);

    const c = localStorage.getItem("selectedCurrency");
    if (c) setCurrencyState(c);
    const tier = localStorage.getItem("costTier");
    if (tier && ["moderate", "budget"].includes(tier)) setCostTierState(tier as CostTier);
    else setCostTierState("moderate");
    const prof = localStorage.getItem("selectedProfession");
    if (prof) setProfessionState(prof);
    const im = localStorage.getItem("incomeMode");
    if (im && ["gross", "net", "expatNet"].includes(im)) setIncomeModeState(im as IncomeMode);
    const sm = localStorage.getItem("salaryMultiplier");
    if (sm) { const n = parseFloat(sm); if (n >= 0.5 && n <= 3.0) setSalaryMultiplierState(n); }

    if (cachedRates) {
      setRates(cachedRates);
      setReady(true);
    } else {
      fetch("/data/exchange-rates.json")
        .then((r) => r.json())
        .then((data) => { cachedRates = data; setRates(data); })
        .catch((err) => { console.warn("Failed to load exchange rates:", err); })
        .finally(() => setReady(true));
    }

    // Enable CSS transitions after React has painted the correct theme.
    // This removes the flash-guard overlay and unblocks transition animations.
    requestAnimationFrame(() => {
      document.documentElement.classList.add("theme-ready");
    });
  }, [applyTheme]);

  /* ── Listen for system theme changes when in auto mode ── */
  useEffect(() => {
    if (themeMode !== "auto") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme("auto");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [themeMode, applyTheme]);

  /* ── Sync locale when URL changes (soft navigation) ── */
  useEffect(() => {
    if (urlLocale && ["zh", "en", "ja", "es"].includes(urlLocale)) {
      setLocaleState(urlLocale as Locale);
    }
  }, [urlLocale]);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    localStorage.setItem("locale", l);
    document.documentElement.lang = l;
    // Soft-navigate to the new locale URL
    const path = window.location.pathname;
    const segments = path.split("/");
    if (segments.length >= 2 && ["zh", "en", "ja", "es"].includes(segments[1])) {
      segments[1] = l;
      router.push(segments.join("/"));
    }
  }, [router]);

  const setThemeMode = useCallback((m: ThemeMode) => {
    setThemeModeState(m);
    localStorage.setItem("themeMode", m);
    applyTheme(m);
  }, [applyTheme]);

  const setCurrency = useCallback((c: string) => {
    setCurrencyState(c);
    localStorage.setItem("selectedCurrency", c);
  }, []);

  const setCostTier = useCallback((tier: CostTier) => {
    setCostTierState(tier);
    localStorage.setItem("costTier", tier);
  }, []);

  const setProfession = useCallback((p: string) => {
    setProfessionState(p);
    localStorage.setItem("selectedProfession", p);
  }, []);

  const setIncomeMode = useCallback((m: IncomeMode) => {
    setIncomeModeState(m);
    localStorage.setItem("incomeMode", m);
  }, []);

  const setSalaryMultiplier = useCallback((m: number) => {
    setSalaryMultiplierState(m);
    localStorage.setItem("salaryMultiplier", String(m));
  }, []);

  const getProfessionLabel = useCallback(
    (p: string): string => PROFESSION_TRANSLATIONS[p]?.[locale] || p,
    [locale],
  );

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      const template = TRANSLATIONS[locale]?.[key] ?? TRANSLATIONS.zh[key] ?? key;
      if (!params) return template;
      return Object.entries(params).reduce(
        (acc, [k, v]) => acc.replaceAll(`{${k}}`, String(v)),
        template,
      );
    },
    [locale],
  );

  const convertAmount = useCallback(
    (amount: number): number => {
      if (!rates) return amount;
      return Math.round(amount * (rates.rates[currency] || 1) * 100) / 100;
    },
    [rates, currency],
  );

  const currencySymbol = rates?.symbols[currency] || "$";

  const formatCurrency = useCallback(
    (amount: number): string => {
      if (!rates) return `$${Math.round(amount).toLocaleString()}`;
      const symbol = rates.symbols[currency] || currency;
      const rounded = Math.round(convertAmount(amount));
      if (currency === "INR" || currency === "PKR")
        return `${symbol}${rounded.toLocaleString("en-IN")}`;
      return `${symbol}${rounded.toLocaleString()}`;
    },
    [rates, currency, convertAmount],
  );

  return {
    locale,
    setLocale,
    darkMode,
    themeMode,
    setThemeMode,
    currency,
    setCurrency,
    costTier,
    setCostTier,
    profession,
    setProfession,
    incomeMode,
    setIncomeMode,
    salaryMultiplier,
    setSalaryMultiplier,
    getProfessionLabel,
    t,
    formatCurrency,
    convertAmount,
    currencySymbol,
    rates,
    ready,
    LANGUAGE_LABELS,
  };
}
