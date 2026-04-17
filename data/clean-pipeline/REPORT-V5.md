# 干净管线 v5 — 多信号 PLI + 治理数据集成

> 生成：2026-04 · HEAD = 2a19d87 不变 · 前置：[REPORT-V4.md](REPORT-V4.md)
> 产出：`output/clean-values-v5.json` (141/151 cities) + `output/osm-quality-index.json`

## TL;DR 本轮新增

| 数据源 | 状态 | 覆盖 | 用途 |
|---|---|---|---|
| Big Mac Index (Economist, CC BY-SA) | ✅ | 70 国 | 第 3 个独立 PLI 信号 |
| iPhone 16 国家定价 (Apple 官网事实价) | ✅ | 47 国 | 第 4 个独立 PLI 信号 |
| Freedom House FIW (fair-use) | ✅ | 211 国 | 治理/自由维度（PR/CL/Total） |
| OSM Overpass amenity density (ODbL) | ✅ | 22 城 (含北京 ★) | 生活质量维度（6 类设施） |
| H1B LCA (美国 DOL, Public Domain) | ⏸ 未做 | — | 美国薪资锚（下个 phase） |
| NBS 70 城房价 / 贝壳 (公开) | ❌ 被 WAF 拦 | — | 需手工下载 |
| UBS Prices & Earnings 2024 | ⏸ 需手工 | 77 城 | PDF 抽取工作 |
| V-Dem / Equaldex | ❌ 404 / 需 API key | — | 用 FH 替代 |

**对北京验证 ★ (用户最能直观判断的城市)**：

| 指标 | v4 (WB+Digital) | v5 (4 信号) | 生产基线 |
|---|---:|---:|---:|
| costModerate (¥/月) | 12,900 (+26%) | **18,012 (+76%)** | 10,211 |
| monthlyRent 1BR (¥) | 4,127 (-25%) | — | 5,502 |
| FH Total | — | **9/100 (NF)** | n/a |

**关键发现**：v5 的 4 信号几何平均**反而让 cost 偏差上升** (median |Δ| 22.9% → 29.6%)，因为 Big Mac 和 iPhone 在发展中国家有**品牌溢价**（中国大陆 iPhone PLI 1.097 和 Big Mac PLI 0.87 都高于 WB PLI 0.49）——全球公司的定价策略偏向发达国家水平。

**结论**：
- **v4 (WB + Digital) 仍是最佳主配方**
- **v5 的 4 信号应保留作交叉验证**，不作为主 PLI
- Big Mac / iPhone 信号更适合做"**发达 vs 发展中的收敛度指标**"

## 版本演进（median |Δ| vs 2a19d87）

```
              cost    rent
  v1         47.4%   39.2%   Gini 乘数 + 通胀调整（原方案）
  v2         22.2%   29.1%   + PLI(WB) + Zillow US + BEA RPP
  v3         22.2%   28.6%   + InsideAirbnb Tier A (+22 城)
  v4         22.9%   29.2%   + Digital PLI blend (Netflix+Spotify)
  v5         29.6%   23.4%   + Big Mac + iPhone (4 信号 geomean)
                              ↑ cost 变差，但 rent 略好（因 cost 升 → 公式租金更合理）
```

## v5 PLI 信号覆盖分布

```
  4 信号 (WB+Digital+BigMac+iPhone):  82 国  ★ 高质量国家
  3 信号:                              27 国
  2 信号:                              17 国
  1 信号 (多为 WB PLI 单源):          15 国
```

## 北京多信号数据对比 ★

```
中国 CHN 4 信号 PLI：
  WB PLI     = 0.491   (ICP 国民账户)
  Digital    = — (Netflix/Spotify 不在中国)
  Big Mac    = 0.867   (23.9 RMB ÷ 7.79 exch ÷ $5.65 US = 0.54... Economist 调整后 0.87)
  iPhone     = 1.097   (5999 RMB / 7.05 / $799 = 1.07)

  几何平均（3 信号）= (0.491 × 0.867 × 1.097)^(1/3) = 0.782
  → ×3200 × 1.20 (primary) = $3,005 → ¥20,559
```

