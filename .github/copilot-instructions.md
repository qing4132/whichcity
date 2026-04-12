# WhichCity

全球移居决策引擎（whichcity.run）— Next.js 15 + TypeScript + Tailwind CSS + Recharts

> 产品方向与约束 → [REDESIGN.md](../REDESIGN.md)
> 技术架构 → [HANDOFF.md](../HANDOFF.md)
> 数据操作 → [DATA_OPS.md](../DATA_OPS.md)
> 战略报告 → `_archive/reports/phase2-strategy.md`

## Product Positioning

WhichCity is a **global relocation decision engine**. Users choose a profession; we show them which cities offer a better life — using data, tax calculations, and multi-dimensional comparison.

Core competitive advantage: profession × 81-country tax engine × comprehensive metrics — unique among free tools.

## Architecture

- `app/[locale]/` — Next.js App Router pages (thin SSR wrappers)
- `components/` — Page components + NavBar + ClimateChart
- `hooks/useSettings.ts` — global settings (profession, locale, theme, currency, etc.)
- `lib/` — data loading, i18n, tax engine (81 countries), nomad i18n, types, constants
- `public/data/` — cities.json, exchange-rates.json, nomad-data-compiled.json
- `__tests__/` — unit tests (Vitest): tax engine, composite index
- `scripts/` — 8 active maintenance scripts
- `_archive/` — historical scripts, data sources, reports (reference only)

## Key Data

- 150 cities, 25 professions, 81 country tax systems, 10 currencies, 4 locales
- City type: ~50 fields (income, costs, housing, safety, healthcare, freedom, climate, etc.)
- Composite indices: Life Pressure (client-computed), Safety/Healthcare/Governance (pre-computed, 5-sub each)
- Nomad data: visa info, VPN, English level, timezone overlap, visa-free matrix

## Data Priority (Phase 2)

L1 Core: safety, monthly cost, rent, income (after-tax), healthcare, English level
L2 Important: savings, climate, freedom, language, AQI, work hours, flights
L3 Supplementary: tax rate, house price, vacation, VPN, internet speed
L4 Deep: sub-indicators, nomad visa details, visa-free matrix, timezone overlap

## Dev Commands

```bash
npm install && npm run dev   # http://localhost:3000
npx tsc --noEmit             # type check
npm test                     # unit tests
npm run build                # production build
```

## Rules

- See RULES.md for coding conventions
- Simplicity > flexibility > performance; files < 300 lines; functions < 50 lines
- Do NOT introduce new frameworks or libraries
- Prefer deleting code over adding layers
- Product decisions follow REDESIGN.md
