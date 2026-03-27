# Architecture — 项目架构文档

> 最后审计：2026-03-27

---

## 1. 项目概述

**City Compare** 是一个纯静态的全球城市生活比较网站，覆盖 120 座城市，提供薪资、生活成本、住房、空气质量、安全、医疗、交通等多维数据的可视化对比。

| 属性 | 值 |
|---|---|
| 技术栈 | Next.js 15 + React 18 + TypeScript + Tailwind CSS 3 + Recharts 3 |
| 渲染策略 | 100% SSG（Static Site Generation），零 API 调用 |
| 总生成页面 | ~187（120 城市 + ~60 对比 + 1 排行榜 + 1 首页 + sitemap + robots） |
| 国际化 | 4 语言（zh / en / ja / es），纯前端切换 |
| 货币 | 10 种（USD / EUR / GBP / JPY / CNY / HKD / AUD / CAD / SGD / INR） |
| 部署 | 静态导出，适用于 Vercel / Netlify / 任何静态托管 |
| 后端/数据库 | **无**，全部数据以 JSON 文件形式内嵌 |

---

## 2. 目录结构全览

```
citycompare/
├── app/                          # Next.js App Router 页面
│   ├── layout.tsx                # 根布局（HTML shell + 全局 metadata）
│   ├── page.tsx                  # 首页 → 渲染 CityComparison
│   ├── globals.css               # Tailwind 三层指令 + 少量全局样式
│   ├── city/[slug]/page.tsx      # 城市详情页（SSG × 120）
│   ├── compare/[pair]/page.tsx   # 双城对比页（SSG × ~60）
│   ├── ranking/page.tsx          # 排行榜页（SSG × 1）
│   ├── sitemap.ts                # 动态 sitemap 生成
│   └── robots.ts                 # robots.txt 生成
│
├── components/                   # React 组件（全部 "use client"）
│   ├── CityComparison.tsx        # 首页主组件（502行）⚠️ 最大组件
│   ├── CityDetailContent.tsx     # 城市详情页主体（290行）
│   ├── RankingContent.tsx        # 排行榜主体（306行）⚠️ 超300行限制
│   ├── CompareContent.tsx        # 双城对比页主体（255行）
│   ├── KeyInsights.tsx           # 综合评分 + 决策矩阵（177行）
│   ├── ShareCard.tsx             # Canvas 分享卡片生成器（160行）
│   ├── ChartSection.tsx          # Recharts 图表区域（140行）
│   ├── CityCard.tsx              # 首页城市信息卡片（136行）
│   ├── PageShell.tsx             # 页面外壳（98行）⚠️ 未使用
│   ├── CityLinks.tsx             # 城市/对比链接网格（90行）⚠️ 未使用
│   └── DataSources.tsx           # 数据来源声明（37行）
│
├── lib/                          # 数据层 + 工具函数
│   ├── i18n.ts                   # 翻译字典 4 语言（1130行）⚠️ 最大文件
│   ├── cityIntros.ts             # 城市介绍文本 120×4 语言（728行）
│   ├── constants.ts              # 常量：地区分组 / emoji / 气候数据（182行）
│   ├── citySlug.ts               # ID↔Slug 映射 + 热门对比对（69行）
│   ├── clientUtils.ts            # AQI/气候标签、城市英文名（55行）
│   ├── types.ts                  # TypeScript 类型定义（45行）
│   ├── CompareContext.ts         # React Context 类型定义（27行）
│   └── dataLoader.ts             # 服务端 JSON 加载器（21行）
│
├── hooks/                        # React Hooks
│   ├── useSettings.ts            # 子页面设置管理（localStorage 读写）
│   └── useUrlState.ts            # URL query params 读写
│
├── public/data/                  # 静态数据文件
│   ├── cities.json               # 120 城市完整数据（核心）
│   ├── exchange-rates.json       # 10 种货币汇率
│   ├── professions.json          # 20 种职业列表
│   ├── salaries.csv              # 薪资原始数据
│   └── salary-summary.md         # 薪资数据校验摘要
│
├── scripts/                      # 数据处理脚本（仅开发用）
│   ├── update_salaries.py        # 薪资数据批量更新
│   ├── add-climate-detail.mjs    # 气候详细数据添加
│   ├── add-safety.mjs            # 安全指数数据添加
│   ├── add-flights.mjs           # 直飞城市数据添加
│   ├── add-workhours.mjs         # 工作时长数据添加
│   ├── add_aqi.py                # AQI 数据添加（含中→US EPA转换）
│   ├── add_doctors_data.py       # 医师密度数据添加
│   ├── add_20_asian_cities.py    # 批量添加 20 座亚洲城市
│   ├── translate-intros.mjs      # 城市介绍多语言翻译
│   ├── update_cost_tiers.py      # 生活成本层级计算
│   ├── check_data.js             # 数据完整性检查
│   ├── deep_data_check.js        # 深度数据检查
│   └── ...（其他校验/修复脚本）
│
├── ARCHITECTURE.md               # ← 本文件
├── DATA_DICTIONARY.md            # 数据字典
├── DESIGN_SYSTEM.md              # 设计系统文档
├── DATA_SOURCES.md               # 数据来源与方法论
├── RULES.md                      # 代码规范
└── README.md                     # 项目介绍
```

