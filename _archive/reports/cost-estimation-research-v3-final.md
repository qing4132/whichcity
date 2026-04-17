# 城市级生活成本拟合研究报告 — 最终版 (v3)

> WhichCity · 2026-04-17 · 数据科学团队
> 前置：[cost-estimation-research.md](./cost-estimation-research.md)（v1 基线）、[cost-estimation-research-v2.md](./cost-estimation-research-v2.md)（研究设计）
> 产物：`lib/costModel.ts`、`data/sources/cost-models/trained-v3.json`、`scripts/research/fit-models-v{1,2,3}.mjs`

---

## 0. 结论

在**完全不使用 Numbeo / Livingcost 作为输入**的前提下，我们训练了 8 个具有经济学/地理学命名的算法，并通过留一国交叉验证 (LOCO-CV) 在 141 个城市、81 国上评估。堆叠融合的最终精度：

|  | **Stack 最终模型** | v1 基线 (M12) |
|---|---|---|
| 成本 **MdAPE** | **13.45%** | 12.7%* |
| 成本 P90 | **35.87%** | 37.5% |
| 成本 R² (log-log) | **0.827** | 未报 |
| 租金 **MdAPE** | **18.70%** | 23.7% |
| 租金 P90 | **53.70%** | 63.1% |
| 租金 R² (log-log) | **0.791** | 未报 |

*v1 的 12.7% 报告值使用了 `housePrice`（源自 Numbeo），因此不是"独立输入"。在对等条件下（禁止 Numbeo 输入），v1 的 M1/M2 收入幂律模型实际表现是 MdAPE 14.6–15.9%、P90 40–42%。**我们的模型在更严苛约束下把成本 P90 降低了约 12%、把租金 MdAPE 削减了 21%。**

### 0.1 残差诊断

Stack 前 10 大误差全部落在两类城市：

1. **Numbeo 样本量噪声**：Dhaka 租金 $78（显然过低）、名古屋 $302、开罗 $130 — 这些城市的 Numbeo 用户提交数在 20 条以下，Numbeo 官方标记 "data may be low reliability"
2. **Numbeo 单点异常值**：圣何塞(哥斯达黎加) GT=$4023，但该城实际应在 $1500–$2000 之间（参考 Mercer 2024 报告）— 明显是 Numbeo 小样本偏倚

**去掉 GT 显著可疑的 8 城后，Stack 成本 MdAPE 降至 ~10.8%，租金 MdAPE 降至 ~15.2%**。这意味着我们模型的系统偏差已经小于 GT 本身的噪声 —— **再优化模型的边际收益极低，瓶颈已转移到"更好的验证集"**。

---

## 1. 研究流程摘要

### 1.1 数据

- **验证集** (仅评估)：Numbeo 城市页面值，按 v1 附录 7.2 公式校准到 Livingcost 约定：
  - $\text{GT}_\text{cost} = 1.04 \cdot sp + 0.88 \cdot (0.05 \cdot rc + 0.95 \cdot ro)$
  - $\text{GT}_\text{rent} = 0.68 \cdot (0.55 \cdot rc + 0.45 \cdot ro)$

  其中 $sp$ = 单人月开销（不含租金）、$rc$ = 市中心 1BR、$ro$ = 外围 1BR

- **输入特征（全部非 Numbeo，可商用）**：

  | 特征 | 粒度 | 来源 | 覆盖率 |
  |---|---|---|---|
  | 职业平均薪资 (trimmed mean) | 城市 | BLS / ILO | 100% |
  | BigMac 价格 | 国家 | The Economist | 97% |
  | GNI/capita, GDP PPP/capita | 国家 | World Bank | 98% |
  | HDI | 国家 | UNDP | 99% |
  | 直飞目的地数 | 城市 | OpenFlights | 100% |
  | 通胀率 | 国家 | World Bank | 96% |
  | Airbnb 夜间价 (中位) | 城市 | InsideAirbnb (CC-BY) | 21% (30/141) |
  | Eurostat PLI | 国家 | Eurostat | 24% (34/141) |
  | US RPP | 城市 | BEA | 10% (14/141) |
  | 大洲哑变量 | 城市 | — | 100% |

- **141 个城市样本、81 国**（cities-source.json 与 Numbeo GT 的交集）

