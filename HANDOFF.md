# WhichCity — Project Handoff Document

> Last updated: 2026-04-10
> Purpose: Enable a new developer or AI to fully understand and work on this project without prior context.

## Table of Contents

- [1. Overview](#1-overview)
- [2. Tech Stack](#2-tech-stack)
- [3. Project Structure](#3-project-structure)
- [4. Pages & Routes](#4-pages--routes)
- [5. Data Model](#5-data-model)
- [6. Key Systems](#6-key-systems)
- [7. Component Architecture](#7-component-architecture)
- [8. Settings & State Management](#8-settings--state-management)
- [9. Responsive Breakpoints](#9-responsive-breakpoints)
- [10. SEO & OG Images](#10-seo--og-images)
- [11. Build & Deploy](#11-build--deploy)
- [12. Known Issues & Tech Debt](#12-known-issues--tech-debt)
- [13. TODO & Future Ideas](#13-todo--future-ideas)
- [14. Design Principles](#14-design-principles)
- [15. File Map](#15-file-map)
- [16. Recent Changes (2026-04-08 → 04-09)](#16-recent-changes-2026-04-08--04-09)
- [17. Digital Nomad Section (2026-04-09)](#17-digital-nomad-section-2026-04-09)
- [18. Changes (2026-04-10)](#18-changes-2026-04-10)

---

## 1. Overview

**WhichCity** ([whichcity.run](https://whichcity.run)) is a global city comparison tool. Users can compare 154 cities across income, living costs, housing, safety, healthcare, institutional freedom, climate, and more. Supports 26 professions, 81 country tax systems, 10 currencies, and 4 languages (zh/en/ja/es).

**Core use cases**: relocation decisions, job offer comparison, study abroad planning, digital nomad destination research.

---

## 2. Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | ^15 |
| UI | React | ^18 |
| Language | TypeScript | ^5 |
| Styling | Tailwind CSS (darkMode: "class") | ^3 |
| Charts | Recharts | ^3.8 |
| Animations | Framer Motion | ^12.38 |
| Metrics | web-vitals | ^5.2 |
| Lint | ESLint + eslint-config-next | ^8 / ^15 |
| Build | PostCSS + Autoprefixer | ^8 / ^10 |

**Hard rule**: No new frameworks or libraries may be added (see RULES.md).

---

## 3. Project Structure

```
whichcity/
├── app/                        Next.js App Router
│   ├── globals.css             Global styles (Tailwind base)
│   ├── robots.ts               robots.txt generation
│   ├── sitemap.ts              Sitemap generation (auto from slugs + pairs)
│   └── [locale]/               Dynamic locale routing (zh/en/ja/es)
│       ├── layout.tsx          Root layout (metadata, GA4, theme script, JSON-LD)
│       ├── page.tsx            Home → HomeContent
│       ├── error.tsx           Error boundary
│       ├── not-found.tsx       404 page
│       ├── city/[slug]/        City detail routes (134 slugs)
│       │   ├── page.tsx        → CityDetailContent
│       │   └── opengraph-image.tsx
│       ├── ranking/
│       │   ├── page.tsx        → RankingContent
│       │   └── opengraph-image.tsx
│       ├── compare/[pair]/     Compare routes (slug-vs-slug[-vs-slug])
│       │   ├── page.tsx        → CompareContent
│       │   └── opengraph-image.tsx
│       └── methodology/
│           └── page.tsx        → MethodologyContent
│
├── components/                 Page components (no shared UI library)
│   ├── HomeContent.tsx         ~175 lines — search, popular cities
│   ├── RankingContent.tsx      ~1100 lines — 22+ metrics, climate filter
│   ├── CompareContent.tsx      ~570 lines — 3-city comparison
│   ├── CityDetailContent.tsx   ~830 lines — single city detail + nomad section
│   ├── MethodologyContent.tsx  ~150 lines — data sources
│   ├── NavBar.tsx              ~310 lines — nav, settings, share
│   ├── ClimateChart.tsx        ~160 lines — Recharts monthly chart
│   └── WebVitals.tsx           ~30 lines — CWV reporter
│
├── hooks/
│   └── useSettings.ts          Global settings hook (localStorage-backed)
│
├── lib/
│   ├── types.ts                City interface (~50 fields), enums
│   ├── constants.ts            Regions, flags, currencies, country mappings
│   ├── dataLoader.ts           Server-side data loading (cached per process)
│   ├── i18n.ts                 ~1960 lines — translations (4 locales, 350+ keys)
│   ├── nomadI18n.ts            ~275 lines — nomad visa/VPN note translations (4 locales)
│   ├── nomadData.ts            ~80 lines — nomad data types + JSON loader
│   ├── taxData.ts              81 country tax tables + city overrides + expat schemes
│   ├── taxUtils.ts             Tax computation engine (gross → net)
│   ├── clientUtils.ts          Life Pressure formula, climate/name helpers
│   ├── citySlug.ts             ID↔slug mappings, popular pairs, top cities
│   ├── cityIntros.ts           154 cities × 4 locales (intro paragraphs)
│   ├── cityLanguages.ts        Official languages per city
│   ├── i18nRouting.ts          Locale detection helpers
│   ├── analytics.ts            GA4 event tracking (10 lines)
│
├── public/
│   ├── data/
│   │   ├── cities.json         154 cities, ~50 fields each (runtime data)
│   │   └── exchange-rates.json 30 currencies (auto-updated daily)
│   └── fonts/
│       └── NotoSansSC-Bold.ttf CJK font for OG image generation
│
├── scripts/                    Active maintenance scripts
│   ├── update-rates.mjs        Fetch exchange rates (ExchangeRate-API)
│   ├── add-monthly-climate.mjs Batch add monthly climate data
│   └── add-timezone.mjs        Add timezone to cities
│
├── _archive/                   Historical reference (DO NOT DELETE)
│   ├── scripts/                24 one-time data processing scripts
│   ├── data_sources/           Raw source data (Numbeo, UNODC, GPI, Gallup)
│   ├── old-homepage/           Legacy components before redesign
│   ├── reports/                Dev session reports (Mar–Apr 2026)
│   └── *.md                    Historical docs (ARCHITECTURE, DATA_SOURCES, etc.)
│
├── middleware.ts               Locale routing + cookie persistence
├── next.config.ts              Dev port isolation, font/data tracing, cache headers
├── tailwind.config.ts          darkMode: "class", standard breakpoints
│
├── README.md                   User-facing project description (4 languages)
├── RULES.md                    Coding conventions
├── DATA_OPS.md                 Data maintenance procedures
└── HANDOFF.md                  This file
```

---

## 4. Pages & Routes

### 4.1 Home (`/:locale`)

- Full-text city search (matches 4-locale names, slugs, country names)
- 6 hardcoded popular cities (New York, London, Tokyo, Singapore, Paris, Sydney)
- Stats summary line
- Keyboard navigation (arrow keys, enter, escape)

### 4.2 Ranking (`/:locale/ranking`)

**5 metric groups × 22+ tabs**:

| Group | Tabs |
|-------|------|
| Income | income, expense, savings |
| Housing | housePrice, housing (years to buy), rent |
| Work | workhours, hourlyWage, vacation |
| Environment | air (AQI), internet (Mbps), flights |
| Index | lifePressure, safety, healthcare, freedom |

**Features**:
- Single-select mode: sort by one tab + optional sub-sort for composite indices
- Multi-select (composite) mode: combine multiple tabs into custom weighted score
- Climate filter: 6 types + 5 dimensions (temp, temp range, rain, humidity, sunshine) with tier-based thresholds
- Dense ranking with tie handling
- Tab and filter selections persisted in localStorage

**Index sub-indicators and weights**:
- Life Pressure: 30% savings rate, 25% big mac purchasing power, 25% work hours (inv), 20% years-to-buy
- Safety: 35% Numbeo, 30% homicide rate (inv), 20% GPI (inv), 15% Gallup law & order
- Healthcare: 35% doctors/1k, 25% hospital beds/1k, 25% UHC coverage, 15% life expectancy
- Freedom: 35% press freedom, 35% democracy index, 30% corruption perception index

### 4.3 Compare (`/:locale/compare/:pair`)

- Up to 3 cities side-by-side (URL format: `slug-vs-slug[-vs-slug]`)
- 16 metrics across 5 groups (Income, Housing, Work, Environment, Index) + Climate section
- Win-count badges (green highlight for best value per metric)
- City switcher with dropdown search
- Climate charts with shared Y-axis across compared cities
- Similar cities section (6 recommendations by 21-dimension Euclidean distance)
- Responsive: 3 columns (≥1080px) → 2 columns (<1080px)

### 4.4 City Detail (`/:locale/city/:slug`)

- Row 1: Income & Housing (6 metrics with rank and tier coloring)
- Row 2: Work & Environment (6 metrics)
- Row 3: 4 expandable index cards (Life Pressure, Safety, Healthcare, Freedom) with sub-indicators
- **Digital Nomad section** (see §17): visa info, VPN status, English level, visa-free matrix, timezone overlap
- Timezone card (live clock, UTC offset, DST-aware)
- Climate section (type, stats, monthly temperature/rainfall chart)
- Similar cities (6 recommendations with advantages/disadvantages vs current city)
- City introduction (4-locale paragraphs), official languages
- Safety warnings for conflict zones, instability, or information-blocked areas

### 4.5 Methodology (`/:locale/methodology`)

- Data source descriptions and links
- Composite index calculation methodology
- Tax system disclaimers
- Data freshness notes

---

## 5. Data Model

### 5.1 City Interface (lib/types.ts)

```typescript
interface City {
  // Identity
  id: number;                        // 1–139 (3 gaps: 66, 72, 74)
  name: string;                      // Chinese name (primary key in JSON)
  country: string;                   // Chinese country name
  continent: string;                 // Chinese continent name

  // Income
  averageIncome: number;             // USD, median across professions
  professions: Record<string, number>; // 26 professions → gross annual USD
  currency: string;                  // Local currency code

  // Living Costs
  costModerate: number;              // Monthly USD (moderate lifestyle)
  costBudget: number;                // Monthly USD (budget lifestyle)
  bigMacPrice: number | null;        // USD

  // Housing
  housePrice: number | null;         // USD per m²
  monthlyRent: number | null;        // USD

  // Work
  annualWorkHours: number | null;
  paidLeaveDays: number | null;

  // Environment
  airQuality: number | null;         // AQI (US EPA or AQICN)
  aqiSource?: "EPA" | "AQICN";
  internetSpeedMbps: number | null;
  directFlightCities: number | null;

  // Safety (composite + 4 sub-indicators)
  safetyIndex: number;               // 0–100 pre-computed weighted
  safetyConfidence: "high" | "medium" | "low";
  numbeoSafetyIndex: number | null;
  homicideRateInv: number | null;
  gpiScoreInv: number | null;
  gallupLawOrder: number | null;
  safetyWarning?: "active_conflict" | "extreme_instability" | "data_blocked";

  // Healthcare (composite + 4 sub-indicators)
  healthcareIndex: number;
  healthcareConfidence: "high" | "medium" | "low";
  doctorsPerThousand: number | null;
  hospitalBedsPerThousand: number | null;
  uhcCoverageIndex: number | null;
  lifeExpectancy: number | null;

  // Freedom (composite + 3 sub-indicators)
  freedomIndex: number;
  freedomConfidence: "high" | "medium" | "low";
  pressFreedomScore: number | null;
  democracyIndex: number | null;
  corruptionPerceptionIndex: number | null;

  // Climate
  timezone?: string;                 // IANA timezone (e.g., "America/New_York")
  climate?: ClimateInfo;
  description: string;               // Chinese intro text
}

interface ClimateInfo {
  type: ClimateType;                 // tropical|temperate|continental|arid|mediterranean|oceanic
  avgTempC: number;
  annualRainMm: number;
  sunshineHours: number;
  summerAvgC: number;
  winterAvgC: number;
  humidityPct: number;
  monthlyHighC?: number[];           // 12 values, Jan–Dec
  monthlyLowC?: number[];
  monthlyRainMm?: number[];
}
```

### 5.2 Data Sources & Freshness

| Data | Source | Update Frequency |
|------|--------|-----------------|
| Salaries | Glassdoor, Payscale, local surveys | Semi-annual manual |
| Cost of living | Numbeo, Expatistan | Semi-annual manual |
| House prices | Local real estate data | Semi-annual manual |
| AQI | IQAir annual report | Annual |
| Safety sub-indices | Numbeo, UNODC, GPI, Gallup | Annual |
| Healthcare sub-indices | WHO, World Bank | Annual |
| Freedom sub-indices | RSF, EIU, Transparency International | Annual |
| Exchange rates | ExchangeRate-API | **Daily (automated)** |
| Tax brackets | Government sources | Annual manual |
| Climate | WMO Normals 1991-2020, NOAA | Static (rarely changes) |
| Internet speed | Speedtest Global Index | Annual |

### 5.3 Exchange Rates

- File: `public/data/exchange-rates.json`
- 30 currencies stored, 10 selectable in UI (POPULAR_CURRENCIES)
- Automated daily via GitHub Actions: `.github/workflows/update-exchange-rates.yml`
- Script: `scripts/update-rates.mjs` (uses `EXCHANGE_RATE_API_KEY` secret)

---

## 6. Key Systems

### 6.1 Tax Engine

**Location**: `lib/taxData.ts` (data) + `lib/taxUtils.ts` (computation)

**Coverage**: 81 countries with progressive tax brackets, social security components, standard deductions.

**Income modes**:
- `gross` — show raw salary as-is
- `net` — apply local country tax rules to compute after-tax income
- `expatNet` — apply expat-specific tax schemes where available

**Expat schemes** (built-in):
- Netherlands: 30% Ruling
- Spain: Beckham Law
- Portugal: NHR 2.0
- Italy: Impatriati Regime
- And more (see taxData.ts for full list)

**City overrides**: `CITY_TAX_OVERRIDES[cityId]` for US state tax, Canadian provincial tax, HK foreign worker rules, etc.

**Special country logic**:
- Japan: custom employment deduction function + 10% resident tax
- Korea: custom employment deduction function
- Denmark: AM-bidrag 8% pre-tax
- Gulf states: zero income tax

**Computation**: `computeNetIncome(grossUSD, country, cityId, incomeMode, rates)` → `{ netIncome, effectiveRate, confidence }`

### 6.2 Internationalization (i18n)

**Location**: `lib/i18n.ts` (~1960 lines) + `lib/nomadI18n.ts` (~275 lines)

**Locales**: zh (Chinese), en (English), ja (Japanese), es (Spanish)

**Exports from i18n.ts**:
- `TRANSLATIONS[locale]` — 350+ UI string keys
- `CITY_NAME_TRANSLATIONS[id]` — city names in 4 locales
- `COUNTRY_TRANSLATIONS[zh_name]` — country names in 4 locales
- `PROFESSION_TRANSLATIONS[zh_name]` — 26 profession names in 4 locales
- `CONTINENT_TRANSLATIONS` — continent names
- `LANGUAGE_LABELS` — locale display names

**Locale routing**: Middleware detects locale from path → cookie → Accept-Language header → fallback EN. Persists choice in 1-year cookie.

### 6.3 Composite Index Computation

**Pre-computed** (stored in cities.json): Safety, Healthcare, Freedom
**Client-computed**: Life Pressure (depends on user's profession and cost tier selection)

**Missing data handling**: When a sub-indicator is `null`, its weight is redistributed proportionally. Confidence set to "high" (all present), "medium" (1 missing), "low" (2+ missing).

### 6.4 Similar Cities Algorithm

21-dimension normalized Euclidean distance:
- Income, costModerate, costBudget, housePrice, monthlyRent
- annualWorkHours, paidLeaveDays
- airQuality, internetSpeedMbps, directFlightCities
- safetyIndex, healthcareIndex, freedomIndex
- bigMacPrice, doctorsPerThousand, hospitalBedsPerThousand
- uhcCoverageIndex, lifeExpectancy
- avgTempC, annualRainMm, sunshineHours

Returns 6 most similar cities with top advantages and disadvantages relative to the reference city.

---

## 7. Component Architecture

All page components receive data as server-side props. No client-side data fetching for city data.

```
app/[locale]/page.tsx (SSR)
  └── HomeContent (client component)
        └── useSettings() → locale, profession, currency, theme, t()

app/[locale]/city/[slug]/page.tsx (SSR, loads city + allCities)
  └── CityDetailContent (client)
        ├── useSettings() → formatCurrency, incomeMode, costTier, t()
        ├── ClimateChart
        └── 4 × index card (expandable)

app/[locale]/ranking/page.tsx (SSR, loads allCities)
  └── RankingContent (client)
        └── useSettings() → sort, filter, compute, format

app/[locale]/compare/[pair]/page.tsx (SSR, loads cities by slug)
  └── CompareContent (client)
        ├── useSettings()
        └── 3 × ClimateChart
```

NavBar is rendered in layout.tsx, wrapping all pages.

---

## 8. Settings & State Management

**Hook**: `hooks/useSettings.ts`

| Setting | Type | Default | Persistence |
|---------|------|---------|-------------|
| locale | "zh" \| "en" \| "ja" \| "es" | "en" | URL path + cookie |
| themeMode | "auto" \| "light" \| "dark" | "auto" | localStorage |
| currency | string | "USD" | localStorage |
| costTier | "moderate" \| "budget" | "moderate" | localStorage |
| profession | string (Chinese name) | "软件工程师" | localStorage |
| incomeMode | "gross" \| "net" \| "expatNet" | "net" | localStorage |
| salaryMultiplier | number (0.5–3.0) | 1.0 | localStorage |

**Derived values**:
- `darkMode` — resolved boolean from themeMode + system preference
- `rates` — ExchangeRates (fetched once, cached in module-level variable)
- `currencySymbol` — looked up from rates
- `formatCurrency(amountUSD)` — converts and formats with locale symbol
- `t(key, params?)` — translation lookup with optional substitution
- `getProfessionLabel(zhName)` — localized profession name
- `ready` — false until exchange rates loaded
- `mounted` — false during SSR and initial hydration; true after useLayoutEffect syncs theme (see §18)

**Theme system (as of 2026-04-10)**:
1. `<meta name="color-scheme" content="light dark">` — browser canvas matches system preference before any CSS
2. Inline `<script>` in `<body>` — reads localStorage, adds `.dark`/`.light` class to `<html>`, sets `colorScheme`
3. `globals.css` — `@media (prefers-color-scheme: dark)` + `.dark`/`.light` class rules for html/body background
4. `useSettings` hook — `mounted` state starts `false`; all page components return `null` until `mounted=true`; this prevents any light-themed SSR HTML from being painted (same effect as Suspense in ranking page)
5. `useLayoutEffect` — syncs all settings from localStorage, then sets `mounted=true`; the first render with correct `darkMode` is the first render the user sees
6. On client-side navigation (`.theme-ready` present), `mounted` initializes as `true` directly — no flash

---

## 9. Responsive Breakpoints

| Breakpoint | Where | Effect |
|-----------|-------|--------|
| `min-[1080px]` | NavBar | Hamburger menu → full nav buttons |
| `min-[1080px]` | CompareContent | 2 columns → 3 columns |
| `min-[420px]` | NavBar | Show full-length button labels (en/es have shorter fallbacks) |
| `md` (768px) | CompareContent | Stacked → 2 columns |
| `sm` (640px) | Various | Grid column changes, text sizing |

---

## 10. SEO & OG Images

**Dynamic OG images**: All 4 main routes have `opengraph-image.tsx` using Satori + `next/og`. CJK font (`NotoSansSC-Bold.ttf`) ensures Chinese/Japanese characters render correctly.

**Sitemap**: Auto-generated from `CITY_SLUGS` (134 city pages), `POPULAR_PAIRS` (79 pairs), `SITEMAP_PAIRS` (top-city combinations), and `TOP_CITY_IDS` (30 cities).

**JSON-LD**: Website schema in layout.tsx.

**Analytics**: GA4 (`G-WW9GZ4ZF2C`) with custom events via `trackEvent()`.

---

## 11. Build & Deploy

```bash
npm run dev          # Development (http://localhost:3000)
npx tsc --noEmit     # Type check only
npm run build        # Production build
npm run start        # Serve production build
npm run lint         # ESLint
```

**Next.js config notes**:
- Dev: `.next-dev-${PORT}` directories allow parallel dev servers
- Prod: `.next` directory
- `outputFileTracingIncludes`: ensures fonts and data files are included in deployment
- Cache headers: `/data/*` → 1 day max-age + 7 day stale-while-revalidate

**CI/CD**:
- GitHub Actions: daily exchange rate update (commit + push by bot)
- No CI test/build pipeline (manual `npm run build` before push)

---

## 12. Known Issues & Tech Debt

### Large Component Files

Several components exceed the 300-line guideline:
- `RankingContent.tsx` (~1100 lines) — complex tab/filter/sort logic
- `CityDetailContent.tsx` (~830 lines) — index cards, nomad section, climate, similar cities
- `CompareContent.tsx` (~570 lines) — many metric rows + chart integration
- `NavBar.tsx` (~310 lines) — settings dropdowns, share dialog, responsive

These work correctly but are harder to maintain. Extracting sub-components would add indirection without clear benefit given the project's simplicity principle.

### Data Gaps

- Some cities have `null` for optional fields (bigMacPrice, directFlightCities, etc.)
- 3 city IDs are unused (66, 72, 74) — gaps from deleted cities
- `description` field in cities.json is Chinese only; other locales use `cityIntros.ts`
- Some salary data may be outdated (last bulk update: 2026-04-09, see §16)

### Japan Cities — averageIncome Data Source

6 Japan cities (东京/横滨/大阪/名古屋/福冈/京都) `averageIncome` uses **doda.jp 2025** (~60万 sample survey) as data source, NOT Numbeo. The net income is calculated using the project's own Japan tax engine in `taxUtils.ts`:

```
gross JPY (doda.jp)
  − social insurance (pension 9.15% + health 5% + employment 0.6%)
  − employment income deduction (給与所得控除, progressive scale)
  − basic deduction (¥480,000)
  = taxable income
  − national income tax (progressive brackets 5%–45%)
  − resident tax (10% of taxable)
  = net JPY ÷ exchange-rates.json JPY rate = averageIncome (USD)
```

Effective tax rate is ~21% for the ¥3.9M–¥4.8M range. When exchange rates update, Japan city incomes should be recalculated with the same formula. Other countries still use Numbeo. Kyoto profession salaries use doda.jp regional ratio (京都府404万/大阪府411万=0.983) applied to Osaka values.

doda.jp source data (2025):
- 東京都 476万円 → $23,349
- 神奈川県 456万円 → $22,442
- 愛知県 420万円 → $20,769
- 大阪府 411万円 → $20,343
- 京都府 404万円 → $20,011
- 福岡県 391万円 → $19,395

### i18n

- `i18n.ts` is ~1500 lines — large but flat structure, works fine
- Some translation keys may have minor inconsistencies across locales
- City intros quality varies (some are AI-generated, not all manually reviewed)

### Tax Engine

- Tax data confidence varies by country ("high"/"medium"/"low" flag)
- Some countries have `dataIsLikelyNet` flag — salary data may already be net, so tax computation is skipped
- Expat schemes are simplified (real rules are more complex with residency requirements, caps, etc.)
- No state/provincial tax for most countries (only US, Canada have city overrides)

### Performance

- cities.json (~240KB) loaded server-side per request (cached per process, acceptable)
- All 154 cities rendered in ranking (no pagination/virtualization)
- Climate charts render all 12 months even when off-screen

### Misc

- `getCityClimate()` in clientUtils.ts is deprecated but not removed (use `city.climate` directly)
- No automated tests
- No CI build pipeline

---

## 13. TODO & Future Ideas

### Near-term

- [x] Add more cities (target: 150+) — done: 154 cities (2026-04-09)
- [x] Digital nomad section: visa info, VPN status, English level, visa-free matrix, timezone overlap (done 04-09)
- [ ] Annual data refresh cycle (salaries, costs, indices)
- [ ] Add mobile-optimized share cards
- [ ] Consider pagination or virtualization for ranking page with many cities

### Medium-term

- [ ] Tax calculator: input custom salary → show net income across all cities
- [ ] More professions (currently 26; creative, blue-collar categories underrepresented)
- [ ] Regional cost breakdown (rent vs food vs transport)

### Long-term

- [ ] User accounts for saved cities / custom lists
- [ ] Community data corrections / crowd-sourcing
- [ ] API for third-party integrations
- [ ] More locales (ko, de, fr, pt)

---

## 14. Design Principles

1. **Simplicity > flexibility > performance** — Don't abstract, don't future-proof, don't optimize prematurely
2. **Delete code, don't add layers** — If something can be removed, remove it
3. **Files < 300 lines, functions < 50 lines** — Exceptions: data/translation files, large page components
4. **No new dependencies** — Work with what's already in package.json
5. **One file = one responsibility** — Straightforward, linear logic
6. **Data in JSON, logic in TypeScript** — No runtime API calls for city data
7. **Server-side data, client-side interactivity** — Pages SSR with data props, client hydrates for settings/filtering

See [RULES.md](RULES.md) for the full coding conventions.

---

## 15. File Map

Quick reference for "where is X?"

| What | Where |
|------|-------|
| City data (runtime) | `public/data/cities.json` |
| City TypeScript type | `lib/types.ts` |
| Tax rules (81 countries) | `lib/taxData.ts` |
| Tax computation | `lib/taxUtils.ts` |
| All UI translations | `lib/i18n.ts` |
| City names (4 locales) | `lib/i18n.ts` → `CITY_NAME_TRANSLATIONS` |
| City intro paragraphs | `lib/cityIntros.ts` |
| City URL slugs | `lib/citySlug.ts` |
| City official languages | `lib/cityLanguages.ts` |
| Regions, flags, countries | `lib/constants.ts` |
| Life Pressure formula | `lib/clientUtils.ts` → `computeLifePressure` |
| Exchange rates (runtime) | `public/data/exchange-rates.json` |
| Exchange rate updater | `scripts/update-rates.mjs` |
| Global settings hook | `hooks/useSettings.ts` |
| Locale routing | `middleware.ts` |
| GA4 tracking | `lib/analytics.ts` |
| OG image generation | `app/[locale]/*/opengraph-image.tsx` |
| CJK font for OG | `public/fonts/NotoSansSC-Bold.ttf` |
| Historical scripts | `_archive/scripts/` |
| Raw data sources | `_archive/data_sources/` |
| Dev session reports | `_archive/reports/` |
| Data update procedures | `DATA_OPS.md` |
| Coding rules | `RULES.md` |
| Nomad data (compiled)        | `_audit/nomad-data-compiled.json` |
| Nomad translations           | `lib/nomadI18n.ts` |
| Nomad data types + loader    | `lib/nomadData.ts` |
| Visa-free matrix             | `_audit/nomad-visafree-4passport.json` |
| AI coding context | `.github/copilot-instructions.md` |

---

## 16. Recent Changes (2026-04-08 → 04-09)

### BigMac Price Unification (Japan)

All 6 Japan cities' `bigMacPrice` unified to **$3.03** based on The Economist Big Mac Index raw data (2026-01-01): ¥480 ÷ 158.545 = $3.03. Previously had inconsistent values (3.35–3.73).

### Profession Salary Data Overhaul (19 cities)

Replaced coefficient-derived salary data for 19 newly added cities (IDs 140–158) with real data from **SalaryExpert** (primary) and **Paylab** (Cambodia fallback).

**Pipeline**: `scripts/_update-salaries.mjs`
- Input: SalaryExpert gross annual salaries in local currency
- Conversion: ÷ FX rate → USD → × (1 − effective tax rate) → ÷ 12 → round to nearest $500
- Tax rates: approximate effective rates per country (not the project tax engine — script is for bulk import only)
- Missing professions: filled via related-profession heuristics (e.g., Civil Servant ≈ Teacher, Product Manager ≈ Software Engineer)
- Minimum floor: $500/mo

**Key fixes during the process**:
- **Split (Croatia)**: SalaryExpert labels values as HRK but Croatia uses EUR since 2023-01. Fixed `currency: "HRK"` → `"EUR"` in the script. Before fix: all 26 professions = $500. After: range $1,000–$4,000.
- **Siem Reap (Cambodia)**: SalaryExpert blocked by Cloudflare. Used Paylab.com national data × 0.75 (Siem Reap discount). Range $500–$1,500.

**Validation**: All 19 cities have 26 professions, average profession salary / (averageIncome/12) ratio between 1.1× and 4.8×.

| Cities updated | Data source | Professions | Date |
|---|---|---|---|
| Porto, Valencia, Las Palmas, Bansko, Split | SalaryExpert (EUR) | 22–26/26 | 2026-04-09 |
| Cancún, Playa del Carmen, Puerto Vallarta | SalaryExpert (MXN) | 24–25/26 | 2026-04-09 |
| Bali | SalaryExpert (IDR) | 24/26 | 2026-04-09 |
| Da Nang | SalaryExpert (VND, country-level) | 24/26 | 2026-04-09 |
| Phuket, Ko Pha-ngan, Ko Samui | SalaryExpert (THB, Phuket data) | 24/26 | 2026-04-09 |
| Montevideo | SalaryExpert (UYU) | 25/26 | 2026-04-09 |
| Penang | SalaryExpert (MYR) | 25/26 | 2026-04-09 |
| Marrakech | SalaryExpert (MAD) | 25/26 | 2026-04-09 |
| Florianópolis | SalaryExpert (BRL) | 25/26 | 2026-04-09 |
| Cusco | SalaryExpert (PEN) | 25/26 | 2026-04-09 |
| Siem Reap | Paylab (KHR, national × 0.75) | 17+9est/26 | 2026-04-09 |

### Methodology Page Update

Added **Paylab** as a salary data source across all 4 locale versions (zh/en/ja/es). Updated data year range from "2024–2025" to "2024–2026".

### Kyoto costBudget Investigation

Investigated anomalous Kyoto costBudget/costModerate ratio (38.9% vs typical 43–45%). Root cause: Kyoto uses **nomads.com** data ("expat cost" / "local cost") while other cities use Numbeo. Per user directive, data left unchanged — it reflects the actual source, not a calculation error.

---

## 17. Digital Nomad Section (2026-04-09)

### Overview

City detail pages now include a **Digital Nomad** section powered by a separate compiled dataset (`_audit/nomad-data-compiled.json`, 154 cities) and a 4-passport visa-free matrix (`_audit/nomad-visafree-4passport.json`, 81 countries).

### Data Architecture

| File | Purpose |
|------|---------|
| `_audit/nomad-data-compiled.json` | Per-city nomad data (visa, internet, English, timezone, coworking, community) |
| `_audit/nomad-visafree-4passport.json` | Visa-free tourism days for CN/US/EU/JP passports × 81 countries |
| `lib/nomadData.ts` | TypeScript types (`NomadCityData`, `VisaFreeMatrix`) + server-side loaders |
| `lib/nomadI18n.ts` | 4-locale translations for visa names (22), tax strings (12), visa notes (45), VPN notes (9), legal income (13 programs) |

### NomadCityData Interface

```typescript
interface NomadCityData {
  visa: { hasNomadVisa, visaName, durationMonths, minIncomeUsd, taxOnForeignIncome, note } | null;
  english: { efEpiScore, efEpiBand, cityRating: "Great"|"Good"|"Okay"|"Bad" } | null;
  internet: { downloadMbps, vpnRestricted: boolean|"partial", vpnNote } | null;
  timezoneOverlap: { utcOffsetHours, overlapWithUSEast, overlapWithUSWest, overlapWithLondon, overlapWithEast8 } | null;
  // ... plus coworking, nomadCommunity, nomadMonthlyCost (not yet displayed)
}
```

### UI Layout (CityDetailContent.tsx)

Single card with rounded border, 3 visual groups separated by dashed dividers:

1. **Top 6 cells**: Visa name, Duration, Min income (legal currency), Tax on foreign income, VPN status, English level
2. **Notes**: Visa note + VPN note (auto-cleaned: source refs stripped, "no visa" prefix removed, punctuation ensured)
3. **Bottom split**: Visa-free days (4 passports: US/EU/CN/JP) | Timezone overlap (San Francisco/New York/London/Shanghai)

### Translation System (nomadI18n.ts)

- **Visa names** (VN): 22 unique visa names × 3 non-EN locales
- **Tax strings** (TX): 12 unique tax descriptions × 3 non-EN locales
- **Visa notes** (NT): 45 note templates × 4 locales (en/zh/ja/es) — all rewritten as natural prose, no source references
- **VPN notes** (VP): 9 unique VPN descriptions × 3 non-EN locales
- **Legal income** (LI): 13 visa programs → original-currency income display (e.g., "1000万 日元/年")
- **Note cleaning**: `localizeNote()` strips "No dedicated nomad visa." prefix (4 locales), ensures sentence punctuation, returns null if content is empty after stripping — to avoid showing useless notes
- **VPN note cleaning**: `localizeVpnNote()` same punctuation logic

### NavBar SSR Fix (2026-04-09)

**Resolved in 04-10**: The NavBar SSR fix described below has been superseded by the `mounted` pattern (§18). Components now return `null` before mount, so there is no SSR NavBar to worry about. `sessionStorage` for settings panel state is now safely read in `useState` initializer.

Original fix (now obsolete):
1. **`if (!s.ready) return null`** in page components blocked the entire page (including NavBar) during SSR. Changed to only hide page content below NavBar.
2. **sessionStorage in useState initializer** caused React hydration mismatch. Moved to useEffect.

---

## 18. Changes (2026-04-10)

### Dark Mode Flash Fix (Critical)

**Problem**: On Chrome and mobile Safari, refreshing or visiting any page in dark mode caused a white flash. The ranking page was the only exception.

**Root cause investigation** (8 iterations):

1. **Initial diagnosis**: SSR HTML was pre-rendered with `darkMode=false` (light-mode classNames). The `useState` initializer read `document.documentElement.classList.contains("dark")` → returned `true` on the client (inline script had already set `.dark` class) → hydration mismatch → React kept SSR's light DOM → `setDarkModeState(true)` in `useEffect` was a no-op (already `true`).

2. **Fix #1**: Changed `darkMode` initial value to `false` (match SSR) + `useLayoutEffect` to sync. Worked for hard refresh but caused flash on client-side navigation (new component mounted with `false`, then corrected).

3. **Fix #2**: Detect hydration vs client-nav via `theme-ready` class on `<html>`. Client-nav reads real value from DOM; hydration uses `false`.

4. **Chrome still flashed**: Tried inline `<style>` in `<head>` for critical CSS → Next.js hoisted its own `<link>`/`<script>` tags above it, making inline styles too late.

5. **Tried `<body>` inline style + script**: Next.js put the `<style>` in body, but CSS `body::before` overlay was in external stylesheet (not loaded yet).

6. **Tried `<html style="visibility:hidden">`**: Hid everything until React hydrated. But the white background was still visible (visibility doesn't hide canvas color). Made Safari worse.

7. **Key user observation**: "Ranking page never flashes." Ranking uses `<Suspense>` → SSR outputs no component HTML → client renders with correct `darkMode` from the start.

8. **Final fix**: Add `mounted` state to `useSettings` (initial `false`). All page components return `null` when `!mounted`. `useLayoutEffect` syncs theme + sets `mounted=true`. First visible render uses correct `darkMode`. **Zero SSR HTML with theme-dependent classNames = zero flash.** Same principle as ranking page's Suspense boundary but explicit and universal.

**Files changed**: `hooks/useSettings.ts`, `components/HomeContent.tsx`, `components/CityDetailContent.tsx`, `components/CompareContent.tsx`, `components/MethodologyContent.tsx`, `app/[locale]/layout.tsx`, `app/globals.css`

**Side effects resolved**:
- Language switching no longer flashes (same root cause: `useEffect` → `useLayoutEffect` + `mounted`)
- Mobile Safari theme toggle bottom-area color fixed (cleared stale inline `backgroundColor` in `applyTheme`)
- NavBar settings panel now opens instantly after language switch (read `sessionStorage` in `useState` initializer instead of `useEffect`)

### Chinese Copywriting Fixes

Applied [中文文案排版指北](https://github.com/mzlogin/chinese-copywriting-guidelines) rules to all user-visible Chinese text (170 fixes across 3 files):

| Rule | Example | Files |
|------|---------|-------|
| Space between Chinese and English | `TTC公共交通` → `TTC 公共交通` | i18n, cityIntros |
| Space between Chinese and numbers | `地铁24小时` → `地铁 24 小时` | nomadI18n, cityIntros |
| Half-width parens → full-width | `(BLS)` → `（BLS）` | i18n, nomadI18n |
| Half-width colon → full-width | `显示币种:` → `显示币种：` | i18n |
| No space after full-width punct | `基准城市： {city}` → `基准城市：{city}` | i18n |

Automated via Python script (deleted after use). Only zh values modified; en/ja/es untouched.

---

## Related Documentation

- [README.md](README.md) — User-facing project description
- [RULES.md](RULES.md) — Coding conventions
- [DATA_OPS.md](DATA_OPS.md) — Data maintenance procedures
- [_archive/README.md](_archive/README.md) — Archive contents description
