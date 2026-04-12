"use client";

import { useState, useEffect, forwardRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CostTier } from "@/lib/types";
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
    /** City detail page mode — hides nav links, enables scroll-triggered city title */
    isCityDetail?: boolean;
    cityFlag?: string;
    cityNameText?: string;
    showCityInNav?: boolean;
}

const NavBar = forwardRef<HTMLDivElement, NavBarProps>(function NavBar(
    { s, activePage, professionValue, professions: professionsProp, compareHref, excludeSlug, showShare, isCityDetail, cityFlag, cityNameText, showCityInNav },
    ref,
) {
    const router = useRouter();
    const { locale, darkMode, themeMode, t } = s;
    const [menuOpen, setMenuOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(() => {
        if (typeof sessionStorage !== "undefined" && sessionStorage.getItem("_settingsOpen")) {
            sessionStorage.removeItem("_settingsOpen");
            return true;
        }
        return false;
    });
    const [copied, setCopied] = useState(false);
    const [shareOpen, setShareOpen] = useState(false);

    const professions = professionsProp || Object.keys(PROFESSION_TRANSLATIONS);
    const profVal = professionValue ?? s.profession;
    const compareTo = compareHref || `/${locale}/compare`;

    const navBg = darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100";
    const selectCls = `text-xs rounded px-1.5 py-1 h-7 border w-full ${darkMode ? "bg-slate-800 border-slate-600 text-slate-200" : "bg-white border-slate-300 text-slate-700"}`;
    const iconBtn = isCityDetail
        ? `h-8 w-8 inline-flex items-center justify-center rounded-full transition ${darkMode ? "text-slate-400 [@media(hover:hover)]:hover:bg-slate-800 [@media(hover:hover)]:hover:text-slate-200" : "text-slate-500 [@media(hover:hover)]:hover:bg-slate-100 [@media(hover:hover)]:hover:text-slate-700"}`
        : `h-6 w-6 inline-flex items-center justify-center rounded transition ${darkMode ? "text-slate-400 [@media(hover:hover)]:hover:text-slate-200" : "text-slate-400 [@media(hover:hover)]:hover:text-slate-600"}`;
    const labelCls = `text-[12px] font-medium ${darkMode ? "text-slate-500" : "text-slate-400"}`;
    const shareBtnCls = `text-xs h-7 px-2.5 inline-flex items-center gap-1.5 rounded border transition ${darkMode ? "bg-slate-800 border-slate-600 text-slate-200 [@media(hover:hover)]:hover:bg-slate-700" : "bg-white border-slate-300 text-slate-700 [@media(hover:hover)]:hover:bg-slate-50"}`;

    const randomCity = () => {
        const slugs = Object.values(CITY_SLUGS).filter(sl => sl !== excludeSlug);
        const slug = slugs[Math.floor(Math.random() * slugs.length)];
        trackEvent("random_city", { city_slug: slug });
        router.push(`/${locale}/city/${slug}`);
    };

    const getShareText = () => {
        const title = document.title.replace(/ \| WhichCity$/, "");
        const key = activePage === "home" ? "shareTextHome"
            : activePage === "ranking" ? "shareTextRanking"
                : activePage === "compare" ? "shareTextCompare"
                    : title !== "WhichCity" ? "shareTextCity"
                        : "shareTextHome";
        return t(key, { title });
    };
    const getShareTags = () => t("shareHashtags");

    const copyLink = async () => {
        const url = window.location.href;
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        trackEvent("share", { page: activePage || "other", target: "copy" });
    };

    const shareToX = () => {
        const url = encodeURIComponent(window.location.href);
        const text = encodeURIComponent(`${getShareText()}\n${getShareTags()}`);
        window.open(`https://x.com/intent/tweet?url=${url}&text=${text}`, "_blank", "noopener,noreferrer");
        trackEvent("share", { page: activePage || "other", target: "x" });
    };

    const shareToLinkedIn = () => {
        const url = encodeURIComponent(window.location.href);
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, "_blank", "noopener,noreferrer");
        trackEvent("share", { page: activePage || "other", target: "linkedin" });
    };

    const shareToWhatsApp = () => {
        const raw = window.location.href;
        const text = encodeURIComponent(`${getShareText()}\n${raw}`);
        window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
        trackEvent("share", { page: activePage || "other", target: "whatsapp" });
    };

    const shareToTelegram = () => {
        const url = encodeURIComponent(window.location.href);
        const text = encodeURIComponent(getShareText());
        window.open(`https://t.me/share/url?url=${url}&text=${text}`, "_blank", "noopener,noreferrer");
        trackEvent("share", { page: activePage || "other", target: "telegram" });
    };

    const shareToReddit = () => {
        const url = encodeURIComponent(window.location.href);
        const title = encodeURIComponent(getShareText());
        window.open(`https://www.reddit.com/submit?url=${url}&title=${title}`, "_blank", "noopener,noreferrer");
        trackEvent("share", { page: activePage || "other", target: "reddit" });
    };

    const shareToLINE = () => {
        const raw = window.location.href;
        const text = encodeURIComponent(`${getShareText()}\n${raw}`);
        window.open(`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(raw)}&text=${text}`, "_blank", "noopener,noreferrer");
        trackEvent("share", { page: activePage || "other", target: "line" });
    };

    const shareToFacebook = () => {
        const url = encodeURIComponent(window.location.href);
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, "_blank", "noopener,noreferrer");
        trackEvent("share", { page: activePage || "other", target: "facebook" });
    };

    /* ── Nav link colors ── */
    const linkCls = (page: string, _color: "blue" | "amber" | "emerald" | "violet") => {
        const isActive = activePage === page;
        if (isActive) return `text-[13px] font-semibold ${darkMode ? "text-slate-100" : "text-slate-900"}`;
        return `text-[13px] transition ${darkMode ? "text-slate-400 [@media(hover:hover)]:hover:text-slate-200" : "text-slate-400 [@media(hover:hover)]:hover:text-slate-700"}`;
    };

    /* ── Mobile nav link colors ── */
    const mobileLinkCls = (page: string, _color: string) => {
        const isActive = activePage === page;
        if (isActive) return `text-[15px] px-3 py-2 rounded font-semibold ${darkMode ? "text-slate-100" : "text-slate-900"}`;
        return `text-[15px] px-3 py-2 rounded ${darkMode ? "text-slate-400 [@media(hover:hover)]:hover:text-slate-200" : "text-slate-500 [@media(hover:hover)]:hover:text-slate-700"}`;
    };


    return (
        <div ref={ref} className={`sticky top-0 z-50 border-b py-2.5 ${navBg}`}>
            <div className="max-w-2xl mx-auto px-4">
                <div className="flex items-center justify-between gap-2 relative">
                    {/* Left: brand (+ nav links on non-detail pages) */}
                    <div className="flex items-center gap-3 min-w-0 z-10">
                        <Link href={`/${locale}`} className={`text-[18px] font-black tracking-tight shrink-0 ${darkMode ? "text-white" : "text-slate-900"}`}>WhichCity</Link>
                        {!isCityDetail && (
                            <>
                                <Link href={`/${locale}/ranking`} className={linkCls("ranking", "amber")}>{t("navRanking")}</Link>
                                <button onClick={randomCity} className={linkCls("", "emerald")}>
                                    <span className="min-[420px]:hidden">{t("navRandomCityShort")}</span>
                                    <span className="hidden min-[420px]:inline">{t("navRandomCity")}</span>
                                </button>
                                {activePage === "compare"
                                    ? <span className={linkCls("compare", "violet")}>{t("navCompare")}</span>
                                    : <Link href={compareTo} className={linkCls("compare", "violet")}>{t("navCompare")}</Link>
                                }
                            </>
                        )}
                    </div>

                    {/* Center: city flag + name (detail page only, scroll-triggered) */}
                    {isCityDetail && cityFlag && cityNameText && (
                        <div className={`absolute left-1/2 -translate-x-1/2 flex items-center gap-1.5 transition-all duration-300 ease-out ${showCityInNav ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"}`}>
                            <span className="text-[20px]">{cityFlag}</span>
                            <span className={`text-[15px] font-bold truncate max-w-[160px] ${darkMode ? "text-white" : "text-slate-900"}`}>{cityNameText}</span>
                        </div>
                    )}

                    {/* Right: Share + Settings */}
                    <div className={`flex items-center ${isCityDetail ? "gap-1" : "gap-2"} shrink-0`}>
                        {showShare && (
                            <button
                                onClick={() => { setShareOpen(v => !v); setSettingsOpen(false); }}
                                className={`${iconBtn} ${shareOpen ? (darkMode ? "!text-slate-100" : "!text-slate-900") : ""}`}
                                title={t("shareLink")}
                            >
                                <svg className={isCityDetail ? "w-4 h-4" : "w-3.5 h-3.5"} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>
                            </button>
                        )}
                        <button
                            onClick={() => { setSettingsOpen(v => !v); setShareOpen(false); }}
                            className={`${iconBtn} ${settingsOpen ? (darkMode ? "!text-slate-100" : "!text-slate-900") : ""}`}
                            title={t("settingsLabel")}
                        >
                            <svg className={isCityDetail ? "w-4 h-4" : "w-3.5 h-3.5"} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><circle cx="12" cy="12" r="3" /></svg>
                        </button>
                    </div>
                </div>


                {/* ── Share panel ── */}
                {showShare && (
                    <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${shareOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                        <div className="overflow-hidden min-h-0">
                            <div className="flex flex-col gap-0.5 pt-3 pb-1">
                                <span className={labelCls}>{t("shareTo")}</span>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2">
                                    <button onClick={shareToX} className={shareBtnCls}>
                                        <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                                        X
                                    </button>
                                    <button onClick={shareToFacebook} className={shareBtnCls}>
                                        <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                                        Facebook
                                    </button>
                                    <button onClick={shareToWhatsApp} className={shareBtnCls}>
                                        <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                                        WhatsApp
                                    </button>
                                    <button onClick={shareToLinkedIn} className={shareBtnCls}>
                                        <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
                                        LinkedIn
                                    </button>
                                    <button onClick={shareToReddit} className={shareBtnCls}>
                                        <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 01-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 01.042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 014.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 01.14-.197.35.35 0 01.238-.042l2.906.617a1.214 1.214 0 011.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 00-.231.094.33.33 0 000 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 000-.462.342.342 0 00-.462 0c-.545.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 00-.205-.095z" /></svg>
                                        Reddit
                                    </button>
                                    <button onClick={shareToTelegram} className={shareBtnCls}>
                                        <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0 12 12 0 0011.944 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" /></svg>
                                        Telegram
                                    </button>
                                    <button onClick={shareToLINE} className={shareBtnCls}>
                                        <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386a.63.63 0 01-.63-.629V8.108c0-.345.281-.63.63-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596a.625.625 0 01-.707-.228l-2.443-3.329v2.961c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108a.631.631 0 011.065-.459l2.44 3.328V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771h-.001zm-6.838.63c-.345 0-.63-.285-.63-.63V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.771c0 .345-.282.63-.63.63zm-2.466 0H4.05a.627.627 0 01-.629-.629V8.108c0-.345.282-.63.63-.63.349 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" /></svg>
                                        LINE
                                    </button>
                                    <button onClick={copyLink} className={shareBtnCls}>
                                        <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                                        {copied ? t("shareCopied") : t("shareCopyLink")}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

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
                                    {[0.6, 0.8, 1, 1.5, 2, 3, 5].map(m => <option key={m} value={m}>{t(`salaryTier_${m}`)}</option>)}
                                </select>
                            </label>
                            <label className="flex flex-col gap-0.5">
                                <span className={labelCls}>{t("settingCostTier")}</span>
                                <select value={s.costTier} onChange={e => s.setCostTier(e.target.value as CostTier)} className={selectCls}>
                                    {(["moderate", "budget"] as const).map(tier => <option key={tier} value={tier}>{t(`costTier${tier.charAt(0).toUpperCase()}${tier.slice(1)}`)}</option>)}
                                </select>
                            </label>

                            <label className="flex flex-col gap-0.5">
                                <span className={labelCls}>{t("settingLanguage")}</span>
                                <select value={locale} onChange={e => { sessionStorage.setItem("_settingsOpen", "1"); s.setLocale(e.target.value as any); }} className={selectCls}>
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
