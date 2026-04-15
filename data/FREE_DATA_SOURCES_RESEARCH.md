# Free Data Sources Research — Zero Legal Risk for Commercial Use

> Research date: 2026-04-15  
> Scope: 120 global cities, WhichCity commercial product  
> Standard: Only CC BY, CC0, Public Domain, OGL, or equivalent open licenses

---

## Table of Contents

- [A. Monthly Living Cost](#a-monthly-living-cost)
- [B. Monthly Rent](#b-monthly-rent)
- [C. House Price](#c-house-price)
- [D. Safety Index](#d-safety-index)
- [E. Internet Speed](#e-internet-speed)
- [F. Peace/Conflict Index](#f-peaceconflict-index)
- [G. Democracy Index](#g-democracy-index)
- [H. Law & Order / Rule of Law](#h-law--order--rule-of-law)
- [Summary Matrix](#summary-matrix)
- [Recommended Strategy](#recommended-strategy)

---

## A. Monthly Living Cost

### A1. USA — BLS Consumer Expenditure Survey (CEX)

| Field | Value |
|---|---|
| **URL** | https://www.bls.gov/cex/ |
| **License** | **Public Domain** — US federal government data; no copyright restriction. BLS states: "Linking and Copyright Information — BLS data are in the public domain." |
| **Granularity** | **23 MSAs** (metro areas): New York, Los Angeles, Chicago, Houston, Dallas, Philadelphia, Washington DC, Miami, Atlanta, Boston, San Francisco, Phoenix, Detroit, Seattle, Minneapolis, St. Louis, Tampa, Denver, Baltimore, San Diego, Pittsburgh, Portland, Honolulu. Also 4 regions, 9 divisions, 4 states. |
| **Coverage** | ~12 of our US cities directly; others can be estimated from region/division |
| **Format** | Published tables (XLS/PDF), Public Use Microdata (SAS, Stata, CSV) |
| **Download** | https://www.bls.gov/cex/pumd_data.htm (microdata) or https://www.bls.gov/cex/tables/geographic/mean.htm (tables) |
| **Update** | Annual (latest: 2024 data released Dec 2025) |
| **Example (NYC)** | Average annual expenditure ~$78,535 nationally; NYC MSA data in tables |
| **Limitation** | Only 23 US MSAs. No non-US data. Single-person household data available via microdata filtering. |
| **Verdict** | ✅ **SAFE** for US cities. Need microdata processing for single-person. |

### A2. World Bank ICP (International Comparison Program)

| Field | Value |
|---|---|
| **URL** | https://www.worldbank.org/en/programs/icp |
| **License** | **CC BY 4.0** (World Bank standard) |
| **Granularity** | **Country-level only** — no city-level PPP data published |
| **Coverage** | 176 economies |
| **Format** | Excel, API |
| **Limitation** | Country-level PPP ratios only. Cannot derive city-level living costs directly. Useful as a cross-country adjustment factor. |
| **Verdict** | ⚠️ Country-level only. Useful as **adjustment multiplier**, not primary source. |

### A3. OECD Regional Well-Being / Regional Statistics

| Field | Value |
|---|---|
| **URL** | https://www.oecd.org/en/data/datasets/oecd-regional-statistics.html |
| **License** | OECD terms — free for non-commercial; **commercial use requires license agreement** |
| **Granularity** | TL2/TL3 regions (states/provinces) for OECD countries |
| **Limitation** | Not city-level. OECD license is NOT open — commercial use requires permission. |
| **Verdict** | ❌ **NOT FREE** for commercial use. |

### A4. National Statistics Offices — Country by Country

#### Japan — Statistics Bureau (e-Stat)
| Field | Value |
|---|---|
| **URL** | https://www.e-stat.go.jp/ (Family Income and Expenditure Survey) |
| **License** | Terms: free to use with attribution for most data; some restrictions apply. Japan government policy generally allows non-commercial use; commercial use requires confirmation per dataset. |
| **Granularity** | Prefecture-level and major city level |
| **Verdict** | ⚠️ **GRAY AREA** — need to verify commercial use terms per specific dataset |

#### UK — ONS Family Spending
| Field | Value |
|---|---|
| **URL** | https://www.ons.gov.uk/peoplepopulationandcommunity/personalandhouseholdfinances/expenditure |
| **License** | **Open Government Licence v3.0 (OGL)** — explicitly allows commercial use with attribution |
| **Granularity** | National/regional (not city-level) |
| **Verdict** | ✅ **SAFE** but regional only (England/Scotland/Wales/NI), not London-specific |

#### Germany — Destatis
| Field | Value |
|---|---|
| **URL** | https://www.destatis.de/EN/Themes/Society-Environment/Income-Consumption-Living-Conditions/_node.html |
| **License** | "Datenlizenz Deutschland – Namensnennung – Version 2.0" (Germany Data License – Attribution 2.0) — **allows commercial use** with attribution |
| **Granularity** | Federal states (Bundesländer), not city level |
| **Verdict** | ✅ **SAFE** but state-level only |

#### France — INSEE
| Field | Value |
|---|---|
| **URL** | https://www.insee.fr/en/statistiques |
| **License** | "Licence Ouverte / Open Licence v2.0" — **allows commercial use** with attribution |
| **Granularity** | Département and commune level for some indicators |
| **Verdict** | ✅ **SAFE** license. Some city-level data available. |

#### Australia — ABS
| Field | Value |
|---|---|
| **URL** | https://www.abs.gov.au/statistics/economy/finance/household-expenditure-survey |
| **License** | **CC BY 4.0** |
| **Granularity** | State/territory level; capital city vs. rest of state |
| **Verdict** | ✅ **SAFE**. Sydney/Melbourne/Brisbane etc. available as "capital city" aggregates. |

#### Canada — StatCan
| Field | Value |
|---|---|
| **URL** | https://www150.statcan.gc.ca/n1/en/type/data |
| **License** | "Open Government Licence – Canada" — **allows commercial use** |
| **Granularity** | Province and CMA (Census Metropolitan Area) level |
| **Verdict** | ✅ **SAFE**. Toronto, Vancouver, Montreal, Calgary, Ottawa available. |

#### South Korea — KOSTAT
| Field | Value |
|---|---|
| **URL** | https://kostat.go.kr/anse/ |
| **License** | Korea Open Government Data License — generally allows commercial reuse |
| **Granularity** | Province/metropolitan city level |
| **Verdict** | ✅ Likely **SAFE**. Seoul, Busan available. |

#### China — NBS
| Field | Value |
|---|---|
| **URL** | https://data.stats.gov.cn/ |
| **License** | No explicit open license. Chinese government data generally lacks clear commercial reuse terms. |
| **Granularity** | Province-level and some city-level data |
| **Verdict** | ⚠️ **GRAY AREA** — no clear open license for commercial reuse |

#### India — MOSPI
| Field | Value |
|---|---|
| **URL** | https://mospi.gov.in/ |
| **License** | India Open Government Data License (OGDL-India) — **allows commercial use** |
| **Granularity** | State-level mainly; some urban/rural breakdowns |
| **Verdict** | ✅ **SAFE** but limited city-level granularity |

#### Brazil — IBGE
| Field | Value |
|---|---|
| **URL** | https://www.ibge.gov.br/ |
| **License** | Creative Commons terms vary by dataset; POF (Family Budget Survey) generally open |
| **Granularity** | Metropolitan areas for some surveys |
| **Verdict** | ⚠️ Check per-dataset license. São Paulo, Rio likely available. |

### A5. Open-Source / Crowdsourced Approaches

#### Wikidata Cost of Living
- No structured cost-of-living properties exist in Wikidata as of 2026.
- **Verdict**: ❌ Not available

#### GitHub Open Cost-of-Living Projects
- Several scraper projects exist but all scrape from Numbeo or similar proprietary sources.
- No independent open cost-of-living database found.
- **Verdict**: ❌ No viable option

### A-STRATEGY: Living Cost Recommendation

**Patchwork approach** combining:
1. **BLS CEX** for US cities (Public Domain) — 12-15 cities
2. **World Bank PPP** (CC BY 4.0) as cross-country adjustment factor
3. **National statistics offices** for major countries with open licenses: UK (OGL), Germany (DL-DE), France (Licence Ouverte), Australia (CC BY 4.0), Canada (OGL-Canada)
4. **BigMac Index values** (already in your data) as cross-validation

**Coverage gap**: ~30-40% of cities will lack direct government data. Would need manual research or keep existing Numbeo data (with proper licensing from Numbeo).

---

## B. Monthly Rent

### B1. USA — HUD Fair Market Rents (FMR)

| Field | Value |
|---|---|
| **URL** | https://www.huduser.gov/portal/datasets/fmr.html |
| **License** | **Public Domain** — US federal government data |
| **Granularity** | Every MSA and county in the US. Small Area FMRs available at ZIP code level. |
| **Coverage** | All US cities in our dataset |
| **Format** | Excel, CSV, **API available** (https://www.huduser.gov/portal/dataset/fmr-api.html) |
| **Download** | API or bulk download |
| **Update** | Annual (FY2026 current) |
| **Example (NYC)** | FY2026 FMR for 2BR in NY-Newark-Jersey City MSA: ~$2,183 (40th percentile) |
| **What it measures** | 40th percentile gross rent (includes utilities) for standard quality units |
| **Verdict** | ✅ **SAFE**. Excellent for US. Note: 40th percentile = modest, not median. |

### B2. USA — Census ACS Median Gross Rent

| Field | Value |
|---|---|
| **URL** | https://data.census.gov/ (Table B25064) |
| **License** | **Public Domain** — US Census data |
| **Granularity** | City (place), county, MSA, ZIP code, census tract |
| **Coverage** | All US cities |
| **Format** | API, CSV via data.census.gov |
| **Update** | Annual (1-year estimates for pop >65K; 5-year for smaller areas) |
| **Example (NYC)** | Median gross rent NYC ~$1,800+ (2024 ACS) |
| **Verdict** | ✅ **SAFE**. Better than FMR for "typical" rent since it's median actual rents. |

### B3. USA — Zillow ZORI (Observed Rent Index)

| Field | Value |
|---|---|
| **URL** | https://www.zillow.com/research/data/ |
| **License** | **Zillow Terms of Use** — publicly downloadable CSV files. Terms require attribution. Zillow states data is for "informational purposes." The Terms of Use (https://www.zillow.com/corporate/terms-of-use/) restrict redistribution but the research data CSVs are published for public use. |
| **Granularity** | Metro, city, ZIP, neighborhood |
| **Coverage** | ~400 US metro areas |
| **Format** | CSV download |
| **Update** | Monthly |
| **Verdict** | ⚠️ **GRAY AREA** — data is downloadable but TOU may restrict commercial redistribution of raw values. Need legal review. Safer to use Census ACS or HUD FMR. |

### B4. UK — ONS Private Rental Market Statistics

| Field | Value |
|---|---|
| **URL** | https://www.ons.gov.uk/peoplepopulationandcommunity/housing/datasets/privaterentalmarketsummarystatisticsinengland |
| **License** | **Open Government Licence v3.0** — explicitly allows commercial use. Quote from footer: "All content is available under the Open Government Licence v3.0" |
| **Granularity** | Region and **local authority district** (London boroughs available) |
| **Coverage** | London, Manchester, Birmingham, Edinburgh (via Scotland equivalent) |
| **Format** | XLS |
| **Update** | Was annual; **discontinued after Oct 2022-Sep 2023 edition**. Replaced by ONS "Index of Private Housing Rental Prices" (indices, not levels) |
| **Verdict** | ✅ **SAFE** license, but ⚠️ **discontinued** as of 2023. Last data usable as baseline. New index is % changes only. |

### B5. UK — VOA (Valuation Office Agency) Private Rental Market Statistics

| Field | Value |
|---|---|
| **URL** | https://www.gov.uk/government/statistics/private-rental-market-statistics |
| **License** | **OGL v3.0** |
| **Granularity** | Local authority, region, England only |
| **Format** | Excel |
| **Verdict** | ✅ **SAFE**. Median monthly rent by area and bedroom count. |

### B6. Europe — Eurostat Housing Cost Statistics

| Field | Value |
|---|---|
| **URL** | https://ec.europa.eu/eurostat/web/housing/database |
| **License** | Eurostat "free reuse policy" — data can be reused for commercial/non-commercial purposes with attribution. Commission Decision 2011/833/EU. |
| **Granularity** | NUTS2 regions (not city-level). Some city-level data in "Urban Audit" |
| **Coverage** | EU + EEA countries |
| **Format** | Various (TSV, SDMX, JSON API) |
| **Verdict** | ✅ **SAFE** license. But granularity is mostly regional, not city-level for rent. |

### B7. Japan — MLIT (Ministry of Land) Rent Statistics

| Field | Value |
|---|---|
| **URL** | https://www.mlit.go.jp/statistics/details/t-jutaku-2_tk_000002.html |
| **License** | Japanese government data — generally reusable under "Statistics Act" with attribution |
| **Granularity** | Prefecture and major city |
| **Verdict** | ⚠️ License terms not as clear as Western open data. Tokyo, Osaka available. |

### B8. Australia — State Government Rental Reports

| Field | Value |
|---|---|
| **URL** | NSW: https://www.facs.nsw.gov.au/resources/statistics/rent-and-sales/dashboard; VIC: https://www.dffh.vic.gov.au/rental-report |
| **License** | Generally **CC BY 4.0** (Australian government standard) |
| **Granularity** | City, suburb level |
| **Coverage** | Sydney, Melbourne, Brisbane, Perth |
| **Verdict** | ✅ **SAFE**. Excellent Australian city coverage. |

### B9. Canada — CMHC Rental Market Survey

| Field | Value |
|---|---|
| **URL** | https://www.cmhc-schl.gc.ca/professionals/housing-markets-data-and-research/housing-data/data-tables/rental-market |
| **License** | CMHC data is free to access; terms allow use with attribution |
| **Granularity** | CMA (Census Metropolitan Area) = city level |
| **Coverage** | Toronto, Vancouver, Montreal, Calgary, Ottawa, etc. |
| **Verdict** | ✅ **SAFE** — Canadian government crown corporation data |

### B10. Singapore — URA/HDB Rental Data

| Field | Value |
|---|---|
| **URL** | https://data.gov.sg/ |
| **License** | **Singapore Open Data Licence** — allows commercial use |
| **Granularity** | District/town level |
| **Verdict** | ✅ **SAFE** |

### B-STRATEGY: Rent Recommendation

**Primary sources by region:**
| Region | Source | License |
|---|---|---|
| USA (all cities) | Census ACS Median Gross Rent + HUD FMR | Public Domain |
| UK | VOA Private Rental Market Statistics | OGL v3.0 |
| Australia | State rental reports | CC BY 4.0 |
| Canada | CMHC Rental Market Survey | Open Gov License |
| Singapore | data.gov.sg | SG Open Data |
| Europe (others) | National statistics offices | Varies (mostly open) |
| Japan/Korea/etc. | National statistics offices | Needs verification |

**Coverage**: ~60-70% of our 120 cities directly from government sources. The remaining 30-40% (Latin America, Middle East, Southeast Asia, Africa) will have gaps.

---

## C. House Price

### C1. USA — FHFA House Price Index (HPI)

| Field | Value |
|---|---|
| **URL** | https://www.fhfa.gov/data/hpi |
| **License** | **Public Domain** — US federal agency data |
| **Granularity** | **National, state, 400+ metro areas, county, ZIP code, census tract** |
| **Coverage** | All US cities |
| **Format** | CSV, Excel |
| **Update** | Monthly and quarterly |
| **What it measures** | Index (not dollar values). Measures % change in home values over time. Base period = 100. |
| **Example (NYC)** | NYC metro HPI ~700+ (base 1991Q1=100) — meaning ~7x price increase since 1991 |
| **Limitation** | **INDEX ONLY** — not absolute dollar values. Need a reference price point to convert. |
| **Verdict** | ✅ **SAFE**. Excellent for trends but need to combine with another source for absolute $/sqm values. |

### C2. USA — Zillow ZHVI

| Field | Value |
|---|---|
| **URL** | https://www.zillow.com/research/data/ |
| **License** | Publicly downloadable CSVs. Zillow's Terms of Use govern usage. Attribution required: "Zillow Home Value Index (ZHVI)" |
| **Granularity** | Metro, city, county, ZIP, neighborhood |
| **What it measures** | Typical home value ($) — 35th to 65th percentile |
| **Example (NYC)** | NYC metro typical value ~$600K+ |
| **Verdict** | ⚠️ **GRAY AREA** — same concern as ZORI. Data is freely downloadable but TOU may restrict commercial redistribution of individual values. Many commercial products use it with attribution. **Lower risk than Numbeo** but still not explicitly open-licensed. |

### C3. USA — Census ACS Median Home Value

| Field | Value |
|---|---|
| **URL** | https://data.census.gov/ (Table B25077) |
| **License** | **Public Domain** |
| **Granularity** | City, county, MSA, census tract |
| **Example (NYC)** | Median home value for NYC: ~$650K+ (2024 ACS) |
| **Verdict** | ✅ **SAFE**. Best legally clean source for absolute US home values. |

### C4. UK — HM Land Registry Price Paid Data

| Field | Value |
|---|---|
| **URL** | https://www.gov.uk/government/statistical-data-sets/price-paid-data-downloads |
| **License** | **Open Government Licence v3.0** — "HM Land Registry permits you to use the Price Paid Data for commercial or non-commercial purposes" (quoted from their site) |
| **Granularity** | **Individual property transactions** — can aggregate to any geography |
| **Coverage** | London, Manchester, Birmingham, Edinburgh (all England & Wales) |
| **Format** | CSV, TXT (~5GB complete file), linked data |
| **Update** | Monthly (20th working day) |
| **Example** | Can compute median sale price for any postcode district |
| **Limitation** | Address data has Royal Mail restrictions for non-residential-price purposes, but price aggregates are fine |
| **Verdict** | ✅ **SAFE**. Gold standard for UK house prices. |

### C5. BIS Residential Property Prices

| Field | Value |
|---|---|
| **URL** | https://data.bis.org/topics/RPP |
| **License** | Quote: "The use of the statistics is unrestricted, provided that: (a) if the statistics are reproduced, the BIS must be cited... (d) if the statistics will be used in a commercial publication or product, **their inclusion in the publication or product will not result in any additional charge** to subscribers or other users" |
| **Granularity** | **Country-level** (index, not absolute values). "Detailed" dataset has some regional breakdowns for ~60 economies. |
| **Coverage** | 60+ countries |
| **Format** | CSV bulk download, SDMX API |
| **Update** | Quarterly |
| **Limitation** | INDEX ONLY (not $/sqm). Country-level primarily. Condition (d) means you can't charge extra for BIS data specifically — fine for WhichCity since it's a free tool. |
| **Verdict** | ✅ **SAFE** for free products. Useful as country-level house price trend index. |

### C6. Japan — MLIT Land Price Publication

| Field | Value |
|---|---|
| **URL** | https://www.land.mlit.go.jp/webland/ |
| **License** | Japanese government — generally reusable |
| **Granularity** | Point-level land prices (specific locations) |
| **Verdict** | ✅ Likely safe. Tokyo, Osaka, Kyoto available. |

### C-STRATEGY: House Price Recommendation

| Region | Source | License | Data type |
|---|---|---|---|
| USA | Census ACS Median Home Value | Public Domain | Absolute $ |
| USA (trend) | FHFA HPI | Public Domain | Index |
| UK | HM Land Registry PPD | OGL v3.0 | Transaction-level |
| Global (trend) | BIS RPP | Open with attribution | Index |
| Others | National statistics offices | Varies | Varies |

---

## D. Safety Index

### D1. USA — FBI Crime Data Explorer (UCR/NIBRS)

| Field | Value |
|---|---|
| **URL** | https://cde.ucr.cjis.gov/LATEST/webapp/#/pages/downloads |
| **License** | **Public Domain** — US federal government data |
| **Granularity** | **Agency-level** (city police departments = city level). Incident-based data (NIBRS) available by state. |
| **Coverage** | All US cities — NIBRS covers ~95% of US population |
| **Format** | CSV downloads, REST API (https://crime-data-explorer.fr.cloud.gov/pages/docApi) |
| **Update** | Annual (2024 data released Aug 2025) |
| **Data available** | Violent crime, property crime, homicide, robbery, assault, burglary — per city per year |
| **Example (NYC)** | NYPD reports to UCR. Violent crime rate per 100K: ~350 |
| **Verdict** | ✅ **SAFE**. Excellent for US city-level safety scoring. Can compute composite safety index from crime rates. |

### D2. UK — Home Office Police Recorded Crime / data.police.uk

| Field | Value |
|---|---|
| **URL** | https://data.police.uk/ |
| **License** | **Open Government Licence v3.0** |
| **Granularity** | **Street-level** crime data (can aggregate to city) |
| **Coverage** | England, Wales, Northern Ireland (all police forces) |
| **Format** | CSV monthly downloads, API |
| **Update** | Monthly |
| **Example (London)** | Full street-level crime data for Metropolitan Police |
| **Verdict** | ✅ **SAFE**. Extremely granular, perfect for London/Manchester/Birmingham. |

### D3. Eurostat Crime Statistics

| Field | Value |
|---|---|
| **URL** | https://ec.europa.eu/eurostat/web/crime/database |
| **License** | Eurostat free reuse policy (Commission Decision 2011/833/EU) — commercial use with attribution |
| **Granularity** | **Country-level** for most tables; some NUTS2 regional data |
| **Coverage** | EU + EEA countries |
| **Format** | TSV, SDMX API |
| **Verdict** | ✅ **SAFE** license. But mostly country-level. Can supplement with national sources. |

### D4. UNODC Homicide Statistics

| Field | Value |
|---|---|
| **URL** | https://dataunodc.un.org/dp-intentional-homicide-victims |
| **License** | UN data — generally free to reuse with attribution. UNODC Global Study uses CC BY-NC-SA for publications, but the **raw data** has more permissive terms. |
| **Granularity** | **Country-level** (some sub-national for specific countries) |
| **Coverage** | ~200 countries |
| **Verdict** | ⚠️ Data itself is usable but license terms for the raw data API are not explicit CC. Need verification. Already have homicideRate in current data. |

### D5. National Police Statistics — Other Countries

Many countries publish open crime data:
- **Germany**: PKS (Polizeiliche Kriminalstatistik) — published annually, state-level
- **France**: SSMSI crime statistics — commune-level under Licence Ouverte
- **Japan**: NPA crime statistics — prefecture-level
- **Australia**: ABS Recorded Crime — CC BY 4.0, state-level
- **Canada**: Statistics Canada UCR — Open Government Licence, CMA-level

### D-STRATEGY: Safety Index Recommendation

**Build a composite city-level safety score from:**
1. **FBI NIBRS** for US cities (Public Domain) — homicide rate, violent crime rate
2. **data.police.uk** for UK cities (OGL) — crime rates per capita
3. **National police stats** for major countries with open data
4. **Existing homicideRate** (already in data, from UNODC) for country-level fallback
5. **WGI Rule of Law** (see section H) as a governance-quality proxy

**This replaces Numbeo Safety Index with a more rigorous, multi-source, fully-open alternative.**

---

## E. Internet Speed

### E1. M-Lab NDT (Network Diagnostic Tool)

| Field | Value |
|---|---|
| **URL** | https://www.measurementlab.net/data/ |
| **License** | **CC0 (No Rights Reserved)** — Quote from their site: "All data collected by M-Lab tests are available to the public without restriction under a No Rights Reserved Creative Commons Zero Waiver" |
| **Granularity** | **Individual test results with lat/lon** — can aggregate to any geography including city |
| **Coverage** | Global — billions of tests worldwide |
| **Format** | Google BigQuery (free tier available), Google Cloud Storage (raw) |
| **Update** | Continuous (24-hour delay) |
| **BigQuery access** | `measurement-lab.ndt.unified_downloads` and `measurement-lab.ndt.unified_uploads` |
| **Sample query** | ```sql SELECT client_geo.city, client_geo.country_code, APPROX_QUANTILES(a.MeanThroughputMbps, 100)[OFFSET(50)] AS median_download_mbps, COUNT(*) as test_count FROM `measurement-lab.ndt.unified_downloads` WHERE date BETWEEN '2025-01-01' AND '2025-12-31' AND client_geo.city = 'New York' GROUP BY 1, 2``` |
| **Example (NYC)** | Median download ~120-200 Mbps (varies by period) |
| **Verdict** | ✅ **SAFE — BEST OPTION**. CC0 = zero restrictions. City-level aggregation trivial via BigQuery. |

### E2. Cloudflare Radar

| Field | Value |
|---|---|
| **URL** | https://radar.cloudflare.com/ |
| **License** | Cloudflare Radar is publicly viewable but **no open data license for bulk downloads**. API exists but terms restrict commercial redistribution. |
| **Verdict** | ❌ **NOT SAFE** for commercial data extraction |

### E3. Steam Hardware Survey

| Field | Value |
|---|---|
| **URL** | https://store.steampowered.com/hwsurvey |
| **License** | No open license. Aggregated statistics only, no geographic data. |
| **Verdict** | ❌ Not applicable |

### E-STRATEGY: Internet Speed Recommendation

**M-Lab NDT is the clear winner.** CC0 license, global coverage, city-level aggregation possible. Replace Ookla entirely.

Implementation steps:
1. Query BigQuery for median download/upload speeds per city (2025 data)
2. Filter for sufficient sample size (>1000 tests per city)
3. Our 120 cities should all have substantial test coverage

---

## F. Peace/Conflict Index

### F1. UCDP (Uppsala Conflict Data Program)

| Field | Value |
|---|---|
| **URL** | https://ucdp.uu.se/downloads/ |
| **License** | **CC BY 4.0** — Quote: "All datasets are free of charge and licensed under CC BY 4.0 — you are free to use and redistribute them provided you cite the relevant publications" |
| **Granularity** | **Event-level (georeferenced)** for the GED dataset; **Country-year** for aggregate datasets |
| **Coverage** | Global, 1946-2024 (yearly datasets), 1989-2024 (event data) |
| **Format** | CSV, Excel, R, Stata |
| **Download** | Direct CSV: https://ucdp.uu.se/downloads/ged/ged251-csv.zip |
| **Key datasets** | - **UCDP GED** (Georeferenced Event Dataset) — events with lat/lon, can compute per-city conflict intensity<br>- **Country-Year Organized Violence** — deaths per country per year<br>- **UCDP/PRIO Armed Conflict Dataset** — active conflicts per country |
| **API** | https://ucdp.uu.se/apidocs/ (JSON REST API) |
| **Update** | Annual (v25.1 current) + monthly candidate events |
| **Example** | Can compute: "number of conflict-related deaths within 200km of city X in past 5 years" |
| **Verdict** | ✅ **SAFE**. CC BY 4.0, excellent data quality, georeferenced. |

### F2. World Bank — Political Stability and Absence of Violence

| Field | Value |
|---|---|
| **URL** | https://datacatalog.worldbank.org/search/dataset/0038026 |
| **License** | **CC BY 4.0** |
| **Indicator code** | `PV.EST` (Political Stability estimate, -2.5 to +2.5) and now 0-100 absolute score |
| **API** | `https://api.worldbank.org/v2/country/USA/indicator/PV.EST?format=json` |
| **Granularity** | **Country-level** |
| **Coverage** | 200+ economies, 1996-2024 |
| **Example (USA)** | PV.EST ~0.3 (on -2.5 to +2.5 scale) |
| **Verdict** | ✅ **SAFE**. Country-level complement to UCDP event data. |

### F3. Fragile States Index (Fund for Peace)

| Field | Value |
|---|---|
| **URL** | https://fragilestatesindex.org/ |
| **License** | **CC BY — with restrictions**. The Fund for Peace publishes annual rankings. Data is downloadable but their terms state: "The Fragile States Index and its data are made available for non-commercial, academic, journalistic, and governmental use under the Creative Commons Attribution (CC BY) license." **Commercial use** may require permission. |
| **Verdict** | ⚠️ **GRAY AREA** — CC BY stated but with non-commercial qualification in text. Contradictory. Avoid for safety. |

### F-STRATEGY: Peace/Conflict Recommendation

**Replace GPI with:**
1. **UCDP Country-Year Organized Violence** (CC BY 4.0) — battle deaths per country
2. **World Bank Political Stability** (CC BY 4.0) — governance perception indicator
3. **UCDP GED** event data for computing city-proximity conflict intensity (bonus)

Both are strictly superior in legal terms to IEP's GPI (which has no open license).

---

## G. Democracy Index

### G1. V-Dem (Varieties of Democracy)

| Field | Value |
|---|---|
| **URL** | https://www.v-dem.net/data/the-v-dem-dataset/ |
| **License** | **CC BY-SA 4.0** — stated in their codebook and terms. The "SA" (ShareAlike) means derivatives must also be CC BY-SA, but **commercial use is explicitly allowed**. |
| **Granularity** | **Country-year** |
| **Coverage** | 202 countries, 1789-2025 |
| **Format** | CSV, Stata, R, SPSS |
| **Key variables** | - `v2x_polyarchy` — Electoral Democracy Index (0-1)<br>- `v2x_libdem` — Liberal Democracy Index (0-1)<br>- `v2x_partipdem` — Participatory Democracy Index<br>- `v2x_delibdem` — Deliberative Democracy Index<br>- `v2x_egaldem` — Egalitarian Democracy Index<br>- 531 indicators total, 95 indices |
| **Version** | v16 (published March 2026) |
| **Example (USA)** | `v2x_libdem` ≈ 0.79 (2024) |
| **Verdict** | ✅ **SAFE**. CC BY-SA 4.0 allows commercial use. Most comprehensive democracy dataset in existence. Far superior to EIU's Democracy Index. |

### G2. Polity5 / Center for Systemic Peace

| Field | Value |
|---|---|
| **URL** | https://www.systemicpeace.org/polityproject.html |
| **License** | "Free for academic use." Commercial use terms are not explicitly stated. The original Polity IV/V data is downloadable but there's no standard open license. |
| **Status** | Polity5 updated through 2018. The project has been less active. |
| **Verdict** | ⚠️ **GRAY AREA** — no explicit open license. V-Dem is strictly better. |

### G3. Freedom House — Freedom in the World

| Field | Value |
|---|---|
| **URL** | https://freedomhouse.org/report/freedom-world |
| **License** | CC BY 4.0 for the report text. **However**, the underlying country scores data has specific terms: "Data may be used for non-commercial or commercial purposes with attribution." Recent versions state CC BY 4.0. |
| **Granularity** | Country-level |
| **Coverage** | 195 countries + 15 territories |
| **Format** | Excel download |
| **Verdict** | ✅ **SAFE** (if confirmed CC BY 4.0 for data). Simpler than V-Dem but complementary. |

### G-STRATEGY: Democracy Index Recommendation

**Replace EIU Democracy Index with V-Dem `v2x_libdem` (Liberal Democracy Index).**
- CC BY-SA 4.0 = commercially safe
- More granular and transparent than EIU
- 531 indicators vs. EIU's opaque scoring
- Free download vs. EIU's paywall

---

## H. Law & Order / Rule of Law

### H1. World Bank WGI — Rule of Law

| Field | Value |
|---|---|
| **URL** | https://www.worldbank.org/en/publication/worldwide-governance-indicators |
| **License** | **CC BY 4.0** — Quote from Data Catalog: "License: Creative Commons Attribution 4.0" |
| **Indicator code** | `RL.EST` (Rule of Law estimate). Also available: 0-100 absolute score (new in 2025 revision) |
| **API** | `https://api.worldbank.org/v2/country/USA/indicator/RL.EST?format=json` |
| **Granularity** | **Country-level**, 200+ economies |
| **Coverage** | All countries in our dataset |
| **Format** | Excel, Stata, API |
| **Update** | Annual (2025 edition is latest, covers 1996-2024) |
| **Example (USA)** | RL.EST ≈ 1.45 (on -2.5 to +2.5 scale); absolute score ≈ 80/100 |
| **Download** | https://datacatalogfiles.worldbank.org/ddh-published/0038026/DR0095947/wgidataset_with_sourcedata-2025.xlsx |
| **All 6 WGI dimensions** | Voice & Accountability (`VA`), Political Stability (`PV`), Government Effectiveness (`GE`), Regulatory Quality (`RQ`), Rule of Law (`RL`), Control of Corruption (`CC`) |
| **Verdict** | ✅ **SAFE**. CC BY 4.0, gold standard for governance measurement. Already used in your dataset (`govEffectiveness`). |

### H2. World Justice Project — Rule of Law Index

| Field | Value |
|---|---|
| **URL** | https://worldjusticeproject.org/rule-of-law-index |
| **License** | WJP states data is "freely available" and allows citation. However, full dataset download requires agreement to terms. The terms state: "You may use, reproduce, and distribute the WJP Rule of Law Index for non-commercial or commercial purposes, provided that you include proper attribution." |
| **Granularity** | Country-level, with some city-level survey data |
| **Coverage** | 142 countries |
| **Verdict** | ✅ **SAFE** if terms confirmed to allow commercial use. Already in your data as `wjpRuleLaw`. |

---

## Summary Matrix

| Category | Current Source | Replacement | License | Granularity | Coverage of 120 cities |
|---|---|---|---|---|---|
| **Living Cost** | Numbeo | BLS CEX + National Stats | Public Domain + OGL/CC BY | City (US) / Region (others) | ~50-60% direct |
| **Rent** | Numbeo | Census ACS + HUD FMR + National Stats | Public Domain + OGL/CC BY | City-level (US/UK/AU/CA) | ~60-70% direct |
| **House Price** | Numbeo + GPG | Census ACS + HM Land Registry + FHFA | Public Domain + OGL | City-level (US/UK) | ~40-50% direct |
| **Safety Index** | Numbeo | FBI NIBRS + data.police.uk + National Police | Public Domain + OGL | City-level | ~50-60% direct |
| **Internet Speed** | Ookla | **M-Lab NDT** | **CC0** | City-level (global) | ~95%+ |
| **Peace Index** | IEP GPI | **UCDP + WB Political Stability** | **CC BY 4.0** | Country + georef events | 100% |
| **Democracy** | EIU | **V-Dem** | **CC BY-SA 4.0** | Country | 100% |
| **Rule of Law** | Gallup | **WB WGI Rule of Law** | **CC BY 4.0** | Country | 100% |

---

## Recommended Strategy

### Tier 1: Immediate Replacements (country-level, 100% coverage, zero effort)

These can replace existing proprietary sources **today**:

| Replace | With | License | Action |
|---|---|---|---|
| `gpiScore` (IEP) | UCDP deaths + WB `PV.EST` | CC BY 4.0 | Download CSV, map to countries |
| `gallupLawOrder` | WB WGI `RL.EST` (Rule of Law) | CC BY 4.0 | Already have WB data in pipeline |
| `democracyIndex` (EIU) | V-Dem `v2x_libdem` | CC BY-SA 4.0 | Download CSV, map to countries |
| `internetSpeedMbps` (Ookla) | M-Lab NDT via BigQuery | CC0 | BigQuery query per city |

### Tier 2: US City Data (high coverage for US cities)

| Replace | With | License | Action |
|---|---|---|---|
| `costModerate` (US) | BLS CEX MSA tables | Public Domain | Process 23 MSA tables |
| `monthlyRent` (US) | Census ACS B25064 | Public Domain | API query per city |
| `housePrice` (US) | Census ACS B25077 | Public Domain | API query per city |
| `numbeoSafetyIndex` (US) | FBI NIBRS crime rates | Public Domain | Compute composite from crime data |

### Tier 3: UK/EU/AU/CA City Data

| Replace | With | License | Action |
|---|---|---|---|
| `monthlyRent` (UK) | VOA rental statistics | OGL v3.0 | Download Excel |
| `housePrice` (UK) | HM Land Registry PPD | OGL v3.0 | Download CSV, aggregate |
| Safety (UK) | data.police.uk | OGL v3.0 | Download monthly CSVs |
| Rent/price (AU) | State rental reports + ABS | CC BY 4.0 | Download per-state |
| Rent/price (CA) | CMHC + StatCan | Open Gov CA | Download per-CMA |

### Tier 4: Remaining Cities (hardest — ~40 cities in Asia/LatAm/Middle East/Africa)

For these cities, government open data is spotty. Options:
1. **Keep existing data** and document sources in metadata
2. **Use World Bank PPP adjustments** from ICP data to estimate from national averages
3. **Commission a one-time data collection** from local researchers
4. **Accept country-level estimates** derived from national statistics

### Critical Legal Notes

1. **BIS data**: Free but condition (d) says commercial products must not charge extra for BIS data. Since WhichCity is free, this is fine.
2. **Zillow ZHVI/ZORI**: Publicly downloadable but ToU may restrict. Use Census ACS instead for legal certainty.
3. **Numbeo**: Any continued use requires their commercial license ($).
4. **V-Dem CC BY-SA**: The ShareAlike clause means if you create a derivative dataset incorporating V-Dem data, that derivative may need to be shared under CC BY-SA too. However, **using V-Dem as one input among many to produce a composite score** is generally considered fair use, not a derivative dataset. Consult legal counsel if concerned.
5. **All US federal data** (BLS, Census, HUD, FBI, FHFA): Unambiguously Public Domain per 17 U.S.C. § 105.
6. **All UK government data** under OGL: Unambiguously allows commercial use with attribution.
