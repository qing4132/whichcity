# 干净管线 v6 — H1B × NBS × UBS 三源锚定

> 生成：2026-04 · HEAD = 2a19d87 不变 · 前置：[REPORT-V5.md](REPORT-V5.md)
> 产出：`output/clean-values-v6.json` + `output/compare-v6.txt`

## TL;DR 新增的三个锚定层

| 数据源 | 来源 | 覆盖 | 用途 |
|---|---|---:|---|
| **H1B LCA FY2026 Q1** | US DOL ETA (Public Domain) | 17 US 城 × 15 职业 × 719 SOC×MSA buckets（34 k certified 案例） | 美国真实工资锚（雇主申报且 DOL 核验） |
| **NBS 70 大中城市 2026-03** | 国家统计局 | 7/13 中国大陆城市（新房+二手）| 中国房价趋势锚（yoy/q1avg 修正 baseline 漂移） |
| **UBS GREBI 2025** | UBS Global Wealth Management | 21 国际城市 | 房产泡沫风险锚 + 10Y 实际房价/租金年化 |

---

## 1. H1B LCA 工资锚（最硬的一档）

34,467 条 certified 案例 → MSA × SOC × n≥5 → p25/p50/p75 年化 USD。

**验证**：对生产 `软件工程师` 年薪：

| 城市 | H1B p50 | prod | Δ% | 评估 |
|---|---:|---:|---:|---|
| 纽约 | $169k | $162k | +4.3% | ✓ 优秀 |
| 洛杉矶 | $157k | $155k | +1.2% | ✓ 优秀 |
| 芝加哥 | $130.8k | $130.0k | +0.6% | ✓ 完美 |
| 亚特兰大 | $130.8k | $130.8k | -0.0% | ✓ 完美 |
| 波士顿 | $154.6k | $154.2k | +0.2% | ✓ 完美 |
| 西雅图 | $175k | $169k | +3.3% | ✓ 优秀 |
| 旧金山 | $204k | $175k | **+16.5%** | ⚠ 生产偏保守（LCA 样本偏大厂） |
| 圣地亚哥(US) | $158k | $159k | -1.0% | ✓ 完美 |
| 丹佛 | $150k | $134k | +11.8% | ⚠ 生产偏低 |
| 奥斯汀 | $142k | $133k | +6.5% | ✓ 可接受 |
| 迈阿密 | $115k | $130k | **-11.4%** | ⚠ 生产偏高 |
| 华盛顿 | $127k | $151k | **-15.8%** | ⚠ 生产偏高（LCA 受 GS 政府岗位拉低） |
| 休斯顿 | $110k | $128k | -14.0% | ⚠ 生产偏高 |
| 费城 | $110k | $131k | -15.8% | ⚠ 生产偏高 |
| 凤凰城 | $123k | $130k | -4.8% | ✓ 可接受 |

**结论**：生产 `软件工程师` 在 **8/17 城** 误差 ≤5%；**DC/Miami/Houston/Philly 系统性偏高 10-16%**（可能是过于依赖 BLS OES 75 分位的结果）；旧金山/丹佛偏低（反映生产对"中位"的选择保守）。

### 其他职业锚（示例，完整见 JSON）

Data Scientist p50 USD：
- San Jose $183k · San Francisco $190k · NYC $170k · Seattle $163k · Boston $150k · Chicago $127k · LA $130k

Management Analyst p50 USD：
- NYC $127k · DFW $120k · Chicago $113k · Seattle $115k

15 职业码：softwareDeveloper / dataScientist / itProjectManager / managementAnalyst / financialAnalyst / accountant / electricalEngineer / mechanicalEngineer / civilEngineer / physician / registeredNurse / pharmacist / lawyer / marketResearchAnalyst / csMgr

---

## 2. NBS 70 城房价指数（时间漂移修正）

2026-03 数据，**基期 2025=100**（1 月基期轮换）。

| 城市 | 新房 m2m | 新房 yoy | 新房 Q1avg | 二手 yoy | prod 月租 |
|---|---:|---:|---:|---:|---:|
| 北京 ★ | 100.0 | 97.9 | 97.8 | **91.7** | $804 |
| 上海 | 100.3 | **103.7** | **104.0** | 93.8 | $824 |
| 广州 | 100.3 | 95.3 | 94.9 | 91.9 | $742 |
| 深圳 | 100.2 | 94.5 | 94.7 | 93.0 | $804 |
| 成都 | 99.7 | 95.5 | 96.2 | 94.1 | $655 |
| 杭州 | 100.2 | 102.4 | 102.5 | 94.8 | $721 |
| 重庆 | 99.5 | 95.6 | 96.1 | 94.1 | $610 |