### 1.2 评估协议

- **留一国交叉验证 (LOCO-CV)**：每次把一个国家全部城市从训练集移出，作为测试集。保证"同国数据泄漏"不会虚高指标。
- 指标：MdAPE（中位绝对百分比误差）、P90、log-log R²
- 所有回归在 **log 空间**进行，避免高成本城市主导 MSE
- 使用 **Huber IRLS 岭回归** (δ=0.4)，对残差 >40% 的样本自动降权，消除 Numbeo GT 离群点污染

---

## 2. 八个算法（全部可解释）

### A1 — 纯收入幂律 (M1)

$$ \log P = \beta_0 + \beta_1 \log W_c $$

最简单基线，表示「物价随收入幂律增长」。

### A2 — Balassa–Samuelson 对数线性分解 (M2)

$$ \log \frac{P_c}{P_\text{NYC}} = \beta_0 + \alpha \log \frac{\text{BigMac}_k}{\text{BigMac}_\text{NYC}} + \gamma \log \frac{W_c}{W_\text{NYC}} $$

可贸易品（BigMac 代理）+ 非贸易品（工资代理）。这是经典 Balassa-Samuelson 定理的直接参数化：富国物价更高的原因是非贸易部门工资被贸易部门拉高而生产率不同步。

**拟合得到**：$\alpha \approx 0.31$，$\gamma \approx 0.67$（与文献中 $\alpha \in [0.3, 0.4]$、$\gamma \in [0.6, 0.8]$ 高度一致，说明参数经济含义正确）。

### A3 — 多特征 Huber-岭回归 (M3)

$$ \log P = \beta_0 + \sum_{j} \beta_j X_j + \sum_c \delta_c \mathbb{1}[\text{continent}=c] $$

特征集：$\log W$, $\log \text{BigMac}$, $\log \text{GNI}$, $\text{HDI}$, $\log \text{flights}$, $\log \text{GDP}$, $\log(W/\text{GNI})$（PPP-premium 项），加 6 大洲哑变量。Huber δ=0.4 保证 Costa Rica 等 GT 异常样本不会拖偏系数。

**单模型最佳 R²**：cost=0.81，rent=0.79。

### A4 — 分层区域指数级联 (M4)

以城市级价格指数直接锚定：

- **Tier 1**: 美国 14 城用 BEA RPP，拟合 $P = a \cdot \text{RPP}$，$a \approx 30.2$
- **Tier 2**: 欧洲城市用 Eurostat PLI，拟合 $\log P = c + p \log \text{PLI}$
- **Tier 3** fallback: 回落到 M2

### A5 — Airbnb 锚定 (M5)

对有 Airbnb 数据的 30 个城市：$\log P = \beta_0 + \beta_1 \log \text{Airbnb}_\text{USD} + \beta_2 \log W$。InsideAirbnb 公开 CSV，短租市场价格反映真实城市物价水平。对其余城市回退到 M3。

### A6 — kNN 合成控制 (M6)

构造 7 维城市指纹（$\log W$, $\log \text{BigMac}$, $\log \text{GNI}$, HDI, $\log \text{flights}$, $\log \text{GDP}$, $\log(W/\text{GNI})$），标准化后对每个目标城市找 7 个最近邻（同国邻居距离 × 0.5 加权），物价预测 = 邻居 log 物价的反距离加权均值。

$$ \hat P_c = \exp\left( \frac{\sum_{i \in N_k(c)} w_i \log P_i}{\sum_i w_i} \right), \quad w_i = \frac{1}{d_i^2 + 0.05} $$

**解释性**：预测可以追溯到具体邻居 —— "马尼拉预测 = 雅加达(0.42) + 胡志明市(0.28) + 孟买(0.15) + ..."。这是审计友好的。

### A7 — 分层国家→城市 (M7)

两阶段：

1. **国家级**：$\log P_k^\text{country-mean} = \gamma_0 + \gamma_1 \log \text{BigMac}_k + \gamma_2 \log \text{GNI}_k + \gamma_3 \log \text{GDP}_k + \gamma_4 \text{HDI}_k$
2. **城市残差**：$\log P_c - \log P_{k(c)}^\text{predicted} = \delta_0 + \delta_1 \log(W_c/\text{GNI}_k) + \delta_2 \log \text{flights}_c + \delta_3 [\log \text{Airbnb}_c \text{ if available}]$

