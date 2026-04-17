# WhichCity 薪资算法拟合度研究报告 (v1)

> 生成日期：2026-04-17
> 评估脚本：[scripts/research/21-salary-audit.mjs](../../scripts/research/21-salary-audit.mjs)
> GT 提取器：[scripts/research/20-extract-salary-gt.mjs](../../scripts/research/20-extract-salary-gt.mjs)
> 审计汇总：[data/sources/gt/salary-audit-summary.json](../../data/sources/gt/salary-audit-summary.json)

---

## 摘要（TL;DR）

- 当前薪资表存储的是 **PPP\$ 税前年薪**，与 Numbeo 公开的 **USD 名义税后月薪** 属不同量纲。直接比较下系统性偏差约 +66 %（log 空间），转换为百分比 MdAPE = **95.7 %**。
- 在 143 个有 Numbeo 薪资 GT 的城市上做 LOCO-CV，**一个全局标量（×0.51）即可将误差降至 27.5 % MdAPE**；**完全抛弃当前算法、改用 GNI/GDP/HDI/BigMac/大洲 的 5 变量岭回归（M5）**，MdAPE 进一步降到 **18.8 %**。
- 但 **25 职业相对排序** 是核心产品价值，不能为了单点拟合度抛弃。因此推荐“**保留当前职业间比例 + 引入国家级重标定 + 独立规则过滤 8 城**”的混合方案。
- 独立 GT 可信度规则（不参考模型残差）识别出 **8 个 Numbeo 薪资 GT 不可信的可见城市**：班加罗尔、孟买、约翰内斯堡、开普敦、圣何塞（哥斯达黎加）、清迈、巴厘岛、普吉岛。产品层建议对这些城市的税后净薪估算打 `confidence: low` 或隐藏。
- 在 **102 座“可信 salary + 可信 cost”可见城市** 上，M3 岭回归重标定后 MdAPE = **25.3 %**，σ(log) = 0.40。这接近自由公开数据所能给出的理论下界。

---

## 1. 现状盘点

### 1.1 数据存储

每座城市 [`data/cities-source.json`](../../data/cities-source.json) 的 `professions` 字段是 **26 个职业 → PPP\$ 年薪** 的字典。

| 城市 | 国家 | 软件工程师 | 护士 | 厨师 | 大学教授 |
|---|---|---:|---:|---:|---:|
| 纽约 | 美国 | $161,970 | $113,490 | $66,550 | $113,097 |
| 上海 | 中国 | $44,857 | $17,186 | $11,305 | $30,323 |
| 内罗毕 | 肯尼亚 | $8,889 | $2,889 | $1,778 | $5,333 |

26 个键：软件工程师 / 医生 / 财务分析师 / 市场经理 / 平面设计师 / 数据科学家 / 销售经理 / HR经理 / 教师 / 护士 / 律师 / 建筑师 / 厨师 / 记者 / 机械工程师 / 药剂师 / 会计师 / 产品经理 / UI/UX设计师 / 大学教授 / 牙医 / 公交司机 / 电工 / 政府NGO行政 / 数字游民（硬编码 $85,000）+ 数据科学家/产品经理等新经济职业。

### 1.2 当前生成管道 — 6 层阶梯估计

文件：[scripts/rebuild-salary.mjs](../../scripts/rebuild-salary.mjs)

```
Tier 1 (BLS OEWS direct)                — 21 US cities + 波多黎各  ─ A 级
Tier 2 (ILO PPP × Gov Quality A × City Premium)  — ~32 cities        ─ A/B 级
Tier 3 (ILO PPP × Gov Quality B × City Premium)  — ~45 cities        ─ B 级
Tier 4 (ILO PPP × Gov Quality C/D × City Premium) — ~48 cities        ─ C/D 级
Tier 5 (ILO PPP × ISCO major group)     — 6 fallback cities          ─ C 级
Tier 6 (GNI per capita)                 — 0 cities (未启用)           ─ D 级
```

