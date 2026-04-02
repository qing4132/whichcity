"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { City, CostTier, IncomeMode } from "@/lib/types";
import { CITY_FLAG_EMOJIS, POPULAR_CURRENCIES, CITY_COUNTRY } from "@/lib/constants";
import { CITY_SLUGS } from "@/lib/citySlug";
import { CITY_NAME_TRANSLATIONS, COUNTRY_TRANSLATIONS, LANGUAGE_LABELS } from "@/lib/i18n";
import { useSettings } from "@/hooks/useSettings";
import { computeNetIncome } from "@/lib/taxUtils";
import { computeLifePressure, getCityClimate, getClimateLabel } from "@/lib/clientUtils";
import ClimateChart from "./ClimateChart";

/* ── Types ── */
interface Props {
  initialCities: City[];
  initialSlugs: string[];
  allCities: City[];
}

type RowCtx = {
  fc: (v: number) => string;
  t: (k: string, p?: Record<string, string | number>) => string;
  costField: keyof City;
  profession: string;
  incomeMode: IncomeMode;
  allCities: City[];
  allIncomes: Map<number, number>;
};

type Metric = {
  key: string;
  label: (t: RowCtx["t"], ctx?: RowCtx) => string;
  get: (c: City, ctx: RowCtx) => number | null;
  fmt: (v: number | null, ctx: RowCtx, c?: City) => string;
  lower?: boolean; // lower is better
  group: string;
};

/* ── 16 metrics (12 data + 4 indexes), grouped ── */
const METRICS: Metric[] = [
  { key: "income",   group: "income",      label: (t, x) => x ? `${t("avgIncome")} (${x.profession})` : t("avgIncome"),              get: (c, x) => x.allIncomes.get(c.id) ?? null, fmt: (v, x) => v != null ? x.fc(v) : "—" },
  { key: "expense",  group: "income",      label: (t, x) => { const tier = x?.costField === "costBudget" ? "budget" : "moderate"; return `${t("monthlyCost")} (${t(`costTier${tier.charAt(0).toUpperCase()}${tier.slice(1)}`)})`; },            get: (c, x) => c[x.costField] as number | null, fmt: (v, x) => v != null ? x.fc(v) : "—", lower: true },
  { key: "savings",  group: "income",      label: t => t("yearlySavings"),          get: (c, x) => { const inc = x.allIncomes.get(c.id); const cost = c[x.costField] as number; return inc != null ? inc - cost * 12 : null; }, fmt: (v, x) => v != null ? x.fc(v) : "—" },
  { key: "house",    group: "housing",     label: t => t("housePrice"),             get: c => c.housePrice,                          fmt: (v, x) => v != null ? `${x.fc(v)}/m²` : "—", lower: true },
  { key: "rent",     group: "housing",     label: t => t("monthlyRent"),            get: c => c.monthlyRent,                         fmt: (v, x) => v != null ? x.fc(v) : "—", lower: true },
  { key: "years",    group: "housing",     label: t => t("yearsToBuy"),             get: (c, x) => { const inc = x.allIncomes.get(c.id); const cost = c[x.costField] as number; const sav = inc != null ? inc - cost * 12 : 0; return c.housePrice != null && sav > 0 ? (c.housePrice * 70) / sav : null; }, fmt: (v, x) => v != null ? `${v.toFixed(1)} ${x.t("insightYears")}` : "—", lower: true },
  { key: "work",     group: "work",        label: t => t("annualWorkHours"),        get: c => c.annualWorkHours,                     fmt: (v, x) => v != null ? `${v} ${x.t("unitH")}` : "—", lower: true },
  { key: "wage",     group: "work",        label: t => t("hourlyWage"),             get: (c, x) => { const inc = x.allIncomes.get(c.id); return inc != null && c.annualWorkHours != null && c.annualWorkHours > 0 ? inc / c.annualWorkHours : null; }, fmt: (v, x) => v != null ? x.fc(Math.round(v * 100) / 100) : "—" },
  { key: "vacation", group: "work",        label: t => t("paidLeaveDays"),          get: c => c.paidLeaveDays,                       fmt: (v, x) => v != null ? `${v} ${x.t("paidLeaveDaysUnit")}` : "—" },
  { key: "air",      group: "environment", label: t => t("airQuality"),              get: c => c.airQuality,                          fmt: (v, _x, c) => v != null ? `${c?.country === "中国" ? "AQI (CN)" : "AQI"} ${v}` : "—", lower: true },
  { key: "internet", group: "environment", label: t => t("internetSpeed"),           get: c => c.internetSpeedMbps,                   fmt: (v, x) => v != null ? `${v} ${x.t("internetSpeedUnit")}` : "—" },
  { key: "flights",  group: "environment", label: t => t("directFlights"),           get: c => c.directFlightCities,                  fmt: v => v != null ? `${v}` : "—" },
  { key: "lp",       group: "index",       label: t => t("lifePressureIndex"),       get: (c, x) => { const inc = x.allIncomes.get(c.id) ?? 0; const allInc = x.allCities.map(cc => x.allIncomes.get(cc.id) ?? 0); return computeLifePressure(c, x.allCities, inc, allInc, x.costField).value; }, fmt: v => v != null ? v.toFixed(1) : "—", lower: true },
  { key: "safety",   group: "index",       label: t => t("safetyIndex"),             get: c => c.safetyIndex,                         fmt: v => v != null ? v.toFixed(1) : "—" },
  { key: "health",   group: "index",       label: t => t("healthcareIndex"),         get: c => c.healthcareIndex,                     fmt: v => v != null ? v.toFixed(1) : "—" },
  { key: "freedom",  group: "index",       label: t => t("institutionalFreedom"),    get: c => c.freedomIndex,                        fmt: v => v != null ? v.toFixed(1) : "—" },
  { key: "climateType", group: "climate", label: t => t("climateType"),             get: c => getCityClimate(c.id) ? 1 : null,       fmt: () => "—" },
  { key: "avgTemp",  group: "climate",    label: t => t("avgTemp"),                 get: c => getCityClimate(c.id)?.avgTempC ?? null, fmt: v => v != null ? `${v.toFixed(1)}°C` : "—" },
  { key: "tempRange",group: "climate",    label: t => t("tempRange"),               get: c => { const cl = getCityClimate(c.id); return cl ? cl.summerAvgC - cl.winterAvgC : null; }, fmt: v => v != null ? `${v.toFixed(1)}°C` : "—", lower: true },
  { key: "rain",     group: "climate",    label: t => t("annualRain"),              get: c => getCityClimate(c.id)?.annualRainMm ?? null, fmt: v => v != null ? `${Math.round(v)} mm` : "—" },
  { key: "humidity", group: "climate",    label: t => t("humidity"),                get: c => getCityClimate(c.id)?.humidityPct ?? null, fmt: v => v != null ? `${v}%` : "—", lower: true },
  { key: "sunshine", group: "climate",    label: t => t("sunshine"),                get: c => getCityClimate(c.id)?.sunshineHours ?? null, fmt: (v, x) => v != null ? `${Math.round(v)} ${x.t("unitH")}` : "—" },
];

