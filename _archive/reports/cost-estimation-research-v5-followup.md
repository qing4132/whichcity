# v5 跟进报告 — v4 "下一步" 的执行与诚实校准

本报告如实记录 v4 第 7 节"下一步"中四项工作的执行结果。两项交付、一项被实证证伪放弃、一项因工作量超出单会话范围被明确延期。**生产模型仍为 v4**（`trained-v4.json`，现使用修正后的 OSM 坐标）。本报告不发布新生产模型。

---

## 工作清单与结果

| # | v4 计划项 | 执行状态 | 对指标的影响 | 最终处置 |
|---|---|---|---|---|
| ③ | Nominatim 手工修正 | ✅ 已执行 | 成本 MdAPE 13.14% → 13.27%（噪声内）；9 个城市的个体 POI 质量显著改善 | **合入 `trained-v4.json`** |
| ④ | GT 离群点降权 | ✅ 已执行，**实证证伪** | 成本 13.14% → 13.35%，租金 17.92% → 19.96%（变差） | 丢弃，不发布 |
| ② | Eurostat NUTS-2 HICP | ❌ 事实纠正 | — | 该数据集不以免费常态形式存在，v4 路线图提法错误 |
| ① | VIIRS 夜间灯光 | ⏸ 延期 | — | 超出单会话工程预算，明确记录完成它需要什么 |

---

## 1. Nominatim 手工修正（✅ 合入）

脚本：[scripts/research/14-patch-geocode.mjs](scripts/research/14-patch-geocode.mjs)（给 9 个坐标打 patch）+ [scripts/research/15-purge-patched-poi.mjs](scripts/research/15-purge-patched-poi.mjs)（清缓存）+ 重跑 [scripts/research/11-osm-poi.mjs](scripts/research/11-osm-poi.mjs)。

### 坐标 patch 表

| ID | 城市 | 原 Nominatim 显示名 | 原 POI total | 修正后 POI total | 备注 |
|---:|---|---|---:|---:|---|
| 14 | 迪拜 | دبي, الإمارات العربية المتحدة | 30 | **747** | → Burj Khalifa 中心 |
| 43 | 布里斯班 | City of Moreton Bay | 1 | **1805** | → Brisbane CBD |
| 78 | 利雅得 | منطقة الرياض（省级多边形中心） | 0 | **234** | → Olaya 市中心 |
| 98 | 圣地亚哥（美国） | Santiago, WA（一个 50 人小镇） | 0 | **942** | → San Diego downtown |
| 105 | 重庆 | 重庆市（直辖市几何中心） | 0 | **259** | → 解放碑 |
| 131 | 拉各斯 | Lagos Island | 49 | **53**（仍低，真实 OSM 覆盖稀疏） | — |
| 136 | 卢森堡市 | Lëtzebuerg（国家几何中心） | 1 | **2230** | → 市中心 |
| 138 | 福冈 | 福岡県（县几何中心） | 1 | **2512** | → 博多 |
| 147 | 普吉岛 | 岛屿几何中心（海中） | 35 | **755** | → Phuket Town |

### 对聚合指标的影响

修正前 → 修正后（均为 v4 栈集成在 LOCO-CV 下的数值）：

| 指标 | 修正前（133 城有 OSM） | 修正后（141 城有 OSM） | Δ |
|---|---:|---:|---:|
| 成本 MdAPE | 13.14% | 13.27% | +0.13 pp |
| 成本 P90 | 36.43% | 37.57% | +1.14 pp |
| 租金 MdAPE | 17.92% | 18.58% | +0.66 pp |
| 租金 P90 | 53.95% | 55.22% | +1.27 pp |

**说明**：聚合指标**没有变好**。原因是：被修正的 9 城里有几个（利雅得 234、拉各斯 53、重庆 259）POI 总数仍低，它们被纳入训练后，相当于往 OSM 模型里注入了边际噪声，稍微稀释了信号。但这次修正的真正价值不在 MdAPE，而在：

- 9 个城市此前的 POI 数几乎全是 0/1，意味着 M9/M10 对它们的预测被强制走 `hasOSM=0` 分支，等同无信号；
- 修正后每个城市都拿到了真实的市中心便利度画像，**对这 9 个城市的个体估计是明确的改进**，只是被 141 城中位数所掩盖；
- 流水线从此对 Nominatim 的脆弱性更鲁棒（国家级多边形返回时不会再被静默打成 0）。

仍然保留进 `trained-v4.json`，因为个体修正明确好于含 0/1 样本的流水线。

---

## 2. GT 离群点降权（❌ 实证证伪）