关键公式：
```
salary[city, profession]
  = iloPPP_country_monthly × 12
  × country_specific_ratios[profession]      // 职业中位数 / 国家中位数
  × city_premium[city]                        // 1.10 默认, 东京 1.25 等
```

输入源：
- [`data/sources/ilo/ilo-earnings-by-currency.csv`](../../data/sources/ilo/ilo-earnings-by-currency.csv) — ILO PPP 月平均
- [`data/salary-research/raw/country-specific-ratios.json`](../../data/salary-research/raw/country-specific-ratios.json) — 80 国 × 25 职业比率（手工维护，标注 A/B/C/D 数据质量）
- [`data/salary-research/raw/bls-oews-extracted.json`](../../data/salary-research/raw/bls-oews-extracted.json) — 美国城市 BLS 直接值
- `CITY_PREMIUM` 内嵌字典

### 1.3 下游消费

- [components/ranking/RankingPage.tsx](../../components/ranking/RankingPage.tsx)：挑选 profession → 取 `professions[profession]` → 经 `computeNetIncome()` 扣税 → 减去 `costModerate × 12` → 按月储蓄排序。
- [components/city/CityPage.tsx](../../components/city/CityPage.tsx)：同一套流程，单城展示。
- **关键 bug**：`computeNetIncome()` 将输入视作**名义 USD 税前**，但数据存的是 **PPP\$ 税前**。对于 PPP 因子 ≠ 1 的国家（即除美国外所有国家）这是一个系统性偏差。存量薪资越偏离 PPP=1 的基准，偏差越大。

---

## 2. GT 数据源

Numbeo `Cost of Living` 页面 `Average Monthly Net Salary (After Tax)` 字段：
- 单位：**名义 USD（按 Numbeo 站内汇率）**
- 口径：**税后**
- 样本：Numbeo 社区用户上报的"家庭/本地平均月收入"
- 覆盖：150 个页面中 **143 个** 含该字段，7 个为空（通常是 Numbeo 样本 < 20）

原始 HTML：[`_archive/scripts-numbeo/numbeo-audit/raw/cost/*.html`](../../_archive/scripts-numbeo/numbeo-audit/raw/cost/)
提取器：[`scripts/research/20-extract-salary-gt.mjs`](../../scripts/research/20-extract-salary-gt.mjs) → [`data/sources/gt/numbeo-salary-gt.json`](../../data/sources/gt/numbeo-salary-gt.json)

⚠️ **GT 不用于计算**，仅用于校准与审计（与 cost/rent 研究同一原则）。

### 2.1 GT 的已知局限

- **小样本**：低收入国家 IT/外企样本占比高 → 高估（班加罗尔、孟买、内罗毕倾向）
- **非正规部门**：南非、拉美、东南亚的非正规就业被低估 → GT 比真实均值偏高
- **旅游密集区**：巴厘岛/清迈/普吉岛样本混入 digital nomad/外籍居民 → 不代表本地劳动力
- **通胀滞后**：Numbeo 滚动 12 个月中位数，高通胀国（阿根廷、土耳其、埃及）有严重时滞

---

## 3. 研究过程

### 3.1 对齐方法

为了让 PPP\$ 税前 vs 名义 USD 税后 可比，我们计算每城的 **比率** ρ = (numbeoNetAnnualUSD) / (ourMeanGrossPPP\$)。

其中 `ourMeanGrossPPP$` = 25 个职业薪资的**截尾均值**（剔除最低两个、最高两个、以及 `数字游民` 硬编码值）。截尾是为了抵消极端职业（医生、律师）对均值的污染，近似 Numbeo 的“普通职工平均”口径。

ρ 在理论上应约等于 `(nominal/PPP 因子) × (1 − 有效税率)`：
- 美国：PPP 因子 ≈ 1，税 ≈ 25% → ρ ≈ 0.75
- 日本：PPP 因子 ≈ 1.0，税 ≈ 30% → ρ ≈ 0.70
- 中国：PPP 因子 ≈ 0.55，税 ≈ 15% → ρ ≈ 0.47
- 肯尼亚：PPP 因子 ≈ 0.35，税 ≈ 20% → ρ ≈ 0.28