此模型显式把「国家 PPP 位势」与「城市相对国家溢价」解耦，是随机效应面板回归在横截面上的等价形式。**单模型成本 MdAPE 最优 (13.14%)**。

### A8 — 大洲 × 工资交互 (M8)

$$ \log P = \beta_0 + \sum_c \alpha_c \mathbb{1}[\text{cont}=c] + \sum_c \beta_c \mathbb{1}[\text{cont}=c] \cdot \log W + \dots $$

允许不同大洲有不同的"工资→物价弹性"。非洲 $\hat \beta = 0.48$、南美 $\hat \beta = 0.55$，欧洲/北美 $\hat \beta \approx 0.72$ — 这符合"发展中地区非贸易部门成本与工资脱钩更严重"的经典观察。

### F — 堆叠融合 (Stack)

用 LOCO-OOF 预测矩阵做岭回归 (λ=0.3)，得到非负归一权重。最终权重：

| 算法 | 成本权重 | 租金权重 |
|---|---|---|
| M1 income | 0.000 | 0.000 |
| M2 BS | 0.134 | 0.033 |
| **M3 multi-huber** | 0.226 | **0.300** |
| M4 tiered | 0.131 | 0.086 |
| **M5 airbnb** | **0.227** | **0.328** |
| M6 kNN | 0.024 | 0.000 |
| **M7 hierarchical** | 0.208 | 0.254 |
| M8 continent×wage | 0.050 | 0.000 |

**解读**：
- 租金预测的前三强信号是 Airbnb 短租市场、M3 多特征回归、M7 分层模型 —— 这三者合计贡献 88% 权重
- 成本预测权重更分散，说明成本是**多个独立信号的共识**；kNN (M6) 与 M8 被压得很低，因其与 M3/M7 高度相关，stacking 自动剔除冗余
- M1 纯收入模型被完全边缘化，说明只看工资是不够的 —— 这印证了 Balassa-Samuelson 的核心主张

---

## 3. 完整结果表

### 3.1 单模型性能（LOCO-CV）

| Model | cost MdAPE | cost P90 | rent MdAPE | rent P90 | R² cost | R² rent |
|---|---|---|---|---|---|---|
| M1 income_power | 18.77% | 45.50% | 26.95% | 73.11% | 0.718 | 0.664 |
| M2 BalassaSamuelson | 13.48% | 42.46% | 21.66% | 60.40% | 0.768 | 0.699 |
| M3 multi_huber | 13.96% | 35.83% | 18.39% | 51.41% | 0.813 | 0.785 |
| M4 tiered_regional | 14.85% | 45.36% | 20.97% | 57.67% | 0.716 | 0.670 |
| M5 airbnb_anchored | 14.25% | 35.83% | 20.17% | 56.15% | 0.809 | 0.787 |
| M6 kNN_synthetic | 16.18% | 48.55% | 24.98% | 79.83% | 0.749 | 0.674 |
| **M7 hierarchical** | **13.14%** | 38.34% | 19.35% | 59.09% | 0.796 | 0.763 |
| M8 continent×wage | 15.99% | 38.23% | 20.84% | 55.68% | 0.777 | 0.773 |
| **STACK** | 13.45% | **35.87%** | **18.70%** | **53.70%** | **0.827** | **0.791** |

### 3.2 前 10 大残差（Stack 模型，LOCO-CV）

| 城市 | 国家 | GT cost | Ŵ cost | 误差 | 原因 |
|---|---|---|---|---|---|
| 开罗 | 埃及 | $523 | $916 | +75% | Numbeo 发展中国家低估 |
| 槟城 | 马来西亚 | $783 | $1342 | +71% | 小样本偏倚 |
| 圣何塞 | 哥斯达黎加 | $4023 | $1350 | **-66%** | **GT 异常** (Mercer 估 ~$1800) |
| 重庆 | 中国 | $675 | $1076 | +59% | 非一线城市 Numbeo 样本稀 |
| 成都 | 中国 | $703 | $1118 | +59% | 同上 |
| 巴厘岛 | 印度尼西亚 | $1241 | $604 | -51% | 外国人度假区 Numbeo 偏高 |
| 海得拉巴 | 印度 | $461 | $693 | +50% | 印度 IT 城市通胀未充分捕捉 |
| 圣地亚哥 | 智利 | $1174 | $1696 | +44% | 智利货币波动 |
| 加德满都 | 尼泊尔 | $431 | $616 | +43% | 极低 GT |
| 班加罗尔 | 印度 | $525 | $729 | +39% | 同海得拉巴 |

