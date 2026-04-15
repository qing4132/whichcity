# WhichCity — Open Data Sources Research Report

> Date: 2026-04-15
> Purpose: Identify openly-licensed, authoritative global indicators for WhichCity
> Criteria: CC BY 4.0 / CC BY 3.0 IGO / CC0 / Public Domain; 80+ countries; programmatic access

---

## Current Data Sources (Already In Use)

| Source | License | Used For |
|--------|---------|----------|
| World Bank WDI / WGI | CC BY 4.0 | Safety (homicide, WGI×4), Healthcare (doctors, UHC, beds, life expectancy, OOP), Governance (govEff), Freedom (VA→democracy) |
| Transparency International CPI | CC BY 4.0 | Governance 50%, Freedom 45% |
| US BLS OEWS | Public Domain | US city salaries (21 cities) |
| ILO ILOSTAT | CC BY 4.0 | Annual work hours, wage ratios |
| US EPA / AQICN | Public Domain | Air quality (AQI) |
| NOAA | Public Domain | Climate data |
| The Economist Big Mac Index | CC BY 4.0 / MIT | Purchasing power proxy |

---

## 1. Safety & Security

### 1A. World Bank — Already Partially Used ✅

**WB indicators NOT yet used but highly relevant:**

| Indicator | Code | Coverage | Granularity | Relevance |
|-----------|------|----------|-------------|-----------|
| Mortality caused by road traffic injury (per 100k) | `SH.STA.TRAF.P5` | 180+ countries | Country | Road safety proxy |
| Military expenditure (% of GDP) | `MS.MIL.XPND.GD.ZS` | 170+ countries | Country | Militarization/conflict context |
| Refugee population by country of origin | `SM.POP.REFG.OR` | 190+ countries | Country | Instability proxy |
| Internally displaced persons | (WB compiles from UNHCR) | 60+ countries | Country | Conflict indicator |

- **License**: CC BY 4.0
- **API**: `https://api.worldbank.org/v2/country/all/indicator/{CODE}?format=json`
- **Update**: Annual (WGI every 1-2 years)

### 1B. UNODC Crime Data — via World Bank API ✅

The World Bank repackages UNODC homicide data as `VC.IHR.PSRC.P5` (already used). Other UNODC data (robbery, assault, theft rates) is NOT available via WB API and UNODC's own terms restrict redistribution → **skip**.

### 1C. ACLED (Armed Conflict Location & Event Data) ⚠️

- **License**: Custom academic license; free for non-commercial, requires agreement for commercial → **NOT suitable**

### 1D. Uppsala Conflict Data Program (UCDP) ✅

- **Institution**: Uppsala University / Peace Research Institute Oslo
- **License**: CC BY 4.0 (explicitly stated)
- **Coverage**: All countries, 1946–present
- **Granularity**: Country-level (and event-level)
- **Key indicators**: Battle-related deaths, state-based conflicts, one-sided violence, non-state conflicts
- **API/Download**: https://ucdp.uu.se/downloads/ (CSV, API available)
- **Update**: Annual
- **WhichCity use**: Could enhance `safetyWarning` field; identify active conflict zones with precise data
- **Already used**: No

---

## 2. Healthcare & Public Health

### 2A. World Bank — Already Partially Used ✅

**WB health indicators NOT yet used:**