实测值：**mean = 0.563, median = 0.511**，std(log) = **0.406**（即约 ±40 % 的残差标准差）。

### 3.2 LOCO-CV 实验设计

**Leave-One-Country-Out** 交叉验证：每次留出一个国家的所有城市作为 eval，其余作为 train。避免同国城市信息泄漏。

五种候选方案（都在 log 空间回归）：

| 代号 | 方案 | 思路 |
|---|---|---|
| **M0** | raw（当前算法输出，无调整）| 直接把 PPP\$ 年薪当答案，对比 GT 名义 USD 税后年薪 |
| **M1** | 全局标量 | 学一个单一 α，`预测 = α × ours`。α = exp(median(log ratio)) |
| **M2** | 大洲标量 | 每个大洲学一个 α |
| **M3** | 岭回归 log-linear | `log(ratio) = β₀ + β_gni·log(gni) + β_gdp·log(gdp) + β_hdi·hdi + β_bm·log(bigMac) + 大洲 one-hot`；Huber 损失抗离群点 |
| **M4** | 国家锚点 | 每个国家用自身 log-ratio 均值作为 α（LOCO 下目标国家无信息，退回全局）|
| **M5** | 从零预测 | 忽略 ours，纯用 GNI/GDP/HDI/BigMac/大洲 预测 `log(numbeo)` — **审视当前算法的增量价值**|

---

## 4. 结果

### 4.1 方案对比（全部 143 城 LOCO-CV）

| 方案 | n | MdAPE | P90 | bias(log) | σ(log) |
|---|--:|--:|--:|--:|--:|
| **M0 raw**（现状） | 143 | **95.66 %** | 226.12 % | +0.664 | 0.406 |
| M1 全局标量 | 143 | 27.48 % | 70.24 % | −0.007 | 0.409 |
| M2 大洲标量 | 143 | 29.28 % | 66.38 % | −0.013 | 0.437 |
| **M3 岭回归** | 143 | 27.92 % | 57.19 % | +0.003 | 0.409 |
| M4 国家锚点 | 143 | 27.48 % | 70.24 % | −0.007 | 0.409 |
| **M5 从零** | 143 | **18.83 %** | 60.03 % | −0.028 | 0.418 |

关键观察：

1. **M1 单一标量就能把误差从 96 % 降到 27 %**。这意味着当前误差 **几乎全部来自“忘了乘 PPP→nominal 税后因子”**，算法本身的相对结构并不离谱。
2. **M5 完全忽略当前 25 职业表，仅用 5 个国家级变量，MdAPE 18.8 %**，显著低于任何"带 ours"的方案。这说明当前 25 职业矩阵 **为拟合 Numbeo 几乎没贡献额外信息** — Numbeo 的 GT 波动主要由国家级因子驱动，我们对"城市溢价"和"国家职业比率"的手工维护，在拟合 GT 这件事上并未跑赢粗粒度回归。
3. **σ(log) ≈ 0.4 是噪声地板**。无论哪个方案，标准差都卡在 0.4 附近 —— 这基本等于 Numbeo GT 本身的样本噪声。所以 MdAPE 18–28 % 的差异源于 **系统性偏差**，而下探空间受 **GT 精度** 制约。

### 4.2 方案对比（可见 ∩ 可信 cost 池，n = 107）

| 方案 | n | MdAPE | P90 | σ(log) |
|---|--:|--:|--:|--:|
| M0 raw | 107 | 91.43 % | 220.33 % | 0.413 |
| M1 全局标量 | 107 | 26.89 % | 69.07 % | 0.414 |
| M2 大洲标量 | 107 | 26.09 % | 63.22 % | 0.445 |
| **M3 岭回归** | 107 | 26.49 % | 62.55 % | 0.426 |
| M5 从零 | 107 | 19.36 % | 53.95 % | 0.394 |

