# 新增指标数据源与权重说明

## 数据采集日期：2025-04-12

---

## 一、新增 6 项指标

### Safety 安全（新增 1 项，共 5 项）

| 指标 | 字段名 | 来源 | 年份 | 量纲 | 覆盖率 |
|------|--------|------|------|------|--------|
| Numbeo Safety Index | numbeoSafetyIndex | Numbeo | 2025 | 0-100 | 147/148 |
| 凶杀率 (UNODC) 反转 | homicideRateInv | UNODC | 2023 | 0-100 | 146/148 |
| GPI 全球和平指数 反转 | gpiScoreInv | IEP | 2025 | 0-100 | 146/148 |
| Gallup 治安指数 | gallupLawOrder | Gallup | 2024 | 0-100 | 148/148 |
| **WPS 和平安全指数** ⭐ | wpsIndex | Georgetown GIWPS | 2025/26 | 0-1 | 147/148 |

### Healthcare 医疗（新增 1 项，共 5 项）

| 指标 | 字段名 | 来源 | 年份 | 量纲 | 覆盖率 |
|------|--------|------|------|------|--------|
| 每千人医师 | doctorsPerThousand | WHO/WB | 2022 | 人/千人 | 148/148 |
| 每千人病床 | hospitalBedsPerThousand | WHO/WB | 2022 | 床/千人 | 148/148 |
| UHC 覆盖率 | uhcCoverageIndex | WHO | 2021 | 0-100 | 148/148 |
| 预期寿命 | lifeExpectancy | WB | 2022 | 年 | 148/148 |
| **自付医疗比例** ⭐ | outOfPocketPct | World Bank API (SH.XPD.OOPC.CH.ZS) | 2021 | % | 145/148 |

### Governance 社会治理（全新 5 项，替代旧 freedomIndex）

| 指标 | 字段名 | 来源 | 年份 | 量纲 | 覆盖率 |
|------|--------|------|------|------|--------|
| **清廉指数 CPI** | corruptionPerceptionIndex | Transparency International | 2024 | 0-100 | 148/148 |
| **政府效能 WGI** ⭐ | govEffectiveness | World Bank WGI (Excel) | 2024 | 0-100 | 147/148 |
| **法治指数 WJP** ⭐ | wjpRuleLaw | WJP Rule of Law Index (CSV) | 2025 | 0-1 | 139/148 |
| **网络自由 FOTN** ⭐ | internetFreedomScore | Freedom House | 2024 | 0-100 | 112/148 |
| **移民融合 MIPEX** ⭐ | mipexScore | MIPEX | 2019 | 0-100 | 109/148 |

> ⭐ = 本次新采集。旧 freedomIndex 使用 pressFreedomScore + democracyIndex + CPI 三项，
> 新 governanceIndex 使用 CPI + WGI GE + WJP + FOTN + MIPEX 五项，更全面反映"社会治理"水准。

---

## 二、数据来源详细链接

1. **WPS Index** — https://giwps.georgetown.edu/the-index/  
   下载 Excel: https://giwps.georgetown.edu/wp-content/uploads/2025/10/WPS-Index-2025-Data.xlsx

2. **Out-of-Pocket Health %** — World Bank Open Data  
   API: `https://api.worldbank.org/v2/country/all/indicator/SH.XPD.OOPC.CH.ZS?date=2019:2023&format=json&per_page=500`

3. **WJP Rule of Law Index** — https://worldjusticeproject.org/rule-of-law-index/global/2025  
   CSV: `https://worldjusticeproject.org/rule-of-law-index/data/2025.csv`

4. **Freedom on the Net** — https://freedomhouse.org/countries/freedom-net/scores

5. **MIPEX** — https://www.mipex.eu/play/

6. **WGI Government Effectiveness** — https://www.worldbank.org/en/publication/worldwide-governance-indicators  
   Excel: `https://www.worldbank.org/content/dam/sites/govindicators/doc/wgidataset_with_sourcedata-2025.xlsx`  
   Sheet: `ge`, Column: `Governance score (0-100)`, Year: 2024

---

## 三、复合指数权重方案