| Indicator | Code | Coverage | Relevance for Relocation |
|-----------|------|----------|--------------------------|
| Immunization, DPT (% children 12-23 months) | `SH.IMM.IDPT` | 190+ | Child health/system effectiveness |
| Immunization, measles (% children 12-23 months) | `SH.IMM.MEAS` | 190+ | Child health/system effectiveness |
| Incidence of tuberculosis (per 100k) | `SH.TBS.INCD` | 190+ | Disease burden |
| Diabetes prevalence (% pop ages 20-79) | `SH.STA.DIAB.ZS` | 190+ | NCD burden |
| Prevalence of HIV (% pop ages 15-49) | `SH.DYN.AIDS.ZS` | 170+ | Disease environment |
| Maternal mortality ratio (per 100k live births) | `SH.STA.MMRT` | 180+ | Health system quality |
| Mortality rate, neonatal (per 1k live births) | `SH.DYN.NMRT` | 190+ | Health system quality |
| Mortality rate, under-5 (per 1k live births) | `SH.DYN.MORT` | 190+ | Health system/child health |
| Cause of death, by non-communicable diseases (% total) | `SH.DTH.NCOM.ZS` | 170+ | Health transition stage |
| Specialist surgical workforce (per 100k) | `SH.MED.SAOP.P5` | 150+ | Healthcare access depth |
| Nurses and midwives (per 1k people) | `SH.MED.NUMW.P3` | 180+ | Healthcare staffing |
| Current health expenditure (% of GDP) | `SH.XPD.CHEX.GD.ZS` | 190+ | Health investment level |
| Current health expenditure per capita (current US$) | `SH.XPD.CHEX.PC.CD` | 190+ | Healthcare spending |
| Domestic general govt health expenditure (% GDP) | `SH.XPD.GHED.GD.ZS` | 190+ | Public health investment |
| Prevalence of undernourishment (% pop) | `SN.ITK.DEFC.ZS` | 170+ | Food security |
| People using safely managed drinking water (% pop) | `SH.H2O.SMDW.ZS` | 180+ | Water/sanitation |
| People using safely managed sanitation (% pop) | `SH.STA.SMSS.ZS` | 180+ | Sanitation quality |
| PM2.5 air pollution, mean annual exposure (μg/m³) | `EN.ATM.PM25.MC.M3` | 190+ | **Better AQI replacement** — country-level average PM2.5 |

- **License**: CC BY 4.0
- **API**: Same WB API
- **Update**: Annual
- **Priority**: `SH.MED.NUMW.P3` (nurses), `SH.XPD.CHEX.PC.CD` (health spending per capita), `EN.ATM.PM25.MC.M3` (PM2.5) are the most actionable additions

### 2B. WHO Global Health Observatory (GHO) ⚠️

- **Institution**: World Health Organization
- **License**: CC BY-NC-SA 3.0 IGO — **non-commercial restriction**
- **Note**: WHO data policy states data is available for "non-commercial, not-for-profit use for public health purposes"
- **Coverage**: 194 member states
- **API**: https://ghoapi.azureedge.net/api/
- **Verdict**: **NOT suitable for commercial use** — but many WHO indicators are available through World Bank API (CC BY 4.0), which IS safe. Always prefer the WB version.

### 2C. IHME Global Burden of Disease ⚠️

- **Institution**: Institute for Health Metrics and Evaluation
- **License**: "Free, open access for non-commercial use" → **NOT suitable** for commercial
- **Note**: Rich DALY/disease burden data but license blocks commercial use

---

## 3. Governance & Institutions

### 3A. World Bank WGI — Already Used ✅

All 6 WGI dimensions available, 4 already in use:
- ✅ Political Stability (PV) → safetyIndex
- ✅ Rule of Law (RL) → safetyIndex
- ✅ Control of Corruption (CC) → safetyIndex
- ✅ Government Effectiveness (GE) → governanceIndex
- ✅ Voice and Accountability (VA) → freedomIndex (as democracyIndex)
- **⭐ NOT YET USED: Regulatory Quality (RQ)** → `GOV_WGI_RQ.SC` (source=3)
  - Measures government ability to formulate/implement sound policies that permit private sector development
  - Coverage: 200+ countries, 0-100 percentile rank
  - **Very relevant**: For expats/entrepreneurs, regulatory quality directly affects ease of doing business
  - Could enhance governanceIndex or be a standalone field

### 3B. World Bank — Doing Business Legacy ⚠️

Doing Business was discontinued in 2021 (methodological controversies). Data is archived but no longer updated → **skip** for ongoing use.

### 3C. World Bank — Business Enabling Environment (BEE) ✅

- **Replacement** for Doing Business
- **License**: CC BY 4.0
- **Status**: First release 2024, limited indicators so far
- **Coverage**: 50 countries in pilot → expanding to 180+
- **Indicators**: Business entry regulation, commercial dispute resolution, labor regulation
- **Verdict**: Monitor for future inclusion as coverage expands

### 3D. World Bank — CPIA Indicators ✅

