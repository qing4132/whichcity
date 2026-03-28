# Data Dictionary — 数据字典

> 最后审计：2026-03-28 (v3 — 扩展至 134 城市 × 26 个职业)

本文档定义了项目中所有数据字段、计算公式、转换规则、分级标准和算法的完整技术规范。

---

## 1. 核心数据类型 (`lib/types.ts`)

### 1.1 City 接口

```typescript
interface City {
  id: number;                          // 唯一 ID (1-139, 共 134 城市)
  name: string;                        // 中文名
  country: string;                     // 中文国家名
  continent: string;                   // 中文大洲名
  averageIncome: number;               // 年均收入 (USD)
  costOfLiving: number;                // [旧字段] 月生活成本 (等同 costModerate)
  costModerate: number;                // 月支出 — 常规
  costBudget: number;                  // 月支出 — 节俭
  bigMacPrice: number | null;          // 巨无霸价格 (USD)，null=无麦当劳
  yearlySavings: number;               // [旧字段] 年储蓄 (基于 costModerate)
  currency: string;                    // 本地货币代码
  description: string;                 // 中文城市描述
  professions: Record<string, number>; // 26个职业年薪 (USD)
  housePrice: number;                  // 房价 (USD/m²)
  airQuality: number;                  // AQI (US EPA)
  aqiSource: "iqair" | "EPA";           // AQI 数据来源标识
  doctorsPerThousand: number;          // 每千人医师数
  directFlightCities: number;          // 直飞城市数
  annualWorkHours: number;             // 年工作时长 (小时)
  safetyIndex: number;                 // 安全指数 (0-100)
  safetyConfidence: "high"|"medium"|"low"; // 安全数据置信度
  safetyNightSafety: number;           // 夜间安全感 (0-100)
  safetyViolentCrimeInv: number;       // 暴力犯罪反向分 (0-100)
  safetyPropertyCrimeInv: number;      // 财产犯罪反向分 (0-100)
  safetyForeignerFriendly: number;     // 外国人友好度 (0-100)
  // v2 新增字段
  monthlyRent: number;                 // 1居室市中心月租金 (USD)
  paidLeaveDays: number;               // 法定带薪年假天数
  internetSpeedMbps: number;           // 固定宽带下载速度 (Mbps)
  hospitalBedsPerThousand: number;     // 每千人病床数
  uhcCoverageIndex: number;            // UHC 服务覆盖指数 (0-100)
  lifeExpectancy: number;              // 人均预期寿命 (年)
  pressFreedomScore: number;           // 新闻自由度 (0-100, 越高越自由)
  democracyIndex: number;              // 民主指数 (0-10)
  corruptionPerceptionIndex: number;   // 清廉感知指数 (0-100, 越高越廉洁)
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
type CostTier = "moderate" | "budget";
type Locale = "zh" | "en" | "ja" | "es";
type ClimateType = "tropical" | "temperate" | "continental" | "arid" | "mediterranean" | "oceanic";

interface ExchangeRates {
  rates: Record<string, number>;   // 货币代码 → 对 USD 汇率
  symbols: Record<string, string>; // 货币代码 → 符号 (¥, €, £ 等)
}
```

---

## 2. 数据来源与时效性

