"use client";

import type { ClimateInfo } from "@/lib/types";
import type { Locale } from "@/lib/types";

const MONTH_LABELS: Record<Locale, string[]> = {
  zh: ["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"],
  en: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
  ja: ["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"],
  es: ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dec"],
};

interface Props {
  climate: ClimateInfo;
  locale: Locale;
  darkMode: boolean;
  t: (key: string) => string;
  hideTitle?: boolean;
  hideLegend?: boolean;
}

export default function ClimateChart({ climate, locale, darkMode, t, hideTitle, hideLegend }: Props) {
  const { monthlyHighC, monthlyLowC, monthlyRainMm } = climate;
  if (!monthlyHighC || !monthlyLowC || !monthlyRainMm) return null;

  const months = MONTH_LABELS[locale] || MONTH_LABELS.en;

  // Temperature range for scaling (add padding)
  const allTemps = [...monthlyHighC, ...monthlyLowC];
  const tempMin = Math.min(...allTemps);
  const tempMax = Math.max(...allTemps);
  const padMin = Math.floor(tempMin / 5) * 5 - 5;
  const padMax = Math.ceil(tempMax / 5) * 5 + 5;
  const tempRange = padMax - padMin;

  // Rain max for scaling
  const rainMax = Math.max(...monthlyRainMm);
  const rainCeil = Math.ceil(rainMax / 50) * 50 || 50;

  // Chart height
  const TEMP_H = 160;
  const RAIN_H = 50;

  const tempY = (v: number) => TEMP_H - ((v - padMin) / tempRange) * TEMP_H;
  const rainH = (v: number) => (v / rainCeil) * RAIN_H;

  // Zero line position
  const zeroY = tempY(0);
  const showZeroLine = padMin < 0 && padMax > 0;

  const labelCls = darkMode ? "text-slate-400" : "text-slate-500";
  const borderCls = darkMode ? "border-slate-700" : "border-slate-200";

  // Colors — amber (warmth) + sky (water), harmonious with slate theme
  const tempBg = darkMode ? "#fbbf24" : "#f59e0b";
  const tempHighCls = darkMode ? "text-amber-400" : "text-amber-600";
  const tempLowCls = darkMode ? "text-amber-400" : "text-amber-600";
  const rainBg = darkMode ? "#38bdf8" : "#0ea5e9";

  return (
    <div className={hideTitle ? "" : `mt-6 pt-5 border-t ${borderCls}`}>
      {!hideTitle && (
      <h3 className={`text-xs font-semibold tracking-wide mb-3 ${labelCls}`}>
        {t("climateChart")}
      </h3>
      )}
      <div>
        {/* Temperature chart */}
        <div className="flex items-end gap-0">
          {/* Y-axis labels */}
          <div className="flex flex-col justify-between shrink-0" style={{ height: TEMP_H, width: 28 }}>
            <span className={`text-[10px] leading-none ${labelCls}`}>{padMax}°</span>
            <span className={`text-[10px] leading-none ${labelCls}`}>{Math.round((padMax + padMin) / 2)}°</span>
            <span className={`text-[10px] leading-none ${labelCls}`}>{padMin}°</span>
          </div>
          {/* Bars */}
          <div className="flex-1 flex items-end relative">
            {showZeroLine && (
              <div className={`absolute left-0 right-0 border-t border-dashed ${darkMode ? "border-slate-600" : "border-slate-300"}`} style={{ bottom: TEMP_H - zeroY }} />
            )}
            <div className="flex w-full">
              {months.map((m, i) => {
                const high = monthlyHighC[i];
                const low = monthlyLowC[i];
                const topY = tempY(high);
                const botY = tempY(low);
                const barH = botY - topY;
                return (
                  <div key={m} className="flex-1 flex flex-col items-center relative" style={{ height: TEMP_H }}>
                    <span className={`absolute text-[10px] font-bold ${tempHighCls}`} style={{ top: topY - 14 }}>{high}</span>
                    <div
                      className="absolute w-[60%] rounded-sm"
                      style={{
                        top: topY,
                        height: Math.max(barH, 2),
                        background: tempBg,
                      }}
                    />
                    <span className={`absolute text-[10px] font-bold ${tempLowCls}`} style={{ top: botY + 2 }}>{low}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Rainfall chart */}
        <div className="flex items-end gap-0 mt-3">
          <div className="flex flex-col justify-between shrink-0" style={{ height: RAIN_H, width: 28 }}>
            <span className={`text-[10px] leading-none ${labelCls}`}>{rainCeil}</span>
            <span className={`text-[10px] leading-none ${labelCls}`}>0</span>
          </div>
          <div className="flex-1 flex items-end">
            <div className="flex w-full" style={{ height: RAIN_H }}>
              {months.map((m, i) => (
                <div key={m} className="flex-1 flex flex-col items-center justify-end">
                  <div
                    className="w-[55%] rounded-t-sm"
                    style={{
                      height: rainH(monthlyRainMm[i]),
                      background: rainBg,
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Month labels + rain values */}
        <div className="flex mt-1">
          <div className="shrink-0 pr-1" style={{ width: 28 }} />
          <div className="flex-1 flex">
            {months.map((m, i) => (
              <div key={m} className="flex-1 text-center">
                <p className={`text-[10px] font-medium ${darkMode ? "text-slate-300" : "text-slate-600"}`}>{m}</p>
                <p className={`text-[9px] ${darkMode ? "text-sky-400" : "text-sky-600"}`}>{monthlyRainMm[i]}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        {!hideLegend && (
        <div className={`flex items-center justify-center gap-4 mt-3 text-[10px] ${labelCls}`}>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-2 rounded-sm" style={{ background: tempBg }} />
            {t("chartTempLegend")}
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-2 rounded-sm" style={{ background: rainBg }} />
            {t("chartRainLegend")}
          </span>
        </div>
        )}
      </div>
    </div>
  );
}
