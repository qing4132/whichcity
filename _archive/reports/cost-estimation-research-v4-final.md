# 城市生活成本估算 — v4 最终报告

**研究问题**：在 v3 的栈集成（成本 MdAPE 13.45%、租金 MdAPE 18.70%）之上，引入 OpenStreetMap POI 密度信号，能否把误差再压下一档？

**简短结论**：能，但幅度有限，且**诚实地说低于 v2 的理论预测**。完成完整流水线后（151 城市地理编码 → Overpass POI 查询 → 按国家中位数归一化特征工程 → 加入 M9/M10 两个新模型 → LOCO-CV 重新栈集成），栈集成达到 **成本 MdAPE 13.14%（−0.31 pp）** 与 **租金 MdAPE 17.92%（−0.78 pp）**。v2 报告中提出的 4.5–5.5% 目标未实现；OSM 对成本几乎是零提升，对租金是真实但温和的提升。本报告如实记录整个过程和原因。

---

## 1. 实际执行的流水线

| 阶段 | 脚本 | 产出 | 状态 |
|---|---|---|---|
| 1 地理编码 | `scripts/research/10-geocode.mjs` | `data/sources/osm/geocoded.json` | 151 / 151，通过 Nominatim |
| 2 POI 计数 | `scripts/research/11-osm-poi.mjs` | `data/sources/osm/poi-counts.json` | 151 / 151，通过 Overpass（2 km 半径，8 类标签） |
| 3 相关性审计 | `scripts/research/12-osm-corr.mjs` | 控制台 | 与 GT 的 log-log Pearson r |
| 4 特征工程 + 拟合 | `scripts/research/fit-models-v4.mjs` | `data/sources/cost-models/trained-v4.json` | 10 个基模型、LOCO-CV、栈集成 |
| 5 生产估算器 | `lib/costModel.ts`（已更新） | — | 导出 `estimateCost()`，附 CI 与方法权重 |

2 km 缓冲内查询的 8 个 POI 类别：`dining`（amenity=restaurant/cafe/bar/fast_food）、`culture`（amenity=theatre/cinema/arts_centre + tourism=museum）、`health`（amenity=clinic/hospital/pharmacy/doctors）、`edu`（amenity=school/university/college/library）、`retail`（shop=*）、`finance`（amenity=bank/atm）、`transit`（railway=station/subway_entrance + public_transport=station）、`tourism`（tourism=hotel/hostel/guest_house/attraction）。

在 141 个有 GT 的城市中，133 个携带可用 POI 信号（`total ≥ 50`）。被质控排除的城市（Nominatim 返回了非市中心点）：重庆 = 0、圣地亚哥（智利） = 0、布里斯班 = 1、卢森堡 = 1、福冈 = 1、迪拜 = 30、利雅得 = 0 —— 未做手工修补，以保持流水线可复现。

---

## 2. 为什么 OSM 没达到 v2 的预测

v2 预测 OSM 特征对 log(cost) 的相关 `r > 0.6`。在 136 城子集上的实测 log-log Pearson：

| 特征 | r(成本) | r(租金) |
|---|---:|---:|
| log(total POI + 1) | 0.180 | 0.150 |
| log(dining + 1) | 0.286 | 0.262 |
| log(culture + 1) | **0.322** | **0.283** |
| log(retail + 1) | 0.210 | 0.174 |
| log(transit + 1) | 0.176 | 0.175 |
| log(health + 1) | 0.005 | −0.026 |
| log(edu + 1) | −0.014 | −0.035 |
| log(finance + 1) | 0.040 | 0.011 |
| log(tourism + 1) | 0.025 | 0.014 |

从数据中诊断出的三条根因：

1. **OSM 贡献者分布的跨国偏差**。西欧 OSM 标注成熟；许多亚洲、中东城市仍然稀疏。索非亚（便宜）报告 9 324 个 POI，迪拜（昂贵）仅 30 个 —— 纯粹是地图贡献者密度的伪影。我们用"按国家中位数归一"（`logRel = log((total+1)/(countryMedian+1))`）缓解，但这也顺带抹掉了大部分国家间方差。
2. **Nominatim 多边形噪声**。地理编码中国超大城市时常返回行政区中心而非市区中心，导致 2 km 半径内几乎无 POI。我们没有手工修补。
3. **现有特征已经解释了大部分方差**。M3（multi-huber，含 wage、BigMac、GNI、HDI、航班、GDP、大洲）里，航班数已经代表"都会密度"，GNI × HDI 代表"发达国家便利设施饱和度"，OSM 对成本几乎冗余。租金略有额外提升 —— 因为租金更贴近市中心便利度，而 POI 组成能反映这个维度。

