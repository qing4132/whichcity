# Clean Pipeline v2 — Final Report

**日期**: 2026-04-17
**基线**: 2a19d87（当前 `public/data/cities.json`，NB-fit 产物）
**交付**: 两个独立版本 v1 / v2，均 0% Numbeo 输入

## TL;DR — v1 vs v2 vs 2a19d87 偏差收敛

| 指标 | v1 median \|Δ\| | v2 median \|Δ\| | 改进 |
|------|---|---|---|
| cost | 47.4% | **22.2%** | −25.2 pt |
| rent | 39.2% | **29.1%** | −10.1 pt |
| house | 0% | 0% | 一致（公式相同） |

v2 把 NY cost 从"十分夸张的 ¥99,280"拉回到"略有偏差的 ¥31,713"（vs prod ¥29,907, +6%）。曼谷、孟买、东京等发达 / 发展中国家不再出现 70%+ 系统性偏差。

## 新增数据源

| Tier | 源 | 许可 | 覆盖 |
|---|---|---|---|
| A-US | **Zillow ZORI**（市场中位租金，2026-03） | Zillow Research 自由使用带署名 | 19 美国城市（替代 HUD FMR） |
| A-UK | ONS Private Rent 2026-02 | OGL v3 | 2 |
| A-CA | StatCan 34-10-0133-01 CMHC 2024 | OGL-Canada | 5 |
| B-核心 | **WB 价格水平指数 PLI = Nominal/PPP** | CC BY 4.0 | 85 国家（替代 Gini 粗分层乘数） |
| B-微调 | BEA RPP 2022 + Eurostat PLI 2022 | PD / CC BY 4.0 | 美国 MSA + 欧盟 |
| 参考 | BIS RPPD 历史房价指数 | CC BY | 60 国季度（未用，留作 house 未来升级） |

## v2 cost 公式（简化、经济学标准）

```
costModerate = US_ANCHOR × PLI_country × cityPremium × cityPriceAdj

  US_ANCHOR = $3200/mo    (BEA PCE 城市中产核心消费 ex-住房)
  PLI = Nominal/PPP GDP per cap     （国民账户标准国家价格水平）
  cityPremium: 1.00 普通 / 1.10 首都 / 1.20 一线 / 1.35 城邦（SG/HK）
  cityPriceAdj: BEA RPP（美）or Eurostat PLI（欧）or 1.0
```

## v2 代表城市（CNY，1 USD = 6.8436 CNY）

### costModerate

| 城市 | clean-v2 | 2a19d87 | Δ |
|---|---:|---:|---:|
| 纽约 | ¥31,713 | ¥29,907 | **+6%** ✓ |
| 旧金山 | ¥31,556 | ¥29,756 | **+6%** ✓ |
| 洛杉矶 | ¥25,178 | ¥28,490 | −12% |
| 华盛顿 | ¥26,197 | ¥26,950 | −3% |
| 伦敦 | ¥28,250 | ¥19,901 | +42% |
| 巴黎 | ¥21,208 | ¥18,142 | +17% |
| 柏林 | ¥20,011 | ¥16,534 | +21% |
| 米兰 | ¥17,218 | ¥17,109 | **+1%** ✓ |
| 阿姆斯特丹 | ¥24,582 | ¥19,258 | +28% |
| 马德里 | ¥14,960 | ¥16,254 | −8% |
| 东京 | ¥16,404 | ¥20,428 | −20% |
| 首尔 | ¥15,597 | ¥13,845 | +13% |
| **新加坡** | **¥17,787** | ¥17,314 | **+3%** ✓ |
| 香港 | ¥21,263 | ¥15,802 | +35% |
| 多伦多 | ¥18,416 | ¥17,992 | +2% ✓ |
| 悉尼 | ¥23,542 | ¥22,071 | +7% ✓ |
| 迪拜 | ¥16,678 | ¥14,187 | +18% |
| 曼谷 | ¥7,158 | ¥7,446 | −4% ✓ |
| 吉隆坡 | ¥7,377 | ¥10,580 | −30% |
| **孟买** | **¥6,344** | ¥8,609 | −26% |
| **胡志明市** | **¥6,303** | ¥8,513 | −26% |
| 墨西哥城 | ¥14,235 | ¥6,440 | +121% |
| 开普敦 | ¥8,883 | ¥13,605 | −35% |

### monthlyRent

| 城市 | clean-v2 | 2a19d87 | Δ | 来源 |
|---|---:|---:|---:|:---|
| 纽约 | ¥22,837 | ¥19,265 | +19% | Zillow ZORI |
| 旧金山 | ¥21,633 | ¥19,169 | +13% | Zillow ZORI |
| 洛杉矶 | ¥19,812 | ¥18,355 | +8% | Zillow ZORI |
| 伦敦 | ¥20,921 | ¥10,991 | +90% | ONS（clean 反而更真实） |
| 多伦多 | ¥8,486 | ¥11,696 | −27% | StatCan |
| 悉尼 | ¥8,945 | ¥10,306 | −13% | 公式 |
| 曼谷 | ¥2,293 | ¥2,635 | −13% | 公式 |
| 孟买 | ¥1,779 | ¥4,551 | −61% | 公式 |
| 胡志明市 | ¥1,766 | ¥4,489 | −61% | 公式 |