| 字段 | 来源 | 粒度 | 更新周期 | 最后更新 |
|------|------|------|---------|---------|
| `averageIncome` | ERI/SalaryExpert, BLS, PayScale, OECD | 城市级 | 年度 | 2025 |
| `professions{}` | 同上 + Robert Half, Hays, 智联招聘, JobStreet | 城市级 | 年度 | 2025（逐城逐职独立查询） |
| `costModerate` | Numbeo, Expatistan, 各国统计局 | 城市级 | 年度 | 2024-2025 |
| `costBudget` | 基于 `costModerate` 乘城市级系数 | — | 随 costModerate | — |
| `bigMacPrice` | The Economist Big Mac Index | 国家级 | 半年 | 2025-01 |
| `housePrice` | Global Property Guide, 各地房产指数 | 城市级 | 年度 | 2024-2025 |
| `monthlyRent` | Numbeo Rent Index (1-bedroom city center) | 城市级 | 年度 | 2024-2025 |
| `airQuality` | IQAir 2024 (8城) / US EPA (126城) | 城市级 | 年度 | 2024 |
| `aqiSource` | — | — | — | 标识数据来源 (iqair/EPA) |
| `doctorsPerThousand` | WHO GHO / World Bank (CC BY-4.0) | 城市级 | 不定期 | 2022-2024 |
| `directFlightCities` | OAG Aviation, FlightConnections.com | 城市级 | 年度 | 2025 |
| `annualWorkHours` | OECD Employment Outlook 2024, ILO ILOSTAT | 国家级 | 年度 | 2024 |
| `paidLeaveDays` | OECD / 各国劳动法 | 国家级 | 不定期 | 2025 |
| `internetSpeedMbps` | Ookla Speedtest Global Index | 城市级 | 季度 | 2025 |
| `safetyIndex` | Numbeo + UNODC + InterNations + Gallup | 城市级 | 年度 | 2024-2025 |
| `safetyNightSafety` | Numbeo Safety Index 2024-2025 | 城市级 | 年度 | 2024-2025 |
| `safetyViolentCrimeInv` | UNODC 杀人率（反向计分） | 国家级 | 年度 | 2024 |
| `safetyPropertyCrimeInv` | Numbeo Crime Index（反向计分） | 城市级 | 年度 | 2024-2025 |
| `safetyForeignerFriendly` | InterNations Expat Insider 2024 + Gallup 2023 | 国家级 | 年度 | 2023-2024 |
| `hospitalBedsPerThousand` | World Bank (SH.MED.BEDS.ZS) | 国家级 | 不定期 | 2022-2024 |
| `uhcCoverageIndex` | WHO Global Health Observatory | 国家级 | 年度 | 2024 |
| `lifeExpectancy` | World Bank (SP.DYN.LE00.IN) | 国家级 | 年度 | 2024 |
| `pressFreedomScore` | RSF World Press Freedom Index | 国家级 | 年度 | 2024 |
| `democracyIndex` | EIU Democracy Index | 国家级 | 年度 | 2024 |
| `corruptionPerceptionIndex` | Transparency International CPI | 国家级 | 年度 | 2024 |
| `ClimateInfo` | WMO 1991-2020 Normals, NOAA, 各国气象局 | 城市级 | 30年均值 | 2020 基准 |
| `exchange-rates.json` | 静态 JSON | — | 手动 | — |

---

## 3. 派生指标计算公式

### 3.1 生活成本层级

当前系统只使用两个层级：`moderate`（常规）和 `budget`（节俭）。

- `costModerate`: 基础数据，来自 Numbeo/Expatistan 独立研究
- `costBudget`: 基于 `costModerate` 乘以城市级比例系数
  - 原 100 城: 系数 0.38–0.48，按城市经济水平分化（来自 `update_cost_tiers.py`）
  - 新增 20 亚洲城市: 系数 0.37–0.44，独立校准（来自 `fix-asian-data.mjs`）
  - 发达昂贵城市 ≈ 0.45–0.48，发展中城市 ≈ 0.37–0.42

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
- `cost` = 根据 `costTier` 选择 `costModerate` 或 `costBudget`
- `median(allBigMacPrices)` = 所有 `bigMacPrice !== null` 城市价格的中位数

### 3.3 巨无霸相关特殊处理

以下 6 国城市 `bigMacPrice = null`（无麦当劳）：
- 伊朗(德黑兰)、柬埔寨(金边)、缅甸(仰光)
- 孟加拉国(达卡)、尼泊尔(加德满都)、蒙古(乌兰巴托)

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

### 4.2 AQI 数据来源

| aqiSource | 城市数 | 方法 |
|-----------|--------|------|
| `EPA` | 126 | 直接采用 US EPA AQI 年度标准值 |
| `iqair` | 8 | IQAir 2024 年度 PM2.5 均值 → US EPA AQI 公式转换 |

8 座 `iqair` 城市: 北京(4)、上海(5)、香港(10)、广州(101)、深圳(102)、成都(103)、杭州(104)、重庆(105)

---

## 5. 安全指数计算方法

