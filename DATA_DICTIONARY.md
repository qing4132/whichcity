# Data Dictionary — 数据字典

> 最后审计：2026-03-27

本文档定义了项目中所有数据字段、计算公式、转换规则、分级标准和算法的完整技术规范。

---

## 1. 核心数据类型 (`lib/types.ts`)

### 1.1 City 接口

```typescript
interface City {
  id: number;                          // 唯一 ID (1-120)
  name: string;                        // 中文名
  country: string;                     // 中文国家名
  continent: string;                   // 中文大洲名
  averageIncome: number;               // 年均收入 (USD)
  costOfLiving: number;                // [旧字段] 月生活成本 (等同 costModerate)
  costComfort: number;                 // 月支出 — 舒适
  costModerate: number;                // 月支出 — 适中
  costBudget: number;                  // 月支出 — 节俭
  costMinimal: number;                 // 月支出 — 极简
  bigMacPrice: number | null;          // 巨无霸价格 (USD)，null=无麦当劳
  yearlySavings: number;               // [旧字段] 年储蓄 (基于 costModerate)
  currency: string;                    // 本地货币代码
  description: string;                 // 中文城市描述
  professions: Record<string, number>; // 20个职业年薪 (USD)
  housePrice: number;                  // 房价 (USD/m²)
  airQuality: number;                  // AQI (US EPA)
  doctorsPerThousand: number;          // 每千人医师数
  directFlightCities: number;          // 直飞城市数
  annualWorkHours: number;             // 年工作时长 (小时)
  safetyIndex: number;                 // 安全指数 (0-100)
  safetyConfidence: "high"|"medium"|"low"; // 安全数据置信度
}
```

### 1.2 ClimateInfo 接口

```typescript
interface ClimateInfo {
  type: ClimateType;    // "tropical"|"temperate"|"continental"|"arid"|"mediterranean"|"oceanic"
  avgTempC: number;     // 年均温 (°C)
  annualRainMm: number; // 年降水 (mm)
  sunshineHours: number;// 年日照 (小时)
  summerAvgC: number;   // 夏季均温 (°C)
  winterAvgC: number;   // 冬季均温 (°C)
  humidityPct: number;  // 年平均相对湿度 (%)
}
```

### 1.3 其他类型

```typescript
type CostTier = "comfort" | "moderate" | "budget" | "minimal";
type Locale = "zh" | "en" | "ja" | "es";
type ClimateType = "tropical" | "temperate" | "continental" | "arid" | "mediterranean" | "oceanic";

interface ExchangeRates {
  rates: Record<string, number>;   // 货币代码 → 对 USD 汇率
  symbols: Record<string, string>; // 货币代码 → 符号 (¥, €, £ 等)
}
```

---

## 2. 数据来源与时效性

| 字段 | 来源 | 更新周期 | 最后更新 |
|------|------|---------|---------|
| `averageIncome` | ERI/SalaryExpert, BLS, PayScale, OECD | 年度 | 2025 |
| `professions{}` | 同上 + Robert Half, Hays, 智联招聘, JobStreet | 年度 | 2025（逐城逐职独立查询） |
| `costModerate` | Numbeo, Expatistan, 各国统计局 | 年度 | 2024-2025 |
| `costComfort/Budget/Minimal` | 基于 `costModerate` 乘系数 | 随 costModerate | — |
| `bigMacPrice` | The Economist Big Mac Index | 半年 | 2025-01 |
| `housePrice` | Global Property Guide, 各地房产指数 | 年度 | 2024-2025 |
| `airQuality` | IQAir 2024, AQICN | 年度 | 2024 |
| `doctorsPerThousand` | WHO GHO / World Bank (CC BY-4.0) | 不定期 | 2022-2024 |
| `directFlightCities` | OAG Aviation, FlightConnections.com | 年度 | 2025 |
| `annualWorkHours` | OECD Employment Outlook 2024, ILO ILOSTAT | 年度 | 2024 |
| `safetyIndex` | Numbeo + UNODC + InterNations + Gallup | 年度 | 2024-2025 |
| `ClimateInfo` | WMO 1991-2020 Normals, NOAA, 各国气象局 | 30年均值 | 2020 基准 |
| `exchange-rates.json` | 静态 JSON | 手动 | — |

---

## 3. 派生指标计算公式

### 3.1 生活成本层级

基于 `costModerate` 按固定系数计算（定义于 `update_cost_tiers.py`）：

```
costComfort  = costModerate × 1.6
costBudget   = costModerate × 0.45
costMinimal  = costModerate × 0.28
```

### 3.2 运行时派生值（CityDetailContent / CompareContent 内计算）

