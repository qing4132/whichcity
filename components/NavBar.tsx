"use client";

import { useState, forwardRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CostTier, IncomeMode } from "@/lib/types";
import { LANGUAGE_LABELS, PROFESSION_TRANSLATIONS } from "@/lib/i18n";
import { POPULAR_CURRENCIES } from "@/lib/constants";
import { CITY_SLUGS } from "@/lib/citySlug";
import { trackEvent } from "@/lib/analytics";
import type { useSettings } from "@/hooks/useSettings";

type Settings = ReturnType<typeof useSettings>;

interface NavBarProps {
    s: Settings;
    activePage?: "home" | "ranking" | "compare";
    professionValue?: string;
    professions?: string[];
    compareHref?: string;
    excludeSlug?: string;
    showShare?: boolean;
}

const NavBar = forwardRef<HTMLDivElement, NavBarProps>(function NavBar(
    { s, activePage, professionValue, professions: professionsProp, compareHref, excludeSlug, showShare },
    ref,
) {
    const router = useRouter();
    const { locale, darkMode, themeMode, t } = s;
    const [menuOpen, setMenuOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [copied, setCopied] = useState(false);

    const professions = professionsProp || Object.keys(PROFESSION_TRANSLATIONS);
    const profVal = professionValue ?? s.profession;
    const compareTo = compareHref || `/${locale}/compare`;

    const navBg = darkMode ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200";
    const selectCls = `text-xs rounded px-1.5 py-1 h-7 border w-full ${darkMode ? "bg-slate-800 border-slate-600 text-slate-200" : "bg-white border-slate-300 text-slate-700"}`;
    const iconBtn = `h-7 w-7 inline-flex items-center justify-center rounded border transition ${darkMode ? "bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700" : "bg-white border-slate-300 text-slate-500 hover:bg-slate-50"}`;
    const labelCls = `text-[10px] font-medium ${darkMode ? "text-slate-500" : "text-slate-400"}`;

    const randomCity = () => {
        const slugs = Object.values(CITY_SLUGS).filter(sl => sl !== excludeSlug);
        const slug = slugs[Math.floor(Math.random() * slugs.length)];
        trackEvent("random_city", { city_slug: slug });
        router.push(`/${locale}/city/${slug}`);
    };

    const share = async () => {
        const url = window.location.href;
        if (navigator.share) {
            try { await navigator.share({ url }); } catch { /* user cancelled */ }
        } else {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
        trackEvent("share", { page: activePage || "other" });
    };

    /* ── Nav link colors ── */
    const linkCls = (page: string, color: "blue" | "amber" | "emerald" | "violet") => {
        const isActive = activePage === page;
        const map = {
            blue: {
                a: darkMode ? "bg-blue-900/40 border-blue-500/50 text-blue-300" : "bg-blue-50 border-blue-300 text-blue-700",
                i: darkMode ? "bg-slate-800 border-slate-600 text-blue-300 hover:bg-slate-700" : "bg-white border-slate-300 text-blue-700 hover:bg-blue-50"
            },
            amber: {
                a: darkMode ? "bg-amber-900/40 border-amber-500/50 text-amber-300" : "bg-amber-50 border-amber-300 text-amber-700",
                i: darkMode ? "bg-slate-800 border-slate-600 text-amber-300 hover:bg-slate-700" : "bg-white border-slate-300 text-amber-700 hover:bg-amber-50"
            },
            emerald: { a: "", i: darkMode ? "bg-slate-800 border-slate-600 text-emerald-300 hover:bg-slate-700" : "bg-white border-slate-300 text-emerald-700 hover:bg-emerald-50" },
            violet: {
                a: darkMode ? "bg-violet-900/40 border-violet-500/50 text-violet-300" : "bg-violet-50 border-violet-300 text-violet-700",
                i: darkMode ? "bg-slate-800 border-slate-600 text-violet-300 hover:bg-slate-700" : "bg-white border-slate-300 text-violet-700 hover:bg-violet-50"
            },
        };
        const c = map[color];
        return `text-xs px-2 h-7 inline-flex items-center rounded border ${isActive ? c.a : `transition ${c.i}`}`;
    };

    /* ── Mobile nav link colors ── */
    const mobileLinkCls = (page: string, color: string) => {
        const isActive = activePage === page;
        if (isActive) {
            const activeMap: Record<string, string> = {
                blue: darkMode ? "bg-blue-900/30 text-blue-300" : "bg-blue-50 text-blue-700",
                amber: darkMode ? "bg-amber-900/30 text-amber-300" : "bg-amber-50 text-amber-700",
                emerald: darkMode ? "bg-emerald-900/30 text-emerald-300" : "bg-emerald-50 text-emerald-700",
                violet: darkMode ? "bg-violet-900/30 text-violet-300" : "bg-violet-50 text-violet-700",
            };
            return `text-sm px-3 py-2 rounded ${activeMap[color] ?? ""}`;
        }
        return `text-sm px-3 py-2 rounded ${darkMode ? "text-slate-300 hover:bg-slate-800" : "text-slate-700 hover:bg-slate-50"}`;
    };


    return (
        <div ref={ref} className={`sticky top-0 z-50 border-b py-2.5 ${navBg}`}>
            <div className="max-w-6xl mx-auto px-4">
                <div className="flex items-center justify-between gap-2">
                    {/* Left: 4 nav buttons */}
                    <div className="flex items-center gap-1.5 min-w-0">
                        <Link href={`/${locale}`} className={linkCls("home", "blue")}>{t("navHome")}</Link>
                        <Link href={`/${locale}/ranking`} className={linkCls("ranking", "amber")}>{t("navRanking")}</Link>
                        <button onClick={randomCity} className={linkCls("", "emerald")}>
                            <span className="min-[420px]:hidden">{t("navRandomCityShort")}</span>
                            <span className="hidden min-[420px]:inline">{t("navRandomCity")}</span>
                        </button>
                        {activePage === "compare"
                            ? <span className={linkCls("compare", "violet")}>{t("navCompare")}</span>
                            : <Link href={compareTo} className={linkCls("compare", "violet")}>{t("navCompare")}</Link>
                        }
                    </div>

                    {/* Right: Share + Settings */}
                    <div className="flex items-center gap-1.5 shrink-0">
                        {showShare && (
                            <button onClick={share} className={iconBtn} title={copied ? t("shareCopied") : t("shareLink")}>
                                {copied
                                    ? <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                    : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                                }
                            </button>
                        )}
                        <button
                            onClick={() => setSettingsOpen(v => !v)}
                            className={`${iconBtn} ${settingsOpen ? (darkMode ? "!border-blue-500/50 !bg-slate-700" : "!border-blue-300 !bg-blue-50") : ""}`}
                            title={t("settingsLabel")}
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.248a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" /><circle cx="12" cy="12" r="3" /></svg>
                        </button>
                    </div>
                </div>


                {/* ── Settings panel ── */}
                <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${settingsOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                    <div className="overflow-hidden min-h-0">
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-2 pt-3 pb-1">
                            <label className="flex flex-col gap-0.5">
                                <span className={labelCls}>{t("settingProfession")}</span>
                                <select value={profVal} onChange={e => s.setProfession(e.target.value)} className={selectCls}>
                                    {professions.map(p => <option key={p} value={p}>{s.getProfessionLabel(p)}</option>)}
                                </select>
                            </label>
                            <label className="flex flex-col gap-0.5">
                                <span className={labelCls}>{t("salaryMultiplier")}</span>
                                <select value={s.salaryMultiplier} onChange={e => s.setSalaryMultiplier(parseFloat(e.target.value))} className={selectCls}>
                                    {[0.5, 0.7, 0.8, 1.0, 1.2, 1.5, 2.0, 2.5, 3.0].map(m => <option key={m} value={m}>×{m.toFixed(1)}</option>)}
                                </select>
                            </label>
                            <label className="flex flex-col gap-0.5">
                                <span className={labelCls}>{t("settingCostTier")}</span>
                                <select value={s.costTier} onChange={e => s.setCostTier(e.target.value as CostTier)} className={selectCls}>
                                    {(["moderate", "budget"] as const).map(tier => <option key={tier} value={tier}>{t(`costTier${tier.charAt(0).toUpperCase()}${tier.slice(1)}`)}</option>)}
                                </select>
                            </label>
                            <label className="flex flex-col gap-0.5">
                                <span className={labelCls}>{t("settingIncomeMode")}</span>
                                <select value={s.incomeMode} onChange={e => s.setIncomeMode(e.target.value as IncomeMode)} className={selectCls}>
                                    <option value="gross">{t("incomeModeGross")}</option>
                                    <option value="net">{t("incomeModeNet")}</option>
                                    <option value="expatNet">{t("incomeModeExpatNet")}</option>
                                </select>
                            </label>
                            <label className="flex flex-col gap-0.5">
                                <span className={labelCls}>{t("settingLanguage")}</span>
                                <select value={locale} onChange={e => s.setLocale(e.target.value as any)} className={selectCls}>
                                    {(Object.keys(LANGUAGE_LABELS) as any[]).map(lang => <option key={lang} value={lang}>{LANGUAGE_LABELS[lang]}</option>)}
                                </select>
                            </label>
                            <label className="flex flex-col gap-0.5">
                                <span className={labelCls}>{t("settingCurrency")}</span>
                                <select value={s.currency} onChange={e => s.setCurrency(e.target.value)} className={selectCls}>
                                    {POPULAR_CURRENCIES.map(cur => <option key={cur} value={cur}>{cur}</option>)}
                                </select>
                            </label>
                            <label className="flex flex-col gap-0.5">
                                <span className={labelCls}>{t("settingTheme")}</span>
                                <select value={themeMode} onChange={e => s.setThemeMode(e.target.value as "auto" | "light" | "dark")} className={selectCls}>
                                    <option value="auto">{t("themeAuto")}</option>
                                    <option value="light">{t("dayMode")}</option>
                                    <option value="dark">{t("nightMode")}</option>
                                </select>
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});

export default NavBar;
