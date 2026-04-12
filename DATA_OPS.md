# Data Operations Guide

> Where data lives, how to update it, and what scripts are available.

## Data Files

| File | Contents | Update |
|------|----------|--------|
| `public/data/cities.json` | 154 cities × ~50 fields | Manual, semi-annual |
| `public/data/exchange-rates.json` | 30 currencies | Daily (CI automated) |
| `public/data/nomad-data-compiled.json` | 154 cities nomad data | Manual |
| `public/data/nomad-visafree-4passport.json` | Visa-free matrix (CN/US/EU/JP × 81 countries) | Manual |
| `lib/taxData.ts` | 81 country tax brackets | Manual, annual |
| `lib/constants.ts` | Regions, flags, climate data | Manual |
| `lib/cityIntros.ts` | 154 × 4 locale introductions | Manual |
| `lib/cityLanguages.ts` | Official languages | Manual |

## Active Scripts (`scripts/`)

| Script | Purpose | Trigger |
|--------|---------|---------|
| `update-rates.mjs` | Fetch exchange rates | Daily CI (`EXCHANGE_RATE_API_KEY`) |
| `validate-data.mjs` | CI data validation | Every push (CI) |
| `add-monthly-climate.mjs` | Batch add monthly climate data | Manual (new cities) |
| `add-timezone.mjs` | Add timezone to cities | Manual (new cities) |

## How to Add a New City

1. Add entry to `cities.json` (all fields, use `null` for missing)
2. Add to `lib/constants.ts`: `CITY_CLIMATE`, `CITY_FLAG_EMOJIS`, `CITY_COUNTRY`, `REGIONS`
3. Add to `lib/citySlug.ts`: `CITY_SLUGS` + `SLUG_TO_ID`
4. Add to `lib/cityIntros.ts`: 4 locale introductions
5. Add to `lib/cityLanguages.ts`: official languages
6. Add to `lib/i18n.ts`: `CITY_NAME_TRANSLATIONS`
7. Run `npx tsc --noEmit` and `node scripts/validate-data.mjs`

## How to Update Salary Data

- Edit `professions` in `cities.json` (values = gross annual USD)
- `averageIncome` = median across professions
- Each city must have exactly 25 profession keys (includes 数字游民 $85k fixed)

## How to Update Composite Indices

Safety/Healthcare/Freedom are pre-computed weighted composites. See `_archive/scripts/` for batch computation scripts. Missing sub-indicator weights redistribute proportionally.

## Historical Scripts

All one-time data processing scripts are in `_archive/scripts/` (30+ files). Key ones:
- `add-safety-v2.mjs` — safety index computation
- `add-healthcare-index.mjs` — healthcare index
- `add-freedom-index.mjs` — freedom index
- `nomad-compile.mjs` — nomad data compilation
- `_update-salaries.mjs` — salary batch update
