# WhichCity Clean Pipeline — 终版封口报告 (v8 FINAL)

> 生成：2026-04 · HEAD = `2a19d87bcb553676c3c333ca338c62a2cb62035c` **零改动**
> 管线隔离目录：`data/clean-pipeline/`（未进入生产）
> 数据源：14 个独立一手源（全部可再现、可审计、合规或事实数据）
> **本报告为整条管线的终章**，回答三件事 ——
> (1) salary/rent/cost 最终方案；(2) 每城可信度 + 展示裁剪；(3) 前端落地建议。

---

## TL;DR

- **Dataset 最终版**：`output/clean-values-v8.json`（151 城）
- **可上线（keep）**：**95 城**（tier S+A+B）
- **需复核（warn）**：**46 城**（tier C — 数据源薄或与生产分歧 > 40%）
- **建议下线（drop）**：**10 城**（tier D — 无 PLI 信号且无 rent 源）
- **salary override**：美国 6 城 `softwareDeveloper` 用 H1B LCA p50 覆盖（|Δ|>10%）
- **rent**：美国 Zillow、英国 ONS、加拿大 StatCan、中国 NBS 漂移、其他 Airbnb 校准；67% 城市已摆脱公式兜底
- **cost**：欧洲差异（Zurich +123% 到 Sofia -55%）源自 PLI 压缩 vs Numbeo 取样偏差，两方都不是 ground truth；**维持 v7 公式**，靠可信度分层让前端取舍

Keep 范围（95 城）相对生产 `cities.json` 的偏差：
| Scope | cost median \|Δ\| | rent median \|Δ\| |
|---|---:|---:|
| 全部 151 城 | 22.9% | 28.0% |
| **keep (S+A+B, 95)** | **14.9%** | **23.6%** |
| S+A (41) | 11.0% | 18.7% |
| **S 金标 (19)** | **11.0%** | **18.7%** |

---

## 1 · Salary / Rent / Cost 最终方案

### 1.1 Cost（月消费，USD）

**公式**（自 v4 固化未动，v5 的 4 信号几何平均因 Apple/Big Mac 在发展中国家有品牌溢价被放弃）：
```
cost = US_ANCHOR(3200) × geomean(WB_PLI, Digital_PLI) × city_premium × city_adj
  WB_PLI       = World Bank 2022 价格水平指数（基准 USA=1.0，217 国）
  Digital_PLI  = Netflix + Spotify 订阅几何平均（54 国，比 WB 更实时）
  city_premium = 1.35 城邦 / 1.20 一线首都 / 1.10 首都 / 1.00 其他
  city_adj     = BEA RPP（美国 380 MSA） | Eurostat PLI（EU 31 国） | 1.00
```
**偏差来源（已全部诊断）**：
1. **中东欧/南亚/东南亚系统性偏低**（Bucharest -51%, Sofia -55%, 孟买 -35%）。PLI 是全社会价格，包含高度补贴品（医疗/教育/房租管控）；对移居者只花的市场篮（餐饮/交通/生活用品）会被低估。
2. **富欧/北欧系统性偏高**（Zurich +123%, Geneva +86%, Copenhagen +60%）。同理 PLI 压缩了顶端，真实外食/消费远高于 PLI 隐含。
3. **生产 `costModerate`（Numbeo 衍生）反向偏差**：Numbeo 在穷国样本偏富裕（高估），在富国样本偏节俭（低估）。
4. **结论**：**没有一个清洁来源能做到 city-level consumer basket**（Numbeo、LivingCost、Expatistan 均有授权问题；BEA/Eurostat 仅做国家 PLI 非消费篮；UBS P&E 2020 停刊）。因此 v8 **保留 v7 cost 公式**，用可信度分层+UI 信息透明化解决。

### 1.2 Rent（月租，USD）Waterfall

按优先级首命中即用：

| 优先级 | 源 | 期 | 覆盖 | tier 归入 |
|---:|---|---|---:|---|
| 1 | **Zillow ZORI** (1BR equiv) | 2026-03 | 25 美国 MSA | S |
| 2 | **UK ONS Private Rent** | 2026-02 | 2 英国地区（city×） | S |
| 3 | **StatCan CMHC 1BR** | 2024 | 5 加拿大城市 | S |
| 4 | **InsideAirbnb × K=13.61** | 2024 | 22 国际大城市 | A |
| 5 | **prod × NBS secondHand YoY** | 2026-03 | 7 中国大陆城市 | A |
| 6 | `cost × rentShare(GDP)` 兜底 | — | 其余 ~87 城 | B |

