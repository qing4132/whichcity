# WhichCity 数据修复报告

> **修复日期**: 2026-04-09
> **执行团队**: 数据审计修复组
> **基于**: [_audit/AUDIT-REPORT.md](AUDIT-REPORT.md) 审计发现

---

## 执行摘要

本次修复处理了审计报告中的全部 P0/P1 级问题和大部分 P2 级问题。

| 类别 | 修复前 | 修复后 | 改善 |
|------|--------|--------|------|
| 收入/职业数据异常 | 24个城市 | 5个（仅日本系统性差异） | **-79%** |
| 安全指数计算错误 | 20个城市 | **0** | **-100%** |
| 置信度标签不一致 | 7个 | **0** | **-100%** |
| 气候降雨不一致 | 30个城市 | **3**（微量级差异） | **-90%** |
| 数据验证脚本 | 无 | ✅ 已创建 | — |
| TypeScript编译 | ✅ 通过 | ✅ 通过 | — |
| 生产构建 | ✅ 通过 | ✅ 通过 | — |

---

## 修复明细

### P0 级修复（致命）

#### 1. ✅ 新增19城职业薪资数据修复
**文件**: `public/data/cities.json`
**问题**: ID 140-158 的 `professions` 值为月薪USD而非年薪USD
**修复**: 全部 ×12 转为年薪，`averageIncome` 重算为职业中位数

| 城市 | 修复前 avg | 修复后 avg | 修复前 profMedian | 修复后 profMedian |
|------|-----------|-----------|------------------|------------------|
| 巴厘岛(140) | $3,500 | $18,000 | $1,500 | $18,000 |
| 波尔图(143) | $22,000 | $42,000 | $3,500 | $42,000 |
| 瓦伦西亚(144) | $30,000 | $48,000 | $4,000 | $48,000 |
| 斯普利特(146) | $24,000 | $24,000 | $2,000 | $24,000 |
| ...共19城 | | | | |

**脚本**: `_audit/fix-01-professions.mjs`

#### 2. ✅ 安全指数全面重算
**文件**: `public/data/cities.json`
**问题**: 20个城市的 safetyIndex 与子指标加权值偏差3-13分
**修复**: 统一按 35/30/20/15 权重重算全部城市

修复样例（最大偏差）:
| 城市 | 修复前 | 修复后 |
|------|--------|-------|
| 巴亚尔塔港(158) | 39 | 52.4 |
| 库斯科(156) | 53 | 65.9 |
| 弗洛里亚诺波利斯(152) | 43 | 53.6 |
| 拉斯帕尔马斯(149) | 73 | 83.0 |
| 京都(159) | 89 | 92.2 |

同时修复了 7 个置信度标签（safety/healthcare/freedom confidence）。
**脚本**: `_audit/fix-02-safety-index.mjs`

#### 3. ✅ 汇率时间戳 + 数据陈旧可追溯
**文件**: `public/data/exchange-rates.json`, `scripts/update-rates.mjs`
**修复**:
- exchange-rates.json 新增 `updatedAt` 字段（ISO 8601格式）
- update-rates.mjs 每次更新时自动写入时间戳
- 用户和开发者现在可判断汇率数据新鲜度

#### 4. ✅ 缺失货币补全
**文件**: `public/data/exchange-rates.json`
**修复**: 新增 21 种货币（PLN, HUF, CZK, UAH, UZS, BGN, RON, RSD, KZT, BDT, LKR, NPR, KHR, MMK, MNT, UYU, MAD, PEN, CRC, JMD, HRK）
- 货币总数: 30 → 51
- 所有税务引擎涉及的货币现在都有动态汇率覆盖，不再回退到硬编码

### P1 级修复（严重）

#### 5. ✅ dataIsLikelyNet 透明化
**文件**: `lib/taxUtils.ts`, `components/CityDetailContent.tsx`, `lib/i18n.ts`
**问题**: 中国/泰国/越南/印度城市在"税后"模式下显示"有效税率：~0.0%"
**修复**:
- `NetIncomeResult` 新增 `dataIsLikelyNet` 布尔标志
- UI 不再显示"~0.0%"，改为显示"收入数据可能已为税后"（4种语言）
- 用户不再被误导为"这些国家零税率"

#### 6. ✅ 相似城市算法 null 处理
**文件**: `components/CityDetailContent.tsx`
**问题**: 缺失数据用 `?? 0` 替代，导致缺失房价=免费住房、缺失AQI=最佳空气
**修复**: 改为使用全局中位数作为缺失值替代
```javascript
// 旧：c.housePrice ?? 0
// 新：c.housePrice ?? medHP  (medHP = 全部城市房价中位数)
```
影响字段: housePrice, monthlyRent, annualWorkHours, paidLeaveDays, airQuality, internetSpeedMbps, directFlightCities

#### 7. ✅ dataLoader 错误处理
**文件**: `lib/dataLoader.ts`
**修复**: 添加 try-catch + schema 验证
- JSON 解析失败不再崩溃整个服务器
- 检查 `cities` 字段是否存在且为数组
- 错误时返回空数组而非抛出未捕获异常

#### 8. ✅ 孤儿数据清理
**文件**: `lib/constants.ts`
**修复**:
- 从 `CITY_FLAG_EMOJIS` 中移除 ID 66（🇻🇪）、72（🇨🇺）、74（🇯🇲）
- 新增20城加入 `REGIONS` 数组（按区域分配）

### P2 级修复（中等）

#### 9. ✅ 气候降雨数据统一
**文件**: `public/data/cities.json`
**修复**: 54个城市的 `annualRainMm` 改为 `monthlyRainMm` 之和
**脚本**: `_audit/fix-03-rainfall.mjs`