### Safety 安全指数（5 项 → 0-100）

| 子指标 | 权重 | 理由 |
|--------|------|------|
| Numbeo Safety | 30% | 基于城市级别用户感知，直接关联移居体验 |
| Homicide Rate (inv) | 25% | 客观犯罪数据，最硬性安全指标 |
| GPI (inv) | 20% | 国家级冲突/军事化风险 |
| Gallup Law & Order | 15% | 居民对执法机构信任度 |
| WPS Index | 10% | 女性和平安全，作为社会包容性代理指标 |

> WPS 给 10% 而非更高：因为它与其他安全指标有一定重叠（GPI、Gallup），且测量维度更宽（含教育、就业）。

### Healthcare 医疗指数（5 项 → 0-100）

| 子指标 | 权重 | 理由 |
|--------|------|------|
| Doctors/1K (norm) | 25% | 核心医疗可及性 |
| UHC Coverage | 25% | 全民健康覆盖综合指数 |
| Beds/1K (norm) | 20% | 住院资源可及性 |
| Life Expectancy (norm) | 15% | 最终健康产出 |
| OOP % (inverted, norm) | 15% | 医疗经济负担，低=好 |

> OOP 反转后归一化：70.59% (尼日利亚) → 0 分，6.65% (南非) → 100 分。

### Governance 社会治理指数（5 项 → 0-100）

| 子指标 | 权重 | 理由 |
|--------|------|------|
| CPI (Anti-Corruption) | 25% | 腐败直接影响移居者日常体验（办事效率、营商环境） |
| Gov Effectiveness (WGI) | 25% | 政府服务质量、政策执行力，直接影响基础设施和公共服务 |
| WJP Rule of Law | 20% | 法治水平：司法独立、产权保护、合同执行 |
| Press Freedom (RSF) | 15% | 新闻自由，反映信息透明度与言论环境（替代 FOTN，覆盖率 148/148） |
| MIPEX | 15% | 移民融合政策，直接关联移居者权益 |

> CPI + WGI 各 25%：两者高度互补——CPI 聚焦腐败问题，WGI 聚焦行政能力。
> WJP 20%：法治是营商/居住安全的基石，但与 CPI 有正相关，稍降权避免双重计算。
> RSF 15%（原 FOTN 位置）：FOTN 覆盖仅 112/148，RSF 满覆盖且 r=0.919 高相关。FOTN 保留在详情页单独展示。
> MIPEX 15%：覆盖率较低（109/148），但对移居决策高度相关。
> 缺失值处理：仅用有效子指标的加权平均，confidence 字段标识可信度（5/5=high, 4/5=medium, ≤3=low）。

---

## 四、旧字段保留

- `internetFreedomScore`（FOTN）：数据保留在 cities.json，详情页单独展示；不再参与 Governance 复合指数计算（已由 RSF pressFreedomScore 替代）。
- `pressFreedomScore`（RSF）：现参与 Governance 复合指数计算（15% 权重），同时在详情页展示。
- `democracyIndex`：数据保留在 cities.json，可供详情页展示；不参与复合指数计算。
- `freedomIndex` / `freedomConfidence`：保留在 type 和 data 中，值不再更新。新代码应使用 `governanceIndex` / `governanceConfidence`。

---

## 五、数据质量注意事项

| 指标 | 缺失国家 | 原因 |
|------|----------|------|
| WPS | 台湾 (1 city) | Georgetown WPS 不覆盖 |
| OOP | 中国香港、波多黎各、台湾 (3 cities) | World Bank 不单独统计 |
| WJP | 瑞士、阿塞拜疆、以色列、巴林、沙特、冰岛、波多黎各、阿曼 (9 cities) | WJP 2025 未覆盖 |
| FOTN | 39 个国家 (36 cities) | Freedom House 仅评估 ~70 国（已从 Governance 指数移除，仅详情页展示） |
| MIPEX | 33 个国家 (39 cities) | MIPEX 仅覆盖 EU/OECD + 部分国家 |
| WGI GE | 台湾 (1 city) | World Bank 不覆盖 |

> MIPEX 数据为 2019 版，是最新可用公开数据。
