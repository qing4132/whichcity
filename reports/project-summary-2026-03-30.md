# City Compare 项目总结

**日期**: 2026-03-30  
**版本**: 103 commits (2026-03-23 ~ 2026-03-30)  
**仓库**: github.com/qing4132/citycompare

---

## 一、数据

### 1.1 核心数据集

| 维度 | 数量 |
|------|------|
| 城市 | **134** |
| 国家/地区 | **79** |
| 大洲 | **6**（亚洲、欧洲、北美洲、南美洲、大洋洲、非洲） |
| 职业 | **26** |
| 每城市数据字段 | **37+**（含 26 个职业薪资） |

### 1.2 城市数据字段全览

**基础信息**
| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | int | 唯一 ID |
| `name` | string | 中文名 |
| `country` | string | 中文国名 |
| `continent` | string | 中文洲名 |
| `currency` | string | 本币代码 |
| `description` | string | 城市简介 |

**经济与生活成本**
| 字段 | 类型 | 说明 |
|------|------|------|
| `averageIncome` | int | 城市平均年收入 (USD) |
| `professions` | Record<string, number> | 26 个职业的年薪 (USD) |
| `costModerate` | int | 均衡消费月成本 (USD) |
| `costBudget` | int | 节约消费月成本 (USD) |
| `monthlyRent` | int \| null | 月租金 (USD) |
| `housePrice` | int \| null | 每平米房价 (USD) |
| `bigMacPrice` | float \| null | 巨无霸价格 (USD) |

**工作**
| 字段 | 类型 | 说明 |
|------|------|------|
| `annualWorkHours` | int \| null | 年工作时数 |
| `paidLeaveDays` | int \| null | 带薪假天数 |

**环境与连接**
| 字段 | 类型 | 说明 |
|------|------|------|
| `airQuality` | int \| null | 空气质量指数 (AQI) |
| `aqiSource` | string | AQI 数据源 (EPA/AQICN) |
| `internetSpeedMbps` | int \| null | 网速 (Mbps) |
| `directFlightCities` | int \| null | 直飞城市数 |
| `doctorsPerThousand` | float \| null | 每千人医生数 |

**安全指数**（4 源复合）
| 字段 | 类型 | 说明 |
|------|------|------|
| `safetyIndex` | int | 综合安全指数 (0-100) |
| `safetyConfidence` | string | 置信度 (high/medium/low) |
| `numbeoSafetyIndex` | int \| null | Numbeo 安全指数 |
| `homicideRateInv` | int \| null | UNODC 凶杀率（反转） |
| `gpiScoreInv` | int \| null | 全球和平指数（反转） |
| `gallupLawOrder` | int \| null | 盖洛普法律与秩序指数 |
| `safetyWarning` | string? | 安全警告标记 |

**复合指标**（预计算）
| 字段 | 类型 | 说明 |
|------|------|------|
| `healthcareIndex` | int | 医疗保健指数 (0-100) |
| `healthcareConfidence` | string | 置信度 |
| `freedomIndex` | int | 制度自由指数 (0-100) |
| `freedomConfidence` | string | 置信度 |

**医疗/自由子数据**（用于指标计算）
| 字段 | 类型 |
|------|------|
| `hospitalBedsPerThousand` | float \| null |
| `uhcCoverageIndex` | int \| null |
| `lifeExpectancy` | float \| null |
| `pressFreedomScore` | int \| null |
| `democracyIndex` | float \| null |
| `corruptionPerceptionIndex` | int \| null |

### 1.3 26 个职业

软件工程师、医生/医学博士、财务分析师、市场经理、平面设计师、数据科学家、销售经理、人力资源经理、教师、护士、律师、建筑师、厨师、记者、机械工程师、药剂师、会计师、公务员、产品经理、UI/UX设计师、大学教授、牙医、家政服务人员、摄影师、公交司机、电工

> 134 城 × 26 职业 = **3,484** 条薪资数据，**100% 完整**，零缺失。

### 1.4 辅助数据

| 数据 | 位置 | 内容 |
|------|------|------|
| 气候数据 | `lib/clientUtils.ts` CITY_CLIMATE | 134 城：类型/均温/夏冬温/降雨/湿度/日照 |
| 城市简介 | `lib/cityIntros.ts` | 134 城 × 4 语言 |
| 官方语言 | `lib/cityLanguages.ts` | 134 城，74 种语言 × 4 语言本地化 |
| 税务数据 | `lib/taxData.ts` | 79 国 + 34 城市覆盖 + 6 外籍方案 |
| 汇率 | `public/data/exchange-rates.json` | 31 种货币兑 USD |
| 城市名翻译 | `lib/i18n.ts` | 134 城 × 4 语言 |
| 国名翻译 | `lib/i18n.ts` | 79 国 × 4 语言 |

