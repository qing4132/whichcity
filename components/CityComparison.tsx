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

type ClimateType =
  | "tropical"
  | "temperate"
  | "continental"
  | "arid"
  | "mediterranean"
  | "oceanic";

interface ClimateInfo {
  type: ClimateType;
  avgTempC: number;
  annualRainMm: number;
  sunshineHours: number;
}

interface CityInfraInfo {
  doctorsPerThousand: number;
  avgAqi3y: number;
  directDestinations: number;
}

const TRANSLATIONS: Record<Locale, Record<string, string>> = {
  zh: {
    loading: "加载数据中...",
    appTitle: "全球城市职业对比",
    appSubtitle: "对比 {count} 个城市的职业收入与生活成本",
    dayMode: "日间模式",
    nightMode: "夜间模式",
    language: "语言",
    displayCurrency: "显示币种:",
    selectProfession: "选择职业",
    comparisonMode: "对比模式 (最多 {count} 个城市)",
    modeNormal: "绝对值",
    modeRatio: "相对比例",
    modeBigMac: "巨无霸模式",
    searchPlaceholder: "搜索城市或国家...",
    allContinents: "显示所有大洲",
    selectedCities: "已选择城市 ({selected}/{max}):",
    chooseCity: "选择城市:",
    showingCities: "显示 100/{total} 个城市，请使用搜索或过滤筛选",
    compareCities: "对比 {count} 个城市",
    clear: "清除",
    needAtLeastTwoCities: "请选择至少2个城市进行对比",
    chartAnalysis: "数据图表分析",
    baseCityTip: "基准城市: {city} - 所有数据按此城市为 1 倍进行对比",
    professionIncomeCompare: "职业年收入对比",
    costRatioAnalysis: "生活成本占比",
    annualFinanceCompare: "年度财务对比",
    cityDetails: "城市详情",
    clickSetBase: "点击任何城市卡片可设为对比基准",
    monthlyExpense: "月支出",
    yearlySavings: "年存钱",
    bigMac: "巨无霸",
    ranking: "数据排名",
    incomeRanking: "💰 收入排名",
    savingsRanking: "🏦 存钱能力",
    lowestCostCity: "🔻 最低生活成本城市",
    insightSuggestionTitle: "推荐下一步",
    insightSuggestionPick3: "当前最适合深度调研的城市：{cities}。优先关注收入和储蓄潜力。",
    insightSuggestionNeedMore: "建议选择至少 3 个城市进行对比（当前：{count}）。",
    annualIncome: "年收入",
    annualSavings: "年储蓄",
    costRatioKey: "成本占比",
    savingsRatioKey: "可存钱比例",
    bigMacUnit: "个巨无霸",
    oneBigMac: "1 个巨无霸",
    cityDescription: "城市描述",
    keyInsights: "关键洞察",
    topIncomeCity: "最高收入城市",
    topSavingsCity: "最佳储蓄城市",
    climate: "气候",
    climateCompare: "气候对比",
    climateType: "气候类型",
    avgTemp: "年均温",
    annualRain: "年降水",
    sunshine: "日照",
    unitC: "°C",
    unitMm: "mm",
    unitH: "h",
    climate_tropical: "热带",
    climate_temperate: "温带",
    climate_continental: "大陆性",
    climate_arid: "干旱",
    climate_mediterranean: "地中海",
    climate_oceanic: "海洋性",
    infrastructureCompare: "城市基础与健康环境对比",
    doctorsPerThousand: "每千人医生数",
    avgAqi3y: "近三年平均AQI",
    directDestinations: "机场直飞目的地",
    aqiLabel: "AQI",
    destLabel: "个目的地",
    descriptionTemplate:
      "{city}（{country}）整体上收入与生活成本都较高。按当前职业估算年收入约 {income}，月生活成本约 {cost}，年可结余约 {savings}。",
  },
  en: {
    loading: "Loading data...",
    appTitle: "Global City Comparison",
    appSubtitle: "Compare income and living costs across {count} cities",
    dayMode: "Light Mode",
    nightMode: "Dark Mode",
    language: "Language",
    displayCurrency: "Display currency:",
    selectProfession: "Select profession",
    comparisonMode: "Comparison mode (up to {count} cities)",
    modeNormal: "Absolute",
    modeRatio: "Relative",
    modeBigMac: "Big Mac",
    searchPlaceholder: "Search city or country...",
    allContinents: "All continents",
    selectedCities: "Selected cities ({selected}/{max}):",
    chooseCity: "Choose cities:",
    showingCities: "Showing 100/{total} cities, use search or filters to narrow down",
    compareCities: "Compare {count} cities",
    clear: "Clear",
    needAtLeastTwoCities: "Please select at least 2 cities to compare",
    chartAnalysis: "Data chart analysis",
    baseCityTip: "Base city: {city} - all values are normalized to 1x against this city",
    professionIncomeCompare: "Annual income by profession",
    costRatioAnalysis: "Cost of living ratio",
    annualFinanceCompare: "Annual financial comparison",
    cityDetails: "City details",
    clickSetBase: "Click any city card to set it as base",
    monthlyExpense: "Monthly expense",
    yearlySavings: "Yearly savings",
    bigMac: "Big Mac",
    ranking: "Rankings",
    incomeRanking: "💰 Income Ranking",
    savingsRanking: "🏦 Savings Potential",
    lowestCostCity: "🔻 Lowest Cost City",
    insightSuggestionTitle: "Recommended next step",
    insightSuggestionPick3: "Top candidates for deep research: {cities}. Focus on income and savings potential.",
    insightSuggestionNeedMore: "Select at least 3 cities for more conclusive comparison (current: {count}).",
    annualIncome: "Annual Income",
    annualExpense: "Annual Expense",
    annualSavings: "Annual Savings",
    costRatioKey: "Cost Ratio",
    savingsRatioKey: "Savings Ratio",
    bigMacUnit: "Big Macs",
    oneBigMac: "1 Big Mac",
    cityDescription: "City Description",
    keyInsights: "Key Insights",
    topIncomeCity: "Highest Income City",
    topSavingsCity: "Best Savings City",
    climate: "Climate",
    climateCompare: "Climate comparison",
    climateType: "Climate type",
    avgTemp: "Avg temp",
    annualRain: "Annual rain",
    sunshine: "Sunshine",
    unitC: "°C",
    unitMm: "mm",
    unitH: "h",
    climate_tropical: "Tropical",
    climate_temperate: "Temperate",
    climate_continental: "Continental",
    climate_arid: "Arid",
    climate_mediterranean: "Mediterranean",
    climate_oceanic: "Oceanic",
    infrastructureCompare: "Urban Infrastructure & Health Environment",
    doctorsPerThousand: "Doctors per 1,000 people",
    avgAqi3y: "Avg AQI (3y)",
    directDestinations: "Direct flight destinations",
    aqiLabel: "AQI",
    destLabel: "destinations",
    descriptionTemplate:
      "{city} ({country}) offers a competitive income-cost profile. Estimated annual income for the selected profession is {income}, monthly living cost is {cost}, and potential yearly savings are {savings}.",
  },
  ja: {
    loading: "データを読み込み中...",
    appTitle: "世界都市比較",
    appSubtitle: "{count}都市の収入と生活費を比較",
    dayMode: "ライトモード",
    nightMode: "ダークモード",
    language: "言語",
    displayCurrency: "表示通貨:",
    selectProfession: "職種を選択",
    comparisonMode: "比較モード（最大{count}都市）",
    modeNormal: "絶対値",
    modeRatio: "相対比率",
    modeBigMac: "ビッグマック",
    searchPlaceholder: "都市または国を検索...",
    allContinents: "すべての大陸",
    selectedCities: "選択済み都市 ({selected}/{max}):",
    chooseCity: "都市を選択:",
    showingCities: "100/{total}都市を表示中。検索またはフィルターをご利用ください",
    compareCities: "{count}都市を比較",
    clear: "クリア",
    needAtLeastTwoCities: "比較するには少なくとも2都市を選択してください",
    chartAnalysis: "データチャート分析",
    baseCityTip: "基準都市: {city} - すべての値はこの都市を1倍として比較",
    professionIncomeCompare: "職種別年収比較",
    costRatioAnalysis: "生活費比率",
    annualFinanceCompare: "年間財務比較",
    cityDetails: "都市詳細",
    clickSetBase: "都市カードをクリックして基準に設定",
    monthlyExpense: "月間支出",
    yearlySavings: "年間貯蓄",
    bigMac: "ビッグマック",
    ranking: "ランキング",
    incomeRanking: "💰 収入ランキング",
    savingsRanking: "🏦 貯蓄力",
    lowestCostCity: "🔻 最低生活コストの都市",
    insightSuggestionTitle: "次のステップ",
    insightSuggestionPick3: "調査候補：{cities}。収入と貯蓄を重視して深堀りしましょう。",
    insightSuggestionNeedMore: "より有効な比較には3都市以上を選択してください（現在：{count}）。",
    annualIncome: "年間収入",
    annualExpense: "年間支出",
    annualSavings: "年間貯蓄",
    costRatioKey: "コスト比率",
    savingsRatioKey: "貯蓄比率",
    bigMacUnit: "個分",
    oneBigMac: "1個分",
    cityDescription: "都市の説明",
    keyInsights: "主要インサイト",
    topIncomeCity: "最高収入の都市",
    topSavingsCity: "貯蓄力が最も高い都市",
    climate: "気候",
    climateCompare: "気候比較",
    climateType: "気候タイプ",
    avgTemp: "平均気温",
    annualRain: "年間降水",
    sunshine: "日照",
    unitC: "°C",
    unitMm: "mm",
    unitH: "h",
    climate_tropical: "熱帯",
    climate_temperate: "温帯",
    climate_continental: "大陸性",
    climate_arid: "乾燥",
    climate_mediterranean: "地中海性",
    climate_oceanic: "海洋性",
    infrastructureCompare: "都市インフラと健康環境の比較",
    doctorsPerThousand: "人口千人あたり医師数",
    avgAqi3y: "過去3年平均AQI",
    directDestinations: "空港の直行便就航地数",
    aqiLabel: "AQI",
    destLabel: "就航地",
    descriptionTemplate:
      "{city}（{country}）は収入と生活コストのバランスが特徴です。選択中の職種の推定年収は {income}、月間生活費は {cost}、年間貯蓄見込みは {savings} です。",
  },
  es: {
    loading: "Cargando datos...",
    appTitle: "Comparación Global de Ciudades",
    appSubtitle: "Compara ingresos y costo de vida en {count} ciudades",
    dayMode: "Modo Claro",
    nightMode: "Modo Oscuro",
    language: "Idioma",
    displayCurrency: "Moneda:",
    selectProfession: "Seleccionar profesión",
    comparisonMode: "Modo de comparación (máx. {count} ciudades)",
    modeNormal: "Absoluto",
    modeRatio: "Relativo",
    modeBigMac: "Big Mac",
    searchPlaceholder: "Buscar ciudad o país...",
    allContinents: "Todos los continentes",
    selectedCities: "Ciudades seleccionadas ({selected}/{max}):",
    chooseCity: "Elegir ciudades:",
    showingCities: "Mostrando 100/{total} ciudades, usa búsqueda o filtros",
    compareCities: "Comparar {count} ciudades",
    clear: "Limpiar",
    needAtLeastTwoCities: "Selecciona al menos 2 ciudades para comparar",
    chartAnalysis: "Análisis de gráficos",
    baseCityTip: "Ciudad base: {city} - todos los valores se comparan con 1x en esta ciudad",
    professionIncomeCompare: "Comparación de ingreso anual por profesión",
    costRatioAnalysis: "Proporción de costo de vida",
    annualFinanceCompare: "Comparación financiera anual",
    cityDetails: "Detalles de la ciudad",
    clickSetBase: "Haz clic en una tarjeta para establecerla como ciudad base",
    monthlyExpense: "Gasto mensual",
    yearlySavings: "Ahorro anual",
    bigMac: "Big Mac",
    ranking: "Rankings",
    incomeRanking: "💰 Ranking de Ingresos",
    savingsRanking: "🏦 Potencial de Ahorro",
    lowestCostCity: "🔻 Ciudad con Menor Costo",
    insightSuggestionTitle: "Próximo paso recomendado",
    insightSuggestionPick3: "Ciudades recomendadas para análisis profundo: {cities}. Prioriza ingresos y ahorro.",
    insightSuggestionNeedMore: "Selecciona al menos 3 ciudades para una comparación más completa (actual: {count}).",
    annualIncome: "Ingreso Anual",
    annualExpense: "Gasto Anual",
    annualSavings: "Ahorro Anual",
    costRatioKey: "Proporción de costo",
    savingsRatioKey: "Proporción de ahorro",
    bigMacUnit: "Big Macs",
    oneBigMac: "1 Big Mac",
    cityDescription: "Descripcion de la Ciudad",
    keyInsights: "Insights Clave",
    topIncomeCity: "Ciudad con Mayor Ingreso",
    topSavingsCity: "Ciudad con Mejor Ahorro",
    climate: "Clima",
    climateCompare: "Comparacion de clima",
    climateType: "Tipo de clima",
    avgTemp: "Temp. media",
    annualRain: "Lluvia anual",
    sunshine: "Sol",
    unitC: "°C",
    unitMm: "mm",
    unitH: "h",
    climate_tropical: "Tropical",
    climate_temperate: "Templado",
    climate_continental: "Continental",
    climate_arid: "Arido",
    climate_mediterranean: "Mediterraneo",
    climate_oceanic: "Oceanico",
    infrastructureCompare: "Infraestructura urbana y entorno de salud",
    doctorsPerThousand: "Medicos por cada 1,000 hab.",
    avgAqi3y: "AQI promedio (3 anos)",
    directDestinations: "Destinos directos en avion",
    aqiLabel: "AQI",
    destLabel: "destinos",
    descriptionTemplate:
      "{city} ({country}) muestra un equilibrio competitivo entre ingresos y costo de vida. El ingreso anual estimado para la profesion seleccionada es {income}, el costo mensual es {cost} y el ahorro anual potencial es {savings}.",
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

const COUNTRY_TRANSLATIONS: Record<string, Record<Locale, string>> = {
  美国: { zh: "美国", en: "United States", ja: "アメリカ", es: "Estados Unidos" },
  英国: { zh: "英国", en: "United Kingdom", ja: "イギリス", es: "Reino Unido" },
  日本: { zh: "日本", en: "Japan", ja: "日本", es: "Japon" },
  中国: { zh: "中国", en: "China", ja: "中国", es: "China" },
  澳大利亚: { zh: "澳大利亚", en: "Australia", ja: "オーストラリア", es: "Australia" },
  新加坡: { zh: "新加坡", en: "Singapore", ja: "シンガポール", es: "Singapur" },
  法国: { zh: "法国", en: "France", ja: "フランス", es: "Francia" },
  加拿大: { zh: "加拿大", en: "Canada", ja: "カナダ", es: "Canada" },
  中国香港: { zh: "中国香港", en: "Hong Kong, China", ja: "中国香港", es: "Hong Kong, China" },
  阿联酋: { zh: "阿联酋", en: "United Arab Emirates", ja: "アラブ首长国连邦", es: "Emiratos Arabes Unidos" },
  荷兰: { zh: "荷兰", en: "Netherlands", ja: "オランダ", es: "Paises Bajos" },
  瑞士: { zh: "瑞士", en: "Switzerland", ja: "スイス", es: "Suiza" },
  德国: { zh: "德国", en: "Germany", ja: "ドイツ", es: "Alemania" },
  西班牙: { zh: "西班牙", en: "Spain", ja: "スペイン", es: "Espana" },
  意大利: { zh: "意大利", en: "Italy", ja: "イタリア", es: "Italia" },
  比利时: { zh: "比利时", en: "Belgium", ja: "ベルギー", es: "Belgica" },
  奥地利: { zh: "奥地利", en: "Austria", ja: "オーストリア", es: "Austria" },
  捷克: { zh: "捷克", en: "Czech Republic", ja: "チェコ", es: "Chequia" },
  波兰: { zh: "波兰", en: "Poland", ja: "ポーランド", es: "Polonia" },
  葡萄牙: { zh: "葡萄牙", en: "Portugal", ja: "ポルトガル", es: "Portugal" },
  希腊: { zh: "希腊", en: "Greece", ja: "ギリシャ", es: "Grecia" },
  土耳其: { zh: "土耳其", en: "Turkey", ja: "トルコ", es: "Turquia" },
  墨西哥: { zh: "墨西哥", en: "Mexico", ja: "メキシコ", es: "Mexico" },
  巴西: { zh: "巴西", en: "Brazil", ja: "ブラジル", es: "Brasil" },
  新西兰: { zh: "新西兰", en: "New Zealand", ja: "ニュージーランド", es: "Nueva Zelanda" },
  泰国: { zh: "泰国", en: "Thailand", ja: "タイ", es: "Tailandia" },
  马来西亚: { zh: "马来西亚", en: "Malaysia", ja: "マレーシア", es: "Malasia" },
  越南: { zh: "越南", en: "Vietnam", ja: "ベトナム", es: "Vietnam" },
  印度: { zh: "印度", en: "India", ja: "インド", es: "India" },
  肯尼亚: { zh: "肯尼亚", en: "Kenya", ja: "ケニア", es: "Kenia" },
  埃及: { zh: "埃及", en: "Egypt", ja: "エジプト", es: "Egipto" },
  伊朗: { zh: "伊朗", en: "Iran", ja: "イラン", es: "Iran" },
  巴基斯坦: { zh: "巴基斯坦", en: "Pakistan", ja: "パキスタン", es: "Pakistan" },
  印度尼西亚: { zh: "印度尼西亚", en: "Indonesia", ja: "インドネシア", es: "Indonesia" },
  菲律宾: { zh: "菲律宾", en: "Philippines", ja: "フィリピン", es: "Filipinas" },
  韩国: { zh: "韩国", en: "South Korea", ja: "韩国", es: "Corea del Sur" },
  中国台湾: { zh: "中国台湾", en: "Taiwan, China", ja: "中国台湾", es: "Taiwan, China" },
  阿根廷: { zh: "阿根廷", en: "Argentina", ja: "アルゼンチン", es: "Argentina" },
  智利: { zh: "智利", en: "Chile", ja: "チリ", es: "Chile" },
  哥伦比亚: { zh: "哥伦比亚", en: "Colombia", ja: "コロンビア", es: "Colombia" },
  秘鲁: { zh: "秘鲁", en: "Peru", ja: "ペルー", es: "Peru" },
  委内瑞拉: { zh: "委内瑞拉", en: "Venezuela", ja: "ベネズエラ", es: "Venezuela" },
  南非: { zh: "南非", en: "South Africa", ja: "南アフリカ", es: "Sudafrica" },
  哥斯达黎加: { zh: "哥斯达黎加", en: "Costa Rica", ja: "コスタリカ", es: "Costa Rica" },
  巴拿马: { zh: "巴拿马", en: "Panama", ja: "パナマ", es: "Panama" },
  古巴: { zh: "古巴", en: "Cuba", ja: "キューバ", es: "Cuba" },
  波多黎各: { zh: "波多黎各", en: "Puerto Rico", ja: "プエルトリコ", es: "Puerto Rico" },
  牙买加: { zh: "牙买加", en: "Jamaica", ja: "ジャマイカ", es: "Jamaica" },
  卡塔尔: { zh: "卡塔尔", en: "Qatar", ja: "カタール", es: "Catar" },
  巴林: { zh: "巴林", en: "Bahrain", ja: "バーレーン", es: "Barein" },
  沙特阿拉伯: { zh: "沙特阿拉伯", en: "Saudi Arabia", ja: "サウジアラビア", es: "Arabia Saudita" },
  阿曼: { zh: "阿曼", en: "Oman", ja: "オマーン", es: "Oman" },
  黎巴嫩: { zh: "黎巴嫩", en: "Lebanon", ja: "レバノン", es: "Libano" },
  约旦: { zh: "约旦", en: "Jordan", ja: "ヨルダン", es: "Jordania" },
  以色列: { zh: "以色列", en: "Israel", ja: "イスラエル", es: "Israel" },
  乌克兰: { zh: "乌克兰", en: "Ukraine", ja: "ウクライナ", es: "Ucrania" },
  罗马尼亚: { zh: "罗马尼亚", en: "Romania", ja: "ルーマニア", es: "Rumania" },
  保加利亚: { zh: "保加利亚", en: "Bulgaria", ja: "ブルガリア", es: "Bulgaria" },
  克罗地亚: { zh: "克罗地亚", en: "Croatia", ja: "クロアチア", es: "Croacia" },
  塞尔维亚: { zh: "塞尔维亚", en: "Serbia", ja: "セルビア", es: "Serbia" },
  匈牙利: { zh: "匈牙利", en: "Hungary", ja: "ハンガリー", es: "Hungria" },
  斯洛伐克: { zh: "斯洛伐克", en: "Slovakia", ja: "スロバキア", es: "Eslovaquia" },
  斯洛文尼亚: { zh: "斯洛文尼亚", en: "Slovenia", ja: "スロベニア", es: "Eslovenia" },
  爱尔兰: { zh: "爱尔兰", en: "Ireland", ja: "アイルランド", es: "Irlanda" },
};

const CITY_NAME_TRANSLATIONS: Record<number, Record<Locale, string>> = {
  1: { zh: "纽约", en: "New York", ja: "ニューヨーク", es: "Nueva York" },
  2: { zh: "伦敦", en: "London", ja: "ロンドン", es: "Londres" },
  3: { zh: "东京", en: "Tokyo", ja: "东京", es: "Tokio" },
  4: { zh: "北京", en: "Beijing", ja: "北京", es: "Pekin" },
  5: { zh: "上海", en: "Shanghai", ja: "上海", es: "Shanghai" },
  6: { zh: "悉尼", en: "Sydney", ja: "シドニー", es: "Sidney" },
  7: { zh: "新加坡", en: "Singapore", ja: "シンガポール", es: "Singapur" },
  8: { zh: "巴黎", en: "Paris", ja: "パリ", es: "Paris" },
  9: { zh: "多伦多", en: "Toronto", ja: "トロント", es: "Toronto" },
  10: { zh: "香港", en: "Hong Kong", ja: "香港", es: "Hong Kong" },
  11: { zh: "洛杉矶", en: "Los Angeles", ja: "ロサンゼルス", es: "Los Angeles" },
  12: { zh: "旧金山", en: "San Francisco", ja: "サンフランシスコ", es: "San Francisco" },
  13: { zh: "芝加哥", en: "Chicago", ja: "シカゴ", es: "Chicago" },
  14: { zh: "迪拜", en: "Dubai", ja: "ドバイ", es: "Dubai" },
  15: { zh: "阿姆斯特丹", en: "Amsterdam", ja: "アムステルダム", es: "Amsterdam" },
  16: { zh: "苏黎世", en: "Zurich", ja: "チューリッヒ", es: "Zurich" },
  17: { zh: "日内瓦", en: "Geneva", ja: "ジュネーブ", es: "Ginebra" },
  18: { zh: "慕尼黑", en: "Munich", ja: "ミュンヘン", es: "Munich" },
  19: { zh: "柏林", en: "Berlin", ja: "ベルリン", es: "Berlin" },
  20: { zh: "巴塞罗那", en: "Barcelona", ja: "バルセロナ", es: "Barcelona" },
  21: { zh: "马德里", en: "Madrid", ja: "マドリード", es: "Madrid" },
  22: { zh: "米兰", en: "Milan", ja: "ミラノ", es: "Milan" },
  23: { zh: "罗马", en: "Rome", ja: "ローマ", es: "Roma" },
  24: { zh: "布鲁塞尔", en: "Brussels", ja: "ブリュッセル", es: "Bruselas" },
  25: { zh: "维也纳", en: "Vienna", ja: "ウィーン", es: "Viena" },
  26: { zh: "布拉格", en: "Prague", ja: "プラハ", es: "Praga" },
  27: { zh: "华沙", en: "Warsaw", ja: "ワルシャワ", es: "Varsovia" },
  28: { zh: "里斯本", en: "Lisbon", ja: "リスボン", es: "Lisboa" },
  29: { zh: "雅典", en: "Athens", ja: "アテネ", es: "Atenas" },
  30: { zh: "伊斯坦布尔", en: "Istanbul", ja: "イスタンブール", es: "Estambul" },
  31: { zh: "墨西哥城", en: "Mexico City", ja: "メキシコシティ", es: "Ciudad de Mexico" },
  32: { zh: "圣保罗", en: "Sao Paulo", ja: "サンパウロ", es: "Sao Paulo" },
  33: { zh: "里约热内卢", en: "Rio de Janeiro", ja: "リオデジャネイロ", es: "Rio de Janeiro" },
  34: { zh: "迈阿密", en: "Miami", ja: "マイアミ", es: "Miami" },
  35: { zh: "华盛顿", en: "Washington", ja: "ワシントン", es: "Washington" },
  36: { zh: "波士顿", en: "Boston", ja: "ボストン", es: "Boston" },
  37: { zh: "西雅图", en: "Seattle", ja: "シアトル", es: "Seattle" },
  38: { zh: "丹佛", en: "Denver", ja: "デンバー", es: "Denver" },
  39: { zh: "奥斯汀", en: "Austin", ja: "オースティン", es: "Austin" },
  40: { zh: "温哥华", en: "Vancouver", ja: "バンクーバー", es: "Vancouver" },
  41: { zh: "蒙特利尔", en: "Montreal", ja: "モントリオール", es: "Montreal" },
  42: { zh: "墨尔本", en: "Melbourne", ja: "メルボルン", es: "Melbourne" },
  43: { zh: "布里斯班", en: "Brisbane", ja: "ブリスベン", es: "Brisbane" },
  44: { zh: "奥克兰", en: "Auckland", ja: "オークランド", es: "Auckland" },
  45: { zh: "曼谷", en: "Bangkok", ja: "バンコク", es: "Bangkok" },
  46: { zh: "吉隆坡", en: "Kuala Lumpur", ja: "クアラルンプール", es: "Kuala Lumpur" },
  47: { zh: "胡志明市", en: "Ho Chi Minh City", ja: "ホーチミン市", es: "Ciudad Ho Chi Minh" },
  48: { zh: "河内", en: "Hanoi", ja: "ハノイ", es: "Hanói" },
  49: { zh: "班加罗尔", en: "Bengaluru", ja: "ベンガルール", es: "Bengaluru" },
  50: { zh: "孟买", en: "Mumbai", ja: "ムンバイ", es: "Bombay" },
  51: { zh: "新德里", en: "New Delhi", ja: "ニューデリー", es: "Nueva Delhi" },
  52: { zh: "内罗毕", en: "Nairobi", ja: "ナイロビ", es: "Nairobi" },
  53: { zh: "开罗", en: "Cairo", ja: "カイロ", es: "El Cairo" },
  54: { zh: "德黑兰", en: "Tehran", ja: "テヘラン", es: "Teheran" },
  55: { zh: "卡拉奇", en: "Karachi", ja: "カラチ", es: "Karachi" },
  56: { zh: "伊斯兰堡", en: "Islamabad", ja: "イスラマバード", es: "Islamabad" },
  57: { zh: "雅加达", en: "Jakarta", ja: "ジャカルタ", es: "Yakarta" },
  58: { zh: "菲律宾马尼拉", en: "Manila", ja: "マニラ", es: "Manila" },
  59: { zh: "首尔", en: "Seoul", ja: "ソウル", es: "Seul" },
  60: { zh: "釜山", en: "Busan", ja: "釜山", es: "Busan" },
  61: { zh: "台北", en: "Taipei", ja: "台北", es: "Taipéi" },
  62: { zh: "布宜诺斯艾利斯", en: "Buenos Aires", ja: "ブエノスアイレス", es: "Buenos Aires" },
  63: { zh: "圣地亚哥", en: "Santiago", ja: "サンティアゴ", es: "Santiago" },
  64: { zh: "波哥大", en: "Bogota", ja: "ボゴタ", es: "Bogota" },
  65: { zh: "利马", en: "Lima", ja: "リマ", es: "Lima" },
  66: { zh: "加拉加斯", en: "Caracas", ja: "カラカス", es: "Caracas" },
  67: { zh: "约翰内斯堡", en: "Johannesburg", ja: "ヨハネスブルグ", es: "Johannesburgo" },
  68: { zh: "开普敦", en: "Cape Town", ja: "ケープタウン", es: "Ciudad del Cabo" },
  69: { zh: "瓜达拉哈拉", en: "Guadalajara", ja: "グアダラハラ", es: "Guadalajara" },
  70: { zh: "圣何塞", en: "San Jose", ja: "サンホセ", es: "San Jose" },
  71: { zh: "巴拿马城", en: "Panama City", ja: "パナマシティ", es: "Ciudad de Panama" },
  72: { zh: "哈瓦那", en: "Havana", ja: "ハバナ", es: "La Habana" },
  73: { zh: "圣胡安", en: "San Juan", ja: "サンフアン", es: "San Juan" },
  74: { zh: "蒙特哥湾", en: "Montego Bay", ja: "モンテゴベイ", es: "Montego Bay" },
  75: { zh: "阿布扎比", en: "Abu Dhabi", ja: "アブダビ", es: "Abu Dabi" },
  76: { zh: "多哈", en: "Doha", ja: "ドーハ", es: "Doha" },
  77: { zh: "麦纳麦", en: "Manama", ja: "マナーマ", es: "Manama" },
  78: { zh: "利雅得", en: "Riyadh", ja: "リヤド", es: "Riad" },
  79: { zh: "马斯喀特", en: "Muscat", ja: "マスカット", es: "Mascate" },
  80: { zh: "贝鲁特", en: "Beirut", ja: "ベイルート", es: "Beirut" },
  81: { zh: "安曼", en: "Amman", ja: "アンマン", es: "Aman" },
  82: { zh: "特拉维夫", en: "Tel Aviv", ja: "テルアビブ", es: "Tel Aviv" },
  83: { zh: "海得拉巴", en: "Hyderabad", ja: "ハイデラバード", es: "Hyderabad" },
  84: { zh: "浦那", en: "Pune", ja: "プネー", es: "Pune" },
  85: { zh: "基辅", en: "Kyiv", ja: "キーウ", es: "Kiev" },
  86: { zh: "布加勒斯特", en: "Bucharest", ja: "ブカレスト", es: "Bucarest" },
  87: { zh: "索非亚", en: "Sofia", ja: "ソフィア", es: "Sofia" },
  88: { zh: "萨格勒布", en: "Zagreb", ja: "ザグレブ", es: "Zagreb" },
  89: { zh: "贝尔格莱德", en: "Belgrade", ja: "ベオグラード", es: "Belgrado" },
  90: { zh: "布达佩斯", en: "Budapest", ja: "ブダペスト", es: "Budapest" },
  91: { zh: "布拉迪斯拉发", en: "Bratislava", ja: "ブラチスラバ", es: "Bratislava" },
  92: { zh: "卢布尔雅那", en: "Ljubljana", ja: "リュブリャナ", es: "Liubliana" },
  93: { zh: "都柏林", en: "Dublin", ja: "ダブリン", es: "Dublin" },
  94: { zh: "贝尔法斯特", en: "Belfast", ja: "ベルファスト", es: "Belfast" },
  95: { zh: "亚特兰大", en: "Atlanta", ja: "アトランタ", es: "Atlanta" },
  96: { zh: "凤凰城", en: "Phoenix", ja: "フェニックス", es: "Phoenix" },
  97: { zh: "波特兰", en: "Portland", ja: "ポートランド", es: "Portland" },
  98: { zh: "圣地亚哥", en: "San Diego", ja: "サンディエゴ", es: "San Diego" },
  99: { zh: "拉斯维加斯", en: "Las Vegas", ja: "ラスベガス", es: "Las Vegas" },
  100: { zh: "坦帕", en: "Tampa", ja: "タンパ", es: "Tampa" },
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

  const getCountryLabel = (country: string): string =>
    COUNTRY_TRANSLATIONS[country]?.[locale] || country;

  const getCityLabel = (city: City): string =>
    CITY_NAME_TRANSLATIONS[city.id]?.[locale] || city.name;

  const handleCurrencyChange = (currency: string) => {
    setSelectedCurrency(currency);
    localStorage.setItem("selectedCurrency", currency);
  };

  const convertAmount = (amount: number): number => {
    if (!exchangeRates) return amount;
    const rate = exchangeRates.rates[selectedCurrency] || 1;
    return Math.round(amount * rate * 100) / 100;
  };

  // Money-like values (income/expense/savings): always show integers.
  const formatCurrency = (amount: number): string => {
    if (!exchangeRates) return `$${Math.round(amount).toLocaleString()}`;

    const symbol = exchangeRates.symbols[selectedCurrency] || selectedCurrency;
    const converted = convertAmount(amount);
    const rounded = Math.round(converted);

    if (selectedCurrency === "JPY" || selectedCurrency === "VND") {
      return `${symbol}${rounded.toLocaleString()}`;
    } else if (selectedCurrency === "INR" || selectedCurrency === "PKR") {
      return `${symbol}${rounded.toLocaleString("en-IN")}`;
    } else {
      return `${symbol}${rounded.toLocaleString()}`;
    }
  };

  // Price-like values (e.g. Big Mac price): keep 2 decimals for readability.
  const formatPrice = (amount: number): string => {
    if (!exchangeRates) return `$${amount.toFixed(2)}`;
    const symbol = exchangeRates.symbols[selectedCurrency] || selectedCurrency;
    const converted = convertAmount(amount);
    return `${symbol}${converted.toFixed(2)}`;
  };

  const getClimate = (city: City): ClimateInfo => {
    const r = (Math.sin(city.id * 999) + 1) / 2; // 0..1 deterministic
    const r2 = (Math.sin(city.id * 1337 + 42) + 1) / 2;
    const r3 = (Math.sin(city.id * 2718 - 7) + 1) / 2;

    const pick = <T,>(arr: T[]) => arr[Math.floor(r * arr.length) % arr.length];

    let type: ClimateType = "temperate";
    if (city.continent === "非洲") type = pick(["arid", "tropical", "temperate"]);
    else if (city.continent === "南美洲") type = pick(["tropical", "temperate", "mediterranean"]);
    else if (city.continent === "大洋洲") type = pick(["oceanic", "temperate", "mediterranean"]);
    else if (city.continent === "欧洲") type = pick(["oceanic", "temperate", "continental", "mediterranean"]);
    else if (city.continent === "北美洲") type = pick(["temperate", "continental", "arid", "oceanic"]);
    else type = pick(["tropical", "temperate", "continental", "arid"]);

    const baseTemp =
      type === "tropical" ? 26 :
      type === "arid" ? 24 :
      type === "mediterranean" ? 18 :
      type === "oceanic" ? 14 : 10; // continental

    const baseRain =
      type === "tropical" ? 2200 :
      type === "oceanic" ? 1400 :
      type === "mediterranean" ? 650 :
      type === "temperate" ? 900 : 500; // arid/continental lower

    const temp = Math.round((baseTemp + (r2 - 0.5) * 10) * 10) / 10; // one decimal
    const rain = Math.round(baseRain + (r3 - 0.5) * 600);
    const sunshine = Math.round(
      (type === "arid" ? 3200 :
        type === "tropical" ? 2600 :
        type === "mediterranean" ? 2800 :
        type === "oceanic" ? 1800 :
        type === "continental" ? 2000 : 2200) + (r - 0.5) * 400
    );

    return {
      type,
      avgTempC: temp,
      annualRainMm: Math.max(0, rain),
      sunshineHours: Math.max(800, sunshine),
    };
  };

  const getCityInfra = (city: City): CityInfraInfo => {
    const r = (Math.sin(city.id * 811 + 17) + 1) / 2;
    const r2 = (Math.sin(city.id * 1237 + 29) + 1) / 2;
    const r3 = (Math.sin(city.id * 1999 + 5) + 1) / 2;

    const incomeFactor = Math.min(1.4, Math.max(0.7, city.averageIncome / 80000));
    const costFactor = Math.min(1.3, Math.max(0.75, city.costOfLiving / 3000));

    const doctorsPerThousand = parseFloat(
      (1.1 + incomeFactor * 2.2 + r * 1.8).toFixed(1)
    );

    // Approximate conversion to AQI-like scale, regardless of local standards.
    const avgAqi3y = Math.round(
      35 + (1.4 - incomeFactor) * 35 + (costFactor - 0.8) * 12 + r2 * 70
    );

    const directDestinations = Math.round(
      25 + incomeFactor * 90 + (city.continent === "欧洲" ? 30 : 0) + r3 * 110
    );

    return {
      doctorsPerThousand: Math.max(0.8, Math.min(8.5, doctorsPerThousand)),
      avgAqi3y: Math.max(15, Math.min(220, avgAqi3y)),
      directDestinations: Math.max(8, Math.min(320, directDestinations)),
    };
  };

  const getLocalizedDescription = (city: City, salary: number): string => {
    if (locale === "zh") return city.description;
    const yearlySavings = salary - city.costOfLiving * 12;
    return t("descriptionTemplate", {
      city: getCityLabel(city),
      country: getCountryLabel(city.country),
      income: formatCurrency(salary),
      cost: formatCurrency(city.costOfLiving),
      savings: formatCurrency(yearlySavings),
    });
  };

  const continents = [...new Set(cities.map((c) => c.continent))].sort();
  const professions = cities[0]?.professions
    ? Object.keys(cities[0].professions)
    : [];

  const filteredCities = cities.filter((city) => {
    const localizedCityName = getCityLabel(city).toLowerCase();
    const localizedCountryName = getCountryLabel(city.country).toLowerCase();
    const matchesSearch =
      city.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      city.country.toLowerCase().includes(searchTerm.toLowerCase()) ||
      localizedCityName.includes(searchTerm.toLowerCase()) ||
      localizedCountryName.includes(searchTerm.toLowerCase());

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
    if (comparisonData && comparisonMode === "ratio") {
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
        name: getCityLabel(city),
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
        name: getCityLabel(city),
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
          name: getCityLabel(city),
          [t("costRatioKey")]: parseFloat(ratioCostRatio.toFixed(1)),
          [t("savingsRatioKey")]: 2 - ratioCostRatio,
        };
      } else {
        const costRatio = income > 0 ? (yearlyExpense / income) * 100 : 0;
        return {
          name: getCityLabel(city),
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
            ? "bg-slate-950"
            : "bg-slate-50"
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
          ? "bg-slate-950 text-slate-100"
          : "bg-slate-50 text-slate-900"
      }`}
    >
      <div className="max-w-7xl mx-auto">
        {/* 标题和控制区 */}
        <div className="flex justify-between items-start mb-8 flex-col md:flex-row gap-4">
          <div>
            <h1
              className={`text-4xl md:text-5xl font-bold mb-3 ${
                darkMode
                  ? "text-slate-100"
                  : "text-slate-900"
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

          <div className="flex items-center gap-3 flex-wrap justify-end">
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
                      {city ? getCityLabel(city) : ""}
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
          <div className="mb-4">
            <p className={`text-sm font-semibold mb-2 ${
              darkMode ? "text-gray-300" : "text-gray-700"
            }`}>
              {t("chooseCity")}
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-1.5">
              {filteredCities.slice(0, 100).map((city) => (
                <button
                  key={city.id}
                  onClick={() => handleCitySelect(city.id.toString())}
                  disabled={
                    selectedCities.length >= maxComparisons &&
                    !selectedCities.includes(city.id.toString())
                  }
                  title={`${getCityLabel(city)}, ${getCountryLabel(city.country)}`}
                  className={`p-1.5 rounded font-medium transition text-xs whitespace-nowrap overflow-hidden text-ellipsis ${
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
                  {getCityLabel(city)}
                </button>
              ))}
            </div>
            {filteredCities.length > 100 && (
              <p className={`text-xs mt-1.5 ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
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
                    city: getCityLabel(
                      comparisonData.find(c => c.id.toString() === baseCityId) || comparisonData[0]
                    ),
                  })}
                </p>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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

                {/* 气候对比 */}
                <div className={`p-4 rounded-lg lg:col-span-2 ${
                  darkMode ? "bg-gray-700" : "bg-gray-50"
                }`}>
                  <h3 className={`text-lg font-bold mb-4 ${
                    darkMode ? "text-white" : "text-gray-800"
                  }`}>
                    {t("climateCompare")}
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div>
                      <p className={`text-sm font-semibold mb-2 ${darkMode ? "text-gray-200" : "text-gray-700"}`}>
                        {t("avgTemp")} ({t("unitC")})
                      </p>
                      <ResponsiveContainer width="100%" height={240}>
                        <BarChart
                          data={comparisonData.map((city) => {
                            const climate = getClimate(city);
                            return { name: getCityLabel(city), value: climate.avgTempC };
                          })}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#444" : "#ddd"} />
                          <XAxis dataKey="name" stroke={darkMode ? "#999" : "#666"} />
                          <YAxis stroke={darkMode ? "#999" : "#666"} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: darkMode ? "#333" : "#fff",
                              border: `1px solid ${darkMode ? "#555" : "#ddd"}`,
                              color: darkMode ? "#fff" : "#000",
                            }}
                            formatter={(v: any) => `${Number(v).toFixed(1)}${t("unitC")}`}
                          />
                          <Bar dataKey="value" fill="#38bdf8" radius={[8, 8, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div>
                      <p className={`text-sm font-semibold mb-2 ${darkMode ? "text-gray-200" : "text-gray-700"}`}>
                        {t("annualRain")} ({t("unitMm")})
                      </p>
                      <ResponsiveContainer width="100%" height={240}>
                        <BarChart
                          data={comparisonData.map((city) => {
                            const climate = getClimate(city);
                            return { name: getCityLabel(city), value: climate.annualRainMm };
                          })}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#444" : "#ddd"} />
                          <XAxis dataKey="name" stroke={darkMode ? "#999" : "#666"} />
                          <YAxis stroke={darkMode ? "#999" : "#666"} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: darkMode ? "#333" : "#fff",
                              border: `1px solid ${darkMode ? "#555" : "#ddd"}`,
                              color: darkMode ? "#fff" : "#000",
                            }}
                            formatter={(v: any) => `${Math.round(Number(v))} ${t("unitMm")}`}
                          />
                          <Bar dataKey="value" fill="#a78bfa" radius={[8, 8, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div>
                      <p className={`text-sm font-semibold mb-2 ${darkMode ? "text-gray-200" : "text-gray-700"}`}>
                        {t("sunshine")} ({t("unitH")})
                      </p>
                      <ResponsiveContainer width="100%" height={240}>
                        <BarChart
                          data={comparisonData.map((city) => {
                            const climate = getClimate(city);
                            return { name: getCityLabel(city), value: climate.sunshineHours };
                          })}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#444" : "#ddd"} />
                          <XAxis dataKey="name" stroke={darkMode ? "#999" : "#666"} />
                          <YAxis stroke={darkMode ? "#999" : "#666"} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: darkMode ? "#333" : "#fff",
                              border: `1px solid ${darkMode ? "#555" : "#ddd"}`,
                              color: darkMode ? "#fff" : "#000",
                            }}
                            formatter={(v: any) => `${Math.round(Number(v))} ${t("unitH")}`}
                          />
                          <Bar dataKey="value" fill="#fbbf24" radius={[8, 8, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* 城市基础与健康环境对比 */}
                <div className={`p-4 rounded-lg lg:col-span-2 ${
                  darkMode ? "bg-gray-700" : "bg-gray-50"
                }`}>
                  <h3 className={`text-lg font-bold mb-4 ${
                    darkMode ? "text-white" : "text-gray-800"
                  }`}>
                    {t("infrastructureCompare")}
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div>
                      <p className={`text-sm font-semibold mb-2 ${darkMode ? "text-gray-200" : "text-gray-700"}`}>
                        {t("doctorsPerThousand")}
                      </p>
                      <ResponsiveContainer width="100%" height={240}>
                        <BarChart
                          data={comparisonData.map((city) => {
                            const infra = getCityInfra(city);
                            return { name: getCityLabel(city), value: infra.doctorsPerThousand };
                          })}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#444" : "#ddd"} />
                          <XAxis dataKey="name" stroke={darkMode ? "#999" : "#666"} />
                          <YAxis stroke={darkMode ? "#999" : "#666"} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: darkMode ? "#333" : "#fff",
                              border: `1px solid ${darkMode ? "#555" : "#ddd"}`,
                              color: darkMode ? "#fff" : "#000",
                            }}
                            formatter={(v: any) => `${Number(v).toFixed(1)}`}
                          />
                          <Bar dataKey="value" fill="#22c55e" radius={[8, 8, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div>
                      <p className={`text-sm font-semibold mb-2 ${darkMode ? "text-gray-200" : "text-gray-700"}`}>
                        {t("avgAqi3y")} ({t("aqiLabel")})
                      </p>
                      <ResponsiveContainer width="100%" height={240}>
                        <BarChart
                          data={comparisonData.map((city) => {
                            const infra = getCityInfra(city);
                            return { name: getCityLabel(city), value: infra.avgAqi3y };
                          })}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#444" : "#ddd"} />
                          <XAxis dataKey="name" stroke={darkMode ? "#999" : "#666"} />
                          <YAxis stroke={darkMode ? "#999" : "#666"} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: darkMode ? "#333" : "#fff",
                              border: `1px solid ${darkMode ? "#555" : "#ddd"}`,
                              color: darkMode ? "#fff" : "#000",
                            }}
                            formatter={(v: any) => `${Math.round(Number(v))} ${t("aqiLabel")}`}
                          />
                          <Bar dataKey="value" fill="#f97316" radius={[8, 8, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div>
                      <p className={`text-sm font-semibold mb-2 ${darkMode ? "text-gray-200" : "text-gray-700"}`}>
                        {t("directDestinations")}
                      </p>
                      <ResponsiveContainer width="100%" height={240}>
                        <BarChart
                          data={comparisonData.map((city) => {
                            const infra = getCityInfra(city);
                            return { name: getCityLabel(city), value: infra.directDestinations };
                          })}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#444" : "#ddd"} />
                          <XAxis dataKey="name" stroke={darkMode ? "#999" : "#666"} />
                          <YAxis stroke={darkMode ? "#999" : "#666"} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: darkMode ? "#333" : "#fff",
                              border: `1px solid ${darkMode ? "#555" : "#ddd"}`,
                              color: darkMode ? "#fff" : "#000",
                            }}
                            formatter={(v: any) => `${Math.round(Number(v))} ${t("destLabel")}`}
                          />
                          <Bar dataKey="value" fill="#6366f1" radius={[8, 8, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
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
                {comparisonMode === "ratio" ? t("clickSetBase") : t("cityDetails")}
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
                      className={`rounded-xl p-6 shadow-xl transition ${
                        comparisonMode === "ratio" ? "hover:shadow-2xl cursor-pointer" : "cursor-default"
                      } ${
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
                          {getCityLabel(city)}
                        </h3>
                        <p className="text-sm text-blue-100">
                          {getCountryLabel(city.country)}
                        </p>
                        <p className="text-xs text-blue-200 mt-1">
                          {getContinentLabel(city.continent)}
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
                              : formatPrice(city.bigMacPrice)}
                        </p>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2">
                        {(() => {
                          const climate = getClimate(city);
                          const infra = getCityInfra(city);
                          return (
                            <>
                              <div className="bg-white bg-opacity-10 p-2 rounded-lg">
                                <p className="text-[10px] text-blue-100 mb-1">{t("climateType")}</p>
                                <p className="text-xs text-white font-semibold">{t(`climate_${climate.type}`)}</p>
                              </div>
                              <div className="bg-white bg-opacity-10 p-2 rounded-lg">
                                <p className="text-[10px] text-blue-100 mb-1">{t("avgTemp")}</p>
                                <p className="text-xs text-white font-semibold">
                                  {climate.avgTempC.toFixed(1)}{t("unitC")}
                                </p>
                              </div>
                              <div className="bg-white bg-opacity-10 p-2 rounded-lg">
                                <p className="text-[10px] text-blue-100 mb-1">{t("annualRain")}</p>
                                <p className="text-xs text-white font-semibold">
                                  {Math.round(climate.annualRainMm)} {t("unitMm")}
                                </p>
                              </div>
                              <div className="bg-white bg-opacity-10 p-2 rounded-lg">
                                <p className="text-[10px] text-blue-100 mb-1">{t("sunshine")}</p>
                                <p className="text-xs text-white font-semibold">
                                  {Math.round(climate.sunshineHours)} {t("unitH")}
                                </p>
                              </div>
                              <div className="bg-white bg-opacity-10 p-2 rounded-lg">
                                <p className="text-[10px] text-blue-100 mb-1">{t("doctorsPerThousand")}</p>
                                <p className="text-xs text-white font-semibold">
                                  {infra.doctorsPerThousand.toFixed(1)}
                                </p>
                              </div>
                              <div className="bg-white bg-opacity-10 p-2 rounded-lg">
                                <p className="text-[10px] text-blue-100 mb-1">{t("avgAqi3y")}</p>
                                <p className="text-xs text-white font-semibold">
                                  {infra.avgAqi3y} {t("aqiLabel")}
                                </p>
                              </div>
                              <div className="bg-white bg-opacity-10 p-2 rounded-lg">
                                <p className="text-[10px] text-blue-100 mb-1">{t("directDestinations")}</p>
                                <p className="text-xs text-white font-semibold">
                                  {infra.directDestinations} {t("destLabel")}
                                </p>
                              </div>
                            </>
                          );
                        })()}
                      </div>

                      <div className="mt-4 bg-white bg-opacity-10 p-3 rounded-lg">
                        <p className="text-xs text-blue-100 mb-1">{t("cityDescription")}</p>
                        <p className="text-xs text-white leading-relaxed">
                          {getLocalizedDescription(city, salary)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 关键洞察 */}
            <div className={`rounded-xl shadow-lg p-8 ${
              darkMode
                ? "bg-gray-900/80 border border-gray-700"
                : "bg-white/90 border border-gray-200"
            }`}>
              <h2 className={`text-2xl md:text-3xl font-semibold mb-5 ${
                darkMode ? "text-slate-100" : "text-slate-800"
              }`}>
                {t("keyInsights")}
              </h2>
              {(() => {
                const withMetrics = comparisonData.map((city) => {
                  const income = selectedProfession
                    ? city.professions[selectedProfession] || 0
                    : city.averageIncome;
                  const savings = income - city.costOfLiving * 12;
                  return {
                    city,
                    income,
                    savings,
                    monthlyCost: city.costOfLiving,
                  };
                });
                const incomeTop = [...withMetrics].sort((a, b) => b.income - a.income)[0];
                const savingsTop = [...withMetrics].sort((a, b) => b.savings - a.savings)[0];
                const lowestCostTop = [...withMetrics].sort((a, b) => a.monthlyCost - b.monthlyCost)[0];

                const recommended = [...withMetrics]
                  .sort((a, b) => (b.income + b.savings) - (a.income + a.savings))
                  .slice(0, Math.min(3, withMetrics.length));
                const recommendedCities = recommended.map((item) => getCityLabel(item.city));
                const recommendationText = comparisonData.length >= 3
                  ? t("insightSuggestionPick3", {
                      cities: recommendedCities.join("、"),
                    })
                  : t("insightSuggestionNeedMore", {
                      count: comparisonData.length,
                    });

                return (
                  <>
                    <div className="space-y-4 md:space-y-0 md:grid md:grid-cols-3 gap-4">
                      <div className={`rounded-lg p-5 ${darkMode ? "bg-slate-800/80 border border-slate-700" : "bg-slate-50 border border-slate-200"}`}>
                        <p className={`text-sm font-medium mb-2 ${darkMode ? "text-slate-300" : "text-slate-600"}`}>{t("topIncomeCity")}</p>
                        <h3 className={`text-lg font-bold ${darkMode ? "text-white" : "text-slate-900"}`}>{getCityLabel(incomeTop.city)}</h3>
                        <p className={`text-sm ${darkMode ? "text-slate-300" : "text-slate-600"}`}>
                          {t("appSubtitle", { count: 1 })} {formatCurrency(incomeTop.income)}
                        </p>
                      </div>
                      <div className={`rounded-lg p-5 ${darkMode ? "bg-slate-800/80 border border-slate-700" : "bg-slate-50 border border-slate-200"}`}>
                        <p className={`text-sm font-medium mb-2 ${darkMode ? "text-slate-300" : "text-slate-600"}`}>{t("topSavingsCity")}</p>
                        <h3 className={`text-lg font-bold ${darkMode ? "text-white" : "text-slate-900"}`}>{getCityLabel(savingsTop.city)}</h3>
                        <p className={`text-sm ${darkMode ? "text-slate-300" : "text-slate-600"}`}>
                          {formatCurrency(savingsTop.savings)} {t("yearlySavings")}
                        </p>
                      </div>
                      <div className={`rounded-lg p-5 ${darkMode ? "bg-slate-800/80 border border-slate-700" : "bg-slate-50 border border-slate-200"}`}>
                        <p className={`text-sm font-medium mb-2 ${darkMode ? "text-slate-300" : "text-slate-600"}`}>{t("lowestCostCity")}</p>
                        <h3 className={`text-lg font-bold ${darkMode ? "text-white" : "text-slate-900"}`}>{getCityLabel(lowestCostTop.city)}</h3>
                        <p className={`text-sm ${darkMode ? "text-slate-300" : "text-slate-600"}`}>
                          {formatCurrency(lowestCostTop.monthlyCost)} / {t("monthlyExpense")}
                        </p>
                      </div>
                    </div>
                    <div className={`mt-4 rounded-lg p-5 ${darkMode ? "bg-slate-800/70 border border-slate-700" : "bg-slate-50 border border-slate-200"}`}>
                      <p className={`text-sm font-semibold mb-2 ${darkMode ? "text-slate-300" : "text-slate-600"}`}>{t("insightSuggestionTitle")}</p>
                      <p className={`text-sm ${darkMode ? "text-slate-100" : "text-slate-700"}`}>
                        {recommendationText}
                      </p>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
