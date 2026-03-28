# Design System — 设计系统文档

> 最后审计：2026-03-28

本文档定义了项目的视觉规范、布局系统、组件样式、配色体系和交互模式。

---

## 1. 技术基础

| 属性 | 值 |
|---|---|
| CSS 框架 | Tailwind CSS 3 |
| 计量单位 | rem (Tailwind 默认)，间距使用 Tailwind 数字系统 |
| 响应式断点 | sm:640px / md:768px / lg:1024px / xl:1280px |
| 图表库 | Recharts 3（BarChart 为主） |
| 图标 | 纯 Emoji（无 icon library） |
| 字体 | 系统字体栈（未自定义） |
| 暗色模式 | 手动切换，通过 Tailwind class 切换（非 CSS 变量 / dark: 前缀） |
| 自定义 CSS | `globals.css` 仅 17 行（Tailwind 指令 + reset + smooth scroll） |

---

## 2. 配色体系

### 2.1 暗色/亮色模式

所有颜色通过三元表达式在组件内动态切换：

| 用途 | 亮色模式 | 暗色模式 |
|------|---------|---------|
| **页面背景** | `bg-slate-50` | `bg-slate-950` |
| **正文** | `text-slate-900` | `text-slate-100` |
| **次要文本** | `text-slate-500` | `text-slate-400` |
| **卡片/面板** | `bg-white border-slate-200` | `bg-slate-800 border-slate-700` |
| **顶栏** | `bg-white border-slate-200` | `bg-slate-900 border-slate-700` |
| **输入框** | `bg-white border-slate-300` | `bg-slate-800 border-slate-600` |
| **表头** | `bg-slate-50/100` | `bg-slate-700/800` |
| **首页卡牌** | `from-gray-700 to-gray-900` | 同（已在深色梯度上） |
| **首页基准城市卡** | `from-blue-600 to-blue-800` + `ring-yellow-400` | 同 |

### 2.2 语义配色 — 好/中/差 三档系统

项目中有 **两套** 好/中/差 配色系统：

#### 城市详情页（CityDetailContent）— 排名分级 (rank/total)

| 档位 | 亮色卡片边框 | 暗色卡片边框 | 亮色数值 | 暗色数值 |
|------|-------------|-------------|---------|--------|
| good (前20%) | `border-emerald-400` | `border-emerald-500/60` | `text-emerald-600` | `text-emerald-400` |
| mid (中间60%) | `border-slate-200` | `border-slate-600` | 默认 headingCls | 默认 headingCls |
| bad (后20%) | `border-rose-400` | `border-rose-500/60` | `text-rose-500` | `text-rose-400` |

#### 排行榜（RankingContent）— 固定阈值分级

| Tab | 好(emerald) | 中(amber) | 差(red) |
|-----|-----------|---------|-------|
| 储蓄 | savings > 0 | — | savings < 0 |
| 购买力 | ppp ≥ 1.5 | ppp ≥ 1 | ppp < 1 |
| 购房 | ≤ 15 年 | finite | ∞ (入不敷出) |
| 租金 | — | — | — |
| 空气 | AQI ≤ 50 | AQI ≤ 100 | AQI > 100 |
| 直飞 | ≥ 150 城 | ≥ 50 城 | < 50 城 |
| 安全 | ≥ 70 | ≥ 40 | < 40 |
| 工时 | ≤ 1600h | ≤ 1900h | > 1900h |
| 年假 | — | — | — |
| 网速 | — | — | — |
| 生活压力 | ≤ 35 | ≤ 65 | > 65 |
| 医疗 | — | — | — |
| 自由 | — | — | — |

**颜色映射**:
- emerald-400/600 = 好
- amber-400/600 = 中
- red-400/500 = 差

#### 对比页指标表格（CompareContent）

| 状态 | 亮色 | 暗色 |
|------|------|------|
| 胜方 | `text-green-600 bg-green-50` | `text-green-400 bg-green-900/30` |
| 常规 | `text-slate-700` | `text-slate-200` |

### 2.3 功能配色

| 用途 | 颜色 |
|------|------|
| 收入/年薪 | blue-400/500/600 |
| 支出/成本 | red-400/500 |
| 储蓄 | emerald/green/lime |
| 房价 | purple |
| 巨无霸 | yellow |
| 空气质量 | teal |
| 医疗 | pink |
| 安全 | — (用好/中/差系统) |
| 导航-首页 | blue-300/700 |
| 导航-排行 | amber-300/700 |
| 导航-随机 | emerald-300/700 |

---

## 3. 布局系统

### 3.1 全局布局

