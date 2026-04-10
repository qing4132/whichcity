# WhichCity

全球城市对比工具（whichcity.run）— Next.js 15 + TypeScript + Tailwind CSS + Recharts

> 详细架构、数据模型、技术债、TODO → 见 [HANDOFF.md](../HANDOFF.md)
> 数据更新流程 → 见 [DATA_OPS.md](../DATA_OPS.md)
> **Redesign 产品指导规则 → 见 [REDESIGN.md](../REDESIGN.md)**

## Architecture

- `app/[locale]/` — Next.js App Router pages (thin wrappers calling components)
- `app/[locale]/*/opengraph-image.tsx` — dynamic OG images (Satori + next/og)
- `components/` — 5 page components + NavBar + ClimateChart + WebVitals
- `hooks/useSettings.ts` — global settings (profession, locale, theme, currency, etc.)
- `lib/` — data loading, i18n, tax computation (81 countries), nomad i18n, types, constants
- `lib/nomadData.ts` — nomad data types + server-side JSON loader
- `lib/nomadI18n.ts` — nomad-specific translations (visa names, notes, VPN notes, legal income)
- `public/data/` — cities.json, exchange-rates.json, nomad-data-compiled.json, nomad-visafree-4passport.json
- `__tests__/` — unit tests (Vitest): tax engine, composite index
- `scripts/` — active maintenance scripts (4 files)
- `_archive/` — historical scripts, audit reports, old components, data sources, reports (do not delete)

## Key Data

- 154 cities, 26 professions, 10 currencies, 4 locales (zh/en/ja/es)
- City type: ~50 fields (income, costs, housing, safety, healthcare, freedom, climate, etc.)
- Tax engine: 81 country tax tables + city overrides + expat schemes
- Composite indices: Life Pressure (client-computed), Safety/Healthcare/Freedom (pre-computed in JSON)
- Nomad data: visa info, VPN status, English level, timezone overlap, visa-free matrix (4 passports × 81 countries)

## Breakpoints

- `min-[1080px]:` — nav hamburger collapse; compare 3-column
- `min-[420px]:` — responsive nav button labels (en/es shorter text)
- `md:` (768px) — compare 2-column fallback
- `sm:` (640px) — grids, text sizing

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
- Do NOT introduce new frameworks or libraries unless clearly necessary (e.g. test runner)
- Prefer deleting code over adding layers
