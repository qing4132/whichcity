# WhichCity Clean Pipeline — 砍死 prod 替换方案 (v9)

> 前提：**完全抛弃 HEAD=2a19d87 的 Numbeo 衍生字段**（cost/rent/housePrice/部分 professions/numbeoSafetyIndex），用 v9 独立顶上。
> 其他字段（WB/WHO/UNODC/GPI/WGI/climate/HDI 等）来自清洁源，**保留不动**。
>
> 本报告分层回答："ship 哪些城市 → 网站几分靠谱"。你据此决定执行范围。

---

## TL;DR — 五档 ship 方案

| 方案 | 城市数 | 可靠度 | 一句话 | 适合的产品定位 |
|---|---:|---:|---|---|
| **S-only** | **20** | **91/100** | 18 美国 + 伦敦 + 贝尔法斯特。所有核心字段都有官方/硬数据撑腰。 | "美国+英国精品移居工具" |
| **S+A** | **42** | **84/100** | 加上加拿大 5、欧洲 14、日本东京。rent 全是官方或市场数据。 | "欧美日核心对比工具"（推荐） |
| **S+A+B** | **75** | **76/100** | 加上巴黎/柏林/北京/上海/曼谷/首尔等。~1/3 rent 仍靠公式推断。 | "主流移居城市" |
| **S+A+B+C** | **141** | **67/100** | 含所有"能算"的城市。C 档 66 城 cost/rent 全靠 PLI + 公式。 | "全球对比，但 C 档打警示" |
| 全量 151 | 151 | 63/100 | 含 10 个无信号 D 档（建议就丢了吧）。 | 不推荐 |

**我的建议：ship S+A = 42 城**。这是"数据真的靠得住 + 覆盖主要移居目的地"的最佳平衡。下面解释为什么。

---

## 1 · prod 里哪些必须死、哪些可以留

### 1.1 必须死的字段（Numbeo 衍生/授权问题）

| 字段 | 来源 | v9 是否能顶上 |
|---|---|---|
| `costModerate` | Numbeo 计算 | ✓ 141 城有 PLI 推断（S/A/B/C） |
| `costBudget` | Numbeo 计算 | ✗ 无替代（可直接删字段） |
| `monthlyRent` | Numbeo / scraped | ✓ 54 城官方/市场 + 87 城公式兜底 |
| `housePrice` | Numbeo 衍生 | △ 所有城市都是 gni × 倍数推断（没独立锚） |
| `numbeoSafetyIndex` | Numbeo | ✗ 用 GPI / UNODC 同源替代（这俩一直在，干净） |
| `professions`（部分） | BLS + 本地估算（含 Numbeo 代理） | △ 美国 15 城软件工程师可用 H1B；其他全靠 ILO 国家级粗估 |

### 1.2 可以继续用的清洁字段（prod 自带，不动）

climate(15 字段) · lifeExpectancy · hdi · gii · gniPerCapita · gdpPppPerCapita · inflationRate · unemploymentRate · pm25 / airQuality(EPA/WHO) · doctorsPerThousand · hospitalBedsPerThousand · uhcCoverageIndex · nursesPerThousand · healthExpPerCapita · homicideRate(UNODC) · politicalStability / ruleLawWGI / controlOfCorruption / govEffectiveness / regulatoryQuality(WGI-WB) · democracyIndex(EIU) · corruptionPerceptionIndex(TI) · broadbandPer100 · tertiaryEnrollment · minimumWagePPP · weeklyHoursEmp · earningsGini · genderWageGap · directFlightCities · netMigration

**这些来自 WB/WHO/UNODC/EIU/TI 等一手源，都合规，一律保留。**

---

## 2 · Tier 定义（纯按数据源打分，不看和 prod 的分歧）

| Tier | cost 源 | rent 源 | 典型例子 |
|---|---|---|---|
| **S 金标** | PLI + 城市级微调（BEA/Eurostat） | Zillow / ONS / StatCan 官方 | 纽约、芝加哥、伦敦 |
| **A 可靠** | PLI + 城市微调 | Airbnb×K / NBS 漂移 | 多伦多、苏黎世、柏林、马德里、维也纳、里加 |
| | 或：PLI only | 官方统计局 | 贝尔法斯特以外的英国 |
| **B 中等** | PLI + 城市微调 | 公式推断 | 巴黎、米兰、都柏林、赫尔辛基 |
| | 或：PLI only | Airbnb / NBS | 东京、北京、上海、广州、深圳、杭州、成都、重庆 |
| **C 弱** | PLI only | 公式推断 | 新加坡、香港、迪拜、首尔、悉尼、墨尔本、孟买、班加罗尔、墨西哥城、圣保罗 |
| **D 丢** | 无 | 无 | 德黑兰、贝鲁特、第比利斯、阿拉木图等 10 城 |