```
┌─ sticky 顶栏 (z-50) ──────────────────────────┐
│ [首页] [排行榜] [🎲随机]   [职业▾][花费▾][语言▾][货币▾][🌙] │
└─────────────────────────────────────────────────┘
│                                                 │
│  max-w-6xl mx-auto px-4                        │
│     (最大宽度 1152px 居中)                      │
│                                                 │
│  ┌─ 内容区域 ──────────────────────────┐       │
│  │                                     │       │
│  │  (页面特定内容)                      │       │
│  │                                     │       │
│  └─────────────────────────────────────┘       │
│                                                 │
│  ┌─ 页脚 ─────────────────────────────┐        │
│  │ 免责声明 · 更新时间 · 反馈链接      │        │
│  └─────────────────────────────────────┘        │
```

### 3.2 导航栏实现

**⚠️ 重要**: 导航栏在 4 个页面组件中各自独立实现（非共享组件）。

共同特征：
- `sticky top-0 z-50`
- 左侧：首页(blue) + 排行榜(amber) + 随机城市(emerald)
- 右侧：职业 + 消费层级 + 语言 + 货币 + 深色模式切换
- 所有 select 统一样式：`text-xs rounded px-1.5 py-1 border`
- flex-wrap 响应式换行

差异：
- 首页（CityComparison）: 使用负 margin `-mx-3 sm:-mx-4 -mt-4 sm:-mt-8` 扩展全宽
- 城市详情/对比: 标准 `px-4 py-2.5`
- 排行榜: 与首页相同的负 margin 处理

### 3.3 响应式网格

| 组件/区域 | 小屏(default) | sm(640+) | md(768+) | lg(1024+) | xl(1280+) |
|-----------|--------------|----------|----------|-----------|-----------|
| **指标卡片 (Row 1-2)** | 2 列 | 3 列 | 3 列 | 2×3 组 | 2×3 组 |
| **气候区块** | 2 列 | 3 列 | 3 列 | 6 列 | 6 列 |
| **相似城市** | 2 列 | 3 列 | 3 列 | 6 列 | 6 列 |
| **首页城市选择器** | 2 列 | 3 列 | 5 列 | 6 列 | 8 列 |
| **首页城市卡** | 1 列 | 1 列 | 2-3 列 | 3 列 | 5 列 |
| **首页图表** | 1 列 | 1 列 | 1 列 | 2 列 | 2 列 |
| **对比页链接** | 1 列 | 2 列 | 2 列 | 2 列 | 2 列 |
| **洞察卡片** | 1 列 | 2 列 | 2 列 | 4 列 | 4 列 |

---

## 4. 组件样式规范

### 4.1 面板/卡片

**标准面板**:
```
rounded-xl shadow-md p-4 sm:p-8 border
亮: bg-white border-gray-100
暗: bg-gray-800 border-gray-700
```

**城市详情卡片**:
```
rounded-xl border p-4 text-center
亮: bg-white + border由tier决定
暗: bg-slate-800 + border由tier决定
```

**首页城市卡片（非基准）**:
```
rounded-xl p-4 sm:p-6 shadow-lg
bg-gradient-to-br from-gray-700 to-gray-900
```

**首页城市卡片（基准）**:
```
ring-4 ring-yellow-400 ring-opacity-50
bg-gradient-to-br from-blue-600 to-blue-800
```

### 4.2 城市详情页 — 4 行指标卡片区

布局改为 4 行：
- **Row 1**: 收支(3 卡) + 住房(3 卡)， lg:并排
- **Row 2**: 工作(3 卡) + 环境与连接(3 卡)， lg:并排
- **Row 3**: 4 张综合指数卡(生活压力/公共安全/医疗/自由) + 子指标面板
- **Row 4**: 气候 + 相似城市

```
┌─────────────────────────────────────────────────┐
│  [h-8 标题区域 — uppercase tracking-wide xs]     │
│  [text-xl font-extrabold — 主数值]               │
│  [h-8 排名区域 — #N/134]                         │
├─────────────────────────────────────────────────┤
│  子指标1  (权重)    值                            │
│  子指标2  (权重)    值                            │
│  ...                                            │
└─────────────────────────────────────────────────┘
```

特殊处理：
- 标题和排名区域固定 `h-8` 高度，使用 `flex items-center justify-center` 垂直居中
- 防止不同长度文本导致卡片高度不一致
- **指数卡与子指标面板视觉连接**：指数卡底部 `rounded-b-none`，子指标面板 `rounded-b-xl border-t-0`，形成一体化视觉效果
- 排名支持并列（tied rankings）：同分城市获得相同排名，下一名跳号（如两个 #1 后为 #3）
- 综合指数分值显示一位小数，不再附加 `/100`

