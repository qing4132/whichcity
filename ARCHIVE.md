# WhichCity — 封存档（ARCHIVE）

> 生成日期：2026-04-17
> 封存提交：详见 git tag `archived-2026-04`
> 最后技术负责人：@qing4132

本文件是 **whichcity 项目的完整句号**。如果你是：
- 原作者若干年后回来 —— 看第 §1、§6、§7 节能快速想起状态
- 潜在接盘者 —— 看完整篇，特别是 §3 §4 §5
- AI 助手（未来某次会话被拉进来） —— 看第 §8 节直接开始

---

## §1 · 项目一句话

**whichcity** = 一个试图回答"去哪座城市能过上更好生活"的网站。
域名 `whichcity.run`（已下线）。
定位："全球移居决策引擎 / Global Relocation Decision Engine"。

---

## §2 · 时间线与关键阶段

完整 git 历史 356 次提交，跨度约一年。概括为三个阶段：

### Phase 0 · 起源（2025 年上半年）

- 初始 commit：`a724262` "City comparison tool with job salary data"
- 当时目标很朴素：比较几座城市的税后薪水和生活成本
- 技术栈定型：Next.js 15 + App Router + TypeScript + Tailwind + Recharts

### Phase 1 · 野心扩张（2025 下半年 – 2026 初）

- 加入"购买力对比"（Big Mac Index 风格）
- 首次全面重构组件（commit `fc9011d` "redesign: complete UI rewrite + new 5-index system"）
- 多语言（中/英/日/西）、多货币（10 种，每日汇率）
- 81 国 × 25 职业税引擎（覆盖华人主流目标国外派税制）
- 5 大维度指数：安全 / 医疗 / 政府 / 人权 / 经济（各含 4 个子指标 min-max 归一）
- 数字游民数据：签证 / VPN / 英语水平 / 时区 / 免签矩阵
- 最终在 `2a19d87` "Phase 2 final: 100 cities x 20 professions + provenance archive" 冻结为"v1 生产版"

### Phase 2 · 数据出清失败（2026-03 到 2026-04，本次封存）

这是决定封存的直接原因。详情见 §3、§4。

简要：
- 发现早期数据大量使用 Numbeo 等 TOS 禁止抓取/非商用的源
- 为合规从 0 重建数据管线（在隔离目录 `data/clean-pipeline/`）
- 总共迭代 v1→v9，使用 14 个独立一手源（World Bank PLI、Eurostat PLI、BEA RPP、Zillow ZORI、ONS、StatCan CMHC、H1B LCA、InsideAirbnb、Freedom House、V-Dem、RSF、UBS Prices & Earnings、GPI、OpenStreetMap）
- **最终结论：即便用最诚实的方式重建，也只有 20-28 城能达到"敢直接展示"的精度。151 城撑不起。**

---

## §3 · 为什么封存 —— 核心数据问题（最重要一节）

### 3.1 结构性 bug（v9 审计中发现，无法简单修复）

| Bug | 受影响 | 根因 | 可修？ |
|---|---|---|---|
| B1：`city_premium × Eurostat PLI` 乘法爆炸 | 苏黎世/日内瓦 cost 被算成 $7-8k/月，真实 $2-3k | 两个乘数都包含"贵城市"信号，相乘 = 双重计数 | 可修，但修完 cost 就不准了（需整条公式重设） |
| B2：Airbnb × 13.6 系数在欧洲长租推高 rent 30-50% | 柏林/维也纳/雅典/阿姆斯特丹等 15 城 | Airbnb 是短租价，系数是从美国市场校准的，不适用欧洲 | **必须换源**（Rightmove / idealista / ImmoScout / Pararius） |
| B3：`cost × 0.38` 在热门亚太低估 rent 2-3 倍 | 新加坡/香港/悉尼/墨尔本/迪拜/孟买 | 租房份额在这些城市是 50-65%，不是 38% | **必须换源**（URA / RVD / PropTrack / Bayut） |
| B4：中国 PLI 高估 cost（补贴型服务无法传导） | 北京/上海/深圳/广州/成都/杭州/重庆 | 世行 PLI 用的篮子在中国被大量政府/补贴品类拉平 | 只能用 NBS CPI 替代 |
| B5：CMHC 只统计 purpose-built 不含 condo | 多伦多/温哥华低估 rent 25-30% | 加拿大租房市场 condo 占比极高，CMHC 结构性缺 | 需补 TRREB/REBGV MLS |
| B6：ONS 是全房型均值，用户需求是 1BR | 伦敦 rent 偏高 30% | 口径不匹配 | 需要 ONS 更细颗粒度 |

