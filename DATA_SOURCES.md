# 数据来源与方法论 — Data Sources & Methodology

## 概述

本项目城市数据为 **AI 辅助估算值**，基于多种公开数据源交叉参考而成，**不保证准确性**。
以下文档记录了每项数据的来源途径、获取方式与估算方法，供贡献者和用户参考。

---

## 数据字段来源

### 原始数据字段

| 字段 | 来源 | 粒度 | 获取方式 |
|------|------|------|----------|
| `averageIncome` | ERI / SalaryExpert、BLS、PayScale、OECD | 城市级 | 综合估算各城市中等收入水平（USD） |
| `professions{}` | 同上 + Robert Half、Hays、智联招聘、JobStreet | 城市级 | 按职业查询各城市年薪中位数 |
| `costOfLiving` / `costModerate` | Numbeo、Expatistan、各国统计局 | 城市级 | 单人月生活开支（适度水平，USD） |
| `costBudget` | 基于 `costModerate` 按城市级比例计算 | 城市级 | 原100城: Numbeo 独立研究; 新20城: fix-asian-data.mjs 独立校准 |
| `bigMacPrice` | The Economist Big Mac Index (2025-01) | 国家级 | 各国麦当劳巨无霸单品售价（USD） |
| `housePrice` | Global Property Guide、各地房产指数 | 城市级 | 城市中心区域每平米均价（USD/m²） |
| `monthlyRent` | Numbeo Rent Index 2024-2025 | 城市级 | 1 居室市中心月租金（USD） |
| `airQuality` (AQI) | IQAir 2024 年度报告 (8城) / US EPA (112城) | 城市级 | US EPA AQI 标准值，aqiSource 字段标识来源 |
| `doctorsPerThousand` | WHO 全球卫生人力统计 / World Bank (CC BY-4.0) | 城市级 | 每千人执业医师数 |
| `directFlightCities` | OAG Aviation Analytics、FlightConnections.com (2025) | 城市级 | 直飞航线目的地城市数 |
| `annualWorkHours` | OECD Employment Outlook 2024、ILO ILOSTAT | 国家级 | 国家全行业平均年工时 |
| `paidLeaveDays` | OECD / 各国劳动法 | 国家级 | 法定最低带薪年假天数 |
| `internetSpeedMbps` | Ookla Speedtest Global Index 2025 | 城市级 | 固定宽带下载速度（Mbps） |
| `description` | AI 生成 | — | 城市简介文本 |

### 安全指数子数据

| 字段 | 来源 | 粒度 | 获取方式 |
|------|------|------|----------|
| `safetyNightSafety` | Numbeo Safety Index 2024-2025 | 城市级 | 直接使用 0-100 评分 |
| `safetyViolentCrimeInv` | UNODC 杀人率数据 | 国家级 | 反向计分（犯罪率越低分越高） |
| `safetyPropertyCrimeInv` | Numbeo Crime Index 2024-2025 | 城市级 | 反向计分 |
| `safetyForeignerFriendly` | InterNations Expat Insider 2024 + Gallup 2023 | 国家级 | 综合评分 |

### 医疗保障指数子数据（v2 新增）

| 字段 | 来源 | 粒度 | 获取方式 |
|------|------|------|----------|
| `hospitalBedsPerThousand` | World Bank (SH.MED.BEDS.ZS) | 国家级 | API / CSV 下载 |
| `uhcCoverageIndex` | WHO Global Health Observatory | 国家级 | WHO UHC Service Coverage Index (0-100) |
| `lifeExpectancy` | World Bank (SP.DYN.LE00.IN) | 国家级 | 出生时预期寿命（年） |

### 制度自由度指数子数据（v2 新增）

| 字段 | 来源 | 粒度 | 获取方式 |
|------|------|------|----------|
| `pressFreedomScore` | RSF World Press Freedom Index 2024 | 国家级 | 年度报告 (0-100, 越高越自由) |
| `democracyIndex` | EIU Democracy Index 2024 | 国家级 | 年度报告 (0-10) |
| `corruptionPerceptionIndex` | Transparency International CPI 2024 | 国家级 | 官网 CSV (0-100, 越高越廉洁) |

---

## 复合指标计算方法

### 体感安全指数 (Safety Index)

已有指标，计算方式见 `scripts/add-safety.mjs`：

```
safetyIndex = 夜间安全感(Numbeo) × 0.40
            + 暴力犯罪反向分(UNODC) × 0.30
            + 财产犯罪反向分(Numbeo Crime) × 0.20
            + 外国人友好度(InterNations/Gallup) × 0.10
```