---

## 3. 数据流架构

### 3.1 总览

```
┌─────────────────────────────────────────────────────┐
│                  public/data/                        │
│  cities.json · exchange-rates.json · professions.json│
└─────────────┬────────────────────┬──────────────────┘
              │                    │
    ┌─────────▼─────────┐  ┌──────▼──────────────────┐
    │   构建时 (SSG)      │  │   运行时 (Browser)       │
    │                    │  │                         │
    │ dataLoader.ts      │  │ fetch("/data/...")      │
    │   └→ readFileSync  │  │   └→ JSON.parse         │
    │                    │  │                         │
    │ 消费者:             │  │ 消费者:                  │
    │ · city/[slug]      │  │ · CityComparison.tsx    │
    │ · compare/[pair]   │  │   (首页交互式工具)       │
    │ · ranking          │  │ · RankingContent.tsx    │
    │                    │  │   (汇率运行时加载)       │
    │ 输出: HTML/JSON    │  │ · useSettings.ts        │
    │ (187 个静态页面)    │  │   (汇率运行时加载)       │
    └────────────────────┘  └─────────────────────────┘
              │                    │
              └───── localStorage ─┘
              (语言/货币/深色模式/职业/消费层级 跨页面共享)
```

### 3.2 状态管理架构

```
首页 (CityComparison)                  子页面 (CityDetail / Compare / Ranking)
┌────────────────────────────┐         ┌──────────────────────────────┐
│ useState × 13              │         │ useSettings() Hook           │
│ · selectedCities           │         │ · locale                     │
│ · comparisonData           │         │ · darkMode                   │
│ · locale / darkMode        │  共享   │ · currency / costTier        │
│ · currency / costTier      │←─────→│ · profession                 │
│ · exchangeRates            │LS键:   │ · exchangeRates              │
│ · selectedProfession       │locale  │                              │
│ · baseCityId / searchTerm  │darkMode│ ready=true 后才渲染           │
│ · windowWidth              │etc.    │ （避免 SSR/CSR 闪烁）         │
│                            │         └──────────────────────────────┘
│ CompareCtx.Provider        │
│ └→ ChartSection            │         URL 状态 (仅首页)
│ └→ CityCard × N            │         ┌──────────────────────────┐
│ └→ KeyInsights             │         │ useUrlState.ts           │
│ └→ ShareCard               │         │ · readUrlParams()        │
│ └→ DataSources             │         │ · writeUrlParams()       │
└────────────────────────────┘         │ 参数: cities,prof,tier,  │
                                       │ lang,cur,dark,base       │
                                       └──────────────────────────┘
```

### 3.3 数据加载时序表

| 阶段 | 操作 | 文件 |
|------|------|------|
| 构建时 | `readFileSync("public/data/cities.json")` | `dataLoader.ts` |
| 构建时 | `computeSimilarIds()` 11维欧氏距离 | `city/[slug]/page.tsx` |
| 构建时 | `generateStaticParams()` 枚举所有 slug | `city/[slug]/page.tsx` |
| 构建时 | `generateStaticParams()` 枚举热门对比对 | `compare/[pair]/page.tsx` |
| 运行时 | `fetch("/data/cities.json")` + `fetch("/data/exchange-rates.json")` | `CityComparison.tsx` |
| 运行时 | `fetch("/data/exchange-rates.json")` | `useSettings.ts`, `RankingContent.tsx` |
| 运行时 | `localStorage.getItem(...)` 恢复设置 | 所有客户端组件 |