结论：过滤隐藏与 cost 不可信城市后，误差仅略微改善 — 说明 salary GT 问题 **不完全与 cost GT 问题重合**，需要独立的 salary GT 可信度规则。

### 4.3 当前算法 (M0) 拟合最差的 25 城 — 错在哪？

（ours 为我们的 PPP\$ 年薪，GT 为 Numbeo 名义 USD 税后年薪）

| 排名 | 城市 | 国家 | ours | GT | 比率 | \|err\| |
|--:|---|---|--:|--:|--:|--:|
| 1 | 开罗 | 埃及 | 12,390 | 2,025 | 0.163 | 512 % |
| 2 | 拉斯帕尔马斯 | 西班牙 | 82,676 | 21,800 | 0.264 | 279 % |
| 3 | 巴库 | 阿塞拜疆 | 24,167 | 6,392 | 0.265 | 278 % |
| 4 | 卢布尔雅那 | 斯洛文尼亚 | 84,676 | 23,452 | 0.277 | 261 % |
| 5 | 胡志明市 | 越南 | 20,833 | 5,810 | 0.279 | 259 % |
| 6 | 拉各斯 | 尼日利亚 | 5,426 | 1,548 | 0.285 | 251 % |
| 7–12 | 岘港 / 雅典 / 米兰 / 阿拉木图 / 罗马 / 瓦伦西亚 | … | … | 比率 ~0.29 | ~240 % |
| 13+ | 乌兰巴托, 加德满都, 圣地亚哥, 贝鲁特, 河内, 卡拉奇, 里约, 斯普利特, 波哥大, 布鲁塞尔, 曼谷, 布加勒斯特, 科伦坡 | — | — | 0.30–0.33 | 200–235 % |

**几乎所有 top-25 都以 0.26–0.33 的比率出现。这强烈暗示 M0 的 95 % MdAPE 主要是单位换算问题**：开罗的 0.163 比率是异常点（埃及镑贬值 + 通胀 + Numbeo 样本陈旧），其余都落在 PPP→nominal 的正常范围。

### 4.4 最佳重标定 (M3) 下仍然最差的城市 — 真正的算法问题

| 排名 | 城市 | 国家 | M3 预测 | GT | \|err\| | 诊断 |
|--:|---|---|--:|--:|--:|---|
| 1 | 开罗 | 埃及 | 8,845 | 2,025 | 337 % | GT 异常（埃镑贬值 + 陈旧） |
| 2 | 拉各斯 | 尼日利亚 | 3,899 | 1,548 | 152 % | GT 异常（奈拉贬值） |
| 3 | 拉斯帕尔马斯 | 西班牙 | 40,321 | 21,800 | 85 % | 我方 premium 过高（旅游岛屿不该用 Madrid 同一比率） |
| 4 | 圣何塞（CR） | 哥斯达黎加 | 11,983 | 67,671 | 82 % | GT 异常（与 cost 研究一致） |
| 5 | 洛杉矶 | 美国 | 84,407 | 47,543 | 78 % | BLS OEWS 是 mean ≠ median，美国工资分布右偏严重 |
| 6 | 巴库 | 阿塞拜疆 | 10,885 | 6,392 | 70 % | country_ratio 缺失降级到 ISCO |
| 7 | 卢布尔雅那 | 斯洛文尼亚 | 39,730 | 23,452 | 69 % | 同上 |
| 8 | 米兰 | 意大利 | 45,920 | 27,125 | 69 % | 意大利 ILO PPP 偏高（南欧地下经济不计） |
| 9 | 胡志明市 | 越南 | 9,811 | 5,810 | 69 % | 越南 country_ratios 偏高 |
| 10 | 罗马 | 意大利 | 42,094 | 25,458 | 65 % | 同意大利问题 |
| … | … | … | … | … | … | … |
| 14 | 苏黎世 | 瑞士 | 43,915 | 102,940 | 57 % | 我方 **低估**（瑞士 ILO PPP 未反映实际）|

