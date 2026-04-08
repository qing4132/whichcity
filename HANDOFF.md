# WhichCity — Project Handoff Document

> Last updated: 2026-04-08
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
│   ├── RankingContent.tsx      ~800 lines — 22+ metrics, climate filter
│   ├── CompareContent.tsx      ~650 lines — 3-city comparison
│   ├── CityDetailContent.tsx   ~550 lines — single city detail
│   ├── MethodologyContent.tsx  ~150 lines — data sources
│   ├── NavBar.tsx              ~600 lines — nav, settings, share
│   ├── ClimateChart.tsx        ~150 lines — Recharts monthly chart
│   └── WebVitals.tsx           ~30 lines — CWV reporter
│
├── hooks/
│   └── useSettings.ts          Global settings hook (localStorage-backed)
│
├── lib/
│   ├── types.ts                City interface (~50 fields), enums
│   ├── constants.ts            Regions, flags, currencies, country mappings
│   ├── dataLoader.ts           Server-side data loading (cached per process)
│   ├── i18n.ts                 ~1500 lines — translations (4 locales, 300+ keys)
│   ├── taxData.ts              79 country tax tables + city overrides + expat schemes
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

**Coverage**: 79 countries with progressive tax brackets, social security components, standard deductions.

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

**Location**: `lib/i18n.ts` (~1500 lines)

**Locales**: zh (Chinese), en (English), ja (Japanese), es (Spanish)

**Exports**:
- `TRANSLATIONS[locale]` — 300+ UI string keys
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
- `ready` — false until exchange rates loaded (layout waits for this)

**Theme hydration**: A `<script>` in layout.tsx reads localStorage before React hydrates to prevent FOUC (flash of unstyled content). Applies `.dark` class and `colorScheme` on `<html>`.

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
- `RankingContent.tsx` (~800 lines) — complex tab/filter/sort logic
- `CompareContent.tsx` (~650 lines) — many metric rows + chart integration
- `NavBar.tsx` (~600 lines) — settings dropdowns, share dialog, responsive
- `CityDetailContent.tsx` (~550 lines) — index cards, climate, similar cities

These work correctly but are harder to maintain. Extracting sub-components would add indirection without clear benefit given the project's simplicity principle.

### Data Gaps

- Some cities have `null` for optional fields (bigMacPrice, directFlightCities, etc.)
- 3 city IDs are unused (66, 72, 74) — gaps from deleted cities
- `description` field in cities.json is Chinese only; other locales use `cityIntros.ts`
- Some salary data may be outdated (last bulk update: early 2026)

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
- [ ] Annual data refresh cycle (salaries, costs, indices)
- [ ] Add mobile-optimized share cards
- [ ] Consider pagination or virtualization for ranking page with many cities

### Medium-term

- [ ] Digital nomad features: nomad visa info, coworking costs, English proficiency scores, timezone overlap tool
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
| Tax rules (79 countries) | `lib/taxData.ts` |
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
| AI coding context | `.github/copilot-instructions.md` |

---

## Related Documentation

- [README.md](README.md) — User-facing project description
- [RULES.md](RULES.md) — Coding conventions
- [DATA_OPS.md](DATA_OPS.md) — Data maintenance procedures
- [_archive/README.md](_archive/README.md) — Archive contents description
