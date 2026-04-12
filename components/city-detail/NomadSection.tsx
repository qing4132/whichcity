"use client";

import { useState } from "react";
import type { City, Locale } from "@/lib/types";
import type { NomadCityData, VisaFreeMatrix } from "@/lib/nomadData";
import { COUNTRY_TRANSLATIONS } from "@/lib/i18n";
import { localizeVisaName, localizeTax, localizeNote, getLegalIncome } from "@/lib/nomadI18n";

interface Props {
    city: City;
    cityName: string;
    locale: string;
    darkMode: boolean;
    t: (k: string, params?: Record<string, string | number>) => string;
    nomadData: NomadCityData;
    visaMatrix: VisaFreeMatrix | null;
}

function cleanNote(note: string | null): string | null {
    if (!note) return null;
    return note.replace(/\s*Source:.*$/i, "").replace(/\s*\(ranked #\d+.*\)$/i, "")
        .replace(/\s*Listed on VisaGuide\.?/gi, "").replace(/\s*#\d+ on VisaGuide[^.]*\.?/gi, "")
        .replace(/\s*\d[\d,]+ permits granted[^.]*\.?/gi, "").replace(/\s*per VisaGuide[^.]*\.?/gi, "")
        .replace(/\s*on VisaGuide[^.]*\.?/gi, "").replace(/\s*per visaguide[^.]*\.?/gi, "")
        .replace(/\s*found in sources\.?/gi, "").replace(/\s*per \d{4} survey[^.)]*\.?/gi, "")
        .replace(/\s*Most popular country for nomads[^.]*\.?/gi, "")
        .replace(/\s+/g, " ").trim() || null;
}

/** Feed post: Nomad section — collapsible */
export default function NomadSection({ city, cityName, locale, darkMode, t, nomadData, visaMatrix }: Props) {
    const [open, setOpen] = useState(false);
    const headCls = darkMode ? "text-slate-100" : "text-slate-900";
    const labelCls = darkMode ? "text-slate-400" : "text-slate-400";
    const subCls = darkMode ? "text-slate-500" : "text-slate-500";
    const divider = darkMode ? "border-slate-800" : "border-slate-100";

    const visa = nomadData.visa;
    const tz = nomadData.timezoneOverlap;
    const visaName = visa?.hasNomadVisa ? (localizeVisaName(visa.visaName, locale as Locale) ?? t("nomadNoVisa")) : t("nomadNoVisa");
    const duration = visa?.durationMonths != null
        ? (visa.durationMonths >= 12 ? `${Math.round(visa.durationMonths / 12)} ${t("nomadYears")}` : `${visa.durationMonths} ${t("nomadMonths")}`)
        : "";
    const visaNote = localizeNote(city.id, cleanNote(visa?.note ?? null), locale as Locale);

    const countryEnName = COUNTRY_TRANSLATIONS[city.country]?.en || city.country;
    const aliases: Record<string, string> = { "中国香港": "Hong Kong", "阿联酋": "UAE", "波多黎各": "Puerto Rico" };
    const vfm = visaMatrix?.[countryEnName] || visaMatrix?.[countryEnName.replace(/ /g, "")] || (aliases[city.country] ? visaMatrix?.[aliases[city.country]] : null) || null;
    const passports = { US: t("nomadPassportUS"), EU: t("nomadPassportEU"), CN: t("nomadPassportCN"), JP: t("nomadPassportJP") };

    const isOwn = (code: string) => {
        const c = city.country;
        if (code === "CN") return c === "中国";
        if (code === "US") return c === "美国" || c === "波多黎各";
        if (code === "JP") return c === "日本";
        if (code === "EU") return ["法国", "德国", "荷兰", "瑞士", "比利时", "奥地利", "捷克", "波兰", "葡萄牙", "希腊", "西班牙", "意大利", "瑞典", "丹麦", "芬兰", "挪威", "爱沙尼亚", "卢森堡", "斯洛伐克", "斯洛文尼亚", "匈牙利", "罗马尼亚", "保加利亚", "克罗地亚", "爱尔兰"].includes(c);
        return false;
    };

    return (
        <div className={`py-3.5 border-b ${divider}`}>
            <button onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-1.5 text-left">
                <span className="text-[15px]">✈️</span>
                <span className={`text-[15px] font-extrabold ${headCls}`}>{t("nomadSection")}</span>
                {visa?.hasNomadVisa && <span className={`text-[13px] ${subCls}`}>· {visaName}{duration ? ` · ${duration}` : ""}</span>}
                <span className={`text-[13px] ml-auto transition-transform ${open ? "rotate-90" : ""} ${subCls}`}>▶</span>
            </button>

            {open && (
                <div className="mt-3 space-y-3">
                    <div className="flex gap-4 flex-wrap">
                        {[
                            { label: t("nomadVisa"), val: visaName },
                            { label: t("nomadDuration"), val: duration || "—" },
                            { label: t("nomadMinIncome"), val: getLegalIncome(city.id, locale as Locale) ?? "—" },
                            { label: t("nomadTax"), val: visa?.taxOnForeignIncome ? (localizeTax(visa.taxOnForeignIncome, locale as Locale) ?? "—") : "—" },
                        ].map(c => (
                            <div key={c.label}>
                                <div className={`text-[20px] font-black ${headCls}`}>{c.val}</div>
                                <div className={`text-[12px] ${labelCls}`}>{c.label}</div>
                            </div>
                        ))}
                    </div>

                    {visaNote && <p className={`text-[13px] leading-normal ${subCls}`}>{t("nomadVisaNotePrefix")} {visaNote}</p>}

                    <div>
                        <div className={`text-[15px] font-semibold mb-2 ${headCls}`}>{t("nomadVisaFreeDays").replace("{city}", cityName)}</div>
                        <div className="flex gap-4 flex-wrap">
                            {(Object.entries(passports) as [string, string][]).map(([code, label]) => {
                                const own = isOwn(code);
                                const days = vfm?.[code as keyof typeof vfm] ?? null;
                                const val = own ? "—" : days !== null ? t("nomadDays").replace("{d}", String(days)) : t("nomadNeedVisa");
                                return (
                                    <div key={code}>
                                        <div className={`text-[20px] font-black ${own ? subCls : days === null ? (darkMode ? "text-red-400" : "text-red-500") : headCls}`}>{val}</div>
                                        <div className={`text-[12px] ${labelCls}`}>{label}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {tz && (
                        <div>
                            <div className={`text-[15px] font-semibold mb-2 ${headCls}`}>{t("nomadTimezone")}</div>
                            <div className="flex gap-4 flex-wrap">
                                {[
                                    { label: t("nomadTzUSWest"), val: tz.overlapWithUSWest },
                                    { label: t("nomadTzUSEast"), val: tz.overlapWithUSEast },
                                    { label: t("nomadTzLondon"), val: tz.overlapWithLondon },
                                    { label: t("nomadTzEast8"), val: tz.overlapWithEast8 },
                                ].map(item => (
                                    <div key={item.label}>
                                        <div className={`text-[20px] font-black ${headCls}`}>{item.val != null ? `${item.val} ${t("unitH")}` : "—"}</div>
                                        <div className={`text-[12px] ${labelCls}`}>{item.label}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
