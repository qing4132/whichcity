"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { City, CostTier, IncomeMode } from "@/lib/types";
import { CITY_FLAG_EMOJIS, POPULAR_CURRENCIES, CITY_COUNTRY } from "@/lib/constants";
import { CITY_SLUGS } from "@/lib/citySlug";
import { CITY_NAME_TRANSLATIONS, COUNTRY_TRANSLATIONS, LANGUAGE_LABELS } from "@/lib/i18n";
import { useSettings } from "@/hooks/useSettings";
import { computeNetIncome } from "@/lib/taxUtils";
import { computeLifePressure } from "@/lib/clientUtils";

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
  label: (t: RowCtx["t"]) => string;
  get: (c: City, ctx: RowCtx) => number | null;
  fmt: (v: number | null, ctx: RowCtx) => string;
  lower?: boolean; // lower is better
  group: string;
};

/* ── 16 metrics (12 data + 4 indexes), grouped ── */
const METRICS: Metric[] = [
  { key: "income",   group: "income",      label: t => t("avgIncome"),              get: (c, x) => x.allIncomes.get(c.id) ?? null, fmt: (v, x) => v != null ? x.fc(v) : "—" },
  { key: "expense",  group: "income",      label: t => t("monthlyCost"),            get: (c, x) => c[x.costField] as number | null, fmt: (v, x) => v != null ? x.fc(v) : "—", lower: true },
  { key: "savings",  group: "income",      label: t => t("yearlySavings"),          get: (c, x) => { const inc = x.allIncomes.get(c.id); const cost = c[x.costField] as number; return inc != null ? inc - cost * 12 : null; }, fmt: (v, x) => v != null ? x.fc(v) : "—" },
  { key: "house",    group: "housing",     label: t => t("housePrice"),             get: c => c.housePrice,                          fmt: (v, x) => v != null ? x.fc(v) : "—", lower: true },
  { key: "rent",     group: "housing",     label: t => t("monthlyRent"),            get: c => c.monthlyRent,                         fmt: (v, x) => v != null ? x.fc(v) : "—", lower: true },
  { key: "years",    group: "housing",     label: t => t("yearsToBuy"),             get: (c, x) => { const inc = x.allIncomes.get(c.id); const cost = c[x.costField] as number; const sav = inc != null ? inc - cost * 12 : 0; return c.housePrice != null && sav > 0 ? (c.housePrice * 70) / sav : null; }, fmt: (v, x) => v != null ? `${v.toFixed(1)} ${x.t("insightYears")}` : "—", lower: true },
  { key: "work",     group: "work",        label: t => t("annualWorkHours"),        get: c => c.annualWorkHours,                     fmt: (v, x) => v != null ? `${v} ${x.t("unitH")}` : "—", lower: true },
  { key: "wage",     group: "work",        label: t => t("hourlyWage"),             get: (c, x) => { const inc = x.allIncomes.get(c.id); return inc != null && c.annualWorkHours != null && c.annualWorkHours > 0 ? inc / c.annualWorkHours : null; }, fmt: (v, x) => v != null ? x.fc(Math.round(v * 100) / 100) : "—" },
  { key: "vacation", group: "work",        label: t => t("paidLeaveDays"),          get: c => c.paidLeaveDays,                       fmt: (v, x) => v != null ? `${v} ${x.t("paidLeaveDaysUnit")}` : "—" },
  { key: "air",      group: "environment", label: t => t("airQuality") + " AQI",    get: c => c.airQuality,                          fmt: v => v != null ? `${v}` : "—", lower: true },
  { key: "internet", group: "environment", label: t => t("internetSpeed"),           get: c => c.internetSpeedMbps,                   fmt: v => v != null ? `${v} Mbps` : "—" },
  { key: "flights",  group: "environment", label: t => t("directFlights"),           get: c => c.directFlightCities,                  fmt: v => v != null ? `${v}` : "—" },
  { key: "lp",       group: "index",       label: t => t("lifePressureIndex"),       get: (c, x) => { const inc = x.allIncomes.get(c.id) ?? 0; const allInc = x.allCities.map(cc => x.allIncomes.get(cc.id) ?? 0); return computeLifePressure(c, x.allCities, inc, allInc, x.costField).value; }, fmt: v => v != null ? v.toFixed(1) : "—", lower: true },
  { key: "safety",   group: "index",       label: t => t("safetyIndex"),             get: c => c.safetyIndex,                         fmt: v => v != null ? v.toFixed(1) : "—" },
  { key: "health",   group: "index",       label: t => t("healthcareIndex"),         get: c => c.healthcareIndex,                     fmt: v => v != null ? v.toFixed(1) : "—" },
  { key: "freedom",  group: "index",       label: t => t("institutionalFreedom"),    get: c => c.freedomIndex,                        fmt: v => v != null ? v.toFixed(1) : "—" },
];

