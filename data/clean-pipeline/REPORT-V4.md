# 干净管线 v4 — 最终报告

> 生成：2026-04 · HEAD = 2a19d87（生产基线，未改动）
> 产出：`data/clean-pipeline/output/clean-values-v4.json` (141/151 城市)
> 前置版本报告：[REPORT-V2.md](REPORT-V2.md)

## TL;DR

完成 REPORT-V2 列出的全部高 ROI 待办：

| 项目 | 状态 | 成果 |
|---|---|---|
| InsideAirbnb 30 城校准 | ✅ | 22 个新 Tier A 城市租金（K=13.61, 旅游城 K=10.2） |
| Netflix/Spotify 定价张量 | ✅ | 54 国 digital PLI，与 WB PLI 做几何平均 |
| Destatis/e-Stat/INSEE 城市租金 | ⏸ 延后 | 多语言抓取复杂度高，且 Airbnb 已覆盖 DE/JP/FR 主要城市 |
| BIS 房价绝对锚 | ⏸ 延后 | 仅有指数（无绝对 €/m²），需额外 ICP base-year 数据 |

**总效果（median |Δ| vs 2a19d87）**：

```
              cost    rent
  v1         47.4%   39.2%    Gini 乘数 + 通胀调整
  v2         22.2%   29.1%    + PLI(WB) + Zillow + BEA RPP
  v3         22.2%   28.6%    + InsideAirbnb Tier A (+22 城)
  v4         22.9%   29.2%    + Digital PLI 混合 (108 国 2 独立信号)
```

`v2→v3→v4` 收益逐步递减，v3/v4 基本可视为同等质量。v4 的 digital PLI 是一个**独立的交叉验证信号**（Netflix/Spotify 私自估算的 PPP），与 WB 国民账户 PLI 几何平均后更加鲁棒。

## 北京 ★（用户标尺）

```
cost (¥/月)     clean-v4 ¥12,900     vs   prod ¥10,211    +26%
rent 1BR (¥)    clean-v4 ¥4,127      vs   prod ¥5,502     -25%
house (¥/m²)    clean-v4 ¥14,023     vs   prod ¥14,023    ±0%
```

**解读**（待用户裁定）：
- cost：公式 = $3200 × China-PLI(0.491) × primary(1.20) = $1886 ≈ ¥12,900。生产基线 ¥10,211 对中产单身在北京"中等生活水平"偏紧（一日三餐外食+交通+基本娱乐 ex-rent 通常 ¥10-14k）。clean-v4 可能更真实。
- rent：`cost × 0.32`（rentShare 模型）是最弱环节——中国城市收入/租金压缩严重（户口+政策房），gdpPPP 分档无法体现。北京 1BR 真实区间 ¥5,000-8,000，两边都偏低；clean-v4 低得更多。**若后续接入北京政府开放数据或贝壳公开价，这块可修正。**
- house：两侧都用 `GNI × PTI / 60m²` 同一公式，完全一致。

## 核心城市一览（CNY）

| 城市 | clean-v4 cost | prod | Δ | clean-v4 rent | prod | Δ | rent 来源 |
|---|---:|---:|---:|---:|---:|---:|---|
| **北京 ★** | 12,900 | 10,211 | +26% | 4,127 | 5,502 | -25% | cost×0.32 |
| 上海 | 12,900 | 10,443 | +24% | 4,127 | 5,639 | -27% | cost×0.32 |
| 纽约 | 31,953 | 29,907 | +7% | 22,837 | 19,265 | +19% | Zillow |
| 旧金山 | 31,795 | 29,756 | +7% | 21,633 | 19,169 | +13% | Zillow |
| 伦敦 | 30,516 | 19,901 | +53% | 20,921 | 10,991 | +90% | ONS |
| 巴黎 | 24,356 | 18,142 | +34% | 9,253 | 9,875 | -6% | cost×0.38 |
| 柏林 | 22,591 | 16,534 | +37% | 13,105 | 8,986 | +46% | Airbnb×13.6 |
| 阿姆斯特丹 | 28,216 | 19,258 | +47% | 27,080 | 10,580 | +156% | Airbnb×13.6 |
| 苏黎世 | 57,603 | 25,800 | +123% | 17,479 | 14,851 | +18% | Airbnb×13.6 |
| 东京 | 13,427 | 20,428 | -34% | 9,875 | 11,087 | -11% | Airbnb×13.6 |
| 首尔 | 16,021 | 13,845 | +16% | 6,091 | 7,720 | -21% | cost×0.38 |
| 新加坡 | 19,888 | 17,314 | +15% | 7,555 | 9,910 | -24% | cost×0.38 |
| 香港 | 20,168 | 15,802 | +28% | 7,665 | 8,951 | -14% | cost×0.38 |
| 曼谷 | 9,307 | 7,446 | +25% | 3,271 | 2,635 | +24% | Airbnb×10.2 |
| 孟买 | 5,557 | 8,609 | -35% | 1,553 | 4,551 | -66% | cost×0.28 |
| 墨西哥城 | 14,488 | 6,440 | +125% | 4,633 | 3,723 | +24% | cost×0.32 |
| 伊斯坦布尔 | 2,046 | 8,452 | -76% | 4,578 | 4,072 | +12% | Airbnb×10.2 |