结果：151 城按源头质量重评级后分布是：

```
S′ = 18 城（美国 BEA+Zillow，真正能看）
A′ =  9 城
B′ = 32 城
C′ = 53 城（数据偏差 40-70%）
D′ = 32 城（公式反向 / 无数据）
```

### 3.2 "100 个世界上最重要的移居目的地" 交叉检查

独立从 0 构想 100 个移居热门目的地（不看本项目），和 v9 交叉后：
- v9 里有 86 城（占 86%）但其中 42 城是 C′/D′ —— **每 2 个重量级城市有 1 个在产品里是"错到不如不展示"**
- v9 缺 14 个重要城市（达拉斯/夏洛特/曼彻斯特/爱丁堡/法兰克福/汉堡/巴塞尔/尼斯/马拉加/佛罗伦萨/雷克雅未克 等）

### 3.3 诚实结论

继续做下去，最多能到的上限：
```
当前 v9 能 ship 的干净城市         28 个
修两个公式 bug + 补 14 城        42 个
再额外抓 3 个国家级新源           60-70 个
```

但 **60-70 个城市 × 还要做签证/软着陆** 是一个 5 人团队半年的工作量，对单人作业不现实。继续堆数据 = 继续在脏数据上加层，不如重新想产品定位。

👉 详细常识复查表见 [data/clean-pipeline/REPORT-100CITIES.md](data/clean-pipeline/REPORT-100CITIES.md)
👉 五种上线方案评估见 [data/clean-pipeline/REPORT-REPLACEMENT.md](data/clean-pipeline/REPORT-REPLACEMENT.md)

---

## §4 · 学到的教训（给未来自己 / 接盘者）

1. **"全球覆盖"是小团队的陷阱**。每加一个国家就增加一条必须维护的数据链。数据源质量必然从 S→D 梯度，但 UI 没法标出差异，用户默认所有数字同等可信。**敢于只做 30 城 > 糊弄 151 城**。

2. **推断公式（Airbnb×K、cost×rentShare、city_premium）会伪装成"数据"混进产品**。一旦写进 cities.json 就没有人记得它是估算。**应该强制每个字段带 source 元数据，没源就是 null。**

3. **把"数据源"和"产品数据"混在同一堆脚本里 = 屎山**。whichcity 14 个抓数脚本散落在 `scripts/` 和 `data/clean-pipeline/scripts/` 两处，没有集中仲裁层。新项目应该：
   - 每个源独立目录（`sources/<name>/fetch.mjs + parse.mjs`）
   - 集中 `build.mjs` 做源优先级合并
   - 禁止任何脚本直接写 `public/data/*.json`

4. **AI 做数据源就是 Numbeo 的二次洗钱**。LLM 的训练语料里本来就有 Numbeo / Nomadlist / Expatistan 的爬数，让 AI 估 rent = 把脏数据洗成"常识"再写进自己的数据库。**禁止用 AI 填数。**

5. **产品定位错了再多努力也白搭**。whichcity 花 80% 精力优化"生活成本+税后薪水"，但这些对真正想润的人来说是第 5 重要的指标。排名第 1 的是"签证/身份路径"，这个 whichcity 完全没做。

6. **"漂亮的多语言多货币 UI" 会让产品看起来比实际数据质量更高**，从而让团队低估数据问题的严重性。**先把数据对了，再做 UI。反过来做会骑虎难下。**

---

## §5 · 遗产清单（可以拿走的部分）

这些是封存时点上**确实做对的事情**，未来如果重启/新项目可以复用：

| 资产 | 位置 | 价值 |
|---|---|---|
| 81 国税制引擎 | `lib/taxData.ts` + `lib/taxUtils.ts` | 有单元测试（`__tests__/taxUtils.test.ts`），是整个项目最扎实的一块 |
| H1B LCA 2024 数据 | `data/clean-pipeline/output/h1b-salary-anchors.json` | 美国 20 MSA × 20 SOC 职业的 p25/p50/p75 薪水中位数，可直接用 |
| v9 最终数据集 | `data/clean-pipeline/output/clean-values-v9.json` | 151 城 × 每字段带源标记，后续任何项目都应从这里开始而不是 `public/data/cities.json` |
| 14 个数据源的 fetch/parse 脚本 | `data/clean-pipeline/scripts/` | 世行 PLI / Eurostat / BEA / Zillow / H1B LCA / InsideAirbnb / Freedom House / V-Dem / RSF 等抓取逻辑（注意：sources/ 里的原始下载未入 git） |
| 9 份审计报告 | `data/clean-pipeline/REPORT-*.md` | 数据重建全过程的思考链，比代码本身更有价值 |
| 编码规范与架构思维 | `RULES.md` | 文件 <300 行 / 函数 <50 行 / 简洁 > 灵活 > 性能 —— 这条原则经受住了验证 |