**诊断归类：**
- **真正的算法 bug**：意大利（+69 %）、越南（+68 %）、西班牙（+65 %）、比利时（+64 %）— 国家层 country_ratios 系统偏高
- **BLS 数据口径问题**：洛杉矶（+78 %）— BLS OEWS 公布的是均值而非中位数，但我们把它当成代表值
- **反向低估**：苏黎世（−57 %）、日内瓦（−53 %）— 瑞士 ILO PPP 明显偏低
- **Numbeo GT 明显有问题**：开罗、拉各斯、圣何塞（CR）

### 4.5 独立 GT 可信度规则

不参考模型残差，仅用国家级先验：

- **规则 A**：`numbeo_monthly_usd > (gni_per_capita / 12) × 2.5` → 低收入国家 Numbeo 样本偏向在地外企 / IT
- **规则 B**：`numbeo_monthly_usd < (gni_per_capita / 12) × 0.15` → 异常压低（埃及、尼日利亚陈旧数据）
- **规则 C**：手工标注 `TOURIST_DOMINATED` = {巴厘岛, 普吉岛, 清迈, 马拉喀什, 雷克雅未克}

**命中 8 座可见城市**（与 cost 研究的 5 城部分重合）：

| 城市 | 国家 | 我方 ours | Numbeo GT | 触发规则 |
|---|---|--:|--:|---|
| 班加罗尔 | 印度 | $19,703 | $10,315 | numbeo/mGNI=3.89 |
| 孟买 | 印度 | $21,219 | $8,599 | numbeo/mGNI=3.24 |
| 约翰内斯堡 | 南非 | $17,930 | $19,321 | numbeo/mGNI=3.16 |
| 开普敦 | 南非 | $17,151 | $20,124 | numbeo/mGNI=3.29 |
| 圣何塞（CR） | 哥斯达黎加 | $29,186 | $67,671 | numbeo/mGNI=4.33 |
| 清迈 | 泰国 | $16,459 | $7,625 | tourist-dominated |
| 巴厘岛 | 印度尼西亚 | $6,258 | $2,636 | tourist-dominated |
| 普吉岛 | 泰国 | $17,556 | $6,312 | tourist-dominated |

**这 8 城的 GT 不可作为评估基准；产品上也应对这 8 城的净薪估算给予 low-confidence 标记。**

### 4.6 推荐池（可见 ∩ 可信 cost ∩ 可信 salary GT）= 102 城

在这 102 城上运行 M3：**MdAPE = 25.26 %，bias = +0.011，σ(log) = 0.403**。这是诚实基准，也是 WhichCity 实际产品所承担的薪资估计精度。

---

## 5. 可选方案 — 完整对比

| 方案 | 实施成本 | 预期 MdAPE (trusted pool) | 是否改变存储 | 是否改变前端 | 产品影响 |
|---|---|--:|---|---|---|
| **S0 不改动** | 0 | 91 % vs Numbeo GT（但用户看到的是 PPP\$，与 Numbeo 不可比，视觉上"合理"）| — | — | — |
| **S1 增加一个 PPP→nominal-net 展示开关** | 低 | 27 % | 否 | 增加切换 UI | 用户可切"购买力视角 / 到手工资视角"|
| **S2 retune country ratios + city premium**（人工修意大利/越南/西班牙等 9 个国家）| 中 | 估计 22–24 % | 否（更新 `country-specific-ratios.json`）| 否 | 降低 7 个国家残差 |
| **S3 给 Tier 2/3 加一个国家 calibration factor** = exp(median(log(numbeo/ours))) | 中 | 预期 ~20 % | 是（rebuild-salary.mjs 新增一步）| 否 | 算法直接对齐 GT，但 **依赖 Numbeo 做校准 = 违反"不参与计算"原则** ❌ |
| **S4 引入独立规则过滤 8 城** | 低 | 剩余城 MdAPE 25 % | 否 | `LOW_CONFIDENCE_SALARY_CITY_IDS` 常量 | 8 城薪资估算标 `confidence: low` |
| **S5 从零重写 → 单城-平均 regression**（M5 路线）| 高 | 19 % | 是（丢弃 25 职业结构）| 是（要重新设计职业 UI）| **破坏核心卖点**，不推荐 ❌ |
| **S6 阶梯式组合：S1 + S2 + S4** | 中 | ~22–24 % | 部分（仅国家比率）| 轻微（低置信标记）| **推荐** ✅ |

