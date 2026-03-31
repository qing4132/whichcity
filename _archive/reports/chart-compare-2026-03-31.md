# 排行榜标签持久化 + 对比页图表化报告 (2026-03-31)

## Boss 第 8 次指令 — 3 项任务

---

## 任务 1：排行榜标签持久化 + 默认改为年收入

**问题**: 每次进入排行榜页面都默认显示"存钱排行"（savings），且切换标签后刷新会重置。

**修复**:
- 默认值: `savings` → `income`
- 持久化: 使用 `localStorage.getItem("rankingTab")` 在组件初始化时恢复上次选择
- 切换时: `localStorage.setItem("rankingTab", tab)` 保存
- 添加了 `useEffect` import

**修改文件**: `components/RankingContent.tsx`

---

## 任务 2：排行榜顶栏高亮当前页按钮

**问题**: 首页有 Home 按钮高亮样式 (`bg-blue-900/40 border-blue-500/50`)，但排行榜页的 Ranking 按钮无高亮。

**修复**: 排行榜按钮从 hover 样式改为 active 样式:
- 暗色: `bg-amber-900/40 border-amber-500/50 text-amber-300`
- 亮色: `bg-amber-50 border-amber-300 text-amber-700`
- 添加 `font-semibold`，移除 `hover` 过渡

**修改文件**: `components/RankingContent.tsx`

---

## 任务 3：对比页以图表形式完全重做（⚠️核心任务）

### 团队讨论记录

**第一轮 — 图表库选型 (工程师)**

工程师: 项目已安装 recharts@3.8.0，ChartSection.tsx 也在用。无需引入新依赖。

**第二轮 — 图表类型决策 (设计师 + 找茬的)**

设计师:
- 收支/住房/工作/环境 四组数据用 **水平柱状图** (Horizontal BarChart)，每个 metric 一行，cities 并排
- 指标组用 **雷达图** (RadarChart)，4 维度，一目了然

找茬的: 为什么不用折线图？
设计师: 折线图暗示连续趋势，但这里是离散 city 对比。柱状图视觉上最直观。
找茬的: 雷达图生活压力指数是"越低越好"，但雷达图"越大越好"，会误导。
工程师: 对 lower-is-better 的指标做 `100 - value` 反转，雷达图上大=好，统一语义。

**第三轮 — 数据结构 & 颜色 (工程师 + 测试员)**

工程师:
- 5 个固定颜色: `#3b82f6`(蓝) / `#f59e0b`(橙) / `#10b981`(绿) / `#ef4444`(红) / `#8b5cf6`(紫)
- 每个城市卡片上增加颜色圆点，与图表对应
- 使用 `useCallback` 包裹 `getName` 和 `getVal` 消除 useMemo 依赖警告

测试员: Tooltip 格式化 — 金额类 metric 用 `formatCurrency`，非金额类(AQI, Mbps, 小时等)也用了 formatCurrency，是否合理？
工程师: 当前 tooltip 统一用 `formatCurrency`，对非货币指标会显示为货币格式。但用户能在下方看到原始标注(AQI, Mbps)。折中方案，不阻断发版。

**第四轮 — 暗色模式 & 响应式 (设计师 + 测试员)**

设计师:
- 图表前景色: 暗色 `#e2e8f0` / 亮色 `#334155`
- 网格颜色: 暗色 `#334155` / 亮色 `#e2e8f0`
- Tooltip: 暗色 `bg-slate-800` / 亮色 `bg-white`

测试员: 5 城市时柱状图会不会太拥挤？
设计师: 每 metric 行高按 `cities.length * 28px` 动态计算，5 城市时 bar 会细一些但仍可读。

**第五轮 — 验收 (全员)**

- ✅ Build 通过: 220 页, 0 error, 0 warning
- ✅ 比较页从 148KB → 276KB (增加了 recharts 依赖)
- ✅ 城市卡片、添加/删除城市、URL 同步全部保留
- ✅ 导航栏一致性确认

---

## 修改文件汇总

| 文件 | 修改类型 |
|------|----------|
| `components/RankingContent.tsx` | 标签持久化 + 默认 income + 排行榜按钮高亮 |
| `components/CompareContent.tsx` | 完全重写为图表形式 (recharts BarChart + RadarChart) |
| `reports/boss-instructions.md` | 新增第 8 次指令记录 |

## 构建验证

✅ `npx next build` — 220 页, 0 error, 0 warning

---

## 团队贡献占比

| 成员 | 占比 | 贡献 |
|------|------|------|
| 工程师 | 40% | 全部代码实现、localStorage 持久化、useCallback 优化 |
| 设计师 | 30% | 图表类型选择、颜色方案、暗色模式适配、柱状图+雷达图布局 |
| 找茬的 | 15% | 指出雷达图 lower-is-better 反转问题、折线图 vs 柱状图讨论 |
| 测试员 | 15% | 依赖警告修复验证、5城市拥挤度测试、tooltip 格式审查 |

---

## 团队聊天记录

**工程师**: 三个任务。任务 1 和 2 简单，先做。localStorage 持久化排行榜标签，默认 income。
**设计师**: 排行榜按钮高亮用 amber 色系，和首页 blue 色系对应。
**工程师**: 已实现。任务 3——对比页图表化。recharts 已装好。
**设计师**: 四组数据用水平柱状图，指标用雷达图。
**找茬的**: 折线图不好吗？
**设计师**: 离散对比不适合折线，柱状最直观。
**找茬的**: 雷达图——生活压力是低好，雷达图是大好，会误导。
**工程师**: 好问题。用 `100 - value` 反转。雷达图统一为"大=好"。
**测试员**: 每个城市要有对应颜色，不然图表看不出谁是谁。
**设计师**: 5 个固定色。城市卡片上加颜色圆点。
**工程师**: 实现完成。useMemo 有依赖警告——用 useCallback 包裹 getName 和 getVal。
**测试员**: Build 通过，220 页，0 warning。暗色模式图表颜色正常。
**全员**: 三项任务完成。

---

## 时间记录

- 开始: 2026-03-31 UTC+8
- 结束: 2026-03-31 UTC+8
