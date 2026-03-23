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

type ComparisonMode = "normal" | "ratio";

interface ExchangeRates {
  rates: Record<string, number>;
  symbols: Record<string, string>;
}

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
  const [loading, setLoading] = useState(true);
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>("normal");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedContinent, setSelectedContinent] = useState<string>("all");
  const [windowWidth, setWindowWidth] = useState(1200);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<string>("USD");
  const [darkMode, setDarkMode] = useState(false);

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
      alert("请选择至少2个城市进行对比");
      return;
    }

    const selected = selectedCities
      .map((id) => cities.find((c) => c.id.toString() === id))
      .filter((city): city is City => city !== undefined);

    if (selected.length > 0) {
      setComparisonData(selected);
    }
  };

  const handleClearSelection = () => {
    setSelectedCities([]);
    setComparisonData(null);
  };

  const getRatioValue = (value: number, baseValue: number): number => {
    return parseFloat((value / baseValue).toFixed(2));
  };

  const prepareChartData = () => {
    if (!comparisonData) return [];

    return comparisonData.map((city) => ({
      name: city.name,
      income: selectedProfession
        ? city.professions[selectedProfession] || 0
        : city.averageIncome,
      monthlyExpense: city.costOfLiving,
      yearlyExpense: city.costOfLiving * 12,
      savings: selectedProfession
        ? (city.professions[selectedProfession] || 0) -
          city.costOfLiving * 12
        : city.yearlySavings,
    }));
  };

  const prepareProfessionChartData = () => {
    if (!comparisonData || !selectedProfession) return [];

    return comparisonData.map((city) => ({
      name: city.name,
      salary: city.professions[selectedProfession] || 0,
    }));
  };

  const prepareCostRatioData = () => {
    if (!comparisonData || !selectedProfession) return [];

    return comparisonData.map((city) => {
      const income = city.professions[selectedProfession] || 0;
      const yearlyExpense = city.costOfLiving * 12;
      const costRatio = income > 0 ? (yearlyExpense / income) * 100 : 0;

      return {
        name: city.name,
        成本占比: parseFloat(costRatio.toFixed(1)),
        可存钱比例: 100 - costRatio,
      };
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
            加载数据中...
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
              🌍 全球城市职业对比工具
            </h1>
            <p
              className={`text-lg ${
                darkMode ? "text-gray-400" : "text-gray-600"
              }`}
            >
              对比{cities.length}个城市的10种职业收入和生活成本
            </p>
          </div>

          {/* 夜间模式切换 */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`px-4 py-2 rounded-lg font-medium transition whitespace-nowrap ${
              darkMode
                ? "bg-yellow-500 text-gray-900 hover:bg-yellow-400"
                : "bg-indigo-600 text-white hover:bg-indigo-700"
            }`}
          >
            {darkMode ? "☀️ 日间模式" : "🌙 夜间模式"}
          </button>
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
              💱 显示币种:
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
                选择职业 👨‍💼
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
                    {prof}
                  </option>
                ))}
              </select>
            </div>

            {/* 对比模式 */}
            <div>
              <label className={`block text-sm font-semibold mb-3 ${
                darkMode ? "text-gray-300" : "text-gray-700"
              }`}>
                对比模式 (最多{maxComparisons}个城市)
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
                  绝对值
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
                  相对比例
                </button>
              </div>
            </div>
          </div>

          {/* 城市搜索和大洲过滤 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <input
              type="text"
              placeholder="搜索城市或国家..."
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
              <option value="all">🌍 显示所有大洲</option>
              {continents.map((continent) => (
                <option key={continent} value={continent}>
                  {continent}
                </option>
              ))}
            </select>
          </div>

          {/* 城市选择网格 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
            {filteredCities.slice(0, 40).map((city) => (
              <button
                key={city.id}
                onClick={() => handleCitySelect(city.id.toString())}
                disabled={
                  selectedCities.length >= maxComparisons &&
                  !selectedCities.includes(city.id.toString())
                }
                className={`p-3 rounded-lg font-medium transition text-sm truncate ${
                  selectedCities.includes(city.id.toString())
                    ? "bg-blue-600 text-white shadow-lg scale-105"
                    : selectedCities.length >= maxComparisons
                      ? darkMode
                        ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                        : "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : darkMode
                        ? "bg-gray-700 text-gray-300 hover:bg-gray-600 cursor-pointer"
                        : "bg-gray-100 text-gray-700 hover:bg-blue-100 cursor-pointer"
                }`}
              >
                {selectedCities.includes(city.id.toString()) && "✓ "}
                {city.name}
              </button>
            ))}
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
              📊 对比 {selectedCities.length} 个城市
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
                清除 ({selectedCities.length})
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
              <h2 className={`text-3xl font-bold mb-6 ${
                darkMode ? "text-white" : "text-gray-800"
              }`}>
                📈 数据图表分析
              </h2>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* 职业收入对比 */}
                <div className={`p-4 rounded-lg ${
                  darkMode ? "bg-gray-700" : "bg-gray-50"
                }`}>
                  <h3 className={`text-lg font-bold mb-4 ${
                    darkMode ? "text-white" : "text-gray-800"
                  }`}>
                    💼 职业年收入对比
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
                          formatCurrency(Number(value))
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
                    📊 生活成本占比
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
                        dataKey="成本占比"
                        stackId="a"
                        fill="#ef4444"
                      />
                      <Bar
                        dataKey="可存钱比例"
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
                    💰 年度财务对比
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
                          formatCurrency(Number(value))
                        }
                      />
                      <Legend />
                      <Bar
                        dataKey="income"
                        fill="#3b82f6"
                        name="年收入"
                        radius={[8, 8, 0, 0]}
                      />
                      <Bar
                        dataKey="yearlyExpense"
                        fill="#ef4444"
                        name="年支出"
                        radius={[8, 8, 0, 0]}
                      />
                      <Bar
                        dataKey="savings"
                        fill="#10b981"
                        name="年储蓄"
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
              <h2 className={`text-3xl font-bold mb-6 ${
                darkMode ? "text-white" : "text-gray-800"
              }`}>
                🏙️ 城市详情
              </h2>

              <div
                className={`grid gap-6 ${
                  comparisonData.length === 2
                    ? "grid-cols-1 md:grid-cols-2"
                    : comparisonData.length === 3
                      ? "grid-cols-1 md:grid-cols-3"
                      : comparisonData.length === 4
                        ? "grid-cols-2 lg:grid-cols-4"
                        : "grid-cols-2 lg:grid-cols-5"
                }`}
              >
                {comparisonData.map((city, index) => {
                  const baseCity = comparisonData[0];
                  const isBase = index === 0;
                  const salary = selectedProfession
                    ? city.professions[selectedProfession] || 0
                    : city.averageIncome;
                  const baseSalary = selectedProfession
                    ? baseCity.professions[selectedProfession] || 0
                    : baseCity.averageIncome;

                  return (
                    <div
                      key={city.id}
                      className={`rounded-xl p-6 shadow-xl transition hover:shadow-2xl ${
                        isBase
                          ? "bg-gradient-to-br from-blue-600 to-blue-800"
                          : "bg-gradient-to-br from-gray-700 to-gray-900"
                      }`}
                    >
                      {/* 城市信息头 */}
                      <div className="text-center mb-6 pb-4 border-b-2 border-white border-opacity-20">
                        <div className="text-3xl mb-2">
                          {isBase ? "🌟" : "🏙️"}
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
                          💼 {selectedProfession}
                        </p>
                        <div>
                          <p className="text-xl font-bold text-white">
                            {comparisonMode === "ratio"
                              ? `${getRatioValue(
                                  salary,
                                  baseSalary
                                )}x`
                              : formatCurrency(salary)}
                          </p>
                          {comparisonMode === "normal" && index > 0 && (
                            <p className="text-xs text-blue-200 mt-1">
                              {salary > baseSalary
                                ? `+${formatCurrency(salary - baseSalary)}`
                                : `-${formatCurrency(baseSalary - salary)}`}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* 月支出 */}
                      <div className="bg-red-500 bg-opacity-30 p-3 rounded-lg mb-3">
                        <p className="text-xs text-red-100 mb-1">
                          🏠 月支出
                        </p>
                        <p className="text-xl font-bold text-white">
                          {formatCurrency(city.costOfLiving)}
                        </p>
                      </div>

                      {/* 年存钱 */}
                      <div className="bg-green-500 bg-opacity-30 p-3 rounded-lg mb-3">
                        <p className="text-xs text-green-100 mb-1">
                          🏦 年存钱
                        </p>
                        <p
                          className={`text-xl font-bold ${
                            salary - city.costOfLiving * 12 > 0
                              ? "text-lime-200"
                              : "text-red-200"
                          }`}
                        >
                          {formatCurrency(salary - city.costOfLiving * 12)}
                        </p>
                      </div>

                      {/* 麦当劳 */}
                      <div className="bg-yellow-500 bg-opacity-30 p-3 rounded-lg">
                        <p className="text-xs text-yellow-100 mb-1">
                          🍔 巨无霸
                        </p>
                        <p className="text-lg font-bold text-white">
                          {formatCurrency(city.bigMacPrice)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 对比分析 */}
            <div className={`rounded-xl shadow-xl p-8 ${
              darkMode
                ? "bg-gray-800 border border-gray-700"
                : "bg-white"
            }`}>
              <h2 className={`text-3xl font-bold mb-6 ${
                darkMode ? "text-white" : "text-gray-800"
              }`}>
                📊 数据排名
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
                    💰 收入排名
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
                    🏦 存钱能力
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
                              {formatCurrency(savings)}
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
                    📊 性价比排名
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