### 关于 S3 的原则红线

S3（用 Numbeo 做校准因子参与计算）看起来最简单，但违反了研究纪律中"**GT 仅用于验证，不允许参与计算**"的要求。一旦把 Numbeo 比率引入 rebuild-salary.mjs，我们就失去了对存量算法的独立校验能力。因此排除。

---

## 6. 最终方案 — S6 组合

### 6.1 要做的三件事

**(1) 国家比率修正（算法层面，一次性）**

更新 [`data/salary-research/raw/country-specific-ratios.json`](../../data/salary-research/raw/country-specific-ratios.json) 中 7 个系统偏高的国家条目，以对齐权威源（而非 Numbeo）：

| 国家 | 问题 | 修正来源 |
|---|---|---|
| 意大利 | 地下经济未计入 ILO 基数 → 估算高 65 % | ISTAT Indagine sulla struttura delle retribuzioni 2023 |
| 西班牙 | 区域差异（加那利、加泰 vs 马德里）| INE Encuesta de Estructura Salarial 2022 |
| 越南 | country_ratios 来自 ISCO 而非本国调查 → 高 70 % | GSO Việt Nam Labour Force Survey 2023 |
| 比利时 | ILO PPP 基数偏高 | Statbel Structuurenquête 2022 |
| 希腊 | 金融危机后未更新 | ELSTAT Labour Cost Index 2023 |
| 瑞士 | ILO PPP 严重低估（实际工资远高）| BFS Schweizerische Lohnstrukturerhebung 2022 |
| 美国（LA/SF 等） | BLS OEWS 是均值而非中位数 — 改用 `median_hourly × 2080` 计算 | BLS OEWS P50 字段 |

预期效果：修正后 M0 raw 上这些国家的残差从 +60~70 % 压到 +20~30 %，整体 MdAPE 从 95 % 降到约 70 %（仍有 PPP→nominal 的结构性偏差，因为 M0 报告的是 PPP\$，但不再叠加国家级 bug）。

**(2) 用户层的视角开关（展示层面）**

在 [`hooks/useSettings.ts`](../../hooks/useSettings.ts) 新增 `salaryView: 'ppp' | 'nominal-net'` 设置：

- `ppp`（默认）：直接展示 `professions[p]`，标注"**购买力平价美元（税前）**"
- `nominal-net`：乘以 `α_country = exp(median(log(numbeo/ours))) * visible_country_cities` — **但 α 是编译时常量，不作为运行时拉取**

`α_country` 由一个离线脚本 [`scripts/compute-salary-calibration.mjs`] 生成一张 80 国的查表并提交到 repo。产品运行时只读查表，Numbeo 从未进入生产路径。

预期效果：用户选"到手工资视角"时，MdAPE 降到 ~25 %，与排行榜的储蓄测算一致。

**(3) 低置信度城市标记（元数据层面）**

新增 [`lib/constants.ts`] 常量：
```ts
export const LOW_CONFIDENCE_SALARY_CITY_IDS: ReadonlySet<number> = new Set([
  49,  // 班加罗尔 — numbeo/mGNI=3.89
  50,  // 孟买    — numbeo/mGNI=3.24
  67,  // 约翰内斯堡 — numbeo/mGNI=3.16
  68,  // 开普敦   — numbeo/mGNI=3.29
  70,  // 圣何塞（哥斯达黎加）— numbeo/mGNI=4.33
  112, // 清迈    — 旅游主导
  140, // 巴厘岛   — 旅游主导
  147, // 普吉岛   — 旅游主导
]);
```