### 1.5 数据可空情况

| 字段 | null 城市数 | 说明 |
|------|:-----------:|------|
| `bigMacPrice` | 6 | 无麦当劳的城市 |
| `numbeoSafetyIndex` | 1 | Numbeo 无数据 |
| 其余可空字段 | 0 | 134 城全部有值 |

---

## 二、设计

### 2.1 技术架构

```
Next.js 15 + React 18 + TypeScript + Tailwind CSS 3
100% SSG (Static Site Generation)
├── 构建时: 生成 220 个静态 HTML 页面
├── 运行时: 纯客户端 JS，无服务器
└── 状态管理: localStorage + React useState
```

### 2.2 页面结构

| 页面 | 路由 | 渲染方式 | 数量 |
|------|------|---------|------|
| 首页 | `/` | 静态 | 1 |
| 城市详情 | `/city/[slug]` | SSG | 134 |
| 双城对比 | `/compare/[pair]` | SSG | 79 |
| 排行榜 | `/ranking` | 静态 | 1 |
| Sitemap | `/sitemap.xml` | 静态 | 1 |
| Robots | `/robots.txt` | 静态 | 1 |

### 2.3 用户可配置项

| 设置 | 选项 | 默认值 | 持久化 |
|------|------|--------|--------|
| 语言 | zh / en / ja / es | en | localStorage |
| 深色模式 | on / off | off | localStorage |
| 职业 | 26 种 | 软件工程师 | localStorage |
| 消费档位 | 均衡 / 节约 | 均衡 | localStorage |
| 收入模式 | 税前 / 税后 / 外籍税后 | 税后 | localStorage |
| 货币 | 31 种 | USD | localStorage |

### 2.4 设计语言

- **配色**: Slate 系灰色 + 蓝/绿/红/琥珀语义色
- **排名色阶**: 绿色(好) → 蓝色(中) → 红色(差) 三级
- **暗色模式**: Slate-800/900 背景，全组件适配
- **响应式**: 移动端 1 列 → 平板 2-3 列 → 桌面 6 列
- **字体**: 系统字体栈，无外部字体依赖

### 2.5 国际化 (i18n)

| 指标 | 值 |
|------|---|
| 支持语言 | 4（中/英/日/西） |
| 翻译键 | ~285 个/语言 |
| 城市名翻译 | 134 城 × 4 语言 |
| 国名翻译 | 79 国 × 4 语言 |
| 职业名翻译 | 26 职业 × 4 语言 |
| 语言名翻译 | 74 语言 × 4 语言 |
| 外籍方案翻译 | 6 方案 × 4 语言 |

---

## 三、实现

### 3.1 代码量

| 类别 | 行数 |
|------|------|
| 有效源代码（.ts/.tsx/.css） | **~5,400 行** |
| 数据文件（cities.json） | ~8,700 行 |
| i18n 翻译 | ~1,400 行 |
| 税务数据 | ~1,300 行 |
| 城市简介 | ~820 行 |
| 城市语言 | ~330 行 |
| **总计（含数据）** | **~16,500 行** |

### 3.2 文件结构（清理后）