| 指标 | 公式 | 使用位置 |
|------|------|---------|
| 年储蓄 | `income − cost × 12` | 全局 |
| 储蓄率 | `savings / income × 100` | KeyInsights, RankingContent |
| 时薪 | `income / annualWorkHours` | CityDetailContent |
| 巨无霸指数 | `bigMacPrice / median(allBigMacPrices)` | CityDetailContent |
| 购房年限 | `housePrice × 70 / annualSavings` (假设 70m²) | CityDetailContent, CompareContent, KeyInsights, RankingContent |
| 购买力指数 PPP | `annualIncome / annualCost` | RankingContent |

其中：
- `income` = `professions[activeProfession]` 或 `averageIncome`（无选择时）
- `cost` = 根据 `costTier` 选择 `costComfort/Moderate/Budget/Minimal`
- `median(allBigMacPrices)` = 所有 `bigMacPrice !== null` 城市价格的中位数

### 3.3 巨无霸相关特殊处理

以下 8 国城市 `bigMacPrice = null`（无麦当劳）：
- 古巴(哈瓦那)、伊朗(德黑兰)、柬埔寨(金边)、缅甸(仰光)
- 老挝(万象)、孟加拉国(达卡)、尼泊尔(加德满都)、蒙古(乌兰巴托)

前端处理：
- 显示 `t("noMcDonalds")` 文本
- 巨无霸指数显示 "—"
- 对比页中该指标判为平局
- 排名中 `bigMacRatio` 的总数仅计入有数据的城市

---

## 4. AQI 转换规则

### 4.1 US EPA AQI 标准

| AQI 范围 | 等级 | 前端颜色 |
|----------|------|---------|
| 0-50 | Good (优) | emerald/green |
| 51-100 | Moderate (良) | amber/yellow |
| 101-150 | Unhealthy for Sensitive Groups (轻度) | orange |
| 151-200 | Unhealthy (中度) | red |
| 201-300 | Very Unhealthy (重度) | purple |
| 301+ | Hazardous (严重) | rose |

### 4.2 中国城市 AQI 转换

中国大陆城市(ID 4, 5, 101-105) 原始数据来自 AQICN (HJ 633-2012 标准)：

```
US EPA AQI = AQICN raw × 1.4
```

转换依据：中国 AQI 以 PM₁₀ 为主指标，US EPA 以 PM₂.₅ 为主，浓度标度差约 1.4 倍。

脚本：`scripts/add_aqi.py`

---

## 5. 安全指数计算方法

`safetyIndex` = 加权综合评分，范围 0-100，定义于 `scripts/add-safety.mjs`：

```
safetyIndex = 夜间安全感 × 0.40
            + 暴力犯罪反向分 × 0.30
            + 财产犯罪反向分 × 0.20
            + 外国人友好度 × 0.10
```

| 权重 | 数据源 | 说明 |
|------|--------|------|
| 40% 夜间安全感 | Numbeo Safety Index 2024-2025 | 直接使用 0-100 评分 |
| 30% 暴力犯罪 | UNODC 杀人率 | 反向计分（犯罪率越低分越高） |
| 20% 财产犯罪 | Numbeo Crime Index | 反向计分 |
| 10% 外国人友好 | InterNations Expat Insider 2024 + Gallup 2023 | 综合评分 |

**置信度**：当任一数据源缺失时标记为 `safetyConfidence: "low"`，前端在数值后显示 `*` 号。

---

## 6. 综合评分算法 (KeyInsights)

定义于 `components/KeyInsights.tsx`，用于"综合推荐"和"决策矩阵"：

```
compositeScore = savingsNorm × 0.35
               + homeAffordNorm × 0.30
               + airQualityNorm × 0.20
               + doctorsNorm × 0.15
```

归一化方法：
```
savingsNorm    = max(0, savings) / max(allSavings)
homeAffordNorm = 1 − (yearsToHome / max(allYearsToHome))   # yearsToHome 越小越好
airQualityNorm = 1 − (airQuality / max(allAirQuality))     # AQI 越小越好
doctorsNorm    = doctorsPerThousand / max(allDoctors)
```

**注意**：此评分仅在对比模式中使用（2-5城），不是全局排名。权重是设计决策，目前未向用户暴露。

---

## 7. 相似城市算法 (computeSimilarIds)

定义于 `app/city/[slug]/page.tsx`，在 SSG 构建时执行。

### 7.1 特征向量 (11维)

```typescript
const vec = (c: City): number[] => [
  c.averageIncome,                              // 年均收入
  c.costModerate,                               // 适中月支出
  c.averageIncome - c.costModerate * 12,        // 年储蓄 (派生)
  c.annualWorkHours,                            // 年工时
  c.annualWorkHours > 0 ? c.averageIncome / c.annualWorkHours : 0,  // 时薪 (派生)
  c.housePrice,                                 // 房价/m²
  c.airQuality,                                 // AQI
  c.safetyIndex,                                // 安全指数
  c.doctorsPerThousand,                         // 医师密度
  c.directFlightCities,                         // 直飞城市
  c.bigMacPrice ?? 0,                           // 巨无霸价格 (null→0)
];
```

