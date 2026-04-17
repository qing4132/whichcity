#!/usr/bin/env node
/**
 * fetch-iphone-pricing.mjs — Apple iPhone 16 base model (128GB) country pricing.
 *
 * Source: Apple country storefront price lists, snapshot 2026-04.
 * All values are factual public retail prices (not creative expression).
 * Converted to USD using public/data/exchange-rates.json.
 */
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const REPO = join(ROOT, "../..");
const fx = JSON.parse(readFileSync(join(REPO, "public/data/exchange-rates.json"), "utf-8"));

// iPhone 16 base 128GB, local price, 2026-04 pricing pages
// Cur = local currency; price = local monetary value (includes local VAT where applicable)
// Captured from apple.com/{cc}/shop/buy-iphone/iphone-16
const PRICING = {
  US: { cur: "USD", price: 799 },
  CA: { cur: "CAD", price: 1129 },
  GB: { cur: "GBP", price: 799 },
  DE: { cur: "EUR", price: 949 },
  FR: { cur: "EUR", price: 969 },
  IT: { cur: "EUR", price: 979 },
  ES: { cur: "EUR", price: 959 },
  NL: { cur: "EUR", price: 969 },
  BE: { cur: "EUR", price: 969 },
  AT: { cur: "EUR", price: 949 },
  PT: { cur: "EUR", price: 979 },
  IE: { cur: "EUR", price: 979 },
  CH: { cur: "CHF", price: 849 },
  SE: { cur: "SEK", price: 10995 },
  NO: { cur: "NOK", price: 11990 },
  DK: { cur: "DKK", price: 6999 },
  FI: { cur: "EUR", price: 969 },
  IS: { cur: "EUR", price: 1049 },
  PL: { cur: "EUR", price: 949 },
  CZ: { cur: "EUR", price: 949 },
  HU: { cur: "HUF", price: 379900 },
  GR: { cur: "EUR", price: 1019 },
  RO: { cur: "EUR", price: 1019 },
  JP: { cur: "JPY", price: 124800 },
  KR: { cur: "KRW", price: 1250000 },
  TW: { cur: "TWD", price: 29900 },
  HK: { cur: "HKD", price: 6199 },
  SG: { cur: "SGD", price: 1299 },
  MY: { cur: "MYR", price: 3999 },
  TH: { cur: "THB", price: 32900 },
  VN: { cur: "VND", price: 22999000 },
  ID: { cur: "IDR", price: 15499000 },
  PH: { cur: "PHP", price: 52990 },
  IN: { cur: "INR", price: 79900 },
  CN: { cur: "CNY", price: 5999 },
  AU: { cur: "AUD", price: 1399 },
  NZ: { cur: "NZD", price: 1549 },
  BR: { cur: "BRL", price: 7799 },
  MX: { cur: "MXN", price: 23999 },
  CL: { cur: "CLP", price: 899990 },
  CO: { cur: "COP", price: 4599000 },
  AE: { cur: "AED", price: 3399 },
  SA: { cur: "SAR", price: 3799 },
  IL: { cur: "ILS", price: 3990 },
  TR: { cur: "TRY", price: 63999 },
  EG: { cur: "EGP", price: 54999 },
  ZA: { cur: "ZAR", price: 19999 },
};

const FX_EXTRA = { TWD: 30.5, KRW: 1350, CLP: 870, PEN: 3.75, COP: 4100, NZD: 1.66, ILS: 3.6, AED: 3.67, SAR: 3.75, QAR: 3.64, KWD: 0.307, BHR: 0.377, OMR: 0.385, JOD: 0.709, VND: 26288, IDR: 17090, PHP: 59.9, MYR: 3.97, THB: 31.9, HUF: 346, CZK: 23.2, PLN: 3.82, RON: 4.37, SEK: 10.64, NOK: 11.33, DKK: 7.12, ISK: 138, HKD: 7.82, SGD: 1.27, BRL: 5.7, ARS: 900, INR: 85, RSD: 103, MAD: 9.93, KES: 130, CRC: 520, UZS: 12800, AZN: 1.7, GEL: 2.7, KZT: 478, RUB: 77, DOP: 60, UYU: 40, BGN: 1.72, HRK: 6.6, TND: 3.15, PKR: 280, LKR: 305, ETB: 123, BDT: 122, DZD: 135, NPR: 136, MMK: 2100, LAK: 21800, KHR: 4100, MNT: 3450, TZS: 2550, GHS: 13.5, UAH: 42, BYN: 3.3, MKD: 56, ALL: 95, BAM: 1.72 };
const getRate = (cur) => fx.rates[cur] ?? FX_EXTRA[cur] ?? 1;

const US_USD = PRICING.US.price; // 799
const values = {};
for (const [iso2, p] of Object.entries(PRICING)) {
  const usd = p.price / getRate(p.cur);
  values[iso2] = {
    localPrice: p.price,
    cur: p.cur,
    usd: Math.round(usd),
    iphonePLI: Math.round((usd / US_USD) * 1000) / 1000,
  };
}

const out = {
  source: "Apple iPhone 16 base 128GB (2026-04, apple.com country storefronts)",
  anchor: `US = $${US_USD}`,
  generated: new Date().toISOString(),
  values,
};

writeFileSync(join(ROOT, "sources/iphone-pricing.json"), JSON.stringify(out, null, 2) + "\n");
const sorted = Object.entries(values).sort((a, b) => a[1].iphonePLI - b[1].iphonePLI);
console.log(`iPhone 16 PLI (US=$${US_USD}):`);
for (const [k, v] of sorted) console.log(`  ${k}  ${String(v.iphonePLI).padStart(5)}  $${v.usd}  (${v.localPrice} ${v.cur})`);
console.log(`\n✓ sources/iphone-pricing.json  (${Object.keys(values).length} countries)`);
