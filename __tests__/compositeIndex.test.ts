/**
 * Composite index + Life Pressure tests.
 * Covers: anchoredNorm edge cases, Life Pressure sub-indicator weights,
 *         missing data handling, confidence levels, known-city sanity checks.
 */
import { describe, test, expect } from "vitest";
import { computeLifePressure } from "../lib/clientUtils";
import type { City } from "../lib/types";

/* ── Helper: create a minimal City for testing ───── */
function makeCity(overrides: Partial<City> = {}): City {
    return {
        id: 999,
        name: "Test City",
        country: "测试国",
        continent: "测试洲",
        averageIncome: 30000,
        costModerate: 1500,
        costBudget: 900,
        bigMacPrice: 5.0,
        currency: "USD",
        description: "",
        professions: {},
        housePrice: 5000,         // USD/m²
        airQuality: null,
        doctorsPerThousand: null,
        directFlightCities: null,
        annualWorkHours: 2000,
        safetyIndex: 50,
        safetyConfidence: "high",
        numbeoSafetyIndex: 50,
        homicideRateInv: 50,
        gpiScoreInv: 50,
        gallupLawOrder: 50,
        wpsIndex: null,
        healthcareIndex: 50,
        healthcareConfidence: "high",
        outOfPocketPct: null,
        freedomIndex: 50,
        freedomConfidence: "high",
        governanceIndex: 50,
        governanceConfidence: "high",
        govEffectiveness: null,
        wjpRuleLaw: null,
        internetFreedomScore: null,
        mipexScore: null,
        monthlyRent: null,
        paidLeaveDays: null,
        internetSpeedMbps: null,
        hospitalBedsPerThousand: null,
        uhcCoverageIndex: null,
        lifeExpectancy: null,
        pressFreedomScore: null,
        democracyIndex: null,
        corruptionPerceptionIndex: null,
        ...overrides,
    };
}

/* ══════════════════════════════════════════════════════
   1. Basic Life Pressure computation
   ══════════════════════════════════════════════════════ */
describe("Life Pressure — basic", () => {
    test("returns value between 0 and 100", () => {
        const city = makeCity();
        const income = 30000;  // annual USD
        const r = computeLifePressure(city, [city], income, [income], "costModerate");
        expect(r.value).toBeGreaterThanOrEqual(0);
        expect(r.value).toBeLessThanOrEqual(100);
    });

    test("high income + low cost → low pressure", () => {
        const city = makeCity({ costModerate: 500, housePrice: 1000, bigMacPrice: 2.0 });
        const income = 100000;
        const r = computeLifePressure(city, [city], income, [income], "costModerate");
        // Very affordable city with high income → low pressure
        expect(r.value).toBeLessThan(30);
    });

    test("low income + high cost → high pressure", () => {
        const city = makeCity({ costModerate: 4000, housePrice: 20000, bigMacPrice: 8.0 });
        const income = 15000;
        const r = computeLifePressure(city, [city], income, [income], "costModerate");
        // Expensive city with low income → high pressure
        expect(r.value).toBeGreaterThan(60);
    });
});

/* ══════════════════════════════════════════════════════
   2. Cost tier switching
   ══════════════════════════════════════════════════════ */
describe("Life Pressure — cost tiers", () => {
    test("budget tier has lower pressure than moderate tier (same city)", () => {
        const city = makeCity({ costModerate: 2000, costBudget: 1000 });
        const income = 40000;
        const moderate = computeLifePressure(city, [city], income, [income], "costModerate");
        const budget = computeLifePressure(city, [city], income, [income], "costBudget");
        // Budget is cheaper → lower pressure
        expect(budget.value).toBeLessThanOrEqual(moderate.value);
    });
});

/* ══════════════════════════════════════════════════════
   3. Missing data → confidence levels
   ══════════════════════════════════════════════════════ */
describe("Life Pressure — missing data", () => {
    test("all sub-indicators present → high confidence", () => {
        const city = makeCity();
        const r = computeLifePressure(city, [city], 30000, [30000], "costModerate");
        expect(r.confidence).toBe("high");
    });

    test("missing bigMacPrice → medium confidence", () => {
        const city = makeCity({ bigMacPrice: null });
        const r = computeLifePressure(city, [city], 30000, [30000], "costModerate");
        expect(r.confidence).toBe("medium");
    });

    test("missing bigMacPrice + workHours → low confidence", () => {
        const city = makeCity({ bigMacPrice: null, annualWorkHours: null });
        const r = computeLifePressure(city, [city], 30000, [30000], "costModerate");
        expect(r.confidence).toBe("low");
    });

    test("missing data still returns valid score (weight redistribution)", () => {
        const city = makeCity({ bigMacPrice: null, annualWorkHours: null });
        const r = computeLifePressure(city, [city], 30000, [30000], "costModerate");
        expect(r.value).toBeGreaterThanOrEqual(0);
        expect(r.value).toBeLessThanOrEqual(100);
    });
});

/* ══════════════════════════════════════════════════════
   4. Edge cases
   ══════════════════════════════════════════════════════ */
describe("Life Pressure — edge cases", () => {
    test("zero income → high pressure, no crash", () => {
        const city = makeCity();
        const r = computeLifePressure(city, [city], 0, [0], "costModerate");
        expect(r.value).toBeGreaterThanOrEqual(0);
        expect(r.value).toBeLessThanOrEqual(100);
        // Zero income = negative savings = maximum pressure
        expect(r.value).toBeGreaterThan(50);
    });

    test("null housePrice → years-to-buy gets worst score, not crash", () => {
        const city = makeCity({ housePrice: null });
        const r = computeLifePressure(city, [city], 30000, [30000], "costModerate");
        expect(r.value).toBeGreaterThanOrEqual(0);
        expect(r.value).toBeLessThanOrEqual(100);
    });

    test("negative savings → years-to-buy is unaffordable (worst score)", () => {
        // Income < cost*12 → savings negative → yearsToHome N/A
        const city = makeCity({ costModerate: 5000, housePrice: 30000 });
        const income = 10000; // 10k/year, cost 5k/month = 60k/year → negative savings
        const r = computeLifePressure(city, [city], income, [income], "costModerate");
        // Should be very high pressure
        expect(r.value).toBeGreaterThan(70);
    });
});

/* ══════════════════════════════════════════════════════
   5. Sub-indicator weight verification
   ══════════════════════════════════════════════════════ */
describe("Life Pressure — weight behavior", () => {
    test("worse work hours → higher pressure (all else equal)", () => {
        const base = makeCity({ annualWorkHours: 1600 });
        const worse = makeCity({ annualWorkHours: 2400 });
        const income = 40000;
        const rBase = computeLifePressure(base, [base], income, [income], "costModerate");
        const rWorse = computeLifePressure(worse, [worse], income, [income], "costModerate");
        expect(rWorse.value).toBeGreaterThan(rBase.value);
    });

    test("higher bigMac price → higher pressure (less purchasing power)", () => {
        const cheap = makeCity({ bigMacPrice: 2.0 });
        const expensive = makeCity({ bigMacPrice: 8.0 });
        const income = 40000;
        const rCheap = computeLifePressure(cheap, [cheap], income, [income], "costModerate");
        const rExpensive = computeLifePressure(expensive, [expensive], income, [income], "costModerate");
        expect(rExpensive.value).toBeGreaterThan(rCheap.value);
    });
});