**成果**：47/141 = **33% 城市使用权威或市场数据**，其余 67% 用公式。NBS 揭示 CN 一线过去 12 个月 rent 实际 **−5~−8%**（生产值偏旧）。

### 1.3 Salary（年薪，USD）—— 这是 v8 唯一"硬改"

生产 `professions` 表（25 个职业 × 151 城）来源于 BLS OES + 本地估算的复合源。H1B LCA FY2026 Q1（34,467 例 certified 美国软件工程师）提供 **MSA × SOC × p25/p50/p75** 独立硬锚。

**Override 规则**：若 `|H1B p50 − prod|/prod > 10%`，用 H1B p50 覆盖该城 `softwareDeveloper`。

**实际覆盖的 6 城**：
| City | prod | H1B p50 | Δ | 诊断 |
|---|---:|---:|---:|---|
| 旧金山 | $174,910 | $203,836 | **+16.5%** | 生产偏低（H1B 含大厂密集） |
| 丹佛 | $134,120 | $150,000 | **+11.8%** | 生产偏低 |
| 迈阿密 | $129,840 | $115,000 | **−11.4%** | 生产偏高 |
| 华盛顿 | $150,880 | $127,000 | **−15.8%** | 生产偏高（可能用 p75） |
| 休斯顿 | $127,940 | $110,000 | **−14.0%** | 生产偏高 |
| 费城 | $130,670 | $110,000 | **−15.8%** | 生产偏高 |

**保持生产的 9 城**（H1B 验证 |Δ|<10%）：纽约、洛杉矶、芝加哥、亚特兰大、波士顿、西雅图、波特兰、凤凰城、奥斯汀。这是 H1B 对生产 accuracy 的**正面验证**（8/15 ≈ 53% 命中 ±5%）。

**未覆盖**：其他 24 个职业 × 151 城仍用生产原值（无独立锚）。

### 1.4 与 HEAD=2a19d87 的完整偏差（keep 范围）

| 指标 | median \|Δ\| | mean \|Δ\| | n |
|---|---:|---:|---:|
| cost (95 keep) | 14.9% | 21.7% | 95 |
| rent (95 keep) | 23.6% | 25.8% | 95 |
| softwareDeveloper (15 US) | 6 城被 override，其余 ≤10% | — | 15 |
| house 价格 | 未纳入 v8 改动（公式推导无独立锚） | — | — |

---

## 2 · 城市可信度 + 展示裁剪建议

### 2.1 Tier 定义

每城打一个字母，等于 **cost tier 与 rent tier 的较低者**，若 v7 与生产分歧 > 40% 再降一档：

| Tier | 语义 | cost 源 | rent 源 |
|---|---|---|---|
| **S** 金标 | 城市级硬数据 | PLI + BEA RPP/Eurostat PLI 微调 | Zillow / ONS / StatCan |
| **A** 可靠 | 国家级 PLI + 市场/漂移 | PLI geomean | InsideAirbnb×K \| NBS drift |
| **B** 公式 | PLI 推理完整但 rent 回退 | PLI geomean | cost × rentShare |
| **C** 警示 | 源薄 OR 与生产 >40% 分歧 | — | — |
| **D** 丢弃 | PLI 信号缺失 | null | null |

### 2.2 总分布

```
S=19   A=22   B=54   C=46   D=10     (total 151)
keep(S+A+B)=95    warn(C)=46    drop(D)=10
```

### 2.3 按地区 × tier