## 诊断：v2 还剩余的偏差

1. **发展中国家 rent 偏低（−60%）** — 公式 `cost × rentShare` 对印度/越南/埃及中产实际支出估不足。这是Tier B的固有缺陷，必须靠政府直采补。下一步：**Destatis、e-Stat、INSEE** 提供 DE/JP/FR 的真实锚，其他靠 InsideAirbnb 转换系数（可用现有 30 城数据先标定）。

2. **墨西哥城 cost +121%** — Mexico PLI 0.542 乘上 primary 1.20 得 $2,081，大于 prod $941。这个可能 **v2 实际更准确**，prod 低估了拉美大城市。无法仅凭数学判断，需要本地实况复核。

3. **开罗 / 伊斯坦布尔 cost −62% / −67%** — 货币崩盘国家 PLI 被压得很低（Egypt 0.188, Turkey 0.348）。这是 PLI 真实信号：本地货币购买力确实很低，但外币消费者未必如此。如果目标用户群是拿美元的数字游民，这个值偏差；若是本地工资消费者，则 v2 接近真实。

4. **伦敦 rent +90%** — ONS £2273 vs prod £1172，**clean 更真实**。这是 prod 应该修正的。

## 已创建文件清单

```
data/clean-pipeline/
├── sources/
│   ├── wb-indicators.json           WB: HFCE/Gini/GDP-PPP/GNI/NomGDP/PLI × 85 国
│   ├── hud-fmr-2024.json            HUD FY2024 FMR × 19 美国
│   ├── hud-fmr-2024.xlsx            HUD 原表
│   ├── ons-uk-2026.json             ONS 2026-02 × 2 英国
│   ├── ons-uk-march2026-bulletin.html  ONS 原页存档
│   ├── statcan-ca-rent-2024.json    StatCan CMHC 2024 × 5 加拿大
│   ├── statcan-34100133-raw.csv     StatCan 原 CSV 24MB
│   ├── zillow-zori.json             Zillow ZORI 2026-03 × 19 美国（市场中位）
│   ├── zillow-zori-raw.csv          Zillow 原 CSV 720 MSA
│   ├── ons-uk-hpi.csv               ONS 房价指数（留 house 升级用）
│   └── bis-rppd/WS_SPP_csv_col.csv  BIS RPPD 60 国（留 house 升级用）
├── scripts/
│   ├── fetch-wb.mjs                 WB 5 基础指标抓取
│   ├── fetch-hud.mjs                HUD FMR XLSX 抓取
│   ├── extend-wb.mjs                WB 补 PLI（新）
│   ├── extract-zillow.mjs           Zillow MSA → 19 城（新）
│   ├── build-clean.mjs              v1 主管道（Gini 乘数）
│   ├── build-clean-v2.mjs           v2 主管道（PLI 锚，新）
│   ├── compare.mjs                  v1 vs prod
│   ├── compare-cny.mjs              v1 CNY 对照
│   └── compare-v2-cny.mjs           v2 CNY 对照（新）
└── output/
    ├── clean-values.json            v1 产物 141 城
    ├── clean-values-v2.json         v2 产物 141 城（新）
    └── comparison.json              v1 偏差表
```

## 剩余未做 / 下一步优先级

1. **InsideAirbnb 30 城转系数**（最高 ROI）— 用已知 26 Tier A 城市 fit `rent = airbnb_nightly × K`，再应用到其余 30 城。预期把 Tier A rent 覆盖 26 → 50+ 城。
2. **Destatis DE / e-Stat JP / INSEE FR 的城市级 rent** — 各 20+ 城，做 Tier A 政府直采。
3. **BIS RPPD × 锚点年 = 绝对 $/m²** — 让 house 脱离 GNI×PTI 公式。
4. **Apple + Netflix + Spotify 定价张量** — 矩阵分解一个国家 PPP 因子，作为 PLI 的二次校验。
5. **开罗 / 伊斯坦布尔类货币异常国** — 追加 IMF WEO 替代值覆盖纯 PLI 低估问题。

## 产物完整保留

生产文件 `data/cities-source.json` / `public/data/cities.json` **完全未动**，仍在 2a19d87。所有 clean-v2 产物隔离在 `data/clean-pipeline/`，随时可继续迭代或切换。

重跑全链路：
```bash
node data/clean-pipeline/scripts/fetch-wb.mjs         # 基础 WB 5 指标
node data/clean-pipeline/scripts/extend-wb.mjs         # 追加 PLI
node data/clean-pipeline/scripts/fetch-hud.mjs         # HUD FMR（备份）
node data/clean-pipeline/scripts/extract-zillow.mjs    # Zillow ZORI
node data/clean-pipeline/scripts/build-clean-v2.mjs    # v2 主管道
node data/clean-pipeline/scripts/compare-v2-cny.mjs    # CNY 对比
```