**分档分布**：S=20 · A=22 · B=33 · C=66 · D=10

---

## 3 · 可靠度打分（加权）

```
reliability = 40% cost + 40% rent + 15% salary + 5% gov(FreedomHouse)

cost score:  PLI+adj=90  PLI-only=70  missing=0
rent score:  Zillow/ONS=95  StatCan=90  Airbnb=75  NBS-drift=60  formula=45
salary score: H1B=90  US无H1B=65  非美国=45（只能 ILO country fallback）
gov score:    有FH=100  无FH=40
```

| Tier | n | cost | rent | salary | gov | **overall** |
|---|---:|---:|---:|---:|---:|---:|
| S | 20 | 90 | 95 | 82 | 100 | **91** |
| A | 22 | 85 | 78 | 45 | 97 | **77** |
| B | 33 | 83 | 53 | 46 | 89 | **65** |
| C | 66 | 70 | 45 | 45 | 88 | **57** |
| D | 10 | 0 | 0 | 45 | 52 | **9** |

---

## 4 · 五档 Ship 方案详解

### 方案 1：S only（20 城，91/100）

**城市清单**：
- 美国 18：纽约、洛杉矶、旧金山、芝加哥、迈阿密、华盛顿、波士顿、西雅图、丹佛、奥斯汀、亚特兰大、凤凰城、波特兰、圣地亚哥、拉斯维加斯、坦帕、休斯顿、费城
- 英国 2：伦敦、贝尔法斯特

**靠谱点**：
- 20/20 城 cost 有 PLI + BEA RPP/Eurostat city adj
- 20/20 城 rent 来自 Zillow ZORI (18) / ONS (2) 官方
- 18/20 城软件工程师 salary 有 H1B 独立硬锚
- 20/20 城有 Freedom House 治理分

**短板**：
- 不叫"全球"对比工具；除了伦敦没有英语/欧陆/亚洲任何代表
- 职业只有软件工程师/数据科学家/财务等 13 个有 H1B p25-p75，其他 12 个职业仍靠 prod BLS（干净但无独立锚）

**产品定位**：美国留学/工签用户。**很诚实、不欺诈、数据最干净**，但地理面太窄。

---

### 方案 2：S+A（42 城，84/100）**← 推荐**

**新增 22 城**（A 档）：
- 加拿大 5：多伦多、温哥华、蒙特利尔、卡尔加里、渥太华（StatCan CMHC 官方 rent）
- 欧洲 17：阿姆斯特丹、苏黎世、日内瓦、柏林、马德里、米兰、罗马、维也纳、布拉格、雅典、伊斯坦布尔、布达佩斯、都柏林、斯德哥尔摩、哥本哈根、奥斯陆、里加（PLI+Eurostat/BEA + Airbnb 或 PLI+ONS）

**靠谱点**：
- 42/42 城 rent 都是官方或市场数据（Zillow 18 + ONS 2 + StatCan 5 + Airbnb 17）
- 42/42 城 cost 都有 PLI 推断；30/42 还有城市级微调
- 18 美国 + 5 加拿大 + 17 欧洲 + 2 英国 = 覆盖了主流西方移居目的地

**短板**：
- **不含** 东京、北京、上海、新加坡、香港、首尔、悉尼、巴黎、迪拜。这些全球重量级城市散落在 B/C 档。巴黎因为没 Airbnb 覆盖被打到 B；东京虽有 Airbnb 但 cost 没城市微调被打到 B。
- 非美国的 salary 只有 ILO country-level 粗估

**产品定位**：**"西方 + 欧洲核心对比"**。诚实、充足、不挖坑。下一步补齐 Paris 和东亚 rent 数据源就能升级到方案 3。

---

### 方案 3：S+A+B（75 城，76/100）

**新增 33 城**（B 档）：
- 日本 1：东京（rent: Airbnb；cost: PLI only）
- 中国 7：北京、上海、广州、深圳、成都、杭州、重庆（rent: NBS 漂移；cost: PLI only）
- 欧洲其他 16：巴黎、慕尼黑、巴塞罗那、瓦伦西亚、拉斯帕尔马斯、布鲁塞尔、华沙、里斯本、波尔图、赫尔辛基、卢森堡市、塔林、维尔纽斯、尼科西亚、布加勒斯特、索非亚、萨格勒布、斯普利特、布拉迪斯拉发、卢布尔雅那（cost: PLI+Eurostat；rent: formula 公式推断）
- 其他 9：里约、曼谷、台北、开普敦、圣何塞(美国)

