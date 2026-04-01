# Data Operations Guide

> Internal reference for maintainers. Covers where data lives, how to update it, and the scripts/tools available.

## Data Architecture

```
public/data/
  cities.json          ← 134 cities (runtime, fetched by browser)
  exchange-rates.json  ← 30 currencies stored, 10 selectable in UI (auto-updated daily)

lib/
  constants.ts         ← CITY_CLIMATE (134 entries), REGIONS, CITY_FLAG_EMOJIS, CITY_COUNTRY, POPULAR_CURRENCIES
  cityIntros.ts        ← 134 cities × 4 locales (zh/en/ja/es)
  cityLanguages.ts     ← official languages per city
  citySlug.ts          ← ID↔slug mappings, POPULAR_PAIRS (79 compare pairs)
  taxData.ts           ← tax brackets for 79 countries, city overrides, expat schemes
  taxUtils.ts          ← tax computation engine (computeNetIncome)
  clientUtils.ts       ← lifePressure calc, climate helpers
  i18n.ts              ← 4 locales, all UI strings
  types.ts             ← City, ClimateInfo, ExchangeRates types
```

## cities.json

**Location**: `public/data/cities.json`
**Structure**: `{ "cities": [ { id, name, country, continent, averageIncome, professions: {...}, costModerate, costBudget, ... } ] }`
**134 cities** (see lib/types.ts for full schema).

### How to Update Salary Data

1. Edit `public/data/cities.json` directly, or use a batch script.
2. `professions` object has 26 keys (Chinese names). Each value is gross annual USD.
3. `averageIncome` should be the median across professions, or use the most representative profession.
4. Run `npx tsc --noEmit` to validate.

**Historical script**: `_archive/scripts/update_salaries.py` (Python) — batch update profession salaries. May need adaptation for new data format.

### How to Update Cost of Living

1. Edit `costModerate` and `costBudget` in `cities.json`.
2. Budget is typically 60–75% of moderate.

**Historical script**: `_archive/scripts/update_cost_tiers.py`

### How to Update Safety/Healthcare/Freedom Indices

These are pre-computed composite indices stored in `cities.json`.

**Safety Index** (4 sub-indicators, weights: 35/30/20/15):
- Fields: `safetyIndex`, `safetyConfidence`, `numbeoSafetyIndex`, `homicideRateInv`, `gpiScoreInv`, `gallupLawOrder`
- Script: `_archive/scripts/add-safety-v2.mjs` (reads sub-indicators, computes weighted composite)

**Healthcare Index** (4 sub-indicators, weights: 35/25/25/15):
- Fields: `healthcareIndex`, `healthcareConfidence`, `doctorsPerThousand`, `hospitalBedsPerThousand`, `uhcCoverageIndex`, `lifeExpectancy`
- Script: `_archive/scripts/add-healthcare-index.mjs`

**Freedom Index** (3 sub-indicators, weights: 35/35/30):
- Fields: `freedomIndex`, `freedomConfidence`, `pressFreedomScore`, `democracyIndex`, `corruptionPerceptionIndex`
- Script: `_archive/scripts/add-freedom-index.mjs`

**Missing data handling**: When a sub-indicator is `null`, its weight is redistributed proportionally to available sub-indicators. `confidence` is set to:
- `"high"`: all sub-indicators present
- `"medium"`: 1 missing
- `"low"`: 2+ missing

### How to Update AQI

- Field: `airQuality` (number), `aqiSource` ("EPA" or "AQICN")
- China mainland cities: use AQI (CN) values directly. Set `aqiSource` to `"AQICN"` or omit.
- Others: use US EPA AQI.
- **Script**: `_archive/scripts/add_aqi.py`

### How to Add a New City

1. Add entry to `cities.json` with all required fields (use `null` for unavailable data).
2. Add to `lib/constants.ts`:
   - `CITY_CLIMATE[id] = { type, avgTempC, ... }`
   - `CITY_FLAG_EMOJIS[id] = "🇽🇽"`
   - `CITY_COUNTRY[id] = "国名"` (Chinese)
   - Add ID to appropriate `REGIONS` array
3. Add to `lib/citySlug.ts`:
   - `CITY_SLUGS[id] = "slug-name"`
   - `SLUG_TO_ID["slug-name"] = id`
4. Add to `lib/cityIntros.ts`: introductions in 4 locales.
5. Add to `lib/cityLanguages.ts`: official languages array.
6. Add to `lib/i18n.ts` → `CITY_NAME_TRANSLATIONS[id]`: name in 4 locales.
7. Run `npx tsc --noEmit` to validate.
8. Optional: Add to `POPULAR_PAIRS` in citySlug.ts for sitemap inclusion.

## Climate Data

**Location**: `lib/constants.ts` → `CITY_CLIMATE`