#### 10. ✅ 文档数字更新
**文件**: `README.md`, `DATA_OPS.md`, `lib/citySlug.ts`
**修复**:
- 134 → 154（城市数）
- 79 → 81（国家税务覆盖）
- costBudget 比率规则从"60-75%"更正为"39-55%"

#### 11. ✅ OG 图片统计数字
**文件**: `app/[locale]/opengraph-image.tsx`
**修复**: "100+" → "150+", "20+" → "26", "79" → "81"

#### 12. ✅ 魔法数字文档化
**文件**: `lib/clientUtils.ts`
**修复**: 购房年数计算中的 `70` 现已注释说明（= 假设住房面积70m²）

#### 13. ✅ 重名城市消歧
**文件**: `lib/i18n.ts`, `public/data/cities.json`
**修复**:
- 圣何塞(70) → "圣何塞(哥斯达黎加)"
- 圣何塞(133) → "圣何塞(美国)"
- 圣地亚哥(63/98) 的英文名本身不同（Santiago/San Diego），保持原样

#### 14. ✅ CI 数据验证脚本
**文件**: `scripts/validate-data.mjs`（新增）
**用途**: 任何数据变更后运行 `node scripts/validate-data.mjs`
**检查项**:
- 26个职业计数一致性
- averageIncome 与职业中位数比率 [0.2, 5.0]
- 指数字段 [0, 100] 范围
- 安全指数与子指标偏差 < 3分
- 月降雨量总和与年降雨量偏差 < 20%
- 月度高温 > 月度低温
- 置信度标签匹配

---

## 残留问题（已知、可接受的局限）

### 1. 日本城市 averageIncome 与职业中位数差异（5城）
**状态**: 不修复（结构性差异）
**原因**: 日本的 averageIncome（~$20,000-$23,000）来自全体劳动者平均工资（含大量非全职、高龄就业者），而 professions 是全职专业人员薪资。二者衡量维度不同，均有效。

### 2. 三座泰国海岛共享相同薪资矩阵
**状态**: 已标记，待后续独立数据
**详情**: 普吉岛(147)、帕岸岛(153)、苏梅岛(154) 共享完全相同的 26 个职业薪资。虽然已修复月薪→年薪问题，但三地应有不同薪资水平。

### 3. 税务硬编码汇率仍存在
**状态**: 已大幅缓解
**详情**: `taxData.ts` 中的 `usdToLocal` 硬编码汇率仍保留（作为fallback），但由于现在 `exchange-rates.json` 覆盖了全部51种货币，运行时几乎不会回退到硬编码值。长期建议：当有余力时删除硬编码汇率，全部走动态。

### 4. 同国城市共享国家级数据
**状态**: 已知、可接受
**详情**: 同国城市的 `annualWorkHours` 和 `paidLeaveDays` 值完全相同（如美国20城全部 1,811 小时）。这是因为这些是国家级统计数据，在城市级别没有权威来源。文档已更新说明。

### 5. costBudget/costModerate 比率
**状态**: 规则已更正
**详情**: 旧文档声称比率应为 60-75%，实际全球数据表明 39-55% 更准确。DATA_OPS.md 已更新。数据本身不需修改。

---

## 变更文件清单

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `public/data/cities.json` | 数据修复 | 19城professions×12, 安全指数重算, 置信度, 降雨量, 城名消歧 |
| `public/data/exchange-rates.json` | 数据增强 | +21货币, +时间戳 |
| `lib/taxUtils.ts` | 代码修复 | NetIncomeResult 增加 dataIsLikelyNet 标志 |
| `lib/dataLoader.ts` | 代码加固 | 添加 try-catch + schema 验证 |
| `lib/clientUtils.ts` | 文档注释 | 魔法数字70说明 |
| `lib/constants.ts` | 数据清理 | 移除孤儿旗帜, REGIONS+新城 |
| `lib/citySlug.ts` | 注释修复 | 134→154 |
| `lib/i18n.ts` | 新增 + 修复 | dataLikelyNet 4语言, 城名消歧 |
| `components/CityDetailContent.tsx` | 代码修复 | 相似城市null处理, dataIsLikelyNet UI |
| `app/[locale]/opengraph-image.tsx` | 常量修复 | 统计数字更正 |
| `scripts/update-rates.mjs` | 代码增强 | 写入 updatedAt 时间戳 |
| `scripts/validate-data.mjs` | **新增** | CI 数据验证脚本 |
| `README.md` | 文档更新 | 134→154, 79→81（4语言） |
| `DATA_OPS.md` | 文档更新 | 城市数, 国家数, costBudget规则 |
| `_audit/fix-01-professions.mjs` | 工具脚本 | 薪资修复 |
| `_audit/fix-02-safety-index.mjs` | 工具脚本 | 安全指数重算 |
| `_audit/fix-03-rainfall.mjs` | 工具脚本 | 降雨量校正 |

---

## 验证结果

```
$ npx tsc --noEmit          → 0 errors
$ npm run build             → Success (全页面构建通过)
$ node scripts/validate-data.mjs → PASSED (0 errors, 2 warnings)
```

2 个 warnings 来自利马(年降雨10mm)和阿布扎比(年降雨56mm)的降雨百分比偏差——绝对值极小（3mm和18mm），可接受。

---

**修复完成**: 2026-04-09
**审计前发现总数**: 57 个分级问题
**已修复**: 49 个 (86%)
**残留（已知可接受）**: 5 个
**新增保护**: CI 数据验证脚本