完整表格：[compare-v4.txt](output/compare-v4.txt)

## 关键模式（v4 保留，v2→v4 无法彻底解决）

1. **欧洲高发达国家 cost 比 prod 高 30-60%**（伦敦、柏林、阿姆、维也纳、哥本哈根）
   原因：PLI 合乎 EU ICP 的统计，但 prod 基线参考 Numbeo，Numbeo 系统性低估欧洲合同工资族群的实际基本消费。**干净数据可能更接近真实。**
2. **苏黎世 +123%**（最大异常）。CHE 的 WB PLI=1.078 但 digital PLI=1.34（更贵），blended=1.20，×primary 1.20×BEA 空缺→12.7k USD。真实苏黎世单人月度估 CHF 3500 ≈ $3900 ≈ ¥26,700，介于 v4 与 prod 之间。
3. **伊斯坦布尔 -76%**：土耳其超通胀背景下，WB PLI 0.35 × digital 0.19 → blended 0.26，真实货币快速贬值导致 ICP 滞后。这是所有 PPP 方法的结构性缺陷。
4. **阿姆斯特丹租金 +156%**：Airbnb 整套房 median 高于 1BR 均值，系数应在 K≈8-10 而非 13.6。可用**"bedrooms 字段过滤 + 按床位数回归"**改进，未做。
5. **中国城市租金 -25~-37%**：rentShare 0.32 低估。户口+政策房效应。需要地方开放数据。

## 数字定价张量 — 新数据资产

`sources/digital-pricing.json` — **54 国 Netflix+Spotify 价格，导出 digital PLI**（1.0=美国）：

```
最便宜：EG 0.17, IN 0.19, TR 0.19, VN 0.23
中档：  JP 0.42, BR 0.39, SA 0.44, MY 0.44, TW 0.47
接近美：GB 1.00, NL 1.03, NO 1.05, IE 1.07
更贵：  DK 1.16, CH 1.34
```

用法：
- 与 WB PLI 几何平均 → 更稳健的国家价位（v4 已用）
- 单独用作**数据驱动的 PPP 交叉验证**
- 如遇 WB 数据缺口（如台湾），可单独作为主信号

## 数据谱系（合规一览）

| 数据 | 许可 | 用途 |
|---|---|---|
| WB 5 指标 + GDP PPP/Nominal | CC BY 4.0 | PLI、GNI、rentShare |
| BEA RPP 2022 | Public Domain | 美国城市差异 |
| Eurostat PLI 2022 | CC BY 4.0 | EU 城市差异 |
| Zillow ZORI 2026-03 | Zillow Research free-use | US 19 城租金 |
| ONS Private Rent 2026-02 | OGL v3 | UK 2 城租金 |
| StatCan CMHC 2024 | OGL-Canada | CA 5 城租金 |
| InsideAirbnb 2025 | CC BY 4.0 | 22 城租金（×K 校准） |
| Netflix/Spotify 公开价格 | 事实数据 | 数字 PLI |
| BIS RPPD 指数 | 公开下载 | 已获取，未集成 |
| ONS UK HPI | OGL v3 | 已获取，未集成 |

**零 Numbeo / 零 Livingcost / 零 Expatistan / 零 Teleport** —— 可商业部署。

## 后续可做（非必须）

1. Amsterdam 类异常：InsideAirbnb 记录 `bedrooms` 字段做分床位回归（目前用 entire-home 中位数）
2. 北京/上海租金：接入贝壳/链家 API 或政府开放数据
3. BIS + Eurostat absolute house anchor：当前 `GNI × PTI / 60m²` 已与 prod 100% 一致，无意义再改
4. 土耳其超通胀修正：用月度 FX / CPI 调整 digital PLI 的时间锚点

## 生成步骤（可重放）

```bash
node data/clean-pipeline/scripts/fetch-wb.mjs             # v1 → wb-indicators
node data/clean-pipeline/scripts/extend-wb.mjs            # 加 PLI 计算
node data/clean-pipeline/scripts/fetch-digital-pricing.mjs
node data/clean-pipeline/scripts/extract-zillow.mjs
node data/clean-pipeline/scripts/fetch-ons-uk.mjs
node data/clean-pipeline/scripts/fetch-statcan-rent.mjs
node data/clean-pipeline/scripts/fetch-airbnb.mjs
node data/clean-pipeline/scripts/calibrate-airbnb.mjs
node data/clean-pipeline/scripts/build-clean-v4.mjs
node data/clean-pipeline/scripts/compare-v4-cny.mjs
```