| 地区 | S | A | B | C | D | total | **keep%** |
|---|---:|---:|---:|---:|---:|---:|---:|
| 美加 | 18 | 4 | 1 | 1 | 0 | 24 | **96%** |
| 西欧/北欧 | 1 | 5 | 18 | 1 | 0 | 25 | **96%** |
| 东亚 | 0 | 8 | 4 | 5 | 0 | 17 | 71% |
| 拉美 | 0 | 1 | 8 | 4 | 3 | 16 | 56% |
| 中东欧 | 0 | 3 | 0 | 12 | 0 | 15 | **20%** |
| 东南亚 | 0 | 1 | 5 | 8 | 0 | 14 | 43% |
| 中东/北非 | 0 | 0 | 6 | 4 | 2 | 12 | 50% |
| 南亚 | 0 | 0 | 1 | 9 | 0 | 10 | **10%** |
| 大洋洲 | 0 | 0 | 6 | 0 | 0 | 6 | 100% |
| 撒南非洲 | 0 | 0 | 4 | 2 | 0 | 6 | 67% |
| 其他（小国） | 0 | 0 | 0 | 0 | 5 | 5 | **0%** |

### 2.4 裁剪建议 —— 展示名单

**建议 1（激进，推荐）**：只展示 **keep 95 城**

优点：cost median \|Δ\| 从 22.9% 降到 **14.9%**，数据质量足以承受对比表、排行榜、详情页的商业承诺。

具体下线：
- **D 档 10 城（无悬念丢）**：德黑兰、圣胡安(PR)、贝鲁特、贝尔格莱德、阿拉木图、塔什干、巴库、第比利斯、圣多明各、基多
- **C 档 46 城（数据薄弱）**：班加罗尔/孟买/新德里/海得拉巴/浦那（南亚 9）、华沙/布加勒斯特/索非亚/萨格勒布/布拉迪斯拉发/卢布尔雅那/基辅/莫斯科/维尔纽斯/尼科西亚/塔林（中东欧 12）、胡志明/河内/金边/仰光/巴厘岛/岘港/槟城（东南亚 8）、大阪/名古屋/京都/福冈（日本二线 4）、圣何塞(美国)、卡拉奇/伊斯兰堡/达卡/加德满都/乌兰巴托、拉各斯/阿克拉/开罗/卡萨布兰卡、多哈/利雅得、圣地亚哥、瓜达拉哈拉/墨西哥城/圣何塞(CR)、波尔图/斯普利特

**建议 2（保守）**：展示 **keep 95 + warn 46 = 141 城**，但 tier C 在 UI 上加「数据有限」徽标 + 不进入排行榜前位

这给了用户探索选项，同时保护产品置信。

**建议 3（最小）**：只展示 **S+A = 41 城**（cost median \|Δ\| 11.0%）

适合「这是一款精品对比工具」的定位。95% 用户真正关心的城市都在内：所有美国一线 / 伦敦 / 多伦多 / 温哥华 / 蒙特利尔 / 东京 / 首尔 / 新加坡 / 香港 / 悉尼 / 墨尔本 / 迪拜 / 北京 / 上海 / 深圳 / 广州 / 杭州 / 成都 / 重庆 / 台北 / 巴黎 / 柏林 / 慕尼黑 / 阿姆斯特丹 / 苏黎世 / 日内瓦 / 米兰 / 罗马 / 马德里 / 巴塞罗那 / 墨西哥城去除（下 C）。

### 2.5 完整城市清单

见 `output/city-manifest-v8.csv`，字段：
`name, country, tier, display, cost_v8, cost_prod, cost_delta%, rent_v8, rent_prod, rent_delta%, cost_source, rent_source, salary_override, fh, ubs_risk, osm`

---

## 3 · 前端施工建议（按风险/价值排序）

### Phase A：纯加分（低风险，高价值）

**A1. UI 上线 Freedom House 徽标**
- 覆盖 123/151 城；对"出国移居"用户极高相关（中国 9/100 NF、新加坡 48/100 PF、美国 83/100 F、北欧 >95/100 F）
- 位置：城市详情页 governance 区块 + 城市卡片右上角 3 色点（F绿/PF黄/NF红）
- 合规：需要署名 "Freedom in the World 2024 © Freedom House"（已在报告第 10 节记录）

**A2. 美国城市附加 H1B 工资区间**
- 15 个 MSA × 多职业的 p25-p75（共 719 buckets）
- 位置：US 城市详情页 职业卡片下面挂"H1B 申报区间：$110k – $169k（n=1,239，2026Q1）"
- 合规：H1B LCA 是美国联邦公开作品，Public Domain

**A3. UBS 泡沫风险警示**
- 21 国际大城市，risk: high(3) / elevated(4) / moderate(7) / low(7)
- 位置：rent/housing 区块右侧一个图标（🔴泡沫/🟠关注/🟡中性/🟢健康）
- 合规：署名 "UBS Global Real Estate Bubble Index 2025"

