# WhichCity Phase 2 — 执行备忘

> **创建**: 2026-04-11
> **权威来源**: `_archive/reports/phase2-strategy.md` + `REDESIGN.md`
> **用法**: 老板说"完成 A1 和 B3"，执行者即可推进。每项完成后打 ✅ 并注明日期。

---

## 状态图例

- `[ ]` 未开始
- `[~]` 进行中
- `[x]` 已完成
- `[—]` 跳过（附理由）

---

## A. 功能裁剪（删/改）

> 原则：先做减法，再做加法。减掉噪音才能让信号露出来。

### A1. 删除 Multi 复合排序模式
- [ ] A1.1 删除 `RankingContent.tsx` 中 `composite` 状态及 `toggleComposite` 逻辑（~L247-295、L278-295）
- [ ] A1.2 删除 `customTabs` Set 及相关 `compositeScores` 计算（~L247-275）
- [ ] A1.3 删除 Multi 按钮 UI 及其 i18n key（`rankMulti` 相关）
- [ ] A1.4 从 `lib/i18n.ts` 移除 Multi 相关的翻译键
- [ ] A1.5 运行 `npx tsc --noEmit && npm test` 验证

### A2. 删除 LINE 和 Reddit 分享按钮
- [ ] A2.1 从 `NavBar.tsx` 删除 `shareToLINE()`（~L116）和 `shareToReddit()`（~L109）函数
- [ ] A2.2 删除对应的 UI 按钮（~L202-250 区域中 LINE/Reddit 部分）
- [ ] A2.3 从 `lib/i18n.ts` 移除相关翻译键（如有）
- [ ] A2.4 验证：所有页面的分享面板仍显示 X/Facebook/WhatsApp/LinkedIn/Telegram/Copy

### A3. 删除 2 个职业 + 重命名 1 个（26→23）
- [ ] A3.1 **数据层**：从 `public/data/cities.json` 每座城市的 `professions` 对象中移除 `domestic_worker` 和 `photographer` 键（写脚本批量执行）
- [ ] A3.2 **翻译层**：从 `lib/i18n.ts` 的职业列表（~L1691-1719）移除 `domestic_worker`、`photographer`，将 `civil_servant` 的 zh 改为"政府/NGO行政"、en 改为"Government/NGO Admin"、ja/es 做相应翻译
- [ ] A3.3 **默认值检查**：确认 `useSettings.ts` 默认职业"软件工程师"无影响
- [ ] A3.4 运行 `node scripts/validate-data.mjs`（需先更新脚本中的 profession count 期望值 26→23）
- [ ] A3.5 运行 `npx tsc --noEmit && npm test` 验证

### A4. 隐藏 6 座游牧城市（154→148 展示）
- [ ] A4.1 在 `lib/constants.ts` 新增 `HIDDEN_CITIES` 数组：帕岸岛、苏梅岛、暹粒、班斯科、库斯科、马拉喀什（用城市 ID 或 slug）
- [ ] A4.2 在 `lib/dataLoader.ts` 的城市列表加载中过滤 `HIDDEN_CITIES`
- [ ] A4.3 保留：这些城市的 JSON 数据不删、URL slug 不删（直接访问仍可达）
- [ ] A4.4 排行榜和首页搜索结果中不再显示这 6 座城市
- [ ] A4.5 `sitemap.ts` 中排除这些城市的 URL（可选，SEO 决策）
- [ ] A4.6 验证：直接访问 `/en/city/koh-phangan` 仍能打开（不 404）

---

## B. 城市详情页重构（最大改动）

> 当前 `CityDetailContent.tsx` 884 行，需按新信息架构拆分重写。
> 核心变化：建立 L1→L4 数据层级，让用户 3 秒看到安全/消费/收入。

### B1. Hero 区重构
- [ ] B1.1 安全指数提至 Hero 区最醒目位置（当前在 Row4 IndexCard，需提至 Hero）
- [ ] B1.2 英语水平从游牧板块（~L722）移至 Hero 区（当前藏在 Nomad Section 底部）
- [ ] B1.3 Hero 区信息：城市名 + 国旗 + 时区 + 当地时间 + 英语水平 + 安全分数 + 一句简介
- [ ] B1.4 确保 SSR 友好（安全/英语是静态数据，无需 mounted 门控）