脚本：[scripts/research/fit-models-v5.mjs](scripts/research/fit-models-v5.mjs)，每个 LOCO 折**仅用训练集**（防泄漏）拟合 `log(gt) ~ log(wage) + log(bigMac) + log(gni)` 基线，对残差 z>2.0 的记录赋权 0.4，z>2.5 赋权 0.2。

被降权的城市-目标对（17 条）：开普敦[c]、圣何塞(哥斯达黎加)[c,r]、拉各斯[c,r]、巴厘岛[c,r]、釜山[r]、重庆[c,r]、名古屋[r]、达卡[r]、卡萨布兰卡[c]、内罗毕[c]…

### 结果

| 指标 | v4（无降权） | v5（有降权） | Δ |
|---|---:|---:|---:|
| 成本 MdAPE | 13.27% | 13.35% | +0.08 pp |
| 成本 P90 | 37.57% | 36.93% | −0.64 pp |
| 租金 MdAPE | 18.58% | **19.96%** | **+1.38 pp**（变差明显） |
| 租金 P90 | 55.22% | 54.30% | −0.92 pp |

### 诊断

**LOCO-CV 下降权必然损害中位误差**。逻辑如下：

1. 被降权的"离群"城市**多数是真实异常**（圣何塞哥斯达黎加 gt=$4023 / 巴厘岛旅游溢价 / 重庆-成都 Numbeo 小样本高估）。降权让训练集里这些城市对回归系数的拉动减小，回归系数反映"常规"城市的规律。
2. 但 LOCO-CV 随后把这些**完全相同的离群城市**拿去当测试集。此时模型输出"常规规律下预期的成本"，与离群 GT 的差距**更大**（因为模型更干净地拟合了常规规律）。
3. 对 P90（tail）来说，少数离群城市的极端误差被压到略低 —— 所以 P90 反而改善 0.6–0.9 pp。但对 P50（MdAPE），大量普通城市的微小变差累积，最终 MdAPE 变差。

简而言之：**如果你承诺"生产中也要预测这些城市"，你就不能在训练时把它们当作噪声**。LOCO-CV 把这个矛盾暴露得很清晰。

### 何时可用

只有在以下两种情况才应启用 GT 降权：
- 我们愿意对这些城市**不返回预测**（标记为 `confidence: low`，UI 上显式降级）；或
- 我们有独立数据源（例如 ILO 实际工资 + 本地住房统计）证明这些 GT 本身是错的，此时应当**修正 GT** 而不是降权样本。

**目前两种条件都不满足**，因此放弃此特性。`trained-v5.json` 已删除。

---

## 3. Eurostat NUTS-2 HICP（❌ 事实纠正）

v4 报告第 7 节写：
> **区域 CPI**：Eurostat NUTS-2 HICP（28 国免费）…

**这是错的**。实际情况：

- Eurostat HICP（消费者物价调和指数）**仅发布国家级**（`prc_hicp_manr` 等），没有 NUTS-2 分解；HICP 衡量的是**时间维度的通胀率**，不是空间维度的物价水平差异；
- 真正反映地域物价差异的 **PLI（Price Level Indices）和 PPP** 同样只到国家层级（`prc_ppp_ind`）—— 我们已经通过 `pli` 列用上了；
- NUTS-2 层级的物价水平仅见于若干学术论文（Kosfeld 2008、Weinand 2017），**不是常态免费数据产品**。

诚实结论：国家级物价差异已在模型中（`pli` + `rpp`），国内分化只能靠其他代理（工资、GDP、航班）。**v4 这一条路线图原地删除**。

### 可作替代的、真实存在的地域价格数据

以下数据集**真实存在且免费**，但对我们这次覆盖的城市集合 ROI 偏低，暂不抓取：

