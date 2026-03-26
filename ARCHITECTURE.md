# Architecture

## 一句话

一个比较全球 120 个城市薪资、生活成本和生活质量的静态网站。

## 技术栈

Next.js 15 + React 18 + TypeScript + Tailwind CSS + Recharts，无后端。

## 数据流

```
public/data/cities.json          ← 120 个城市的所有数据（薪资、成本、房价、AQI、直飞城市数、安全指数…）
public/data/exchange-rates.json  ← 10 种货币汇率
public/data/professions.json     ← 20 种职业列表
        │
        ├─→ [构建时] app/city/[slug]/page.tsx 读取 → 生成 120 个城市静态页
        ├─→ [构建时] app/compare/[pair]/page.tsx 读取 → 生成 60 个对比静态页
        ├─→ [构建时] app/ranking/page.tsx 读取 → 生成排行榜静态页
        │
        └─→ [浏览器运行时] CityComparison 通过 fetch 加载 → 交互式比较工具
```

所有页面都是静态生成的（SSG），浏览器端不需要 API 调用（汇率数据也是静态 JSON）。

## 四个页面怎么工作

### 首页 `/`
`app/page.tsx` → 渲染 `CityComparison`（客户端组件）

用户操作流程：选城市 → 点"比较" → 看图表和卡片 → 可切换职业/货币/语言

CityComparison 是最大的组件（502 行），负责：加载数据、管理所有状态（选中城市、语言、货币、深色模式）、通过 Context 传递给子组件。

### 城市详情 `/city/[slug]`
`app/city/[slug]/page.tsx`（服务端）→ 用 `dataLoader.ts` 读数据 → 传 `city` 和 `allCities` 给 `CityDetailContent`（客户端）

展示单个城市的 8 个关键指标卡片（收入、成本、储蓄、房价、AQI、医生数、直飞城市、安全指数），分两行每行 4 个显示。卡片边框按百分位着色（绿=前25%，红=后25%，默认=中间）。收入/成本随顶栏的职业和消费层级动态变化。还包含住房&气候信息和相关城市对比链接。

### 双城对比 `/compare/[pair]`
`app/compare/[pair]/page.tsx`（服务端）→ 解析 URL 中的两个城市 slug → 传给 `CompareContent`（客户端）

两城指标逐项对比（含职业薪资和消费层级），胜负从 rows 数组统计（支持平局）。顶栏与首页一致，共享职业/消费层级/语言/货币选项。包含 KeyInsights 综合评分。

### 排行榜 `/ranking`
`app/ranking/page.tsx`（服务端）→ 传全部城市给 `RankingContent`（客户端）

120 城市按 6 个维度排序：储蓄率、购买力、购房年限、空气质量、直飞城市数、安全指数。

## 全局导航

所有 4 个页面共享统一的 sticky 顶栏，包含：首页、排行榜、随机城市按钮，以及职业/消费层级/语言/货币/深色模式选择器。设置通过 localStorage 跨页面共享。

## 文件职责

### 页面路由 (`app/`)

| 文件 | 作用 |
|------|------|
| `layout.tsx` | HTML 外壳，全局 meta |
| `page.tsx` | 首页，渲染 CityComparison |
| `city/[slug]/page.tsx` | 城市详情页，生成 SEO meta + JSON-LD，传 allCities 供百分位计算 |
| `compare/[pair]/page.tsx` | 双城对比页，解析 URL 对 |
| `ranking/page.tsx` | 排行榜页 |
| `sitemap.ts` / `robots.ts` | SEO |

### 组件 (`components/`)

