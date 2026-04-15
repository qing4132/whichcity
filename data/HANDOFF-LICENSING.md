# WhichCity 数据合规与城市优化交接文档

> 交接日期：2026-04-15
> 关联文档：[LICENSING.md](LICENSING.md), [SOURCES.md](SOURCES.md), [README.md](README.md)
> 预览报告：`inspiration/_compliance-report-120.html`, `inspiration/_zero-risk-report-120.html`, `inspiration/_plan-b-preview-nyc.html`

---

## 一、本次会话完成的工作

### 1. 城市详情页 UI 改动
- 基本保障评级模块从 Hero 右侧移到独立行（与税后年薪格式一致）
- 评级警告注释移到展开外层
- 展开/收起文字统一为"展开明细/收起"（4 语言）
- 城市描述替换为短 description（151 城 × 4 语言翻译完成）
- 描述移到分割线上方

### 2. 城市 Slug 修复
- `lib/citySlug.ts` 添加 8 个缺失 slug：京都(159)、维尔纽斯(162)、里加(163)、尼科西亚(164)、圣多明各(165)、基多(166)、阿克拉(167)、亚的斯亚贝巴(168)
- 删除 4 个孤儿 slug：仁川(108)、尔湾(134)、横滨(139)、卡门海滩(142)
- 151 城市全部注册完整，tsc 零错误

### 3. 数据修复
- 美国圣何塞(ID 133) 补入 costModerate=4699, costBudget=3817（从已有 Numbeo HTML 计算）
- 运行 `node data/scripts/export.mjs` 导出到前端

### 4. 城市隐藏机制（120/31）
**已实现并验证**。31 城市标记 `hidden: true`，前端只展示 120 城市。

改动文件：
- `data/cities-source.json` — 31 城市添加 `"hidden": true`
- `data/scripts/export.mjs` — RAW_FIELDS 加入 hidden
- `lib/types.ts` — City 接口加 `hidden?: boolean`
- `lib/dataLoader.ts` — `loadCities()` 过滤 hidden，新增 `loadAllCities()`
- `lib/constants.ts` — 新增 `HIDDEN_CITY_IDS` Set
- `app/[locale]/city/[slug]/page.tsx` — generateStaticParams 只生成可见城市
- `app/sitemap.ts` — 站点地图只包含可见城市
- `components/NavBar.tsx` — 随机城市排除 hidden
- `components/HomeContent.tsx` — 搜索列表排除 hidden

隐藏的 31 城市 ID：`38,54,56,77,79,80,81,83,84,91,92,94,95,96,97,99,100,105,107,109,110,114,115,116,118,119,120,127,128,131,135`

详见 `data/README.md` 第 2 节 "城市隐藏机制"。

### 5. 圣何塞数据问题
- **ID 133 美国圣何塞**：已修复（costModerate/costBudget 已补齐）
- **ID 70 哥斯达黎加圣何塞**：Numbeo 抓取 URL 映射错误（`San-Jose` 匹配到加州而非哥斯达黎加），`verify-numbeo-data.mjs` 的 `NUMBEO_NAME_OVERRIDES[70]` 已修正为 `["San-Jose-Costa-Rica"]`。数据仍为历史手工值，未经 Numbeo 刷新
- 详见 `data/SOURCES.md` "已知数据问题" 部分

### 6. Numbeo 采集脚本
创建了两个新脚本（未成功运行，Numbeo 封锁所有节点）：
- `scripts/fetch-san-jose-pair.mjs` — 圣何塞双城定向采集
- `scripts/fetch-missing-costs.mjs` — 10 城市缺失数据采集（含 Clash 节点切换 + IP 去重）

---

## 二、数据许可审计

### 完整审计文档
→ **`data/LICENSING.md`**（23 个数据源的详细许可评估，含 TOS 原文引用）

### 风险汇总

| 风险 | 数据源 | 影响字段 |
|------|--------|---------|
| 🔴 CRITICAL | **Numbeo** | costModerate, costBudget, monthlyRent, housePrice, numbeoSafetyIndex |
| 🔴 CRITICAL | **Ookla** | internetSpeedMbps |
| 🔴 CRITICAL | **UNODC** | homicideRate |
| 🔴 CRITICAL | **IEP GPI** | gpiScore |
| 🔴 CRITICAL | **Global Property Guide** | housePrice (部分) |
| 🟠 HIGH | **Gallup** | gallupLawOrder |
| 🟠 HIGH | **EIU** | democracyIndex |
| 🟠 HIGH | **SalaryExpert** | professions (部分) |
| 🟡 MEDIUM | RSF, Freedom House, MIPEX, WJP, OECD | pressFreedomScore, internetFreedomScore, mipexScore, wjpRuleLaw |
| 🟢 LOW | World Bank, BLS, Eurostat, BigMac, EPA, NOAA, ILO, TI CPI, Georgetown WPS | 15+ 字段 |

### 关键发现
- Numbeo TOS 明确禁止抓取和商用
- UNODC 明确禁止再分发和衍生作品
- IEP GPI 是 CC BY-**NC**-SA，商业许可 $2,000/3年
- TI CPI 数据集是 CC BY 4.0（允许商用），与网站 TOS 的 NC 条款存在冲突，以 CC BY 4.0 为准
- homicideRate 可通过 World Bank API (CC BY 4.0) 获取同源数据

---

## 三、合规方案

### 方案 A：项目定义为非商业
最简单。不挂广告、不收费，Numbeo Personal use 免费，IEP CC BY-NC-SA 允许非商业。

