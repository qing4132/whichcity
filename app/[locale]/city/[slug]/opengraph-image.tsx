import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import { join } from "path";
import { SLUG_TO_ID } from "@/lib/citySlug";
import { getCityById, loadCities, getCityLocaleName, getCountryLocaleName } from "@/lib/dataLoader";
import { CITY_FLAG_EMOJIS } from "@/lib/constants";
import { TRANSLATIONS } from "@/lib/i18n";
import { computeLifePressure } from "@/lib/clientUtils";
import type { Locale } from "@/lib/types";

export const runtime = "nodejs";
export const contentType = "image/png";
export const size = { width: 1200, height: 630 };

const fontData = readFileSync(join(process.cwd(), "app/fonts/NotoSansSC-Bold.ttf"));

export default async function OgImage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const loc = locale as Locale;
  const t = (key: string) => TRANSLATIONS[loc]?.[key] || TRANSLATIONS.en[key] || key;
  const id = SLUG_TO_ID[slug];
  if (!id) return new Response("Not found", { status: 404 });
  const city = getCityById(id);
  if (!city) return new Response("Not found", { status: 404 });

  const allCities = loadCities();
  const n = allCities.length;
  const name = getCityLocaleName(id, loc);
  const country = getCountryLocaleName(city.country, loc);
  const flag = CITY_FLAG_EMOJIS[id] || "🏙️";

  // ── Tier coloring: same logic as website (top 20% green, bottom 20% red) ──
  const rankHigher = (values: number[], val: number) => {
    const unique = [...new Set(values)].sort((a, b) => b - a);
    let rank = 1;
    for (const v of unique) {
      if (val >= v) return rank;
      rank += values.filter(x => x === v).length;
    }
    return values.length;
  };
  const rankLower = (values: number[], val: number) => {
    const unique = [...new Set(values)].sort((a, b) => a - b);
    let rank = 1;
    for (const v of unique) {
      if (val <= v) return rank;
      rank += values.filter(x => x === v).length;
    }
    return values.length;
  };
  type Tier = "good" | "mid" | "bad";
  const tierHigh = (values: number[], val: number): Tier => {
    const rank = rankHigher(values, val);
    if (rank <= values.length * 0.2) return "good";
    if (rank > values.length * 0.8) return "bad";
    return "mid";
  };
  const tierLow = (values: number[], val: number): Tier => {
    const rank = rankLower(values, val);
    if (rank <= values.length * 0.2) return "good";
    if (rank > values.length * 0.8) return "bad";
    return "mid";
  };

  // ── Compute 4 indices with ranking ──
  const allIncomes = allCities.map(c => c.averageIncome);
  const allLP = allCities.map(c => computeLifePressure(c, allCities, c.averageIncome, allIncomes, "costModerate").value);
  const allSafety = allCities.map(c => c.safetyIndex);
  const allHealth = allCities.map(c => c.healthcareIndex);
  const allFreedom = allCities.map(c => c.freedomIndex);

  const lp = computeLifePressure(city, allCities, city.averageIncome, allIncomes, "costModerate").value;

  const indices = [
    { label: t("lifePressureIndex"), value: lp.toFixed(1), tier: tierLow(allLP, lp), rank: rankLower(allLP, lp) },
    { label: t("safetyIndex"), value: city.safetyIndex.toFixed(1), tier: tierHigh(allSafety, city.safetyIndex), rank: rankHigher(allSafety, city.safetyIndex) },
    { label: t("healthcareIndex"), value: city.healthcareIndex.toFixed(1), tier: tierHigh(allHealth, city.healthcareIndex), rank: rankHigher(allHealth, city.healthcareIndex) },
    { label: t("institutionalFreedom"), value: city.freedomIndex.toFixed(1), tier: tierHigh(allFreedom, city.freedomIndex), rank: rankHigher(allFreedom, city.freedomIndex) },
  ];

  // ── Colors (matching website dark mode) ──
  const bg = "#020617";       // slate-950
  const cardBg = "#1e293b";   // slate-800
  const border = "#334155";   // slate-700
  const textPrimary = "#f1f5f9";  // slate-100
  const textSecondary = "#94a3b8"; // slate-400
  const textMuted = "#64748b";     // slate-500
  const green = "#34d399";     // emerald-400
  const greenBorder = "rgba(16,185,129,0.6)"; // emerald-500/60
  const red = "#fb7185";       // rose-400
  const redBorder = "rgba(244,63,94,0.6)";    // rose-500/60

  const tierColor = (tier: Tier) => tier === "good" ? green : tier === "bad" ? red : textPrimary;
  const tierBorderColor = (tier: Tier) => tier === "good" ? greenBorder : tier === "bad" ? redBorder : border;

  return new ImageResponse(
    <div style={{
      width: "100%", height: "100%", display: "flex", flexDirection: "column",
      fontFamily: '"Noto Sans SC"', background: bg, color: textPrimary,
      padding: "48px 56px",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <span style={{ fontSize: "72px", lineHeight: "1" }}>{flag}</span>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "52px", fontWeight: 700, lineHeight: "1.15", letterSpacing: "-1px" }}>{name}</span>
            <span style={{ fontSize: "24px", color: textSecondary, marginTop: "2px" }}>{country}</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
          <span style={{ fontSize: "22px", fontWeight: 700, color: textMuted }}>WhichCity</span>
          <span style={{ fontSize: "15px", color: "#475569", marginTop: "2px" }}>whichcity.run</span>
        </div>
      </div>

      {/* Divider */}
      <div style={{ width: "100%", height: "1px", background: border, margin: "32px 0 28px 0", display: "flex" }} />

      {/* 4 index cards in a single row */}
      <div style={{ display: "flex", flex: 1, gap: "20px" }}>
        {indices.map((idx) => (
          <div key={idx.label} style={{
            display: "flex", flex: 1, flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            background: cardBg, border: `2px solid ${tierBorderColor(idx.tier)}`,
            borderRadius: "18px", padding: "24px 12px",
          }}>
            <span style={{ fontSize: "16px", color: textSecondary, fontWeight: 600, textAlign: "center", lineHeight: 1.3, marginBottom: "12px" }}>{idx.label}</span>
            <span style={{ fontSize: "52px", fontWeight: 700, color: tierColor(idx.tier), lineHeight: 1 }}>{idx.value}</span>
            <span style={{ fontSize: "18px", color: textMuted, marginTop: "10px" }}>#{idx.rank} / {n}</span>
          </div>
        ))}
      </div>

      {/* Footer note */}
      <div style={{ display: "flex", justifyContent: "center", marginTop: "20px", fontSize: "14px", color: textMuted, lineHeight: 1 }}>
        <span>{t("dataSourcesDisclaimer")}</span>
      </div>
    </div>,
    {
      ...size,
      fonts: [{ name: "Noto Sans SC", data: fontData, weight: 700, style: "normal" as const }],
    },
  );
}