---

## 3. 两个新增模型

**M9 — `multi_plus_osm`**。在 M3 特征集上追加 `[logRel, cultureShare, diningShare, financeShare, hasOSM]`；Huber IRLS，λ = 0.8。动机：让模型把 OSM 当作最佳工资回归之上的残差校正来吸收。

**M10 — `tourism_premium`**：`log cost = β0 + β1 log(wage) + β2 log(bigMac) + β3 log(flights+10) + β4 cultureShare + β5 cultureShare·log(flights+10) + β6 hasOSM`。动机：捕捉旅游溢价（巴厘岛、雷克雅未克、迪拜）—— 这些城市成本超出当地工资预期，由旅游导向的 POI 组成驱动。

两者都显式带 `hasOSM` 哑变量，使缺 POI 的城市干净地回退到零基线，不会产生系统偏差。

---

## 4. 结果（LOCO-CV，按国家留一验证）

| 模型 | 成本 MdAPE | 成本 P90 | 租金 MdAPE | 租金 P90 | R²(成本) | R²(租金) |
|---|---:|---:|---:|---:|---:|---:|
| M1 income_power | 18.77% | 45.50% | 26.95% | 73.11% | 0.718 | 0.664 |
| M2 BalassaSamuelson | 13.48% | 42.46% | 21.66% | 60.40% | 0.768 | 0.699 |
| M3 multi_huber | 13.96% | 35.83% | 18.39% | 51.41% | 0.813 | 0.785 |
| M4 tiered_regional | 14.85% | 45.36% | 20.97% | 57.67% | 0.716 | 0.670 |
| M5 airbnb_anchored | 14.25% | 35.83% | 20.17% | 56.15% | 0.809 | 0.787 |
| M6 kNN_synthetic | 16.18% | 48.55% | 24.98% | 79.83% | 0.749 | 0.674 |
| M7 hierarchical | **13.14%** | 38.34% | 19.35% | 59.09% | 0.796 | 0.763 |
| M8 continent_wage_interaction | 15.99% | 38.23% | 20.84% | 55.68% | 0.777 | 0.773 |
| **M9 multi_plus_osm** | 13.29% | 38.42% | **20.48%** | 53.70% | 0.806 | 0.784 |
| **M10 tourism_premium** | 15.75% | 44.83% | 22.38% | 60.00% | 0.753 | 0.708 |
| **栈集成 v4** | **13.14%** | **36.43%** | **17.92%** | 53.95% | — | — |

### v3 → v4 对比

| 指标 | v3 | v4 | Δ |
|---|---:|---:|---:|
| 成本 MdAPE | 13.45% | **13.14%** | −0.31 pp |
| 成本 P90 | 38.32% | **36.43%** | −1.89 pp |
| 租金 MdAPE | 18.70% | **17.92%** | −0.78 pp |
| 租金 P90 | 53.70% | 53.95% | +0.25 pp |

### 栈权重

**成本**：M3 0.217、M5 0.208、M7 0.189、M2 0.187、M4 0.116、M8 0.072、M6 0.012、M9 0.000、M10 0.000、M1 0.000。
→ M9 与 M10 在成本上**权重为 0**；一旦进入栈集成，它们的增量特征完全被 M3 的原有变量吞并。

**租金**：M5 0.279、M7 0.220、M9 0.165、M3 0.163、M10 0.087、M4 0.086、M1 0.000、M2 0.000、M6 0.000、M8 0.000。
→ M9 拿 **16.5%** 权重，M10 拿 **8.7%**。租金是 OSM 真正起作用的地方 —— 租金更直接反映市中心便利度，而 POI 组成正好刻画这个维度。

---

## 5. 诚实的保留意见