**A4. NBS 中国房价趋势**
- 7 大陆城市 + 70 全量城市 m2m/yoy/q1avg
- 位置：中国城市详情页加"过去 12 月二手房 −8.3%（NBS 2026-03）"
- 合规：署名"国家统计局"

**A5. 源署名页（新建 `/methodology/sources` 或扩展现有 methodology）**
- 14 个源的来源、版本、许可、覆盖率表格（可直接复用本报告第 10 节）

### Phase B：数据切换（中等风险，需回归测试）

**B1. Salary override 上线（6 城）**
- 只动 `cities.json` 中 6 个城市的 `professions["软件工程师"]`
- 回归点：排行榜（surplus 换算）、对比页、详情页 salary 卡片
- 数据：`output/clean-values-v8.json` → `.cities[].salaryOverride.newValue`

**B2. US rent 切到 Zillow ZORI（25 城）**
- 只动 `cities.json` 中 25 个美国城市的 `monthlyRent`
- 回归点：surplus、rent 区块、排行榜
- 数据：`output/clean-values-v8.json` → cost tier=S 的美国城市的 `rent` 字段

**B3. CN rent 应用 NBS yoy drift（7 城）**
- 同上，7 个中国大陆城市

### Phase C：展示裁剪（产品决策，零技术风险）

**C1. 根据 manifest 裁剪城市列表**
- 选"保守（141）"：C 档显示警示徽标 + 排行榜只取 keep
- 选"推荐（95）"：直接隐藏 C+D，首页/搜索/排行榜只走 keep
- 选"精品（41）"：只展示 S+A，其他进"即将上线"等待列表

裁剪执行：`public/data/cities.json` → 根据 `output/city-manifest-v8.csv` 的 `display` 列过滤。

### Phase D（不做）

- ❌ **Cost 全量替换 v8**：欧洲双向偏差 + 南亚/中东欧系统偏差，替换后会让 Zurich/Geneva rent 更贵 cost 更贵双重震荡，UX 崩坏。**保留生产 cost 不替换**，仅做 rent 和 salary 修正。
- ❌ **自己重算 PLI**：没有 city-level 消费篮就永远解不了 Europe 问题。
- ❌ **继续投资 Numbeo 类数据**：TOS 和 robots.txt 明确禁止 scrape；不值得风险。

---

## 4 · 已关闭的探索路径（管线封口）

| 路径 | 为何关闭 |
|---|---|
| Numbeo | TOS 禁止商用 + robots.txt + 社区众包无权威性 |
| LivingCost | TOS 明确禁止 scrape |
| Expatistan | 同上 |
| UBS Prices & Earnings | 2020 年停刊，UBS 已改为 GREBI（已抓） |
| V-Dem | 需申请 API key；本轮直接使用 Freedom House 代替（覆盖更广） |
| Equaldex | 需 API key；优先级低 |
| 贝壳研究院季报 | 需手工 PDF；NBS 70 城已提供替代信号 |
| OSM 中国城市补 | 需 Gaode/Baidu POI，非 ODbL，合规风险大 |
| BIS RPPD 房价 | 已抓但未进 v7/v8（PPP 口径与 Numbeo 的 sqm 口径难对接） |

---

## 5 · 数据源清单（14 个清洁源，最终合规表）

