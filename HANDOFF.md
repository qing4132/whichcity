# WhichCity — Project Handoff

> **Version 2.2** — Phase 2 in progress (2026-04-13)
> Phase 1 changelog: `_archive/reports/changelog-v1.md`
> Phase 2 strategy: `_archive/reports/phase2-strategy.md`
> New indicators report: `_archive/reports/new-indicators-2025-04.md`

---

## 1. Overview

**WhichCity** ([whichcity.run](https://whichcity.run)) is a global city comparison tool for relocation decisions.

| Dimension | Value |
|-----------|-------|
| Cities | 150 displayed (6 hidden nomad-only) |
| Professions | 25 (was 23; added 数字游民 $85k + civil_servant renamed) |
| Tax Systems | 81 countries + city overrides + 6 expat schemes |
| Currencies | 10 selectable (50+ stored) |
| Languages | zh / en / ja / es |
| Core Use Cases | Job offer comparison, relocation planning, study abroad, city research |

**Core competitive advantage**: profession × 81-country tax engine × multi-dimensional data — unique among free tools.

---

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| UI | React 18 + Tailwind CSS 3 (darkMode: "class") |
| Charts | Recharts 3 |
| Animations | Framer Motion 12 |
| Tests | Vitest |
| CI | GitHub Actions (tsc → validate → test → build) |

**Hard rule**: No new frameworks or libraries.

---

## 3. Project Structure

```
whichcity/
├── app/[locale]/              Pages (thin SSR wrappers)
│   ├── city/[slug]/           City detail (148 slugs)
│   ├── ranking/               Rankings (22+ metrics)
│   ├── compare/[pair]/        Compare (slug-vs-slug[-vs-slug])
│   └── methodology/           Data sources
│
├── components/                Page components
│   ├── CityDetailContent.tsx  ~300 lines (refactored: feed-style layout)
│   ├── city-detail/           Sub-components extracted from CityDetailContent
│   │   ├── HeroSection.tsx    City header (flag, name, compare button)
│   │   ├── FeedPost.tsx       Reusable feed post card component
│   │   ├── NomadSection.tsx   Nomad visa/VPN/English info
│   │   └── SimilarCities.tsx  Similar cities recommendations
│   ├── RankingContent.tsx     ~680 lines (simplified from ~1100)
│   ├── CompareContent.tsx     ~800 lines
│   ├── HomeContent.tsx        ~175 lines
│   ├── NavBar.tsx             ~260 lines (streamlined)
│   ├── ClimateChart.tsx       ~160 lines
│   └── MethodologyContent.tsx ~150 lines
│
├── hooks/useSettings.ts       Global settings + formatCompact (万/亿 for CJK, k/M for latin)
│
├── lib/
│   ├── types.ts               City interface (~60 fields, incl. 6 new governance/health indicators)
│   ├── taxData.ts             81 country tax tables + expat schemes
│   ├── taxUtils.ts            Tax computation engine
│   ├── i18n.ts                ~2100 lines (4 locales, 370+ keys)
│   ├── constants.ts           Regions, flags, currencies, climate
│   ├── dataLoader.ts          Server-side data loading
│   ├── clientUtils.ts         Life Pressure formula, helpers
│   ├── citySlug.ts            ID↔slug mappings
│   ├── cityIntros.ts          150 cities × 4 locales
│   └── analytics.ts           GA4 events
│
├── public/data/
│   ├── cities.json            150 cities runtime data
│   ├── exchange-rates.json    Daily auto-updated (JPY→JP¥)
│   ├── nomad-data-compiled.json
│   └── nomad-visafree-4passport.json
│
├── __tests__/                 Vitest (tax engine + composite index)
├── scripts/                   8 active scripts (rates, validate, climate, timezone, collect, merge, numbeo-safety)
│
├── REDESIGN.md                Phase 2 direction & constraints
├── RULES.md                   Coding conventions
└── _archive/                  Historical reference (do not delete)
```

---

## 4. Key Systems

### Tax Engine (`lib/taxData.ts` + `lib/taxUtils.ts`)

81 countries with progressive brackets, social security, standard deductions. Three modes:
- `gross` — raw salary
- `net` — local country tax applied
- `expatNet` — expat-specific schemes (Netherlands 30%, Spain Beckham Law, etc.)

**Tax Breakdown** (`computeTaxBreakdown`): Returns full itemized breakdown:
- Gross → Social security (per-component with rates, cap indicators) → Standard deduction → Employee deduction → Taxable income → Income tax brackets → Local tax → Net
- `TaxBreakdownDetail` has `rate?: string` and `capped?: boolean`
- `TaxBreakdown` has `expatSchemeName?: string`

**6 Expat Schemes**:
| Country | Scheme | Engine Type |
|---------|--------|-------------|
| Netherlands | 30% Ruling | exemption_pct: 30% |
| Spain | Beckham Law | flat_rate: 24% (€600k+: 47%) |
| Italy | Impatriati Regime | exemption_pct: 50% |
| Portugal | NHR 2.0 | flat_rate: 20% |
| South Korea | 19% Flat Rate | flat_rate: 19% |
| Singapore | CPF Exemption | no_social |

**China City Overrides**: 7 cities (Beijing/Shanghai/Guangzhou/Shenzhen/Chengdu/Hangzhou/Chongqing) with per-city caps for pension/medical/unemployment/housing_fund (社平工资×3).

City overrides for US state tax, Canadian provincial tax, HK foreign worker rules.

**Salary Tiers**: 7 multipliers [×0.6 Intern, ×0.8 Junior, ×1.0 Mid, ×1.5 Senior, ×2.0 Expert, ×3.0 Director, ×5.0 Exec] with i18n labels.

### Composite Indices

| Index | Weights | Stored |
|-------|---------|--------|
| Safety | 30% Numbeo + 25% Homicide(inv) + 20% GPI(inv) + 15% Gallup + 10% WPS | Pre-computed in JSON |
| Healthcare | 25% Doctors + 25% UHC + 20% Beds + 15% Life Expectancy + 15% OOP(inv) | Pre-computed |
| Governance | 25% CPI + 25% Gov Effectiveness + 20% WJP Rule of Law + 15% RSF Press Freedom + 15% MIPEX | Pre-computed |
| Life Pressure | 30% Savings Rate + 25% BigMac + 25% WorkHours(inv) + 20% YearsToBuy | Client-computed |

Missing sub-indicator weights redistributed proportionally. Confidence: all=high, 1 missing=medium, 2+=low.

**Color thresholds** (intentionally different by context):
- Big numbers (45px): **top/bottom 20%** → green/red. Glanceable; color is scarce signal for extremes only.
- Sub-indicator arrows (⬆︎/⬇︎): **top/bottom 30%** → green/red. Per-row reading aid; wider band so ~60% of rows get directional guidance instead of all "—".

### Settings (`hooks/useSettings.ts`)

| Setting | Default | Storage |
|---------|---------|---------|
| locale | "en" | URL + cookie |
| theme | "auto" | localStorage |
| currency | "USD" | localStorage |
| costTier | "moderate" | localStorage |
| profession | "软件工程师" | localStorage |
| incomeMode | "net" | forced (no UI) |
| salaryMultiplier | 1.0 | localStorage (discrete: 0.6/0.8/1/1.5/2/3/5) |

---

## 5. Responsive Breakpoints

| Breakpoint | Effect |
|-----------|--------|
| `min-[1080px]` | NavBar full nav; Compare 3-column |
| `md` (768px) | Compare 2-column |
| `sm` (640px) | Grids, text sizing |

---

## 6. Dev Commands

```bash
npm install && npm run dev   # http://localhost:3000
npx tsc --noEmit             # type check
npm test                     # unit tests
npm run build                # production build
```

---

## 7. Phase 2 Status

See [REDESIGN.md](REDESIGN.md) for full plan. Key progress:

- [x] City detail page rewrite — feed-style "竖向信息流" layout
- [x] CityDetailContent split into sub-components (HeroSection, FeedPost, NomadSection, SimilarCities)
- [x] Row 1: Income + Savings + Cost + Rent (formatCompact with 万/亿 for CJK)
- [x] Row 2: Safety + Healthcare + Freedom merged with collapsible sub-indicators
- [x] Dark mode symmetric color palette (slate-950, green-400, rose-400)
- [x] NavBar streamlined (max-w-2xl, simplified layout)
- [x] Profession cleanup (26→23, removed 公务员/家政服务人员/摄影师)
- [x] JPY symbol → JP¥ (disambiguate from CNY ¥)
- [x] Raw safety fields (homicideRate, gpiScore) added to types + cities.json
- [x] Ranking page simplified (multi-sort removed)
- [x] All page emojis removed (except flags)
- [x] Tax breakdown: expandable itemized view (gross→social→deductions→brackets→net)
- [x] Social component i18n: 62 items × 4 locales (SOCIAL_COMP_I18N)
- [x] Cap indicator: * mark + footnote when social base cap reached
- [x] 6 expat scheme advisory tips with detailed conditions (4 locales)
- [x] Salary tiers: 7 levels (×0.6–×5.0) with i18n labels in NavBar
- [x] Digital Nomad profession added ($85k, 148 cities, source: Nomads.com 2026)
- [x] China tax: 7-city social insurance overrides (pension/medical/unemployment/housing_fund)
- [x] Currency display: tax breakdown uses currency codes (CNY/EUR) not symbols (¥/€)
- [x] Thousands separators enabled for all locales
- [x] Tax detail toggle: "点击展开/收起税务明细" with state-based text
- [x] City detail NavBar: scroll-triggered city name animation, hidden nav links, compact icon buttons
- [x] Plan D font scale applied (12/13/14/15/20/30/45px) across city detail page
- [x] 6 new indicators collected from public sources (WPS, OOP health, WJP Rule of Law, Freedom on Net, MIPEX, WGI Gov Effectiveness)
- [x] Composite indices upgraded: Safety 4→5 subs, Healthcare 4→5 subs, Freedom→Governance 3→5 subs
- [x] governanceIndex replaces freedomIndex throughout codebase (types, components, i18n)
- [x] Added Casablanca (id=160) + Wellington (id=161) → 150 cities total
- [x] Applied Numbeo Safety Index 2025 data for 120+ cities
- [x] Governance: FOTN (internetFreedomScore) → RSF (pressFreedomScore) in detail page & i18n
- [x] "基本保障" expandable section redesigned: tax-detail-style structured rows with weights, reference values, confidence badges, "—" for missing data
- [x] safetyDesc/safetyMethodNote/institutionalFreedomDesc updated to 5-sub weights (all 4 locales)
- [x] 3 new design concepts added to inspiration file (#8 诊断报告Feed, #9 极简仪表盘, #10 结论优先)
- [x] Diagnostic report style (#8): sub-indicators show value · reference range · ⬆︎/—/⬇︎ judgment per percentile
- [x] Arrow symbols use VS15 (U+FE0E) to prevent iOS Safari emoji rendering
- [x] Sub-indicator labels improved (4 locales): Gallup→居民治安感受, WPS→女性和平指数, MIPEX→移民包容度, UHC→全民医保覆盖, etc.
- [x] 基本保障 header shows 3 ranks (#S #H #G / 150) with per-index tier colors
- [x] 税後年薪 rank color follows tier (green/red/neutral), "/ 150" uses body color
- [x] Expandable sub-indicator style unified with tax breakdown: font-bold group headers, opacity-60 sub-rows, 4-column layout (label | value | range | arrow)

Pending:
- [ ] SEO meta optimization
- [ ] GA4 key event configuration
- [ ] Compare page Phase 2 restyling
# WhichCity — Project Handoff Document

> **Version 1.0** — Phase 1 complete (2026-04-10)
> Purpose: Enable a new developer or AI to fully understand and work on this project without prior context.
> V1 changelog: [`_archive/reports/changelog-v1.md`](_archive/reports/changelog-v1.md)

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

**WhichCity** ([whichcity.run](https://whichcity.run)) is a global city comparison tool. Users can compare 154 cities across income, living costs, housing, safety, healthcare, governance, climate, and more. Supports 26 professions, 81 country tax systems, 10 currencies, and 4 languages (zh/en/ja/es).

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
│       ├── city/[slug]/        City detail routes (154 slugs)
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
│   ├── CompareContent.tsx      ~800 lines — 3-city comparison + nomad + info cards
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
│   ├── types.ts                City interface (~60 fields), enums
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
│   └── analytics.ts            GA4 event tracking (10 lines)
│
├── public/
│   ├── data/
│   │   ├── cities.json                  154 cities, ~50 fields each (runtime data)
│   │   ├── exchange-rates.json          30 currencies (auto-updated daily)
│   │   ├── nomad-data-compiled.json     154 cities nomad data (visa, VPN, English, timezone)
│   │   └── nomad-visafree-4passport.json  Visa-free matrix (CN/US/EU/JP × 81 countries)
│   └── fonts/
│       └── NotoSansSC-Bold.ttf CJK font for OG image generation
│
├── __tests__/                  Unit tests (Vitest)
│   ├── taxUtils.test.ts        22 tests — tax engine
│   └── compositeIndex.test.ts  13 tests — Life Pressure computation
│
├── scripts/                    Active maintenance scripts (6 files)
│   ├── update-rates.mjs        Fetch exchange rates (daily, CI-automated)
│   ├── validate-data.mjs       Data validation (CI-automated)
│   ├── add-monthly-climate.mjs Batch add monthly climate data (reusable for new cities)
│   ├── add-timezone.mjs        Add timezone to cities (reusable for new cities)
│   ├── collect-new-indicators.py  Fetch indicators from World Bank API
│   ├── merge-new-indicators.mjs   Merge 6 new indicators + recompute composites
│   ├── fetch-numbeo-safety.mjs    Fetch Numbeo Safety Index for all cities
│   └── apply-numbeo-safety.mjs    Apply Numbeo data + recompute safety index
│
├── _archive/                   Historical reference (DO NOT DELETE)
│   ├── scripts/                30+ one-time data processing scripts
│   ├── audit/                  V1 data audit scripts, results, and fix reports
│   ├── data_sources/           Raw source data (Numbeo, UNODC, GPI, Gallup, WPS, WJP, etc.)
│   ├── old-homepage/           Legacy components before redesign
│   ├── reports/                Dev session reports + V1 changelog
│   └── *.md                    Historical docs
│
├── .github/
│   ├── workflows/
│   │   ├── ci.yml              CI: tsc → validate-data → test → build
│   │   └── update-exchange-rates.yml  Daily exchange rate auto-update
│   ├── agents/
│   │   └── data-audit.agent.md Data audit AI agent
│   ├── instructions/           Copilot instruction files
│   └── copilot-instructions.md AI coding context
│
├── middleware.ts               Locale routing + cookie persistence
├── next.config.ts              Dev port isolation, font/data tracing, cache headers
├── tailwind.config.ts          darkMode: "class", standard breakpoints
├── vitest.config.ts            Test configuration
│
├── README.md                   User-facing project description (4 languages)
├── RULES.md                    Coding conventions
├── REDESIGN.md                 Phase 2 redesign guidelines (constraints + design principles)
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
| Index | lifePressure, safety, healthcare, governance |

**Features**:
- Single-select mode: sort by one tab + optional sub-sort for composite indices
- Multi-select (composite) mode: combine multiple tabs into custom weighted score
- Climate filter: 6 types + 5 dimensions (temp, temp range, rain, humidity, sunshine) with tier-based thresholds
- Dense ranking with tie handling
- Tab and filter selections persisted in localStorage

**Index sub-indicators and weights**:
- Life Pressure: 30% savings rate, 25% big mac purchasing power, 25% work hours (inv), 20% years-to-buy
- Safety: 30% Numbeo, 25% homicide rate (inv), 20% GPI (inv), 15% Gallup law & order, 10% WPS
- Healthcare: 25% doctors/1k, 25% UHC coverage, 20% hospital beds/1k, 15% life expectancy, 15% OOP (inv)
- Governance: 25% CPI, 25% gov effectiveness, 20% WJP rule of law, 15% RSF press freedom, 15% MIPEX

### 4.3 Compare (`/:locale/compare/:pair`)

- Up to 3 cities side-by-side (URL format: `slug-vs-slug[-vs-slug]`)
- 16 metrics across 5 groups (Income, Housing, Work, Environment, Index) + Climate section
- Info card (no header): effective tax rate (participates in win count, hidden in gross mode, shows expat scheme), timezone (UTC offset + live local time), official languages
- Digital nomad card: visa status, VPN restriction, English level — all participate in win count
- Win-count badges (green highlight for best value per metric)
- City switcher with dropdown search
- Climate charts with shared Y-axis across compared cities
- Similar cities section (6 recommendations by 21-dimension Euclidean distance)
- Responsive: 3 columns (≥1080px) → 2 columns (<1080px)

### 4.4 City Detail (`/:locale/city/:slug`)

- Row 1: Income & Housing (6 metrics with rank and tier coloring)
- Row 2: Work & Environment (6 metrics)
- Row 3: 4 expandable index cards (Life Pressure, Safety, Healthcare, Governance) with sub-indicators
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

  // Safety (composite + 5 sub-indicators)
  safetyIndex: number;               // 0–100 pre-computed weighted
  safetyConfidence: "high" | "medium" | "low";
  numbeoSafetyIndex: number | null;
  homicideRateInv: number | null;
  gpiScoreInv: number | null;
  gallupLawOrder: number | null;
  wpsIndex: number | null;           // Georgetown WPS Index (0-1)
  safetyWarning?: "active_conflict" | "extreme_instability" | "data_blocked";

  // Healthcare (composite + 5 sub-indicators)
  healthcareIndex: number;
  healthcareConfidence: "high" | "medium" | "low";
  doctorsPerThousand: number | null;
  hospitalBedsPerThousand: number | null;
  uhcCoverageIndex: number | null;
  lifeExpectancy: number | null;
  outOfPocketPct: number | null;     // OOP health expenditure (%)

  // Governance (composite + 5 sub-indicators, replaces old Freedom)
  governanceIndex: number;           // 0–100 pre-computed weighted
  governanceConfidence: "high" | "medium" | "low";
  corruptionPerceptionIndex: number | null;
  govEffectiveness: number | null;   // WGI Government Effectiveness (0-100)
  wjpRuleLaw: number | null;        // WJP Rule of Law Index (0-1)
  internetFreedomScore: number | null; // Freedom on the Net (0-100)
  mipexScore: number | null;         // MIPEX migrant integration (0-100)

  // Legacy (kept for backwards compatibility)
  freedomIndex: number;
  freedomConfidence: "high" | "medium" | "low";
  pressFreedomScore: number | null;
  democracyIndex: number | null;

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
| Safety sub-indices | Numbeo, UNODC, GPI, Gallup, Georgetown WPS | Annual |
| Healthcare sub-indices | WHO, World Bank | Annual |
| Governance sub-indices | TI CPI, World Bank WGI, WJP, Freedom House, MIPEX | Annual |
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
- safetyIndex, healthcareIndex, governanceIndex
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
- GitHub Actions CI: on push/PR → `tsc --noEmit` → `validate-data.mjs` → `npm test` (Vitest) → `npm run build`

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

---

## 13. TODO & Future Ideas

### Phase 1 — Complete ✓

- [x] 154 cities with 26 professions each
- [x] Digital nomad section (visa, VPN, English, timezone, visa-free matrix)
- [x] CI pipeline + unit tests (tax engine, composite index)
- [x] Dark mode flash fix (mounted pattern)
- [x] Chinese copywriting standards
- [x] Compare page: info card + nomad card

### Phase 2 — Next

- [ ] Redesign: implement REDESIGN.md guidelines (information hierarchy, identity system)
- [ ] Annual data refresh cycle (salaries, costs, indices)
- [ ] Mobile-optimized share cards
- [ ] Consider pagination or virtualization for ranking page

### Medium-term

- [ ] Tax calculator: input custom salary → show net income across all cities
- [ ] More professions (creative, blue-collar categories underrepresented)
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
| Nomad data (runtime) | `public/data/nomad-data-compiled.json` |
| Visa-free matrix (runtime) | `public/data/nomad-visafree-4passport.json` |
| Exchange rates (runtime) | `public/data/exchange-rates.json` |
| City TypeScript type | `lib/types.ts` |
| Tax rules (81 countries) | `lib/taxData.ts` |
| Tax computation | `lib/taxUtils.ts` |
| All UI translations | `lib/i18n.ts` |
| Nomad translations | `lib/nomadI18n.ts` |
| Nomad data types + loader | `lib/nomadData.ts` |
| City names (4 locales) | `lib/i18n.ts` → `CITY_NAME_TRANSLATIONS` |
| City intro paragraphs | `lib/cityIntros.ts` |
| City URL slugs | `lib/citySlug.ts` |
| City official languages | `lib/cityLanguages.ts` |
| Regions, flags, countries | `lib/constants.ts` |
| Life Pressure formula | `lib/clientUtils.ts` → `computeLifePressure` |
| Exchange rate updater | `scripts/update-rates.mjs` |
| Data validation | `scripts/validate-data.mjs` |
| Global settings hook | `hooks/useSettings.ts` |
| Locale routing | `middleware.ts` |
| GA4 tracking | `lib/analytics.ts` |
| OG image generation | `app/[locale]/*/opengraph-image.tsx` |
| CJK font for OG | `public/fonts/NotoSansSC-Bold.ttf` |
| CI pipeline | `.github/workflows/ci.yml` |
| Unit tests (tax engine) | `__tests__/taxUtils.test.ts` |
| Unit tests (composite index) | `__tests__/compositeIndex.test.ts` |
| Historical scripts | `_archive/scripts/` |
| V1 audit reports | `_archive/audit/` |
| Raw data sources | `_archive/data_sources/` |
| V1 changelog | `_archive/reports/changelog-v1.md` |
| Dev session reports | `_archive/reports/` |
| Data update procedures | `DATA_OPS.md` |
| Coding rules | `RULES.md` |
| Redesign guidelines | `REDESIGN.md` |
| AI coding context | `.github/copilot-instructions.md` |

---

## Related Documentation

- [README.md](README.md) — User-facing project description
- [RULES.md](RULES.md) — Coding conventions
- [DATA_OPS.md](DATA_OPS.md) — Data maintenance procedures
- [REDESIGN.md](REDESIGN.md) — Phase 2 redesign guidelines
- [_archive/README.md](_archive/README.md) — Archive contents description
- [_archive/reports/changelog-v1.md](_archive/reports/changelog-v1.md) — V1 development changelog