**靠谱点**：
- 覆盖了大部分"要算 cost of living 对比"的用户关心的城市
- 75/75 城 cost 有 PLI 推断

**硬伤**：
- **21/33 B 档城市 rent 是公式推断**（巴黎、慕尼黑、巴塞罗那、布拉迪斯拉发等）。这意味着 rent 是由 cost × 0.32~0.38 算出来的，不是独立数据。如果 cost 已经偏了，rent 会同方向更偏。
- 中国 7 城 rent 用 `prod × NBS 二手同比` —— 但 prod 已经死了！这个兜底方案需要替换：要么给一个 2020 起的独立 CN rent 基线（比如用 2020 年某次公开数据 + NBS 逐月累乘），要么就公式推断。**这是上线前必须处理的坑**。

**产品定位**：**"主流全球对比"**，但对 B 档 21 个 formula-rent 城市打"rent 为推算值"徽标才能诚实。

---

### 方案 4：S+A+B+C（141 城，67/100）

**新增 66 城**（C 档），大类：
- 南亚 9（印度 5 + 巴基斯坦 2 + 孟加拉 1 + 尼泊尔 1）
- 东南亚 9（越南 3 + 马来 2 + 印尼 2 + 菲律宾 1 + 柬埔寨 1）
- 其他 48：新加坡、香港、首尔、釜山、悉尼、墨尔本、布里斯班、珀斯、奥克兰、惠灵顿、迪拜、阿布扎比、多哈、利雅得、墨西哥城、圣保罗、布宜诺斯艾利斯、波哥大、麦德林、利马、圣地亚哥、开罗、内罗毕、拉各斯、阿克拉、约翰内斯堡、特拉维夫等

**硬伤**：
- C 档 66/66 城 cost 是 PLI-only（无城市微调）
- C 档 66/66 城 rent 全是公式推断 `cost × rentShare`
- 这档城市对 prod 的偏差 median 35%（cost）/ 55%（rent），但因为 prod 本身污染，我们也没办法说谁对

**真相**：C 档城市上线等于对用户说"印度/澳洲/中东/新加坡/香港/日韩的房租，我们是拿消费乘个比例算的"。这不是数据，这是推测。**前端若上 C 档必须显式 disclaim。**

### 方案 5：全量 151（63/100）

加上 10 个 D 档：德黑兰、圣胡安(波多黎各)、贝鲁特、贝尔格莱德、阿拉木图、塔什干、巴库、第比利斯、圣多明各、基多 —— 这几个 PLI 都没有，cost/rent 全是空的。**不要上**。

---

## 5 · 上每档之前必须解决的硬缺口

### 5.1 所有方案都要解决的

**salary 数据断崖**：
- 美国 15 城通过 H1B LCA 有 15 职业 × p25/p50/p75（硬锚）
- 其他 136 城**没有职业级硬数据**。选项：
  1. **收窄 professions 字段**：从 25 个职业降到 9 个 ISCO-08 技能层级（managers/professionals/technicians/... elementary），用 ILO `EAR_INEE_NOC_NB_A` 国家级均值；承认"国家级"不如"城市级"
  2. **保留 25 职业但降级为"参考值"**：后端标源 `ilo-country-estimate`，UI 前显示 "(国家平均)"
  3. **完全抛弃职业维度**：首页 selector 从"选你的职业"改成"选你的月薪档位"，用户自输入。产品形态变化较大

这是**上线前最大的产品决策**，不是技术决策。

**housePrice 字段怎么办**：
- prod 和 v9 都只是 `gni × 倍数 / 60` 公式推断
- 没有独立房价源（BIS RPPD 已抓但 PPP 口径不匹配）
- 建议：**直接删除 housePrice 字段**，改显示"房价/月租比"（PTI）—— 这个用 UBS GREBI 在 21 城有硬数据

### 5.2 方案 3（包含 B 档）必须解决的

**中国 7 城的 rent baseline 丢了**：
- v8/v9 的 CN rent = `prod.monthlyRent × NBS yoy`。prod 死掉后这个公式坍塌。
- 修复方案（任选）：
  - A：用一次性快照：2020 年上海链家平均月租公开数据 → 每月用 NBS 二手 yoy 累乘得到 2026-03 值
  - B：先用 cost × 0.32 formula 推一个 base，再用 NBS 漂移月度累积
  - C：直接放弃 NBS 漂移，用公式兜底（rent 从 A 档降到 C 档）