### 3.4 localStorage 键名清单

| 键 | 类型 | 默认值 | 读取位置 | 写入位置 |
|---|---|---|---|---|
| `locale` | `"zh"\|"en"\|"ja"\|"es"` | `"zh"` | 所有页面 | 所有页面 |
| `darkMode` | `"true"\|"false"` | `"false"` | 所有页面 | 所有页面 |
| `selectedCurrency` | 货币代码 | `"USD"` | 所有页面 | 所有页面 |
| `costTier` | `"comfort"\|"moderate"\|"budget"\|"minimal"` | `"moderate"` | 所有页面 | 所有页面 |
| `selectedProfession` | 职业键名 | 第一个 | 所有页面 | 所有页面 |
| `selectedCities` | `JSON string[]` | `["1","3","4"]` | 仅首页 | 仅首页 |

---

## 4. 四个页面详解

### 4.1 首页 `/` — 交互式多城对比工具

**路由**: `app/page.tsx` → `CityComparison`（客户端，502行）

**功能流程**:
1. 初始化：URL params → localStorage → 默认值"1,3,4"（优先级递减）
2. 城市选择器：10 地区分组展示，搜索匹配城市名/国家名（支持 4 语言）
3. 对比结果：选 2-5 城 → 图表（ChartSection）+ 卡片（CityCard）+ 洞察（KeyInsights）
4. 分享：URL 复制 + Canvas 分享图（ShareCard）
5. 2 城特殊处理：显示直接跳转对比页的按钮

**子组件消费 Context 的字段**:
| 子组件 | 主要消费 | 职责 |
|---|---|---|
| ChartSection | convertAmount, getCityLabel, getCost, getClimate | 4 个 Recharts 条形图 |
| CityCard | formatCurrency, getCost, getClimate, getAqiLevel | 单城详情卡片 |
| KeyInsights | formatCurrency, getCost, getCityLabel, getAqiLevel | 综合评分 + 决策矩阵 |
| ShareCard | formatCurrency, getCost, getCityLabel | Canvas 分享图 |
| DataSources | t() | 数据来源文本 |

### 4.2 城市详情 `/city/[slug]` — 单城全景

**路由**: `app/city/[slug]/page.tsx`（服务端） → `CityDetailContent`（客户端，290行）

**构建时计算**:
- `generateStaticParams()`: 枚举 120 slug
- `generateMetadata()`: SEO title/description/canonical/OpenGraph
- `computeSimilarIds()`: 11 维归一化欧氏距离，取最近 6 城
- JSON-LD: Schema.org/Place + 5 个 PropertyValue

**页面 5 个区块**:
1. **Hero** — 旗帜 emoji + 城市名 + 国家名 + 城市介绍（`cityIntros.ts`）
2. **12 指标卡片**（6×2）— 值 + 排名(`#N/120`) + 百分位边框着色
3. **气候**（6 列）— 类型 / 均温 / 温差 / 降水 / 湿度 / 日照
4. **相似城市**（6 列）— 优势维度 + 查看/对比链接
5. **数据来源** + **页脚**

**12 张指标卡片**:
| # | 指标 | 计算方式 | 排序方向 |
|---|------|---------|---------|
| 1 | 年平均收入 | `professions[active] \|\| averageIncome` | 越高越好 |
| 2 | 月生活成本 | `city[costField]` | 越低越好 |
| 3 | 年储蓄 | `income − cost×12` | 越高越好 |
| 4 | 年工作时长 | `annualWorkHours` | 越低越好 |
| 5 | 平均时薪 | `income / annualWorkHours` | 越高越好 |
| 6 | 巨无霸指数 | `bigMacPrice / median(allBigMac)` | 越低越好 |
| 7 | 平均房价 | `housePrice` (USD/m²) | 越低越好 |
| 8 | 购房年限 | `housePrice×70 / annualSavings` | 越低越好 |
| 9 | 空气质量 | `airQuality` (AQI) | 越低越好 |
| 10 | 安全指数 | `safetyIndex` (/100) | 越高越好 |
| 11 | 每千人医生 | `doctorsPerThousand` | 越高越好 |
| 12 | 直飞城市 | `directFlightCities` | 越高越好 |