`safetyIndex` = 加权综合评分，范围 0-100，定义于 `scripts/add-safety-v2.mjs`：

```
safetyIndex = Numbeo Safety Index × 0.35
            + UNODC 凶杀率反向分 × 0.30
            + GPI 转换分 × 0.20
            + 盖洛普法治指数 × 0.15
```

| 权重 | 数据源 | 说明 |
|------|--------|------|
| 35% Numbeo Safety | Numbeo Safety Index 2024-2025 | 直接使用 0-100 评分 |
| 30% 凶杀率反向 | UNODC 杀人率 | min-max 归一化后反转（犯罪率越低分越高） |
| 20% GPI 转换分 | Vision of Humanity GPI 2025 | 1-5 → 0-100 转换 |
| 15% 盖洛普法治 | Gallup Global Law & Order 2024 | 0-100，直接使用 |

**置信度**：当任一数据源缺失时标记为 `safetyConfidence: "low"`，前端在数值后显示 `*` 号。当前仅 1 座城市（仰光）为 low。

**子指标存储**：v2 起，4 项子指标（`numbeoSafetyIndex`, `homicideRateInv`, `gpiScoreInv`, `gallupLawOrder`）已直接存入 `cities.json`，可在城市详情页安全指数卡片中展开查看各子项得分与权重。

---

## 5b. 生活压力指数计算方法 (Life Pressure Index)

定义于 `lib/clientUtils.ts` 的 `computeLifePressure()`，运行时在客户端计算。

**分数范围**：0-100，越高压力越大

### 5b.1 四个子指标

| 子指标 | 权重 | 方向 | 公式 |
|--------|------|------|------|
| 储蓄率 | 30% | 越高越好 | `(income − cost × 12) / income` |
| 时薪巨无霸购买力 | 25% | 越高越好 | `hourlyWage / bigMacPrice`（时薪能买几个巨无霸） |
| 年工时 | 25% | 越低越好 | `annualWorkHours`（反向计分） |
| 购房年限 | 20% | 越低越好 | `housePrice × 70 / savings`（反向计分） |

### 5b.2 计算流程

1. 对所有 134 城计算各子指标原始值
2. 各子指标在 134 城中 min-max 归一化到 [0, 100]
3. 反向指标（工时、购房年限）取 `100 − normalized`
4. 加权求和：`SR×0.30 + BM×0.25 + WH×0.25 + YH×0.20`

### 5b.3 特殊处理

- `bigMacPrice = null` 的城市（6 座无麦当劳）：巨无霸权重重新分配至剩余 3 项（40%/33%/27%）
- `savings ≤ 0` 的城市：购房年限 = Infinity，归一化后子分 = 0

### 5b.4 数据依赖

**全部从已有字段派生**，无需新增数据。受用户选择的职业和生活水平影响。

---

## 5c. 医疗保障指数计算方法 (Healthcare Security Index)

定义于 `lib/clientUtils.ts` 的 `computeHealthcare()`。

**分数范围**：0-100，越高保障越好

| 子指标 | 权重 | 数据源 | 粒度 |
|--------|------|--------|------|
| 每千人医师数 | 35% | WHO / World Bank | 城市级（已有） |
| 每千人病床数 | 25% | World Bank (SH.MED.BEDS.ZS) | 国家级（v2 新增） |
| UHC 覆盖率 | 25% | WHO Global Health Observatory | 国家级（v2 新增） |
| 预期寿命 | 15% | World Bank (SP.DYN.LE00.IN) | 国家级（v2 新增） |

**计算**：各子指标 min-max 归一化到 [0, 100]，加权求和。

---

## 5d. 制度自由度指数计算方法 (Institutional Freedom Index)

定义于 `lib/clientUtils.ts` 的 `computeInstitutionalFreedom()`。

**分数范围**：0-100，越高越自由

| 子指标 | 权重 | 原始范围 | 数据源 |
|--------|------|---------|--------|
| 新闻自由度 | 35% | 0-100 | RSF World Press Freedom Index 2024 |
| 民主指数 | 35% | 0-10 → ×10 映射到 0-100 | EIU Democracy Index 2024 |
| 清廉感知指数 | 30% | 0-100 | Transparency International CPI 2024 |

