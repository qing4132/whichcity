# WhichCity V1 Changelog

> Extracted from HANDOFF.md §16–§19 during Phase 2 cleanup (2026-04-10).
> Covers development from 2026-04-08 to 2026-04-10.

---

## 2026-04-08 → 04-09

### BigMac Price Unification (Japan)

All 6 Japan cities' `bigMacPrice` unified to **$3.03** based on The Economist Big Mac Index raw data (2026-01-01): ¥480 ÷ 158.545 = $3.03. Previously had inconsistent values (3.35–3.73).

### Profession Salary Data Overhaul (19 cities)

Replaced coefficient-derived salary data for 19 newly added cities (IDs 140–158) with real data from **SalaryExpert** (primary) and **Paylab** (Cambodia fallback).

**Pipeline**: `_archive/scripts/_update-salaries.mjs`
- Input: SalaryExpert gross annual salaries in local currency
- Conversion: ÷ FX rate → USD → × (1 − effective tax rate) → ÷ 12 → round to nearest $500
- Tax rates: approximate effective rates per country (not the project tax engine — script is for bulk import only)
- Missing professions: filled via related-profession heuristics (e.g., Civil Servant ≈ Teacher, Product Manager ≈ Software Engineer)
- Minimum floor: $500/mo

**Key fixes during the process**:
- **Split (Croatia)**: SalaryExpert labels values as HRK but Croatia uses EUR since 2023-01. Fixed `currency: "HRK"` → `"EUR"` in the script. Before fix: all 26 professions = $500. After: range $1,000–$4,000.
- **Siem Reap (Cambodia)**: SalaryExpert blocked by Cloudflare. Used Paylab.com national data × 0.75 (Siem Reap discount). Range $500–$1,500.

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

## 2026-04-09: Digital Nomad Section

### Overview

City detail and compare pages now include a **Digital Nomad** section powered by a separate compiled dataset (`public/data/nomad-data-compiled.json`, 154 cities) and a 4-passport visa-free matrix (`public/data/nomad-visafree-4passport.json`, 81 countries).

### Data Architecture

| File | Purpose |
|------|---------|
| `public/data/nomad-data-compiled.json` | Per-city nomad data (visa, internet, English, timezone, coworking, community) |
| `public/data/nomad-visafree-4passport.json` | Visa-free tourism days for CN/US/EU/JP passports × 81 countries |
| `lib/nomadData.ts` | TypeScript types + server-side loaders |
| `lib/nomadI18n.ts` | 4-locale translations for visa names, tax strings, visa notes, VPN notes, legal income |

### NomadCityData Interface

```typescript
interface NomadCityData {
  visa: { hasNomadVisa, visaName, durationMonths, minIncomeUsd, taxOnForeignIncome, note } | null;
  english: { efEpiScore, efEpiBand, cityRating: "Great"|"Good"|"Okay"|"Bad" } | null;
  internet: { downloadMbps, vpnRestricted: boolean|"partial", vpnNote } | null;
  timezoneOverlap: { utcOffsetHours, overlapWithUSEast, overlapWithUSWest, overlapWithLondon, overlapWithEast8 } | null;
}
```

### Compare Page: Nomad & Info Cards

- **Info card**: effective tax rate, timezone (live local time), official languages
- **Digital nomad card**: visa name, VPN restriction, English level — all participate in win count

### NavBar SSR Fix → Superseded

The NavBar SSR fix was superseded by the `mounted` pattern (see dark mode flash fix below).

---

## 2026-04-10

### Dark Mode Flash Fix (Critical)

**Problem**: On Chrome and mobile Safari, refreshing dark mode pages caused a white flash.

**Root cause**: SSR HTML pre-rendered with `darkMode=false`. Client `useState` initializer read `.dark` class → returned `true` → hydration mismatch → React kept SSR's light DOM.

**Final fix**: Added `mounted` state to `useSettings` (initial `false`). All page components return `null` when `!mounted`. `useLayoutEffect` syncs theme + sets `mounted=true`. First visible render uses correct `darkMode`. Zero SSR HTML with theme-dependent classNames = zero flash.

**Files changed**: `hooks/useSettings.ts`, all 4 page components, `app/[locale]/layout.tsx`, `app/globals.css`

### Chinese Copywriting Fixes

Applied 中文文案排版指北 rules to all user-visible Chinese text (170 fixes across 3 files):
- Space between Chinese/English, Chinese/numbers
- Half-width parens/colons → full-width
- No space after full-width punctuation

### UI Polish

- Compare page: info card (tax, timezone, languages) + nomad card
- Similar cities card redesign (row-aligned grid)
- Nomad card dividers: dashed → solid
- Spanish label shortening for overflow fixes
- ClimateChart breathing room

---

## 2026-04-10 afternoon

### CI Pipeline + Unit Tests

- **CI workflow** (`.github/workflows/ci.yml`): on push/PR → `tsc` → `validate-data` → `npm test` → `build`
- **Vitest 3.x** added, 35 unit tests across 2 files:
  - `__tests__/taxUtils.test.ts` (22 tests): tax engine coverage
  - `__tests__/compositeIndex.test.ts` (13 tests): Life Pressure computation