1. **成本 −0.31 pp 落在交叉验证噪声范围内**。这一改进来自栈对 v3 各模型的重新加权，而不是 OSM 本身（OSM 在成本上权重为 0）。应当视为"打平"而非"胜出"。
2. **租金提升真实但温和**。0.78 pp 与"culture-share 通道在约 5% 最差残差城市上贡献 ~5% 方差"的量级一致。
3. **最大残差未因 OSM 改变** —— 它们是 **GT 本身的问题**，不是模型失败：
   - 圣何塞（哥斯达黎加）GT=$4 023（鉴于当地工资，不合理）
   - 开罗 / 重庆 / 成都 / 海得拉巴：Numbeo 小样本城市页在低收入国家系统性高估
   - 巴厘岛：旅游 Airbnb 供给扭曲了"市中心租金"代理变量
4. **未实际运行 VIIRS 与区域 CPI**。VIIRS 需要 ~30 GB 卫星栅格 + 每城市分区统计；区域 CPI 面板需要抓取 Eurostat NUTS-2 与 ≥15 国家统计局。都保留在路线图，但超出单次交付范围。

---

## 6. 生产交付

[lib/costModel.ts](lib/costModel.ts) 已升级，导出 `estimateCost(input)` 使用 v4 栈集成。函数签名、CI、置信标签、逐方法权重全部沿用 v3。传入 `osmCounts: null`（或省略）会干净地回退到无 OSM 基线；`hasOSM` 哑变量保证不引入系统偏差。

```ts
estimateCost({
  name: '曼谷', country: '泰国', continent: '亚洲',
  wage: 820, bigMac: 3.4, gni: 7230, gdp: 19260, hdi: 0.8, flights: 140,
  airbnbUSD: 58,
  osmCounts: { dining: 1820, culture: 210, health: 340, edu: 180,
               retail: 2100, finance: 310, transit: 95, tourism: 540 },
});
// → { cost: ~780, rent: ~420, ciLow, ciHigh, confidence: 'medium', methodWeights: {…} }
```

---

## 7. 下一步（真实可执行，不画饼）

- **VIIRS 夜间灯光**：下载 NOAA VNL V2.2 月度合成，按城市 5 km 半径计算平均辐射值。学术文献中与 log(GDP) 的 r ≈ 0.6，是独立信号，预计能把成本 MdAPE 推入 12% 以下。
- **区域 CPI**：Eurostat NUTS-2 HICP（28 国免费）+ 日本总务省都道府县 CPI + 中国 NBS 70 城 HPI，替代 PLI 列以解决国内城市间差异。
- **Nominatim 手工修正**：对被质控排除的 ~8 个城市手工给坐标。工作量小，收益中等。
- **训练时下调 GT 离群点权重**：用 ILO 工资 + GNI 对哥斯达黎加 / 巴厘岛 / 伊朗 / 埃及做合理性检查，若 GT / 工资 > 同区域中位数 3 倍，在 Huber 上再降权至 ≤ 0.4。应能明显压缩最差误差桶。

---

## 8. 存档文件清单

- [data/sources/osm/geocoded.json](data/sources/osm/geocoded.json) — 151 城市坐标
- [data/sources/osm/poi-counts.json](data/sources/osm/poi-counts.json) — 151 × 8 POI 计数（2 km 半径）
- [data/sources/cost-models/trained-v4.json](data/sources/cost-models/trained-v4.json) — 10 个基模型参数 + 栈权重 + OOF 预测
- [scripts/research/10-geocode.mjs](scripts/research/10-geocode.mjs) · [11-osm-poi.mjs](scripts/research/11-osm-poi.mjs) · [12-osm-corr.mjs](scripts/research/12-osm-corr.mjs) · [fit-models-v4.mjs](scripts/research/fit-models-v4.mjs)
- [lib/costModel.ts](lib/costModel.ts) — 生产估算器（v4）
- 本报告：[_archive/reports/cost-estimation-research-v4-final.md](_archive/reports/cost-estimation-research-v4-final.md)

**端到端复现**：`node scripts/research/10-geocode.mjs && node scripts/research/11-osm-poi.mjs && node scripts/research/fit-models-v4.mjs`。
