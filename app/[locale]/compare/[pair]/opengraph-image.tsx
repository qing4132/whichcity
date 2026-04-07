import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import { join } from "path";
import { SLUG_TO_ID } from "@/lib/citySlug";
import { getCityById, loadCities, getCityLocaleName } from "@/lib/dataLoader";
import { CITY_FLAG_EMOJIS } from "@/lib/constants";
import { TRANSLATIONS } from "@/lib/i18n";
import { computeLifePressure } from "@/lib/clientUtils";
import type { Locale, City } from "@/lib/types";

export const runtime = "nodejs";
export const contentType = "image/png";
export const size = { width: 1200, height: 630 };

const fontData = readFileSync(join(process.cwd(), "app/fonts/NotoSansSC-Bold.ttf"));

function parsePair(pair: string): string[] {
  const parts = pair.split("-vs-");
  const valid = parts.filter(s => SLUG_TO_ID[s] != null);
  return [...new Set(valid)];
}

export default async function OgImage({ params }: { params: Promise<{ locale: string; pair: string }> }) {
  const { locale, pair } = await params;
  const loc = locale as Locale;
  const t = (key: string) => TRANSLATIONS[loc]?.[key] || TRANSLATIONS.en[key] || key;
  const slugs = parsePair(pair);
  if (slugs.length < 2) return new Response("Not found", { status: 404 });

  const allCities = loadCities();
  const n = allCities.length;

  const cities = slugs.slice(0, 3).map(s => {
    const id = SLUG_TO_ID[s];
    const city = getCityById(id);
    return city ? { id, city, name: getCityLocaleName(id, loc), flag: CITY_FLAG_EMOJIS[id] || "🏙️" } : null;
  }).filter(Boolean) as { id: number; city: City; name: string; flag: string }[];

  if (cities.length < 2) return new Response("Not found", { status: 404 });

  const is3 = cities.length === 3;

  // ── Tier coloring: same logic as website (top 20% green, bottom 20% red) ──
  const rankHigher = (values: number[], val: number) => {
    const unique = [...new Set(values)].sort((a, b) => b - a);
    let rank = 1;
    for (const v of unique) { if (val >= v) return rank; rank += values.filter(x => x === v).length; }
    return values.length;
  };
  const rankLower = (values: number[], val: number) => {
    const unique = [...new Set(values)].sort((a, b) => a - b);
    let rank = 1;
    for (const v of unique) { if (val <= v) return rank; rank += values.filter(x => x === v).length; }
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

  // ── Global ranking arrays ──
  const allIncomes = allCities.map(c => c.averageIncome);
  const allLP = allCities.map(c => computeLifePressure(c, allCities, c.averageIncome, allIncomes, "costModerate").value);
  const allSafety = allCities.map(c => c.safetyIndex);
  const allHealth = allCities.map(c => c.healthcareIndex);
  const allFreedom = allCities.map(c => c.freedomIndex);

  // Per-city 4 indices
  const cityIndices = cities.map(c => {
    const lp = computeLifePressure(c.city, allCities, c.city.averageIncome, allIncomes, "costModerate").value;
    return [
      { label: t("lifePressureIndex"), value: lp.toFixed(1), tier: tierLow(allLP, lp), rank: rankLower(allLP, lp) },
      { label: t("safetyIndex"), value: c.city.safetyIndex.toFixed(1), tier: tierHigh(allSafety, c.city.safetyIndex), rank: rankHigher(allSafety, c.city.safetyIndex) },
      { label: t("healthcareIndex"), value: c.city.healthcareIndex.toFixed(1), tier: tierHigh(allHealth, c.city.healthcareIndex), rank: rankHigher(allHealth, c.city.healthcareIndex) },
      { label: t("institutionalFreedom"), value: c.city.freedomIndex.toFixed(1), tier: tierHigh(allFreedom, c.city.freedomIndex), rank: rankHigher(allFreedom, c.city.freedomIndex) },
    ];
  });

  // ── Colors ──
  const bg = "#020617";
  const cardBg = "#1e293b";
  const border = "#334155";
  const textPrimary = "#f1f5f9";
  const textSecondary = "#94a3b8";
  const textMuted = "#64748b";
  const green = "#34d399";
  const greenBorder = "rgba(16,185,129,0.6)";
  const red = "#fb7185";
  const redBorder = "rgba(244,63,94,0.6)";

  const tierColor = (tier: Tier) => tier === "good" ? green : tier === "bad" ? red : textPrimary;
  const tierBorderColor = (tier: Tier) => tier === "good" ? greenBorder : tier === "bad" ? redBorder : border;

  // Sizing: adapt to 2 or 3 cities
  const valSize = is3 ? "28px" : "36px";
  const labelSize = is3 ? "12px" : "14px";
  const rankSize = is3 ? "12px" : "14px";
  const flagSize = is3 ? "36px" : "48px";
  const nameSize = is3 ? "28px" : "36px";
  const cardPad = is3 ? "10px 16px" : "14px 20px";
  const colGap = is3 ? "14px" : "20px";

  return new ImageResponse(
    <div style={{
      width: "100%", height: "100%", display: "flex", flexDirection: "column",
      fontFamily: '"Noto Sans SC"', background: bg, color: textPrimary,
      padding: "40px 48px",
    }}>
      {/* Header: brand */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
        <span style={{ fontSize: "20px", fontWeight: 700, color: textMuted }}>WhichCity</span>
        <span style={{ fontSize: "14px", color: "#475569" }}>whichcity.run</span>
      </div>

      {/* City columns */}
      <div style={{ display: "flex", flex: 1, gap: colGap }}>
        {cities.map((c, ci) => (
          <div key={c.id} style={{ display: "flex", flex: 1, flexDirection: "column", gap: "10px" }}>
            {/* City identity */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
              <span style={{ fontSize: flagSize, lineHeight: "1" }}>{c.flag}</span>
              <span style={{ fontSize: nameSize, fontWeight: 700, letterSpacing: "-0.5px", lineHeight: 1.1 }}>{c.name}</span>
            </div>

            {/* 4 index cards stacked */}
            {cityIndices[ci].map((idx) => (
              <div key={idx.label} style={{
                display: "flex", flex: 1, alignItems: "center", justifyContent: "space-between",
                background: cardBg, border: `2px solid ${tierBorderColor(idx.tier)}`,
                borderRadius: "14px", padding: cardPad,
              }}>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: labelSize, color: textSecondary, fontWeight: 600, lineHeight: 1.2 }}>{idx.label}</span>
                  <span style={{ fontSize: rankSize, color: textMuted, marginTop: "2px" }}>#{idx.rank}/{n}</span>
                </div>
                <span style={{ fontSize: valSize, fontWeight: 700, color: tierColor(idx.tier), lineHeight: 1 }}>{idx.value}</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ display: "flex", justifyContent: "center", marginTop: "16px", fontSize: "13px", color: textMuted, lineHeight: 1 }}>
        <span>{t("dataSourcesDisclaimer")}</span>
      </div>
    </div>,
    {
      ...size,
      fonts: [{ name: "Noto Sans SC", data: fontData, weight: 700, style: "normal" as const }],
    },
  );
}