**计算**：`press × 0.35 + democracy×10 × 0.35 + cpi × 0.30`

三项数据均已在 0-100 量程（民主指数 ×10 后），直接加权求和，无需归一化。全部为国家级数据，同一国家的城市得分相同。

**设计立场**：本产品认为新闻自由、民主制度和行政清廉是个体移居决策的重要参考因素。此为有意的价值取向，非中立立场。

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
  c.costModerate,                               // 常规月支出
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
| 房价 | 越低越好 | tierLow |
| 购房年限 | 越低越好 | tierLow |
| 月租金 | 越低越好 | tierLow |
| 年工时 | 越低越好 | tierLow |
| 时薪 | 越高越好 | tierHigh |
| 带薪年假 | 越高越好 | tierHigh |
| AQI | 越低越好 | tierLow |
| 网速 | 越高越好 | tierHigh |
| 直飞城市 | 越高越好 | tierHigh |
| 生活压力指数 | 越高越好(轻松) | tierHigh |
| 安全指数 | 越高越好 | tierHigh |
| 医疗保障指数 | 越高越好 | tierHigh |
| 制度自由指数 | 越高越好 | tierHigh |

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

134 条气候数据，内联于代码中（非 JSON 文件），格式：
```typescript
export const CITY_CLIMATE: Record<number, ClimateInfo> = {
  1: { type: "continental", avgTempC: 12.9, annualRainMm: 1268, ... },
  ...
};
```

### 11.3 `lib/constants.ts` — CITY_FLAG_EMOJIS

134 条国旗 emoji 映射（城市 ID → 国旗 emoji），用于所有页面的城市显示。

### 11.4 `lib/constants.ts` — REGIONS

10 个地区分组，用于首页城市选择器和 CityLinks 组件。

### 11.5 `lib/citySlug.ts`

- `CITY_SLUGS`: 134 条 ID → URL slug 映射（如 `1 → "new-york"`）
- `SLUG_TO_ID`: 反向映射
- `POPULAR_PAIRS`: ~80 组热门城市对比对（用于 SSG 预生成）

### 11.6 `lib/cityIntros.ts`

134 × 4 = 536 条城市简介文本（zh/en/ja/es），用于城市详情页 Hero 区域。

---

## 12. 26 种职业列表

职业键名与翻译定义于 `i18n.ts` 的 `PROFESSION_TRANSLATIONS`：

| 键名 | 中文 | English |
|------|------|---------|
| softwareEngineer | 软件工程师 | Software Engineer |
| dataScientist | 数据科学家 | Data Scientist |
| productManager | 产品经理 | Product Manager |
| uiuxDesigner | UI/UX 设计师 | UI/UX Designer |
| marketingManager | 市场经理 | Marketing Manager |
| financialAnalyst | 财务分析师 | Financial Analyst |
| accountant | 会计师 | Accountant |
| nurse | 护士 | Nurse |
| teacher | 教师 | Teacher |
| lawyer | 律师 | Lawyer |
| mechanicalEngineer | 机械工程师 | Mechanical Engineer |
| pharmacist | 药剂师 | Pharmacist |
| architect | 建筑师 | Architect |
| hrManager | 人力资源经理 | Human Resources Manager |
| graphicDesigner | 平面设计师 | Graphic Designer |
| journalist | 记者 | Journalist |
| chef | 厨师 | Chef |
| salesManager | 销售经理 | Sales Manager |
| civilServant | 公务员 | Civil Servant |
| doctor | 医生/医学博士 | Doctor/Physician |
| universityProfessor | 大学教授 | University Professor |
| dentist | 牙医 | Dentist |
| domesticWorker | 家政服务人员 | Domestic Worker |
| photographer | 摄影师 | Photographer |
| busDriver | 公交司机 | Bus Driver |
| electrician | 电工 | Electrician |

---

## 13. 数据处理脚本索引

