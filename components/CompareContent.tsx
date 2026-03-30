"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend,
} from "recharts";
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

/* ── City colors for chart bars/lines ── */
const CITY_COLORS = ["#3b82f6", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6"];

/* ════════════════════════════════════════════ */
export default function CompareContent({ initialCities, initialSlugs, allCities }: Props) {
  const router = useRouter();
  const s = useSettings();
  const { locale, darkMode, t, formatCurrency, costTier, profession, incomeMode } = s;

  const [cities, setCities] = useState<City[]>(initialCities);
  const [slugs, setSlugs] = useState<string[]>(initialSlugs);
  const [addSearch, setAddSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const addRef = useRef<HTMLDivElement>(null);

  const professions = allCities[0]?.professions ? Object.keys(allCities[0].professions) : [];
  const activeProfession = profession && professions.includes(profession) ? profession : professions[0] || "";
  const costField = `cost${costTier.charAt(0).toUpperCase()}${costTier.slice(1)}` as keyof City;

  /* ── Outside-click to close add dropdown ── */
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (addRef.current && !addRef.current.contains(e.target as Node)) setAddOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

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

  /* ── City helpers ── */
  const getName = useCallback((c: City) => CITY_NAME_TRANSLATIONS[c.id]?.[locale] || c.name, [locale]);
  const getFlag = (c: City) => CITY_FLAG_EMOJIS[c.id] || "🏙️";
  const getCountry = (c: City) => {
    const zh = CITY_COUNTRY[c.id];
    if (zh) { const cn = COUNTRY_TRANSLATIONS[zh]; if (cn) return cn[locale] || zh; return zh; }
    return COUNTRY_TRANSLATIONS[c.country]?.[locale] || c.country;
  };

  /* ── Metric value getter ── */
  const getVal = useCallback((c: City, m: Metric): number | null => {
    const ctx: RowCtx = { fc: formatCurrency, t, costField, profession: activeProfession, incomeMode, allCities, allIncomes: allIncomesMap };
    return m.get(c, ctx);
  }, [formatCurrency, t, costField, activeProfession, incomeMode, allCities, allIncomesMap]);

  /* ── Build chart data per group ── */
  const groupChartData = useMemo(() => {
    const result: Record<string, { metric: string; key: string; lower?: boolean; [cityName: string]: string | number | boolean | undefined }[]> = {};
    for (const gk of GROUP_KEYS) {
      const ms = METRICS.filter(m => m.group === gk);
      result[gk] = ms.map(m => {
        const row: any = { metric: m.label(t), key: m.key, lower: m.lower };
        cities.forEach(c => {
          row[getName(c)] = getVal(c, m);
        });
        return row;
      });
    }
    return result;
  }, [cities, t, getName, getVal]);

  /* ── Radar chart data (indexes) ── */
  const radarData = useMemo(() => {
    const indexMetrics = METRICS.filter(m => m.group === "index");
    return indexMetrics.map(m => {
      const row: any = { metric: m.label(t), key: m.key };
      cities.forEach(c => {
        const v = getVal(c, m);
        // For radar: invert life pressure (lower is better) so high = good
        row[getName(c)] = v != null ? (m.lower ? Math.max(0, 100 - v) : v) : 0;
      });
      return row;
    });
  }, [cities, t, getName, getVal]);

  /* ── Winner summary ── */
  const winCounts = useMemo(() => {
    const counts = new Map<number, number>();
    cities.forEach(c => counts.set(c.id, 0));
    METRICS.forEach(m => {
      const vals = cities.map(c => getVal(c, m));
      const valid = vals.filter((v): v is number => v != null && isFinite(v));
      if (valid.length < 2) return;
      const best = m.lower ? Math.min(...valid) : Math.max(...valid);
      const winners = vals.filter(v => v === best);
      if (winners.length < vals.length) {
        vals.forEach((v, i) => { if (v === best) counts.set(cities[i].id, (counts.get(cities[i].id) || 0) + 1); });
      }
    });
    return counts;
  }, [cities, getVal]);

  /* ── Add-city search ── */
  const addResults = useMemo(() => {
    if (!addSearch.trim()) return [];
    const q = addSearch.toLowerCase();
    const currentIds = new Set(cities.map(c => c.id));
    return allCities.filter(c => {
      if (currentIds.has(c.id)) return false;
      const names = CITY_NAME_TRANSLATIONS[c.id];
      if (names && Object.values(names).some(n => n.toLowerCase().includes(q))) return true;
      const slug = CITY_SLUGS[c.id];
      if (slug && slug.replace(/-/g, " ").includes(q)) return true;
      const zh = CITY_COUNTRY[c.id];
      if (zh) {
        const cn = COUNTRY_TRANSLATIONS[zh];
        if (cn && Object.values(cn).some(n => n.toLowerCase().includes(q))) return true;
      }
      return false;
    }).slice(0, 8);
  }, [addSearch, cities, allCities]);

  const updateUrl = (newSlugs: string[]) => {
    router.replace(`/compare/${[...newSlugs].sort().join("-vs-")}`, { scroll: false });
  };

  const addCity = (city: City) => {
    const slug = CITY_SLUGS[city.id];
    if (!slug || cities.length >= 5) return;
    const nc = [...cities, city];
    const ns = [...slugs, slug];
    setCities(nc); setSlugs(ns);
    setAddSearch(""); setAddOpen(false);
    updateUrl(ns);
  };

  const removeCity = (idx: number) => {
    if (cities.length <= 2) return;
    const nc = cities.filter((_, i) => i !== idx);
    const ns = slugs.filter((_, i) => i !== idx);
    setCities(nc); setSlugs(ns);
    updateUrl(ns);
  };

  /* ── Style tokens ── */
  const selectCls = `text-xs rounded px-1.5 py-1 border ${darkMode ? "bg-slate-800 border-slate-600 text-slate-200" : "bg-white border-slate-300 text-slate-700"}`;
  const navBg = darkMode ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200";
  const sectionBg = darkMode ? "bg-slate-800/50 border-slate-700" : "bg-white border-slate-200";
  const headCls = darkMode ? "text-white" : "text-slate-900";
  const subCls = darkMode ? "text-slate-400" : "text-slate-500";
  const canAdd = cities.length < 5;

  const chartFg = darkMode ? "#e2e8f0" : "#334155";
  const chartGrid = darkMode ? "#334155" : "#e2e8f0";
  const tooltipBg = darkMode ? "#1e293b" : "#ffffff";
  const tooltipBorder = darkMode ? "#475569" : "#e2e8f0";

  if (!s.ready) return null;

  const cityNames = cities.map(getName);

  return (
    <div className={`min-h-screen transition-colors ${darkMode ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"}`}>
      {/* ──── Top bar ──── */}
      <div className={`border-b px-4 py-2.5 ${navBg}`}>
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Link href="/" className={`text-xs px-2 py-1 rounded border font-semibold transition ${darkMode ? "bg-slate-800 border-slate-600 text-blue-300 hover:bg-slate-700" : "bg-white border-slate-300 text-blue-700 hover:bg-blue-50"}`}>
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

        {/* ──── City header cards ──── */}
        <div className="mb-8" ref={addRef}>
          <div className="overflow-x-auto">
            <div className="inline-flex gap-3" style={{ minWidth: "100%" }}>
              {cities.map((c, i) => {
                const wins = winCounts.get(c.id) || 0;
                return (
                  <div key={c.id} className={`rounded-xl border p-4 text-center relative flex-1 min-w-[140px] ${sectionBg}`}>
                    {cities.length > 2 && (
                      <button onClick={() => removeCity(i)}
                        className={`absolute top-2 right-2 w-5 h-5 rounded-full text-xs flex items-center justify-center transition ${darkMode ? "bg-slate-700 text-slate-400 hover:bg-red-900/50 hover:text-red-300" : "bg-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-500"}`}>
                        ×
                      </button>
                    )}
                    <div className="flex items-center justify-center gap-1.5 mb-1">
                      <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: CITY_COLORS[i] }} />
                      <span className="text-2xl">{getFlag(c)}</span>
                    </div>
                    <Link href={`/city/${CITY_SLUGS[c.id]}`} className={`text-base font-bold hover:underline ${headCls}`}>
                      {getName(c)}
                    </Link>
                    <p className={`text-xs ${subCls}`}>{getCountry(c)}</p>
                    {wins > 0 && (
                      <p className={`text-xs font-semibold mt-1.5 ${darkMode ? "text-emerald-400" : "text-emerald-600"}`}>
                        ✓ {t("winsIn", { name: "", count: wins }).replace(/^\s*/, "")}
                      </p>
                    )}
                  </div>
                );
              })}
              {canAdd && (
                <button onClick={() => setAddOpen(!addOpen)}
                  className={`min-w-[52px] rounded-xl border-2 border-dashed flex items-center justify-center text-2xl transition ${
                    darkMode ? "border-slate-600 text-slate-500 hover:border-blue-500 hover:text-blue-400"
                             : "border-slate-300 text-slate-400 hover:border-blue-400 hover:text-blue-500"
                  }`}>
                  +
                </button>
              )}
            </div>
          </div>
          {addOpen && canAdd && (
            <div className={`mt-3 w-72 rounded-xl shadow-lg border ${
              darkMode ? "bg-slate-800 border-slate-600" : "bg-white border-slate-200"
            }`}>
              <input autoFocus value={addSearch} onChange={e => setAddSearch(e.target.value)}
                placeholder={t("homeSearchPlaceholder")}
                className={`w-full px-3 py-2 text-sm border-b rounded-t-xl focus:outline-none ${
                  darkMode ? "bg-slate-800 border-slate-600 text-white placeholder-slate-500"
                           : "bg-white border-slate-200 text-slate-900 placeholder-slate-400"
                }`} />
              <div className="max-h-48 overflow-y-auto">
                {addResults.map(c => (
                  <button key={c.id} onClick={() => addCity(c)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition ${
                      darkMode ? "hover:bg-slate-700 text-slate-200" : "hover:bg-blue-50 text-slate-700"
                    }`}>
                    <span>{CITY_FLAG_EMOJIS[c.id] || "🏙️"}</span>
                    <span className="font-medium">{getName(c)}</span>
                    <span className={`text-xs ml-auto ${subCls}`}>{getCountry(c)}</span>
                  </button>
                ))}
                {addSearch.trim() && addResults.length === 0 && (
                  <p className={`px-3 py-2 text-xs ${subCls}`}>{t("homeNoResults")}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ──── Charts by group ──── */}
        {GROUP_KEYS.filter(gk => gk !== "index").map(gk => {
          const data = groupChartData[gk];
          if (!data || data.length === 0) return null;
          const barHeight = Math.max(50, cities.length * 28);
          const chartHeight = data.length * barHeight + 40;
          return (
            <section key={gk} className={`rounded-xl border p-4 sm:p-6 mb-6 ${sectionBg}`}>
              <h2 className={`text-lg font-bold mb-4 ${headCls}`}>{t(GROUP_I18N[gk])}</h2>
              <div style={{ width: "100%", height: chartHeight }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} horizontal={false} />
                    <XAxis type="number" tick={{ fill: chartFg, fontSize: 11 }} tickFormatter={v => {
                      const abs = Math.abs(v);
                      if (abs >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
                      if (abs >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
                      return `${v}`;
                    }} />
                    <YAxis dataKey="metric" type="category" width={120} tick={{ fill: chartFg, fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 8, fontSize: 12 }}
                      labelStyle={{ color: chartFg, fontWeight: 600 }}
                      itemStyle={{ color: chartFg }}
                      formatter={(value: number) => value != null ? formatCurrency(value) : "—"}
                    />
                    {cityNames.map((name, i) => (
                      <Bar key={name} dataKey={name} fill={CITY_COLORS[i]} radius={[0, 4, 4, 0]} barSize={20} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          );
        })}

        {/* ──── Radar chart: Indexes ──── */}
        <section className={`rounded-xl border p-4 sm:p-6 mb-6 ${sectionBg}`}>
          <h2 className={`text-lg font-bold mb-4 ${headCls}`}>{t(GROUP_I18N["index"])}</h2>
          <div style={{ width: "100%", height: 380 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                <PolarGrid stroke={chartGrid} />
                <PolarAngleAxis dataKey="metric" tick={{ fill: chartFg, fontSize: 11 }} />
                <PolarRadiusAxis tick={{ fill: chartFg, fontSize: 10 }} domain={[0, 100]} />
                {cityNames.map((name, i) => (
                  <Radar key={name} name={name} dataKey={name} stroke={CITY_COLORS[i]} fill={CITY_COLORS[i]} fillOpacity={0.15} strokeWidth={2} />
                ))}
                <Legend wrapperStyle={{ fontSize: 12, color: chartFg }} />
                <Tooltip
                  contentStyle={{ backgroundColor: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: chartFg, fontWeight: 600 }}
                  itemStyle={{ color: chartFg }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* ──── City guide links ──── */}
        <div className="grid gap-3 mt-8" style={{ gridTemplateColumns: `repeat(${Math.min(cities.length, 3)}, minmax(0, 1fr))` }}>
          {cities.map(c => (
            <Link key={c.id} href={`/city/${CITY_SLUGS[c.id]}`}
              className={`rounded-xl border p-4 transition ${sectionBg} hover:border-blue-400 hover:shadow`}>
              <p className="text-2xl mb-1">{getFlag(c)}</p>
              <p className={`font-bold ${headCls}`}>{getName(c)} {t("cityGuide")}</p>
              <p className={`text-xs ${subCls}`}>{getCountry(c)} · {t("cityGuideDesc")}</p>
            </Link>
          ))}
        </div>

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