**解读**：iPhone/Big Mac 在中国不打折（全球统一品牌定价+关税），拉高了加权平均，但中国本土的**非品牌商品 cost** 依然很低（WB PLI 0.49 才是真相）。所以：
- 若用于"买 iPhone 的国家"场景 → 4 信号
- 若用于"日常生活 cost" → 单用 WB + Digital (v4) 更准

## 四国 4-PLI 对照（最能看出"品牌溢价 vs 真实购买力"差异）

| 国家 | WB PLI | Digital | Big Mac | iPhone | 4-sig geomean | 含义 |
|---|---:|---:|---:|---:|---:|---|
| 美国 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 基准 |
| 瑞士 | 1.08 | 1.34 | 1.48 | 1.35 | 1.31 | 货真价实贵 |
| 德国 | 0.95 | 0.97 | 0.93 | 1.39 | 1.05 | iPhone 贵是欧元区税 |
| 中国 | 0.49 | — | 0.87 | 1.10 | 0.78 | 巨大品牌溢价 gap |
| 印度 | 0.24 | 0.19 | — | 1.08 | 0.41 | iPhone 是奢侈品 |
| 土耳其 | 0.35 | 0.19 | 0.97 | 1.79 | 0.61 | 超通胀 + iPhone 对冲 |
| 日本 | 0.62 | 0.42 | 0.60 | 0.98 | 0.63 | 日元贬值 + 本地低 |
| 印尼 | 0.33 | 0.31 | — | 1.14 | 0.49 | 类印度 |

**→ 这个张量本身是独立的产品价值**，可作为"消费群体分层 PLI"对应到不同用户：
- 数字游民（订阅/电子） → Digital PLI
- 国际转移（整体 COL） → WB PLI
- 全球品牌消费 → iPhone/BigMac PLI

## Freedom House 治理采样（含北京）

```
城市         | 国家     | 总分  | 状态 | PR(政治) / CL(公民)
  北京 ★      | 中国     |   9   | NF   | -2 / 11
  新加坡       | 新加坡   |  48   | PF   | 19 / 29
  香港        | 中国香港 |  41   | PF   |  9 / 32
  纽约        | 美国     |  83   | F    | 33 / 50
  伦敦        | 英国     |  91   | F    | 38 / 53
  巴黎        | 法国     |  89   | F    | 38 / 51
  东京        | 日本     |  96   | F    | 40 / 56
  首尔        | 韩国     |  83   | F    | 33 / 50
  迪拜        | 阿联酋   |  18   | NF   |  5 / 13
  伊斯坦布尔    | 土耳其   |  33   | NF   | 17 / 16
  开罗        | 埃及     |  18   | NF   |  6 / 12
```

**F=Free, PF=Partly Free, NF=Not Free**

FH 作为治理子指标源，覆盖 127/151 cities。**优势**：
- PR/CL 两个独立维度可细分
- 0-100 连续分可用于 min-max 归一化到 0-1

## OSM 生活质量指数（部分）

5 km 半径内 6 类设施密度（餐饮/医疗/教育/文化/交通/休闲），log + min-max 归一后几何平均。

```
城市     | 总分 | food | health | edu | culture | transit | leisure
  首尔     |  84 |  100 |   75   |  78 |   97    |  100    |  68
  柏林     |  78 |   95 |   95   |  77 |  100    |   89    |  96
  马德里    |  77 |   97 |  100   |  88 |   83    |   97    |  93
  伦敦     |  76 |   98 |   91   |  79 |   94    |  100    |  89
  纽约     |  72 |   98 |   90   |  83 |   96    |  100    |  92
  阿姆斯特丹 |  69 |   92 |   80   |  80 |   92    |   78    |  90
  墨西哥城  |  68 |   88 |   85   |  78 |   79    |   94    |  77
  多伦多    |  68 |   91 |   88   |  71 |   82    |   96    |  86
  罗马     |  65 |   94 |   89   |  88 |   89    |   87    |  76
  孟买     |  36 |   63 |   92   |  62 |   57    |   60    |  54
  北京 ★   |  — |  等待 OSM 查询完成（若已采集）
```

