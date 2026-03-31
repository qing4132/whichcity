"use client";

import { useState, useEffect, useCallback } from "react";
import type { Locale, CostTier, ExchangeRates, IncomeMode } from "@/lib/types";
import { TRANSLATIONS, LANGUAGE_LABELS, PROFESSION_TRANSLATIONS } from "@/lib/i18n";

/** Lightweight settings hook for sub-pages (city detail, compare).
 *  Reads/writes the same localStorage keys as CityComparison so values are shared. */
export function useSettings() {
  const [locale, setLocaleState] = useState<Locale>("en");
  const [darkMode, setDarkModeState] = useState(false);
  const [currency, setCurrencyState] = useState("USD");
  const [costTier, setCostTierState] = useState<CostTier>("moderate");
  const [profession, setProfessionState] = useState("软件工程师");
  const [incomeMode, setIncomeModeState] = useState<IncomeMode>("net");
  const [rates, setRates] = useState<ExchangeRates | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const l = localStorage.getItem("locale");
    if (l && ["zh", "en", "ja", "es"].includes(l)) setLocaleState(l as Locale);
    const d = localStorage.getItem("darkMode");
    if (d === "true") setDarkModeState(true);
    const c = localStorage.getItem("selectedCurrency");
    if (c) setCurrencyState(c);
    const tier = localStorage.getItem("costTier");
    if (tier && ["moderate", "budget"].includes(tier)) setCostTierState(tier as CostTier);
    else setCostTierState("moderate");
    const prof = localStorage.getItem("selectedProfession");
    if (prof) setProfessionState(prof);
    const im = localStorage.getItem("incomeMode");
    if (im && ["gross", "net", "expatNet"].includes(im)) setIncomeModeState(im as IncomeMode);

    fetch("/data/exchange-rates.json")
      .then((r) => r.json())
      .then(setRates)
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    localStorage.setItem("locale", l);
    document.documentElement.lang = l;
  }, []);

  const setDarkMode = useCallback((d: boolean) => {
    setDarkModeState(d);
    localStorage.setItem("darkMode", JSON.stringify(d));
    const el = document.documentElement;
    el.classList.toggle("dark", d);
    el.style.colorScheme = d ? "dark" : "light";
  }, []);

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

  const getProfessionLabel = useCallback(
    (p: string): string => PROFESSION_TRANSLATIONS[p]?.[locale] || p,
    [locale],
  );

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      const template = TRANSLATIONS[locale]?.[key] || TRANSLATIONS.zh[key] || key;
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
    setDarkMode,
    currency,
    setCurrency,
    costTier,
    setCostTier,
    profession,
    setProfession,
    incomeMode,
    setIncomeMode,
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
