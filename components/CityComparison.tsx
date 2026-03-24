"use client";

import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface City {
  id: number;
  name: string;
  country: string;
  continent: string;
  averageIncome: number;
  costOfLiving: number;
  bigMacPrice: number;
  yearlySavings: number;
  currency: string;
  description: string;
  professions: Record<string, number>;
}

type ComparisonMode = "normal" | "ratio" | "bigmac";

interface ExchangeRates {
  rates: Record<string, number>;
  symbols: Record<string, string>;
}

type Locale = "zh" | "en" | "ja" | "es";

const TRANSLATIONS: Record<Locale, Record<string, string>> = {
  zh: {
    loading: "加载数据中...",
    appTitle: "🌍 全球城市职业对比工具",
    appSubtitle: "对比 {count} 个城市的 10 种职业收入和生活成本",
    dayMode: "☀️ 日间模式",
    nightMode: "🌙 夜间模式",
    language: "语言",
    displayCurrency: "💱 显示币种:",
    selectProfession: "选择职业 👨‍💼",
    comparisonMode: "对比模式 (最多 {count} 个城市)",
    modeNormal: "绝对值",
    modeRatio: "相对比例",
    modeBigMac: "以巨无霸算",
    searchPlaceholder: "搜索城市或国家...",
    allContinents: "🌍 显示所有大洲",
    selectedCities: "已选择城市 ({selected}/{max}):",
    chooseCity: "选择城市:",
    showingCities: "显示 60/{total} 个城市，请使用搜索或过滤筛选",
    compareCities: "📊 对比 {count} 个城市",
    clear: "清除",
    needAtLeastTwoCities: "请选择至少2个城市进行对比",
    chartAnalysis: "📈 数据图表分析",
    baseCityTip: "💡 基准城市: {city} - 所有数据按此城市为 1 倍进行对比",
    professionIncomeCompare: "💼 职业年收入对比",
    costRatioAnalysis: "📊 生活成本占比",
    annualFinanceCompare: "💰 年度财务对比",
    cityDetails: "🏙️ 城市详情",
    clickSetBase: "💡 点击任何城市卡片即可将其设为对比基准",
    monthlyExpense: "🏠 月支出",
    yearlySavings: "🏦 年存钱",
    bigMac: "🍔 巨无霸",
    ranking: "📊 数据排名",
    incomeRanking: "💰 收入排名",
    savingsRanking: "🏦 存钱能力",
    valueRanking: "📊 性价比排名",
    annualIncome: "年收入",
    annualExpense: "年支出",
    annualSavings: "年储蓄",
    costRatioKey: "成本占比",
    savingsRatioKey: "可存钱比例",
    bigMacUnit: "个巨无霸",
    oneBigMac: "1 个巨无霸",
  },
  en: {
    loading: "Loading data...",
    appTitle: "🌍 Global City Career Comparison",
    appSubtitle: "Compare income and living costs of 10 professions across {count} cities",
    dayMode: "☀️ Light Mode",
    nightMode: "🌙 Dark Mode",
    language: "Language",
    displayCurrency: "💱 Display currency:",
    selectProfession: "Select profession 👨‍💼",
    comparisonMode: "Comparison mode (up to {count} cities)",
    modeNormal: "Absolute",
    modeRatio: "Relative",
    modeBigMac: "Big Mac",
    searchPlaceholder: "Search city or country...",
    allContinents: "🌍 All continents",
    selectedCities: "Selected cities ({selected}/{max}):",
    chooseCity: "Choose cities:",
    showingCities: "Showing 60/{total} cities, use search or filters to narrow down",
    compareCities: "📊 Compare {count} cities",
    clear: "Clear",
    needAtLeastTwoCities: "Please select at least 2 cities to compare",
    chartAnalysis: "📈 Data Chart Analysis",
    baseCityTip: "💡 Base city: {city} - all values are normalized to 1x against this city",
    professionIncomeCompare: "💼 Annual Income by Profession",
    costRatioAnalysis: "📊 Cost of Living Ratio",
    annualFinanceCompare: "💰 Annual Financial Comparison",
    cityDetails: "🏙️ City Details",
    clickSetBase: "💡 Click any city card to set it as the base city",
    monthlyExpense: "🏠 Monthly Expense",
    yearlySavings: "🏦 Yearly Savings",
    bigMac: "🍔 Big Mac",
    ranking: "📊 Rankings",
    incomeRanking: "💰 Income Ranking",
    savingsRanking: "🏦 Savings Potential",
    valueRanking: "📊 Value-for-Money Ranking",
    annualIncome: "Annual Income",
    annualExpense: "Annual Expense",
    annualSavings: "Annual Savings",
    costRatioKey: "Cost Ratio",
    savingsRatioKey: "Savings Ratio",
    bigMacUnit: "Big Macs",
    oneBigMac: "1 Big Mac",
  },
  ja: {
    loading: "データを読み込み中...",
    appTitle: "🌍 世界都市の職業比較ツール",
    appSubtitle: "{count}都市で10職種の収入と生活費を比較",
    dayMode: "☀️ ライトモード",
    nightMode: "🌙 ダークモード",
    language: "言語",
    displayCurrency: "💱 表示通貨:",
    selectProfession: "職種を選択 👨‍💼",
    comparisonMode: "比較モード（最大{count}都市）",
    modeNormal: "絶対値",
    modeRatio: "相対比率",
    modeBigMac: "ビッグマック換算",
    searchPlaceholder: "都市または国を検索...",
    allContinents: "🌍 すべての大陸",
    selectedCities: "選択済み都市 ({selected}/{max}):",
    chooseCity: "都市を選択:",
    showingCities: "60/{total}都市を表示中。検索またはフィルターをご利用ください",
    compareCities: "📊 {count}都市を比較",
    clear: "クリア",
    needAtLeastTwoCities: "比較するには少なくとも2都市を選択してください",
    chartAnalysis: "📈 データチャート分析",
    baseCityTip: "💡 基準都市: {city} - すべての値はこの都市を1倍として比較",
    professionIncomeCompare: "💼 職種別年収比較",
    costRatioAnalysis: "📊 生活費比率",
    annualFinanceCompare: "💰 年間財務比較",
    cityDetails: "🏙️ 都市詳細",
    clickSetBase: "💡 任意の都市カードをクリックして比較基準に設定",
    monthlyExpense: "🏠 月間支出",
    yearlySavings: "🏦 年間貯蓄",
    bigMac: "🍔 ビッグマック",
    ranking: "📊 ランキング",
    incomeRanking: "💰 収入ランキング",
    savingsRanking: "🏦 貯蓄力",
    valueRanking: "📊 コスパランキング",
    annualIncome: "年間収入",
    annualExpense: "年間支出",
    annualSavings: "年間貯蓄",
    costRatioKey: "コスト比率",
    savingsRatioKey: "貯蓄比率",
    bigMacUnit: "個分",
    oneBigMac: "1個分",
  },
  es: {
    loading: "Cargando datos...",
    appTitle: "🌍 Comparador Global de Ciudades y Profesiones",
    appSubtitle: "Compara ingresos y costo de vida de 10 profesiones en {count} ciudades",
    dayMode: "☀️ Modo Claro",
    nightMode: "🌙 Modo Oscuro",
    language: "Idioma",
    displayCurrency: "💱 Moneda:",
    selectProfession: "Seleccionar profesión 👨‍💼",
    comparisonMode: "Modo de comparación (máx. {count} ciudades)",
    modeNormal: "Absoluto",
    modeRatio: "Relativo",
    modeBigMac: "Big Mac",
    searchPlaceholder: "Buscar ciudad o país...",
    allContinents: "🌍 Todos los continentes",
    selectedCities: "Ciudades seleccionadas ({selected}/{max}):",
    chooseCity: "Elegir ciudades:",
    showingCities: "Mostrando 60/{total} ciudades, usa búsqueda o filtros",
    compareCities: "📊 Comparar {count} ciudades",
    clear: "Limpiar",
    needAtLeastTwoCities: "Selecciona al menos 2 ciudades para comparar",
    chartAnalysis: "📈 Análisis de Gráficos",
    baseCityTip: "💡 Ciudad base: {city} - todos los valores se comparan con 1x en esta ciudad",
    professionIncomeCompare: "💼 Comparación de Ingreso Anual por Profesión",
    costRatioAnalysis: "📊 Proporción de Costo de Vida",
    annualFinanceCompare: "💰 Comparación Financiera Anual",
    cityDetails: "🏙️ Detalles de la Ciudad",
    clickSetBase: "💡 Haz clic en una tarjeta para establecerla como ciudad base",
    monthlyExpense: "🏠 Gasto Mensual",
    yearlySavings: "🏦 Ahorro Anual",
    bigMac: "🍔 Big Mac",
    ranking: "📊 Rankings",
    incomeRanking: "💰 Ranking de Ingresos",
    savingsRanking: "🏦 Potencial de Ahorro",
    valueRanking: "📊 Ranking Calidad-Precio",
    annualIncome: "Ingreso Anual",
    annualExpense: "Gasto Anual",
    annualSavings: "Ahorro Anual",
    costRatioKey: "Proporción de costo",
    savingsRatioKey: "Proporción de ahorro",
    bigMacUnit: "Big Macs",
    oneBigMac: "1 Big Mac",
  },
};

