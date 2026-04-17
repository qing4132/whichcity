# WhichCity — 已封存 (Archived 2026-04)

> **这个项目已于 2026 年 4 月封存，不再继续开发，线上站点已下线。**
> **This project was archived in April 2026. Development halted. Live site taken down.**

---

## TL;DR

- ✅ 曾是 `whichcity.run` 的源代码 —— 一个"全球移居决策引擎"
- ✅ 功能：151 城 × 25 职业 × 81 国税制引擎 × 多维生活成本 × 4 语言 10 货币
- ❌ **核心数据质量结构性不达标**，无法在良心范围内继续 ship
- 🌱 **继任者**：精神继承项目为 **`relocate`**（已剪切离开本仓库），定位不同 —— 签证决策引擎（visa-first），不再做"全球覆盖生活成本"

完整的来龙去脉、为什么封存、学到了什么、继任项目方向 —— 全部写在 **[ARCHIVE.md](ARCHIVE.md)**。

---

## 如果你只想看/运行最后的代码

```bash
git clone https://github.com/qing4132/whichcity.git
cd whichcity
npm install
npm run dev            # http://localhost:3000（前端能跑，数据按最后封存状态）
```

**注意**：
- GitHub Actions workflows 已重命名为 `.archived`（禁用自动部署和汇率 cron）
- `whichcity.run` 域名绑定已手动从 Vercel 移除（见 ARCHIVE §7）
- `public/data/` 数据是 2a19d87 提交时的状态；**不代表真实水平**，详见 ARCHIVE §3

## 目录速览

```
app/[locale]/          页面（城市详情、排行榜、对比、方法论）
components/            前端组件
hooks/                 useSettings
lib/                   数据加载、i18n、税引擎、类型定义
public/data/           cities.json 等（含已知数据缺陷）
scripts/               活跃维护脚本（现已 frozen）
__tests__/             单元测试
data/clean-pipeline/   数据重建工程 v1→v9 的全部产物与审计报告
_archive/              更早历史（v1 组件、设计稿、脚本）
```

## 关键历史文档

| 文档 | 内容 |
|------|------|
| [ARCHIVE.md](ARCHIVE.md) | **完整封存说明**（项目起源 · 关键阶段 · 封存原因 · 继任方向 · 给后续维护者的话） |
| [data/clean-pipeline/REPORT-CLOSURE.md](data/clean-pipeline/REPORT-CLOSURE.md) | v8 数据重建封口报告（14 独立源、tier 分层） |
| [data/clean-pipeline/REPORT-REPLACEMENT.md](data/clean-pipeline/REPORT-REPLACEMENT.md) | v9 纯源头评级，5 种上线方案评估 |
| [data/clean-pipeline/REPORT-100CITIES.md](data/clean-pipeline/REPORT-100CITIES.md) | 诚实常识复查 + 独立 100 城清单交叉映射 |
| [RULES.md](RULES.md) | 编码规范（v1 时期） |

## License

MIT —— 欢迎 fork 任何部分，但**别把数据原样上线**（详见 ARCHIVE §3）。
