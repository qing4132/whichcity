# WhichCity

**[whichcity.run](https://whichcity.run)** — 全球移居决策引擎 / Global Relocation Decision Engine

用数据回答一个问题：**去哪座城市能过上更好的生活？**

## 核心能力

- **150 座城市** × 25 职业 × 81 国税制引擎（含外派方案）
- **税后真实收入**：不是税前数字，是你实际到手的钱
- **多维决策**：安全、医疗、自由、气候、空气质量、工时、签证
- **10 种货币**（每日自动更新）× 4 种语言（中/英/日/西）
- **3 城对比** + 22 项排行榜 + 气候筛选 + 深色模式

## 快速开始

```bash
git clone https://github.com/qing4132/whichcity.git
cd whichcity
npm install && npm run dev   # http://localhost:3000
```

```bash
npx tsc --noEmit   # 类型检查
npm test           # 单元测试
npm run build      # 生产构建
```

## 项目结构

```
app/[locale]/       Pages (city detail, ranking, compare, methodology)
components/         Page components (Home, Ranking, Compare, CityDetail, NavBar, ...)
hooks/              useSettings — global settings
lib/                Data loading, i18n, tax engine, types, constants
public/data/        cities.json, exchange-rates.json, nomad data
scripts/            Active maintenance (exchange rates, validation, climate, timezone)
__tests__/          Unit tests (tax engine, composite index)
_archive/           Historical scripts, data sources, reports (reference only)
```

## 关键文档

| 文档 | 内容 |
|------|------|
| [REDESIGN.md](REDESIGN.md) | Phase 2 产品方向与约束 |
| [HANDOFF.md](HANDOFF.md) | 技术架构与交接 |
| [DATA_OPS.md](DATA_OPS.md) | 数据更新操作指南 |
| [RULES.md](RULES.md) | 编码规范 |

## License

MIT