| Indicator | Code | Coverage | Notes |
|-----------|------|----------|-------|
| CPIA public sector management (1-6) | `IQ.CPA.PUBS.XQ` | ~75 (IDA countries only) | Low coverage for WhichCity needs |
| CPIA economic management (1-6) | `IQ.CPA.ECON.XQ` | ~75 | Same |

- **Verdict**: Too limited coverage (IDA/low-income countries only) → **skip**

### 3E. Transparency International CPI — Already Used ✅

- 180 countries, CC BY 4.0, annual
- Already in governanceIndex (50%) and freedomIndex (45%)

---

## 4. Freedom & Rights

### 4A. World Bank WGI Voice & Accountability — Already Used ✅

Used as `democracyIndex` (55% of freedomIndex).

### 4B. UNDP Gender Inequality Index (GII) ✅

- **Institution**: UNDP Human Development Report Office
- **License**: **CC BY 3.0 IGO** (allows commercial use, compatible with CC BY 4.0 attribution)
- **Coverage**: 170+ countries
- **Granularity**: Country-level
- **Download**: https://hdr.undp.org/data-center/documentation-and-downloads (CSV/XLSX)
- **Key indicators**: Reproductive health, empowerment (women in parliament, education), labor market participation
- **Update**: Annual (with HDR report, usually ~December)
- **WhichCity use**: Gender equality dimension for the freedom/rights assessment
- **API**: No REST API, but structured CSV download; composite index is a single 0-1 value per country
- **Already used**: No

### 4C. UNDP Human Development Index (HDI) ✅

- **Institution**: UNDP HDRO
- **License**: **CC BY 3.0 IGO**
- **Coverage**: 195 countries/territories
- **Granularity**: Country-level
- **Download**: https://hdr.undp.org/data-center/documentation-and-downloads
- **Key components**: Life expectancy, education (mean/expected years of schooling), GNI per capita (PPP)
- **Update**: Annual
- **WhichCity use**: Could serve as a composite quality-of-life reference metric; sub-components are useful individually
- **Already used**: No (but its sub-components overlap with WB data already used)

### 4D. World Bank — Gender-Related ✅

| Indicator | Code | Coverage | Relevance |
|-----------|------|----------|-----------|
| Proportion of seats held by women in parliament (%) | `SG.GEN.PARL.ZS` | 190+ | Gender equality in governance |
| Women Business and the Law Index (0-100) | `SG.LAW.INDX` | 190 | Legal gender equality |
| Labor force participation rate, female (% 15+) | `SL.TLF.CACT.FE.ZS` | 190+ | Women's economic participation |

- **License**: CC BY 4.0
- **Priority**: `SG.LAW.INDX` (Women, Business and the Law) is especially useful — it measures legal discrimination against women across 190 countries on a 0-100 scale. **Highly actionable.**

### 4E. V-Dem (Varieties of Democracy) ⚠️

- **Institution**: University of Gothenburg
- **License**: CC BY-SA 4.0 (ShareAlike clause)
- **Coverage**: 202 countries, 1789–present
- **Note**: ShareAlike means derivatives must also be CC BY-SA → may complicate commercial distribution
- **Verdict**: License is permissive but SA clause adds complexity. WGI VA is simpler. Consider only if more nuanced democracy measures are needed.

### 4F. Freedom House — Freedom in the World ❌

- **License**: Not open for commercial redistribution. Requires permission for commercial use.
- **Already removed** from project (internetFreedomScore). **Skip.**

---

## 5. Economy & Development

### 5A. World Bank — Rich Set Available ✅