v2 起，4 项子指标（`safetyNightSafety`, `safetyViolentCrimeInv`, `safetyPropertyCrimeInv`, `safetyForeignerFriendly`）已直接存入 `cities.json`，可在城市详情页安全指数卡片中展开查看。

### 生活压力指数 (Life Pressure Index) — v2 新增

```
lifePressure = 储蓄率(norm) × 0.30
             + 巨无霸购买力(norm) × 0.25
             + 年工时(inv_norm) × 0.25
             + 购房年限(inv_norm) × 0.20
```

- 全部子指标 min-max 归一化到 [0, 100]
- 反向指标取 100 − normalized
- 范围 0-100, 越高越轻松
- 无麦当劳城市：权重重分配至剩余 3 项 (40/33/27)
- 受用户职业和生活水平选择影响

### 医疗保障指数 (Healthcare Security Index) — v2 新增

```
healthcareIdx = 每千人医师(norm) × 0.35
              + 每千人病床(norm) × 0.25
              + UHC覆盖率(norm) × 0.25
              + 预期寿命(norm) × 0.15
```

- 各子指标 min-max 归一化到 [0, 100]
- 范围 0-100, 越高越好

### 制度自由度指数 (Institutional Freedom Index) — v2 新增

```
freedomIdx = 新闻自由度 × 0.35
           + 民主指数 × 10 × 0.35
           + 清廉感知指数 × 0.30
```

- 各子项已在 0-100 量程（民主指数原始 0-10, ×10）
- 直接加权求和
- 范围 0-100, 越高越自由

---

## 巨无霸价格说明