| 脚本 | 语言 | 用途 | 关键逻辑/公式 |
|------|------|------|-------------|
| `update_salaries.py` | Python | 更新 134 城 × 26 职业薪资 | 逐城逐职独立查询，禁止等比缩放 |
| `update_cost_tiers.py` | Python | 计算 cost 二档 | moderate=Numbeo, budget=moderate×城市级系数(0.37–0.48) |
| `add_aqi.py` | Python | 添加 AQI | EPA 直报城市直取；8 中国城市用 IQAir PM2.5→US EPA 公式 |
| `add-safety-v2.mjs` | Node.js | 添加安全指数 | 35/30/20/15 加权 (Numbeo/UNODC/GPI/Gallup) |
| `add-flights.mjs` | Node.js | 添加直飞城市数 | OAG + FlightConnections |
| `add-workhours.mjs` | Node.js | 添加年工时 | OECD/ILO 国家级数据 |
| `add-new-fields.mjs` | Node.js | 添加 v2 9 个新字段 | 租金、年假、网速、病床、UHC、寿命、新闻自由、民主、清廉 |
| `add-healthcare-index.mjs` | Node.js | 计算医疗保障指数 | 4 子指标加权 |
| `add-freedom-index.mjs` | Node.js | 计算制度自由度指数 | 3 子指标加权 |
| `batch-update-v3.mjs` | Node.js | v3 批量更新 | 134 城 × 26 职业完整数据批量写入 |
| `add_doctors_data.py` | Python | 添加医师密度 | WHO/World Bank |
| `add-climate-detail.mjs` | Node.js | 添加气候详情 | WMO/NOAA |
| `add_20_asian_cities.py` | Python | 批量新增 20 亚洲城市 | 手查数据（历史） |
| `translate-intros.mjs` | Node.js | 翻译城市介绍 | Google Translate |
| `check_data.js` | Node.js | 数据完整性检查 | — |
| `deep_data_check.js` | Node.js | 深度数据校验 | — |

---

## 14. 已知数据问题

| # | 问题 | 严重度 | 说明 |
|---|------|--------|------|
| 1 | costOfLiving 与 costModerate 冗余 | 低 | `costOfLiving` 是旧字段，等同 `costModerate`，未被前端使用 |
| 2 | yearlySavings 字段冗余 | 低 | JSON 中有该字段但前端全部运行时计算，两者可能不一致 |
| 3 | 安全指数低置信度城市 | 低 | 仅仰光(110)标记 `safetyConfidence: "low"`，缺 Numbeo 数据 |
| 4 | 工时为国家级非城市级 | 中 | `annualWorkHours` 使用国家平均值，同一国家各城市相同 |
| 5 | 汇率为静态快照 | 低 | `exchange-rates.json` 非实时，可能与实际汇率有偏差 |
| 6 | bigMacPrice null 的城市 | — | 6 国无麦当劳，设计如此 |
| 7 | 气候数据使用 30 年平均值 | — | WMO Climate Normals 1991-2020，设计如此 |
| 8 | v2 国家级数据共 7 项 | 中 | paidLeaveDays, hospitalBedsPerThousand, uhcCoverageIndex, lifeExpectancy, pressFreedomScore, democracyIndex, corruptionPerceptionIndex 均为国家级，同一国家的城市共享同一数值 |
| 9 | 带薪年假为法定最低值 | 低 | 实际年假可能因公司、工龄而更高；美国联邦法定为 0 天但多数雇主提供 10-15 天 |
| 10 | 生活压力指数受用户选择影响 | — | 随职业和生活水平选项变化，非固定值；设计如此 |

---

## 15. 前端卡片布局 (v2)

### 15.1 城市详情页 4 行布局

```
第一行 (2 中卡片 × 3 数据)：
  [收支] 年收入 | 月成本 | 年储蓄
  [住房] 房价/m² | 购房年限 | 月租金

第二行 (2 中卡片 × 3 数据)：
  [工作] 年工时 | 时薪 | 带薪年假
  [环境与连接] AQI | 网速 | 直飞城市

第三行 (4 小指标卡片，可点击展开)：
  [生活压力] [公共安全] [医疗保障] [制度自由]

第四行 (1 大卡片)：
  [气候环境 — 不变]
```

### 15.2 排行榜页面 13 个 Tab

savings | ppp | housing | rent | air | flights | safety | workhours | vacation | internet | lifePressure | healthcare | freedom
