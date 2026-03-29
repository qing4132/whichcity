"use client";

import { useState, useRef, useCallback } from "react";
import { useCompare } from "@/lib/CompareContext";
import type { City } from "@/lib/types";
import { computeNetIncome } from "@/lib/taxUtils";

interface ShareCardProps {
  comparisonData: City[];
}

export default function ShareCard({ comparisonData }: ShareCardProps) {
  const { darkMode, selectedProfession, incomeMode, t, getCityLabel, getProfessionLabel, formatCurrency, getCost } = useCompare();
  const [cardDataUrl, setCardDataUrl] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const getIncome = useCallback((city: City) => {
    const gross = selectedProfession ? city.professions[selectedProfession] || 0 : 0;
    return computeNetIncome(gross, city.country, city.id, incomeMode).netUSD;
  }, [selectedProfession, incomeMode]);

  const generateCard = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = 2;
    const W = 600;
    const cityCount = comparisonData.length;
    const H = 260 + cityCount * 90;
    canvas.width = W * dpr;
    canvas.height = H * dpr;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    // Background
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, "#0f172a");
    grad.addColorStop(1, "#1e293b");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Title bar
    ctx.fillStyle = "rgba(59,130,246,0.15)";
    ctx.fillRect(0, 0, W, 70);

    ctx.fillStyle = "#93c5fd";
    ctx.font = "bold 22px system-ui, -apple-system, sans-serif";
    ctx.fillText(t("shareCardTitle"), 24, 44);

    // Profession label
    ctx.fillStyle = "#94a3b8";
    ctx.font = "14px system-ui, -apple-system, sans-serif";
    ctx.fillText(`${t("selectProfession")}: ${getProfessionLabel(selectedProfession)}`, 24, 100);

    // City data rows
    let y = 130;
    const bestSavings = Math.max(...comparisonData.map(c => getIncome(c) - getCost(c) * 12));

    for (const city of comparisonData) {
      const income = getIncome(city);
      const cost = getCost(city);
      const savings = income - cost * 12;
      const isBest = savings === bestSavings && savings > 0;

      // Row background
      ctx.fillStyle = isBest ? "rgba(34,197,94,0.1)" : "rgba(255,255,255,0.04)";
      ctx.beginPath();
      ctx.roundRect(16, y - 4, W - 32, 78, 8);
      ctx.fill();

      if (isBest) {
        ctx.strokeStyle = "rgba(34,197,94,0.3)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(16, y - 4, W - 32, 78, 8);
        ctx.stroke();
      }

      // City name
      ctx.fillStyle = "#f1f5f9";
      ctx.font = "bold 16px system-ui, -apple-system, sans-serif";
      ctx.fillText(getCityLabel(city), 30, y + 22);

      // Data columns
      const col1 = 30;
      const col2 = 220;
      const col3 = 410;

      ctx.fillStyle = "#64748b";
      ctx.font = "11px system-ui, -apple-system, sans-serif";
      ctx.fillText(t("shareCardIncome"), col1, y + 44);
      ctx.fillText(t("shareCardCost"), col2, y + 44);
      ctx.fillText(t("shareCardSavings"), col3, y + 44);

      ctx.font = "bold 14px system-ui, -apple-system, sans-serif";
      ctx.fillStyle = "#93c5fd";
      ctx.fillText(formatCurrency(income), col1, y + 62);
      ctx.fillStyle = "#fca5a5";
      ctx.fillText(formatCurrency(cost), col2, y + 62);
      ctx.fillStyle = savings > 0 ? "#86efac" : "#fca5a5";
      ctx.fillText(formatCurrency(savings), col3, y + 62);

      y += 90;
    }

    // Footer
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    ctx.fillRect(0, H - 44, W, 44);
    ctx.fillStyle = "#475569";
    ctx.font = "12px system-ui, -apple-system, sans-serif";
    ctx.fillText(t("shareCardFooter"), 24, H - 18);

    ctx.fillStyle = "#475569";
    ctx.textAlign = "right";
    ctx.fillText(new Date().toLocaleDateString(), W - 24, H - 18);
    ctx.textAlign = "left";

    // Save as data URL so the modal displays a stable image
    setCardDataUrl(canvas.toDataURL("image/png"));
  }, [comparisonData, selectedProfession, t, getCityLabel, getProfessionLabel, formatCurrency, getCost, getIncome]);

  const downloadCard = () => {
    if (!cardDataUrl) return;
    const link = document.createElement("a");
    link.download = "city-compare.png";
    link.href = cardDataUrl;
    link.click();
  };

  return (
    <div>
      {/* Off-screen canvas used only for drawing */}
      <canvas ref={canvasRef} style={{ position: "absolute", left: "-9999px", top: "-9999px" }} />

      <button onClick={generateCard}
        className={`px-4 py-2 rounded-lg font-medium text-sm transition flex items-center gap-1.5 ${
          darkMode ? "bg-gray-600 text-gray-300 hover:bg-gray-500" : "bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200"
        }`}>
        {t("shareCardGenerate")}
      </button>

      {cardDataUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setCardDataUrl(null)}>
          <div className={`max-w-[640px] w-full rounded-xl p-4 ${darkMode ? "bg-slate-800" : "bg-white"} shadow-2xl`}
            onClick={e => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cardDataUrl} alt="Share card" className="w-full rounded-lg" />
            <div className="flex gap-2 mt-3 justify-end">
              <button onClick={downloadCard}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium text-sm hover:bg-blue-500 transition">
                {t("shareCardDownload")}
              </button>
              <button onClick={() => setCardDataUrl(null)}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition ${darkMode ? "bg-slate-700 text-slate-300" : "bg-gray-100 text-gray-700"}`}>
                ✕
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