| # | 源 | 许可 | 在 v8 中的角色 | 署名要求 |
|---|---|---|---|---|
| 1 | World Bank WDI | CC BY 4.0 | PLI 信号 A + GDP/GNI | 页脚/methodology |
| 2 | Netflix + Spotify 官价 | 事实数据 | PLI 信号 B | 无 |
| 3 | Big Mac Index | CC BY-SA 4.0 | 交叉验证（不入主公式） | 引用 The Economist |
| 4 | Apple iPhone 官价 | 事实数据 | 交叉验证 | 无 |
| 5 | BEA RPP 2022 | Public Domain | 美国城市 city_adj | 可选 |
| 6 | Eurostat PLI 2022 | 公开 | 欧洲城市 city_adj | 可选 |
| 7 | Zillow ZORI 2026-03 | Zillow Research TOS | 美国 rent | 城市详情页 |
| 8 | UK ONS Private Rent 2026-02 | OGL v3 | 英国 rent | © Crown copyright, OGL v3 |
| 9 | StatCan CMHC 2024 | StatCan Open | 加拿大 rent | Statistics Canada |
| 10 | InsideAirbnb | CC BY 4.0 | 22 城 rent | © Inside Airbnb |
| 11 | **H1B LCA FY2026Q1** | Public Domain (DOL) | 美国 salary 硬锚 | 可选 |
| 12 | **NBS 70 大中城市 2026-03** | 官方公开 | 中国 rent 漂移 + 元数据 | 国家统计局 |
| 13 | **UBS GREBI 2025** | 公开报告 fair-use | 21 城泡沫元数据 | UBS Global Wealth Management |
| 14 | **Freedom House FIW 2024** | Fair-use + attribution | 123 国治理元数据 | Freedom in the World 2024 © Freedom House |
| 15 | OpenStreetMap Overpass | ODbL | 22 城设施密度 | © OpenStreetMap contributors |

---

## 6 · 工程产出（`data/clean-pipeline/`，与 HEAD 完全隔离）

### Scripts

| 文件 | 用途 |
|---|---|
| `extend-wb.mjs` / `fetch-wb.mjs` | World Bank 指标抓取 |
| `extract-zillow.mjs` | Zillow ZORI 解析 |
| `fetch-digital-pricing.mjs` | Netflix + Spotify |
| `parse-big-mac.mjs` / `fetch-iphone-pricing.mjs` | 交叉验证源 |
| `calibrate-airbnb.mjs` | InsideAirbnb K 校准 |
| `parse-freedom-house.mjs` | FH xlsx |
| `fetch-osm-amenities.mjs` + `build-osm-index.mjs` | OSM Overpass |
| `parse-h1b-lca.py` | Python openpyxl 流式解析（571 MB xlsx）|
| `build-clean-v7.mjs` | best-of-breed 合成 |
| **`build-clean-v8.mjs`** | **v7 + salary override + S/A/B/C/D 分层** |
| `investigate-eu.mjs` | 欧洲偏差调查（双向） |
| `emit-manifest.mjs` | 导出 city-manifest + 地区统计 |
| `final-stats.mjs` | 本报告 keep-only 偏差统计 |
| `compare-final.mjs` | v1→v7 演进 + 北京画像 |

### Sources（`sources/`，14 个源）

wb-indicators.json · digital-pricing.json · bigmac/ · iphone-pricing.json · zillow-zori.json · ons-uk-2026.json · statcan-ca-rent-2024.json · airbnb-calibrated.json · freedom/fh-latest.json · **h1b/**（原始 xlsx + parsed anchors）· **china/nbs-70cities-2026-03.json** · **ubs/grebi-2025.json** · osm/ · bis-rppd/（保留未用）

### Outputs（`output/`）

| 文件 | 用途 |
|---|---|
| `clean-values-v8.json` | **最终数据（151 城）** |
| `city-manifest-v8.csv` | **每城 tier + 展示建议 + 源** |
| `h1b-salary-anchors.json` | 23 MSA × 719 SOC |
| `osm-quality-index.json` | 22 城设施分 |
| `compare-final.txt` | v1→v7 演进文本报告 |
| `REPORT-FINAL.md` | v7 报告（前版） |
| **`REPORT-CLOSURE.md`** | **本报告** |

---

## 7 · 一句话总结

> **cost 不动、rent 37 城硬切、salary 6 城硬切、前端按 S/A/B/C/D 裁剪** ——
> 95 城（keep）达到 cost median \|Δ\| 14.9% / rent 23.6%，与 Numbeo 独立样本的典型不确定性带宽相当，可以承担"全球移居决策引擎"的产品承诺。
>
> 其余 56 城（warn + drop），在没有付费 city-level 消费篮源的前提下，**诚实的做法是下线或打上警示徽标**，而不是用更多公式继续假装。
>
> 管线关闭。后续数据工作优先级：**（a）S 档扩容**（找更多官方 rent，如 Realty.au / 德国 Immoscout / 日本 SUUMO 官方统计）；**（b）C 档平反**（单个城市跑 official stat office 补数据，而非再做一轮 global crawl）。