---

## §6 · 最后的代码状态

- **git HEAD**（封存提交之前）：`2a19d87` "Phase 2 final: 100 cities x 20 professions + provenance archive"
- **当前分支**：`phase2`（最后封存 commit 位于此分支）
- **GitHub Actions**：
  - `.github/workflows/ci.yml` → **已重命名为 `ci.yml.archived`**（禁用）
  - `.github/workflows/update-exchange-rates.yml` → **已重命名为 `update-exchange-rates.yml.archived`**（停止每日 cron 自动提交）
- **Vercel**：生产域名绑定已手动解除（见 §7）
- **数据状态**：`public/data/cities.json` 维持在 2a19d87 的状态，**已知含本档 §3 列出的所有 bug**

---

## §7 · Vercel / 域名下线 checklist

以下步骤需要 **登录 Vercel Dashboard** 手动完成（CLI 需要 token，此处不便自动化）。按顺序执行：

### ① 解除生产域名绑定
1. 打开 https://vercel.com/dashboard → 选择 whichcity 项目
2. Settings → Domains
3. 删除 `whichcity.run` 和 `www.whichcity.run`（点击每个域名旁的 `...` → Remove）

### ② 可选：停止部署（分两级）
- **软停**（推荐，可恢复）：Settings → General → Git → `Ignored Build Step`，设为 `exit 0`，或在 Git Integration 里关闭 Auto-Deploy
- **硬停**（彻底下架）：Settings → General → 最下面 `Delete Project`

### ③ 域名注册商那边
1. 登录域名注册商（看 `whichcity.run` 在哪家注册的）
2. 可选操作：
   - 设置**到期不续费**（省钱，推荐）
   - 或者**保留域名**但把 DNS A/CNAME 从 Vercel 清掉（如果以后可能重启）

### ④ 搜索引擎 / SEO 清理（可选）
- Google Search Console / Bing Webmaster：提交 `whichcity.run` 下线请求（移除索引）
- 本项目 `app/robots.ts` 和 `app/sitemap.ts` 已随封存冻结，不再更新

### ⑤ 第三方集成清查
- 检查 `.env` 或 Vercel 环境变量里是否有 `EXCHANGE_RATE_API_KEY`（本项目唯一的外部服务）
- 建议撤销该 API Key（exchangerate-api.com 后台）

---

## §8 · 给未来 AI 或接盘者的启动段

如果你是几个月后被拉进这个仓库的 AI / 开发者，看到这里 **请先停一停**：

1. **这个仓库已经封存**。继续在它上面堆功能几乎肯定是在屎山上加层。
2. 如果原作者或你自己想"重新做一次移居决策工具"，**不要 fork 这个仓库**。
3. 真正的继任思路在 `ARCHIVE` 前的会话中已经结晶为 **`relocate`** 种子包（原位置：仓库根的 `relocate/`，已被作者剪切移走）。如果找不到，重新构建一份的核心原则是：
   - **B 类用户优先**（中文世界想润的中产），不是"英文通用"
   - **签证决策 > 生活成本**（whichcity 搞反了）
   - **30 城精准 > 151 城糊弄**
   - **每个字段必须有可追溯 source**，AI 估的值 = 数据洗钱
   - **独立源目录 + 集中仲裁层**，不再允许单个脚本直接写公开 JSON

4. 如果只是想修复某个具体 bug（不重启全局）：
   - `data/clean-pipeline/output/clean-values-v9.json` 是最诚实的 151 城数据
   - v9 的 S/A 档 = 42 城是唯一"敢展示"的子集
   - 任何扩展前，先读 `data/clean-pipeline/REPORT-CLOSURE.md` §1 搞清楚公式约束

5. 如果要**完全删除项目**：
   - 先 `git push --tags`（保留封存 tag）
   - GitHub 仓库设置 → Archive（只读封存），或 Settings → Danger Zone → Delete
   - 本档 §7 的 Vercel / 域名步骤执行

---

## §9 · 致谢与告别

整个项目最大的收获不是代码，是学会了：

> **"覆盖 151 个城市但其中 80 个是错的" 比 "只覆盖 30 个城市都是对的" 更糟糕。**
>
> 用户不会谢你"给了这么多",只会记住你"给的那个数字是错的"。

谢谢所有在这个项目路上帮助过思考的对话。

封存不是失败，是**承认数据精度边界**后的理性选择。
把时间留给更值得做的事。

—— 2026-04-17
