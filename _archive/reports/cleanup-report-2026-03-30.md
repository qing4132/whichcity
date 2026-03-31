# 项目清理报告

**日期**: 2026-03-30  
**构建验证**: ✅ 通过（220 页全部生成）

---

## 审计范围

对整个项目进行运行时代码、数据文件、脚本、文档的全面审计，识别并清理不参与运行时构建的冗余内容。

---

## 已执行的清理操作

### 1. 归档（移至 `_archive/`）

| 原路径 | 说明 | 归档原因 |
|--------|------|---------|
| `scripts/`（24 个文件） | 一次性数据迁移/充实/校验脚本 | 全部为开发期一次性工具，不参与运行时。保留以备未来数据更新时参考 |
| `data/sources/`（4 个 JSON） | 安全指数原始数据源 (Numbeo/UNODC/GPI/Gallup) | 仅被 `scripts/add-safety-v2.mjs` 读取，安全指数已计算并写入 `cities.json` |
| `public/data/professions.json` | 职业列表元数据快照 | 运行时从 `cities.json` 的 `professions` 字段提取职业列表，此文件仅被 scripts 使用 |
| `public/data/salaries.csv` | 薪资原始数据参考 | 零运行时引用，纯参考快照 |
| `public/data/salary-summary.md` | 薪资校验摘要 | 零运行时引用，纯参考快照 |

> 归档文件全部保留在 `_archive/` 文件夹中并附 README，确保数据溯源不丢失。`data/` 空目录已移除。

### 2. 删除的死代码

| 文件 | 行数 | 说明 |
|------|------|------|
| `components/CityLinks.tsx` | ~90 行 | 从未被任何组件 import 或渲染。`ARCHITECTURE.md` 已标注为 "⚠️ 未使用" |
| `components/PageShell.tsx` | ~98 行 | 原设计为子页面统一外壳，从未被任何页面 import。`ARCHITECTURE.md` 已标注为 "⚠️ 未使用" |

### 3. 清理的未使用导出

| 文件 | 移除内容 | 说明 |
|------|---------|------|
| `lib/citySlug.ts` | `getAllCitySlugs()` 函数 | 定义但从未被 import。`generateStaticParams` 使用 `Object.values(CITY_SLUGS)` 替代 |
| `lib/taxUtils.ts` | `countryHasExpatScheme()` 函数 | 定义但从未被 import |
| `lib/dataLoader.ts` | 3 个无用 re-export: `getAqiLabel`, `getClimateLabel`, `computeLifePressure` | 所有消费者直接从 `@/lib/clientUtils` 导入，无人通过 `dataLoader` 路径访问 |

---

## 未做更改（审慎保留）

| 项目 | 原因 |
|------|------|
| 7 个根级 `.md` 文档 (ARCHITECTURE/DATA_DICTIONARY/DATA_SOURCES/DESIGN_SYSTEM/RULES/TAX_DISCLAIMER/TAX_RESEARCH) | 纯文档，不影响构建体积，对项目维护有参考价值 |
| `hooks/useUrlState.ts` | 被 `CityComparison.tsx` 使用 |
| `components/DataSources.tsx` | 被 `CityComparison.tsx` 使用 |
| `lib/CompareContext.ts` | 核心状态管理，被 6+ 组件使用 |
| `.github/copilot-instructions.md` | Copilot 配置文件 |

---

## 清理效果

| 指标 | 清理前 | 清理后 |
|------|--------|--------|
| 仓库跟踪文件 | ~78 个 | ~49 个 |
| `components/` 文件数 | 11 | 9 |
| `public/data/` 文件数 | 5 | 2 (`cities.json` + `exchange-rates.json`) |
| 运行时死代码 | ~188 行 | 0 行 |
| 未使用导出函数 | 3 个 | 0 个 |
| 构建结果 | 220 页 | 220 页（无变化） |

---

## 风险评估

- **零破坏性**: 所有归档文件仍存在于 `_archive/`，可随时恢复
- **所有删除均经过双重确认**: grep 搜索 + import 链追踪
- **构建已验证**: `npm run build` 成功生成全部 220 个静态页面
