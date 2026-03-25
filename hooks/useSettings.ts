"use client";

import { useState, useEffect, useCallback } from "react";
import type { Locale, ExchangeRates } from "@/lib/types";
import { TRANSLATIONS, LANGUAGE_LABELS } from "@/lib/i18n";

/** Lightweight settings hook for sub-pages (city detail, compare).
 *  Reads/writes the same localStorage keys as CityComparison so values are shared. */
export function useSettings() {
  const [locale, setLocaleState] = useState<Locale>("zh");
  const [darkMode, setDarkModeState] = useState(false);
  const [currency, setCurrencyState] = useState("USD");
  const [rates, setRates] = useState<ExchangeRates | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const l = localStorage.getItem("locale");
    if (l && ["zh", "en", "ja", "es"].includes(l)) setLocaleState(l as Locale);
    const d = localStorage.getItem("darkMode");
    if (d === "true") setDarkModeState(true);
    const c = localStorage.getItem("selectedCurrency");
    if (c) setCurrencyState(c);

    fetch("/data/exchange-rates.json")
      .then((r) => r.json())
      .then(setRates)
      .catch(() => {});

    setReady(true);
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    localStorage.setItem("locale", l);
  }, []);

  const setDarkMode = useCallback((d: boolean) => {
    setDarkModeState(d);
    localStorage.setItem("darkMode", JSON.stringify(d));
  }, []);

  const setCurrency = useCallback((c: string) => {
    setCurrencyState(c);
    localStorage.setItem("selectedCurrency", c);
  }, []);

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
    t,
    formatCurrency,
    convertAmount,
    currencySymbol,
    rates,
    ready,
    LANGUAGE_LABELS,
  };
}