| 文件 | 行数 | 作用 |
|------|------|------|
| `CityComparison.tsx` | 502 | 首页主组件：城市选择器 + 状态管理 + Context Provider |
| `RankingContent.tsx` | 299 | 排行榜表格（6 个 Tab：储蓄/购买力/购房/空气/直飞/安全） |
| `CityDetailContent.tsx` | 257 | 城市详情页（统一顶栏，8 个百分位着色卡片，住房&气候） |
| `CompareContent.tsx` | 252 | 双城对比页（含顶栏、KeyInsights，胜负从 rows 统计） |
| `KeyInsights.tsx` | 177 | 综合评分 + 决策矩阵（首页和对比页共用） |
| `ShareCard.tsx` | 160 | Canvas 生成分享图片 |
| `ChartSection.tsx` | 140 | Recharts 图表（收入/气候/AQI/医疗） |
| `CityCard.tsx` | 136 | 单个城市信息卡片 |
| `PageShell.tsx` | 98 | 子页面公共外壳（导航栏 + 页脚），目前无组件使用 |
| `CityLinks.tsx` | 90 | 城市链接组件（目前未使用） |
| `DataSources.tsx` | 37 | 数据来源声明 |

### 数据和工具 (`lib/`)

| 文件 | 行数 | 作用 |
|------|------|------|
| `i18n.ts` | 1084 | 4 语言翻译（zh/en/ja/es），城市名、国家名、职业名 |
| `cityIntros.ts` | 728 | 120 城市 × 4 语言介绍文本 |
| `constants.ts` | 182 | 地区分组、城市旗帜 emoji、气候数据 |
| `citySlug.ts` | 69 | 城市 ID ↔ URL slug 映射 + 热门对比对 |
| `clientUtils.ts` | 55 | 客户端工具函数（AQI 标签、气候标签、城市英文名） |
| `types.ts` | 45 | TypeScript 类型定义（City, Locale, CostTier…） |
| `CompareContext.ts` | 27 | React Context 定义（首页组件间共享状态） |
| `dataLoader.ts` | 21 | 服务端读 JSON + re-export clientUtils |

### Hooks (`hooks/`)

| 文件 | 行数 | 作用 |
|------|------|------|
| `useSettings.ts` | 122 | 子页面的设置管理（语言/货币/深色模式/职业/消费层级），读写 localStorage |
| `useUrlState.ts` | 24 | URL 参数读写，用于首页状态分享 |

### 脚本 (`scripts/`)

一次性数据处理脚本（Python/Node.js），用于生成和更新 `public/data/` 里的数据文件。不参与构建。

| 文件 | 作用 |
|------|------|
| `add-flights.mjs` | 添加 120 城市直飞城市数到 cities.json |
| `add-safety.mjs` | 计算并添加 120 城市体感安全指数到 cities.json |
| `translate-intros.mjs` | 用 Google Translate API 翻译城市介绍到 en/ja/es |
| 其他 | 各种数据抓取和处理脚本 |

## 数据来源

| 数据 | 来源 |
|------|------|
| 薪资 | Glassdoor、PayScale、各国统计局 |
| 生活成本 | Numbeo、Expatistan |
| 房价 | Numbeo、Global Property Guide |
| 巨无霸指数 | The Economist (2025) |
| 气候 | WMO、各国气象局 |
| 空气质量 | IQAir World Air Quality Report 2024 |
| 医师密度 | WHO / 世界银行 (CC BY-4.0) |
| 直飞城市数 | OAG Aviation Analytics、FlightConnections.com (2025) |
| 体感安全指数 | Numbeo 犯罪指数 (2024–2025)、UNODC、InterNations Expat Insider 2024、Gallup 移民接受指数 2023 |

### 体感安全指数计算方法

复合指标，0–100 分，越高越安全：

| 权重 | 子维度 | 数据源 |
|------|--------|--------|
| 40% | 夜间安全感 | Numbeo "Safety walking alone during night" |
| 30% | 暴力犯罪反向 | Numbeo + UNODC homicide rate |
| 20% | 财产犯罪反向 | Numbeo Property Crime |
| 10% | 外国人友好度 | InterNations（城市级）/ Gallup MAI（国家级回退） |

每个城市附带 `safetyConfidence` 字段（high/medium/low），标记数据可靠度。

## 状态管理

没有用任何状态库。两套独立的状态管理：

1. **首页** — `CityComparison` 用 `useState` 管理所有状态，通过 `CompareContext` 传给子组件
2. **子页面** — `useSettings` hook 从 localStorage 读取设置（语言、货币、深色模式、职业、消费层级）

两套共享同一份 localStorage key，所以在首页切换语言后，打开城市详情页会保持一致。
