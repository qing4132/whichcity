import Link from "next/link";
import type { City, CostTier, IncomeMode } from "@/lib/types";
import { CITY_FLAG_EMOJIS } from "@/lib/constants";
import { CITY_SLUGS } from "@/lib/citySlug";
import { CITY_NAME_TRANSLATIONS } from "@/lib/i18n";
import { getCityEnName, computeLifePressure } from "@/lib/clientUtils";
import { computeNetIncome } from "@/lib/taxUtils";

const TIER_KEYS: { key: CostTier; field: "costModerate" | "costBudget" }[] = [
    { key: "moderate", field: "costModerate" },
    { key: "budget", field: "costBudget" },
];

interface Props {
    city: City; slug: string; allCities: City[]; allIncomes: number[];
    allLifePressure: number[]; costTierField: string; income: number | null;
    tierCost: number; savings: number | null; hourlyWage: number; lifePressure: number;
    locale: string; darkMode: boolean; t: (k: string) => string;
    costTier: CostTier; incomeMode: IncomeMode; salaryMultiplier: number;
    activeProfession: string; rates: any;
}

/** Feed post: similar cities section */
export default function SimilarCities(props: Props) {
    const { city, slug, allCities, allIncomes, allLifePressure, costTierField, income, tierCost, savings, hourlyWage, lifePressure, locale, darkMode, t, costTier, incomeMode, salaryMultiplier, activeProfession, rates } = props;
    const headCls = darkMode ? "text-slate-100" : "text-slate-900";
    const labelCls = darkMode ? "text-slate-400" : "text-slate-400";
    const subCls = darkMode ? "text-slate-500" : "text-slate-500";
    const divider = darkMode ? "border-slate-800" : "border-slate-100";
    const allCosts = allCities.map(c => c[costTierField as keyof City] as number);
    const allSavings = allCities.map((c, i) => allIncomes[i] - allCosts[i] * 12);
    const allHourly = allCities.map((c, i) => c.annualWorkHours != null && c.annualWorkHours > 0 ? allIncomes[i] / c.annualWorkHours : 0);
    const allYearsToHome = allCities.map((c, i) => { const sv = allIncomes[i] - allCosts[i] * 12; return c.housePrice != null && sv > 0 ? (c.housePrice * 70) / sv : Infinity; });

    // 21-dim distance
    const similarIds = (() => {
        const cityIdx = allCities.findIndex(c => c.id === city.id);
        const median = (vals: (number | null)[]) => {
            const nums = vals.filter((v): v is number => v !== null).sort((a, b) => a - b);
            if (nums.length === 0) return 0;
            const mid = Math.floor(nums.length / 2);
            return nums.length % 2 === 0 ? (nums[mid - 1] + nums[mid]) / 2 : nums[mid];
        };
        const medHP = median(allCities.map(c => c.housePrice));
        const medRent = median(allCities.map(c => c.monthlyRent));
        const medWH = median(allCities.map(c => c.annualWorkHours));
        const medPL = median(allCities.map(c => c.paidLeaveDays));
        const medAQI = median(allCities.map(c => c.airQuality));
        const medNet = median(allCities.map(c => c.internetSpeedMbps));
        const medFlights = median(allCities.map(c => c.directFlightCities));
        const vec = (i: number) => {
            const c = allCities[i]; const ytb = allYearsToHome[i]; const cl = c.climate ?? null;
            return [allIncomes[i], allCosts[i], allSavings[i], c.housePrice ?? medHP, isFinite(ytb) ? ytb : 999, c.monthlyRent ?? medRent,
            c.annualWorkHours ?? medWH, allHourly[i], c.paidLeaveDays ?? medPL,
            c.airQuality ?? medAQI, c.internetSpeedMbps ?? medNet, c.directFlightCities ?? medFlights,
            allLifePressure[i], c.healthcareIndex, c.governanceIndex, c.safetyIndex,
            cl?.avgTempC ?? 15, cl ? cl.summerAvgC - cl.winterAvgC : 15, cl?.annualRainMm ?? 800, cl?.humidityPct ?? 60, cl?.sunshineHours ?? 2000];
        };
        const all = allCities.map((_, i) => vec(i));
        const dims = all[0].length;
        const mins = Array(dims).fill(Infinity); const maxs = Array(dims).fill(-Infinity);
        for (const m of all) for (let d = 0; d < dims; d++) { if (m[d] < mins[d]) mins[d] = m[d]; if (m[d] > maxs[d]) maxs[d] = m[d]; }
        const norm = (v: number[]) => v.map((val, d) => { const r = maxs[d] - mins[d]; return r > 0 ? (val - mins[d]) / r : 0.5; });
        const cur = norm(all[cityIdx]);
        return allCities.map((c, i) => ({ id: c.id, dist: i === cityIdx ? Infinity : Math.sqrt(norm(all[i]).reduce((s, v, d) => s + (v - cur[d]) ** 2, 0)) }))
            .sort((a, b) => a.dist - b.dist).slice(0, 6).map(d => d.id);
    })();

    // Highlight diff computation
    const simData = similarIds.map(otherId => {
        const other = allCities.find(c => c.id === otherId);
        if (!other) return null;
        const otherSlug = CITY_SLUGS[otherId]; if (!otherSlug) return null;
        const otherName = CITY_NAME_TRANSLATIONS[otherId]?.[locale] || getCityEnName(otherId);
        const otherGross = activeProfession && other.professions[activeProfession] != null ? other.professions[activeProfession] * salaryMultiplier : null;
        const otherIncome = otherGross !== null ? computeNetIncome(otherGross, other.country, other.id, incomeMode, rates).netUSD : null;
        const otherLP = computeLifePressure(other, allCities, otherIncome ?? 0, allIncomes, costTierField as keyof City).value;
        const tfk = TIER_KEYS.find(tk => tk.key === costTier)!.field;
        const dims: { key: string; cur: number; oth: number; higher: boolean }[] = [
            { key: "avgIncome", cur: income ?? 0, oth: otherIncome ?? 0, higher: true },
            { key: "monthlyCost", cur: tierCost, oth: other[tfk], higher: false },
            { key: "yearlySavings", cur: savings ?? 0, oth: (otherIncome ?? 0) - other[tfk] * 12, higher: true },
            ...(city.monthlyRent !== null && other.monthlyRent !== null ? [{ key: "monthlyRent", cur: city.monthlyRent, oth: other.monthlyRent, higher: false }] : []),
            ...(city.annualWorkHours !== null && other.annualWorkHours !== null ? [{ key: "annualWorkHours", cur: city.annualWorkHours, oth: other.annualWorkHours, higher: false }] : []),
            { key: "lifePressureIndex", cur: lifePressure, oth: otherLP, higher: false },
            { key: "healthcareIndex", cur: city.healthcareIndex, oth: other.healthcareIndex, higher: true },
            { key: "safetyIndex", cur: city.safetyIndex, oth: other.safetyIndex, higher: true },
        ];
        const scored: { key: string; pct: number; adv: boolean; sign: string }[] = [];
        for (const d of dims) {
            if (d.cur === 0) continue;
            const pct = Math.round(Math.abs(d.oth - d.cur) / Math.abs(d.cur) * 100);
            if (pct === 0) continue;
            scored.push({ key: d.key, pct, adv: d.higher ? d.oth > d.cur : d.oth < d.cur, sign: d.oth > d.cur ? "+" : "-" });
        }
        scored.sort((a, b) => b.pct - a.pct);
        const top2Adv = scored.filter(s => s.adv).slice(0, 2);
        const top1Dis = scored.filter(s => !s.adv).slice(0, 1);
        return { otherId, otherSlug, otherName, highlights: [...top2Adv, ...top1Dis] };
    }).filter(Boolean) as { otherId: number; otherSlug: string; otherName: string; highlights: { key: string; pct: number; adv: boolean; sign: string }[] }[];

    return (
        <div className={`py-3.5 border-b ${divider}`}>
            <div className="flex items-center gap-1.5 mb-3">
                <span className="text-[15px]">🔗</span>
                <span className={`text-[15px] font-extrabold ${headCls}`}>{t("similarCities")}</span>
            </div>
            <div className="space-y-3">
                {simData.map(sc => (
                    <div key={sc.otherId} className="flex items-center gap-3">
                        <span className="text-[24px]">{CITY_FLAG_EMOJIS[sc.otherId] || "🏙️"}</span>
                        <div className="flex-1 min-w-0">
                            <Link href={`/${locale}/city/${sc.otherSlug}`} className={`text-[15px] font-bold hover:underline ${headCls}`}>{sc.otherName}</Link>
                            <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                                {sc.highlights.map((h, i) => (
                                    <span key={i} className={`text-[13px] ${h.adv ? (darkMode ? "text-green-400" : "text-green-600") : (darkMode ? "text-rose-400" : "text-rose-500")}`}>
                                        {t(h.key)} {h.sign}{h.pct}%
                                    </span>
                                ))}
                            </div>
                        </div>
                        <Link href={`/${locale}/compare/${[slug, sc.otherSlug].sort().join("-vs-")}`}
                            className={`text-[13px] px-2 py-1 rounded shrink-0 ${darkMode ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-600"}`}>
                            {t("compareCity")}
                        </Link>
                    </div>
                ))}
            </div>
        </div>
    );
}