const GROUP_KEYS = ["income", "housing", "work", "environment", "index"] as const;
const CLIMATE_GROUP_KEY = "climate";
const GROUP_I18N: Record<string, string> = {
  income: "rankGroup_income", housing: "rankGroup_housing", work: "rankGroup_work",
  environment: "rankGroup_environment", index: "rankGroup_index", climate: "climateEnv",
};

/* ════════════════════════════════════════════ */
export default function CompareContent({ initialCities, initialSlugs, allCities }: Props) {
  const router = useRouter();
  const s = useSettings();
  const { locale, darkMode, themeMode, t, formatCurrency, costTier, profession, incomeMode } = s;

  /* ── Fixed 3 slots (2 on narrow), allow empty ── */
  const [slots, setSlots] = useState<(City | null)[]>(() => {
    const arr: (City | null)[] = [...initialCities];
    while (arr.length < 3) arr.push(null);
    return arr.slice(0, 3);
  });
  const [slugs, setSlugs] = useState<(string | null)[]>(() => {
    const arr: (string | null)[] = [...initialSlugs];
    while (arr.length < 3) arr.push(null);
    return arr.slice(0, 3);
  });

  /* ── Responsive columns: ≥1080 → 3, <1080 → 2 ── */
  const [cols, setCols] = useState(3);
  /* ── Climate columns: ≥1080 → 3, ≥744 → 2, <744 → 1 ── */
  const [climateCols, setClimateCols] = useState(3);
  useEffect(() => {
    const mqWide = window.matchMedia("(min-width: 1080px)");
    const mqMid = window.matchMedia("(min-width: 744px)");
    const handler = () => {
      setCols(mqWide.matches ? 3 : 2);
      setClimateCols(mqWide.matches ? 3 : mqMid.matches ? 2 : 1);
    };
    handler();
    mqWide.addEventListener("change", handler);
    mqMid.addEventListener("change", handler);
    return () => {
      mqWide.removeEventListener("change", handler);
      mqMid.removeEventListener("change", handler);
    };
  }, []);

  const visibleSlots = slots.slice(0, cols);
  const filledCities = visibleSlots.filter((c): c is City => c !== null);

  /* ── City-switcher dropdown state ── */
  const [openSlot, setOpenSlot] = useState<number | null>(null);
  const [slotSearch, setSlotSearch] = useState("");
  const [hlIdx, setHlIdx] = useState(-1);
  const slotRefs = useRef<(HTMLDivElement | null)[]>([]);
  const navRef = useRef<HTMLDivElement | null>(null);
  const [navH, setNavH] = useState(0);
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    const measure = () => setNavH(el.offsetHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [s.ready]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (openSlot !== null) {
        const ref = slotRefs.current[openSlot];
        if (ref && !ref.contains(e.target as Node)) { setOpenSlot(null); setSlotSearch(""); }
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [openSlot]);

  const professions = allCities[0]?.professions ? Object.keys(allCities[0].professions) : [];
  const activeProfession = profession && professions.includes(profession) ? profession : professions[0] || "";
  const costField = `cost${costTier.charAt(0).toUpperCase()}${costTier.slice(1)}` as keyof City;

  /* ── Compute incomes for all cities ── */
  const allIncomesMap = useMemo(() => {
    const map = new Map<number, number>();
    allCities.forEach(c => {
      const gross = activeProfession && c.professions[activeProfession] != null ? c.professions[activeProfession] : 0;
      const net = computeNetIncome(gross, c.country, c.id, incomeMode, s.rates?.rates).netUSD;
      map.set(c.id, net);
    });
    return map;
  }, [allCities, activeProfession, incomeMode, s.rates]);

  const rowCtx: RowCtx = useMemo(() => ({
    fc: formatCurrency, t, costField, profession: s.getProfessionLabel(activeProfession), incomeMode, allCities, allIncomes: allIncomesMap,
  }), [formatCurrency, t, costField, activeProfession, incomeMode, allCities, allIncomesMap, s]);

  /* ── Metric rows with winner detection (uses all visible slots including empty) ── */
  const rows = useMemo(() => {
    return METRICS.map(m => {
      const vals = visibleSlots.map(c => c ? m.get(c, rowCtx) : null);
      const valid = vals.filter((v): v is number => v != null && isFinite(v));
      let bestVal: number | null = null;
      if (valid.length > 1) bestVal = m.lower ? Math.min(...valid) : Math.max(...valid);
      return { m, vals, bestVal };
    });
  }, [visibleSlots, rowCtx]);

  /* ── Win counts per slot (exclude climate) ── */
  const winCounts = useMemo(() => {
    const counts: number[] = visibleSlots.map(() => 0);
    rows.forEach(({ m, vals, bestVal }) => {
      if (m.group === CLIMATE_GROUP_KEY) return;
      if (bestVal == null) return;
      if (!vals.some(v => v !== bestVal)) return;
      vals.forEach((v, i) => { if (v === bestVal) counts[i]++; });
    });
    return counts;
  }, [visibleSlots, rows]);

  /* ── City helpers ── */
  const getName = (c: City) => CITY_NAME_TRANSLATIONS[c.id]?.[locale] || c.name;
  const getFlag = (c: City) => CITY_FLAG_EMOJIS[c.id] || "🏙️";
  const getCountry = (c: City) => {
    const zh = CITY_COUNTRY[c.id];
    if (zh) { const cn = COUNTRY_TRANSLATIONS[zh]; if (cn) return cn[locale] || zh; return zh; }
    return COUNTRY_TRANSLATIONS[c.country]?.[locale] || c.country;
  };

  /* ── Slot search results ── */
  const slotResults = useMemo(() => {
    if (openSlot === null) return [];
    const q = slotSearch.toLowerCase().trim();
    const currentIds = new Set(slots.filter((c): c is City => c !== null).map(c => c.id));
    const filtered = allCities.filter(c => {
      if (currentIds.has(c.id)) return false;
      if (!q) return true;
      const names = CITY_NAME_TRANSLATIONS[c.id];
      if (names && Object.values(names).some(n => n.toLowerCase().includes(q))) return true;
      const slug = CITY_SLUGS[c.id];
      if (slug && slug.replace(/-/g, " ").includes(q)) return true;
      const zh = CITY_COUNTRY[c.id];
      if (zh) { const cn = COUNTRY_TRANSLATIONS[zh]; if (cn && Object.values(cn).some(n => n.toLowerCase().includes(q))) return true; }
      return false;
    });
    setHlIdx(-1);
    return q ? filtered.slice(0, 8) : filtered.slice(0, 20);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openSlot, slotSearch, slots, allCities]);

  /* ── Switch city in a slot ── */
  const switchCity = (slotIdx: number, city: City) => {
    const slug = CITY_SLUGS[city.id];
    if (!slug) return;
    const nc = [...slots]; nc[slotIdx] = city;
    const ns = [...slugs]; ns[slotIdx] = slug;
    setSlots(nc); setSlugs(ns);
    setOpenSlot(null); setSlotSearch(""); setHlIdx(-1);
    syncUrl(ns);
  };

  /* ── Clear a slot ── */
  const clearSlot = (slotIdx: number) => {
    const nc = [...slots]; nc[slotIdx] = null;
    const ns = [...slugs]; ns[slotIdx] = null;
    setSlots(nc); setSlugs(ns);
    syncUrl(ns);
  };

  /* ── Sync URL to reflect current city selection ── */
  const syncUrl = (ns: (string | null)[]) => {
    const validSlugs = ns.filter((s): s is string => s !== null);
    const path = validSlugs.length >= 2
      ? `/compare/${[...validSlugs].sort().join("-vs-")}`
      : validSlugs.length === 1
        ? `/compare/${validSlugs[0]}`
        : "/compare";
    window.history.replaceState(null, "", path);
  };

  /* ── Sync browser tab title on city or locale change ── */
  useEffect(() => {
    const validSlugs = slugs.filter((s): s is string => s !== null);
    const cityNames = validSlugs.map(sl => {
      const id = Object.entries(CITY_SLUGS).find(([, v]) => v === sl)?.[0];
      return id ? (CITY_NAME_TRANSLATIONS[Number(id)]?.[locale] || sl) : sl;
    });
    document.title = cityNames.length >= 2
      ? `${cityNames.join(" vs ")} | WhichCity`
      : cityNames.length === 1
        ? `${cityNames[0]} | WhichCity`
        : `${t("navCompare")} | WhichCity`;
  }, [slugs, locale]);

  /* ── Style tokens ── */
  const selectCls = `text-xs rounded px-1.5 py-1 border ${darkMode ? "bg-slate-800 border-slate-600 text-slate-200" : "bg-white border-slate-300 text-slate-700"}`;
  const navBg = darkMode ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200";
  const sectionBg = darkMode ? "bg-slate-800/50 border-slate-700" : "bg-white border-slate-200";
  const headCls = darkMode ? "text-white" : "text-slate-900";
  const subCls = darkMode ? "text-slate-400" : "text-slate-500";

  if (!s.ready) return null;

  return (
    <div className={`min-h-screen transition-colors ${darkMode ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"}`}>
      {/* ──── Top bar ──── */}
      <div ref={navRef} className={`sticky top-0 z-50 border-b py-2.5 ${navBg}`}>
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Link href="/" className={`text-xs px-2 py-1 rounded border transition ${darkMode ? "bg-slate-800 border-slate-600 text-blue-300 hover:bg-slate-700" : "bg-white border-slate-300 text-blue-700 hover:bg-blue-50"}`}>
                {t("navHome")}
              </Link>
              <Link href="/ranking" className={`text-xs px-2 py-1 rounded border transition ${darkMode ? "bg-slate-800 border-slate-600 text-amber-300 hover:bg-slate-700" : "bg-white border-slate-300 text-amber-700 hover:bg-amber-50"}`}>
                {t("navRanking")}
              </Link>
              <button onClick={() => { const allSlugs = Object.values(CITY_SLUGS); router.push(`/city/${allSlugs[Math.floor(Math.random() * allSlugs.length)]}`); }}
                className={`text-xs px-2 py-1 rounded border transition ${darkMode ? "bg-slate-800 border-slate-600 text-emerald-300 hover:bg-slate-700" : "bg-white border-slate-300 text-emerald-700 hover:bg-emerald-50"}`}>
                {t("navRandomCity")}
              </button>
              <Link href="/compare" onClick={e => e.preventDefault()}
                className={`text-xs px-2 py-1 rounded border ${darkMode ? "bg-violet-900/40 border-violet-500/50 text-violet-300" : "bg-violet-50 border-violet-300 text-violet-700"}`}>
                {t("navCompare")}
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setNavOpen(v => !v)}
                className={`min-[1080px]:hidden text-xs px-2 py-1 rounded border transition ${darkMode ? "bg-slate-800 border-slate-600 text-slate-300" : "bg-white border-slate-300 text-slate-500"}`}>
                <svg className={`w-3.5 h-3.5 transition-transform duration-300 ${navOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
              </button>
              <div className="hidden min-[1080px]:flex items-center gap-2">
                <select value={activeProfession} onChange={e => s.setProfession(e.target.value)} className={selectCls}>
                  {professions.map(p => <option key={p} value={p}>{s.getProfessionLabel(p)}</option>)}
                </select>
                <select value={costTier} onChange={e => s.setCostTier(e.target.value as CostTier)} className={selectCls}>
                  {(["moderate", "budget"] as const).map(tier => (
                    <option key={tier} value={tier}>{t(`costTier${tier.charAt(0).toUpperCase()}${tier.slice(1)}`)}</option>
                  ))}
                </select>
                <select value={incomeMode} onChange={e => s.setIncomeMode(e.target.value as IncomeMode)} className={selectCls}>
                  <option value="gross">{t("incomeModeGross")}</option>
                  <option value="net">{t("incomeModeNet")}</option>
                  <option value="expatNet">{t("incomeModeExpatNet")}</option>
                </select>
                <select value={locale} onChange={e => s.setLocale(e.target.value as any)} className={selectCls}>
                  {(Object.keys(LANGUAGE_LABELS) as any[]).map(lang => <option key={lang} value={lang}>{LANGUAGE_LABELS[lang]}</option>)}
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
          <div className={`min-[1080px]:hidden grid transition-[grid-template-rows] duration-300 ease-in-out ${navOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
            <div className="overflow-hidden min-h-0">
              <div className="flex items-center gap-2 flex-wrap pt-2">
                <select value={activeProfession} onChange={e => s.setProfession(e.target.value)} className={selectCls}>
                  {professions.map(p => <option key={p} value={p}>{s.getProfessionLabel(p)}</option>)}
                </select>
                <select value={costTier} onChange={e => s.setCostTier(e.target.value as CostTier)} className={selectCls}>
                  {(["moderate", "budget"] as const).map(tier => (
                    <option key={tier} value={tier}>{t(`costTier${tier.charAt(0).toUpperCase()}${tier.slice(1)}`)}</option>
                  ))}
                </select>
                <select value={incomeMode} onChange={e => s.setIncomeMode(e.target.value as IncomeMode)} className={selectCls}>
                  <option value="gross">{t("incomeModeGross")}</option>
                  <option value="net">{t("incomeModeNet")}</option>
                  <option value="expatNet">{t("incomeModeExpatNet")}</option>
                </select>
                <select value={locale} onChange={e => s.setLocale(e.target.value as any)} className={selectCls}>
                  {(Object.keys(LANGUAGE_LABELS) as any[]).map(lang => <option key={lang} value={lang}>{LANGUAGE_LABELS[lang]}</option>)}
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
      </div>

      {/* ── City selector (full-width sticky layer) ── */}
      <div className="sticky z-40 pt-2" style={{ top: navH }}>
        {/* Top cover: hides scrolled content in the pt-2 gap between nav and card */}
        <div className={`absolute inset-x-0 top-0 h-2 ${darkMode ? "bg-slate-950" : "bg-slate-50"}`} />
        <div className="max-w-6xl mx-auto px-4 relative">
          {/* Gradient cover: opaque at top (hides content behind top corners), transparent at bottom (lets content peek through bottom corners) */}
          <div className={`absolute inset-0 bg-gradient-to-b ${darkMode ? "from-slate-950" : "from-slate-50"} to-transparent`} />
          <div className={`relative rounded-xl shadow-md border px-4 py-3 flex items-center gap-2 ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"}`}>
          {visibleSlots.map((c, i) => {
            const isOpen = openSlot === i;
            return (
              <div key={`sel-${i}`} className="flex-1 min-w-0 flex justify-center relative" ref={el => { slotRefs.current[i] = el as HTMLDivElement | null; }}>
                {c ? (
                  /* ── Filled selector ── */
                  <div
                    role="combobox" aria-expanded={isOpen} aria-haspopup="listbox" aria-controls={`slot-list-${i}`} aria-label={getName(c)}
                    tabIndex={0}
                    onClick={() => { if (isOpen) { setOpenSlot(null); setSlotSearch(""); } else { setOpenSlot(i); setSlotSearch(""); } }}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (isOpen) { setOpenSlot(null); setSlotSearch(""); } else { setOpenSlot(i); setSlotSearch(""); } } }}
                    className={`inline-flex items-center gap-1 px-2 py-2 rounded-lg border cursor-pointer transition w-full ${
                      isOpen
                        ? (darkMode ? "border-blue-500 bg-slate-700" : "border-blue-400 bg-blue-50")
                        : (darkMode ? "border-slate-600 bg-slate-800 hover:border-slate-500" : "border-slate-200 bg-white hover:border-slate-400")
                    }`}
                  >
                    <button onClick={e => { e.stopPropagation(); clearSlot(i); }} aria-label={t("remove")}
                      className={`shrink-0 w-5 h-5 rounded-full text-sm flex items-center justify-center ${darkMode ? "text-slate-400 hover:text-red-400" : "text-slate-400 hover:text-red-500"}`}>
                      ×
                    </button>
                    <span className="flex-1 flex items-center justify-center gap-1.5 min-w-0">
                      <span className="text-sm shrink-0">{getFlag(c)}</span>
                      <span className={`text-sm font-medium truncate ${headCls}`}>{getName(c)}</span>
                    </span>
                    <svg className={`shrink-0 w-5 h-5 ${darkMode ? "text-slate-400" : "text-slate-400"}`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd"/></svg>
                  </div>
                ) : (
                  /* ── Empty selector ── */
                  <div
                    role="combobox" aria-expanded={isOpen} aria-haspopup="listbox" aria-controls={`slot-list-${i}`} aria-label={t("chooseCity")}
                    tabIndex={0}
                    onClick={() => { if (isOpen) { setOpenSlot(null); setSlotSearch(""); } else { setOpenSlot(i); setSlotSearch(""); } }}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (isOpen) { setOpenSlot(null); setSlotSearch(""); } else { setOpenSlot(i); setSlotSearch(""); } } }}
                    className={`inline-flex items-center gap-1 px-2 py-2 rounded-lg border border-dashed cursor-pointer transition w-full ${
                      isOpen
                        ? (darkMode ? "border-blue-500" : "border-blue-400")
                        : (darkMode ? "border-slate-600 hover:border-slate-500" : "border-slate-300 hover:border-slate-400")
                    }`}
                  >
                    <span className="shrink-0 w-5" />
                    <span className={`flex-1 text-sm text-center ${darkMode ? "text-slate-500" : "text-slate-400"}`}>{t("chooseCity").replace(":", "")}</span>
                    <svg className={`shrink-0 w-5 h-5 ${darkMode ? "text-slate-400" : "text-slate-400"}`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd"/></svg>
                  </div>
                )}
                {/* ── Dropdown ── */}
                {isOpen && (
                  <div className={`absolute z-50 mt-1 left-0 right-0 rounded-xl shadow-lg border overflow-hidden ${
                    darkMode ? "bg-slate-800 border-slate-600" : "bg-white border-slate-200"
                  }`} style={{ top: "100%" }}>
                    <input autoFocus value={slotSearch} onChange={e => setSlotSearch(e.target.value)}
                      onKeyDown={e => {
                        if (!slotResults.length) return;
                        if (e.key === "ArrowDown") { e.preventDefault(); setHlIdx(j => (j + 1) % slotResults.length); }
                        else if (e.key === "ArrowUp") { e.preventDefault(); setHlIdx(j => (j - 1 + slotResults.length) % slotResults.length); }
                        else if (e.key === "Enter" && hlIdx >= 0 && hlIdx < slotResults.length) { e.preventDefault(); switchCity(i, slotResults[hlIdx]); }
                        else if (e.key === "Escape") { setOpenSlot(null); setSlotSearch(""); setHlIdx(-1); }
                      }}
                      placeholder={t("homeSearchPlaceholder")}
                      className={`w-full px-3 py-2 text-sm border-b focus:outline-none ${
                        darkMode ? "bg-slate-800 border-slate-600 text-white placeholder-slate-500"
                                 : "bg-white border-slate-200 text-slate-900 placeholder-slate-400"
                      }`} />
                    <div className="max-h-52 overflow-y-auto" role="listbox" id={`slot-list-${i}`}>
                      {slotResults.map((rc, ri) => (
                        <button key={rc.id} onClick={() => switchCity(i, rc)} onMouseEnter={() => setHlIdx(ri)} role="option" aria-selected={ri === hlIdx}
                          className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition ${
                            ri === hlIdx
                              ? (darkMode ? "bg-slate-700 text-slate-200" : "bg-blue-50 text-slate-700")
                              : (darkMode ? "hover:bg-slate-700 text-slate-200" : "hover:bg-blue-50 text-slate-700")
                          }`}>
                          <span>{CITY_FLAG_EMOJIS[rc.id] || "🏙️"}</span>
                          <span className="font-medium truncate">{getName(rc)}</span>
                          <span className={`text-xs ml-auto shrink-0 hidden min-[1080px]:inline ${subCls}`}>{getCountry(rc)}</span>
                        </button>
                      ))}
                      {slotSearch.trim() && slotResults.length === 0 && (
                        <p className={`px-3 py-2 text-xs ${subCls}`}>{t("homeNoResults")}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4">
      {/* ── Wins summary (standalone card) ── */}
      <div className={`rounded-xl shadow-md overflow-hidden border mt-4 ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"}`}>
        <div className="grid px-4 py-2" style={{ gridTemplateColumns: `repeat(${visibleSlots.length}, minmax(0, 1fr))` }}>
          {visibleSlots.map((c, i) => {
            const winDivider = i < visibleSlots.length - 1 ? `border-r ${darkMode ? "border-slate-700" : "border-slate-200"} pr-4` : "";
            const winValC = c && winCounts[i] > 0
              ? (darkMode ? "text-emerald-400" : "text-emerald-600")
              : (darkMode ? "text-slate-600" : "text-slate-300");
            return (
              <div key={`wins-${i}`} className={`flex flex-col items-center text-center py-2 ${winDivider}`}>
                <p className={`text-xs mb-0.5 ${darkMode ? "text-slate-500" : "text-slate-400"}`}>{t("compareLeading")}</p>
                <p className={`text-lg font-bold ${winValC}`}>
                  {c ? t("winsIn", { name: "", count: winCounts[i] }).replace(/^\s*/, "") : "—"}
                </p>
              </div>
            );
          })}
        </div>
      </div>

        {/* ──── Per-group cards ──── */}
        {GROUP_KEYS.map(gk => {
          const gRows = rows.filter(d => d.m.group === gk);
          if (gRows.length === 0) return null;
          const bestC = darkMode ? "text-emerald-400" : "text-emerald-600";
          const valC = darkMode ? "text-slate-100" : "text-slate-800";
          const dimC = darkMode ? "text-slate-600" : "text-slate-300";
          const lblC = darkMode ? "text-slate-500" : "text-slate-400";
          const groupBg = darkMode ? "bg-slate-700/30" : "bg-slate-50";
          const dividerCls = darkMode ? "border-slate-700" : "border-slate-200";
          return (
            <div key={gk} className={`rounded-xl shadow-md overflow-hidden border mt-4 ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"}`}>
              {/* Group header */}
              <div className={groupBg}>
                <p className={`px-4 py-2 text-xs font-bold tracking-wider uppercase ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                  {t(GROUP_I18N[gk])}
                </p>
              </div>
              {/* Per-city columns with dividers */}
              <div className="grid px-4 py-2" style={{ gridTemplateColumns: `repeat(${visibleSlots.length}, minmax(0, 1fr))` }}>
                {visibleSlots.map((slot, i) => (
                  <div key={`col-${i}`} className={i < visibleSlots.length - 1 ? `border-r ${dividerCls} pr-4` : "pl-0"}>
                    {gRows.map(({ m, vals, bestVal }) => {
                      const v = vals[i];
                      const label = m.label(t, rowCtx);
                      if (!slot) return (
                        <div key={m.key} className="flex flex-col items-center text-center py-2">
                          <p className={`text-xs mb-0.5 ${lblC}`}>{label}</p>
                          <p className={`text-lg font-bold ${dimC}`}>—</p>
                        </div>
                      );
                      if (m.key === "climateType") {
                        const cl = getCityClimate(slot.id);
                        return (
                          <div key={m.key} className="flex flex-col items-center text-center py-2">
                            <p className={`text-xs mb-0.5 ${lblC}`}>{label}</p>
                            <p className={`text-lg font-bold ${cl ? valC : dimC}`}>{cl ? getClimateLabel(cl.type, locale) : "—"}</p>
                          </div>
                        );
                      }
                      const formatted = m.fmt(v, rowCtx, slot);
                      const isBest = bestVal != null && v != null && v === bestVal && vals.some(vv => vv !== bestVal);
                      const isNull = v == null;
                      return (
                        <div key={m.key} className="flex flex-col items-center text-center py-2">
                          <p className={`text-xs mb-0.5 ${lblC}`}>{label}</p>
                          <p className={`text-lg font-bold ${isNull ? dimC : isBest ? bestC : valC}`}>
                            {formatted}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* ──── Climate & Environment (standalone section, no win highlighting) ──── */}
        {filledCities.length > 0 && (() => {
          const groupBg = darkMode ? "bg-slate-700/30" : "bg-slate-50";
          /* Build per-city climate items */
          const climateItems = (c: City) => {
            const cl = getCityClimate(c.id);
            if (!cl) return null;
            return [
              [t("climateType"), getClimateLabel(cl.type, locale)],
              [t("avgTemp"), `${cl.avgTempC.toFixed(1)}°C`],
              [t("tempRange"), `${(cl.summerAvgC - cl.winterAvgC).toFixed(1)}°C`],
              [t("annualRain"), `${Math.round(cl.annualRainMm)} mm`],
              [t("humidity"), `${cl.humidityPct}%`],
              [t("sunshine"), `${Math.round(cl.sunshineHours)} ${t("unitH")}`],
            ];
          };
          const hasCharts = filledCities.some(c => getCityClimate(c.id)?.monthlyHighC);
          const dividerCls = darkMode ? "border-slate-700" : "border-slate-200";

          // Compute shared Y-axis scale across all compared cities
          const allClimates = filledCities.map(c => getCityClimate(c.id)).filter(Boolean) as NonNullable<ReturnType<typeof getCityClimate>>[];
          const allTempsFlat = allClimates.flatMap(cl => [...(cl.monthlyHighC ?? []), ...(cl.monthlyLowC ?? [])]);
          const allRainFlat = allClimates.flatMap(cl => cl.monthlyRainMm ?? []);
          const sharedTempMin = allTempsFlat.length ? Math.floor(Math.min(...allTempsFlat) / 5) * 5 - 5 : undefined;
          const sharedTempMax = allTempsFlat.length ? Math.ceil(Math.max(...allTempsFlat) / 5) * 5 + 5 : undefined;
          const sharedRainCeil = allRainFlat.length ? (Math.ceil(Math.max(...allRainFlat) / 50) * 50 || 50) : undefined;

          return (
          <div className={`rounded-xl shadow-md overflow-hidden border mt-4 ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"}`}>
            {/* Section header */}
            <div className={groupBg}>
              <p className={`px-4 py-2 text-xs font-bold tracking-wider uppercase ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                {t(GROUP_I18N[CLIMATE_GROUP_KEY])}
              </p>
            </div>

            {/* Per-city columns: data + chart in same column for alignment */}
            <div className="p-4">
              <div className="grid gap-4" style={{ gridTemplateColumns: climateCols >= 2 ? `repeat(${visibleSlots.length}, minmax(0, 1fr))` : '1fr' }}>
                {visibleSlots.map((slot, ci) => {
                  const c = slot;
                  const items = c ? climateItems(c) : null;
                  const cl = c ? getCityClimate(c.id) : null;
                  if (!c || !items) return (
                    <div key={`clim-empty-${ci}`} className="flex flex-col items-center justify-center">
                      <p className={`text-lg font-bold ${darkMode ? "text-slate-600" : "text-slate-300"}`}>—</p>
                    </div>
                  );
                  return (
                    <div key={c.id} className={ci < visibleSlots.length - 1 && climateCols >= 2 ? `border-r ${dividerCls} pr-4` : ""}>
                      {/* City name label (stacked mode) */}
                      {climateCols === 1 && (
                        <>
                          {ci > 0 && <hr className={`my-3 ${dividerCls}`} />}
                          <p className={`text-sm font-bold text-center mb-2 ${headCls}`}>{getFlag(c)} {getName(c)}</p>
                        </>
                      )}
                      <div className="grid grid-cols-2 gap-1">
                        {items.map(([label, val]) => (
                          <div key={label} className="flex flex-col items-center text-center p-2">
                            <p className={`text-[10px] font-semibold tracking-wide mb-0.5 ${subCls}`}>{label}</p>
                            <p className={`text-sm font-extrabold ${headCls}`}>{val}</p>
                          </div>
                        ))}
                      </div>
                      {/* Chart */}
                      {cl?.monthlyHighC && (
                        <div className="mt-3">
                          <ClimateChart climate={cl} locale={locale} darkMode={darkMode} t={t} hideTitle hideLegend
                            sharedTempMin={sharedTempMin} sharedTempMax={sharedTempMax} sharedRainCeil={sharedRainCeil} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {/* Shared legend */}
              {hasCharts && (
              <div className={`flex items-center justify-center gap-4 mt-3 text-[10px] ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3 h-2 rounded-sm" style={{ background: darkMode ? "#fbbf24" : "#f59e0b" }} />
                  {t("chartTempLegend")}
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3 h-2 rounded-sm" style={{ background: darkMode ? "#38bdf8" : "#0ea5e9" }} />
                  {t("chartRainLegend")}
                </span>
              </div>
              )}
            </div>
          </div>
          );
        })()}

        {/* ──── City guide links ──── */}
        {filledCities.length > 0 && (
        <div className="grid gap-3 mt-4" style={{ gridTemplateColumns: `repeat(${visibleSlots.length}, minmax(0, 1fr))` }}>
          {visibleSlots.map((c, i) => c ? (
            <Link key={c.id} href={`/city/${CITY_SLUGS[c.id]}`}
              className={`rounded-xl border p-4 transition ${sectionBg} hover:border-blue-400 hover:shadow`}>
              <p className="text-2xl mb-1">{getFlag(c)}</p>
              <p className={`font-bold ${headCls}`}>{getName(c)}</p>
              <p className={`text-xs mt-0.5 ${subCls}`}>{getCountry(c)} · {t("cityGuideDesc")}</p>
            </Link>
          ) : <div key={`guide-empty-${i}`} />)}
        </div>
        )}

        </div>

      {/* Footer */}
      <footer className={`px-4 py-5 text-center text-xs ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
        <div className={`max-w-5xl mx-auto border-t pt-4 ${darkMode ? "border-slate-700" : "border-slate-200"}`}>
        <p>{t("dataSourcesDisclaimer")}</p>
        <p className="mt-1"><a href="/methodology" className="underline hover:text-blue-500">{t("navMethodology")}</a> · <a href="https://github.com/qing4132/whichcity/issues" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-500">GitHub</a> · <a href="mailto:qing4132@users.noreply.github.com" className="underline hover:text-blue-500">{t("footerFeedback")}</a></p>
        </div>
      </footer>
    </div>
  );
}
