"use client";

import { createContext, useContext } from "react";
import type { City, Locale, ComparisonMode, CostTier, ClimateInfo } from "./types";

export interface CompareContextValue {
  darkMode: boolean;
  locale: Locale;
  comparisonMode: ComparisonMode;
  costTier: CostTier;
  baseCityId: string;
  selectedProfession: string;
  t: (key: string, params?: Record<string, string | number>) => string;
  getCityLabel: (city: City) => string;
  getCountryLabel: (country: string) => string;
  getContinentLabel: (continent: string) => string;
  getProfessionLabel: (profession: string) => string;
  formatCurrency: (amount: number) => string;
  formatPrice: (amount: number) => string;
  getCost: (city: City) => number;
  getClimate: (city: City) => ClimateInfo;
  getAqiLevel: (aqi: number) => { key: string; color: string };
  getRatioValue: (value: number, baseValue: number) => number;
  toBigMacCount: (value: number, bigMacPrice: number) => number;
}

export const CompareCtx = createContext<CompareContextValue>(null!);
export const useCompare = () => useContext(CompareCtx);