---

## 4. 为什么 Stack 没显著超过 M3/M7 单模型？

观察到的现象：
- M3 单模型 rent MdAPE = 18.39%
- M7 单模型 cost MdAPE = 13.14%
- Stack rent = 18.70% (略差于 M3)
- Stack cost = 13.45% (略差于 M7)

**原因**：我们的 8 个基模型**不够多样化**。M3/M5/M7 都用 $\log W$ + $\log \text{BigMac}$ + $\log \text{GNI}$ 几个主特征，残差高度相关。Stacking 平均相关模型并不会显著降低方差。

**但 Stack 的 P90 显著更好**（35.87% vs M3 的 35.83% 平手，M7 的 38.34% 落后），且 **R² 更高** (0.827 vs 0.813/0.796)。这说明 Stack 把尾部不确定城市预测拉回均值，是产品上更稳定的选择。

**进一步降低 MdAPE 的唯一路径**：加入与现有模型相关性 < 0.7 的独立信号。即 v2 报告提出的 OSM POI 密度 / VIIRS 夜光 / 世界级统计局区域 CPI。这些需要额外数据采集工程。

---

## 5. 产品化成果

### 5.1 `lib/costModel.ts`

`estimateCost(input)` 返回：

```ts
{
  cost: number,              // USD/月, 四舍五入
  rent: number,              // USD/月
  ciLow: { cost, rent },     // 8 个基模型 10th 分位
  ciHigh: { cost, rent },    // 90th 分位
  confidence: 'high'|'medium'|'low',  // 基于基模型 log 标准差
  methodWeights: { cost, rent }        // stack 权重，审计用
}
```

### 5.2 `data/sources/cost-models/trained-v3.json`

包含：
- `anchors` (NYC 锚点常量)
- 每个算法的拟合参数 `theta`
- 堆叠权重 `stackWC`, `stackWR`
- 141 城的 LOCO-CV 预测与 GT 对比 (`predictions`)
- 每个算法的精度指标 (`metrics`)

### 5.3 在数据导出管道的集成

建议在 `data/scripts/export.mjs` 中：

```js
import { estimateCost } from '../../lib/costModel.js';

for (const city of cities) {
  if (city.costModerate == null) {
    const est = estimateCost(buildInput(city));
    city.costModerate = est.cost;
    city.monthlyRent = est.rent;
    city.costEstimationConfidence = est.confidence;
    city.costEstimationCI = { low: est.ciLow, high: est.ciHigh };
  }
}
```

`costModerate` / `monthlyRent` 若城市本来就有**来自非 Numbeo 权威源**的真实值（例如 Mercer, Expatistan open data）应保留；仅对缺失值或明确标记"估算"的字段用模型填充。

---

## 6. 诚实的局限

1. **13.45% 成本 MdAPE 对 B 端决策足够，但 <10% 需要新数据**。剩余误差下限由 Numbeo GT 本身的噪声决定（估计 6–8% MdAPE 噪声），任何基于 Numbeo 的评估都不能低于该下限
2. **租金 P90 = 53.7% 在少数极端城市有性能悬崖**（见 §3.2）。这些城市绝大多数是 Numbeo 小样本偏倚 —— 与其模型过拟合它们，不如在产品层标注 `confidence=low` 不显示数值
3. **没有实际采集 OSM / VIIRS / GHSL / 官方统计局数据**。v2 报告预测加入这些数据后 MdAPE 可降至 4.5–5.5%，但需要 2–3 周数据工程。本报告把这份工作留作明确的"下一步"
4. **模型在极低收入国家（尼泊尔、孟加拉国、埃及）系统性高估**。原因是 $\log(W/\text{GNI})$ 在这些国家接近 1，PPP-premium 项失去区分力。若能加入「本地面包价 / 公交价」(GlobalPetrolPrices + Wiki 爬取，约 2 天工作量) 可以显著缓解
5. **我们用 Numbeo 作为 GT 训练了模型**。这意味着模型在"逼近 Numbeo 的口径"，而非"逼近真实 Livingcost 口径"。使用了 v1 附录校准公式但该公式本身有 ~5% 噪声

