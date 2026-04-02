# WhichCity

全球城市对比工具（whichcity.run）— Next.js 15 + TypeScript + Tailwind CSS + Recharts

## Architecture

- `app/` — Next.js App Router pages (thin wrappers calling components)
- `components/` — 5 page components + ClimateChart
- `hooks/useSettings.ts` — global settings (profession, locale, theme, currency, etc.)
- `lib/` — data, i18n, tax computation, types, constants
- `public/data/` — cities.json (134 cities), exchange-rates.json (auto-updated daily)
- `scripts/` — active maintenance scripts
- `_archive/` — historical scripts, old components, reports (do not delete)

## Key Data

- 134 cities, 26 professions, 10 currencies, 4 locales (zh/en/ja/es)
- Responsive breakpoint: `md:` (768px) for nav collapse and compare 2/3 col switch
- Content-level breakpoint: `sm:` (640px) for grids, text sizing

## Dev Commands

```bash
npm install && npm run dev   # http://localhost:3000
npx tsc --noEmit             # type check
npm run build                # production build
```

## Rules

- See RULES.md for coding conventions
- See DATA_OPS.md for data update procedures
- Do NOT introduce new frameworks or libraries
- Prefer simplicity over abstraction