```
citycompare/
├── app/                          # 路由层
│   ├── page.tsx                  # 首页入口 (5行)
│   ├── layout.tsx                # 根布局 (28行)
│   ├── globals.css               # 全局样式 (17行)
│   ├── city/[slug]/page.tsx      # 城市详情页 SSG (71行)
│   ├── compare/[pair]/page.tsx   # 双城对比页 SSG (78行)
│   ├── ranking/page.tsx          # 排行榜 (15行)
│   ├── sitemap.ts                # SEO Sitemap (40行)
│   └── robots.ts                 # SEO Robots (8行)
├── components/                   # UI 组件（9个）
│   ├── CityComparison.tsx        # 首页主组件 (512行)
│   ├── CityDetailContent.tsx     # 城市详情页主组件 (648行)
│   ├── CompareContent.tsx        # 双城对比页主组件 (262行)
│   ├── RankingContent.tsx        # 排行榜主组件 (419行)
│   ├── CityCard.tsx              # 城市卡片 (140行)
│   ├── KeyInsights.tsx           # 关键洞察 (179行)
│   ├── ChartSection.tsx          # 图表区 (142行)
│   ├── ShareCard.tsx             # 分享卡片生成 (165行)
│   └── DataSources.tsx           # 数据来源展示 (37行)
├── lib/                          # 核心逻辑（11个）
│   ├── types.ts                  # TypeScript 类型定义 (68行)
│   ├── constants.ts              # 常量/地区/emoji (200行)
│   ├── dataLoader.ts             # 服务端数据加载 (21行)
│   ├── clientUtils.ts            # 客户端工具函数 (152行)
│   ├── i18n.ts                   # 国际化翻译 (1,427行)
│   ├── citySlug.ts               # URL slug 映射 (79行)
│   ├── cityIntros.ts             # 城市简介 (818行)
│   ├── cityLanguages.ts          # 城市语言数据 (326行)
│   ├── taxData.ts                # 79国税务数据 (1,319行)
│   ├── taxUtils.ts               # 税务计算引擎 (204行)
│   └── CompareContext.ts         # 首页共享状态 (28行)
├── hooks/                        # React Hooks（2个）
│   ├── useSettings.ts            # 全局设置管理 (133行)
│   └── useUrlState.ts            # URL 状态同步 (24行)
├── public/data/                  # 静态数据（2个）
│   ├── cities.json               # 134城核心数据 (~8,700行)
│   └── exchange-rates.json       # 31种货币汇率 (66行)
├── _archive/                     # 归档（不参与运行时）
│   ├── scripts/                  # 24个一次性数据脚本
│   ├── data_sources/             # 4个安全指数原始数据
│   └── ...                       # 参考快照文件
├── reports/                      # 项目报告
└── [配置文件]                     # next.config, tsconfig, tailwind, eslint 等
```

### 3.3 核心算法

**税务计算引擎** (`lib/taxUtils.ts`)
- 覆盖 79 个国家的累进税率
- 34 个城市级别覆盖（美国 20 州、加拿大 5 省等）
- 6 种外籍人士税务优惠方案
- 5 国特殊员工扣除（德国定额、法国 10% 等）
- 自动回退机制：若外籍方案比普通税率更差，取较优值

**生活压力指数** (`lib/clientUtils.ts`)
- 4 维加权复合指标：储蓄率(30%) + 巨无霸购买力(25%) + 工时(25%) + 购房年数(20%)
- Min-Max 归一化，动态权重再分配（缺失维度自动补偿）
- 置信度 3 级（high/medium/low）

**相似城市** (`components/CityDetailContent.tsx`)
- 16 维归一化欧氏距离
- 实时计算，响应用户设置变化（职业、消费档、税模式）
- 维度对齐城市详情页前三行卡片数据

**安全指数** (预计算，存入 `cities.json`)
- 4 源复合：Numbeo(30%) + UNODC 凶杀率(25%) + GPI(25%) + Gallup(20%)
- 缺失数据自动权重再分配

**医疗保健指数** (预计算)
- 3 源复合：每千人医生数 + 每千人床位数 + UHC 覆盖率 + 预期寿命

**制度自由指数** (预计算)
- 3 源复合：新闻自由 + 民主指数 + 腐败感知指数

### 3.4 依赖

**运行时依赖（4 个）**
| 包 | 版本 | 用途 |
|----|------|------|
| next | ^15 | 框架 |
| react | ^18 | UI |
| react-dom | ^18 | DOM |
| recharts | ^3.8.0 | 图表 |

> 极为精简，无 CSS-in-JS、无状态管理库、无 HTTP 客户端。

### 3.5 页面大小

| 页面 | JS 体积 | First Load |
|------|---------|------------|
| 首页 | 124 kB | 268 kB |
| 城市详情 | 154 kB | 295 kB |
| 双城对比 | 5.5 kB | 149 kB |
| 排行榜 | 5.1 kB | 147 kB |
| 共享 JS | 102 kB | — |

---

## 四、进度

### 4.1 开发时间线