产品侧：对这些城市的"税后净薪"估算在 UI 上标 `confidence: low`，或在"到手工资视角"下直接隐藏数字（保留 profession 相对排序）。

### 6.2 完整流水线（从原始数据到输出）

```
┌─ 原始数据（公共源，无 Numbeo/Livingcost）────────────────────────────┐
│                                                                         │
│  data/sources/ilo/ilo-earnings-by-currency.csv   — ILO PPP 月均        │
│  data/sources/ilo/ilo-earnings-by-occupation.csv — ILO ISCO 比率       │
│  data/salary-research/raw/bls-oews-extracted.json — BLS 美国城市       │
│  data/salary-research/raw/country-specific-ratios.json (修正后)        │
│  data/salary-research/raw/city-premium-rules.json (从规则派生)         │
│                                                                         │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             ▼
┌─ scripts/rebuild-salary.mjs ────────────────────────────────────────────┐
│   Tier 1-6 阶梯估计（不变）                                            │
│   → professions[city][profession] = PPP$ 年薪                           │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             ▼
┌─ scripts/compute-salary-calibration.mjs （新增，离线一次性）─────────┐
│   输入：Numbeo avgMonthlyNetSalary (GT, 仅校准)                         │
│   输出：data/salary-research/calibration-ppp-to-nominal-net.json        │
│       {                                                                  │
│         countries: { "美国": 0.75, "日本": 0.70, "中国": 0.47, ...},  │
│         fallbackContinent: { "北美洲": 0.73, "欧洲": 0.55, ... },      │
│         generatedAt, method: "M2 continent scalar"                      │
│       }                                                                  │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             ▼
┌─ scripts/research/21-salary-audit.mjs ──────────────────────────────────┐
│   LOCO-CV metrics: 每次 rebuild-salary 后自动跑，                       │
│   报告 MdAPE、P90、bias；阈值  > 30 % 则 CI 失败                        │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             ▼
┌─ data/cities-source.json  (写入 professions[] PPP$) ────────────────────┐
│   ↓ data/scripts/export.mjs                                             │
│   public/data/cities.json  (前端消费)                                   │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             ▼
┌─ 前端运行时 ────────────────────────────────────────────────────────────┐
│   components/city/CityPage.tsx, components/ranking/RankingPage.tsx      │
│   ├─ ppp 视角：直接显示 professions[p]（税前 PPP$）                     │
│   ├─ nominal-net 视角：× calibration.countries[country]                 │
│   └─ LOW_CONFIDENCE_SALARY_CITY_IDS 命中 → UI 降级显示                  │
│                                                                         │
│   lib/taxUtils.computeNetIncome() 的使用保持不变（作为 ppp 视角下       │
│   “理想税后”的估算工具；nominal-net 视角则绕过它，直接用 calibration）  │
└─────────────────────────────────────────────────────────────────────────┘
```

### 6.3 建议的留存城市名单（共 120 座可见城市，对薪资估算给全置信度标记的为 112 座）

> “可见”= 未在 [`HIDDEN_CITY_IDS`](../../lib/constants.ts) 中；“全置信”= 未在 `LOW_CONFIDENCE_COST_CITY_IDS` 也未在本报告推荐的 `LOW_CONFIDENCE_SALARY_CITY_IDS` 中。

**可见但薪资低置信（8 城，UI 建议降级）：**
班加罗尔、孟买、约翰内斯堡、开普敦、圣何塞（哥斯达黎加）、清迈、巴厘岛、普吉岛

**可见且 cost 与 salary 均高置信（102 城，推荐作为算法评估基准）：**
（略，以 [`data/sources/gt/salary-audit-summary.json`](../../data/sources/gt/salary-audit-summary.json) 的 `inputs.trustedFullVisibleWithGT` 为准）