### 4.3 导航按钮

```
text-xs px-2 py-1 rounded border font-semibold/normal transition
亮: bg-white border-slate-300 text-{color}-700 hover:bg-{color}-50
暗: bg-slate-800 border-slate-600 text-{color}-300 hover:bg-slate-700
```

颜色: 首页=blue, 排行榜=amber, 随机城市=emerald

### 4.4 下拉选择器

统一样式（所有页面）：
```
text-xs rounded px-1.5 py-1 border
亮: bg-white border-slate-300 text-slate-700
暗: bg-slate-800 border-slate-600 text-slate-200
```

### 4.5 表格（对比页/排行榜）

| 元素 | 亮色 | 暗色 |
|------|------|------|
| 表头 | `bg-slate-50/100 text-slate-500/600` | `bg-slate-700/800 text-slate-300/400` |
| 行分隔 | `border-slate-100` | `border-slate-700/50` |
| TOP3 行背景 | `bg-blue-50/50` | `bg-blue-900/10` |
| 悬停 | `hover:bg-slate-50` | `hover:bg-slate-700/30` |

---

## 5. 图表样式 (ChartSection)

### 5.1 通用配置

```typescript
gridStroke  = darkMode ? "#444" : "#ddd"     // 网格线
axisStroke  = darkMode ? "#999" : "#666"     // 坐标轴
tooltipBg   = darkMode ? "#333" : "#fff"     // 提示框
```

### 5.2 图表配色

| 图表 | 数据 | Bar 颜色 |
|------|------|---------|
| 年度财务 | income | `#3b82f6` (blue-500) |
| 年度财务 | expense | `#ef4444` (red-500) |
| 年度财务 | savings | `#10b981` (emerald-500) |
| 气候-温度 | avgTempC | `#38bdf8` (sky-400) |
| 气候-降水 | annualRainMm | `#a78bfa` (violet-400) |
| 气候-日照 | sunshineHours | `#fbbf24` (amber-400) |
| 空气质量 | airQuality | `#14b8a6` (teal-500) |
| 医师密度 | doctors | `#f472b6` (pink-400) |

所有 Bar 统一 `radius={[8, 8, 0, 0]}`（顶部圆角）。

### 5.3 Y 轴格式化

```
≥ 1,000,000 → "{symbol}{n}M"
≥ 1,000     → "{symbol}{n}K"
< 1,000     → "{symbol}{n}"
```

---

## 6. 分享卡片 (ShareCard)

Canvas 生成的 PNG 分享图，样式硬编码：

| 属性 | 值 |
|------|---|
| 宽度 | 600px (dpr=2 → 1200px 物理) |
| 高度 | 260 + N×90px（N = 比较城市数） |
| 背景 | 渐变 `#0f172a → #1e293b`（slate-900 系） |
| 标题栏 | `rgba(59,130,246,0.15)`（blue 半透明） |
| 最优储蓄行 | `rgba(34,197,94,0.1)` + `rgba(34,197,94,0.3)` 边框 |
| 字体 | `system-ui, -apple-system, sans-serif` |
| 标题颜色 | `#93c5fd`（blue-300） |
| 副标题 | `#94a3b8`（slate-400） |
| 城市名 | `#f1f5f9`（slate-50） |
| 收入数值 | `#93c5fd`（blue-300） |
| 支出数值 | `#fca5a5`（red-300） |
| 储蓄正值 | `#86efac`（green-300） |
| 储蓄负值 | `#fca5a5`（red-300） |

---

## 7. 交互模式

### 7.1 城市选择（首页）

- 点击城市按钮 → toggle 选中（蓝色高亮 + ring）
- 达到最大数量 → 其他按钮置灰 + cursor-not-allowed
- 最大数量: <768px: 2城, <1024px: 3城, ≥1024px: 5城
- 选中城市显示为 pill 标签，可单独移除（✕ 按钮）

### 7.2 对比触发

- "对比 N 个城市" 按钮 → 滚动到结果区域 (smooth scroll)
- 选中恰好 2 城 → 额外显示 "{CityA} vs {CityB} →" 链接按钮

### 7.3 基准城市（首页）

- 点击任何 CityCard → 设为 baseCityId
- 基准城市卡添加 `ring-4 ring-yellow-400`
- KeyInsights "对比基准城市" 面板以此为锚点

### 7.4 深色模式切换

