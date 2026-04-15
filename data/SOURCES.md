# 数据源详细说明

> 每个字段的来源、获取方式、更新频率、已知限制。
> 详细字段元数据见 `registry.json`。

---

## ⚠️ 已知数据问题

**城市隐藏机制（2026-04-15 生效）**：151 个城市中 31 个被标记为 `hidden: true`，前端不展示、不参与排名计算。数据照常存储和更新。详见 `data/README.md` "城市隐藏" 部分。可见城市 120 个。

**ID 70 圣何塞（哥斯达黎加）**：costModerate/costBudget/monthlyRent/housePrice 为历史手工录入数据，未经过 2026-04 Numbeo 刷新。原因：Numbeo URL `San-Jose` 默认指向美国加州 San Jose 页面，哥斯达黎加的正确 URL 为 `San-Jose-Costa-Rica`，采集脚本的 fallback 顺序导致抓取到了错误页面。`apply-numbeo-update.mjs` 的 `SKIP_IDS` 已阻止错误数据写入，但正确数据尚未采集。下次 Numbeo 解封后需使用正确 URL 重新采集。`verify-numbeo-data.mjs` 的 `NUMBEO_NAME_OVERRIDES[70]` 已修正为 `["San-Jose-Costa-Rica"]`。

**costModerate 缺失（9 城市）**：ID 138(福冈)、159(京都)、162(维尔纽斯)、163(里加)、164(尼科西亚)、165(圣多明各)、166(基多)、167(阿克拉)、168(亚的斯亚贝巴)。其中福冈/京都是 Numbeo 页面存在但无月成本摘要（数据贡献者不足），其余 7 个是新增城市未纳入采集范围。下次 Numbeo 解封后需补采。

---

## 收入与成本

| 字段 | 数据源 | 粒度 | 更新频率 | 可自动化 |
|------|--------|------|----------|---------|
| averageIncome | BLS, Eurostat, doda, Glassdoor, SalaryExpert | 城市级 | 年度 | ✗ |
| professions | 同上（25 职业 × 150 城） | 城市级 | 年度 | ✗ |
| costModerate | Numbeo (singlePersonMonthlyCost + rent1BRCenter) | 城市级 | 半年 | ✓ (web scraping) |
| costBudget | Numbeo (singlePersonMonthlyCost×0.7 + rent1BROutside) | 城市级 | 半年 | ✓ |
| bigMacPrice | The Economist Big Mac Index | 国家级 | 半年 | ✓ (public CSV) |
| housePrice | Global Property Guide, Numbeo Property | 城市级 | 半年 | ✓ (web scraping) |
| monthlyRent | Numbeo rent1BRCenter (市中心1居室) | 城市级 | 半年 | ✓ (web scraping) |

## 安全指数子指标

| 字段 | 数据源 | 粒度 | 权重 | 可自动化 |
|------|--------|------|------|---------|
| numbeoSafetyIndex | Numbeo Crime Rankings | 城市级 | 30% | ✓ (scraping, 需代理) |
| homicideRate | UNODC | 国家级 | 25% | ✓ (public API) |
| gpiScore | IEP / Vision of Humanity | 国家级 | 20% | ✓ (public dataset) |
| gallupLawOrder | Gallup Global Law & Order | 国家级 | 15% | ✗ (付费报告) |
| wpsIndex | Georgetown WPS Index | 国家级 | 10% | ✓ (Excel download) |

## 医疗指数子指标

| 字段 | 数据源 | 粒度 | 权重 | 可自动化 |
|------|--------|------|------|---------|
| doctorsPerThousand | WHO / World Bank | 城市级调整 | 25% | ✓ (World Bank API) |
| uhcCoverageIndex | WHO Global Health Observatory | 国家级 | 25% | ✓ |
| hospitalBedsPerThousand | World Bank | 国家级 | 20% | ✓ (World Bank API) |
| lifeExpectancy | World Bank | 国家级 | 15% | ✓ (World Bank API) |
| outOfPocketPct | World Bank | 国家级 | 15% | ✓ (World Bank API) |

## 治理指数子指标

| 字段 | 数据源 | 粒度 | 权重 | 可自动化 |
|------|--------|------|------|---------|
| corruptionPerceptionIndex | Transparency International | 国家级 | 25% | ✓ (public CSV) |
| govEffectiveness | World Bank WGI | 国家级 | 25% | ✓ (Excel download) |
| wjpRuleLaw | World Justice Project | 国家级 | 20% | ✓ (CSV endpoint) |
| pressFreedomScore | RSF | 国家级 | 15% | ✓ (public dataset) |
| mipexScore | MIPEX | 国家级 | 15% | ✗ (不规则更新) |

## 其他字段

| 字段 | 数据源 | 粒度 | 可自动化 |
|------|--------|------|---------|
| airQuality / aqiSource | US EPA AirNow / IQAir | 城市级 | ✓ |
| annualWorkHours | OECD / ILO ILOSTAT | 国家级 | ✓ |
| paidLeaveDays | OECD, ILO, 各国劳动法 | 国家级 | ✗ |
| internetSpeedMbps | Ookla Speedtest | 城市级 | ✓ |
| directFlightCities | OAG, FlightConnections | 城市级 | ✗ |
| democracyIndex | EIU | 国家级 | ✗ (付费) |
| internetFreedomScore | Freedom House | 国家级 | ✓ |
| climate | NOAA, 国家气象局 | 城市级 | ✗ (气候学常量) |
| timezone | IANA | 城市级 | — |

---

## Numbeo 反爬注意事项

Numbeo 是本项目最重要的城市级数据源（costModerate、monthlyRent、housePrice、numbeoSafetyIndex）。

- **限制**: 频率管控 (1 req/2s+)、IP 封锁、页面结构不稳定
- **推荐脚本**: `scripts/verify-numbeo-data.mjs` — 已实现 Clash 代理节点切换 + 断点续传 + HTML 归档
- **API 替代**: Numbeo API Basic tier $260/月，200K queries/月。单月订阅足够全量更新。
- **已有审计**: `scripts/numbeo-audit/` — HTML 存档 + 对比报告

## World Bank API

多个指标通过 World Bank API 获取（免费，无需认证）。

```
基础 URL: https://api.worldbank.org/v2/country/{iso2}/indicator/{indicator}?format=json&date={year}
```

已有脚本: `scripts/collect-new-indicators.py`

已使用的指标:
- `SH.MED.PHYS.ZS` — 每千人医师
- `SH.MED.BEDS.ZS` — 每千人病床
- `SH.XPD.OOPC.CH.ZS` — 自付医疗支出
- `SP.DYN.LE00.IN` — 预期寿命

## 原始数据源文件

`data/sources/` 中的 JSON 文件是历史快照，用于审计和追溯：

| 文件 | 内容 | 日期 |
|------|------|------|
| numbeo-safety-2025.json | Numbeo Safety Index (城市名→分数) | 2024-2025 |
| unodc-homicide-2024.json | UNODC 凶杀率 (国家名→率) | 2024 |
| gpi-2025.json | GPI 分数 (国家名→分数) | 2025 |
| gallup-law-order-2024.json | Gallup 法治指数 (国家名→分数) | 2024 |
| nomad-research-2025.json | 游民数据 (签证、VPN、英语水平) | 2025 |
| nomad-research-supplement-2025.json | 游民补充数据 | 2025 |
