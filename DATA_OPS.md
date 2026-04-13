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

Safety/Healthcare/Governance are pre-computed weighted composites. See `scripts/merge-new-indicators.mjs` for batch computation. Missing sub-indicator weights redistribute proportionally.

### Data Integrity Rules

1. **Raw values are the single source of truth.** Normalized/inverted values (`homicideRateInv`, `gpiScoreInv`) are computation intermediaries only.
2. **If raw is null, inv MUST be null.** No inv without raw. Script: `scripts/fix-raw-data-integrity.mjs`
3. **No fabrication.** Don't estimate, interpolate, or reverse-engineer raw values from inv. Only use primary data source values.
4. **Confidence counts raw only.** `safetyConfidence` etc. are based on raw field presence (e.g. `homicideRate` not `homicideRateInv`).
5. **Normalization formulas:**
   - `homicideRateInv = 100 - minMaxNorm(homicideRate)` (across all cities)
   - `gpiScoreInv = round((5 - gpiScore) / 4 × 100)`

### Composite Index Weights

**Safety Index** (5 subs, all 0–100):
| Sub-indicator | Weight | Field | Source |
|---|---|---|---|
| Numbeo Safety Index | 30% | `numbeoSafetyIndex` | Numbeo |
| UNODC Homicide Rate (inv) | 25% | `homicideRateInv` | UNODC |
| GPI Score (inv) | 20% | `gpiScoreInv` | IEP |
| Gallup Law & Order | 15% | `gallupLawOrder` | Gallup |
| WPS Index | 10% | `wpsIndex` | Georgetown |

**Healthcare Index** (5 subs, normalized to 0–100):
| Sub-indicator | Weight | Field | Source |
|---|---|---|---|
| Doctors per 1000 | 25% | `doctorsPerThousand` | World Bank |
| Hospital Beds per 1000 | 20% | `hospitalBedsPerThousand` | World Bank |
| UHC Coverage Index | 25% | `uhcCoverageIndex` | WHO |
| Life Expectancy (norm) | 15% | `lifeExpectancy` | World Bank |
| Out-of-pocket % (inv) | 15% | `outOfPocketPct` | World Bank |

**Governance Index** (5 subs, all 0–100):
| Sub-indicator | Weight | Field | Source |
|---|---|---|---|
| Corruption Perception | 25% | `corruptionPerceptionIndex` | TI |
| Gov Effectiveness | 25% | `govEffectiveness` | World Bank WGI |
| Rule of Law | 20% | `wjpRuleLaw` | WJP |
| Press Freedom | 15% | `pressFreedomScore` | RSF |
| MIPEX | 15% | `mipexScore` | MIPEX |

### Confidence Scores

Each composite index stores a **weighted confidence** (0–100) measuring data coverage:

```
groupConfidence = sum(available sub-indicator weights)
```

Example: Safety group missing Gallup (15%) + WPS (10%) → confidence = 30+25+20 = 75.

Fields in `cities.json`:
- `safetyConfidence` — Safety group coverage (0–100)
- `healthcareConfidence` — Healthcare group coverage (0–100)
- `governanceConfidence` — Governance group coverage (0–100)
- `securityConfidence` — Average of three groups (0–100), used for SABCD grade label

**Display thresholds** (CityDetailContent.tsx):
- `securityConfidence ≥ 90` → high confidence, no label (143/150 cities)
- `70 ≤ securityConfidence < 90` → medium confidence, grade shows `*B` + "个别数据缺失，可信度一般" (4 cities)
- `securityConfidence < 70` → low confidence, grade shows `*C` + "数个数据缺失，可信度较低" (1 city: 台北 67%)
- Medium/low: grade letter turns amber warning color

**Distribution** (2026-04-13, strict raw-only):
| Range | Cities |
|---|---|
| 100% | 106 |
| 90–99% | 39 |
| 80–89% | 4 |
| <70% | 1 (台北 67%) |

Script: `scripts/update-confidence-numbers.mjs`

### SABCD Grade System

Grade is computed client-side in `CityDetailContent.tsx`:

1. `shfSum = safetyIndex + healthcareIndex + governanceIndex`
2. Rank among all cities → quartile ABCD (each 25%)
3. **S promotion**: A-grade cities where all three indices are in top 20% (`tierHigh = "good"`)

Result: S=11, A=27, B=37, C=38, D=37

## Historical Scripts

All one-time data processing scripts are in `_archive/scripts/` (30+ files). Key ones:
- `add-safety-v2.mjs` — safety index computation
- `add-healthcare-index.mjs` — healthcare index
- `add-freedom-index.mjs` — freedom index
- `nomad-compile.mjs` — nomad data compilation
- `_update-salaries.mjs` — salary batch update