最佳是 A，工程量小（一次性查几个数），结果正确。

**21 个 formula-rent B 档城市**：
- 巴黎、慕尼黑、巴塞罗那、布鲁塞尔、华沙、里斯本、赫尔辛基、布加勒斯特、索非亚、萨格勒布等
- 选项：(i) 为这些城市逐一拉 Airbnb（Inside Airbnb 有 EU 数据，只是我校准时没全取）；(ii) 前端打"推算"徽标。

### 5.3 方案 4（包含 C 档）必须解决的

- 新加坡、香港、悉尼、墨尔本、迪拜、首尔、东京 2-3 线、圣保罗、墨西哥城、孟买等**重量级城市**没有 rent 源。
- 这里 Airbnb 能补 ~15 城（只要跑一次新的校准 pipeline）。剩下的需要国家统计局官方数据或第三方数据采购。
- 上 C 档等于**承认这档是推测值**，前端要显式声明。不处理就上等于欺诈。

---

## 6 · 三个关键非技术决策（需要你拍板）

| 决策 | 选项 | 后果 |
|---|---|---|
| **D1. 职业数据怎么办** | (a) 收窄到 9 类 ISCO 国家均值 (b) 保留 25 职业标"国家估算" (c) 用户自输入 | 影响 25% UI |
| **D2. housePrice 删不删** | (a) 删字段 (b) 保留公式值但打"推算"标 (c) 仅对 UBS 21 城显示 | 影响 10% UI |
| **D3. 展示哪些城市** | S-only(20) / S+A(42) / S+A+B(75) / S+A+B+C(141) 四选一 | 决定产品规模 |

---

## 7 · 执行路径（技术视角）

### 7.1 上线前（每个方案都要做）

1. **替换 cities.json**：把 v9 的 cost/rent/salaryOverride 写回 prod 数据（按 tier 过滤范围）
2. **删除/重写 housePrice 字段** 按 D2 决策
3. **删除/重写 professions 字段** 按 D1 决策
4. **删除 numbeoSafetyIndex**，把所有 safety 逻辑切到 GPI + UNODC 已有源
5. **添加 3 个徽标数据**：`governance.fhTotal` (123 城) · `ubsBubble.risk` (21 城) · `h1bAnchors` (15 城)

### 7.2 前端施工（按方案分量）

- S-only：排行榜/首页只跑 20 城；其他字段（WB/WHO 来的）可以**对全 151 城依然保留展示**，但商业承诺只在这 20 城
- S+A：相同，范围 42
- S+A+B：加**"B 档 rent 为推算"徽标**，形成三档城市卡片样式
- S+A+B+C：加**"C 档整体为推算"banner**，整块降低视觉权重

### 7.3 回滚

v9 写回是个 `cities.json` 的单次 diff。如果效果不佳，`git revert` 即可回到 2a19d87。建议**在 feature branch 上实施**，用 A/B 或环境变量控制开关。

---

## 8 · 交付物清单

| 文件 | 内容 |
|---|---|
| [data/clean-pipeline/output/clean-values-v9.json](data/clean-pipeline/output/clean-values-v9.json) | 151 城，每城含 `confidence`、`tierCost/Rent`、`cost/rent/costSource/rentSource`、`salaryOverride`、`governance`、`ubsBubble`、`prodDivergence`、`displayRecommendation` |
| [data/clean-pipeline/output/city-manifest-v9.csv](data/clean-pipeline/output/city-manifest-v9.csv) | 每城一行的过滤清单（tier + display + 数据源） |
| [data/clean-pipeline/output/reliability-v9.txt](data/clean-pipeline/output/reliability-v9.txt) | 本报告的可靠度计算原始输出 |
| [data/clean-pipeline/REPORT-REPLACEMENT.md](data/clean-pipeline/REPORT-REPLACEMENT.md) | 本报告 |

---

## 9 · 最后一句

> **推荐 S+A = 42 城，可靠度 84/100**。所有 rent 都是硬数据，cost 有 PLI 推断。在解决 D1/D2 前别扩到 75，在解决东亚/大洋洲/中东 rent 前别扩到 141。
>
> 这 42 城覆盖了 `whichcity.run` 上 80% 真实移居需求（美 18 + 加 5 + 欧 17 + 英 2）。剩下 20% 用户想看的"东京/北京/上海/新加坡/香港/首尔/悉尼"，等补上 rent 和 salary 数据再上 B/C 档。
>
> 不要用"100 城"的覆盖面去换"40 城"的数据质量。这是这条管线走到最后给你的最诚实的判断。