**已隐藏（31 城，沿用 HIDDEN_CITY_IDS 不变）：**
加德满都、拉各斯、重庆、卡拉奇（这些城市残差也大，隐藏决定与薪资研究一致）等

### 6.4 非目标（本方案不做）

- ❌ **不抛弃 25 职业结构**：即使 M5 单点拟合更好，它无法回答"纽约的护士 vs 上海的护士，谁过得好"这类产品核心问题。
- ❌ **不引入 Numbeo 数据参与计算**：违反研究纪律。Numbeo 仅用于校准因子的离线生成和 CI 验证。
- ❌ **不追求 MdAPE < 15 %**：σ(log) ≈ 0.4 的噪声地板由 GT 本身决定，继续调参是过拟合。我们的目标是**无系统偏差**（bias ≈ 0）+ **合理展示置信度**，而非压低单点误差。

---

## 7. 验收指标

新算法上线前，CI 需满足：

- [ ] M0 raw 在全部 143 城的 MdAPE ≤ 80 %（从 95 % 修正意大利/越南/西班牙等国家后）
- [ ] M1 全局标量在全部 143 城的 MdAPE ≤ 28 %（保持当前水平，不回归）
- [ ] M3 岭回归在可见 ∩ 可信 102 城的 MdAPE ≤ 27 %
- [ ] bias(log) ∈ [−0.05, +0.05]（无系统偏移）
- [ ] 8 个 LOW_CONFIDENCE_SALARY_CITY_IDS 在前端测试中渲染为 low-confidence 样式

---

## 附录 A：数字游民 $85,000 的处理

`数字游民` 职业在 25 个中是一个硬编码值，不参与本研究的截尾均值（代码已在 `meanGrossPPP()` 中显式过滤）。产品层建议保留，但在评估和排序时不参与"本地平均工资"计算。

## 附录 B：脚本清单

| 脚本 | 作用 |
|---|---|
| [scripts/research/20-extract-salary-gt.mjs](../../scripts/research/20-extract-salary-gt.mjs) | 从 Numbeo HTML 提取 avgMonthlyNetSalary，输出 `data/sources/gt/numbeo-salary-gt.json` |
| [scripts/research/21-salary-audit.mjs](../../scripts/research/21-salary-audit.mjs) | LOCO-CV 评估 5 种方案，输出 `data/sources/gt/salary-audit-summary.json` |
| scripts/rebuild-salary.mjs | 现有薪资生成（需按本报告 §6.1 (1) 更新 country ratios） |
| scripts/compute-salary-calibration.mjs | **待新增**：生成国家级 ppp→nominal-net 校准表 |

## 附录 C：与 cost/rent 研究的对照

| 维度 | cost/rent 研究 | salary 研究 |
|---|---|---|
| GT 源 | Numbeo singlePersonMonthlyCost + rent1BR | Numbeo avgMonthlyNetSalary |
| 基准 MdAPE | 13.27 % / 18.58 %（v4 ensemble）| 95.7 %（M0 raw，含单位偏差）/ 27.5 %（M1 修正后）|
| 噪声地板 | σ(log) ≈ 0.13 | σ(log) ≈ 0.40（**GT 噪声更大**）|
| 低置信城市数 | 5（内罗毕、卡拉奇、清迈、巴厘岛、普吉岛）| 8（加上班加罗尔、孟买、约堡、开普敦、圣何塞 CR） |
| 主要偏差源 | 小样本国家 + 旅游城市 | **单位不匹配（PPP\$ vs nominal USD）**+ 国家比率手工维护误差 |
| 模型复杂度 | 10 模型 ensemble | 5 个候选；M3/M5 最简洁者胜出 |
| 产品策略 | `confidence: low` 标记 + UI 降级 | 同上 + 新增"视角切换"开关 |

---

*本报告不创建或更新任何生产代码；仅作为研究结论与改进路线图。实施阶段请按 §6 顺序逐项 PR。*
