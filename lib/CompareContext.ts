"use client";

import { createContext, useContext } from "react";
import type { City, Locale, CostTier, ClimateInfo } from "./types";

export interface CompareContextValue {
  darkMode: boolean;
  locale: Locale;
  costTier: CostTier;
  baseCityId: string;
  selectedProfession: string;
  t: (key: string, params?: Record<string, string | number>) => string;
  getCityLabel: (city: City) => string;
  getCountryLabel: (country: string) => string;
  getContinentLabel: (continent: string) => string;
  getProfessionLabel: (profession: string) => string;
  convertAmount: (amount: number) => number;
  currencySymbol: string;
  formatCurrency: (amount: number) => string;
  formatPrice: (amount: number) => string;
  getCost: (city: City) => number;
  getClimate: (city: City) => ClimateInfo | null;
  getAqiLevel: (aqi: number | null) => { key: string; color: string };
}

export const CompareCtx = createContext<CompareContextValue>(null!);
export const useCompare = () => useContext(CompareCtx);