### B2. L1 核心数据条（首屏 5 格一行）
- [ ] B2.1 设计核心数据条组件：税后年收入 | 月消费 | 月租 | 年储蓄 | 医疗指数
- [ ] B2.2 月消费排在年收入前面（440 > 370 票）
- [ ] B2.3 每格显示数值 + 排名（如 `#4/148`）
- [ ] B2.4 响应式：≥1080px 一行 5 格，768px 一行 3 格，<640px 一行 2 格

### B3. L2 重要数据区
- [ ] B3.1 紧凑一行展示：气候概要 + AQI + 网速 + 自由指数 + 工时 + 假期 + 直飞
- [ ] B3.2 VPN 限制从游牧板块移至此区域（110 票跨界关注）
- [ ] B3.3 视觉权重低于 L1（中等字号、低对比度）

### B4. 财务详情区
- [ ] B4.1 有效税率、房价/m²、购房年限、储蓄率等紧凑展示
- [ ] B4.2 购房年限降级为房价卡内小字（从 Row1 平级降下来）
- [ ] B4.3 时薪降级为工时卡内小字（从 Row2 平级降下来）

### B5. 综合指数折叠（L4）
- [ ] B5.1 安全/医疗/自由/生活压力的子指标（共 15 个）默认折叠
- [ ] B5.2 每个指数一行：显示总分 + 置信度 + ▸ 展开按钮
- [ ] B5.3 点击展开后显示各子指标权重和分值
- [ ] B5.4 生活压力指数从首屏大卡降级为折叠区域

### B6. 游牧板块折叠
- [ ] B6.1 整个 Nomad Section（当前 ~L683-939，~250 行）改为默认折叠
- [ ] B6.2 折叠标题显示：签证名称 + 时长（一行摘要）
- [ ] B6.3 展开后显示完整信息：签证详情、免签矩阵、时区重叠等
- [ ] B6.4 英语水平已在 B1.2 移至 Hero，此处不再重复

### B7. 气候图移至底部
- [ ] B7.1 `ClimateChart` 组件从当前位置移至页面底部（相似城市下方）
- [ ] B7.2 气候概要数据（类型/均温/降雨/日照）保留在 L2 区域紧凑展示

### B8. 组件拆分
- [ ] B8.1 从 `CityDetailContent.tsx` 拆出 `HeroSection.tsx`（B1）
- [ ] B8.2 拆出 `CoreMetrics.tsx`（B2 核心数据条）
- [ ] B8.3 拆出 `FinancialDetail.tsx`（B4 财务详情）
- [ ] B8.4 拆出 `IndexCards.tsx`（B5 综合指数折叠）
- [ ] B8.5 拆出 `NomadSection.tsx`（B6 游牧板块）
- [ ] B8.6 主文件 `CityDetailContent.tsx` 降至 <300 行（组装器）
- [ ] B8.7 每个子组件 <200 行

---

## C. 税制引擎可视化（杀手功能）

> 81 国税制 + 外派方案是全产品最被低估的资产。当前只在 NavBar 里一个 toggle。

### C1. 城市详情页「税务计算器」区域
- [ ] C1.1 创建 `TaxCalculator.tsx` 组件
- [ ] C1.2 展示当前职业 + 城市的完整税务分解：税前 → 各级税率 → 社保 → 扣除 → 税后
- [ ] C1.3 如有外派方案（expatNet），显示对比：标准 vs 外派税率
- [ ] C1.4 读取 `lib/taxData.ts` 的 `COUNTRY_TAX` 和 `lib/taxUtils.ts` 的计算逻辑，渲染为可视化条形/表格
- [ ] C1.5 支持用户在页面内直接切换职业/薪资倍率查看税务变化
- [ ] C1.6 默认折叠，标题显示「有效税率 XX% · 点击查看完整税务分解」