| 日期 | 里程碑 |
|------|--------|
| 03-23 | 项目创建，首个提交 |
| 03-23 ~ 03-24 | 基础框架搭建：首页、城市卡片、图表、深色模式 |
| 03-24 ~ 03-25 | 数据扩展：20 城→134 城，9 职业→26 职业 |
| 03-25 | 数据完整性大改：可空字段、AQI 源追踪、null 安全 UI |
| 03-25 ~ 03-26 | DATA_SOURCES.md 1200 行参考手册 |
| 03-26 | 城市详情页 16 项改进：标签/单位/排名/配色 |
| 03-26 ~ 03-27 | 安全指数 v2（4 源复合）+ 医疗/自由指数预计算 |
| 03-27 | 城市简介 4 语言 + 官方语言卡片 |
| 03-27 ~ 03-28 | 导航栏宽度统一 + 预期寿命单位 + 月租金改名 |
| 03-28 ~ 03-29 | 税务系统（79 国 + 6 外籍方案 + 员工扣除 + 自动回退） |
| 03-29 | 税率卡片 UI + 外籍方案 i18n + 默认值优化 |
| 03-29 | 缺失收入 null 语义重构（7 组件） |
| 03-29 | 气候卡片字号对齐 |
| 03-29 | 相似城市算法：11→16 维 + SSG→客户端实时计算 |
| 03-30 | 项目审计与清理 |

### 4.2 提交统计

| 指标 | 值 |
|------|---|
| 总提交数 | **103** |
| 开发天数 | **7 天** |
| 平均提交/天 | ~15 |

### 4.3 当前功能完整度

| 功能 | 状态 | 说明 |
|------|:----:|------|
| 134 城数据 | ✅ | 37 字段，26 职业，100% 完整 |
| 城市详情页 | ✅ | 3 行 4 卡片 + 4 指标 + 气候 + 相似城市 |
| 首页城市选择与比较 | ✅ | 卡片 + 图表 + 关键洞察 + 分享 |
| 双城对比页 | ✅ | 14 维对比表 |
| 排行榜 | ✅ | 多维度排序 + 复合指标 |
| 4 语言 i18n | ✅ | zh/en/ja/es，~285 键 |
| 深色模式 | ✅ | 全站适配 |
| 31 种货币切换 | ✅ | 实时汇率换算 |
| 税前/税后/外籍模式 | ✅ | 79 国完整税务数据 |
| 2 种消费档位 | ✅ | 均衡/节约 |
| 26 种职业切换 | ✅ | 实时更新所有指标 |
| SEO | ✅ | JSON-LD + Sitemap + 语义化 URL |
| 响应式设计 | ✅ | 移动/平板/桌面 |
| 相似城市实时推荐 | ✅ | 16 维欧氏距离，随设置动态更新 |

---

## 五、展望

### 5.1 可直接扩展的方向

| 方向 | 复杂度 | 说明 |
|------|--------|------|
| 新增城市 | 低 | 在 `cities.json` 添加数据，`citySlug.ts` 添加映射即可 |
| 新增职业 | 低 | 在 134 城的 `professions` 中添加键值，i18n 添加翻译 |
| 新增语言 | 中 | i18n.ts 添加新 locale，所有翻译键需补全 |
| 新增货币 | 低 | `exchange-rates.json` 添加汇率 |
| 新增数据维度 | 中 | `types.ts` 加字段 → `cities.json` 加数据 → UI 展示 |

### 5.2 潜在改进空间

| 方向 | 说明 |
|------|------|
| **数据时效性** | 当前为静态快照，可考虑定期自动更新 (GitHub Actions + API 抓取) |
| **对比页增强** | 当前仅支持 2 城对比（预渲染 79 对），可扩展为动态多城对比 |
| **排行榜筛选** | 可增加按大洲/国家/指标组合的高级筛选 |
| **气候体验丰富化** | 可加逐月温度/降雨图表，季节性对比 |
| **用户偏好推荐** | 根据用户选择的优先维度（收入优先/生活质量优先等）推荐最佳城市 |
| **汇率自动更新** | 从 API 获取实时汇率而非静态文件 |
| **性能优化** | `CityDetailContent.tsx` 648 行可拆分为子组件；部分计算可用 `useMemo` 优化 |
| **测试** | 当前零测试覆盖，可增加核心算法（税务计算、相似城市）的单元测试 |
| **无障碍 (a11y)** | 可增加键盘导航、ARIA 标签、屏幕阅读器支持 |

### 5.3 数据质量现状

| 评估维度 | 状态 |
|---------|------|
| 职业薪资完整性 | ✅ 134×26 = 3,484 条，0 缺失 |
| 核心字段(收入/成本/房价) | ✅ 134 城全部有值 |
| 可空字段覆盖率 | ✅ 除 bigMacPrice(6 null) 外基本 100% |
| 安全指数置信度 | ✅ 4 源复合 + 3 级置信度标注 |
| 税务数据 | ✅ 79 国覆盖所有 134 城 |
| 多语言覆盖 | ✅ 城市名/国名/职业/语言名全部 4 语言 |