const LANGUAGE_LABELS: Record<Locale, string> = {
  zh: "中文",
  en: "English",
  ja: "日本語",
  es: "Español",
};

const CONTINENT_TRANSLATIONS: Record<string, Record<Locale, string>> = {
  亚洲: { zh: "亚洲", en: "Asia", ja: "アジア", es: "Asia" },
  欧洲: { zh: "欧洲", en: "Europe", ja: "ヨーロッパ", es: "Europa" },
  北美洲: { zh: "北美洲", en: "North America", ja: "北アメリカ", es: "Norteamérica" },
  南美洲: { zh: "南美洲", en: "South America", ja: "南アメリカ", es: "Sudamérica" },
  大洋洲: { zh: "大洋洲", en: "Oceania", ja: "オセアニア", es: "Oceanía" },
  非洲: { zh: "非洲", en: "Africa", ja: "アフリカ", es: "África" },
};

const PROFESSION_TRANSLATIONS: Record<string, Record<Locale, string>> = {
  软件工程师: { zh: "软件工程师", en: "Software Engineer", ja: "ソフトウェアエンジニア", es: "Ingeniero de Software" },
  "医生/医学博士": { zh: "医生/医学博士", en: "Doctor/Physician", ja: "医師", es: "Médico" },
  财务分析师: { zh: "财务分析师", en: "Financial Analyst", ja: "財務アナリスト", es: "Analista Financiero" },
  市场经理: { zh: "市场经理", en: "Marketing Manager", ja: "マーケティングマネージャー", es: "Gerente de Marketing" },
  项目经理: { zh: "项目经理", en: "Project Manager", ja: "プロジェクトマネージャー", es: "Gerente de Proyecto" },
  平面设计师: { zh: "平面设计师", en: "Graphic Designer", ja: "グラフィックデザイナー", es: "Diseñador Gráfico" },
  数据科学家: { zh: "数据科学家", en: "Data Scientist", ja: "データサイエンティスト", es: "Científico de Datos" },
  业务分析师: { zh: "业务分析师", en: "Business Analyst", ja: "ビジネスアナリスト", es: "Analista de Negocio" },
  销售经理: { zh: "销售经理", en: "Sales Manager", ja: "営業マネージャー", es: "Gerente de Ventas" },
  人力资源经理: { zh: "人力资源经理", en: "Human Resources Manager", ja: "人事マネージャー", es: "Gerente de Recursos Humanos" },
};

