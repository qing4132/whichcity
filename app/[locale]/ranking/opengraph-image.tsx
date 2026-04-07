import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import { join } from "path";
import { loadCities, getCityLocaleName } from "@/lib/dataLoader";
import { CITY_FLAG_EMOJIS } from "@/lib/constants";
import { TRANSLATIONS } from "@/lib/i18n";
import { computeLifePressure } from "@/lib/clientUtils";
import type { Locale } from "@/lib/types";

export const runtime = "nodejs";
export const contentType = "image/png";
export const size = { width: 1200, height: 630 };

const fontData = readFileSync(join(process.cwd(), "app/fonts/NotoSansSC-Bold.ttf"));

export default async function OgImage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const loc = locale as Locale;
  const t = (key: string) => TRANSLATIONS[loc]?.[key] || TRANSLATIONS.en[key] || key;

  const allCities = loadCities();
  const allIncomes = allCities.map(c => c.averageIncome);

  // Compute life pressure for all cities
  const lpArr = allCities.map((c) => ({
    id: c.id, value: computeLifePressure(c, allCities, c.averageIncome, allIncomes, "costModerate").value,
  }));

  // 4 categories, each with top 3
  const categories = [
    {
      label: t("lifePressureIndex"),
      items: [...lpArr].sort((a, b) => a.value - b.value).slice(0, 3).map(x => ({
        name: getCityLocaleName(x.id, loc), flag: CITY_FLAG_EMOJIS[x.id] || "🏙️", score: x.value.toFixed(1),
      })),
    },
    {
      label: t("safetyIndex"),
      items: [...allCities].sort((a, b) => b.safetyIndex - a.safetyIndex).slice(0, 3).map(c => ({
        name: getCityLocaleName(c.id, loc), flag: CITY_FLAG_EMOJIS[c.id] || "🏙️", score: c.safetyIndex.toFixed(1),
      })),
    },
    {
      label: t("healthcareIndex"),
      items: [...allCities].sort((a, b) => b.healthcareIndex - a.healthcareIndex).slice(0, 3).map(c => ({
        name: getCityLocaleName(c.id, loc), flag: CITY_FLAG_EMOJIS[c.id] || "🏙️", score: c.healthcareIndex.toFixed(1),
      })),
    },
    {
      label: t("institutionalFreedom"),
      items: [...allCities].sort((a, b) => b.freedomIndex - a.freedomIndex).slice(0, 3).map(c => ({
        name: getCityLocaleName(c.id, loc), flag: CITY_FLAG_EMOJIS[c.id] || "🏙️", score: c.freedomIndex.toFixed(1),
      })),
    },
  ];

  const bg = "#020617";
  const cardBg = "#1e293b";
  const border = "#334155";
  const textPrimary = "#f1f5f9";
  const textSecondary = "#94a3b8";
  const textMuted = "#64748b";
  const green = "#34d399";
  const medals = ["🥇", "🥈", "🥉"];

  return new ImageResponse(
    <div style={{
      width: "100%", height: "100%", display: "flex", flexDirection: "column",
      fontFamily: '"Noto Sans SC"', background: bg, color: textPrimary,
      padding: "40px 48px",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "14px" }}>
          <span style={{ fontSize: "36px", fontWeight: 700 }}>{t("ranking")}</span>
          <span style={{ fontSize: "18px", color: textSecondary }}>TOP 3</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
          <span style={{ fontSize: "20px", fontWeight: 700, color: textMuted }}>WhichCity</span>
          <span style={{ fontSize: "13px", color: "#475569" }}>whichcity.run</span>
        </div>
      </div>

      {/* 4 columns */}
      <div style={{ display: "flex", flex: 1, gap: "16px" }}>
        {categories.map((cat) => (
          <div key={cat.label} style={{
            display: "flex", flex: 1, flexDirection: "column", gap: "10px",
          }}>
            {/* Category label */}
            <div style={{
              display: "flex", justifyContent: "center", alignItems: "center",
              background: cardBg, border: `1px solid ${border}`, borderRadius: "12px",
              padding: "10px 8px",
            }}>
              <span style={{ fontSize: "15px", color: textSecondary, fontWeight: 700, textAlign: "center" }}>{cat.label}</span>
            </div>

            {/* Top 3 items */}
            {cat.items.map((item, i) => (
              <div key={item.name} style={{
                display: "flex", flex: 1, alignItems: "center",
                background: cardBg, border: `1px solid ${border}`, borderRadius: "14px",
                padding: "10px 14px", gap: "8px",
              }}>
                <span style={{ fontSize: "22px", lineHeight: 1, flexShrink: 0 }}>{medals[i]}</span>
                <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: "14px", fontWeight: 700, lineHeight: 1.2 }}>{item.flag} {item.name}</span>
                </div>
                <span style={{ fontSize: "24px", fontWeight: 700, color: green, lineHeight: 1, flexShrink: 0 }}>{item.score}</span>
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