const GROUP_KEYS = ["income", "housing", "work", "environment", "index"] as const;
const GROUP_I18N: Record<string, string> = {
  income: "rankGroup_income", housing: "rankGroup_housing", work: "rankGroup_work",
  environment: "rankGroup_environment", index: "rankGroup_index",
};

/* ════════════════════════════════════════════ */
export default function CompareContent({ initialCities, initialSlugs, allCities }: Props) {
  const router = useRouter();
  const s = useSettings();
  const { locale, darkMode, t, formatCurrency, costTier, profession, incomeMode } = s;

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

  /* ── Responsive columns: 2 on < 640px, else 3 ── */
  const [cols, setCols] = useState(3);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const handler = () => setCols(mq.matches ? 2 : 3);
    handler();
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const visibleSlots = slots.slice(0, cols);
  const filledCities = visibleSlots.filter((c): c is City => c !== null);

  /* ── City-switcher dropdown state ── */
  const [openSlot, setOpenSlot] = useState<number | null>(null);
  const [slotSearch, setSlotSearch] = useState("");
  const slotRefs = useRef<(HTMLDivElement | null)[]>([]);

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
      const net = computeNetIncome(gross, c.country, c.id, incomeMode).netUSD;
      map.set(c.id, net);
    });
    return map;
  }, [allCities, activeProfession, incomeMode]);

  const rowCtx: RowCtx = useMemo(() => ({
    fc: formatCurrency, t, costField, profession: activeProfession, incomeMode, allCities, allIncomes: allIncomesMap,
  }), [formatCurrency, t, costField, activeProfession, incomeMode, allCities, allIncomesMap]);

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
    return q ? filtered.slice(0, 8) : filtered.slice(0, 20);
  }, [openSlot, slotSearch, slots, allCities]);

  /* ── Switch city in a slot ── */
  const switchCity = (slotIdx: number, city: City) => {
    const slug = CITY_SLUGS[city.id];
    if (!slug) return;
    const nc = [...slots]; nc[slotIdx] = city;
    const ns = [...slugs]; ns[slotIdx] = slug;
    setSlots(nc); setSlugs(ns);
    setOpenSlot(null); setSlotSearch("");
    const validSlugs = ns.filter((s): s is string => s !== null);
    if (validSlugs.length >= 2) {
      window.history.replaceState(null, "", `/compare/${[...validSlugs].sort().join("-vs-")}`);
    }
  };

  /* ── Clear a slot ── */
  const clearSlot = (slotIdx: number) => {
    const nc = [...slots]; nc[slotIdx] = null;
    const ns = [...slugs]; ns[slotIdx] = null;
    setSlots(nc); setSlugs(ns);
    const validSlugs = ns.filter((s): s is string => s !== null);
    if (validSlugs.length >= 2) {
      window.history.replaceState(null, "", `/compare/${[...validSlugs].sort().join("-vs-")}`);
    }
  };

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
      <div className={`border-b px-4 py-2.5 ${navBg}`}>
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between gap-2 flex-wrap">
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
          </div>
          <div className="flex items-center gap-2 flex-wrap">
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
            <button onClick={() => s.setDarkMode(!darkMode)} className={`text-xs px-2 py-1 rounded border ${darkMode ? "bg-slate-800 border-slate-600 text-yellow-300" : "bg-white border-slate-300 text-slate-600"}`}>
              {darkMode ? "☀️" : "🌙"}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8">

        {/* ──── Comparison table with integrated city selectors ──── */}
        <div className={`rounded-xl shadow-md overflow-hidden border ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ tableLayout: "fixed" }}>
              <colgroup>
                <col style={{ width: cols === 2 ? "35%" : "28%" }} />
                {visibleSlots.map((_, i) => <col key={i} />)}
              </colgroup>
              <thead>
                {/* ── Selector row ── */}
                <tr className={darkMode ? "bg-slate-800/80" : "bg-slate-50"}>
                  <th className={`px-4 py-3 text-left text-xs font-semibold tracking-wide whitespace-nowrap ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                    {t("metric")}
                  </th>
                  {visibleSlots.map((c, i) => {
                    const isOpen = openSlot === i;
                    return (
                      <th key={`sel-${i}`} className="px-2 py-3 text-center relative" ref={el => { slotRefs.current[i] = el as HTMLDivElement | null; }}>
                        {c ? (
                          /* ── Filled selector ── */
                          <div
                            onClick={() => { if (isOpen) { setOpenSlot(null); setSlotSearch(""); } else { setOpenSlot(i); setSlotSearch(""); } }}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border cursor-pointer transition mx-auto max-w-[200px] ${
                              isOpen
                                ? (darkMode ? "border-blue-500 bg-slate-700" : "border-blue-400 bg-blue-50")
                                : (darkMode ? "border-slate-600 bg-slate-800 hover:border-slate-500" : "border-slate-200 bg-white hover:border-slate-400")
                            }`}
                          >
                            <span className="text-sm shrink-0">{getFlag(c)}</span>
                            <span className={`text-sm font-medium truncate ${headCls}`}>{getName(c)}</span>
                            <button onClick={e => { e.stopPropagation(); clearSlot(i); }}
                              className={`shrink-0 ml-auto w-4 h-4 rounded-full text-[10px] flex items-center justify-center ${darkMode ? "text-slate-500 hover:text-red-400" : "text-slate-400 hover:text-red-500"}`}>
                              ×
                            </button>
                            <span className={`text-[10px] shrink-0 ${darkMode ? "text-slate-500" : "text-slate-400"}`}>▾</span>
                          </div>
                        ) : (
                          /* ── Empty selector ── */
                          <div
                            onClick={() => { if (isOpen) { setOpenSlot(null); setSlotSearch(""); } else { setOpenSlot(i); setSlotSearch(""); } }}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border border-dashed cursor-pointer transition mx-auto max-w-[200px] ${
                              isOpen
                                ? (darkMode ? "border-blue-500" : "border-blue-400")
                                : (darkMode ? "border-slate-600 hover:border-slate-500" : "border-slate-300 hover:border-slate-400")
                            }`}
                          >
                            <span className={`text-sm truncate ${darkMode ? "text-slate-500" : "text-slate-400"}`}>{t("chooseCity").replace(":", "")}</span>
                            <span className={`text-[10px] shrink-0 ml-auto ${darkMode ? "text-slate-500" : "text-slate-400"}`}>▾</span>
                          </div>
                        )}
                        {/* ── Dropdown ── */}
                        {isOpen && (
                          <div className={`absolute z-50 mt-1 rounded-xl shadow-lg border overflow-hidden ${
                            darkMode ? "bg-slate-800 border-slate-600" : "bg-white border-slate-200"
                          }`} style={{ left: "50%", transform: "translateX(-50%)", width: "240px" }}>
                            <input autoFocus value={slotSearch} onChange={e => setSlotSearch(e.target.value)}
                              placeholder={t("homeSearchPlaceholder")}
                              className={`w-full px-3 py-2 text-sm border-b focus:outline-none ${
                                darkMode ? "bg-slate-800 border-slate-600 text-white placeholder-slate-500"
                                         : "bg-white border-slate-200 text-slate-900 placeholder-slate-400"
                              }`} />
                            <div className="max-h-52 overflow-y-auto">
                              {slotResults.map(rc => (
                                <button key={rc.id} onClick={() => switchCity(i, rc)}
                                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition ${
                                    darkMode ? "hover:bg-slate-700 text-slate-200" : "hover:bg-blue-50 text-slate-700"
                                  }`}>
                                  <span>{CITY_FLAG_EMOJIS[rc.id] || "🏙️"}</span>
                                  <span className="font-medium truncate">{getName(rc)}</span>
                                  <span className={`text-xs ml-auto shrink-0 ${subCls}`}>{getCountry(rc)}</span>
                                </button>
                              ))}
                              {slotSearch.trim() && slotResults.length === 0 && (
                                <p className={`px-3 py-2 text-xs ${subCls}`}>{t("homeNoResults")}</p>
                              )}
                            </div>
                          </div>
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {GROUP_KEYS.map(gk => {
                  const gRows = rows.filter(d => d.m.group === gk);
                  if (gRows.length === 0) return null;
                  const groupBg = darkMode ? "bg-slate-700/30" : "bg-slate-50";
                  const borderR = darkMode ? "border-slate-700/50" : "border-slate-100";
                  const labelC = darkMode ? "text-slate-300" : "text-slate-700";
                  const valC = darkMode ? "text-slate-200" : "text-slate-700";
                  const bestC = darkMode ? "text-emerald-400 font-bold" : "text-emerald-600 font-bold";
                  const dimC = darkMode ? "text-slate-500" : "text-slate-400";
                  return [
                    <tr key={`gh-${gk}`} className={groupBg}>
                      <td colSpan={visibleSlots.length + 1} className={`px-4 py-2 text-xs font-bold tracking-wider uppercase ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                        {t(GROUP_I18N[gk])}
                      </td>
                    </tr>,
                    ...gRows.map(({ m, vals, bestVal }) => (
                      <tr key={m.key} className={`border-b ${borderR}`}>
                        <td className={`px-4 py-2.5 font-medium whitespace-nowrap ${labelC}`}>
                          {m.label(t)}
                        </td>
                        {vals.map((v, i) => {
                          const slot = visibleSlots[i];
                          if (!slot) return <td key={`empty-${i}`} className={`px-3 py-2.5 text-center ${dimC}`}>—</td>;
                          const formatted = m.fmt(v, rowCtx);
                          const isBest = bestVal != null && v != null && v === bestVal && vals.some(vv => vv !== bestVal);
                          const isNull = v == null;
                          return (
                            <td key={slot.id} className={`px-3 py-2.5 text-center ${isNull ? dimC : isBest ? bestC : valC}`}>
                              {formatted}
                            </td>
                          );
                        })}
                      </tr>
                    )),
                  ];
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ──── City guide links ──── */}
        {filledCities.length > 0 && (
        <div className="grid gap-3 mt-8" style={{ gridTemplateColumns: `repeat(${filledCities.length}, minmax(0, 1fr))` }}>
          {filledCities.map(c => (
            <Link key={c.id} href={`/city/${CITY_SLUGS[c.id]}`}
              className={`rounded-xl border p-4 transition ${sectionBg} hover:border-blue-400 hover:shadow`}>
              <p className="text-2xl mb-1">{getFlag(c)}</p>
              <p className={`font-bold ${headCls}`}>{getName(c)} {t("cityGuide")}</p>
              <p className={`text-xs ${subCls}`}>{getCountry(c)} · {t("cityGuideDesc")}</p>
            </Link>
          ))}
        </div>
        )}

        {/* ──── Footer ──── */}
        <footer className={`mt-10 border-t px-4 py-6 text-center text-xs ${darkMode ? "border-slate-700 text-slate-500" : "border-slate-200 text-slate-400"}`}>
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
    </div>
  );
}