const POPULAR_CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "JPY",
  "CNY",
  "HKD",
  "AUD",
  "CAD",
  "SGD",
  "INR",
];

export default function CityComparison() {
  const [cities, setCities] = useState<City[]>([]);
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [selectedProfession, setSelectedProfession] = useState<string>("");
  const [comparisonData, setComparisonData] = useState<City[] | null>(null);
  const [baseCityId, setBaseCityId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>("normal");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedContinent, setSelectedContinent] = useState<string>("all");
  const [windowWidth, setWindowWidth] = useState(1200);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<string>("USD");
  const [darkMode, setDarkMode] = useState(false);
  const [locale, setLocale] = useState<Locale>("zh");

  const maxComparisons = windowWidth < 768 ? 2 : windowWidth < 1024 ? 3 : 5;

  useEffect(() => {
    const savedCurrency = localStorage.getItem("selectedCurrency");
    if (savedCurrency) {
      setSelectedCurrency(savedCurrency);
    }
    const savedDarkMode = localStorage.getItem("darkMode");
    if (savedDarkMode) {
      setDarkMode(JSON.parse(savedDarkMode));
    }
    const savedLocale = localStorage.getItem("locale");
    if (savedLocale && ["zh", "en", "ja", "es"].includes(savedLocale)) {
      setLocale(savedLocale as Locale);
    }

    const fetchData = async () => {
      try {
        const [citiesRes, ratesRes] = await Promise.all([
          fetch("/data/cities.json"),
          fetch("/data/exchange-rates.json"),
        ]);

        const citiesData = await citiesRes.json();
        const ratesData = await ratesRes.json();

        setCities(citiesData.cities);
        setExchangeRates(ratesData);

        if (citiesData.cities[0]?.professions) {
          const professions = Object.keys(citiesData.cities[0].professions);
          if (professions.length > 0) {
            setSelectedProfession(professions[0]);
          }
        }

        setLoading(false);
      } catch (error) {
        console.error("Failed to fetch data:", error);
        setLoading(false);
      }
    };

    fetchData();

    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    localStorage.setItem("darkMode", JSON.stringify(darkMode));
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem("locale", locale);
  }, [locale]);

  const t = (key: string, params?: Record<string, string | number>) => {
    const template = TRANSLATIONS[locale]?.[key] || TRANSLATIONS.zh[key] || key;
    if (!params) return template;
    return Object.entries(params).reduce(
      (acc, [paramKey, value]) => acc.replaceAll(`{${paramKey}}`, String(value)),
      template
    );
  };

  const getProfessionLabel = (profession: string): string =>
    PROFESSION_TRANSLATIONS[profession]?.[locale] || profession;

  const getContinentLabel = (continent: string): string =>
    CONTINENT_TRANSLATIONS[continent]?.[locale] || continent;

  const handleCurrencyChange = (currency: string) => {
    setSelectedCurrency(currency);
    localStorage.setItem("selectedCurrency", currency);
  };

  const convertAmount = (amount: number): number => {
    if (!exchangeRates) return amount;
    const rate = exchangeRates.rates[selectedCurrency] || 1;
    return Math.round(amount * rate * 100) / 100;
  };

  const formatCurrency = (amount: number): string => {
    if (!exchangeRates) return `$${amount.toLocaleString()}`;

    const symbol = exchangeRates.symbols[selectedCurrency] || selectedCurrency;
    const converted = convertAmount(amount);

    if (selectedCurrency === "JPY" || selectedCurrency === "VND") {
      return `${symbol}${Math.round(converted).toLocaleString()}`;
    } else if (selectedCurrency === "INR" || selectedCurrency === "PKR") {
      return `${symbol}${converted.toLocaleString("en-IN")}`;
    } else {
      return `${symbol}${converted.toLocaleString()}`;
    }
  };

  const continents = [...new Set(cities.map((c) => c.continent))].sort();
  const professions = cities[0]?.professions
    ? Object.keys(cities[0].professions)
    : [];

  const filteredCities = cities.filter((city) => {
    const matchesSearch =
      city.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      city.country.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesContinent =
      selectedContinent === "all" || city.continent === selectedContinent;

    return matchesSearch && matchesContinent;
  });

  const handleCitySelect = (cityId: string) => {
    const id = cityId.toString();
    setSelectedCities((prev) => {
      if (prev.includes(id)) {
        return prev.filter((c) => c !== id);
      } else if (prev.length < maxComparisons) {
        return [...prev, id];
      }
      return prev;
    });
  };

  const handleCompare = () => {
    if (selectedCities.length < 2) {
      alert(t("needAtLeastTwoCities"));
      return;
    }

    const selected = selectedCities
      .map((id) => cities.find((c) => c.id.toString() === id))
      .filter((city): city is City => city !== undefined);

    if (selected.length > 0) {
      setComparisonData(selected);
      setBaseCityId(selected[0].id.toString());
    }
  };

  const handleClearSelection = () => {
    setSelectedCities([]);
    setComparisonData(null);
    setBaseCityId("");
  };

  const handleCityCardClick = (cityId: string) => {
    if (comparisonData) {
      setBaseCityId(cityId);
    }
  };

  const getRatioValue = (value: number, baseValue: number): number => {
    return parseFloat((value / baseValue).toFixed(2));
  };

  const toBigMacCount = (value: number, bigMacPrice: number): number => {
    if (bigMacPrice <= 0) return 0;
    return parseFloat((value / bigMacPrice).toFixed(2));
  };

  const prepareChartData = () => {
    if (!comparisonData) return [];
    const baseCity = comparisonData.find(c => c.id.toString() === baseCityId) || comparisonData[0];

    return comparisonData.map((city) => {
      const salary = selectedProfession
        ? city.professions[selectedProfession] || 0
        : city.averageIncome;
      const baseSalary = selectedProfession
        ? baseCity.professions[selectedProfession] || 0
        : baseCity.averageIncome;

      const salaryBigMac = toBigMacCount(salary, city.bigMacPrice);
      const monthlyBigMac = toBigMacCount(city.costOfLiving, city.bigMacPrice);
      const yearlyBigMac = toBigMacCount(city.costOfLiving * 12, city.bigMacPrice);
      const savingsBigMac = toBigMacCount(salary - city.costOfLiving * 12, city.bigMacPrice);

      return {
        name: city.name,
        income:
          comparisonMode === "ratio"
            ? getRatioValue(salary, baseSalary)
            : comparisonMode === "bigmac"
              ? salaryBigMac
              : salary,
        monthlyExpense:
          comparisonMode === "ratio"
            ? getRatioValue(city.costOfLiving, baseCity.costOfLiving)
            : comparisonMode === "bigmac"
              ? monthlyBigMac
              : city.costOfLiving,
        yearlyExpense:
          comparisonMode === "ratio"
            ? getRatioValue(city.costOfLiving * 12, baseCity.costOfLiving * 12)
            : comparisonMode === "bigmac"
              ? yearlyBigMac
              : city.costOfLiving * 12,
        savings:
          comparisonMode === "ratio"
            ? getRatioValue(
                salary - city.costOfLiving * 12,
                baseSalary - baseCity.costOfLiving * 12
              )
            : comparisonMode === "bigmac"
              ? savingsBigMac
              : salary - city.costOfLiving * 12,
      };
    });
  };

  const prepareProfessionChartData = () => {
    if (!comparisonData || !selectedProfession) return [];
    const baseCity = comparisonData.find(c => c.id.toString() === baseCityId) || comparisonData[0];

    return comparisonData.map((city) => {
      const salary = city.professions[selectedProfession] || 0;
      const salaryBigMac = toBigMacCount(salary, city.bigMacPrice);
      return {
        name: city.name,
        salary:
          comparisonMode === "ratio"
            ? getRatioValue(salary, baseCity.professions[selectedProfession] || 0)
            : comparisonMode === "bigmac"
              ? salaryBigMac
              : salary,
      };
    });
  };

  const prepareCostRatioData = () => {
    if (!comparisonData || !selectedProfession) return [];
    const baseCity = comparisonData.find(c => c.id.toString() === baseCityId) || comparisonData[0];

    return comparisonData.map((city) => {
      const income = city.professions[selectedProfession] || 0;
      const baseIncome = baseCity.professions[selectedProfession] || 0;
      const yearlyExpense = city.costOfLiving * 12;
      const baseYearlyExpense = baseCity.costOfLiving * 12;

      if (comparisonMode === "ratio") {
        const costRatio = baseIncome > 0 ? (yearlyExpense / income) : 0;
        const baseCostRatio = baseIncome > 0 ? (baseYearlyExpense / baseIncome) : 0;
        const ratioCostRatio = baseCostRatio !== 0 ? getRatioValue(costRatio, baseCostRatio) : costRatio;
        return {
          name: city.name,
          [t("costRatioKey")]: parseFloat(ratioCostRatio.toFixed(1)),
          [t("savingsRatioKey")]: 2 - ratioCostRatio,
        };
      } else {
        const costRatio = income > 0 ? (yearlyExpense / income) * 100 : 0;
        return {
          name: city.name,
          [t("costRatioKey")]: parseFloat(costRatio.toFixed(1)),
          [t("savingsRatioKey")]: 100 - costRatio,
        };
      }
    });
  };

  if (loading) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center p-4 ${
          darkMode
            ? "bg-gradient-to-br from-gray-900 via-gray-800 to-black"
            : "bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50"
        }`}
      >
        <div className="text-center">
          <div
            className={`animate-spin rounded-full h-12 w-12 border-4 ${
              darkMode
                ? "border-blue-400 border-t-transparent"
                : "border-blue-500 border-t-transparent"
            } mx-auto mb-4`}
          ></div>
          <p className={`text-lg ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
            {t("loading")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen py-8 px-4 transition-colors ${
        darkMode
          ? "bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white"
          : "bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50"
      }`}
    >
      <div className="max-w-7xl mx-auto">
        {/* 标题和控制区 */}
        <div className="flex justify-between items-start mb-8 flex-col md:flex-row gap-4">
          <div>
            <h1
              className={`text-5xl md:text-6xl font-bold mb-3 ${
                darkMode
                  ? "text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400"
                  : "text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600"
              }`}
            >
              {t("appTitle")}
            </h1>
            <p
              className={`text-lg ${
                darkMode ? "text-gray-400" : "text-gray-600"
              }`}
            >
              {t("appSubtitle", { count: cities.length })}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className={`text-sm font-semibold ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                {t("language")}:
              </span>
              <select
                value={locale}
                onChange={(e) => setLocale(e.target.value as Locale)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                  darkMode
                    ? "bg-gray-700 text-white border border-gray-600 focus:border-blue-400"
                    : "bg-white text-gray-800 border-2 border-gray-300 focus:border-blue-500"
                } focus:outline-none`}
              >
                {(Object.keys(LANGUAGE_LABELS) as Locale[]).map((lang) => (
                  <option key={lang} value={lang}>
                    {LANGUAGE_LABELS[lang]}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`px-4 py-2 rounded-lg font-medium transition whitespace-nowrap ${
                darkMode
                  ? "bg-yellow-500 text-gray-900 hover:bg-yellow-400"
                  : "bg-indigo-600 text-white hover:bg-indigo-700"
              }`}
            >
              {darkMode ? t("dayMode") : t("nightMode")}
            </button>
          </div>
        </div>

        {/* 币种选择器 */}
        <div className={`rounded-lg shadow-lg p-6 mb-6 ${
          darkMode
            ? "bg-gray-800 border border-gray-700"
            : "bg-white"
        }`}>
          <div className="flex flex-wrap items-center gap-4">
            <span className={`font-semibold ${
              darkMode ? "text-gray-300" : "text-gray-700"
            }`}>
              {t("displayCurrency")}
            </span>
            <div className="flex flex-wrap gap-2">
              {POPULAR_CURRENCIES.map((currency) => (
                <button
                  key={currency}
                  onClick={() => handleCurrencyChange(currency)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition ${
                    selectedCurrency === currency
                      ? "bg-blue-600 text-white"
                      : darkMode
                        ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  {currency}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 职业和对比模式选择 */}
        <div className={`rounded-lg shadow-lg p-6 mb-6 ${
          darkMode
            ? "bg-gray-800 border border-gray-700"
            : "bg-white"
        }`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* 职业选择 */}
            <div>
              <label className={`block text-sm font-semibold mb-3 ${
                darkMode ? "text-gray-300" : "text-gray-700"
              }`}>
                {t("selectProfession")}
              </label>
              <select
                value={selectedProfession}
                onChange={(e) => setSelectedProfession(e.target.value)}
                className={`w-full px-4 py-2 rounded-lg font-medium transition ${
                  darkMode
                    ? "bg-gray-700 text-white border border-gray-600 focus:border-blue-400"
                    : "border-2 border-gray-300 focus:border-blue-500"
                } focus:outline-none`}
              >
                {professions.map((prof) => (
                  <option key={prof} value={prof}>
                    {getProfessionLabel(prof)}
                  </option>
                ))}
              </select>
            </div>

            {/* 对比模式 */}
            <div>
              <label className={`block text-sm font-semibold mb-3 ${
                darkMode ? "text-gray-300" : "text-gray-700"
              }`}>
                {t("comparisonMode", { count: maxComparisons })}
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setComparisonMode("normal")}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition ${
                    comparisonMode === "normal"
                      ? "bg-blue-600 text-white"
                      : darkMode
                        ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  {t("modeNormal")}
                </button>
                <button
                  onClick={() => setComparisonMode("ratio")}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition ${
                    comparisonMode === "ratio"
                      ? "bg-purple-600 text-white"
                      : darkMode
                        ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  {t("modeRatio")}
                </button>
                <button
                  onClick={() => setComparisonMode("bigmac")}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition ${
                    comparisonMode === "bigmac"
                      ? "bg-amber-600 text-white"
                      : darkMode
                        ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  {t("modeBigMac")}
                </button>
              </div>
            </div>
          </div>

          {/* 城市搜索和大洲过滤 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <input
              type="text"
              placeholder={t("searchPlaceholder")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`px-4 py-3 rounded-lg focus:outline-none transition ${
                darkMode
                  ? "bg-gray-700 text-white border border-gray-600 focus:border-blue-400"
                  : "border-2 border-gray-300 focus:border-blue-500"
              }`}
            />

            <select
              value={selectedContinent}
              onChange={(e) => setSelectedContinent(e.target.value)}
              className={`px-4 py-3 rounded-lg focus:outline-none transition font-medium ${
                darkMode
                  ? "bg-gray-700 text-white border border-gray-600 focus:border-blue-400"
                  : "border-2 border-gray-300 focus:border-blue-500"
              }`}
            >
              <option value="all">{t("allContinents")}</option>
              {continents.map((continent) => (
                <option key={continent} value={continent}>
                  {getContinentLabel(continent)}
                </option>
              ))}
            </select>
          </div>

          {/* 已选择的城市标签 */}
          {selectedCities.length > 0 && (
            <div className="mb-6">
              <p className={`text-sm font-semibold mb-3 ${
                darkMode ? "text-gray-300" : "text-gray-700"
              }`}>
                {t("selectedCities", {
                  selected: selectedCities.length,
                  max: maxComparisons,
                })}
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedCities.map((id) => {
                  const city = cities.find(c => c.id.toString() === id);
                  return (
                    <div
                      key={id}
                      className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 ${
                        darkMode
                          ? "bg-blue-600 text-white"
                          : "bg-blue-100 text-blue-900"
                      }`}
                    >
                      {city?.name}
                      <button
                        onClick={() => handleCitySelect(id)}
                        className="hover:font-bold"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 城市选择网格 */}
          <div className="mb-6">
            <p className={`text-sm font-semibold mb-3 ${
              darkMode ? "text-gray-300" : "text-gray-700"
            }`}>
              {t("chooseCity")}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {filteredCities.slice(0, 60).map((city) => (
                <button
                  key={city.id}
                  onClick={() => handleCitySelect(city.id.toString())}
                  disabled={
                    selectedCities.length >= maxComparisons &&
                    !selectedCities.includes(city.id.toString())
                  }
                  title={`${city.name}, ${city.country}`}
                  className={`p-2 rounded-lg font-medium transition text-xs ${
                    selectedCities.includes(city.id.toString())
                      ? "bg-blue-600 text-white shadow-lg"
                      : selectedCities.length >= maxComparisons
                        ? darkMode
                          ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                          : "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : darkMode
                          ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                          : "bg-gray-200 text-gray-700 hover:bg-blue-100"
                  }`}
                >
                  {selectedCities.includes(city.id.toString()) && "✓ "}
                  {city.name}
                </button>
              ))}
            </div>
            {filteredCities.length > 60 && (
              <p className={`text-xs mt-2 ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                {t("showingCities", { total: filteredCities.length })}
              </p>
            )}
          </div>

          {/* 动作按钮 */}
          <div className="flex gap-4">
            <button
              onClick={handleCompare}
              disabled={selectedCities.length < 2}
              className={`flex-1 py-3 px-6 rounded-lg font-bold text-lg transition ${
                selectedCities.length < 2
                  ? darkMode
                    ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-xl"
              }`}
            >
              {t("compareCities", { count: selectedCities.length })}
            </button>

            {selectedCities.length > 0 && (
              <button
                onClick={handleClearSelection}
                className={`px-6 py-3 rounded-lg font-medium transition ${
                  darkMode
                    ? "bg-red-600 hover:bg-red-700 text-white"
                    : "bg-red-500 hover:bg-red-600 text-white"
                }`}
              >
                {t("clear")}
              </button>
            )}
          </div>
        </div>

        {/* 对比结果 */}
        {comparisonData && (
          <div className="space-y-8">
            {/* 图表区域 */}
            <div className={`rounded-xl shadow-xl p-8 ${
              darkMode
                ? "bg-gray-800 border border-gray-700"
                : "bg-white"
            }`}>
              <h2 className={`text-3xl font-bold mb-2 ${
                darkMode ? "text-white" : "text-gray-800"
              }`}>
                {t("chartAnalysis")}
              </h2>
              {comparisonMode === "ratio" && (
                <p className={`text-sm mb-6 ${
                  darkMode ? "text-gray-400" : "text-gray-600"
                }`}>
                  {t("baseCityTip", {
                    city: comparisonData.find(c => c.id.toString() === baseCityId)?.name || comparisonData[0].name,
                  })}
                </p>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* 职业收入对比 */}
                <div className={`p-4 rounded-lg ${
                  darkMode ? "bg-gray-700" : "bg-gray-50"
                }`}>
                  <h3 className={`text-lg font-bold mb-4 ${
                    darkMode ? "text-white" : "text-gray-800"
                  }`}>
                    {t("professionIncomeCompare")}
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={prepareProfessionChartData()}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={darkMode ? "#444" : "#ddd"}
                      />
                      <XAxis
                        dataKey="name"
                        stroke={darkMode ? "#999" : "#666"}
                      />
                      <YAxis stroke={darkMode ? "#999" : "#666"} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: darkMode ? "#333" : "#fff",
                          border: `1px solid ${darkMode ? "#555" : "#ddd"}`,
                          color: darkMode ? "#fff" : "#000",
                        }}
                        formatter={(value: any) =>
                          comparisonMode === "ratio"
                            ? `${parseFloat(value).toFixed(2)}x`
                            : comparisonMode === "bigmac"
                              ? `${parseFloat(value).toFixed(2)} ${t("bigMacUnit")}`
                              : formatCurrency(Number(value))
                        }
                      />
                      <Bar
                        dataKey="salary"
                        fill="#3b82f6"
                        radius={[8, 8, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* 成本占比分析 */}
                <div className={`p-4 rounded-lg ${
                  darkMode ? "bg-gray-700" : "bg-gray-50"
                }`}>
                  <h3 className={`text-lg font-bold mb-4 ${
                    darkMode ? "text-white" : "text-gray-800"
                  }`}>
                    {t("costRatioAnalysis")}
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={prepareCostRatioData()}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={darkMode ? "#444" : "#ddd"}
                      />
                      <XAxis
                        dataKey="name"
                        stroke={darkMode ? "#999" : "#666"}
                      />
                      <YAxis stroke={darkMode ? "#999" : "#666"} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: darkMode ? "#333" : "#fff",
                          border: `1px solid ${darkMode ? "#555" : "#ddd"}`,
                          color: darkMode ? "#fff" : "#000",
                        }}
                        formatter={(value: any) =>
                          `${parseFloat(value).toFixed(1)}%`
                        }
                      />
                      <Legend />
                      <Bar
                        dataKey={t("costRatioKey")}
                        stackId="a"
                        fill="#ef4444"
                      />
                      <Bar
                        dataKey={t("savingsRatioKey")}
                        stackId="a"
                        fill="#10b981"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* 年度财务对比 */}
                <div className={`p-4 rounded-lg lg:col-span-2 ${
                  darkMode ? "bg-gray-700" : "bg-gray-50"
                }`}>
                  <h3 className={`text-lg font-bold mb-4 ${
                    darkMode ? "text-white" : "text-gray-800"
                  }`}>
                    {t("annualFinanceCompare")}
                  </h3>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={prepareChartData()}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={darkMode ? "#444" : "#ddd"}
                      />
                      <XAxis
                        dataKey="name"
                        stroke={darkMode ? "#999" : "#666"}
                      />
                      <YAxis stroke={darkMode ? "#999" : "#666"} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: darkMode ? "#333" : "#fff",
                          border: `1px solid ${darkMode ? "#555" : "#ddd"}`,
                          color: darkMode ? "#fff" : "#000",
                        }}
                        formatter={(value: any) =>
                          comparisonMode === "ratio"
                            ? `${parseFloat(value).toFixed(2)}x`
                            : comparisonMode === "bigmac"
                              ? `${parseFloat(value).toFixed(2)} ${t("bigMacUnit")}`
                              : formatCurrency(Number(value))
                        }
                      />
                      <Legend />
                      <Bar
                        dataKey="income"
                        fill="#3b82f6"
                        name={t("annualIncome")}
                        radius={[8, 8, 0, 0]}
                      />
                      <Bar
                        dataKey="yearlyExpense"
                        fill="#ef4444"
                        name={t("annualExpense")}
                        radius={[8, 8, 0, 0]}
                      />
                      <Bar
                        dataKey="savings"
                        fill="#10b981"
                        name={t("annualSavings")}
                        radius={[8, 8, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* 城市卡片 */}
            <div className={`rounded-xl shadow-xl p-8 ${
              darkMode
                ? "bg-gray-800 border border-gray-700"
                : "bg-white"
            }`}>
              <h2 className={`text-3xl font-bold mb-2 ${
                darkMode ? "text-white" : "text-gray-800"
              }`}>
                {t("cityDetails")}
              </h2>
              <p className={`text-sm mb-6 ${
                darkMode ? "text-gray-400" : "text-gray-600"
              }`}>
                {t("clickSetBase")}
              </p>

              <div
                className={`grid gap-6 ${
                  comparisonData.length === 2
                    ? "grid-cols-1 md:grid-cols-2"
                    : comparisonData.length === 3
                      ? "grid-cols-1 md:grid-cols-3"
                      : comparisonData.length <= 5
                        ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
                        : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8"
                }`}
              >
                {comparisonData.map((city) => {
                  const isBase = city.id.toString() === baseCityId;
                  const baseCity = comparisonData.find(c => c.id.toString() === baseCityId) || comparisonData[0];
                  const salary = selectedProfession
                    ? city.professions[selectedProfession] || 0
                    : city.averageIncome;
                  const baseSalary = selectedProfession
                    ? baseCity.professions[selectedProfession] || 0
                    : baseCity.averageIncome;

                  return (
                    <div
                      key={city.id}
                      onClick={() => handleCityCardClick(city.id.toString())}
                      className={`rounded-xl p-6 shadow-xl transition hover:shadow-2xl cursor-pointer ${
                        isBase && comparisonMode === "ratio"
                          ? "ring-4 ring-yellow-400 ring-opacity-50"
                          : ""
                      } ${
                        isBase || comparisonData.length <= 2
                          ? "bg-gradient-to-br from-blue-600 to-blue-800"
                          : "bg-gradient-to-br from-gray-700 to-gray-900"
                      }`}
                    >
                      {/* 城市信息头 */}
                      <div className="text-center mb-6 pb-4 border-b-2 border-white border-opacity-20">
                        <div className="text-3xl mb-2">
                          {isBase && comparisonMode === "ratio" ? "⭐" : "🏙️"}
                        </div>
                        <h3 className="text-2xl font-bold text-white">
                          {city.name}
                        </h3>
                        <p className="text-sm text-blue-100">
                          {city.country}
                        </p>
                        <p className="text-xs text-blue-200 mt-1">
                          {city.continent}
                        </p>
                      </div>

                      {/* 职业收入 */}
                      <div className="bg-blue-500 bg-opacity-30 p-3 rounded-lg mb-3">
                        <p className="text-xs text-blue-100 mb-1">
                          💼 {getProfessionLabel(selectedProfession)}
                        </p>
                        <p className="text-xl font-bold text-white">
                          {comparisonMode === "ratio"
                            ? `${getRatioValue(salary, baseSalary)}x`
                            : comparisonMode === "bigmac"
                              ? `${toBigMacCount(salary, city.bigMacPrice)} ${t("bigMacUnit")}`
                              : formatCurrency(salary)}
                        </p>
                      </div>

                      {/* 月支出 */}
                      <div className="bg-red-500 bg-opacity-30 p-3 rounded-lg mb-3">
                        <p className="text-xs text-red-100 mb-1">
                          {t("monthlyExpense")}
                        </p>
                        <p className="text-xl font-bold text-white">
                          {comparisonMode === "ratio"
                            ? `${getRatioValue(city.costOfLiving, baseCity.costOfLiving)}x`
                            : comparisonMode === "bigmac"
                              ? `${toBigMacCount(city.costOfLiving, city.bigMacPrice)} ${t("bigMacUnit")}`
                              : formatCurrency(city.costOfLiving)}
                        </p>
                      </div>

                      {/* 年存钱 */}
                      <div className="bg-green-500 bg-opacity-30 p-3 rounded-lg mb-3">
                        <p className="text-xs text-green-100 mb-1">
                          {t("yearlySavings")}
                        </p>
                        <p
                          className={`text-xl font-bold ${
                            salary - city.costOfLiving * 12 > 0
                              ? "text-lime-200"
                              : "text-red-200"
                          }`}
                        >
                          {comparisonMode === "ratio"
                            ? `${getRatioValue(
                                salary - city.costOfLiving * 12,
                                baseSalary - baseCity.costOfLiving * 12
                              )}x`
                            : comparisonMode === "bigmac"
                              ? `${toBigMacCount(salary - city.costOfLiving * 12, city.bigMacPrice)} ${t("bigMacUnit")}`
                              : formatCurrency(salary - city.costOfLiving * 12)}
                        </p>
                      </div>

                      {/* 巨无霸价格 */}
                      <div className="bg-yellow-500 bg-opacity-30 p-3 rounded-lg">
                        <p className="text-xs text-yellow-100 mb-1">
                          {t("bigMac")}
                        </p>
                        <p className="text-lg font-bold text-white">
                          {comparisonMode === "ratio"
                            ? `${getRatioValue(city.bigMacPrice, baseCity.bigMacPrice)}x`
                            : comparisonMode === "bigmac"
                              ? t("oneBigMac")
                              : formatCurrency(city.bigMacPrice)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 数据排名 */}
            <div className={`rounded-xl shadow-xl p-8 ${
              darkMode
                ? "bg-gray-800 border border-gray-700"
                : "bg-white"
            }`}>
              <h2 className={`text-3xl font-bold mb-6 ${
                darkMode ? "text-white" : "text-gray-800"
              }`}>
                {t("ranking")}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* 收入排名 */}
                <div className={`rounded-lg p-6 ${
                  darkMode
                    ? "bg-gradient-to-br from-blue-600 to-blue-800"
                    : "bg-gradient-to-br from-blue-50 to-blue-100"
                }`}>
                  <h3
                    className={`text-lg font-bold mb-4 ${
                      darkMode
                        ? "text-white"
                        : "text-blue-900"
                    }`}
                  >
                    {t("incomeRanking")}
                  </h3>
                  <div className="space-y-2">
                    {[...comparisonData]
                      .sort((a, b) => {
                        const salaryA = selectedProfession
                          ? a.professions[selectedProfession] || 0
                          : a.averageIncome;
                        const salaryB = selectedProfession
                          ? b.professions[selectedProfession] || 0
                          : b.averageIncome;
                        return salaryB - salaryA;
                      })
                      .map((city, idx) => (
                        <div
                          key={city.id}
                          className={`flex justify-between items-center p-2 rounded ${
                            darkMode
                              ? "bg-blue-700"
                              : "bg-white"
                          }`}
                        >
                          <span
                            className={`font-semibold ${
                              darkMode
                                ? "text-white"
                                : "text-blue-900"
                            }`}
                          >
                            {idx + 1}. {city.name}
                          </span>
                          <span
                            className={`text-sm ${
                              darkMode
                                ? "text-blue-200"
                                : "text-blue-700"
                            }`}
                          >
                            {formatCurrency(
                              selectedProfession
                                ? city.professions[selectedProfession] || 0
                                : city.averageIncome
                            )}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>

                {/* 存钱能力排名 */}
                <div className={`rounded-lg p-6 ${
                  darkMode
                    ? "bg-gradient-to-br from-green-600 to-green-800"
                    : "bg-gradient-to-br from-green-50 to-green-100"
                }`}>
                  <h3
                    className={`text-lg font-bold mb-4 ${
                      darkMode
                        ? "text-white"
                        : "text-green-900"
                    }`}
                  >
                    {t("savingsRanking")}
                  </h3>
                  <div className="space-y-2">
                    {[...comparisonData]
                      .sort((a, b) => {
                        const savingsA = selectedProfession
                          ? (a.professions[selectedProfession] || 0) -
                            a.costOfLiving * 12
                          : a.yearlySavings;
                        const savingsB = selectedProfession
                          ? (b.professions[selectedProfession] || 0) -
                            b.costOfLiving * 12
                          : b.yearlySavings;
                        return savingsB - savingsA;
                      })
                      .map((city, idx) => {
                        const savings = selectedProfession
                          ? (city.professions[selectedProfession] || 0) -
                            city.costOfLiving * 12
                          : city.yearlySavings;
                        const baseSavings = (() => {
                          const baseCity = comparisonData.find(c => c.id.toString() === baseCityId) || comparisonData[0];
                          return selectedProfession
                            ? (baseCity.professions[selectedProfession] || 0) - baseCity.costOfLiving * 12
                            : baseCity.yearlySavings;
                        })();
                        return (
                          <div
                            key={city.id}
                            className={`flex justify-between items-center p-2 rounded ${
                              darkMode
                                ? "bg-green-700"
                                : "bg-white"
                            }`}
                          >
                            <span
                              className={`font-semibold ${
                                darkMode
                                  ? "text-white"
                                  : "text-green-900"
                              }`}
                            >
                              {idx + 1}. {city.name}
                            </span>
                            <span
                              className={`text-sm font-medium ${
                                savings > 0
                                  ? darkMode
                                    ? "text-lime-200"
                                    : "text-green-700"
                                  : darkMode
                                    ? "text-red-200"
                                    : "text-red-700"
                              }`}
                            >
                              {comparisonMode === "ratio"
                                ? `${getRatioValue(savings, baseSavings)}x`
                                : formatCurrency(savings)}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* 成本占比排名 */}
                <div className={`rounded-lg p-6 ${
                  darkMode
                    ? "bg-gradient-to-br from-orange-600 to-orange-800"
                    : "bg-gradient-to-br from-orange-50 to-orange-100"
                }`}>
                  <h3
                    className={`text-lg font-bold mb-4 ${
                      darkMode
                        ? "text-white"
                        : "text-orange-900"
                    }`}
                  >
                    {t("valueRanking")}
                  </h3>
                  <div className="space-y-2">
                    {[...comparisonData]
                      .sort((a, b) => {
                        const ratioA = selectedProfession
                          ? (a.costOfLiving * 12) /
                            (a.professions[selectedProfession] || 1)
                          : (a.costOfLiving * 12) / a.averageIncome;
                        const ratioB = selectedProfession
                          ? (b.costOfLiving * 12) /
                            (b.professions[selectedProfession] || 1)
                          : (b.costOfLiving * 12) / b.averageIncome;
                        return ratioA - ratioB;
                      })
                      .map((city, idx) => {
                        const salary = selectedProfession
                          ? city.professions[selectedProfession] || 0
                          : city.averageIncome;
                        const ratio =
                          salary > 0
                            ? (
                              ((city.costOfLiving * 12) / salary) *
                              100
                            ).toFixed(1)
                            : "0";
                        return (
                          <div
                            key={city.id}
                            className={`flex justify-between items-center p-2 rounded ${
                              darkMode
                                ? "bg-orange-700"
                                : "bg-white"
                            }`}
                          >
                            <span
                              className={`font-semibold ${
                                darkMode
                                  ? "text-white"
                                  : "text-orange-900"
                              }`}
                            >
                              {idx + 1}. {city.name}
                            </span>
                            <span
                              className={`text-sm ${
                                darkMode
                                  ? "text-orange-200"
                                  : "text-orange-700"
                              }`}
                            >
                              {ratio}%
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