### 7.2 归一化

Min-Max 归一化至 [0, 1]：
```
normalized[i] = (value − min) / (max − min)    # range > 0
normalized[i] = 0.5                              # range == 0
```

### 7.3 距离计算

标准 L2 欧氏距离：
```
distance = √(Σ (normalized_a[i] − normalized_b[i])²)
```

### 7.4 设计决策

- **排除 `yearsToHome`**（即购房年限）：因为它是 `income/cost/housePrice` 的派生指标，纳入会导致经济维度三重权重
- **`bigMacPrice` null 处理为 0**：归一化后 null 城市在该维度偏离中心，不会与有数据城市过度匹配
- **使用 `averageIncome`** 而非当前选择的职业：因为 SSG 构建时无法知道用户选了哪个职业
- **Top 6**：返回距离最近的 6 个城市

---

## 8. 百分位排名与分级系统 (CityDetailContent)

### 8.1 百分位计算

```typescript
const pct = (values: number[], val: number) => {
  const sorted = [...values].sort((a, b) => a - b);
  const idx = sorted.findIndex((v) => v >= val);
  return idx === -1 ? 1 : idx / sorted.length;
};
```

### 8.2 排名计算

```typescript
// 越高越好的指标
const rankHigher = (values, val) => {
  const sorted = [...values].sort((a, b) => b - a);
  return sorted.findIndex((v) => v <= val) + 1;
};

// 越低越好的指标
const rankLower = (values, val) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.findIndex((v) => v >= val) + 1;
};
```

### 8.3 三档分级

| 档位 | 条件（越高越好） | 条件（越低越好） | 卡片边框颜色 | 数值颜色 |
|------|-----------------|-----------------|-------------|---------|
| good | pct ≥ 0.75 | pct ≤ 0.25 | emerald | emerald |
| mid | 0.25 < pct < 0.75 | 0.25 < pct < 0.75 | slate (默认) | 默认 |
| bad | pct ≤ 0.25 | pct ≥ 0.75 | rose | rose |

### 8.4 指标排序方向

| 指标 | 排序方向 | 分级函数 |
|------|---------|---------|
| 年收入 | 越高越好 | tierHigh |
| 月消费 | 越低越好 | tierLow |
| 年储蓄 | 越高越好 | tierHigh |
| 年工时 | 越低越好 | tierLow |
| 时薪 | 越高越好 | tierHigh |
| 巨无霸指数 | 越低越好 | tierLow |
| 房价 | 越低越好 | tierLow |
| 购房年限 | 越低越好 | tierLow |
| AQI | 越低越好 | tierLow |
| 安全指数 | 越高越好 | tierHigh |
| 医师密度 | 越高越好 | tierHigh |
| 直飞城市 | 越高越好 | tierHigh |

---

## 9. 相似城市优势维度计算

定义于 `CityDetailContent.tsx` 相似城市区块，对每个推荐城市：

### 9.1 对比维度 (9 维)

```typescript
const dims = [
  { key: "avgIncome",        higher: true  },  // 收入越高越好
  { key: "monthlyCost",      higher: false },  // 消费越低越好
  { key: "yearlySavings",    higher: true  },  // 储蓄越高越好
  { key: "annualWorkHours",  higher: false },  // 工时越低越好
  { key: "housePrice",       higher: false },  // 房价越低越好
  { key: "airQuality",       higher: false },  // AQI越低越好
  { key: "safetyIndex",      higher: true  },  // 安全越高越好
  { key: "doctorsPerThousand", higher: true },  // 医师越多越好
  { key: "directFlights",    higher: true  },  // 直飞越多越好
];
```

### 9.2 优势计算逻辑

对每个维度，判断推荐城市是否比当前城市更优：
```
advPct = |other − current| / |current| × 100
```

选择百分比最大的优势维度显示在卡片上，格式如 `安全指数 +23%` 或 `月生活成本 -15%`。

---

## 10. 货币转换

### 10.1 汇率数据

存储于 `public/data/exchange-rates.json`，格式：
```json
{
  "rates": { "USD": 1, "EUR": 0.92, "GBP": 0.79, ... },
  "symbols": { "USD": "$", "EUR": "€", "GBP": "£", ... }
}
```

### 10.2 转换公式

```
displayAmount = Math.round(amountUSD × rates[selectedCurrency] × 100) / 100
```

### 10.3 格式化

- 标准：`{symbol}{amount.toLocaleString()}`
- 印度卢比/巴基斯坦卢比：使用 `toLocaleString("en-IN")` 显示印度数字分组
- BigMac 等小额使用 `toFixed(2)` 保留两位

---

## 11. 数据文件清单

