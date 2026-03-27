# 数据来源与方法论 — 完整参考手册

> **版本**: v3 — 2026-03-28  
> **范围**: 本文档记录项目中 **每一份数据** 的来源、计算公式、特殊处理与新增操作指南。  
> **原则**: 网站中呈现的每一项指标，均可在此文档内查到其来源链与计算方式。

---

## 0. 速查目录

| 章节 | 内容 |
|------|------|
| [1. 数据总体架构](#1-数据总体架构) | 数据文件布局、流水线、依赖关系 |
| [2. 城市基础字段](#2-城市基础字段120-座城市) | averageIncome、costModerate、costBudget 等 14 项 |
| [3. 职业薪资](#3-职业薪资professions) | 20 个职业 × 120 城，来源与规范 |
| [4. 安全指数](#4-安全指数safety-index) | 4 子指标 + 复合加权 + 特殊警告 |
| [5. 医疗保障指数](#5-医疗保障指数healthcare-index) | 4 子指标 + 复合加权 |
| [6. 制度自由度指数](#6-制度自由度指数freedom-index) | 3 子指标 + 复合加权 |
| [7. 生活压力指数](#7-生活压力指数life-pressure-index) | 4 子指标 + 运行时计算 |
| [8. 气候数据](#8-气候数据climate) | 7 个维度，硬编码在 constants.ts |
| [9. 汇率与货币](#9-汇率与货币) | 25 种货币，前端展示换算 |
| [10. 前端派生指标](#10-前端派生指标) | 所有页面上用公式实时计算的数值 |
| [11. 排名与颜色系统](#11-排名与颜色系统) | 百分位、固定阈值、好/中/差规则 |
| [12. 空值与特殊情况](#12-空值与特殊情况) | 哪些字段可为 null，前端如何处理 |
| [13. 脚本依赖关系与执行顺序](#13-脚本依赖关系与执行顺序) | 完整构建流水线 |
| [14. 新增操作指南](#14-新增操作指南) | 加城市、加职业、加数据字段的 SOP |
| [15. 已知局限与注意事项](#15-已知局限与注意事项) | |
| [16. 数据修正记录](#16-数据修正记录) | 历史变更日志 |

---

## 1. 数据总体架构

### 1.1 数据文件分布

```
public/data/
  cities.json          ← 核心数据（120 城 × 42+ 字段），构建时读取 + 运行时 fetch
  exchange-rates.json  ← 25 种货币汇率，运行时 fetch
  professions.json     ← 职业列表元数据（名称/翻译），运行时 fetch
  salaries.csv         ← 参考快照，不参与运行

data/sources/
  numbeo-safety-2025.json     ← Numbeo Safety Index（城市级）
  unodc-homicide-2024.json    ← UNODC 凶杀率（国家级）
  gpi-2025.json               ← 全球和平指数（国家级）
  gallup-law-order-2024.json  ← 盖洛普法治指数（国家级）

lib/constants.ts
  CITY_CLIMATE{}       ← 120 城气候参数（硬编码）
  REGIONS[]            ← 10 个地理分区（城市 ID 数组）
  CITY_FLAG_EMOJIS{}   ← 国旗 emoji
```

### 1.2 数据流向

```
外部数据源 (Numbeo, IQAir, OECD, ILO, WHO, World Bank, ...)
    │
    ▼
scripts/*.py / *.mjs          ← 数据采集 & 处理脚本（离线运行）
    │
    ▼
public/data/cities.json        ← 唯一数据文件（120 座城市记录）
    │
    ├─→ 构建时 (SSG): dataLoader.ts → readFileSync → 生成 187 个静态页面
    │     └→ 相似城市计算（11 维欧氏距离）
    │     └→ SEO metadata（title, description, JSON-LD）
    │
    └─→ 运行时 (Browser): fetch("/data/cities.json")
          └→ CityComparison / RankingContent / CityDetailContent / CompareContent
          └→ 所有 **派生指标** 在浏览器中实时计算
```

### 1.3 城市记录完整结构

```typescript
interface City {
  // ── 基础标识 ──
  id: number;                          // 1-120
  name: string;                        // 中文城市名
  country: string;                     // 中文国家名
  continent: string;                   // 中文大洲名
  currency: string;                    // 本地货币代码
  description: string;                 // 中文城市简介

  // ── 收入与成本 ──
  averageIncome: number;               // 年平均收入 (USD)
  professions: Record<string, number>; // 20 个职业年薪 (USD)
  costModerate: number;                // 月生活成本-适度 (USD)
  costBudget: number;                  // 月生活成本-节俭 (USD)
  bigMacPrice: number | null;          // 巨无霸单价 (USD)

  // ── 住房 ──
  housePrice: number | null;           // 房价 (USD/m²)
  monthlyRent: number | null;          // 1 居室市中心月租金 (USD)

  // ── 工作与生活 ──
  annualWorkHours: number | null;      // 年工作时长 (小时)
  paidLeaveDays: number | null;        // 法定带薪年假天数
  internetSpeedMbps: number | null;    // 固定宽带下载速度 (Mbps)

  // ── 空气质量 ──
  airQuality: number | null;           // AQI (US EPA 标准)
  aqiSource?: "EPA" | "iqair";         // 数据来源标识

  // ── 医疗 ──
  doctorsPerThousand: number | null;   // 每千人执业医师数
  hospitalBedsPerThousand: number | null; // 每千人病床数
  uhcCoverageIndex: number | null;     // UHC 服务覆盖指数 (0-100)
  lifeExpectancy: number | null;       // 人均预期寿命 (年)

  // ── 安全 ──
  safetyIndex: number;                 // 复合安全指数 (0-100)
  safetyConfidence: "high"|"medium"|"low";
  numbeoSafetyIndex: number | null;    // Numbeo Safety Index (0-100)
  homicideRateInv: number | null;      // UNODC 凶杀率反向分 (0-100)
  gpiScoreInv: number | null;          // GPI 转换分 (0-100)
  gallupLawOrder: number | null;       // 盖洛普法治 (0-100)
  safetyWarning?: "active_conflict"|"extreme_instability"|"data_blocked";

  // ── 制度自由 ──
  pressFreedomScore: number | null;    // 新闻自由 (0-100)
  democracyIndex: number | null;       // 民主指数 (0-10)
  corruptionPerceptionIndex: number | null; // 清廉指数 (0-100)
  freedomIndex: number;                // 复合自由指数 (0-100)
  freedomConfidence: "high"|"medium"|"low";

  // ── 医疗复合指数 ──
  healthcareIndex: number;             // 复合医疗指数 (0-100)
  healthcareConfidence: "high"|"medium"|"low";

  // ── 直飞 ──
  directFlightCities: number | null;   // 直飞目的地城市数
}
```

---

## 2. 城市基础字段（120 座城市）

### 2.1 averageIncome — 年平均收入 (USD)

| 属性 | 值 |
|------|---|
| 单位 | USD/年 |
| 粒度 | 城市级 |
| 范围 | ~$4,000 (哈瓦那) – ~$110,000 (旧金山) |
| 管理脚本 | `update_salaries.py` |

**数据来源**:
- 美国: BLS Occupational Employment & Wage Statistics (OEWS)
- 欧洲: Eurostat Structure of Earnings Survey、Michael Page/Hays 薪资指南
- 日韩: doda 薪资调查、KOSIS 韩国统计门户
- 中国: 智联招聘、猎聘、看准
- 东南亚: JobStreet、JobsDB
- 中亚: HeadHunter.kz
- 通用: ERI/SalaryExpert（employer-verified）、PayScale

**定义**: 城市全行业中位数年薪（税前），由 20 个职业薪资取平均后设定。

**汇率转换基准** (mid-2025):
```
EUR→USD: 1.10   GBP→USD: 1.27   JPY→USD: 0.0067   CHF→USD: 1.15
AUD→USD: 0.65   CAD→USD: 0.73   SGD→USD: 0.75     CNY→USD: 0.138
KRW→USD: 0.00073   INR→USD: 0.012   THB→USD: 0.028
```

---

### 2.2 costModerate — 月生活成本-适度 (USD)

| 属性 | 值 |
|------|---|
| 单位 | USD/月（单人） |
| 粒度 | 城市级 |
| 范围 | ~$500 (仰光) – ~$5,200 (苏黎世) |
| 管理脚本 | `update_cost_tiers.py` |

**数据来源**:
- Numbeo Cost of Living Index 2024–2026
- Expatistan Cost of Living
- Mercer Cost of Living Survey 2024
- UBS Prices & Earnings
- 各国统计局 (BLS, ONS, ...)

**定义**: 单人在该城市的适度月生活开支，含：
- 租金（非市中心 1 居室）
- 餐饮（混合模式，偶尔外食）
- 交通（公共交通月票）
- 日常消费 + 基础娱乐

---

### 2.3 costBudget — 月生活成本-节俭 (USD)

| 属性 | 值 |
|------|---|
| 单位 | USD/月（单人） |
| 范围 | ~$185 (仰光) – ~$2,496 (苏黎世) |
| 与 costModerate 比例 | 0.370 (仰光) – 0.480 (西雅图) |
| 管理脚本 | 原 100 城: `update_cost_tiers.py`; 新 20 城: `fix-asian-data.mjs` |

**计算方法**: `costBudget = costModerate × 城市级系数`

**系数确定逻辑**:
- 原 100 城由 `update_cost_tiers.py` 硬编码三元组 `(comfort, moderate, budget)`，每城独立查询
- 新 20 座亚洲城市由 `fix-asian-data.mjs` 提供独立系数:

| 城市类型 | 系数范围 | 代表城市 |
|---------|---------|---------|
| 高消费亚洲城市 | 0.43–0.48 | 香港 0.48, 深圳 0.43, 大阪 0.44 |
| 中消费亚洲城市 | 0.41–0.42 | 广州 0.41, 杭州 0.42, 首尔仁川 0.42 |
| 发展中亚洲 | 0.38–0.40 | 曼谷 0.39, 胡志明市 0.40, 达卡 0.38 |
| 低消费亚洲 | 0.37–0.38 | 仰光 0.37, 金边 0.38, 加德满都 0.38 |

**定义**: 节俭模式月开支——合租、在家做饭、最少娱乐。

> **⚠️ 禁止**: 不允许对新城市使用统一系数（如一律 ×0.45），必须逐城市参照 Numbeo 单人预算生活成本独立确定。

---

### 2.4 bigMacPrice — 巨无霸价格 (USD)

| 属性 | 值 |
|------|---|
| 来源 | The Economist Big Mac Index (2025-01) |
| 数据 URL | https://github.com/TheEconomist/big-mac-data |
| 粒度 | 国家级（麦当劳全国统一价） |
| 可 null | 是 — 8 座城市所在国家无麦当劳 |

**null 城市 (8 座)**:
| 城市 | ID | 原因 |
|------|---|------|
| 德黑兰 | 54 | 伊朗无麦当劳 |
| 哈瓦那 | 72 | 古巴无麦当劳 |
| 金边 | 109 | 柬埔寨无麦当劳 |
| 仰光 | 110 | 缅甸无麦当劳 |
| 万象 | 111 | 老挝无麦当劳 |
| 达卡 | 114 | 孟加拉国无麦当劳 |
| 加德满都 | 116 | 尼泊尔无麦当劳 |
| 乌兰巴托 | 120 | 蒙古无麦当劳 |

**前端处理**: 显示「无麦当劳」（i18n key: `noMcDonalds`），不参与排名和巨无霸模式计算。

---

### 2.5 housePrice — 房价 (USD/m²)

| 属性 | 值 |
|------|---|
| 来源 | Global Property Guide、Numbeo Property、各地房产指数 |
| 定义 | 城市中心区域住宅均价 (USD/每平米) |
| 粒度 | 城市级 |
| 范围 | ~$400/m² – ~$30,000/m² |

**用于计算**: 购房年限 = `housePrice × 70 / 年储蓄`（70m² 标准住宅）

---

### 2.6 monthlyRent — 月租金 (USD)

| 属性 | 值 |
|------|---|
| 来源 | Numbeo Rent Index 2024-2025 + 本地租房平台参照 |
| 定义 | 市中心 1 居室公寓月租金 |
| 粒度 | 城市级 |
| 范围 | ~$30 – ~$3,200 |
| 管理脚本 | `add-new-fields.mjs` |

---

### 2.7 airQuality — 空气质量 AQI

| 属性 | 值 |
|------|---|
| 标准 | US EPA AQI |
| 范围 | 22 (奥克兰) – 175 (新德里) |
| 管理脚本 | `add_aqi.py`（原始 100 城）、`fix-asian-data.mjs`（8 城修正） |

**两种数据源**:

| aqiSource | 城市数 | 方法 |
|-----------|--------|------|
| `EPA` | 112 | 直接采用 US EPA AirNow 3 年均值 (2023–2025) |
| `iqair` | 8 | IQAir 2024 年度均值：PM2.5 年均浓度 → US EPA AQI 公式 |

**IQAir → US EPA AQI 转换公式**:
```
PM2.5 ≤ 12.0 µg/m³ → AQI = PM2.5 × (50/12)
PM2.5 12.1–35.4 µg/m³ → AQI = 50 + (PM2.5 − 12.1) × (50/23.3)
PM2.5 35.5–55.4 µg/m³ → AQI = 101 + (PM2.5 − 35.5) × (49/19.9)
```

**IQAir 来源城市明细**:

| 城市 | ID | PM2.5 年均 (µg/m³) | AQI | 来源 |
|------|-----|-------|-----|------|
| 北京 | 4 | ~30.5 | 89 | IQAir 2024 年报 |
| 上海 | 5 | ~25.0 | 77 | IQAir 2024 年报 |
| 香港 | 10 | ~14.5 | 55 | IQAir 2024 年报 |
| 广州 | 101 | ~25.5 | 78 | IQAir 2024 年报 |
| 深圳 | 102 | ~19.5 | 66 | IQAir 2024 年报 |
| 成都 | 103 | ~33.0 | 94 | IQAir 2024 年报 |
| 杭州 | 104 | ~28.5 | 84 | IQAir 2024 年报 |
| 重庆 | 105 | ~29.5 | 87 | IQAir 2024 年报 |

**AQI 等级划分** (前端颜色 + 标签):

| AQI 范围 | 类别 | 中文标签 | 颜色 |
|---------|------|---------|------|
| 0–50 | Good | 优 | 绿色 |
| 51–100 | Moderate | 良 | 黄色 |
| 101–150 | USG | 轻度污染 | 橙色 |
| 151–200 | Unhealthy | 中度污染 | 浅红 |
| 201–300 | Very Unhealthy | 重度污染 | 红色 |
| > 300 | Hazardous | 严重污染 | 深红 |

---

### 2.8 doctorsPerThousand — 每千人医师数

| 属性 | 值 |
|------|---|
| 来源 | WHO Global Health Workforce Statistics / World Bank SH.MED.PHYS.ZS (CC BY-4.0) |
| 粒度 | 以国家为基准，城市级调整 |
| 范围 | 0.2 (内罗毕) – 8.4 (哈瓦那) |
| 管理脚本 | `add_doctors_data.py` |

**城市级调整逻辑**:
- 国家基准率 × 城市乘数
- 重大医学中心城市（如波士顿、哈瓦那）: +20%~50%
- 首都/一线城市: +15%~30%
- 医疗资源匮乏城市（如拉斯维加斯）: 低于国家均值

---

### 2.9 directFlightCities — 直飞城市数

| 属性 | 值 |
|------|---|
| 来源 | OAG Aviation Analytics、FlightConnections.com、Wikipedia 机场条目 (2025) |
| 定义 | 从该城市所有机场出发，可直飞抵达的不重复目的地城市数 |
| 范围 | 0 (基辅/万象/达沃) – 390 (伦敦) |
| 管理脚本 | `add-flights.mjs` |

**特殊规则**:
- 同一大都市区多个机场合并计算（如纽约 = JFK + LGA + EWR）
- 同一目的地城市只计一次
- 基辅 = 0（领空关闭 since 2022-02）

---

### 2.10 annualWorkHours — 年工作时长

| 属性 | 值 |
|------|---|
| 来源 | OECD Employment Outlook 2024（成员国）; ILO ILOSTAT（非 OECD 国家）|
| 粒度 | 国家级（同国城市共享） |
| 范围 | 1,341 (德国) – 2,238 (新加坡) |
| 管理脚本 | `add-workhours.mjs` |

**定义**: 每个受雇人员的年平均实际工作小时数（全行业跨部门均值）。

---

### 2.11 paidLeaveDays — 法定带薪年假天数

| 属性 | 值 |
|------|---|
| 来源 | OECD、ILO、各国劳动法汇编 |
| 粒度 | 国家级 |
| 范围 | 0 (美国联邦) – 30 (巴西/法国) |
| 管理脚本 | `add-new-fields.mjs` |

**注意**: 美国联邦法 = 0，但实际雇主多提供 10–15 天。此字段仅记录法定最低值。

---

### 2.12 internetSpeedMbps — 固定宽带速度

| 属性 | 值 |
|------|---|
| 来源 | Ookla Speedtest Global Index 2025 |
| 粒度 | 城市级 |
| 范围 | 5 (哈瓦那) – 250 (新加坡) |
| 管理脚本 | `add-new-fields.mjs` |

---

### 2.13 description — 城市描述

| 属性 | 值 |
|------|---|
| 来源 | AI 生成中文原文 → Google Translate 翻译 4 语言 |
| 存储 | `lib/cityIntros.ts` (4 语言: zh/en/ja/es) |
| 管理脚本 | `translate-intros.mjs` |

---

### 2.14 continent — 大洲

由 `fix_continents.js` 基于城市名 → 大洲映射初始化。使用中文名称（北美洲、欧洲、亚洲 等）。

---

## 3. 职业薪资（professions）

### 3.1 概况

| 属性 | 值 |
|------|---|
| 职业数 | 20 |
| 城市数 | 120 |
| 数据点 | 2,400 (20 × 120) |
| 单位 | USD/年 (税前) |
| 管理脚本 | `update_salaries.py` |

### 3.2 20 个职业清单

| # | 中文键名 | English |
|---|---------|---------|
| 1 | 软件工程师 | Software Engineer |
| 2 | 医生/医学博士 | Doctor/Physician |
| 3 | 财务分析师 | Financial Analyst |
| 4 | 市场经理 | Marketing Manager |
| 5 | 项目经理 | Project Manager |
| 6 | 平面设计师 | Graphic Designer |
| 7 | 数据科学家 | Data Scientist |
| 8 | 业务分析师 | Business Analyst |
| 9 | 销售经理 | Sales Manager |
| 10 | 人力资源经理 | HR Manager |
| 11 | 教师 | Teacher |
| 12 | 护士 | Nurse |
| 13 | 律师 | Lawyer |
| 14 | 建筑师 | Architect |
| 15 | 厨师 | Chef |
| 16 | 记者 | Journalist |
| 17 | 机械工程师 | Mechanical Engineer |
| 18 | 药剂师 | Pharmacist |
| 19 | 会计师 | Accountant |
| 20 | 公务员 | Civil Servant |

### 3.3 数据来源（按地区）

| 地区 | 主要来源 |
|------|---------|
| 美国/加拿大 | BLS OEWS、ERI/SalaryExpert、Robert Half、PayScale |
| 西欧 | Michael Page/Hays 薪资指南、Glassdoor EU、Eurostat |
| 英国/爱尔兰 | ONS、Glassdoor UK |
| 日本 | doda 薪资调查 |
| 韩国 | KOSIS 韩国统计门户、JobKorea |
| 中国大陆/港台 | 智联招聘、猎聘、看准 |
| 东南亚 | JobStreet、JobsDB |
| 南亚 | Glassdoor India、Naukri |
| 中亚 | HeadHunter.kz、Boss.az |
| 拉美 | Michael Page LatAm、Glassdoor Brazil/Mexico |
| 中东 | Numbeo、Bayt.com |
| 非洲 | Numbeo、国家统计局 |

### 3.4 数据规则

> **强制要求**: 每个城市每个职业 **必须独立查询真实薪资数据**——严禁使用参考城市乘以缩放系数批量生成。`update_salaries.py` 脚本中包含全部 120 城 × 20 职业的显式数值和来源注释。

### 3.5 前端使用

- 用户可选择特定职业 → `income = city.professions["软件工程师"]`
- 未选择职业时 → `income = city.averageIncome`
- 如选定职业在某城市 `professions` 中缺失 → 回退至 `averageIncome`

---

## 4. 安全指数 (Safety Index)

### 4.1 子指标来源

| 子指标 | 字段名 | 来源 | 粒度 | 权重 | 备注 |
|--------|-------|------|------|------|------|
| Numbeo Safety Index | `numbeoSafetyIndex` | numbeo.com/crime/rankings (2024-2025) | 城市级 | **35%** | 0-100, 直接使用 |
| 凶杀率反向分 | `homicideRateInv` | UNODC dataunodc.un.org (2024) | 国家级 | **30%** | min-max 归一化后反转 |
| GPI 转换分 | `gpiScoreInv` | Vision of Humanity / IEP GPI 2025 | 国家级 | **20%** | 1-5 → 0-100 转换 |
| 盖洛普法治 | `gallupLawOrder` | Gallup Global Law & Order Report 2024 | 国家级 | **15%** | 0-100, 直接使用 |

### 4.2 源数据文件

| 文件 | 格式 | 覆盖 |
|------|------|------|
| `data/sources/numbeo-safety-2025.json` | `{ cities: { "English Name": score } }` | 城市名 → 0-100 |
| `data/sources/unodc-homicide-2024.json` | `{ countries: { "中文国名": rate } }` | 凶杀率/10万人 |
| `data/sources/gpi-2025.json` | `{ countries: { "中文国名": score } }` | 1-5 尺度 |
| `data/sources/gallup-law-order-2024.json` | `{ countries: { "中文国名": score } }` | 0-100 |

### 4.3 归一化公式

**UNODC 凶杀率 → 0-100**:
```
step 1: min-max 归一到 [0,100] → normalized = (rate - min) / (max - min) × 100
step 2: 反向 → homicideRateInv = 100 - normalized
```
低凶杀率 → 高分数。

**GPI → 0-100**:
```
gpiScoreInv = round(((5 - gpiRaw) / 4) × 100)
```
GPI=1.33（新加坡）→ 91.75 → round → 92

**Numbeo**: 已是 0-100，直接使用。

**Gallup**: 已是 0-100，直接使用。

### 4.4 复合计算

```
权重 = { numbeo: 0.35, homicide: 0.30, gpi: 0.20, gallup: 0.15 }

对于每座城市:
  nonNullSubs = 排除 null 的子指标
  totalWeight = sum(nonNull子指标的权重)
  safetyIndex = round(Σ(sub.value × sub.weight / totalWeight))
```

### 4.5 置信度

```
missingWeight = null 子指标的权重之和
if missingWeight == 0      → "high"   (116 座城市)
if missingWeight < 1/3     → "medium" (0 座城市)
if missingWeight >= 1/3    → "low"    (4 座城市)
```

**低置信度城市**: 哈瓦那 (72, 缺 Numbeo + Gallup)、蒙特哥湾 (74, 缺 Numbeo)、仰光 (110, 缺 Numbeo)、万象 (111, 缺 Numbeo)

### 4.6 特殊安全警告

| 城市 | ID | `safetyWarning` | 含义 |
|------|---|-----------------|------|
| 基辅 | 85 | `active_conflict` | 武装冲突中 |
| 加拉加斯 | 66 | `extreme_instability` | 治理崩溃 |
| 哈瓦那 | 72 | `data_blocked` | 信息封锁 |

前端显示警告标识。

### 4.7 管理脚本

`scripts/add-safety-v2.mjs` — 读取 4 个 data/sources/ JSON → 为 120 城计算安全指数 → 写入 cities.json

---

## 5. 医疗保障指数 (Healthcare Index)

### 5.1 子指标来源

| 子指标 | 字段名 | 来源 | 粒度 | 权重 |
|--------|-------|------|------|------|
| 每千人医师 | `doctorsPerThousand` | WHO / World Bank | 城市级调整 | **35%** |
| 每千人病床 | `hospitalBedsPerThousand` | World Bank SH.MED.BEDS.ZS | 国家级 | **25%** |
| UHC 覆盖率 | `uhcCoverageIndex` | WHO Global Health Observatory | 国家级 | **25%** |
| 预期寿命 | `lifeExpectancy` | World Bank SP.DYN.LE00.IN | 国家级 | **15%** |

### 5.2 归一化

```
对每个子指标:
  if max == min → norm = 50
  else → norm = (val - min) / (max - min) × 100
```

### 5.3 复合计算

```
healthcareIndex = round(Σ(norm_sub × weight / totalNonNullWeight))
```

缺失子指标的权重重分配给非 null 子指标。

### 5.4 置信度

与安全指数相同的规则。当前 120 城全部为 "high"（所有 4 个子指标均有数据）。

### 5.5 管理脚本

`scripts/add-healthcare-index.mjs` — 读取 cities.json 中已有子字段 → 计算 healthcareIndex → 写回。

---

## 6. 制度自由度指数 (Freedom Index)

### 6.1 子指标来源

| 子指标 | 字段名 | 来源 | 原始量程 | 转换 | 权重 |
|--------|-------|------|---------|------|------|
| 新闻自由 | `pressFreedomScore` | RSF World Press Freedom Index 2024 | 0-100 | 不变 | **35%** |
| 民主指数 | `democracyIndex` | EIU Democracy Index 2024 | 0-10 | ×10 = 0-100 | **35%** |
| 清廉指数 | `corruptionPerceptionIndex` | Transparency International CPI 2024 | 0-100 | 不变 | **30%** |

### 6.2 复合计算

```
freedomIndex = round(
  pressFreedomScore × 0.35 +
  democracyIndex × 10 × 0.35 +
  corruptionPerceptionIndex × 0.30
)
```
缺失子指标时权重重分配。

### 6.3 管理脚本

`scripts/add-freedom-index.mjs`

---

## 7. 生活压力指数 (Life Pressure Index)

### 7.1 关键区别

> **此指数在浏览器中实时计算**——不存储在 cities.json 中。每个用户的职业和消费层级选择不同，结果不同。

### 7.2 计算位置

`lib/clientUtils.ts` → `computeLifePressure()`

### 7.3 子指标与权重

| 子指标 | 权重 | 公式 | 方向 |
|--------|------|------|------|
| 储蓄率 | **30%** | `(income - cost×12) / income` | 越高越好 |
| 巨无霸购买力 | **25%** | `(income / annualWorkHours) / bigMacPrice` | 越高越好 |
| 年工时反向 | **25%** | `100 - minMaxNorm(allWorkHours, hours)` | 工时越低 → 分越高 |
| 购房年限反向 | **20%** | `100 - minMaxNorm(allYears, years)` | 年限越低 → 分越高 |

### 7.4 归一化函数

```javascript
function minMaxNorm(values, val) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) return 50;
  return ((val - min) / (max - min)) * 100;
}
```

### 7.5 缺失数据处理

| 缺失子指标 | 触发条件 | 处理 |
|-----------|---------|------|
| 巨无霸购买力 (25%) | `bigMacPrice === null` 或 `annualWorkHours === null` | 权重重分配 |
| 年工时 (25%) | `annualWorkHours === null` | 权重重分配 |
| 购房年限 (20%) | `savings ≤ 0` 或 `housePrice === null` | 权重重分配 |
| 储蓄率 (30%) | `income ≤ 0` | 理论上不发生 |

### 7.6 置信度

```
missingWeight == 0      → "high"
missingWeight < 0.333   → "medium"
missingWeight >= 0.333  → "low"
```

### 7.7 最终值

```javascript
totalWeight = sum(non-null sub weights)
value = round(Σ(sub.norm × sub.weight / totalWeight))
// 范围: 0-100, 越高越轻松
```

---

## 8. 气候数据 (Climate)

### 8.1 存储位置

`lib/constants.ts` → `CITY_CLIMATE: Record<number, ClimateInfo>`

### 8.2 字段明细

| 字段 | 含义 | 来源 |
|------|------|------|
| `type` | 气候类型 | Köppen 气候分类 |
| `avgTempC` | 年均温 (°C) | WMO Climate Normals 1991–2020 |
| `annualRainMm` | 年降水 (mm) | WMO / 各国气象局 |
| `sunshineHours` | 年日照 (小时) | NOAA / 各国气象局 |
| `summerAvgC` | 夏季平均温 (°C) | 见下文定义 |
| `winterAvgC` | 冬季平均温 (°C) | 见下文定义 |
| `humidityPct` | 年平均相对湿度 (%) | WMO / 各国气象局 |

### 8.3 季节定义

| 半球 | 夏季 | 冬季 |
|------|------|------|
| 北半球 | 7-8 月均温 | 1 月均温 |
| 南半球 | 1-2 月均温 | 7 月均温 |

### 8.4 气候类型枚举

```
"tropical" | "temperate" | "continental" | "arid" | "mediterranean" | "oceanic"
```

### 8.5 管理脚本

`scripts/add-climate-detail.mjs` — 为 CITY_CLIMATE 添加 summerAvgC/winterAvgC/humidityPct 三个字段（写入 constants.ts）。

---

## 9. 汇率与货币

### 9.1 数据文件

`public/data/exchange-rates.json`

### 9.2 支持的 25 种货币

```
USD EUR GBP JPY CNY HKD AUD CAD SGD INR
THB MYR VND PHP IDR PKR EGP TRY BRL MXN
ZAR SEK NOK CHF NZD
```

### 9.3 汇率基准

- 基础货币: USD = 1
- 快照时间: mid-2025
- **静态数据**: 不自动更新

### 9.4 前端转换逻辑

```javascript
// hooks/useSettings.ts
convertAmount(amountInUSD) {
  return Math.round(amountInUSD * rates[selectedCurrency] * 100) / 100;
}

formatCurrency(amountInUSD) {
  const symbol = symbols[selectedCurrency] || "$";
  const converted = convertAmount(amountInUSD);
  // 印度/巴基斯坦使用印度记数法
  if (currency === "INR" || currency === "PKR")
    return `${symbol}${converted.toLocaleString("en-IN")}`;
  return `${symbol}${converted.toLocaleString()}`;
}
```

### 9.5 图表 Y 轴格式化

```javascript
≥ 1,000,000 → "{symbol}{n/1M}M"
≥ 1,000     → "{symbol}{n/1K}K"
< 1,000     → "{symbol}{n}"
```

---

## 10. 前端派生指标

以下指标 **不存储在 cities.json** 中，由浏览器在运行时基于用户的职业/消费档位选择实时计算。

### 10.1 收入 (income)

```javascript
if (selectedProfession && city.professions[profession])
  income = city.professions[profession]
else
  income = city.averageIncome
```

### 10.2 月成本 (tierCost)

```javascript
if (costTier === "moderate") tierCost = city.costModerate
if (costTier === "budget")   tierCost = city.costBudget
```

### 10.3 年储蓄 (savings)

```javascript
savings = income - tierCost × 12
```

### 10.4 储蓄率 (savingsRate)

```javascript
savingsRate = income > 0 ? (savings / income) × 100 : 0  // 百分比
```

### 10.5 平均时薪 (hourlyWage)

```javascript
hourlyWage = annualWorkHours > 0 ? income / annualWorkHours : 0
```

### 10.6 购房年限 (yearsToHome)

```javascript
yearsToHome = savings > 0 && housePrice !== null
  ? (housePrice × 70) / savings    // 70m² 标准住宅
  : Infinity
```
- 储蓄 ≤ 0 → `Infinity`（永远买不起）
- 前端显示: `Infinity` → "N/A"

### 10.7 购买力 PPP (ppp)

```javascript
annualCost = tierCost × 12
ppp = income / annualCost  // 倍数
```
作为排行榜 Tab 使用。

### 10.8 巨无霸购买力 (bigMacPower)

```javascript
bigMacPower = (hourlyWage / bigMacPrice).toFixed(1)
// 含义: 一小时收入能买几个巨无霸
```

### 10.9 巨无霸指数 (bigMacRatio)

```javascript
allBigMacPrices = 有麦当劳城市的 bigMacPrice 数组
median = 中位数(allBigMacPrices)
bigMacRatio = city.bigMacPrice / median
```
相对全球中位数的比值。

### 10.10 决策矩阵综合评分 (composite)

位于 `KeyInsights.tsx`，多城对比辅助评分:

```javascript
composite = sv × 0.35 + af × 0.30 + aq × 0.20 + doc × 0.15

其中:
  sv  = savings / max(allSavings)           // 储蓄得分
  af  = 1 - (yearsToHome / max(allYears))   // 购房年限反向得分
  aq  = 1 - (AQI / max(allAQIs))            // 空气质量反向得分
  doc = doctors / max(allDoctors)            // 医疗得分
```
范围 0–100，越高越好。用于「综合推荐」洞察卡。

### 10.11 相似城市 (similarIds)

在 SSG 构建时计算（`app/city/[slug]/page.tsx`），运行时不再计算。

**11 维归一化欧氏距离**:
```
dimensions = [
  averageIncome, costModerate, savings, annualWorkHours, hourlyWage,
  housePrice, airQuality, safetyIndex, doctorsPerThousand,
  directFlightCities, bigMacPrice
]

对每个维度: 全局 min-max 归一化到 [0, 1]
距离 = √(Σ(norm_a[i] - norm_b[i])²) for i=0..10
```
取距离最近的 6 座城市。

---

## 11. 排名与颜色系统

### 11.1 城市详情页 — 百分位排名

**排名计算**:
```javascript
// 越高越好的指标:
rankHigher(values, val) {
  sorted = [...values].sort((a, b) => b - a)  // 降序
  return sorted.findIndex(v => v <= val) + 1   // 1-based
}

// 越低越好的指标:
rankLower(values, val) {
  sorted = [...values].sort((a, b) => a - b)  // 升序
  return sorted.findIndex(v => v >= val) + 1
}
```

**好/中/差 三档卡片边框** (百分位制):
```javascript
percentile = sorted.findIndex(v >= val) / sorted.length

// 越高越好的指标 (tierHigh):
percentile >= 0.75 → "good" (翠绿边框)
percentile <= 0.25 → "bad"  (玫瑰色边框)
else               → "mid"  (默认边框)

// 越低越好的指标 (tierLow):
percentile <= 0.25 → "good"
percentile >= 0.75 → "bad"
else               → "mid"
```

**各指标排名方向**:

| 指标 | 排名方式 | 好 = |
|------|---------|------|
| 年收入 | rankHigher | 排名靠前 |
| 月成本 | rankLower | 排名靠前（便宜） |
| 年储蓄 | rankHigher | 排名靠前 |
| 房价 | rankLower | 便宜 |
| 购房年限 | rankLower | 短 |
| 月租金 | rankLower | 便宜 |
| 年工时 | rankLower | 少 |
| 时薪 | rankHigher | 高 |
| 带薪年假 | rankHigher | 多 |
| AQI | rankLower | 空气好 |
| 宽带速度 | rankHigher | 快 |
| 直飞城市 | rankHigher | 多 |
| 安全指数 | rankHigher | 安全 |
| 生活压力 | rankHigher | 轻松 |
| 医疗指数 | rankHigher | 好 |
| 自由指数 | rankHigher | 自由 |

### 11.2 排行榜 — 固定阈值颜色

| Tab | 好(emerald) | 中(amber) | 差(red) |
|-----|-----------|---------|-------|
| 储蓄 | savings > 0 | — | savings < 0 |
| PPP | ppp ≥ 1.5x | ppp ≥ 1.0x | ppp < 1.0x |
| 购房 | ≤ 15 年 | > 15 年(有限) | ∞ |
| 租金 | ≤ $500 | ≤ $1,500 | > $1,500 |
| 空气 | AQI ≤ 50 | AQI ≤ 100 | AQI > 100 |
| 直飞 | ≥ 150 城 | ≥ 50 城 | < 50 城 |
| 安全 | ≥ 70 | ≥ 40 | < 40 |
| 工时 | ≤ 1,600h | ≤ 1,900h | > 1,900h |
| 年假 | ≥ 20 天 | ≥ 10 天 | < 10 天 |
| 网速 | ≥ 150 Mbps | ≥ 50 Mbps | < 50 Mbps |
| 生活压力 | ≥ 65 | ≥ 35 | < 35 |
| 医疗 | ≥ 65 | ≥ 35 | < 35 |
| 自由 | ≥ 65 | ≥ 35 | < 35 |

### 11.3 对比页 — 胜负判定

```javascript
cmp(a, b, lowerIsBetter = false) {
  if (a === b) return "tie"
  return lowerIsBetter
    ? (a < b ? "A" : "B")
    : (a > b ? "A" : "B")
}
```

| # | 对比指标 | 胜出 = |
|---|---------|--------|
| 1 | 年收入 | 高 |
| 2 | 月消费 | 低 |
| 3 | 年储蓄 | 高 |
| 4 | 房价/m² | 低 |
| 5 | 购房年限 | 低(短) |
| 6 | AQI | 低(好) |
| 7 | 医师密度 | 高 |
| 8 | 巨无霸价格 | 低 |
| 9-11 | 气候 | 平手 |
| 12 | 年工时 | 低(少) |
| 13 | 直飞城市 | 高 |
| 14 | 安全指数 | 高 |

---

## 12. 空值与特殊情况

### 12.1 可 null 字段一览

| 字段 | null 城市数 | 具体城市 | 前端处理 |
|------|-----------|---------|---------|
| `bigMacPrice` | 8 | 德黑兰/哈瓦那/金边/仰光/万象/达卡/加德满都/乌兰巴托 | "无麦当劳" |
| `numbeoSafetyIndex` | 4 | 哈瓦那/蒙特哥湾/仰光/万象 | 安全子权重重分配 |
| `gallupLawOrder` | 1 | 哈瓦那 | 安全子权重重分配 |

> 其他所有字段 (housePrice, airQuality, doctorsPerThousand, directFlightCities, annualWorkHours, monthlyRent, paidLeaveDays, internetSpeedMbps, 全部医疗/自由子指标) 在 120 城中均无 null。

### 12.2 前端 null 处理规则

| 场景 | 处理 |
|------|------|
| 值为 null | 显示 "—" |
| 排名涉及 null | 从排名池中排除 |
| 复合指数子指标 null | 权重重分配给有数据的子指标 |
| `yearsToHome = Infinity` | 显示 "N/A"，排行榜排至末尾 |
| 对比页某指标一方 null | 该行不判定胜负 |

### 12.3 特殊标记

| 类型 | 字段 | 影响 |
|------|------|------|
| `aqiSource = "iqair"` | 8 座中国城市 | 前端可显示来源标识 |
| `safetyWarning` | 3 座城市 | 前端显示特殊警告 |
| `safetyConfidence = "low"` | 4 座城市 | 前端数值旁带 ⚠ 标记 |

---

## 13. 脚本依赖关系与执行顺序

### 13.1 完整流水线

```
第 1 阶段 — 基础数据创建 (互不依赖):
  ├─ update_salaries.py        → professions + averageIncome
  ├─ update_cost_tiers.py      → costModerate + costBudget
  ├─ add_aqi.py                → airQuality + aqiSource
  ├─ add_doctors_data.py       → doctorsPerThousand
  ├─ add-flights.mjs           → directFlightCities
  ├─ add-workhours.mjs         → annualWorkHours
  └─ fix_continents.js         → continent

第 2 阶段 — v2 字段 (依赖第 1 阶段):
  └─ add-new-fields.mjs        → monthlyRent, paidLeaveDays, internetSpeedMbps,
                                  hospitalBedsPerThousand, uhcCoverageIndex,
                                  lifeExpectancy, pressFreedomScore,
                                  democracyIndex, corruptionPerceptionIndex

第 3 阶段 — 复合指数 (依赖第 1+2 阶段):
  ├─ add-safety-v2.mjs         → safetyIndex + 4 子指标 (读 data/sources/)
  ├─ add-healthcare-index.mjs  → healthcareIndex (读 doctors, beds, uhc, lifeexp)
  └─ add-freedom-index.mjs     → freedomIndex (读 press, democracy, cpi)

第 4 阶段 — 修补脚本:
  └─ fix-asian-data.mjs        → 8 城 AQI 修正 + 20 城 costBudget 修正

附属脚本 (不修改 cities.json):
  ├─ add-climate-detail.mjs    → 修改 lib/constants.ts (CITY_CLIMATE)
  └─ translate-intros.mjs      → 生成 lib/cityIntros.ts
```

### 13.2 脚本清单

| 脚本 | 语言 | 读取 | 写入 | 说明 |
|------|------|------|------|------|
| `update_salaries.py` | Python | — | cities.json `.professions` | 120 城 × 20 职业薪资 |
| `update_cost_tiers.py` | Python | — | cities.json `.costModerate/.costBudget` | 生活成本二档 |
| `add_aqi.py` | Python | — | cities.json `.airQuality` | EPA AQI |
| `add_doctors_data.py` | Python | — | cities.json `.doctorsPerThousand` | 医师密度 |
| `add-flights.mjs` | Node | — | cities.json `.directFlightCities` | 直飞城市 |
| `add-workhours.mjs` | Node | — | cities.json `.annualWorkHours` | 年工时 |
| `add-new-fields.mjs` | Node | — | cities.json (9 字段) | v2 新字段 |
| `add-safety-v2.mjs` | Node | data/sources/*.json | cities.json (7 安全字段) | 安全指数 |
| `add-healthcare-index.mjs` | Node | cities.json 子字段 | cities.json `.healthcareIndex` | 医疗指数 |
| `add-freedom-index.mjs` | Node | cities.json 子字段 | cities.json `.freedomIndex` | 自由指数 |
| `fix-asian-data.mjs` | Node | — | cities.json (AQI+cost修正) | 亚洲城市数据修正 |
| `add-climate-detail.mjs` | Node | — | lib/constants.ts | 气候详情 |
| `translate-intros.mjs` | Node | lib/cityIntros.ts | lib/cityIntros.ts | 翻译城市简介 |
| `add_20_asian_cities.py` | Python | — | cities.json (添加 ID 101-120) | 批量加城市 (历史) |
| `check_data.js` | Node | cities.json | stdout | 完整性校验 |
| `deep_data_check.js` | Node | cities.json | stdout | 深度校验 |

---

## 14. 新增操作指南

### 14.1 新增一座城市

**步骤**:

1. **分配 ID**: 在 cities.json 中取 `max(id) + 1` = 121
2. **填写基础字段**:
   - `name`（中文）、`country`、`continent`、`currency`、`description`
   - `averageIncome`: 查 Numbeo/SalaryExpert 该城市中位收入
   - `costModerate`: 查 Numbeo Cost of Living 单人月开支
   - `costBudget`: 查 Numbeo 预算模式开支，计算比例 (预期 0.37–0.48)
   - `bigMacPrice`: 查 The Economist Big Mac Index；无麦当劳 → `null`
   - `housePrice`: 查 Global Property Guide / Numbeo Property (市中心 USD/m²)
   - `monthlyRent`: 查 Numbeo Rent (市中心 1 居室)
   - `airQuality`: 查 IQAir / EPA (US EPA AQI 标准)；设 `aqiSource`
   - `doctorsPerThousand`: 查 WHO / World Bank；城市级调整
   - `directFlightCities`: 查 FlightConnections / OAG (都市圈所有机场)
   - `annualWorkHours`: 查 OECD/ILO 国家级数据
   - `paidLeaveDays`: 查国家劳动法
   - `internetSpeedMbps`: 查 Ookla Speedtest Global Index
3. **填写 20 个职业薪资**: 在 `update_salaries.py` 中添加该城市的 20 条薪资，**逐个查询**
4. **填写医疗子指标**:
   - `hospitalBedsPerThousand`: World Bank
   - `uhcCoverageIndex`: WHO
   - `lifeExpectancy`: World Bank
5. **填写自由度子指标** (国家级):
   - `pressFreedomScore`: RSF
   - `democracyIndex`: EIU
   - `corruptionPerceptionIndex`: TI CPI
6. **运行复合指数脚本**:
   ```bash
   node scripts/add-safety-v2.mjs      # 需在 data/sources/ 中有该国数据
   node scripts/add-healthcare-index.mjs
   node scripts/add-freedom-index.mjs
   ```
7. **添加气候数据**: 在 `lib/constants.ts` → `CITY_CLIMATE` 中添加 7 字段
8. **添加国旗 emoji**: 在 `lib/constants.ts` → `CITY_FLAG_EMOJIS` 中添加
9. **添加 slug**: 在 `lib/citySlug.ts` → `CITY_SLUGS` 中添加
10. **添加翻译**:
    - `lib/i18n.ts` → `CITY_NAME_TRANSLATIONS` 中添加 4 语言城市名
    - `lib/i18n.ts` → `COUNTRY_TRANSLATIONS` 中添加 4 语言国家名（如为新国家）
    - `lib/cityIntros.ts` → 添加中文描述后运行 `translate-intros.mjs`
11. **添加到分区**: `lib/constants.ts` → `REGIONS` 中添加到合适分区
12. **（可选）添加热门对比对**: `lib/citySlug.ts` → `POPULAR_PAIRS`
13. **验证数据**: `node scripts/check_data.js`
14. **构建验证**: `npx tsc --noEmit && npm run build`

---

### 14.2 新增一个职业

**步骤**:

1. 在 `public/data/professions.json` 中添加职业元数据 (id, name, nameZH)
2. 在 `lib/i18n.ts` TRANSLATIONS 的 4 个 locale 中添加对应翻译 key
3. 在 `update_salaries.py` 中为 **120 座城市** 各添加该职业的年薪数据
4. 运行 `python scripts/update_salaries.py` 写入 cities.json
5. 验证: `node scripts/check_data.js`（检查列表长度一致性）

> **警告**: 添加职业会影响职业下拉菜单、professions.json 结构、以及所有涉及职业迭代的前端逻辑。确保所有 120 城都有该职业的数据。

---

### 14.3 新增一个数据字段

**步骤**:

1. **定义类型**: 在 `lib/types.ts` → `City` 接口中添加字段（注明是否 nullable）
2. **准备数据**: 编写数据采集脚本，填入 cities.json
3. **前端消费** (按需):
   - 城市详情页: `CityDetailContent.tsx` 添加卡片
   - 排行榜: `RankingContent.tsx` 添加 Tab 页
   - 对比页: `CompareContent.tsx` 添加对比行
4. **翻译**: 在 `lib/i18n.ts` 4 个 locale 中添加 label key
5. **（如需复合指数）**: 添加计算脚本、设定权重、定义置信度阈值
6. **（如影响相似度）**: 在 `app/city/[slug]/page.tsx` → `computeSimilarIds` 向量中添加维度
7. **更新文档**: 更新本文档对应章节

---

### 14.4 更新安全指数源数据

1. 替换 `data/sources/` 下相应 JSON 文件（保持格式一致: `{ "countries": { "中文国名": value } }`）
2. 运行 `node scripts/add-safety-v2.mjs`
3. 验证: 检查 safetyConfidence 分布、极端值

---

### 14.5 更新汇率

直接编辑 `public/data/exchange-rates.json`：
- `rates`: 货币代码 → 对 USD 汇率
- `symbols`: 货币代码 → 显示符号
- 新货币需在 `lib/constants.ts` → `POPULAR_CURRENCIES` 中添加（如需在首选列表显示）

---

## 15. 已知局限与注意事项

| # | 局限 | 影响 |
|---|------|------|
| 1 | **收入为参考值** | 文件中的 USD 年薪经跨源综合调整，不应直接与官方统计局数据比较 |
| 2 | **国家级字段** | paidLeaveDays、annualWorkHours、hospitalBeds、uhcCoverage、lifeExpectancy、pressFreedom、democracy、CPI 均为国家级 → 同国城市共享 |
| 3 | **美国带薪年假 = 0** | 联邦法律无规定，但实际雇主多提供 10-15 天 |
| 4 | **汇率静态** | 不自动更新，大幅汇率变动后需手动刷新 |
| 5 | **生活压力受偏好影响** | 因依赖用户选择的职业和消费层级，同一城市在不同用户间值不同 |
| 6 | **气候硬编码** | 130+ 行 TypeScript 对象，更新不方便 |
| 7 | **8 城无麦当劳** | 这些城市的巨无霸模式、生活压力指数巨无霸子项为空 |
| 8 | **3 城安全警告** | 基辅/加拉加斯/哈瓦那有特殊情况标记 |
| 9 | **城市描述为 AI 生成** | 可能包含不准确内容 |
| 10 | **数据时效 2024–2025** | 经济波动可能导致数据过时 |

---

## 16. 数据修正记录

| 日期 | 内容 |
|------|------|
| 2026-03-28 | v3: 数据来源文档重写为完整参考手册 |
| 2026-03 | v2: 城市详情页 4 行分组布局，排行榜扩展至 13 Tab |
| 2026-03 | 8 座中国城市 AQI 从 AQICN→IQAir PM2.5 年均转换 (`fix-asian-data.mjs`) |
| 2026-03 | 20 座新增亚洲城市 costBudget 从统一 ×0.45→独立校准 0.37–0.44 (`fix-asian-data.mjs`) |
| 2026-03 | v2: 安全指数 v2 重构 — 4 子指标 (Numbeo 35%/UNODC 30%/GPI 20%/Gallup 15%) |
| 2026-03 | v2: 新增 3 个预计算复合指数 (医疗保障、制度自由度) |
| 2026-03 | v2: 新增 9 个基础字段 (租金、年假、网速、病床、UHC、寿命、新闻自由、民主、清廉) |
| 2026-03 | v2: 新增运行时复合指标 (生活压力指数) |
| 2025-06 | 20 座新城市职业薪资从等比缩放→逐城市逐职业独立查询 |
| 2025-06 | 修正 5 座中国新城市 AQI (AQICN raw × 1.4 → US EPA) |
| 2025-06 | 修正 9 座城市巨无霸价格 |
| 2025-03 | 批量添加 20 座亚洲城市 (ID 101-120) |
| 2025-01 | 初始 100 座城市数据集建立 |

---

## 附录 A: 参考 URL 汇总

| 来源 | URL |
|------|-----|
| Numbeo Cost of Living | https://www.numbeo.com/cost-of-living/ |
| Numbeo Crime/Safety | https://www.numbeo.com/crime/rankings.jsp |
| Big Mac Index | https://github.com/TheEconomist/big-mac-data |
| Global Property Guide | https://www.globalpropertyguide.com/ |
| IQAir World Air Quality | https://www.iqair.com/world-air-quality-report |
| US EPA AirNow | https://www.airnow.gov/ |
| WHO Global Health Observatory | https://www.who.int/data/gho |
| World Bank Open Data | https://data.worldbank.org/ |
| OECD Employment Outlook | https://www.oecd.org/employment/outlook/ |
| ILO ILOSTAT | https://ilostat.ilo.org/ |
| UNODC Homicide Statistics | https://dataunodc.un.org/dp-intentional-homicide-victims |
| Vision of Humanity (GPI) | https://www.visionofhumanity.org/maps/ |
| Gallup Law & Order | https://www.gallup.com/analytics/268868/gallup-global-law-order-report.aspx |
| RSF Press Freedom | https://rsf.org/en/index |
| EIU Democracy Index | https://www.eiu.com/n/campaigns/democracy-index/ |
| Transparency International CPI | https://www.transparency.org/en/cpi |
| Ookla Speedtest | https://www.speedtest.net/global-index |
| OAG Aviation Analytics | https://www.oag.com/ |
| FlightConnections | https://www.flightconnections.com/ |
| Expatistan | https://www.expatistan.com/cost-of-living |
| ERI/SalaryExpert | https://www.salaryexpert.com/ |
| BLS OEWS | https://www.bls.gov/oes/ |
| Eurostat | https://ec.europa.eu/eurostat |
| WMO Climate Normals | https://climexp.knmi.nl/start.cgi |

---

*如需改进数据，请通过 [GitHub Issues](https://github.com/qing4132/citycompare/issues) 提交修正建议，附上城市名、字段、修正值与来源链接。*
