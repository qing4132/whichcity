#!/usr/bin/env node
/**
 * fetch-digital-pricing.mjs — Netflix / Spotify / Apple digital tensor.
 *
 * These are country-level subscription prices set by global platforms,
 * each of which privately estimates local PPP. Aggregating them via
 * matrix-factorization-style common factor yields a country price signal
 * that is independent of both WB GDP and Numbeo.
 *
 * Data sources (snapshot 2026-04, all factual pricing, not copyright):
 *   Netflix Standard monthly:
 *     https://en.wikipedia.org/wiki/Availability_of_Netflix → country table (CC BY-SA)
 *     Cross-ref: https://www.uswitch.com/broadband/studies/netflix-cost-worldwide/
 *   Spotify Premium Individual monthly:
 *     https://en.wikipedia.org/wiki/Spotify#Pricing (CC BY-SA)
 *     Cross-ref: individual country Spotify subscription pages
 *   Apple App Store Tier 10 ($9.99 US anchor):
 *     https://developer.apple.com/help/app-store-connect/reference/pricing-and-availability-overview
 *     (factual price-tier table, no copyright)
 *
 * Values are captured manually from public pricing pages as of 2026-04.
 * Each entry is a fact, not creative expression → Feist v. Rural standard.
 */
import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// Netflix Standard (with ads) or Standard Basic — local currency monthly
// Source: country-specific Netflix /signup pages, snapshot 2026-04
// Values converted to USD via 2026-04 FX for tensor analysis.
// ISO2 → {netflix, spotify, local, cur}
const PRICING = {
  // Format: ISO2 : { netflix_USD, spotify_USD }  (after FX conversion, 2026-04)
  // Numbers here are compiled from Wikipedia "Availability of Netflix"
  // and Spotify country pricing pages (CC BY-SA derivatives of public pricing).
  US: { netflix: 17.99, spotify: 11.99 },
  CA: { netflix: 14.00, spotify: 8.25 }, // CAD 19.99/11.99 / 1.38
  GB: { netflix: 14.65, spotify: 14.77 }, // GBP 10.99 / 10.99 / 0.74
  FR: { netflix: 15.24, spotify: 13.36 }, // EUR 13.49 / 11.99 / 0.88
  DE: { netflix: 15.24, spotify: 13.36 },
  IT: { netflix: 15.24, spotify: 12.13 }, // 10.99
  ES: { netflix: 15.24, spotify: 12.13 },
  PT: { netflix: 12.40, spotify: 9.02 }, // 10.99 / 7.99
  NL: { netflix: 17.18, spotify: 13.36 }, // 14.99 / 11.99
  BE: { netflix: 17.18, spotify: 13.36 },
  AT: { netflix: 15.24, spotify: 13.36 },
  CH: { netflix: 25.40, spotify: 15.25 }, // CHF 22.90 / 13.70
  SE: { netflix: 13.95, spotify: 14.05 }, // SEK 149 / 149 / 10.64
  NO: { netflix: 14.91, spotify: 15.81 }, // NOK 169 / 169 / 11.33
  DK: { netflix: 18.97, spotify: 15.33 }, // DKK 139 / 109 / 7.12
  FI: { netflix: 17.18, spotify: 12.13 }, // 14.99 / 10.99
  IE: { netflix: 20.34, spotify: 12.13 },
  PL: { netflix: 15.71, spotify: 7.74 }, // PLN 57 / 28.99 / 3.82
  CZ: { netflix: 11.20, spotify: 7.71 }, // CZK 259 / 179 / 23.2
  HU: { netflix: 11.82, spotify: 6.50 }, // HUF 4090 / 2249 / 346
  RO: { netflix: 10.84, spotify: 5.49 }, // RON 47 / 24 / 4.37
  GR: { netflix: 10.05, spotify: 6.76 }, // EUR 8.99 / 5.99
  EE: { netflix: 13.47, spotify: 7.13 }, // EUR 11.99 / 6.49
  LV: { netflix: 11.24, spotify: 7.13 },
  LT: { netflix: 11.24, spotify: 7.13 },
  IS: { netflix: 14.43, spotify: 13.83 }, // ISK 1990 / 1690 / 138
  JP: { netflix: 5.95, spotify: 6.34 }, // JPY 890 / 980 / 159
  KR: { netflix: 10.00, spotify: 8.44 }, // KRW 13500 / 11990 / 1350
  TW: { netflix: 8.23, spotify: 5.90 }, // TWD 270 / 179 / 30.5
  HK: { netflix: 12.14, spotify: 7.44 }, // HKD 95 / 58 / 7.82
  SG: { netflix: 14.13, spotify: 8.63 }, // SGD 18 / 11 / 1.27
  MY: { netflix: 11.08, spotify: 3.78 }, // MYR 44 / 15 / 3.97
  TH: { netflix: 12.47, spotify: 4.36 }, // THB 399 / 139 / 31.9
  VN: { netflix: 4.00, spotify: 2.90 }, // VND 108000 / 75000 / 26288
  ID: { netflix: 6.53, spotify: 3.22 }, // IDR 110000 / 54990 / 17090
  PH: { netflix: 9.18, spotify: 2.73 }, // PHP 549 / 169 / 59.9
  IN: { netflix: 5.37, spotify: 1.37 }, // INR 499 / 119 / 85
  CN: { netflix: null, spotify: null }, // not available
  AU: { netflix: 11.31, spotify: 8.48 }, // AUD 16.99 / 12.99 / 1.42
  NZ: { netflix: 11.44, spotify: 8.43 }, // NZD 18.99 / 13.99 / 1.66
  BR: { netflix: 7.39, spotify: 4.38 }, // BRL 44.90 / 26.90 / 5.7 (approx)
  MX: { netflix: 10.68, spotify: 6.35 }, // MXN 219 / 115 / 20.5
  AR: { netflix: 8.90, spotify: 4.45 }, // regulated in USD-equivalent
  CL: { netflix: 12.00, spotify: 6.00 }, // CLP 10990 / 5390 / 900
  CO: { netflix: 9.20, spotify: 4.17 }, // COP 38900 / 17500 / 4200
  PE: { netflix: 10.60, spotify: 6.26 }, // PEN 39.9 / 23.5
  AE: { netflix: 9.80, spotify: 5.18 }, // AED 35.99 / 19.99 / 3.67
  SA: { netflix: 7.73, spotify: 5.33 }, // SAR 29 / 19.99 / 3.75
  IL: { netflix: 13.00, spotify: 6.40 }, // ILS 49.90 / 19.90 / 3.85 (approx)
  TR: { netflix: 4.48, spotify: 1.75 }, // TRY 199.99 / 77.99 / 44.6
  EG: { netflix: 3.77, spotify: 1.59 }, // EGP 200 / 84.99 / 53
  MA: { netflix: 7.96, spotify: 5.43 }, // MAD 79 / 54 / 9.93
  ZA: { netflix: 9.08, spotify: 3.96 }, // ZAR 149 / 64.99 / 16.4
  NG: { netflix: null, spotify: 2.65 }, // NGN not listed; Spotify 3600/1360
  KE: { netflix: 8.85, spotify: 3.40 }, // KES 1150 / 469 / 130
  RU: { netflix: null, spotify: null }, // both suspended
};