- **数据来源**: The Economist Big Mac Index (https://github.com/TheEconomist/big-mac-data)
- 同一国家内各城市巨无霸价格基本一致（麦当劳全国统一定价策略）
- 部分城市所在国家无麦当劳（古巴、伊朗、柬埔寨、缅甸、老挝、孟加拉国、尼泊尔、蒙古），其 `bigMacPrice` 字段为 **`null`**
  - 前端显示「无麦当劳」标签（i18n key: `noMcDonalds`）
  - 巨无霸模式下，这些城市的收入/支出/储蓄/房价等转换值均显示「无麦当劳」
  - 对比页面中 `bigMacPrice` 为 null 的城市不参与该指标的胜负判定
- 参考数据时间点: 2025 年 1 月

---

## AQI 数据来源说明

### 当前数据源分布

| aqiSource | 城市数 | 说明 |
|-----------|--------|------|
| `EPA` | 112 | 直接采用 US EPA AQI 标准值 |
| `iqair` | 8 | IQAir 2024 年度均值（US EPA AQI 制） |

### IQAir 来源城市（8 座中国/港澳城市）

| 城市 | ID | AQI | PM2.5 年均 (µg/m³) |
|------|-----|-----|--------------------|
| 北京 | 4 | 89 | ~30.5 |
| 上海 | 5 | 77 | ~25.0 |
| 香港 | 10 | 55 | ~14.5 |
| 广州 | 101 | 78 | ~25.5 |
| 深圳 | 102 | 66 | ~19.5 |
| 成都 | 103 | 94 | ~33.0 |
| 杭州 | 104 | 84 | ~28.5 |
| 重庆 | 105 | 87 | ~29.5 |

转换公式（PM2.5 → US EPA AQI）：
- PM2.5 12.1–35.4 µg/m³ → AQI = 50 + 2.10 × (PM2.5 − 12.1)
- PM2.5 35.5–55.4 µg/m³ → AQI = 101 + 2.46 × (PM2.5 − 35.5)

### 历史：AQICN ×1.4 转换（已废弃）

早期版本曾使用 AQICN (HJ 633-2012) 原始数据乘以 1.4 近似转换为 US EPA AQI。
该方法已被替换为 IQAir 年度 PM2.5 均值直接转换，精度更高。

---

## 20 座新增亚洲城市（ID 101–120）的数据方法

这批城市由 `add_20_asian_cities.py` 脚本生成，方法如下:

### 收入与生活成本
- `averageIncome`、`costModerate`、`bigMacPrice`、`housePrice`、`doctorsPerThousand`
  均为手动查询公开数据后填入的估算值
- 参考了 Numbeo、Expatistan、World Bank 等来源

### 职业薪资
- 全部 120 座城市的 20 个职业薪资均为独立查询真实数据
- 数据来源: ERI/SalaryExpert、智联招聘/猎聘/看准(中国)、doda(日本)、KOSIS/JobKorea(韩国)、
  JobStreet/JobsDB(东南亚)、HeadHunter.kz(哈萨克斯坦)、Boss.az(阿塞拜疆)等
- 管理脚本: `update_salaries.py`（包含全部 120 城 × 20 职业的数据与来源注释）

### costBudget（节俭生活成本）
- 20 座新增亚洲城市的 costBudget 现采用独立校准的比例系数（0.37–0.44），
  基于 Numbeo 单人预算生活成本数据和同类城市参照
- 原 100 座城市的比例系数范围为 0.38–0.48，按城市经济水平分化
- 管理脚本: `scripts/fix-asian-data.mjs`

### 空气质量 (AQI)
- 8 座中国/港澳城市的 AQI 现采用 IQAir 2024 年度 PM2.5 均值转换为 US EPA AQI
- 其余 112 城直接采用 US EPA 标准值
- `aqiSource` 字段标识每座城市的数据来源（`iqair` 或 `EPA`）
- 管理脚本: `scripts/fix-asian-data.mjs`

### ⚠️ 数据规则（强制）

> **禁止等比例缩放**: 新增城市或职业时，**必须逐个查询真实薪资数据**，不得使用任何
> 参考城市的统一系数（如 `prof_scale`）来批量生成。每个职业在每个城市的薪资应独立
> 来源于薪资调查平台或官方统计数据。

---

## 已知局限与注意事项

1. **收入数据非真实美元汇率换算** — 数据集使用的是经调整的参考值，主要用于城市间横向对比，
   不应与各国官方统计局发布的平均薪资直接比较
2. **部分城市无麦当劳** — 古巴(哈瓦那)、伊朗(德黑兰)、柬埔寨(金边)、缅甸(仰光)、老挝(万象)、孟加拉国(达卡)、尼泊尔(加德满都)、蒙古(乌兰巴托)
   的 `bigMacPrice` 为 `null`，不做估算；前端以「无麦当劳」标签替代数值展示
3. **数据时效性** — 基准数据来自 2024–2025 年，经济波动与汇率变化可能导致数据过时
4. **v2 国家级数据** — paidLeaveDays, hospitalBedsPerThousand, uhcCoverageIndex, lifeExpectancy, pressFreedomScore, democracyIndex, corruptionPerceptionIndex 均为国家级数据，同国城市共享同一数值
5. **带薪年假仅为法定最低** — 美国联邦法定为 0 天，但大多数雇主实际提供 10-15 天

---

## 数据修正记录

| 日期 | 内容 |
|------|------|
| 2026-03 | v2: 新增 9 个数据字段 (monthlyRent, paidLeaveDays, internetSpeedMbps, hospitalBedsPerThousand, uhcCoverageIndex, lifeExpectancy, pressFreedomScore, democracyIndex, corruptionPerceptionIndex) |
| 2026-03 | v2: 安全指数 4 项子指标 (safetyNightSafety, safetyViolentCrimeInv, safetyPropertyCrimeInv, safetyForeignerFriendly) 存入 cities.json，安全卡片支持展开查看 |
| 2026-03 | v2: 新增 3 个复合指标 (生活压力、医疗保障、制度自由度)，计算逻辑位于 lib/clientUtils.ts |
| 2026-03 | v2: 城市详情页从 12 平铺卡片重构为 4 行分组布局 (2中+2中+4小+1大) |
| 2026-03 | v2: 排行榜从 7 个 Tab 扩展为 13 个 Tab |
| 2025-06 | 修正 5 座中国新城市 AQI（AQICN raw × 1.4 → US EPA） |
| 2025-06 | 修正 9 座城市巨无霸价格（与现有数据集内部一致性对齐） |
| 2025-06 | 修正 add_aqi.py / add_20_asian_cities.py 中 AQICN 转换系数注释 |
| 2025-06 | 20 座新城市职业薪资从等比例缩放替换为逐城市逐职业真实查询数据（update_salaries.py） |
| 2026-03 | 8 座中国/港澳城市 AQI 从 AQICN ×1.4 转换替换为 IQAir 2024 年度 PM2.5 均值（fix-asian-data.mjs） |
| 2026-03 | 20 座新增亚洲城市 costBudget 从统一 ×0.45 替换为独立校准比例（0.37–0.44）（fix-asian-data.mjs） |

---

## 如何改进数据

欢迎通过 [GitHub Issues](https://github.com/qing4132/citycompare/issues) 提交数据修正建议，请附上:
- 城市名称与字段
- 修正后的数值
- 数据来源链接