### 11.1 `public/data/cities.json`

核心数据文件，结构：
```json
{
  "cities": [
    {
      "id": 1,
      "name": "纽约",
      "country": "美国",
      "continent": "北美洲",
      "averageIncome": 75000,
      "costModerate": 3200,
      "professions": { "softwareEngineer": 120000, ... },
      ...
    },
    ...
  ]
}
```

### 11.2 `lib/constants.ts` — CITY_CLIMATE

120 条气候数据，内联于代码中（非 JSON 文件），格式：
```typescript
export const CITY_CLIMATE: Record<number, ClimateInfo> = {
  1: { type: "continental", avgTempC: 12.9, annualRainMm: 1268, ... },
  ...
};
```

### 11.3 `lib/constants.ts` — CITY_FLAG_EMOJIS

120 条国旗 emoji 映射（城市 ID → 国旗 emoji），用于所有页面的城市显示。

### 11.4 `lib/constants.ts` — REGIONS

10 个地区分组，用于首页城市选择器和 CityLinks 组件。

### 11.5 `lib/citySlug.ts`

- `CITY_SLUGS`: 120 条 ID → URL slug 映射（如 `1 → "new-york"`）
- `SLUG_TO_ID`: 反向映射
- `POPULAR_PAIRS`: ~60 组热门城市对比对（用于 SSG 预生成）

### 11.6 `lib/cityIntros.ts`

120 × 4 = 480 条城市简介文本（zh/en/ja/es），用于城市详情页 Hero 区域。

---

## 12. 20 种职业列表

职业键名与翻译定义于 `i18n.ts` 的 `PROFESSION_TRANSLATIONS`：

| 键名 | 中文 |
|------|------|
| softwareEngineer | 软件工程师 |
| dataScientist | 数据科学家 |
| productManager | 产品经理 |
| uiuxDesigner | UI/UX 设计师 |
| marketingManager | 市场经理 |
| financialAnalyst | 金融分析师 |
| accountant | 会计师 |
| nurse | 护士 |
| teacher | 教师 |
| lawyer | 律师 |
| civilEngineer | 土木工程师 |
| mechanicalEngineer | 机械工程师 |
| electricalEngineer | 电气工程师 |
| pharmacist | 药剂师 |
| architect | 建筑师 |
| consultantMgmt | 管理咨询师 |
| hrManager | 人力资源经理 |
| graphicDesigner | 平面设计师 |
| journalist | 记者 |
| chef | 厨师 |

---

## 13. 数据处理脚本索引

| 脚本 | 语言 | 用途 | 关键逻辑/公式 |
|------|------|------|-------------|
| `update_salaries.py` | Python | 更新 120 城 × 20 职业薪资 | 逐城逐职独立查询，禁止等比缩放 |
| `update_cost_tiers.py` | Python | 计算 cost 四档 | comfort×1.6, budget×0.45, minimal×0.28 |
| `add_aqi.py` | Python | 添加 AQI | 中国城市 raw×1.4 → US EPA |
| `add-safety.mjs` | Node.js | 添加安全指数 | 40/30/20/10 加权 |
| `add-flights.mjs` | Node.js | 添加直飞城市数 | OAG + FlightConnections |
| `add-workhours.mjs` | Node.js | 添加年工时 | OECD/ILO 国家级数据 |
| `add_doctors_data.py` | Python | 添加医师密度 | WHO/World Bank |
| `add-climate-detail.mjs` | Node.js | 添加气候详情 | WMO/NOAA |
| `add_20_asian_cities.py` | Python | 批量新增 20 亚洲城市 | 手查数据 |
| `translate-intros.mjs` | Node.js | 翻译城市介绍 | Google Translate |
| `check_data.js` | Node.js | 数据完整性检查 | — |
| `deep_data_check.js` | Node.js | 深度数据校验 | — |

---

## 14. 已知数据问题

| # | 问题 | 严重度 | 说明 |
|---|------|--------|------|
| 1 | costOfLiving 与 costModerate 冗余 | 低 | `costOfLiving` 是旧字段，等同 `costModerate`，未被前端使用 |
| 2 | yearlySavings 字段冗余 | 低 | JSON 中有该字段但前端全部运行时计算，两者可能不一致 |
| 3 | 安全指数低置信度城市 | 中 | 部分城市标记 `safetyConfidence: "low"`，数据可靠性较差 |
| 4 | 工时为国家级非城市级 | 中 | `annualWorkHours` 使用国家平均值，同一国家各城市相同 |
| 5 | 汇率为静态快照 | 低 | `exchange-rates.json` 非实时，可能与实际汇率有偏差 |
| 6 | bigMacPrice null 的城市 | — | 8 国无麦当劳，设计如此 |
| 7 | 气候数据使用 30 年平均值 | — | WMO Climate Normals 1991-2020，设计如此 |
