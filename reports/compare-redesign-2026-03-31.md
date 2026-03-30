# 对比页重设计 & 排行榜优化报告 (2026-03-31)

## Boss 第 6 次指令 — 4 项任务

---

## 任务 1：排行榜标签颜色再次调淡

**问题**: 上一次调整后 `bg-slate-200` 偏深，用户反馈仍然不舒适。

**方案**: 
- 未选中标签: `bg-slate-200` → `bg-slate-100/70`（透明度降低）
- 选中(数据): `bg-blue-100` → `bg-blue-50`
- 选中(指标): `bg-indigo-100` → `bg-indigo-50`
- hover 对应调整

**修改文件**: `components/RankingContent.tsx`

---

## 任务 2：排行榜表头吸顶

**问题**: 134 行数据滚动后用户无法看到列标题，产生困惑。

**方案**: 给 `<thead>` 添加 `sticky top-[49px] z-40`（49px = 顶栏高度）。

**修改文件**: `components/RankingContent.tsx`

---

## 任务 3：排行榜标签 emoji 去重

**问题**: 💰 同时用于"储蓄"和"收入"，🏠 同时用于"住房"和"租金"。

**方案**:
| 标签 | 旧 emoji | 新 emoji |
|------|----------|----------|
| 年收入 | 💰 | 📈 |
| 月租金 | 🏠 | 🔑 |

4 语言 × 2 项 = 8 处修改。

**修改文件**: `lib/i18n.ts`

---

## 任务 4：对比页完全重设计（⚠️核心任务）

### 团队讨论记录

**第一轮 — 需求分析 (工程师 + 设计师)**

工程师：旧版 CompareContent 硬编码 2 城市对比，props 为 `(cityA, cityB, slugA, slugB)`，只显示 14 行指标，无法扩展。
设计师：需要支持 2-5 城市动态列；表格布局 rows=metrics, columns=cities；头部卡片展示城市信息 + 胜出数。

**第二轮 — 架构讨论 (工程师 + 设计师 + 质检)**

工程师：
- `page.tsx` (server) 重写 `parsePair` — 按 `-vs-` 分割，支持多段 slug
- 传入 `allCities: City[]` 给客户端组件用于搜索添加城市
- 新 props: `{ initialCities, initialSlugs, allCities }`

质检：确认 `generateStaticParams` 仍然只生成 2 城市对（兼容性保证），3+ 城市页面走 ISR/动态即可。

**第三轮 — UI 设计 (设计师 + 挑刺人)**

设计师提出设计方案:
1. **城市头部卡片**: 横排排列，国旗 + 城市名 + 国家 + 胜出数，自适应宽度
2. **添加城市**: 右侧"+"虚线按钮，弹出搜索框，支持城市名/国家名搜索
3. **删除城市**: 卡片右上角"×"按钮，最少 2 城市
4. **对比表格**: 分组表格（收支 / 住房 / 工作 / 环境 / 指标），16 行数据
5. **胜出高亮**: 最佳值绿色加粗 + ✓ 标记

挑刺人: 5 城市时需要水平滚动？
设计师: 是的, `overflow-x-auto` 并且设置 `min-w-[140px]` 防止卡片太窄。

**第四轮 — 数据架构审查 (工程师 + 质检)**

工程师: 16 项指标定义为 `METRICS` 数组:
- 收支组: 收入、支出、储蓄
- 住房组: 房价、租金、购房年数
- 工作组: 工时、时薪、假期
- 环境组: 空气、网速、直航
- 指标组: 生活压力、安全、医疗、自由

每个 metric 有 `get(city, ctx)` 提取值和 `fmt(val, ctx)` 格式化，以及 `lower: boolean` 标记低值为优。

质检: 需要 `useMemo` 缓存 `rowCtx` 避免每次渲染重建依赖。— ✅ 已修复。

**第五轮 — 集成测试 & 最终审查 (全员)**

- ✅ Build 通过: 220 页全部生成，0 error, 0 warning
- ✅ URL 格式: `/compare/new-york-vs-tokyo-vs-london` — 支持 3+ 城市
- ✅ URL 更新: 添加/删除城市时 `router.replace` 更新 URL
- ✅ 统一设计: 顶栏、职业/消费/收入选择器与其他页面一致
- ✅ 去掉了旧版依赖: CompareCtx, KeyInsights, getCityClimate 等不再需要
- ✅ 对比页大小从 ~250 行优化到更清晰的架构

### 具体变更

**`app/compare/[pair]/page.tsx`** — Server 组件:
- `parsePair()`: 正则 → `-vs-` 分割，返回 `string[]`
- 导入 `loadCities()` 传递全部城市数据
- 新增 `getCityEnName` 用于 metadata

**`components/CompareContent.tsx`** — 客户端组件完全重写:
- 新 Props: `{ initialCities: City[]; initialSlugs: string[]; allCities: City[] }`
- 16 项 METRICS 定义（分 5 组）
- 动态城市管理: useState(cities), addCity(), removeCity()
- 城市搜索: 支持城市名 + 国家名（4 语言）
- 分组表格: GROUP_KEYS 控制显示顺序
- Winner 检测: 同值时不标记为胜出

---

## 修改文件汇总

| 文件 | 修改类型 |
|------|----------|
| `components/RankingContent.tsx` | 标签颜色调淡 + 表头吸顶 |
| `lib/i18n.ts` | 8 处 emoji 修改 |
| `app/compare/[pair]/page.tsx` | 重写服务端组件 |
| `components/CompareContent.tsx` | 完全重写客户端组件 |

## 构建验证

✅ `npx next build` — 220 页, 0 error, 0 warning
