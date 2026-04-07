import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import { join } from "path";
import { TRANSLATIONS } from "@/lib/i18n";
import type { Locale } from "@/lib/types";

export const runtime = "nodejs";
export const contentType = "image/png";
export const size = { width: 1200, height: 630 };

const fontData = readFileSync(join(process.cwd(), "app/fonts/NotoSansSC-Bold.ttf"));

export default async function OgImage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const loc = locale as Locale;
  const t = (key: string) => TRANSLATIONS[loc]?.[key] || TRANSLATIONS.en[key] || key;

  const bg = "#020617";
  const cardBg = "#1e293b";
  const border = "#334155";
  const textPrimary = "#f1f5f9";
  const textSecondary = "#94a3b8";
  const textMuted = "#64748b";
  const green = "#34d399";

  const stats = [
    { num: "100+", label: t("homeCities") },
    { num: "20+", label: t("homeProfessions") },
    { num: "79", label: loc === "zh" ? "国税制" : loc === "ja" ? "か国の税制" : loc === "es" ? "países" : "tax systems" },
    { num: "4", label: loc === "zh" ? "种语言" : loc === "ja" ? "言語" : loc === "es" ? "idiomas" : "languages" },
  ];

  return new ImageResponse(
    <div style={{
      width: "100%", height: "100%", display: "flex", flexDirection: "column",
      fontFamily: '"Noto Sans SC"', background: bg, color: textPrimary,
      padding: "60px 72px", alignItems: "center", justifyContent: "center",
    }}>
      {/* Brand */}
      <span style={{ fontSize: "72px", fontWeight: 700, lineHeight: 1, letterSpacing: "-2px" }}>WhichCity</span>
      <span style={{ fontSize: "28px", color: textSecondary, marginTop: "12px" }}>{t("appSubtitle")}</span>

      {/* Divider */}
      <div style={{ width: "120px", height: "3px", background: green, margin: "36px 0", borderRadius: "2px", display: "flex" }} />

      {/* Stats row */}
      <div style={{ display: "flex", gap: "24px", marginTop: "4px" }}>
        {stats.map((s) => (
          <div key={s.label} style={{
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            background: cardBg, border: `1px solid ${border}`, borderRadius: "16px",
            padding: "28px 36px", minWidth: "200px",
          }}>
            <span style={{ fontSize: "48px", fontWeight: 700, color: green, lineHeight: 1 }}>{s.num}</span>
            <span style={{ fontSize: "18px", color: textSecondary, marginTop: "8px" }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Coverage line — strip the "79 tax systems · " prefix since it's already in the cards */}
      <span style={{ fontSize: "18px", color: textMuted, marginTop: "28px" }}>{t("homeDataCoverage").replace(/^[^·]+·\s*/, "")}</span>

      {/* Footer */}
      <div style={{ display: "flex", justifyContent: "center", marginTop: "24px", fontSize: "14px", color: textMuted, lineHeight: 1 }}>
        <span>{t("dataSourcesDisclaimer")}</span>
      </div>
    </div>,
    {
      ...size,
      fonts: [{ name: "Noto Sans SC", data: fontData, weight: 700, style: "normal" as const }],
    },
  );
}
