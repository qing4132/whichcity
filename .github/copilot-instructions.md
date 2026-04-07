# WhichCity

全球城市对比工具（whichcity.run）— Next.js 15 + TypeScript + Tailwind CSS + Recharts

## Architecture

- `app/` — Next.js App Router pages (thin wrappers calling components)
- `app/[locale]/*/opengraph-image.tsx` — dynamic OG images for home, city, compare, ranking (Satori + next/og)
- `public/fonts/NotoSansSC-Bold.ttf` — CJK font used by OG image generation
- `components/` — 5 page components + NavBar + ClimateChart
- `hooks/useSettings.ts` — global settings (profession, locale, theme, currency, etc.)
- `lib/` — data, i18n, tax computation, types, constants
- `lib/analytics.ts` — GA4 event tracking helper (`trackEvent`)
- `public/data/` — cities.json (134 cities), exchange-rates.json (auto-updated daily)
- `scripts/` — active maintenance scripts
- `_archive/` — historical scripts, old components, reports (do not delete)

## Key Data

- 134 cities, 26 professions, 10 currencies, 4 locales (zh/en/ja/es)
- Nav breakpoint: `min-[1080px]:` for hamburger menu collapse (NavBar component)
- Nav text breakpoint: `min-[420px]:` for responsive nav button labels (en/es shorter text on small screens)
- Compare layout breakpoint: `md:` (768px) for 2/3 column switch
- Content-level breakpoint: `sm:` (640px) for grids, text sizing
- Ranking page: accordion buttons (climate filter + tab selection), single/multi select mode, localStorage persistence

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