| Indicator | Code | Coverage | Relevance |
|-----------|------|----------|-----------|
| **Gini index** | `SI.POV.GINI` | ~160 (varying years) | Income inequality |
| Inflation, consumer prices (annual %) | `FP.CPI.TOTL.ZG` | 190+ | Cost of living trend |
| GDP per capita, PPP (current int'l $) | `NY.GDP.PCAP.PP.CD` | 190+ | Purchasing power context |
| GDP growth (annual %) | `NY.GDP.MKTP.KD.ZG` | 190+ | Economic trajectory |
| Unemployment, total (% labor force, ILO modeled) | `SL.UEM.TOTL.ZS` | 190+ | Job market health |
| Unemployment, youth (% labor force 15-24) | `SL.UEM.1524.ZS` | 190+ | Youth opportunity |
| Employment to population ratio, 15+ (%) | `SL.EMP.TOTL.SP.ZS` | 190+ | Labor market absorption |
| Poverty headcount ratio at $3.65/day (2017 PPP) | `SI.POV.DDAY` | ~160 | Poverty level |
| PPP conversion factor | `PA.NUS.PPP` | 190+ | Currency purchasing power |
| New businesses registered (number) | `IC.BUS.NREG` | 130+ | Entrepreneurial environment |
| GDP per person employed (constant 2021 PPP $) | `SL.GDP.PCAP.EM.KD` | 180+ | Labor productivity |
| Personal remittances, received (% of GDP) | `BX.TRF.PWKR.DT.GD.ZS` | 180+ | Diaspora dependency |
| Tax revenue (% of GDP) | `GC.TAX.TOTL.GD.ZS` | 130+ | Tax burden context |
| Logistics performance index (1-5) | `LP.LPI.OVRL.XQ` | 160 | Trade/logistics infrastructure |

- **License**: CC BY 4.0
- **Priority picks for WhichCity**:
  - `FP.CPI.TOTL.ZG` (inflation) — directly relevant to cost of living
  - `SL.UEM.TOTL.ZS` (unemployment) — job market indicator
  - `NY.GDP.PCAP.PP.CD` (GDP PPP per capita) — economic context
  - `SI.POV.GINI` (Gini) — inequality, but coverage is spotty (many missing years)

### 5B. ILO ILOSTAT — Already Partially Used ✅

**Additional ILO indicators (all CC BY 4.0):**

| Indicator | ID | Coverage | Notes |
|-----------|----|----------|-------|
| Mean nominal monthly earnings (local currency) | `EAR_4MTH_SEX_CUR_NB_A` | 100+ | **Key for salary rebuilding** — national average monthly earnings |
| Informal employment rate (%) | `EMP_NIFL_SEX_RT_A` | 100+ | Labor market informality |
| Youth NEET rate (%) | `EIP_NEET_SEX_RT_A` | 150+ | Youth disengagement |
| Trade union density (%) | industrial relations | 80+ | Labor rights indicator |

- **API**: https://rplumber.ilo.org/ (SDMX/REST)
- **Bulk download**: https://ilostat.ilo.org/data/bulk/
- **Priority**: `EAR_4MTH_SEX_CUR_NB_A` is critical for the salary pipeline rebuild

### 5C. IMF World Economic Outlook ✅

- **Institution**: International Monetary Fund
- **License**: Open data, free to use with attribution (IMF Terms of Use allow "use, reproduce and redistribute" with attribution)
- **Coverage**: 190+ countries
- **Key indicators**: GDP growth forecasts, inflation projections, government debt
- **Download**: https://www.imf.org/en/Publications/WEO/weo-database (CSV)
- **API**: https://datahelp.imf.org/knowledgebase/articles/667681-using-json-restful-web-service
- **Update**: Twice/year (April, October)
- **WhichCity use**: Forward-looking economic indicators (inflation forecast, GDP growth forecast)
- **Already used**: No

---

## 6. Education

### 6A. World Bank ✅

| Indicator | Code | Coverage | Relevance |
|-----------|------|----------|-----------|
| Literacy rate, adult total (% 15+) | `SE.ADT.LITR.ZS` | ~160 | Basic education level |
| School enrollment, tertiary (% gross) | `SE.TER.ENRR` | 180+ | Higher education access |
| Government expenditure on education (% of GDP) | `SE.XPD.TOTL.GD.ZS` | 170+ | Education investment |
| Pupil-teacher ratio, primary | `SE.PRM.ENRL.TC.ZS` | 180+ | Education quality proxy |
| School enrollment, primary & secondary GPI | `SE.ENR.PRSC.FM.ZS` | 180+ | Gender parity in education |
| Researchers in R&D (per million people) | `SP.POP.SCIE.RD.P6` | 130+ | Innovation capacity |
| Research and development expenditure (% GDP) | `GB.XPD.RSDV.GD.ZS` | 130+ | R&D investment |
| Scientific and technical journal articles | `IP.JRN.ARTC.SC` | 180+ | Research output |
| Patent applications, residents | `IP.PAT.RESD` | 140+ | Innovation activity |

- **License**: CC BY 4.0
- **Priority**: `SE.TER.ENRR` (tertiary enrollment) and `GB.XPD.RSDV.GD.ZS` (R&D spending) are most relevant for professional relocators

### 6B. UNESCO Institute for Statistics (UIS) ✅

- **Institution**: UNESCO
- **License**: The UNESCO Open Access Policy (CC BY-SA 3.0 IGO) applies; UIS data is also mirrored in WB (CC BY 4.0)
- **Coverage**: 200+ countries
- **API**: http://data.uis.unesco.org/ (SDMX)
- **Key unique indicators**: Mean years of schooling, learning outcomes, international student mobility
- **Verdict**: Most useful UIS indicators are already in WB. Use WB API for simplicity.

---

## 7. Infrastructure & Environment

### 7A. World Bank ✅

| Indicator | Code | Coverage | Relevance |
|-----------|------|----------|-----------|
| **Fixed broadband subscriptions (per 100 people)** | `IT.NET.BBND.P2` | 190+ | Internet infrastructure — **partial replacement for removed internetSpeedMbps** |
| **Individuals using the Internet (% of pop)** | `IT.NET.USER.ZS` | 190+ | Digital access |
| Mobile cellular subscriptions (per 100 people) | `IT.CEL.SETS.P2` | 190+ | Connectivity |
| **Secure Internet servers (per 1M people)** | `IT.NET.SECR.P6` | 190+ | Digital infrastructure depth |
| Access to electricity (% of pop) | `EG.ELC.ACCS.ZS` | 190+ | Basic infrastructure |
| Renewable energy consumption (% total) | `EG.FEC.RNEW.ZS` | 180+ | Green energy |
| Renewable electricity output (% total) | `EG.ELC.RNEW.ZS` | 180+ | Green grid |
| CO2 emissions (metric tons per capita) | `EN.ATM.CO2E.PC` | 190+ | Carbon footprint |
| Urban population (% of total) | `SP.URB.TOTL.IN.ZS` | 190+ | Urbanization level |
| Population density (people per sq km) | `EN.POP.DNST` | 190+ | Crowding |
| Air transport, registered carrier departures | `IS.AIR.DPRT` | 170+ | Aviation infrastructure |
| Container port traffic (TEU) | `IS.SHP.GOOD.TU` | 100+ | Trade infrastructure |
| Rail lines (total route-km) | `IS.RRS.TOTL.KM` | 100+ | Rail infrastructure |
| Terrestrial and marine protected areas (% territory) | `ER.PTD.TOTL.ZS` | 190+ | Environmental protection |
| Forest area (% of land area) | `AG.LND.FRST.ZS` | 190+ | Green coverage |

- **License**: CC BY 4.0
- **Priority**:
  - `IT.NET.BBND.P2` (broadband subscriptions) — best available replacement for internet speed
  - `IT.NET.USER.ZS` (internet users %) — digital readiness
  - `EN.ATM.CO2E.PC` (CO2 per capita) — environmental quality
  - `EG.ELC.ACCS.ZS` (electricity access) — relevant for developing-world cities

### 7B. M-Lab NDT (Network Diagnostic Tool) ✅

- **Institution**: Measurement Lab (partnership of Google, Princeton, etc.)
- **License**: Apache 2.0 (fully open for commercial use)
- **Coverage**: Global (city-level!)
- **Granularity**: **City-level** — unique advantage
- **Data access**: Google BigQuery (`measurement-lab.ndt.unified_uploads`)
- **Key indicators**: Download speed, upload speed, latency, packet loss
- **Update**: Continuous (can aggregate by month/year)
- **WhichCity use**: **Direct replacement for removed Ookla `internetSpeedMbps`** — same type of data, fully open license
- **Caveat**: Requires BigQuery access (free tier: 1TB/month query); data quality varies by city (some cities have few tests)
- **Already used**: No, but noted in data provenance as rebuild plan

### 7C. OpenAQ ✅

- **Institution**: OpenAQ (non-profit)
- **License**: CC BY 4.0
- **Coverage**: 100+ countries, **city-level**
- **Granularity**: Station-level (aggregatable to city)
- **API**: https://api.openaq.org/v3/ (free, rate-limited)
- **Key data**: PM2.5, PM10, O3, NO2, SO2, CO — real-time and historical
- **Update**: Near real-time
- **WhichCity use**: Could supplement/replace current AQI data with a fully open, programmatic source
- **Already used**: No (currently using EPA/AQICN)

### 7D. European Environment Agency (EEA) ⚠️

- Country coverage limited to Europe → insufficient for global use

---

## 8. Quality of Life & Wellbeing

### 8A. UNDP Human Development Index (HDI) ✅

- **License**: CC BY 3.0 IGO
- **Coverage**: 195 countries
- **Download**: CSV from https://hdr.undp.org/data-center/documentation-and-downloads
- **Indicators**: HDI (composite), IHDI (inequality-adjusted), GDI, GII, MPI
- **Already discussed in §4C above**

### 8B. World Bank — Wellbeing Proxies ✅

| Indicator | Code | Coverage | Relevance |
|-----------|------|----------|-----------|
| Population living in slums (% urban) | `EN.POP.SLUM.UR.ZS` | 100+ | Urban quality |
| International migrant stock (% pop) | `SM.POP.TOTL.TO.ZS` | 190+ | Cosmopolitan/diversity proxy |
| Net migration | `SM.POP.NETM` | 190+ | "Voting with feet" — where people are moving |
| Age dependency ratio (% working-age) | `SP.POP.DPND` | 190+ | Demographics |
| Population ages 65+ (% total) | `SP.POP.65UP.TO.ZS` | 190+ | Aging society |
| Fertility rate (births per woman) | `SP.DYN.TFRT.IN` | 190+ | Demographics |
| International tourism, receipts (% exports) | `ST.INT.RCPT.XP.ZS` | 170+ | Tourism economy |

- **License**: CC BY 4.0
- **Priority**: `SM.POP.NETM` (net migration) is a powerful "revealed preference" indicator — countries people are moving TO vs FROM

### 8C. Gallup World Poll ❌

- **License**: Proprietary, requires commercial license ($$$)
- **Verdict**: **NOT suitable** — this is the source for World Happiness Report
- **Note**: The World Happiness Report itself publishes rankings, but the underlying Gallup data cannot be redistributed

### 8D. World Values Survey (WVS) ⚠️

- **License**: Free for academic use, commercial use requires permission
- **Coverage**: ~90 countries per wave
- **Verdict**: License unclear for commercial redistribution → **skip**

---

## 9. Summary — Highest Priority New Data Sources

### Tier 1: Immediately Actionable (WB API, same pipeline)

These can be added using the existing `fetch-wb-safety-data.mjs` pattern:

| Indicator | Code | Category | Why |
|-----------|------|----------|-----|
| **Inflation (CPI annual %)** | `FP.CPI.TOTL.ZG` | Economy | Directly affects cost of living decisions |
| **Unemployment rate (%)** | `SL.UEM.TOTL.ZS` | Economy | Job market health |
| **GDP per capita PPP ($)** | `NY.GDP.PCAP.PP.CD` | Economy | Purchasing power context |
| **Gini index** | `SI.POV.GINI` | Economy | Income inequality (spotty coverage) |
| **PM2.5 mean annual (μg/m³)** | `EN.ATM.PM25.MC.M3` | Environment | Better AQI metric than current |
| **Fixed broadband (per 100)** | `IT.NET.BBND.P2` | Infrastructure | Internet infrastructure proxy |
| **Internet users (% pop)** | `IT.NET.USER.ZS` | Infrastructure | Digital readiness |
| **Regulatory Quality (WGI)** | `GOV_WGI_RQ.SC` | Governance | Business environment (source=3) |
| **Women, Business & Law (0-100)** | `SG.LAW.INDX` | Freedom | Legal gender equality |
| **Nurses per 1k** | `SH.MED.NUMW.P3` | Healthcare | Deeper healthcare staffing |
| **Health expenditure per capita ($)** | `SH.XPD.CHEX.PC.CD` | Healthcare | Healthcare investment |
| **CO2 per capita (metric tons)** | `EN.ATM.CO2E.PC` | Environment | Environmental quality |
| **Net migration** | `SM.POP.NETM` | Quality of Life | "Voting with feet" indicator |
| **Tertiary enrollment (% gross)** | `SE.TER.ENRR` | Education | Higher education access |
| **R&D expenditure (% GDP)** | `GB.XPD.RSDV.GD.ZS` | Education | Innovation capacity |

### Tier 2: Requires New Pipeline But High Value

| Source | License | What | Effort |
|--------|---------|------|--------|
| **ILO national earnings** | CC BY 4.0 | Monthly earnings by country — salary rebuild | New API integration |
| **UNDP HDI / GII** | CC BY 3.0 IGO | Composite human development + gender inequality | CSV download + parse |
| **M-Lab NDT** | Apache 2.0 | City-level internet speed | BigQuery integration |
| **OpenAQ** | CC BY 4.0 | City-level air quality (PM2.5/PM10) | REST API integration |
| **IMF WEO** | Open w/ attribution | Inflation/GDP forecasts | CSV download |
| **UCDP conflict data** | CC BY 4.0 | Precise conflict data for safetyWarning | CSV download |

### Tier 3: Monitor for Future

| Source | License | Notes |
|--------|---------|-------|
| World Bank BEE (Business Enabling Environment) | CC BY 4.0 | Coverage expanding, not yet global |
| V-Dem | CC BY-SA 4.0 | SA clause adds complexity; WGI VA sufficient for now |

---

## 10. Sources Confirmed NOT Suitable

| Source | License Issue | Alternative |
|--------|---------------|-------------|
| WHO GHO | CC BY-NC-SA 3.0 IGO | Use same indicators via WB API (CC BY 4.0) |
| IHME GBD | Non-commercial only | WB health indicators cover most needs |
| Gallup World Poll | Proprietary | WB net migration as wellbeing proxy |
| Freedom House | Commercial use requires permission | WGI Voice & Accountability |
| Numbeo | TOS prohibits scraping/commercial | ILO + government stats |
| Ookla Speedtest | CC BY-NC-SA | M-Lab NDT (Apache 2.0) |
| ACLED | Non-commercial license | UCDP (CC BY 4.0) |
| World Values Survey | Academic license, unclear commercial | WB/UNDP composites |
| UNODC direct | Redistribution restricted | WB repackages key indicators |
| EIU Democracy Index | Proprietary | WGI Voice & Accountability (already replaced) |
| RSF Press Freedom | TOS unclear/404 | Already removed |
| WJP Rule of Law Index | Terms unclear | WGI Rule of Law (already replaced) |

---

## 11. Quick Reference — License Compatibility

| License | Commercial OK? | ShareAlike? | WhichCity Safe? |
|---------|---------------|-------------|-----------------|
| CC BY 4.0 | ✅ | No | ✅ |
| CC BY 3.0 IGO | ✅ | No | ✅ |
| CC0 / Public Domain | ✅ | No | ✅ |
| Apache 2.0 | ✅ | No | ✅ |
| MIT | ✅ | No | ✅ |
| CC BY-SA 4.0 | ✅ | Yes — derivatives must be SA | ⚠️ Usable but adds complexity |
| CC BY-NC 4.0 | ❌ | — | ❌ |
| CC BY-NC-SA | ❌ | — | ❌ |
| Proprietary | ❌ | — | ❌ |

---

## 12. Implementation Roadmap

### Phase 1: WB API Expansion (Minimal Effort)
Add 10-15 new WB indicators using existing pipeline pattern. Single script, one API.

### Phase 2: Salary Pipeline Rebuild
Replace Numbeo anchor with ILO national earnings + government stats.

### Phase 3: City-Level Data
- M-Lab for internet speed
- OpenAQ for air quality
- These are the only city-level open sources identified.

### Phase 4: Composite Index Enhancement
- UNDP HDI/GII as reference composites
- UCDP for conflict warnings
- IMF WEO for economic forecasts