**Each entry**:
```typescript
id: {
  type: "temperate",       // tropical|temperate|continental|arid|mediterranean|oceanic
  avgTempC: 15.2,
  annualRainMm: 1200,
  sunshineHours: 2000,
  summerAvgC: 25,
  winterAvgC: 5,
  humidityPct: 65,
  monthlyHighC: [10,11,...],   // 12 values, Jan–Dec
  monthlyLowC: [2,3,...],      // 12 values
  monthlyRainMm: [50,45,...],  // 12 values
}
```

**Scripts**:
- `scripts/add-monthly-climate.mjs` — batch add monthly temp/rain data (134 cities)
- `_archive/scripts/add-climate-detail.mjs` — add summary fields (avgTemp, summer/winter, humidity, sunshine)

**Data sources**: WMO Climate Normals 1991–2020, NOAA NCEI, national met agencies.

## Tax Data

**Location**: `lib/taxData.ts`

**Structure**: `COUNTRY_TAX` — Record from Chinese country name → tax config.

**Each country config**:
```typescript
{
  usdToLocal: number,           // fixed FX rate
  brackets: TaxBracket[],       // { upTo, rate }[]
  social: SocialComponent[],    // { name, rate, annualBaseCap?, annualAbsCap? }[]
  standardDeduction: number,    // fixed deduction from taxable
  employeeDeduction?: { rate, min?, max?, afterSocial? },
  expatScheme?: ExpatScheme,    // optional expat tax benefit
  confidence: "high" | "medium" | "low",
  dataIsLikelyNet?: boolean,    // skip deduction for countries with net-basis data
}
```

**City-level overrides**: `CITY_TAX_OVERRIDES[cityId]` — for US state tax, Canadian provincial tax.

**To add a new country's tax**:
1. Add entry to `COUNTRY_TAX["国名"]` in `taxData.ts`.
2. Provide: USD→local rate, progressive brackets, social components, standard deduction.
3. Optionally add expat scheme and city overrides.
4. Set confidence level.

**Special cases**:
- Japan: custom `japanEmploymentDeduction()` + 10% resident tax
- Korea: custom `koreanEmploymentDeduction()`
- Denmark: AM-bidrag pre-tax 8%
- Gulf states (UAE, Qatar, Bahrain, Oman, Saudi): zero income tax

## Exchange Rates

**Location**: `public/data/exchange-rates.json`

**Structure**: `{ "rates": { "EUR": 0.92, ... }, "symbols": { "EUR": "€", ... } }`

**30 currencies stored** (USD, EUR, GBP, JPY, CNY, HKD, AUD, CAD, SGD, INR, THB, MYR, VND, PHP, IDR, PKR, EGP, TRY, BRL, MXN, ZAR, SEK, NOK, CHF, NZD, DKK, RUB, GEL, NGN, COP). **10 selectable in UI** (POPULAR_CURRENCIES in constants.ts): USD, EUR, GBP, JPY, CNY, HKD, AUD, CAD, SGD, INR.

**To update**: Automated via GitHub Actions (daily cron). The workflow runs `scripts/update-rates.mjs`, which fetches latest rates from ExchangeRate-API and commits changes. Can also be triggered manually from the Actions tab. See `.github/workflows/update-exchange-rates.yml`.

## i18n

**Location**: `lib/i18n.ts`

**Structure**: `TRANSLATIONS` object with 4 locale keys (zh, en, ja, es), each containing ~300 string keys.

**Other i18n data**:
- `CITY_NAME_TRANSLATIONS[id]` — city names in 4 locales
- `COUNTRY_TRANSLATIONS[zh_name]` — country names in 4 locales
- `LANGUAGE_LABELS` — locale names (e.g., "简体中文", "English")
- `PROFESSION_TRANSLATIONS[zh_name]` — profession names in 4 locales

**To add a new i18n key**: Add to ALL 4 locale blocks in TRANSLATIONS.

## Sitemap

**Location**: `app/sitemap.ts`

Automatically generates from `CITY_SLUGS` and `POPULAR_PAIRS`. No manual update needed when adding cities (just update citySlug.ts).

## Validation

Run these after any data change:
```bash
npx tsc --noEmit          # TypeScript type check
npm run build             # Full build validation
```

## Data Update Checklist (Annual)

1. [ ] Update salary data in cities.json (26 professions × 134 cities)
2. [ ] Update costModerate / costBudget in cities.json
3. [ ] Update house prices and rents in cities.json
4. [ ] Update AQI values (IQAir annual report)
5. [ ] Update safety sub-indicators → re-run add-safety-v2.mjs
6. [ ] Update healthcare sub-indicators → re-run add-healthcare-index.mjs
7. [ ] Update freedom sub-indicators → re-run add-freedom-index.mjs
8. [ ] Update work hours / paid leave
9. [ ] Update internet speeds
10. [ ] Update direct flight counts
11. [ ] Update Big Mac prices (The Economist Jan edition)
12. [x] ~~Update exchange rates~~ (automated daily via GitHub Actions)
13. [ ] Update tax brackets in taxData.ts (check for law changes)
14. [ ] Update `dataLastUpdated` string in i18n.ts (all 4 locales)
15. [ ] Run `npx tsc --noEmit` and `npm run build`
16. [ ] Commit and push
