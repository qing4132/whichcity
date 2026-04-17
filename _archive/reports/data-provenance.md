# WhichCity 数据来源与计算方法存档（Provenance）

**Version**: 2026-04-17 · Phase 2 final · 100 城 × 20 职业  
**Scope**: Salary / Cost / Rent 三项核心经济数据的来源、计算路径、存档位置、复现命令  
**Disclaimer**: 所有非运行时源（Numbeo、Livingcost 等 scraped GT）仅用于**离线校准与审计**，不进入前端。

---

## 0. 花名册（100 城 × 20 职业）

### 100 个可见城市

- 筛选基准：`data/sources/gt/trust-audit-v3.json`（dual-GT 一致性审计，model-as-arbitrator 规则）
- 构成：Tier A (56) + Tier B (27) + Tier C (13) + 4 特保（133 硅谷·圣何塞 / 159 京都 / 138 福冈 / 162 维尔纽斯）
- 隐藏 51 城：`HIDDEN_CITY_IDS` in [lib/constants.ts](lib/constants.ts#L15-L20)
- 审计规则与 Tier 判定：`scripts/research/27-trust-audit-v3.mjs`
- 决策摘要：[_archive/reports/phase2-100-city-roster.md](_archive/reports/phase2-100-city-roster.md)

### 20 个职业（已从 25 删减）

**删除的 5 个**：产品经理 / 政府/NGO 行政 / 大学教授 / 公交司机 / 记者  
删除理由：BLS OEWS 无对应 SOC / Numbeo 样本稀疏不足以支撑 PPP-gross 校准，保留会引入系统性噪声。

保留的 20 个：软件工程师、医生/医学博士、财务分析师、市场经理、平面设计师、数据科学家、销售经理、人力资源经理、教师、护士、律师、建筑师、厨师、机械工程师、药剂师、会计师、UI/UX 设计师、牙医、电工、数字游民。

---

## 1. Salary（税后月薪，USD）

### 1.1 数据来源

| 层级 | 来源 | 用途 | 归档位置 | License |
|------|------|------|----------|---------|
| 运行时输入 | PPP-gross 年薪（per city × profession） | 单一源 | `data/cities-source.json`（`professions` 字段） | — |
| 校准参照 A | **Numbeo 城市工资 GT**（scraped 143 城，net monthly USD） | α_country 校准 | `data/sources/gt/numbeo-salary-scraped.json` | Educational use |
| 校准参照 B | **Livingcost.io 工资 GT**（scraped 116 城，net monthly USD） | α_country 校准 | `data/sources/gt/livingcost-salary-scraped.json` | Educational use |
| 美国锚点 | **BLS OEWS May 2023**（national, 21 SOCs） | 19 US 城交叉校验 | `data/sources/salary-official/us-bls-oews-2023.json` | CC0 (US federal) |
| 美国锚点（硅谷） | **BLS OEWS May 2023 MSA 41940** | 圣何塞 MSA 薪资锚定 | `data/sources/salary-official/us-bls-oews-2023-msa-41940-sanjose.json` | CC0 |

**BLS 抓取备注**：BLS 站点 Akamai 阻断直连，使用 Wayback 镜像获取 `oesm23nat.zip` 与 `oesm23ma.zip`。

### 1.2 计算路径

```
PPP-gross 年薪  →  ÷ 12  →  PPP-gross 月薪
              →  × α_country  →  nominal net monthly USD
```

- α 表：`data/salary-research/calibration-ppp-to-nominal-net.json`
- α 生成：`scripts/compute-salary-calibration-v2.mjs`（dual-GT 成对观测，n≥2 取 log-median）
- 观测数：208（city × source pairs），59 国家有独立 α，其余回退到洲/全球
- 全局 α = 0.506；关键值：美国 0.535、日本 0.548、瑞士 1.186、韩国 0.825、意大利 0.297

### 1.3 交叉校验

- **US BLS 交叉校验**：`scripts/research/26-validate-vs-bls.mjs` → 19 US 城中位数 109% of BLS（94–145% 区间）
- **Trust audit v3**：`scripts/research/27-trust-audit-v3.mjs` → 对每城 × GT 源计算相对误差 errR，分 Tier
- 低置信度城市：`LOW_CONFIDENCE_SALARY_CITY_IDS` in [lib/constants.ts](lib/constants.ts#L50)

### 1.4 复现命令

```bash
node scripts/research/27-trust-audit-v3.mjs           # 重跑审计
node scripts/compute-salary-calibration-v2.mjs        # 重算 α 表
node scripts/research/26-validate-vs-bls.mjs          # US 交叉校验
node scripts/validate-salary-quality.mjs              # 整体质量报告
```

---

## 2. Cost（月生活成本，不含房租，USD）

### 2.1 数据来源

| 来源 | 用途 | 归档位置 |
|------|------|----------|
| **v4 cost model**（训练模型） | 运行时单一源 | `data/sources/cost-models/trained-v4.json` |
| World Bank PPP + GNI | 模型特征 | `data/sources/cost-model-inputs.json` |
| Big Mac 指数（Economist） | 模型特征 | 同上 |
| Numbeo 成本 GT | LOCO-CV 残差评估 | `data/sources/gt/numbeo-cost-scraped.json` |
| Livingcost 成本 GT | 残差交叉评估 | `data/sources/gt/livingcost-cost-scraped.json` |

### 2.2 计算路径

cost_moderate / cost_budget = f(PPP, GNI, BigMac, city tier, country FE) per trained-v4 coefficients。

- 训练：`scripts/compute-cost-model.mjs`
- 验证：`scripts/validate-cost-model.mjs`（LOCO-CV, leave-one-country-out）
- 研究文档：[_archive/reports/cost-estimation-research-v4-final.md](_archive/reports/cost-estimation-research-v4-final.md), v5-followup

### 2.3 低置信度

- `LOW_CONFIDENCE_COST_CITY_IDS` = {52 内罗毕, 55 卡拉奇, 112 清迈, 140 巴厘岛, 147 普吉岛}
- 规则：gt_cost / (gni_per_capita / 12) > 3.5 → 低收入国 Numbeo 小样本偏差 或 旅游主导城市
- UI：`estimateCost()` 返回 `confidence: 'low'` 时隐藏数字。

### 2.4 复现命令

```bash
node scripts/compute-cost-model.mjs    # 重新训练
node scripts/validate-cost-model.mjs   # LOCO-CV 报告
node scripts/rebuild-cost-data.mjs     # 输出 costModerate / costBudget 到 SOT
```

---

## 3. Rent（月租金，中等 1BR 市区，USD）

### 3.1 数据来源

| 来源 | 用途 | 归档位置 |
|------|------|----------|
| Numbeo 租金 GT（1BR downtown） | SOT 直填 + cost 模型特征 | `data/sources/gt/numbeo-cost-scraped.json`（`rent_1br_downtown` 字段） |
| Livingcost 租金 GT | 独立校核 | `data/sources/gt/livingcost-cost-scraped.json` |
| Airbnb 长租价格 | 短期补充（数字游民场景） | `data/sources/airbnb-prices.json`（生成：`scripts/fetch-airbnb-prices.mjs`） |

### 3.2 计算路径

- `monthlyRent` 字段直接存入 `data/cities-source.json`，以 Numbeo 为主、Livingcost 校核（差异 > 40% 时取双源中位数）。
- 与 cost 共用低置信度标记（同样的 5 城）。

### 3.3 复现命令

```bash
node scripts/fetch-airbnb-prices.mjs   # 刷新 Airbnb 长租参考
```

---

## 4. 存档与可追溯性

### 4.1 关键存档文件

| 文件 | 内容 | 文件路径 |
|------|------|----------|
| Source of truth | 151 城原始字段 | [data/cities-source.json](data/cities-source.json) |
| Runtime 数据 | 导出的 150+ 城全量数据 | [public/data/cities.json](public/data/cities.json) |
| α 校准表 | 59 国 × 6 洲 × 全局 | [data/salary-research/calibration-ppp-to-nominal-net.json](data/salary-research/calibration-ppp-to-nominal-net.json) |
| Trust audit v3 | 120 城 × Tier 判定 | [data/sources/gt/trust-audit-v3.json](data/sources/gt/trust-audit-v3.json) |
| BLS national | 21 SOC 中位数年薪 | [data/sources/salary-official/us-bls-oews-2023.json](data/sources/salary-official/us-bls-oews-2023.json) |
| BLS MSA 硅谷 | 19 SOC 年薪 | [data/sources/salary-official/us-bls-oews-2023-msa-41940-sanjose.json](data/sources/salary-official/us-bls-oews-2023-msa-41940-sanjose.json) |
| US 交叉校验 | 19 US 城 × 21 prof | [data/sources/salary-official/us-bls-crosscheck.json](data/sources/salary-official/us-bls-crosscheck.json) |
| Cost model | v4 训练参数 | [data/sources/cost-models/trained-v4.json](data/sources/cost-models/trained-v4.json) |

### 4.2 审计流水线脚本

- [scripts/research/23-fetch-livingcost-salary.mjs](scripts/research/23-fetch-livingcost-salary.mjs) — Livingcost GT 抓取
- [scripts/research/24-trust-audit-v2.mjs](scripts/research/24-trust-audit-v2.mjs) — v2 dual-GT 审计
- [scripts/research/25-extract-bls-oews.mjs](scripts/research/25-extract-bls-oews.mjs) — BLS XLSX 解析
- [scripts/research/26-validate-vs-bls.mjs](scripts/research/26-validate-vs-bls.mjs) — US 19 城 vs BLS
- [scripts/research/27-trust-audit-v3.mjs](scripts/research/27-trust-audit-v3.mjs) — v3 model-as-arbitrator
- [scripts/compute-salary-calibration-v2.mjs](scripts/compute-salary-calibration-v2.mjs) — α 表生成

### 4.3 数据完整性铁律（项目宪法）

1. 永不伪造、永不插值、永不以"相似城市平均"填充空缺。
2. Numbeo / Livingcost / BLS 仅在离线管线出现；运行时 0 引用。
3. 每一个存入 SOT 的值必须有可追溯的 URL / 文件 / 脚本来源。
4. α 校准时 n<2 的国家不独立列 α，回退到洲/全球。

---

## 5. 版本历史

| 日期 | 版本 | 变更 |
|------|------|------|
| 2026-04-17 | Phase 2 final | 100 城 × 20 职业 roster 定稿；α v2（dual-GT）；BLS MSA 硅谷锚定 |
| 2026-04-?? | Phase 2 | Livingcost dual-GT audit v2；US BLS OEWS phase 1 |
| 2026-04-?? | Phase 2 | v4 cost model；α v1（PPP→nominal） |
| 2026-03-?? | Phase 1 | 初始 151 城数据、基础指数 |