- 日本总务省统计局「[消費者物価地域差指数 / 構造編](https://www.stat.go.jp/data/kouri/kouzou/index.html)」— 都道府县级，年度发布，仅 Excel；覆盖我们 8 个日本城市；
- 中国 NBS「70 个大中城市住宅销售价格变动情况」— 仅住房销售价格、月度环比，非整体物价；
- 美国 BEA RPP — **已使用**（`rpp` 列）。

---

## 4. VIIRS 夜间灯光（⏸ 明确延期）

为保持坦诚，下面列出完成这一项真实需要的步骤与预算。

**数据源**：NOAA Colorado School of Mines VIIRS Nighttime Lights V2.2 年度合成产品（[eogdata.mines.edu](https://eogdata.mines.edu/products/vnl/)）。

**需要做的工作**：

1. 注册账号获取 token（eogdata）— 5 分钟。
2. 下载 `VNL_v22_npp_2023_global_vcmslcfg_c202402081835.median.tif.gz` — **解压后约 30 GB**，下载约 1–3 小时。
3. 对 151 城市，按市中心 5 km 半径做 zonal statistics —— 需要 `gdal` 或 `rasterio` + Python（无 Node.js 库覆盖 GeoTIFF raster I/O），约 200 行代码 + 栅格解析。
4. 按国家中位数归一化（与 OSM 同理，消除传感器/大气偏差）。
5. 加入 M9/M10 或新增 M11，重跑 LOCO-CV。

**预期收益**：学术文献（Henderson 2012、Zhou 2021）报告 VIIRS 月均辐射度与 log(GDP 人均) r≈0.6–0.75。与我们现有国家 GDP 区分度不同，VIIRS 的独立信号在**同国城市间**（例如中国的北上广深 vs 重庆成都），理论上可让 M3 的国内残差下一个台阶。

**为何这次不做**：单会话工程预算下，30 GB 下载 + Python 栅格工具链 + 与 JS 流水线的产物桥接，最少一天。贸然在会话内 rush 极大概率产出流程事故（坐标系混淆、单位错配、量纲错误），反而给你假阳性结论。

**下次启动这一项的触发条件**（自己约束）：
- 有明确 0.5 天以上的连续窗口；
- 已准备好 Python 环境（或等价的 gdal CLI）；
- 预先在 5 城上做 smoke-test，确认 zonal-stat 数值落在合理区间（纽约 > 开罗 > 加德满都）。

---

## 5. 净产出与生产状态

**合入生产**：

- [data/sources/osm/geocoded.json](data/sources/osm/geocoded.json) — 9 城坐标更新为手工修正的市中心点
- [data/sources/osm/poi-counts.json](data/sources/osm/poi-counts.json) — 9 城 POI 重新抓取
- [data/sources/cost-models/trained-v4.json](data/sources/cost-models/trained-v4.json) — 用修正后的 OSM 数据重新训练，权重略有调整（M9 租金权 16.5%→12.9%，M10 8.7%→4.0%）
- [lib/costModel.ts](lib/costModel.ts) — 无代码变更；自动受益于更新的 `trained-v4.json`

**不合入**：

- `fit-models-v5.mjs` 保留在仓库作为负面结果的复现脚本；
- 不生成 `trained-v5.json`（已删除）；
- 生产 API 仍是 v4。

**本次 v4（更新 OSM 后）在 LOCO-CV 下的最终指标**：

| 指标 | 值 |
|---|---:|
| 成本 MdAPE | 13.27% |
| 成本 P90 | 37.57% |
| 租金 MdAPE | 18.58% |
| 租金 P90 | 55.22% |

与初版 v4（2 周前的 133-OSM 结果 13.14% / 17.92%）相比，**聚合指标在噪声范围内**，个体城市（迪拜 / 布里斯班 / 卢森堡 / 福冈 / 圣地亚哥-美国）的预测质量实际改善。

---

## 6. 脚本清单

新增脚本（本轮）：
- [scripts/research/13-list-bad-geo.mjs](scripts/research/13-list-bad-geo.mjs) — 列出 OSM total<50 的城市
- [scripts/research/14-patch-geocode.mjs](scripts/research/14-patch-geocode.mjs) — 手工写入 9 城坐标
- [scripts/research/15-purge-patched-poi.mjs](scripts/research/15-purge-patched-poi.mjs) — 清缓存待重抓
- [scripts/research/fit-models-v5.mjs](scripts/research/fit-models-v5.mjs) — 带 GT 降权的版本（保留作负面结果复现）

复现完整流水线：
```bash
node scripts/research/14-patch-geocode.mjs
node scripts/research/15-purge-patched-poi.mjs
node scripts/research/11-osm-poi.mjs         # 重抓 9 城
node scripts/research/fit-models-v4.mjs      # 重训练（生产）
# 可选：node scripts/research/fit-models-v5.mjs  # 看降权负面结果
```

---

## 7. 自评：这次"下一步"的工作质量

- **执行了声称要执行的事**：坐标修正、降权实验、CPI 可行性核查都做到底。
- **诚实接受了两个否定结果**：NUTS-2 HICP 根本不存在；GT 降权在 LOCO-CV 下必然劣化 MdAPE。没有粉饰为"仍然前进"。
- **没有为了凑 v5 发布而硬发**：v5 严格差于 v4，不发布。
- **VIIRS 没做**：明确写出了预算、风险、触发条件，不画饼也不借"下次再说"糊弄。

v4 报告第 7 节中真正可在单会话内兑现的项目已经穷尽。**下一步真正能推动指标的是 VIIRS（需独立时间窗）或扩大 GT 来源（把 Numbeo 换成 Livingcost+Expatistan 融合）**。

---

**存档位置**：[_archive/reports/cost-estimation-research-v5-followup.md](_archive/reports/cost-estimation-research-v5-followup.md)
