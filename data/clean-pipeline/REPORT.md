# Clean-Pipeline Comparison Report

**生成时间**: 2026-04-17
**对比基线**: 2a19d87 (当前 public/data/cities.json — NB-fit 模型的产物)
**干净管道**: data/clean-pipeline/ — 0% Numbeo/Livingcost 输入

## 数据源（全部合规，可直接复用于生产）

| Tier | 源 | 许可 | 覆盖 |
|------|---|------|-----|
| A-US | HUD FY2024 FMR | Public Domain | 19 美国城市 |
| A-UK | ONS Private Rent 2026-02 | OGL v3 | 2 英国城市 |
| A-CA | StatCan 34-10-0133-01 / CMHC 2024 | OGL-Canada | 5 加拿大城市 |
| B | WB HFCE / Gini / GDP-PPP / GNI | CC BY 4.0 | 85 国家 |
| B | BEA RPP / Eurostat PLI | PD / CC BY 4.0 | 美国 MSA + 欧盟 |
| B | IMF WEO（仅台湾填补） | 公开 | 1 |

覆盖：**141/151 城**。缺口 10 个（伊朗、波多黎各、黎巴嫩、塞尔维亚、哈萨克斯坦、乌兹别克斯坦、阿塞拜疆、格鲁吉亚、多米尼加、厄瓜多尔）— WB 没有 Gini/HFCE。

## 全局偏差 vs 2a19d87

| 指标 | n | 中位 |Δ| | 均值 |Δ| | <10% | 10-25% | 25-50% | 50-100% | >100% |
|---|---|---|---|---|---|---|---|---|
| cost | 141 | **47.4%** | 73.5% | 12 | 13 | 52 | 34 | 30 |
| rent | 141 | **39.2%** | 44.5% | 20 | 17 | 47 | 54 | 3 |
| house | 141 | 0.0% | 0.8% | 139 | 0 | 1 | 1 | 0 |

**house 零偏差**：当前基线的 housePrice 本来就是 `GNI×PTI/60` 公式产物（不含 NB）→ 两版本必然一致。

## Rent 分层准度

| 层级 | n | 中位 |Δ| | 样本 |
|---|---|---|---|
| **Tier A 政府直采** | 25 | **27.2%** | 3/25 <10%, 20/25 <50% |
| Tier B WB 公式 | 116 | 49.0% | 17/116 <10%, 29/116 <25% |

Tier A 系统性低于 prod（美国城市 −25% ~ −40%）：HUD FMR 是"安全标准单位 40 分位"，prod 用的是 NB 市场中位 — 方向上可解释。

## 代表城市（20 城一览）

```
city        | cost clean / prod  Δ%   | rent clean / prod  Δ%   | house
  纽约         | 14507 /  4370 +232% |  2451 /  2815  -13% | 一致
  旧金山        | 14436 /  4348 +232% |  2818 /  2801  + 1% | 一致
  伦敦         |  6162 /  2908 +112% |  3057 /  1606  +90% | 一致
  巴黎         |  3381 /  2651 + 28% |  1285 /  1443  -11% | 一致
  柏林         |  4456 /  2416 + 84% |  1693 /  1313  +29% | 一致
  东京         |  3148 /  2985 +  5% |  1196 /  1620  -26% | 一致
  新加坡        |  5710 /  2530 +126% |  2170 /  1448  +50% | 一致
  香港         |  7276 /  2309 +215% |  2765 /  1308 +111% | 一致
  多伦多        |  3721 /  2629 + 42% |  1240 /  1709  -27% | 一致
  悉尼         |  5483 /  3225 + 70% |  2084 /  1506  +38% | 一致
  迪拜         |  2775 /  2073 + 34% |  1055 /  1159  - 9% | 一致
  曼谷         |   647 /  1088 - 41% |   207 /   385  -46% | 一致
  孟买         |   215 /  1258 - 83% |    60 /   665  -91% | 一致
  胡志明市       |   349 /  1244 - 72% |    98 /   656  -85% | 一致
  墨西哥城       |  2988 /   941 +218% |   956 /   544  +76% | 一致
  开普敦        |  1283 /  1988 - 35% |   359 /   575  -38% | 一致
```

## 诊断

**系统性偏差模式**：
- **发达国家 cost +100% ~ +230%**（NY/SF/HK/SG/ME）：Gini 乘数 × BEA-RPP × primary 溢价叠加过度 — HFCE_per_capita 已包含住房/医疗等，再乘中产倍数双重放大；本设计假设中产消费 = 国家均值 × k，但 k 并不随城市溢价衰减。
- **发展中国家 cost/rent −70% ~ −90%**（孟买/胡志明市/曼谷）：HFCE_per_capita 反映包含贫困阶层的全国均值；单独专业人士实际支出远超此数，clean 公式无法校准。
- Tier A 政府锚（美国 HUD、英国 ONS、加拿大 CMHC）自身口径差异 ~25%，但方向一致、可追溯、可上线。

## 判断建议（由你决定）

**选项 1：采用 clean 版本上线**
- ✅ 100% 合规，每个数字都可追溯到政府/WB URL
- ❌ cost 平均偏 47%、rent 偏 39% — 用户对比时"新加坡 cost $5710 vs 东京 $3148"这种数字会出现明显错位
- ❌ 排行榜和"月结余"等衍生指标的城市相对顺序会大幅重排

**选项 2：保留 2a19d87（NB-fit）做原型，clean 作为未来升级路径**
- ✅ 原型阶段数字合理（NB 校准 → 对齐用户预期）
- ✅ clean 管道已完整保留在 `data/clean-pipeline/`，可随时对比/切换
- ❌ 对"完全无 NB"的承诺有瑕疵 —— 即便只是 fit 参数，仍是间接依赖

**选项 3：混合**
- Tier A 政府直采（US 19 + UK 2 + CA 5 = 26 城）立即切换到 clean 值
- Tier B 城市继续用 2a19d87 值直至找到更好的替代锚
- 每个值都带 `sourceTier: "A-gov" | "B-legacy"`，法律审查时可精确说明

## 产物

| 文件 | 内容 |
|---|---|
| `data/clean-pipeline/sources/wb-indicators.json` | WB 5 指标 × 85 国 |
| `data/clean-pipeline/sources/hud-fmr-2024.json` | 美国 19 城 1BR FMR |
| `data/clean-pipeline/sources/hud-fmr-2024.xlsx` | HUD 原表 |
| `data/clean-pipeline/sources/ons-uk-2026.json` | 英国 2 城租金 |
| `data/clean-pipeline/sources/ons-uk-march2026-bulletin.html` | ONS 公告原文存档 |
| `data/clean-pipeline/sources/statcan-ca-rent-2024.json` | 加拿大 5 城 |
| `data/clean-pipeline/sources/statcan-34100133-raw.csv` | StatCan 原 CSV（24MB） |
| `data/clean-pipeline/scripts/build-clean.mjs` | 主管道 |
| `data/clean-pipeline/scripts/compare.mjs` | 对比脚本 |
| `data/clean-pipeline/output/clean-values.json` | 141 城干净值 |
| `data/clean-pipeline/output/comparison.json` | 逐城偏差表 |

## 重跑

```bash
node data/clean-pipeline/scripts/fetch-wb.mjs      # (已完成，可重跑更新)
node data/clean-pipeline/scripts/fetch-hud.mjs     # (已完成)
node data/clean-pipeline/scripts/build-clean.mjs   # 合成 141 城值
node data/clean-pipeline/scripts/compare.mjs       # 对比 2a19d87
```

管道不修改任何生产文件（`data/cities-source.json` / `public/data/cities.json` 完全未动）。