### 4.3 双城对比 `/compare/[pair]` — 两城 PK

**路由**: `app/compare/[pair]/page.tsx`（服务端） → `CompareContent`（客户端，255行）

**URL 格式**: `/{slugA}-vs-{slugB}`（字母序排列，正则 `^(.+)-vs-(.+)$` 解析）

**对比表格 14 行**:
| # | 指标 | 比较方式 |
|---|------|---------|
| 1 | 年收入 | 越高胜 |
| 2 | 月消费 | 越低胜 |
| 3 | 年储蓄 | 越高胜 |
| 4 | 房价/m² | 越低胜 |
| 5 | 购房年限 | 越低胜 |
| 6 | AQI | 越低胜 |
| 7 | 每千人医师 | 越高胜 |
| 8 | 巨无霸价格 | 越低胜 |
| 9-11 | 气候 | 平局 |
| 12 | 年工时 | 越低胜 |
| 13 | 直飞城市 | 越高胜 |
| 14 | 安全指数 | 越高胜 |

**特殊处理**: CompareContent 构建了一个临时 `CompareCtx.Provider` 供 KeyInsights 消费。

### 4.4 排行榜 `/ranking` — 120 城大排名

**路由**: `app/ranking/page.tsx`（服务端） → `RankingContent`（客户端，306行）

**7 个排名 Tab**:
| Tab 键 | 排序逻辑 | 好/中/差 阈值 |
|--------|---------|--------------|
| savings | `savings` 降序 | >0 / — / <0 |
| ppp | `income/annualCost` 降序 | ≥1.5 / ≥1 / <1 |
| housing | `yearsToHome` 升序 | ≤15y / finite / ∞ |
| air | `airQuality` 升序 | ≤50 / ≤100 / >100 |
| flights | `directFlightCities` 降序 | ≥150 / ≥50 / <50 |
| safety | `safetyIndex` 降序 | ≥70 / ≥40 / <40 |
| workhours | `annualWorkHours` 升序 | ≤1600 / ≤1900 / >1900 |

**⚠️ 注意**: RankingContent 未使用 `useSettings` hook，自行管理所有设置状态（与其他 3 个页面不一致）。

---

## 5. 组件体系

### 5.1 组件依赖图

```
app/page.tsx
  └→ CityComparison (CompareCtx.Provider, 502行)
       ├→ ChartSection (Recharts BarChart)
       ├→ CityCard × N
       ├→ KeyInsights
       ├→ ShareCard (Canvas API)
       ├→ DataSources
       └→ CityLinks ⚠️ import 但未渲染

app/city/[slug]/page.tsx
  └→ CityDetailContent (useSettings, 290行)

app/compare/[pair]/page.tsx
  └→ CompareContent (useSettings + 临时 CompareCtx.Provider, 255行)
       └→ KeyInsights

app/ranking/page.tsx
  └→ RankingContent (独立状态管理, 306行)
```

### 5.2 未使用组件

| 组件 | 行数 | 状态 | 建议 |
|------|------|------|------|
| `PageShell.tsx` | 98 | 原设计为子页面统一外壳，未被使用 | 删除或重构导航栏时采用 |
| `CityLinks.tsx` | 90 | 被 CityComparison import 但未渲染 | 集成到首页或删除 |

---

## 6. 国际化架构

### 6.1 翻译系统

```
lib/i18n.ts (1130 行)
├── TRANSLATIONS: Record<Locale, Record<string, string>>   ~130 keys × 4
├── CITY_NAME_TRANSLATIONS: Record<number, Record<Locale, string>>  120 × 4
├── COUNTRY_TRANSLATIONS: Record<string, Record<Locale, string>>    ~50 × 4
├── PROFESSION_TRANSLATIONS: Record<string, Record<Locale, string>> 20 × 4
├── CONTINENT_TRANSLATIONS: Record<string, Record<Locale, string>>  6 × 4
└── LANGUAGE_LABELS: Record<Locale, string>   4 条
```

### 6.2 翻译调用方式

所有翻译通过 `t(key, params?)` 函数调用，支持 `{placeholder}` 模板替换。

