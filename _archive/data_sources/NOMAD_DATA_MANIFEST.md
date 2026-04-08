# 数字游民功能 — 数据清单、来源、采集方法与现状

> **创建**: 2026-04-09  
> **用途**: 数据验证 / 数据更新 / 新增数据 / 方法论页面撰写 / 免责声明 / 项目文档更新 / 下次开发工作查阅  
> **数据文件位置**:
> - `_archive/data_sources/nomad-research-2025.json` — 主研究文件 (754 行)
> - `_archive/data_sources/nomad-research-supplement-2025.json` — 补充文件 (385 行)
> **黄金原则**: 所有数据均为实际采集，未捏造。未采集到的标记为 `null`。

---

## 目录

| 章节 | 内容 |
|------|------|
| [1. 数据总览](#1-数据总览) | 覆盖范围与统计摘要 |
| [2. 数据来源逐项说明](#2-数据来源逐项说明) | 每个数据集的来源、年份、采集方法、有效期 |
| [3. 文件结构与字段说明](#3-文件结构与字段说明) | JSON 结构、字段含义 |
| [4. 数据质量与已知问题](#4-数据质量与已知问题) | 精度、偏差、缺失、注意事项 |
| [5. 仍缺失的数据](#5-仍缺失的数据) | 下次要补采的内容 |
| [6. 更新与验证指南](#6-更新与验证指南) | 如何重新采集、验证、更新 |
| [7. 免责声明草稿](#7-免责声明草稿) | 可用于方法论页面的措辞 |
| [8. 采集过程时间线](#8-采集过程时间线) | 两次采集会话的详细记录 |

---

## 1. 数据总览

### 1.1 整体覆盖

| 维度 | 覆盖量 | 说明 |
|------|--------|------|
| 国家 | 79 国 | 与项目 134 座城市所属国家一致 |
| 城市 | **130/134** 在 nomads.com 有数据 | 4 城无页面（Irvine、San Jose CR、Luxembourg City、Incheon） |
| EF EPI 英语水平 | **67/79** 国有分数 | 6 国 native English，5 国不在 EPI 索引，1 国确认不在索引 |
| 数字游民签证 | **27 国** 有专门签证 | 其中 23 国有详细信息，4 国细节仍缺失 |
| 签证免签停留 | **79/79** 国完整 | 基于强护照（US/EU/UK）视角 |
| Nomads.com 城市评分 | **130 城** | 游民评分(x/5)、排名、月成本、网速、英语水平、评论数 |
| 游民保险价格 | **1 家** (SafetyWing) | Essential 和 Complete 两个方案 |

### 1.2 数据集一览

| 数据集 | 存储位置 | 数据年份 | 采集日期 |
|--------|----------|----------|----------|
| EF EPI 英语水平 | nomad-research-2025.json | **2025 版** | 2026-04-01 + 2026-04-08 验证 |
| 数字游民签证信息 | nomad-research-2025.json | **2025-2026** | 2026-04-01 |
| 游民签证补充细节 | nomad-research-supplement-2025.json | **2025-2026** | 2026-04-08 |
| Nomads.com 城市数据 | nomad-research-supplement-2025.json | **实时**（2026-04-08 快照） | 2026-04-08 |
| 签证免签停留天数 | nomad-research-supplement-2025.json | **2025-2026** 政策 | 2026-04-08 |
| SafetyWing 游民保险 | nomad-research-supplement-2025.json | **2026-04** 价格 | 2026-04-08 |

---

## 2. 数据来源逐项说明

### 2.1 EF EPI 英语水平指数

| 项目 | 详情 |
|------|------|
| **来源** | EF Education First — English Proficiency Index 2025 |
| **官方 URL** | `https://www.ef.com/epi/` |
| **数据年份** | EF EPI **2025 版**（基于 2024 年测试数据） |
| **采集方法** | 使用 `fetch_webpage` 工具抓取 ef.com/epi 完整排名页面 |
| **采集日期** | 初次: 2026-04-01；二次验证: 2026-04-08 |
| **覆盖范围** | EF EPI 2025 索引共 **123 个国家/地区**，我们的 79 国中有 63 国有分数 |
| **数据粒度** | 国家级分数（400-700 分制 + Band 等级）；少数国家有城市级分数 |
| **有效期** | EF EPI 每年发布一次，当前版本有效至 **2026 年底** EF 发布 2026 版 |
| **特殊处理** | 6 个英语母语国(US/UK/AU/CA/IE/NZ)标记为 `"native"`，不在 EPI 排名中；新加坡 2025 年被重新归类为 native |
| **二次验证修正** | 3 个分数在 2026-04-08 验证时发现偏差并已修正：乌兹别克斯坦 439→429、约旦 426→425、塞尔维亚 579→578 |
| **不在索引中的国家** | 台湾、波多黎各(US 领土)、巴林、卢森堡、斯洛文尼亚（2026-04-08 确认） |
| **Band 等级定义** | very_high (600+), high (550-599), moderate (500-549), low (450-499), very_low (<450) |
| **更新频率建议** | 每年 11-12 月 EF 发布新版后更新 |

**城市级分数已采集的城市**:
- Shanghai 527, Tokyo 480, New Delhi 407, Bangkok 467, Mexico City 428, Berlin 625, Amsterdam 630, Stockholm 633, Copenhagen 644, Vienna 634

### 2.2 数字游民签证信息

| 项目 | 详情 |
|------|------|
| **来源 1** | Wikipedia — "Digital nomad" 条目 (2026-03-23 revision) |
| **来源 1 URL** | `https://en.wikipedia.org/wiki/Digital_nomad` |
| **来源 2** | VisaGuide.World — Digital Nomad Visa 各国页面 |
| **来源 2 URL** | `https://visaguide.world/digital-nomad-visa/` |
| **来源 3** | VisaGuide Digital Nomad Index |
| **来源 3 URL** | `https://visaguide.world/digital-nomad-visa/digital-nomad-index/` |
| **数据年份** | **2025-2026** 政策（签证政策变动频繁） |
| **采集方法** | 使用 `fetch_webpage` 抓取 Wikipedia 引用的各国签证页面 + VisaGuide 各国专页 |
| **采集日期** | 初次: 2026-04-01；补充: 2026-04-08 |
| **覆盖范围** | 79 国均有结果：27 国有签证/类似项目，52 国无 |
| **采集字段** | has_visa、visa_name、duration_months、min_income_usd、tax_on_foreign_income、renewable |
| **有效期** | 签证政策变化快，建议 **每 6 个月全量验证一次** |
| **已知变动** | 格鲁吉亚 "Remotely from Georgia" 项目于 2025-01 疑似暂停；南非签证已公布但尚未实施 |

**2026-04-08 补充采集的签证详情（来源: visaguide.world）**:

| 国家 | 最低月收入 | 外国收入税率 | 最长时长 | 数据来源 URL |
|------|-----------|-------------|---------|-------------|
| 韩国 | $5,113 | 6%-35% | 24 月 | visaguide.world/digital-nomad-visa/south-korea/ |
| 爱沙尼亚 | $4,900 | 20%（>183 天） | 12 月 | visaguide.world/digital-nomad-visa/estonia/ |
| 格鲁吉亚 | $2,000 | 20% | 12 月 | visaguide.world/digital-nomad-visa/georgia/ |
| 希腊 | $3,800 | 0%（<183 天） | 12 月 | visaguide.world/digital-nomad-visa/greece/ |
| 马来西亚 | $2,000 | 0% | 12 月 | visaguide.world/digital-nomad-visa/malaysia/ |
| 日本 | $5,667 | 0% | 6 月 | visaguide.world/digital-nomad-visa/japan/ |

**未能采集到详情的国家**: 土耳其（VisaGuide 重定向到黄金签证页）、菲律宾（重定向到退休签证）、意大利（重定向到退休签证）、印尼（重定向到通用列表页）

### 2.3 Nomads.com（原 NomadList）城市数据

| 项目 | 详情 |
|------|------|
| **来源** | Nomads.com（原 NomadList / nomadlist.com，域名已切换） |
| **官方 URL** | `https://nomads.com/` + `/{city-slug}` |
| **数据性质** | **众包 + 算法加权**。基于用户评论、投票、公开数据源，由 NomadList 算法生成 |
| **数据时间** | **实时数据的快照**，采集于 2026-04-08 |
| **采集方法** | 使用 `fetch_webpage` 和 `runSubagent` 分批抓取各城市页面；每批 3-14 个城市 |
| **采集日期** | 2026-04-08（一天内分 8 批完成） |
| **覆盖范围** | 134 城中 **130 城**有 nomads.com 页面。缺 4 城 |
| **采集字段** | Nomad Score (x/5), Global Rank (#), Nomad Cost ($/mo), Internet Speed (Mbps), English Speaking (Bad/Okay/Good/Great), Reviews Count |
| **有效期** | Nomads.com 实时更新，此快照时效性 **约 3-6 个月**。成本数据建议 **每年更新一次** |
| **重要注意** | "Nomad Cost" 是包含租金+餐饮+联合办公+交通的**总成本**，非单独联合办公成本 |
| **冲突地区处理** | 6 个城市因冲突/政治不稳定被 nomads.com 降至 0.56/5 分: Tel Aviv、Tehran、Beirut、Yangon、Moscow、Kyiv |
| **数据偏差** | nomads.com 代表西方数字游民视角，可能低估非英语城市和非热门游民目的地 |
| **更新频率建议** | 每 6-12 个月重新快照一次 |

**Nomads.com 各城市 URL slug 备忘**（有坑的几个）:
- Bangalore → 实际 slug 是 `/bengaluru`
- New Delhi → 实际 slug 是 `/delhi`
- Washington DC → 实际 slug 是 `/washington`
- Bali → 显示为 Canggu, Bali（以 Canggu 作为代表）
- Irvine → `/irvine` 重定向到用户 profile 页（无城市页面）
- San Jose CR → `/san-jose-costa-rica` 无限 301 重定向循环
- Luxembourg City → `/luxembourg-city` 重定向到搜索页
- Incheon → `/incheon` 错误重定向到 Macedonia 页面

### 2.4 签证免签旅游停留天数

| 项目 | 详情 |
|------|------|
| **来源** | Wikipedia 各国签证政策条目 + 标准国际协议知识 |
| **典型 URL** | `https://en.wikipedia.org/wiki/Visa_policy_of_{Country}` |
| **数据年份** | **2025-2026** 政策 |
| **采集方法** | 使用 `runSubagent` 让子代理批量查询 Wikipedia 签证政策文章，以强护照（US/EU/UK）为视角 |
| **采集日期** | 2026-04-08 |
| **覆盖范围** | **79 国完整覆盖** |
| **数据粒度** | 国家级（天数）；注明了具体适用护照类型和特殊条件 |
| **有效期** | 签证政策可能随时变化。中国目前 30 天免签政策到期日为 **2026 年 12 月**。其他大多数为长期稳定政策 |
| **特殊值** | `null` = 需要签证（2 国: Pakistan, Nigeria）；格鲁吉亚 365 天是最长的 |
| **重要注意** | 天数基于**强护照(US/EU/UK)**视角。中国护照持有者的天数完全不同；未来若需要中国视角数据需单独采集 |
| **更新频率建议** | 每 6 个月验证一次，特别关注中国的临时免签政策 |

**按天数分布**:
- 365 天: 格鲁吉亚 (1 国)
- 180-183 天: 英国、加拿大、墨西哥、巴拿马、印度(e-Visa)、秘鲁 (6 国)
- 150 天: 尼泊尔 (1 国)
- 90 天: 申根区 23 国 + 日本、韩国、新西兰、美国、阿联酋等 (约 55 国)
- 60 天: 泰国 (1 国)
- 28-30 天: 中国、印尼、柬埔寨、缅甸、孟加拉、斯里兰卡、约旦等 (约 13 国)
- 14 天: 阿曼 (1 国)
- null(需签证): 巴基斯坦、尼日利亚 (2 国)

### 2.5 SafetyWing 游民保险价格

| 项目 | 详情 |
|------|------|
| **来源** | SafetyWing 官网 |
| **URL** | `https://safetywing.com/nomad-insurance` |
| **数据时间** | **2026 年 4 月**价格 |
| **采集方法** | 使用 `fetch_webpage` 抓取定价页面 |
| **采集日期** | 2026-04-08 |
| **采集字段** | 两个方案(Essential/Complete)的价格、年龄段、覆盖范围 |
| **有效期** | SafetyWing 可能随时调价。保险价格建议 **每 3 个月验证一次** |
| **用途** | 仅作参考信息，帮助游民估算保险成本。不作为任何推荐 |

### 2.6 Henley Passport Index（附带采集）

| 项目 | 详情 |
|------|------|
| **来源** | Wikipedia — "Henley Passport Index" 条目 |
| **数据年份** | **2026 版** |
| **采集日期** | 2026-04-08 |
| **用途** | 未直接存储，但在采集签证免签数据时作为参考验证各国护照实力 |
| **如需使用** | 可从 Wikipedia 重新获取完整 2026 排名表 |

---

## 3. 文件结构与字段说明

### 3.1 nomad-research-2025.json（主文件）

```
{
  "_meta": { description, created, sources, notes },
  "countries": {
    "中文国名": {
      "en": "English Name",
      "cities": ["中文城市名", ...],
      "ef_epi": {
        "score": number|null,        // 400-700 分制
        "band": "very_high"|"high"|"moderate"|"low"|"very_low"|"native"|null,
        "city_scores": { "City": number },  // 可选，部分城市有
        "note": "..."                // 说明
      },
      "nomad_visa": {
        "has_visa": boolean,
        "visa_name": string|null,
        "duration_months": number|null,
        "min_income_usd": number|null,
        "tax_on_foreign_income": string|null,
        "renewable": boolean|null,
        "note": "..."
      }
    }
  },
  "summary": { ... },
  "data_gaps": { ... }
}
```

### 3.2 nomad-research-supplement-2025.json（补充文件）

```
{
  "_meta": { ... },
  "ef_epi_corrections": { corrections, confirmed_not_in_index },
  "safetywing_insurance": { plans: { essential, complete } },
  "nomads_com_city_data": {
    "_meta": { ... },
    "cities": {
      "CityName": {
        "score": number,       // 0.56 - 3.91
        "rank": number,        // 全球排名 1-1370+
        "cost": number,        // 美元/月（总游民成本）
        "internet": number,    // Mbps
        "english": "Bad"|"Okay"|"Good"|"Great",
        "reviews": number|null,
        "note": "..."          // 可选备注
      }
    },
    "not_found_on_nomads_com": [...]
  },
  "visa_free_tourism_durations": {
    "countries": {
      "English Name": { "days": number|null, "note": "..." }
    }
  },
  "updated_visa_details": {
    "CountryName": {
      "visa_name", "min_income_usd", "min_income_note",
      "tax_on_foreign_income", "duration_months", "renewable", "note"
    },
    "still_missing": { ... }
  },
  "data_gaps_remaining": { ... }
}
```

---

## 4. 数据质量与已知问题

### 4.1 精度与可靠性评级

| 数据集 | 可靠性 | 说明 |
|--------|--------|------|
| EF EPI 分数 | ⭐⭐⭐⭐⭐ | 权威机构年度报告，已二次验证 |
| 游民签证(有/无) | ⭐⭐⭐⭐ | Wikipedia + VisaGuide 交叉验证，但政策变化快 |
| 游民签证(收入/税率) | ⭐⭐⭐ | 来自 VisaGuide 单一来源，部分国家数据可能过时 |
| Nomads.com 评分 | ⭐⭐⭐ | 众包数据，受用户群体偏差影响；冲突地区评分机制有争议 |
| Nomads.com 月成本 | ⭐⭐⭐ | 综合估算，可能高于或低于实际；对发展中国家精度较低 |
| Nomads.com 网速 | ⭐⭐ | 用户自报告，样本量小的城市可能不准确（如 Yokohama 36 条评论） |
| 签证免签天数 | ⭐⭐⭐⭐ | Wikipedia + 公开政策，但仅反映强护照视角 |
| SafetyWing 价格 | ⭐⭐⭐⭐⭐ | 直接从官网获取，精确到分 |

### 4.2 已知数据偏差与问题

1. **Nomads.com 西方偏差**: 以英语为母语的西方数字游民为主要用户群，中国/日本/韩国城市的评论数量和英语等级评分可能不够准确
2. **冲突地区评分失真**: 6 个城市被降至 0.56/5 分，失去了其他维度的区分度。这些城市的成本数据可能也不准确（如 Tehran $60/月明显异常）
3. **Nomads.com 排名 vs 首页排名不一致**: 首页列表 (Bangkok #1) 的排名与城市详情页的排名可能不同（Bangkok 详情页 rank 数字不同）。首页排名基于综合算法，详情页排名是全局排名
4. **中国 30 天免签是临时性政策**: 中国对美/欧/英的 30 天免签到 2026 年 12 月到期，届时可能调整
5. **India e-Visa "180 天"需区分**: 印度不是免签，是 e-Tourist Visa，机制不同
6. **nomads.com 与我们 cities.json 的网速数据不一致**: 项目已有 `internetSpeedMbps` 字段是另一来源，nomads.com 数据可作为交叉验证
7. **EF EPI 城市级分数有限**: 只有少数首都/大城市有城市级分数，大多数城市只能用国家级分数近似
8. **Belfast 英语水平显示 "Okay"**: Nomads.com 似乎对北爱尔兰/英国小城市的英语评分有偏差
9. **签证详情货币换算**: 各国签证收入要求用当地货币设定(如韩国用KRW、日本用JPY)，我们已换算为 USD，但汇率波动会影响实际门槛

### 4.3 城市名称映射注意事项

Nomads.com 城市名与我们项目中文名的映射关系需要在写入 cities.json 时确认：
- "Bali" on nomads.com → 对应我们的 "雅加达" (Jakarta)？还是应视为独立数据点？
- "Canggu, Bali" 是 nomads.com 展示的 Bali 代表城市。我们的 cities.json 中无 Bali 城市
- Seoul 排名 #4（首页）vs 详情页排名可能不同。建议使用详情页数据为准

---

## 5. 仍缺失的数据

### 5.1 优先补采（对产品有直接影响）

| 缺失项 | 影响 | 建议来源 | 难度 |
|--------|------|---------|------|
| 4 城无 nomads.com 数据 | Irvine、San Jose CR、Luxembourg City、Incheon 缺评分 | 可用 Teleport 或 Expatistan 替代 | 中 |
| 4 国游民签证细节 | 土耳其、菲律宾、意大利、印尼缺收入门槛/税率 | 各国官方移民局网站 | 高 |
| 联合办公空间单独费用 | 无法在城市页展示联合办公成本 | Coworker.com、Deskmag 全球联合办公空间报告 | 高 |
| 中国护照视角签证数据 | 目前仅有强护照视角 | Wikipedia Visa requirements for Chinese citizens | 中 |

### 5.2 次优先（锦上添花）

| 缺失项 | 说明 |
|--------|------|
| 游民社区规模量化 | Nomads.com 仅给定性评级，无具体人数。可参考 Nomads.com 的 "reviews" 作为近似 |
| 签证办理费用 | 各国签证申请费用未采集 |
| 签证办理时长 | 一般处理时间未采集 |
| 更多保险公司对比 | 只采集了 SafetyWing；World Nomads、Atlas 等未采集 |
| EF EPI 更多城市级分数 | EF 网站有部分城市分数，但需逐城采集 |

---

## 6. 更新与验证指南

### 6.1 各数据集的更新 SOP

#### EF EPI（年度更新）
```
触发: 每年 11-12 月 EF 发布新版
URL:  https://www.ef.com/epi/
方法: fetch_webpage 抓取完整排名页
输出: 更新 nomad-research-2025.json 中各国 ef_epi.score 和 band
验证: 对比前一年数据，标记变化 >10 分的国家
```

#### 游民签证（半年度验证）
```
触发: 每 6 个月，或有新闻报道某国推出/调整签证时
URL:  https://visaguide.world/digital-nomad-visa/
方法: 逐国 fetch visaguide.world 各国页面
关注: 新增签证国家、已有签证收入门槛调整、项目暂停/恢复
验证: 与 Wikipedia Digital nomad 条目交叉验证
```

#### Nomads.com 城市数据（年度快照）
```
触发: 每 6-12 个月
URL:  https://nomads.com/{city-slug}
方法: runSubagent 分批 fetch，每批 10-14 城；或写脚本自动化
输出: 替换 supplement 文件中 nomads_com_city_data 部分
注意: URL slug 见 §2.3 备忘；冲突地区可能新增或减少
```

#### 签证免签天数（半年度验证）
```
触发: 每 6 个月，或有重大签证政策变化新闻
重点: 中国临时免签政策（到期日 2026-12）
方法: Wikipedia Visa policy 页面 + 各国移民局公告
```

#### SafetyWing 价格（季度验证）
```
触发: 每 3 个月
URL:  https://safetywing.com/nomad-insurance
方法: fetch_webpage
输出: 更新 supplement 文件中 safetywing_insurance 部分
```

### 6.2 写入 cities.json 时的检查清单

当这些研究数据需要写入生产数据文件 `public/data/cities.json` 时：

- [ ] 确认 nomads.com 城市名与 cities.json 的 `name` 字段映射正确
- [ ] 确认新字段在 `lib/types.ts` City interface 中已声明
- [ ] 确认新字段的 `null` 处理在前端组件中有覆盖
- [ ] 运行 `npx tsc --noEmit` 类型检查
- [ ] 运行 `npm run build` 确认构建通过
- [ ] 更新 DATA_OPS.md 和 DATA_SOURCES.md（`_archive/`下）的相关章节

---

## 7. 免责声明草稿

> 以下为将来写方法论/免责声明页面时可参考的措辞：

### 英语水平数据
> English proficiency scores are sourced from the EF English Proficiency Index (EF EPI) 2025 edition, published by EF Education First. Scores are country-level; city-level performance may differ. Native English-speaking countries (US, UK, Australia, Canada, Ireland, New Zealand) are not ranked in the EF EPI. Data is updated annually.

### 数字游民签证
> Digital nomad visa information is compiled from Wikipedia, VisaGuide.World, and official government sources. Visa policies change frequently. Always verify requirements with the destination country's official immigration authority before making plans. WhichCity does not provide immigration advice.

### Nomads.com 城市评分
> City scores, costs, and internet speed ratings are sourced from Nomads.com (formerly NomadList), a community-driven platform for digital nomads. Data reflects community reviews and may contain subjective bias. Cost figures represent estimated total nomad lifestyle costs (including accommodation, food, coworking, and transport) and should be used as rough estimates only.

### 签证免签停留
> Visa-free stay durations are based on policies applicable to holders of US, EU, and UK passports. Actual durations may vary significantly depending on your nationality. Always check your specific visa requirements before traveling.

### 保险信息
> Insurance pricing is provided for informational purposes only and does not constitute a recommendation or endorsement. Prices are subject to change. Please verify current rates directly with the insurance provider.

---

## 8. 采集过程时间线

### 第一次采集（2026-04-01）

**目标**: 为数字游民功能采集基础研究数据

| 步骤 | 操作 | 结果 |
|------|------|------|
| 1 | 清点 79 国 134 城市列表 | 确认覆盖范围 |
| 2 | 采集 EF EPI 2025（ef.com/epi + Wikipedia） | 67 国有分数，6 国 native，5 国不在索引 |
| 3 | 采集数字游民签证数据（Wikipedia + VisaGuide） | 27 国有签证，52 国无 |
| 4 | 存储为 `nomad-research-2025.json` | 754 行 JSON |
| 5 | 识别数据缺口 | 列出 5 类未采集数据 |

### 第二次采集（2026-04-08）

**目标**: 填补第一次采集识别出的所有数据缺口

| 步骤 | 操作 | 结果 |
|------|------|------|
| 1 | 读取已有数据，确认缺口列表 | 6 类缺口需填补 |
| 2 | 采集 SafetyWing 保险价格 | Essential $62.72/4wk, Complete $177.50/mo |
| 3 | 确认斯洛文尼亚 EF EPI 状态 | 确认不在 2025 索引 |
| 4 | 二次验证 EF EPI 完整排名 | 修正 3 个分数 |
| 5 | Nomads.com 城市数据 — 8 批 | 130/134 城市完成 |
| 5a | 　批次 1: 首页 12 城（Bangkok→KL） | 12 城基础数据 |
| 5b | 　批次 2: Lisbon/Barcelona/Taipei 详情页 | 3 城完整数据 |
| 5c | 　批次 3: subagent 10 城 (ChiangMai→Paris) | 10 城完整数据 |
| 5d | 　批次 4: Prague/Warsaw/Bucharest 详情页 | 3 城完整数据 |
| 5e | 　批次 5-8: subagent 分批 (欧洲/亚洲/美洲/中东/非洲/中国/US/日本/其他) | ~102 城完整数据 |
| 6 | 签证免签旅游停留天数 — subagent 批量 | 79 国完整 |
| 7 | 游民签证细节补充 — visaguide.world | 6 国成功，1 国部分，4 国源站无专页 |
| 8 | 存储为 `nomad-research-supplement-2025.json` | 385 行 JSON |
| 9 | 修正原文件 EF EPI 分数 + 斯洛文尼亚状态 | 4 处修改 |

### 采集技术细节

| 工具 | 使用场景 | 限制 |
|------|---------|------|
| `fetch_webpage` | 单个页面抓取（最多 3 URL/次） | nomads.com 页面结构较统一，提取可靠 |
| `runSubagent` (Explore) | 批量城市数据（10-14 城/批） | 偶尔无输出，需重试或用 fetch 替代 |
| Wikipedia | 签证政策、EF EPI 验证 | 内容可能过时，需注意修订日期 |
| VisaGuide.World | 签证详细要求 | 部分国家无专页，会重定向到无关页面 |
| SafetyWing 官网 | 保险定价 | 定价页面结构清晰，提取可靠 |

---

## 附录: 数据集之间的整合路径

```
nomad-research-2025.json          nomad-research-supplement-2025.json
┌──────────────────────────┐      ┌────────────────────────────────┐
│ 79 国 × EF EPI 分数      │      │ 130 城 × Nomads.com 数据       │
│ 79 国 × 游民签证信息      │      │ 79 国 × 签证免签停留天数       │
│                          │      │ 6 国 × 游民签证补充细节         │
│                          │      │ SafetyWing 保险价格             │
│                          │      │ EF EPI 3 个修正                │
└────────────┬─────────────┘      └──────────────┬─────────────────┘
             │                                    │
             └──────────── 合并写入 ──────────────┘
                            │
                            ▼
                  public/data/cities.json
                  ┌──────────────────────────────┐
                  │ 新增字段（待实现）:              │
                  │   efEpiScore / efEpiBand       │
                  │   nomadVisaAvailable            │
                  │   nomadVisaDuration             │
                  │   nomadVisaMinIncome            │
                  │   nomadVisaTax                  │
                  │   visaFreeDays                  │
                  │   nomadScore                    │
                  │   nomadCostPerMonth             │
                  │   englishLevel                  │
                  └──────────────────────────────┘
```

**下次开发工作**: 将研究数据合并写入 cities.json，同时开发前端 UI 组件展示这些数据。