### C2. 排行榜新增「税后收入」Tab
- [ ] C2.1 在 `RankingContent.tsx` 的 Tab 类型中新增 `afterTaxIncome`
- [ ] C2.2 按当前选择的职业+薪资倍率计算每城市税后年收入，排序展示
- [ ] C2.3 添加 i18n 翻译键（4 种语言）
- [ ] C2.4 此 Tab 放在「收入」附近位置

### C3. 排行榜 Tab 合并
- [ ] C3.1 时薪（`hourlyWage`）合并入工时（`workhours`）Tab——工时表格新增时薪列
- [ ] C3.2 购房年限（`housing`）合并入房价（`housePrice`）Tab——房价表格新增购房年限列
- [ ] C3.3 生活压力（`lifePressure`）Tab 移至最后位置
- [ ] C3.4 删除合并后多余的独立 Tab 入口
- [ ] C3.5 更新 Tab 类型定义和 `TAB_I18N`

---

## D. 数据扩展

> 新增 3 个高价值数据维度 + 2 座新城市。

### D1. 新增数据字段
- [ ] D1.1 **公共交通评分**：研究 Numbeo Traffic Index 数据，为 148 城市补充 `transitScore`（0-100）
- [ ] D1.2 **自然灾害风险**：采用 World Risk Index 国家级数据，新增 `disasterRiskIndex` 字段
- [ ] D1.3 **外国出生人口%**：联合国/世行数据，新增 `foreignBornPct` 字段
- [ ] D1.4 更新 `lib/types.ts` City 接口添加新字段
- [ ] D1.5 更新 `scripts/validate-data.mjs` 校验新字段范围
- [ ] D1.6 城市详情页展示新数据（D1.1 放 L2 环境区，D1.2 放 L1/L2 安全附近，D1.3 放 L3）

### D2. 新增城市
- [ ] D2.1 **阿克拉（加纳）**：研究数据 → 填充 cities.json 全部 ~50 字段 + professions 23 职业年薪 USD
- [ ] D2.2 **利雅得（沙特）**：同上
- [ ] D2.3 每座新城市必须同步更新 7 个文件（DATA_OPS.md 清单）：
  - cities.json / constants.ts / citySlug.ts / cityIntros.ts / cityLanguages.ts / i18n.ts / taxData.ts（如需新增国家税制）
- [ ] D2.4 安全指数按 35/30/20/15 权重计算，置信度标签匹配
- [ ] D2.5 运行 `node scripts/validate-data.mjs` 验证

---

## E. SEO 与增长

### E1. Meta 优化
- [ ] E1.1 城市详情页 `meta description` 包含具体数据数字（如"Software engineer after-tax income: $105K, monthly cost: $4,500, safety: 68/100"）
- [ ] E1.2 对比页 `<title>` 包含 "vs" 关键词（如"New York vs London — Cost, Salary, Safety Comparison"）
- [ ] E1.3 排行页 `<title>` 包含维度关键词（如"Safest Cities in the World 2026 Ranking"）
- [ ] E1.4 审核所有 OG image 内容，确保包含核心数据数字而非通用设计

### E2. GA4 事件埋点
- [ ] E2.1 审计当前 `lib/analytics.ts` 的 `trackEvent` 使用情况，列出已埋点事件
- [ ] E2.2 新增关键事件埋点：
  - 职业选择变更
  - 排行榜 Tab 切换
  - 城市详情页各折叠区展开/收起
  - 对比页城市添加/移除
  - 分享按钮点击（按平台）
  - 税务计算器展开
- [ ] E2.3 GA4 Dashboard 配置关键转化事件

### E3. 错误监控
- [ ] E3.1 接入 Sentry free tier（Next.js SDK）
- [ ] E3.2 配置 source map 上传
- [ ] E3.3 设置关键页面错误告警

---

## F. 排行榜优化