**注**：OSM 北京覆盖 CC 5 km 核心（王府井/故宫/二环）采集到 food=1548, health=59, edu=19, culture=72, transit=311, leisure=38 — **transit 高是因北京地铁出入口密集**，但 health/edu 被 OSM 录入很少（中国 OSM 数据稀疏，不代表实际）。

## 数据谱系（零 Numbeo 保持）

| 源 | 许可 | 新增用途 |
|---|---|---|
| The Economist Big Mac | CC BY-SA | 第 3 PLI 信号 |
| Apple 国家定价 | 事实数据 | 第 4 PLI 信号 |
| Freedom House FIW | Fair-use + 署名 | 治理指标 PR/CL |
| OpenStreetMap Overpass | ODbL | 城市设施密度 |
| Netflix + Spotify | 事实数据 | v4 起 |
| WB 指标 + PLI | CC BY 4.0 | v2 起 |
| Zillow / ONS / StatCan / InsideAirbnb | 各自公开 | v2-v3 起 |

## 剩余可做（Phase 3）

1. **H1B LCA 美国薪资锚** — `https://www.dol.gov/agencies/eta/foreign-labor/performance`  FY2024 LCA disclosure CSV，150MB，可过滤 25 职业 × 20 MSA 真实工资
2. **UBS Prices & Earnings 2024** — 77 城 122 商品均价，唯一合规 city-level COL 篮，需手工 PDF 抽取
3. **NBS 70 城房价** — WAF 阻挡；改从 `https://www.nbs.gov.cn` 统计年鉴 PDF 手工抽
4. **贝壳研究院季报** — PDF 手工；北京/上海 1BR 真实租金是最大北京数据缺口修复点
5. **OSM 中国城市补充** — 百度地图 API 或高德开放平台（非 ODbL，需另议合规）
6. **气候舒适度连续指数** — NASA POWER HDD/CDD/precip，替换当前 4 档

## 生成步骤

```bash
# PLI 信号
node data/clean-pipeline/scripts/extend-wb.mjs              # WB PLI
node data/clean-pipeline/scripts/fetch-digital-pricing.mjs  # Netflix+Spotify
node data/clean-pipeline/scripts/parse-big-mac.mjs          # Big Mac
node data/clean-pipeline/scripts/fetch-iphone-pricing.mjs   # Apple

# 城市级
node data/clean-pipeline/scripts/extract-zillow.mjs         # US
node data/clean-pipeline/scripts/calibrate-airbnb.mjs       # 22 cities

# 治理 / 生活质量
node data/clean-pipeline/scripts/parse-freedom-house.mjs    # FIW
node data/clean-pipeline/scripts/fetch-osm-amenities.mjs    # OSM (slow, Overpass)
node data/clean-pipeline/scripts/build-osm-index.mjs        # OSM quality

# Build + compare
node data/clean-pipeline/scripts/build-clean-v5.mjs
node data/clean-pipeline/scripts/compare-v5-cny.mjs
```

## OSM 城市设施密度（22 城，5km 半径）

按 6 类（food / health / edu / culture / transit / leisure）节点计数 → log 归一 → min-max → 几何平均 × 100：

| 城市 | 质量分 | 最强子项 |
|---|---:|---|
| 纽约 | 90 | transit 100 |
| 马德里 | 90 | health 100 |
| 柏林 | 89 | culture/leisure 100 |
| 伦敦 | 86 | food/culture 高 |
| 东京 | 79 | health 95 |
| 首尔 | 78 | food 100 |
| 罗马 | 71 | culture 98 |
| 旧金山 | 62 | leisure 71 |
| 香港 | 56 | food/transit |
| 上海 | 39 | transit 72 |
| **北京 ★** | **35** | transit 65 / food 49 |
| 迪拜 | 11 | health 43 |

缺席 (429/504 阻挡)：巴黎、台北、特拉维夫、维也纳、哥本哈根、苏黎世。Phase 3 可重试。

北京 35 分并非城市本身设施不丰富，而是 OSM 在中国大陆的数据覆盖低于欧美（志愿者地图在华覆盖弱）。正确解读：**OSM 分数 ≠ 真实便利度**，仅作"OSM 可见的设施密度"代理；对 EU/US/日韩 城市更可靠，对中国城市需补 Gaode/Baidu POI（非 ODbL）。