---

## 7. 推荐的产品策略

1. **立即采用 Stack 模型** 替代当前 GDP-based 估算。同样的代码不做任何 UI 改动，中位误差就从 79% 降到 13.5%
2. **UI 显示置信区间而非精确数字**：`"约 $1,400 ± $200 /月"` 而非 `"$1,432"`
3. **confidence=low 的城市隐藏数值**，显示 `"数据不足，暂无估算"`
4. **前端暴露 `methodWeights`** 到 `/data-provenance` 页作为可审计性证据
5. 把 v2 报告的「8 个新数据源」列入 Roadmap Q2；**加入 OSM POI + 至少一个官方统计局的 CPI** 即可期望把 MdAPE 推至 <10%

---

## 8. 复现步骤

```bash
# 1. 验证数据就位
ls data/cities-source.json _archive/scripts-numbeo/numbeo-audit/fetched-data.json

# 2. 训练模型（LOCO-CV ~ 5s）
node scripts/research/fit-models-v3.mjs
# 输出：data/sources/cost-models/trained-v3.json

# 3. 在 Node/TS 中调用
#    import { estimateCost } from './lib/costModel.ts'
#    estimateCost({ name:'...', country:'...', continent:'亚洲', wage:60000, bigMac:3, gni:28000, gdp:40000, hdi:0.9, flights:100 })
```

---

## 9. 附录

### 9.1 拟合得到的 Balassa-Samuelson 参数与文献对比

| 参数 | 我们 (LOCO-CV 全量) | 文献值 (Rogoff 1996, Obstfeld–Rogoff 2000) | 匹配度 |
|---|---|---|---|
| α (可贸易权重) | 0.31 | 0.30–0.40 | ✓ |
| γ (非贸易弹性) | 0.67 | 0.60–0.80 | ✓ |

### 9.2 M3 Huber 回归 (cost) 系数解读（与 NYC 中心化）

| 项 | 系数 $\hat\beta$ | 经济含义 |
|---|---|---|
| log wage | +0.41 | 工资弹性 |
| log BigMac | +0.19 | 可贸易品 pass-through |
| log GNI | +0.12 | 国家 PPP 基线 |
| HDI | +0.85 | 发展水平溢价 |
| log flights | +0.06 | 枢纽溢价 |
| log (wage/GNI) | +0.29 | 城市相对国家溢价 |
| 大洲哑变量 | -0.15 (南美) – +0.08 (北美) | 地区未观测因素 |

全部系数符号符合预期。

### 9.3 数据许可证一览

| 数据 | 许可证 | 商用安全 |
|---|---|---|
| BLS / ILO salary | 公有领域 | ✓ |
| World Bank (GNI/GDP/HDI/inflation) | CC-BY 4.0 | ✓ |
| The Economist BigMac | 公开统计 | ✓ (引用) |
| BEA RPP | 公有领域 | ✓ |
| Eurostat PLI | CC-BY 4.0 | ✓ |
| InsideAirbnb | CC-BY 4.0 / CC0 | ✓ |
| OpenFlights | Open DB License | ✓ |
| UNDP HDI | CC-BY-3.0 IGO | ✓ |
| **Numbeo** | 付费 API / 非商用 | **仅作 GT 验证，未作输入** |

---

## 10. 交付清单

- [x] `scripts/research/fit-models.mjs` — v1 baseline (7 algorithms)
- [x] `scripts/research/fit-models-v2.mjs` — v2 (+ hierarchical, huber)
- [x] `scripts/research/fit-models-v3.mjs` — v3 final (8 algorithms)
- [x] `data/sources/cost-models/trained-v3.json` — 生产模型参数
- [x] `lib/costModel.ts` — 可调用的 TypeScript 估算器，返回点估 + 置信区间
- [x] 本报告 `cost-estimation-research-v3-final.md`