### 方案 B：保留基期 + 免费替代（功能保留 ~88%）
- 保留已采集的 Numbeo 数据作为基期快照
- 后续用 World Bank CPI 逐年调整
- 替换 gpiScore → WB Political Stability, gallupLawOrder → WB WGI Rule of Law, internetSpeedMbps → M-Lab NDT (CC0), democracyIndex → V-Dem (CC BY-SA 4.0), homicideRate → WB API
- 预览：`inspiration/_compliance-report-120.html`
- 法律风险：中等（基期数据来源仍为 Numbeo）

### 方案 C：零法律风险（功能保留 ~72%）
- 完全不使用任何受限数据（包括已采集的 Numbeo 基期）
- 发达国家 69 城用政府统计局开放数据重建（BLS/Census/Eurostat/ONS 等）
- 发展中国家 51 城用 World Bank PPP 估算（精度 ±25-35%）
- 安全指数重设计为 4 子指标（全部 WB CC BY 4.0）
- 预览：`inspiration/_zero-risk-report-120.html`
- 实施工作量：18-28 天

### 方案 D：外链聚合器
不嵌入数据，在页面放 Numbeo 外链。产品降级为"税务计算器 + 外链"。

### 方案 E：与 Numbeo 谈 attribution 合作
零成本尝试，不保证成功。联系：https://www.numbeo.com/common/api_more_info.jsp

### 方案 F：先运营后合规
以个人项目名义运营，有收入后购买许可。有法律风险。

---

## 四、可立即执行的零成本替代

| 当前字段 | 替代 | 许可 | 操作 |
|---------|------|------|------|
| homicideRate | World Bank API `VC.IHR.PSRC.P5` | CC BY 4.0 | 写脚本从 WB API 拉取 |
| gpiScore | World Bank `PV.EST` (Political Stability) | CC BY 4.0 | 同上 |
| gallupLawOrder | World Bank `RL.EST` (Rule of Law) | CC BY 4.0 | 同上 |
| internetSpeedMbps | M-Lab NDT (BigQuery 城市聚合) | CC0 | BigQuery SQL 查询 |
| democracyIndex | V-Dem `v2x_libdem` | CC BY-SA 4.0 | 下载 CSV |

这 5 项可直接替换，不影响任何现有功能，只是数据源换了。

---

## 五、120 城市数据质量现状

### costModerate 缺失（9 城市）
| 城市 | 原因 |
|------|------|
| 福冈(138), 京都(159) | Numbeo 页面存在但无月成本摘要（贡献者不足） |
| 维尔纽斯(162), 里加(163), 尼科西亚(164), 圣多明各(165), 基多(166), 阿克拉(167), 亚的斯亚贝巴(168) | 采集脚本 `verify-numbeo-data.mjs` 的 SLUG_TO_ID 未包含这 7 城市 |

### 京都额外缺失
- housePrice: Numbeo 页面显示 `?`（数据不足）
- directFlightCities: 未采集
- numbeoSafetyIndex: Numbeo 犯罪排名页未包含京都

### 制度性缺失
- mipexScore: 30 城市缺失 (25%) — MIPEX 仅覆盖部分国家
- internetFreedomScore: 36 城市缺失 (30%) — Freedom House 覆盖有限
- 台北(61): homicideRate 等 5 项缺失 — 台湾被国际组织排除

### 哥斯达黎加圣何塞(ID 70)
costModerate/costBudget/monthlyRent/housePrice 为历史手工数据，未经 Numbeo 刷新。已在 SOURCES.md 标注。

---

## 六、文件索引

| 文件 | 内容 |
|------|------|
| `data/LICENSING.md` | 23 个数据源完整许可审计 |
| `data/SOURCES.md` | 数据源说明 + 已知问题 |
| `data/README.md` | 数据架构 + 城市隐藏机制文档 |
| `lib/constants.ts` | `HIDDEN_CITY_IDS` 定义 |
| `lib/dataLoader.ts` | `loadCities()` / `loadAllCities()` |
| `lib/citySlug.ts` | 151 城市 slug 映射（已修复） |
| `lib/cityIntros.ts` | 151 城市短 description（4 语言） |
| `scripts/verify-numbeo-data.mjs` | Numbeo 全量采集脚本（ID 70 URL 已修正） |
| `scripts/apply-numbeo-update.mjs` | Numbeo 数据应用脚本（ID 70 在 SKIP_IDS 中） |
| `scripts/fetch-san-jose-pair.mjs` | 圣何塞双城定向采集 |
| `scripts/fetch-missing-costs.mjs` | 10 城市缺失数据采集 |
| `inspiration/_plan-b-preview-nyc.html` | 方案 B 纽约预览 |
| `inspiration/_compliance-report-120.html` | 方案 B 全面评估报告 |
| `inspiration/_zero-risk-report-120.html` | 零风险方案全面评估报告 |

---

## 七、待办事项

1. **决定合规方案**（A/B/C/E/F 择一）
2. **执行零成本替代**（homicideRate/gpiScore/gallupLawOrder/internetSpeedMbps/democracyIndex — 见第四节）
3. **补齐 9 城市 costModerate**（等 Numbeo 解封或用替代方案）
4. **发邮件给 Freedom House / RSF / MIPEX / WJP 确认商用许可**
5. **将 verify-numbeo-data.mjs 的 SLUG_TO_ID 补充 ID 162-168**
6. **考虑耶路撒冷是否加入**（数据大部分与特拉维夫共享国家级，城市级需单独采集）
7. **顶栏 NavBar 重设计**（讨论了方案但未执行）
