# WhichCity — Data Architecture

> **单一事实源 (Single Source of Truth)**: `data/cities-source.json`
> **前端运行时**: `public/data/cities.json` (由导出脚本自动生成，**禁止手工编辑**)
> **字段元数据**: `data/registry.json`
> **版本记录**: `data/changelog.json`

---

## 目录结构

```
data/
├── README.md                 ← 本文档
├── SOURCES.md                ← 每个数据源的详细说明
├── SCRIPTS.md                ← 脚本使用手册
├── HOWTO.md                  ← 新增/更新数据操作指南
├── registry.json             ← 字段元数据注册表（49 个字段的完整血统）
├── changelog.json            ← 数据版本变更记录
├── cities-source.json        ← 单一事实源（150 城 × 39 原始字段）
├── sources/                  ← 原始数据源文件（JSON 快照）
│   ├── numbeo-safety-2025.json
│   ├── unodc-homicide-2024.json
│   ├── gpi-2025.json
│   ├── gallup-law-order-2024.json
│   ├── nomad-research-2025.json
│   └── nomad-research-supplement-2025.json
├── scripts/
│   ├── export.mjs            ← SOT → public/data/cities.json 导出流水线
│   ├── validate.mjs          ← 增强版数据验证（替代 scripts/validate-data.mjs）
│   ├── audit-i18n.mjs        ← i18n 覆盖率审计
│   └── init-source.mjs       ← 一次性：从旧 JSON 生成 SOT
└── automation/
    └── UPDATE_PLAN.md        ← 自动更新设计方案
```

---

## 核心原则

### 1. 单向数据流

```
data/cities-source.json  (SOT: 原始数据)
        │
        ▼  node data/scripts/export.mjs
        │
        │  计算: homicideRateInv, gpiScoreInv
        │  计算: safetyIndex, healthcareIndex, governanceIndex, freedomIndex
        │  计算: 5× confidence (numeric 0-100), securityConfidence
        │  验证: 字段完整性、范围、一致性
        │
        ▼
public/data/cities.json  (前端子集: 原始 + 计算字段)
```

**规则**: 永远只编辑 SOT → 运行导出 → 前端数据自动更新。绝不直接编辑 `public/data/cities.json`。

### 2. 城市隐藏机制

SOT 中每个城市可设 `"hidden": true` 标记。隐藏城市的完整行为：

- **数据保留**：SOT 和 `public/data/cities.json` 中保留完整数据，照常更新
- **前端不可见**：`loadCities()` 返回 `hidden !== true` 的城市（120 个）
- **排名重算**：排行榜、标红标绿、基本保障评级、子指标排名均只在 120 个可见城市中计算
- **URL 404**：隐藏城市的详情页 (`/city/slug`)、对比页返回 404
- **站点地图排除**：`sitemap.ts` 和 `generateStaticParams` 仅包含可见城市
- **搜索不可达**：首页搜索、随机城市按钮、对比页选择器均过滤隐藏城市
- **恢复方式**：删除 SOT 中 `"hidden": true` → `node data/scripts/export.mjs` → 城市重新出现

隐藏 ID 列表同步维护于 `lib/constants.ts` 的 `HIDDEN_CITY_IDS`（客户端组件过滤用）和 SOT 的 `hidden` 字段（服务端/数据层过滤用）。

当前隐藏 31 个城市，可见 120 个。详见 `SOURCES.md` "已知数据问题" 部分。

### 3. 字段分类

| 类型 | 数量 | 说明 |
|------|------|------|
| 原始 (raw) | 39 | 从外部数据源获取的值，存在 SOT 中 |
| 计算 (computed) | 11 | 由导出脚本从原始字段计算，不存在 SOT 中 |
| 元数据 (metadata) | 2 | aqiSource, safetyWarning — 手动维护的标注 |

计算字段: `homicideRateInv`, `gpiScoreInv`, `safetyIndex`, `healthcareIndex`, `governanceIndex`, `freedomIndex`, `safetyConfidence`, `healthcareConfidence`, `governanceConfidence`, `freedomConfidence`, `securityConfidence`

### 4. 置信度 (Confidence)

所有置信度字段均为 **数值型 (0-100)**，表示可用子指标权重之和。

| 字段 | 公式 | 含义 |
|------|------|------|
| `safetyConfidence` | Σ(可用子指标权重) | numbeo=30, homicide=25, gpi=20, gallup=15, wps=10 |
| `healthcareConfidence` | Σ(可用子指标权重) | doctors=25, uhc=25, beds=20, life=15, oop=15 |
| `governanceConfidence` | Σ(可用子指标权重) | CPI=25, govEff=25, wjp=20, press=15, mipex=15 |
| `freedomConfidence` | Σ(可用子指标权重) | press=35, democracy=35, CPI=30 |
| `securityConfidence` | avg(safety, healthcare, governance) | 综合评级可信度 |

**展示阈值**: ≥90 高可信度 (无标记), 70-89 中等 (* + 警告), <70 低 (* + 醒目警告)

### 5. 复合指数权重

详见 `registry.json` 的 `compositeWeights` 部分。缺失子指标的权重按比例重新分配给可用子指标。

---

## 日常操作

| 操作 | 命令 |
|------|------|
| 编辑数据 | 修改 `data/cities-source.json` |
| 导出到前端 | `node data/scripts/export.mjs` |
| 仅验证不写入 | `node data/scripts/export.mjs --check` |
| 查看变更差异 | `node data/scripts/export.mjs --diff` |
| 完整验证 | `node data/scripts/validate.mjs` |
| i18n 审计 | `node data/scripts/audit-i18n.mjs` |

**CI 流程**: `npx tsc --noEmit` → `node scripts/validate-data.mjs` → `npm test` → `npm run build`

---

## 相关文档

- [SOURCES.md](SOURCES.md) — 每个数据源的详细说明
- [SCRIPTS.md](SCRIPTS.md) — 脚本使用手册
- [HOWTO.md](HOWTO.md) — 新增/更新数据操作指南
- [automation/UPDATE_PLAN.md](automation/UPDATE_PLAN.md) — 自动更新设计方案