除主翻译系统外，`clientUtils.ts` 中额外维护了两组独立翻译字典：
- `AQI_LABELS`: 6 个等级 × 4 语言（通过 `getAqiLabel()` 调用）
- `CLIMATE_LABELS`: 6 种类型 × 4 语言（通过 `getClimateLabel()` 调用）

**⚠️ 已知问题**: 与 `i18n.ts` 中的 `aqiGood`/`climate_tropical` 等 key 存在语义重复。

---

## 7. SEO 架构

| 页面 | Title 模板 | JSON-LD | Canonical |
|------|-----------|---------|----------|
| 首页 | "City Compare – Global Salary & Cost of Living Comparison" | 无 | — |
| 城市详情 | "{enName} Cost of Living, Salary & Quality of Life – City Compare" | Place + PropertyValue×5 | `/city/{slug}` |
| 双城对比 | "{nameA} vs {nameB}: Salary, Cost of Living & Quality of Life Comparison" | Article | `/compare/{pair}` |
| 排行榜 | "Global City Rankings – Savings, Value Index & Housing" | 无 | `/ranking` |

**sitemap.ts**: 动态生成，包含首页(1.0) + 排行榜(0.9) + 120 城市页(0.8) + ~60 对比页(0.7)。

**全部 SEO 元数据仅英文**，未做多语言 SEO（无 hreflang、无 locale 子路径）。

---

## 8. 构建与部署

```bash
npm run build   # SSG 生成 ~187 静态页面
npm run dev      # 开发服务器 localhost:3000
npm run lint     # ESLint 检查
```

| 属性 | 值 |
|------|---|
| 构建产物 | `.next/` 目录下的静态 HTML + JS chunks |
| 城市详情页 | 120 个（from `CITY_SLUGS`） |
| 对比页 | ~60 个（from `POPULAR_PAIRS` 去重） |
| 排行榜 | 1 个 |
| 首页 | 1 个（CSR） |
| 无 API Routes | ✓ |
| 无 ISR | ✓ |
| 无 Middleware | ✓ |

---

## 9. 依赖清单

### 生产依赖
| 包 | 版本 | 用途 |
|---|---|---|
| next | ^15 | 框架 |
| react / react-dom | ^18 | UI |
| recharts | ^3.8.0 | 图表（BarChart） |

### 开发依赖
| 包 | 版本 | 用途 |
|---|---|---|
| typescript | ^5 | 类型系统 |
| tailwindcss | ^3 | 样式 |
| autoprefixer | ^10 | PostCSS |
| postcss | ^8 | CSS 处理 |
| eslint + eslint-config-next | ^8 / ^15 | 代码检查 |
| @types/node / react / react-dom | ^20 / ^18 / ^18 | 类型声明 |

---

## 10. 已知架构问题与技术债

| # | 问题 | 严重度 | 位置 | 说明 |
|---|------|--------|------|------|
| 1 | CityComparison.tsx 502 行 | **高** | 首页 | 超 RULES.md 300行限制 66%，承担选择器+状态+Context+UI全部职责 |
| 2 | RankingContent.tsx 306 行 | 低 | 排行榜 | 略超限制，可接受 |
| 3 | i18n.ts 1130 行 | **中** | lib | 4 语言在一个文件，难以维护 |
| 4 | 导航栏 4 处重复实现 | **中** | 4个页面组件 | CityComparison/CityDetailContent/CompareContent/RankingContent 各自实现 sticky 顶栏 |
| 5 | ClimateInfo 默认回退 3 处重复 | 低 | clientUtils/CityComparison/CompareContent | 应统一到 `getCityClimate()` |
| 6 | RankingContent 未用 useSettings | **中** | 排行榜 | 独立管理设置，与其他子页面不一致 |
| 7 | PageShell / CityLinks 死代码 | 低 | components | 未被使用 |
| 8 | `tsconfig.json` strict:false | 中 | 根配置 | 缺少严格类型检查 |
| 9 | AQI/气候标签翻译重复 | 低 | clientUtils vs i18n | 两套翻译机制并存 |
| 10 | SEO 仅英文 | 中 | 所有页面 | 无 hreflang，无多语言 URL |
| 11 | next.config.ts 为空 | — | 根配置 | 无自定义配置 |
| 12 | KeyInsights 综合评分权重未文档化 | 中 | KeyInsights.tsx | 35/30/20/15 权重写在代码里无注释 |