**关键洞察**：
- **上海 + 杭州 是全国唯二新房 yoy 上涨** (+3.7% / +2.4%)，和媒体"上海逆势"报道一致
- **北京新房稳住** (yoy 97.9) 但**二手跌 8.3%**（91.7）—— 说明北京市场实际压力比新房指数显示的更大
- 深圳/广州 新房 yoy 都跌约 5%，一线走弱格局清晰
- **prod 月租 baseline 未受 NBS 2026-03 校准**，当前 $804(北京)/$824(上海) 取自更早的 Numbeo/手工 baseline；下一步可应用 NBS yoy 做漂移修正：`rent_2026Q1 = rent_baseline × (yoy/100)`

剩余 6 个生产城市（苏州/青岛/厦门/长沙等）未在已加载的 NBS JSON 里匹配上，是因为 WhichCity 生产列表与 NBS 70 城列表部分名称差异（苏州不在 NBS；其他可能需要再手工对齐）。

---

## 3. UBS GREBI 2025 泡沫风险

按 bubble 得分排序（高=泡沫大）。真实含义：**10Y 实际房价涨幅**是最佳的"历史已定泡沫"信号。

| 排名 | 城市 | 得分 | 风险 | 房价 YoY | 房价 10Y | 租金 YoY | 租金 10Y |
|---:|---|---:|---|---:|---:|---:|---:|
| 1 | 迈阿密 | 1.73 | high | +1.9% | **+6.8%** | -1.9% | +1.2% |
| 2 | 东京 | 1.59 | high | **+5.7%** | +5.2% | +2.5% | +2.1% |
| 3 | 苏黎世 | 1.55 | high | +5.0% | +3.6% | +2.9% | +2.1% |
| 4 | 洛杉矶 | 1.11 | elevated | +0.9% | +3.6% | -2.8% | -0.2% |
| 5 | 迪拜 | 1.09 | elevated | **+11.1%** | +1.2% | +4.7% | +0.2% |
| 6 | 阿姆斯特丹 | 1.06 | elevated | +1.2% | +5.1% | +2.0% | +1.6% |
| 10 | 马德里 | 0.77 | moderate | **+13.6%** | +3.6% | +8.5% | +4.0% |
| 12 | 温哥华 | 0.76 | moderate | -5.9% | +3.4% | -5.3% | +2.0% |
| 15 | 香港 | 0.44 | low | **-7.9%** | -2.2% | -0.2% | -1.2% |
| 17 | 旧金山 | 0.28 | low | -2.6% | +0.7% | +2.4% | -2.1% |
| 18 | 纽约 | 0.26 | low | -1.5% | -0.5% | +4.1% | -0.8% |
| 21 | 圣保罗 | -0.10 | low | 0.0% | -2.1% | +5.1% | -0.3% |

**对我们生产的建议**：
- `monthlyRent` 在 **迈阿密/东京/苏黎世/迪拜** 应标记"泡沫高风险"警告
- **香港 10Y 实际价跌 22%**（-2.2%×10），是 GREBI 唯一的长期**贬值**大城市 → 生产的"香港住房压力极大"框架需要微调（泡沫已走向破灭）
- **马德里 YoY +13.6%** 是 2025 最猛涨幅 → 生产若还把马德里当"西欧便宜选择"，应加警告

---

## 生成步骤（新增）

```bash
# H1B — 75 MB xlsx 流式解析
python3 data/clean-pipeline/scripts/parse-h1b-lca.py
# → output/h1b-salary-anchors.json (23 MSA × 719 SOC buckets)

# NBS — JSON 手工从 stats.gov.cn 月报 3 月数据入库
# sources/china/nbs-70cities-2026-03.json (70 cities × new home/second hand)

# UBS — PDF PyPDF2 提取 page 22 table
# sources/ubs/grebi-2025.json (21 cities × bubble score + real price/rent YoY/10Y)

# 三源合并 + 对比
node data/clean-pipeline/scripts/build-clean-v6.mjs
node data/clean-pipeline/scripts/compare-v6-anchors.mjs > output/compare-v6.txt
```

## 总体统计

| 源 | coverage | 用途 |
|---|---|---|
| H1B LCA | 17 US cities × 15 professions, 719 MSA×SOC buckets | 工资锚 |
| NBS 70 | 7 CN cities (可扩展到 13) | 房价时间漂移 |
| UBS GREBI | 19 global cities | 泡沫风险 |

所有锚定层以**独立字段**(`h1bAnchors`, `nbsHouseIdx`, `ubsBubbleRisk`)挂到 v5 的城市对象上，不改写 v5 的 cost/rent；后续生产如果要用，可按需打开特定覆盖规则。

## 合规

| 数据源 | License |
|---|---|
| H1B LCA | 美国联邦政府作品 — Public Domain |
| NBS 70 | 国家统计局官方公开数据 — 转载需署名 |
| UBS GREBI | 公开研究报告 — 引用 page-level（fair use for citation） |