### F1. Tab 重排序
- [ ] F1.1 新排序：安全 → 消费 → 租金 → 收入 → 税后收入 → 储蓄 → 医疗 → 自由 → 工时 → 假期 → 空气 → 网速 → 直飞 → 气候 → 房价 → 生活压力
- [ ] F1.2 更新 `GROUPS` 数组和 Tab 渲染顺序
- [ ] F1.3 安全作为默认 Tab（当前默认是 income）

### F2. RankingContent 拆分
- [ ] F2.1 当前 1087 行，删除 Multi 后预计 ~900 行
- [ ] F2.2 拆出 `RankingTable.tsx`（通用排行表格）
- [ ] F2.3 拆出 `RankingFilters.tsx`（气候筛选器等）
- [ ] F2.4 主文件降至 <300 行

---

## G. 对比页/首页/NavBar 优化

### G1. NavBar 设置精简
- [ ] G1.1 考虑将职业/薪资倍率/消费模式/收入模式从 NavBar 设置面板移至首页或详情页（场景化嵌入）
- [ ] G1.2 NavBar 设置仅保留：语言、货币、主题（低频设置）
- [ ] G1.3 如实施 G1.1，需要在城市详情页/排行页顶部添加紧凑的身份选择条

### G2. 首页信息密度提升
- [ ] G2.1 添加身份选择区（职业+收入水平+预算偏好）
- [ ] G2.2 添加个性化 Top 5 推荐（基于当前身份计算储蓄率最高 5 城）
- [ ] G2.3 技术约束：Top 5 依赖 localStorage，需客户端计算，注意 SSR/hydration
- [ ] G2.4 保留搜索框，降低视觉中心地位

### G3. 对比页优化
- [ ] G3.1 默认展示精简为核心指标（财务+住房+4 指数+气候）
- [ ] G3.2 工作/环境/Nomad 数据放入可展开区域
- [ ] G3.3 Win-count 可考虑按组统计（"财务面 A 胜、生活面 B 胜"）

---

## H. i18n 与翻译

> 所有 UI 变更需同步 4 种语言翻译。

### H1. 新增翻译键
- [ ] H1.1 税务计算器相关翻译（~20 键）
- [ ] H1.2 折叠/展开按钮文案
- [ ] H1.3 新 Tab「税后收入」翻译
- [ ] H1.4 新数据字段（公共交通/灾害风险/外国人口）翻译
- [ ] H1.5 职业重命名「政府/NGO行政」4 种语言
- [ ] H1.6 新城市名翻译（阿克拉、利雅得）

### H2. 清理过时翻译
- [ ] H2.1 删除 Multi 排序相关翻译键
- [ ] H2.2 删除 LINE/Reddit 分享相关翻译键（如有）
- [ ] H2.3 删除已移除职业的翻译键

---

## 执行排期建议

| 阶段 | 包含任务 | 预期重点 |
|------|---------|---------|
| **Phase 2A** | A1-A4, B1-B8, H2 | 裁剪 + 详情页重构（最大工程量） |
| **Phase 2B** | C1-C3, F1-F2, H1 | 税制引擎可视化 + 排行优化 |
| **Phase 2C** | D1-D2, E1-E3 | 数据扩展 + SEO + 监控 |
| **Phase 2D** | G1-G3 | 首页/NavBar/对比页优化 |

> Phase 2A 是基础，必须先完成。2B/2C 可并行。2D 视情况排期。

---

## 不做清单（Phase 2 明确排除）

- 用户账号/登录系统
- 用户评论/UGC/社区功能
- 移动 App
- 新增语言（>4）
- AI 推荐引擎
- 城市数 >160 / 职业数 >25
- 付费功能
- i18n 改 JSON 资源文件（三阶段）

---

*老板指令格式示例：*
- *"完成 A1 和 A2"* → 执行者删除 Multi 排序 + 删除 LINE/Reddit 分享
- *"完成 B1 到 B4"* → 执行者重构详情页首屏
- *"完成 C1"* → 执行者创建税务计算器组件
- *"D2 跳过利雅得，只做阿克拉"* → 执行者标记 D2.2 为 `[—]`
