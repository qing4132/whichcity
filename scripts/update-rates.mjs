#!/usr/bin/env node
/**
 * Fetch latest exchange rates from ExchangeRate-API and update
 * public/data/exchange-rates.json.
 *
 * Usage:  EXCHANGE_RATE_API_KEY=xxx node scripts/update-rates.mjs
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const JSON_PATH = resolve(__dirname, "../public/data/exchange-rates.json");

const API_KEY = process.env.EXCHANGE_RATE_API_KEY;
if (!API_KEY) {
  console.error("Missing EXCHANGE_RATE_API_KEY environment variable");
  process.exit(1);
}

// Read existing file to preserve symbols map
const existing = JSON.parse(readFileSync(JSON_PATH, "utf-8"));
const currencies = Object.keys(existing.rates);

const url = `https://v6.exchangerate-api.com/v6/${API_KEY}/latest/USD`;
console.log("Fetching rates from ExchangeRate-API …");

const res = await fetch(url);
if (!res.ok) {
  console.error(`API request failed: ${res.status} ${res.statusText}`);
  process.exit(1);
}

const data = await res.json();
if (data.result !== "success") {
  console.error("API error:", data["error-type"] || JSON.stringify(data));
  process.exit(1);
}

// Build new rates using only the currencies we already track
const newRates = {};
for (const code of currencies) {
  const rate = data.conversion_rates[code];
  if (rate == null) {
    console.warn(`Warning: ${code} not found in API response, keeping old value`);
    newRates[code] = existing.rates[code];
  } else {
    newRates[code] = rate;
  }
}

const output = {
  rates: newRates,
  symbols: existing.symbols,
};

writeFileSync(JSON_PATH, JSON.stringify(output, null, 2) + "\n");
console.log("Updated", JSON_PATH);
console.log("Sample rates:", { USD: newRates.USD, EUR: newRates.EUR, JPY: newRates.JPY, CNY: newRates.CNY });
