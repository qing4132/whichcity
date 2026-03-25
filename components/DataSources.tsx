"use client";

import { useCompare } from "@/lib/CompareContext";

export default function DataSources() {
  const { darkMode, t } = useCompare();

  const srcCls = `text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`;

  return (
    <div className={`rounded-xl shadow-md p-4 sm:p-6 ${darkMode ? "bg-gray-800 border border-gray-700" : "bg-white border border-gray-100"}`}>
      <h3 className={`text-base sm:text-lg font-semibold mb-3 ${darkMode ? "text-white" : "text-gray-800"}`}>
        {t("dataSourcesTitle")}
      </h3>
      <p className={`text-sm mb-3 ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
        {t("dataSourcesDesc")}
      </p>
      <div className={`space-y-1.5 ${srcCls}`}>
        <p>• {t("dataSalarySrc")}</p>
        <p>• {t("dataCostSrc")}</p>
        <p>• {t("dataHouseSrc")}</p>
        <p>• {t("dataBigMacSrc")}</p>
        <p>• {t("dataClimateSrc")}</p>
        <p>• {t("dataAqiSrc")}</p>
        <p>• {t("dataDoctorSrc")}</p>
      </div>
      <div className={`mt-4 pt-3 border-t ${darkMode ? "border-gray-700" : "border-gray-200"}`}>
        <p className={`text-xs ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
          {t("dataSourcesDisclaimer")}
        </p>
        <p className={`text-xs mt-1 font-medium ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
          {t("dataLastUpdated")}
        </p>
      </div>
    </div>
  );
}