- 按钮: 亮色模式显示 "🌙"，暗色模式显示 "☀️"
- 切换后所有颜色类名实时更新
- 持久化到 localStorage

### 7.5 排行榜 Tab 切换

- 13 个 Tab 按钮等宽网格 (`grid-cols-4 sm:grid-cols-7 lg:grid-cols-13`)
- 当前 Tab: `bg-blue-600 text-white`
- 非当前 Tab: 亮色 `bg-gray-100` / 暗色 `bg-gray-700`
- 切换即时排序，无动画

---

## 8. Emoji 使用规范

项目不使用 icon 库（如 Lucide/Heroicons），完全依赖 Emoji：

| Emoji | 使用位置 |
|-------|---------|
| 🇺🇸🇬🇧🇯🇵... | 城市列表、详情页、对比页 — 国旗 emoji（134条定义于 CITY_FLAG_EMOJIS） |
| 🏙️ | 默认城市图标（无国旗时） |
| ⭐ | 首页基准城市标识 |
| 🥇🥈🥉 | 排行榜 TOP3 |
| 🌙☀️ | 深色模式切换 |
| 🔗 | 分享链接 |
| 📸 | 生成分享卡片 |
| ✕ | 关闭/移除（选中城市 pill） |
| ✓ | 对比页胜方标记 |
| 💼 | 首页城市卡职业收入标签 |
| 📅 | 主页数据更新时间 |
| 💰🏦🔻🏠🌿💡📊🌍🔥📋⭐🏥⏰🛡️✈️💱 | 各 i18n key 中的 emoji 前缀 |

**卡片标签**: 城市详情页的16张指标卡片标题区域**不使用 emoji**，纯文本标签。

---

## 9. 文字排版

### 9.1 标题层级

| 层级 | 样式 | 使用位置 |
|------|------|---------|
| H1 | `text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight` | 首页标题 |
| H1 (子页面) | `text-3xl sm:text-4xl font-extrabold` | 城市详情 Hero |
| H2 | `text-2xl sm:text-3xl font-bold` | 区块标题 |
| H3 | `text-base sm:text-lg font-semibold` | 子区块标题 |
| 正文 | `text-sm` / `text-base` | — |
| 辅助文字 | `text-xs` | 标签、脚注 |
| 微型文字 | `text-[10px]` | 首页卡片内气候小标签 |

### 9.2 卡片内文字

| 元素 | 样式 |
|------|------|
| 指标标题 | `text-xs font-semibold uppercase tracking-wide` |
| 指标数值 | `text-xl font-extrabold` |
| 指标排名 | `text-xs` |

---

## 10. 间距体系

| 用途 | 值 | Tailwind |
|------|---|---------|
| 页面内边距 | 12-16px | `px-3 sm:px-4` |
| 区块间距 | 24-40px | `mb-6 sm:mb-8 / mb-10` |
| 卡片内边距 | 16-24px | `p-4 sm:p-6` |
| 面板内边距 | 16-32px | `p-4 sm:p-8` |
| 网格间距 | 12px | `gap-3` |
| 区域间距 | 16-24px | `gap-4 sm:gap-6` |
| 顶栏内边距 | 16px × 10px | `px-4 py-2.5` |

---

## 11. 已知设计问题

| # | 问题 | 严重度 | 说明 |
|---|------|--------|------|
| 1 | 暗色模式非 Tailwind dark: 前缀实现 | **中** | 使用三元表达式手动切换，代码冗长 |
| 2 | 导航栏 4 处复制粘贴 | **高** | 样式不保证一致，修改需同步 4 处 |
| 3 | 首页卡片（CityCard）使用深色渐变背景 | 低 | 与其他页面的亮/暗双模式风格不一致 |
| 4 | AQI 颜色在不同组件中定义不一致 | 中 | clientUtils 用文字标签, CityComparison/CompareContent 用 Tailwind class, ChartSection 直接 inline |
| 5 | 排行榜阈值配色 vs 详情页排名配色 | — | 两套系统并存是设计意图：排行榜用固定阈值，详情页用 rank/total 20%/80% |
| 6 | 无 loading skeleton / transition | 低 | 首页加载等待只有 spinner，数据就绪后整段渲染 |
| 7 | 图表在小屏上可读性 | 中 | BarChart 城市名标签可能重叠 |
| 8 | 字体仅依赖系统字体 | — | 可能在不同 OS 上显示差异较大 |
| 9 | 未设置 favicon | 低 | `public/` 下无 favicon 文件 |
| 10 | layout.tsx 固定 `lang="en"` | 中 | 不随用户语言变化，影响可访问性和 SEO |