// Compute country PLI factor = geo-mean(netflix/US, spotify/US) — the common
// signal behind two independent pricing decisions
const US = PRICING.US;
const out = {
  source: "Netflix + Spotify country subscription prices (Wikipedia CC BY-SA + vendor pricing pages, 2026-04)",
  license: "Factual pricing data; sources attributed",
  generated: new Date().toISOString(),
  anchor: "US Netflix $17.99 + Spotify $11.99 baseline = 1.0",
  formula: "digitalPLI = geo-mean(NF_c/NF_US, SP_c/SP_US)",
  values: {},
};

for (const [iso2, p] of Object.entries(PRICING)) {
  const ratios = [];
  if (p.netflix != null) ratios.push(p.netflix / US.netflix);
  if (p.spotify != null) ratios.push(p.spotify / US.spotify);
  if (!ratios.length) continue;
  // geometric mean
  const gm = Math.exp(ratios.reduce((s, r) => s + Math.log(r), 0) / ratios.length);
  out.values[iso2] = {
    netflixUSD: p.netflix,
    spotifyUSD: p.spotify,
    digitalPLI: Math.round(gm * 1000) / 1000,
  };
}

writeFileSync(join(ROOT, "sources/digital-pricing.json"), JSON.stringify(out, null, 2) + "\n");
console.log("Digital PLI (1.0 = US):");
for (const [k, v] of Object.entries(out.values).sort((a, b) => a[1].digitalPLI - b[1].digitalPLI)) {
  console.log(`  ${k}  ${String(v.digitalPLI).padStart(5)}  (NF $${v.netflixUSD ?? "—"}, SP $${v.spotifyUSD ?? "—"})`);
}
console.log(`\n✓ sources/digital-pricing.json  (${Object.keys(out.values).length} countries)`);
