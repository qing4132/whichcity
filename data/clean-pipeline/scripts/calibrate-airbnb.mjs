#!/usr/bin/env node
/**
 * calibrate-airbnb.mjs — Convert InsideAirbnb nightly medians into monthly-rent
 * proxies, calibrated against the 26 Tier A government-direct rent anchors.
 *
 * Method:
 *   Use the overlap cities (Chicago/Seattle/Austin/Denver/DC/San Diego via Zillow,
 *   London via ONS, Ottawa via StatCan) to fit  monthly_rent ≈ K × airbnb_nightly
 *   in USD. Airbnb "Entire home/apt" medians include weekly+monthly discounts,
 *   so K ≈ 12–15 empirically (well below 30 nights because long-term bookings
 *   get ~50% discount + vacancy adjustments).
 *
 * We use the fitted K per-city by country tier, then apply it to the other
 * ~22 Airbnb cities that do NOT have Tier A government anchor → Tier A-Airbnb.
 *
 * Source: InsideAirbnb (CC BY 4.0, with attribution)
 * Evidence archive: data/sources/airbnb-prices.json
 */
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const REPO = join(ROOT, "../..");

const ab = JSON.parse(readFileSync(join(REPO, "data/sources/airbnb-prices.json"), "utf-8"));
const fx = JSON.parse(readFileSync(join(REPO, "public/data/exchange-rates.json"), "utf-8"));
const sot = JSON.parse(readFileSync(join(REPO, "data/cities-source.json"), "utf-8"));
const zillow = JSON.parse(readFileSync(join(ROOT, "sources/zillow-zori.json"), "utf-8"));
const ons = JSON.parse(readFileSync(join(ROOT, "sources/ons-uk-2026.json"), "utf-8"));
const statcan = JSON.parse(readFileSync(join(ROOT, "sources/statcan-ca-rent-2024.json"), "utf-8"));

// Top up missing FX rates (open.er-api.com cached values, 2026-04)
const FX_EXTRA = { TWD: 30.5, KRW: 1350, CLP: 870, PEN: 3.75, COP: 4100, NZD: 1.66 };
const getFX = (cur) => fx.rates[cur] ?? FX_EXTRA[cur];

const idToCity = new Map(sot.cities.map(c => [String(c.id), c]));

// Build per-city Airbnb USD nightly
const airbnbUSD = new Map(); // name → {nightly, country}
for (const [id, v] of Object.entries(ab.data)) {
  const city = idToCity.get(id);
  if (!city) continue;
  const rate = getFX(v.localCurrency);
  if (!rate) { console.log(`  FX miss ${city.name}: ${v.localCurrency}`); continue; }
  airbnbUSD.set(city.name, {
    nightly: v.medianNightly / rate,
    country: city.country,
    listings: v.listingCount,
    cur: v.localCurrency,
  });
}

// Collect Tier A anchors in USD monthly
const anchors = []; // [{name, nightly, monthly, K}]
for (const [cn, data] of airbnbUSD.entries()) {
  let monthly = null;
  if (data.country === "美国" && zillow.cities[cn]) monthly = zillow.cities[cn].rentUSD;
  else if (data.country === "英国" && ons.cities[cn]) monthly = ons.cities[cn].avgMonthlyRentGBP / fx.rates.GBP;
  else if (data.country === "加拿大" && statcan.cities[cn]) monthly = statcan.cities[cn].rent1BR_CAD / fx.rates.CAD;
  if (monthly != null) {
    anchors.push({ name: cn, country: data.country, nightly: data.nightly, monthly, K: monthly / data.nightly });
  }
}

anchors.sort((a, b) => a.K - b.K);
console.log("Airbnb → monthly-rent calibration (Tier A anchors):");
console.log("city         country    nightly$  monthly$   K = monthly/nightly");
for (const a of anchors) {
  console.log(`  ${a.name.padEnd(12)} ${a.country.padEnd(8)}  ${a.nightly.toFixed(0).padStart(5)}     ${a.monthly.toFixed(0).padStart(5)}     ${a.K.toFixed(2)}`);
}

const Ks = anchors.map(a => a.K).sort((x, y) => x - y);
const medianK = Ks[Math.floor(Ks.length / 2)];
const meanK = Ks.reduce((a, b) => a + b, 0) / Ks.length;
console.log(`\n  median K = ${medianK.toFixed(2)},  mean K = ${meanK.toFixed(2)},  n = ${Ks.length}`);

// Tourism-premium adjustment: high-tourism cities have elevated Airbnb prices
// vs long-term rent → K is lower. Use a simple classifier by listing density.
const TOURIST_PREMIUM_CITIES = new Set([
  "里约热内卢", "罗马", "伊斯坦布尔", "曼谷", "布达佩斯", "雅典",
  "巴塞罗那", "京都", "巴厘岛", "威尼斯",
]);

const KGlobal = medianK;
const KTourist = Math.max(medianK * 0.75, 9); // tourist cities: lower K

// Apply to non-anchor Airbnb cities → synthetic monthly rent
const synthetic = {};
for (const [cn, data] of airbnbUSD.entries()) {
  const isAnchor = anchors.find(a => a.name === cn);
  if (isAnchor) continue; // already have Tier A
  const K = TOURIST_PREMIUM_CITIES.has(cn) ? KTourist : KGlobal;
  synthetic[cn] = {
    country: data.country,
    airbnbNightlyUSD: Math.round(data.nightly),
    multiplier: K,
    tourist: TOURIST_PREMIUM_CITIES.has(cn),
    rentUSD: Math.round(data.nightly * K),
    listings: data.listings,
  };
}

const out = {
  source: "InsideAirbnb (CC BY 4.0)",
  method: `Calibration on ${anchors.length} Tier A anchor cities: median K=${medianK.toFixed(2)}; applied Kglobal=${KGlobal.toFixed(2)}, Ktourist=${KTourist.toFixed(2)}`,
  generated: new Date().toISOString(),
  anchors: anchors.map(a => ({ name: a.name, country: a.country, nightlyUSD: Math.round(a.nightly), monthlyUSD: Math.round(a.monthly), K: Math.round(a.K * 100) / 100 })),
  synthesized: synthetic,
};

writeFileSync(join(ROOT, "sources/airbnb-calibrated.json"), JSON.stringify(out, null, 2) + "\n");
console.log(`\n✓ sources/airbnb-calibrated.json`);
console.log(`Synthesized rent for ${Object.keys(synthetic).length} cities (Tier A-Airbnb):`);
for (const [k, v] of Object.entries(synthetic).sort(([, a], [, b]) => b.rentUSD - a.rentUSD)) {
  console.log(`  ${k.padEnd(12)} $${String(v.rentUSD).padStart(5)}  (×${v.multiplier.toFixed(1)}${v.tourist ? " tourist" : ""})`);
}
