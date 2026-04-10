/**
 * Tax engine unit tests.
 * Covers: zero-tax, flat-tax, progressive brackets, social caps,
 *         Japan/Korea special deductions, US state tax, expat schemes,
 *         dataIsLikelyNet, unknown country, gross mode.
 */
import { describe, test, expect } from "vitest";
import { computeNetIncome } from "../lib/taxUtils";

// No daily rates → uses taxData.ts static usdToLocal
const NO_RATES = undefined;

/* ──────────────────────────────────────────────────────
   Helper: assert effective rate within tolerance
   ────────────────────────────────────────────────────── */
function expectRate(
  result: ReturnType<typeof computeNetIncome>,
  expectedRate: number,
  tolerance = 0.02,
) {
  expect(result.effectiveRate).toBeGreaterThanOrEqual(expectedRate - tolerance);
  expect(result.effectiveRate).toBeLessThanOrEqual(expectedRate + tolerance);
}

/* ══════════════════════════════════════════════════════
   1. Gross mode — bypass all tax
   ══════════════════════════════════════════════════════ */
describe("Gross mode", () => {
  test("returns gross as-is with 0 rate", () => {
    const r = computeNetIncome(60000, "美国", 1, "gross");
    expect(r.netUSD).toBe(60000);
    expect(r.effectiveRate).toBe(0);
    expect(r.confidence).toBe("high");
  });
});

/* ══════════════════════════════════════════════════════
   2. Zero-tax countries (Gulf states)
   ══════════════════════════════════════════════════════ */
describe("Zero-tax countries", () => {
  test("UAE: zero income tax, no social", () => {
    const r = computeNetIncome(80000, "阿联酋", 30, "net");
    expect(r.netUSD).toBe(80000);
    expect(r.effectiveRate).toBe(0);
    expect(r.confidence).toBe("high");
  });

  test("Bahrain: zero tax, 1% unemployment social", () => {
    const r = computeNetIncome(80000, "巴林", 0, "net");
    // 1% social → ~1% effective
    expectRate(r, 0.01, 0.005);
  });
});

/* ══════════════════════════════════════════════════════
   3. Flat-tax countries
   ══════════════════════════════════════════════════════ */
describe("Flat-tax countries", () => {
  test("Bulgaria: 10% flat + ~13.8% social", () => {
    const r = computeNetIncome(20000, "保加利亚", 0, "net");
    // 10% income + ~13.8% social ≈ 22-25% effective
    expectRate(r, 0.23, 0.03);
  });

  test("Georgia: 20% flat, no social", () => {
    const r = computeNetIncome(30000, "格鲁吉亚", 0, "net");
    // 20% flat, no social, no deduction → ~20%
    expectRate(r, 0.20, 0.01);
  });
});

/* ══════════════════════════════════════════════════════
   4. US federal + state taxes
   ══════════════════════════════════════════════════════ */
describe("United States", () => {
  test("NYC ($60k): federal progressive + NY state/city", () => {
    const r = computeNetIncome(60000, "美国", 1, "net");
    // Federal ~10% (after $14,600 std deduction) + FICA ~7.65% + NY state/city ~3-5%
    // Engine uses static usdToLocal=1, total effective ≈ 19%
    expectRate(r, 0.19, 0.03);
    expect(r.confidence).toBe("high");
  });

  test("Miami ($60k): federal only, FL has no state tax", () => {
    const r = computeNetIncome(60000, "美国", 34, "net");
    // Federal + FICA only, $14,600 std deduction → ~15%
    expectRate(r, 0.15, 0.03);
  });

  test("Seattle ($60k): WA has no state tax", () => {
    const r = computeNetIncome(60000, "美国", 37, "net");
    // Same as FL: federal + FICA only
    expectRate(r, 0.15, 0.03);
  });
});

/* ══════════════════════════════════════════════════════
   5. Japan — special employment deduction + 10% resident tax
   ══════════════════════════════════════════════════════ */
describe("Japan", () => {
  test("Tokyo ($23k ≈ ¥3.45M): ~20-22% effective", () => {
    // doda.jp ¥476万 net → ~21% effective for ¥3.9-4.8M range
    const r = computeNetIncome(23000, "日本", 2, "net");
    expectRate(r, 0.21, 0.03);
  });

  test("Higher income ($40k): higher progressive rate", () => {
    const r = computeNetIncome(40000, "日本", 2, "net");
    // Should be higher than $23k case
    expect(r.effectiveRate).toBeGreaterThan(0.20);
    expect(r.effectiveRate).toBeLessThan(0.40);
  });
});

/* ══════════════════════════════════════════════════════
   6. Korea — special employment deduction
   ══════════════════════════════════════════════════════ */
describe("Korea", () => {
  test("Seoul ($30k): progressive + social + employment deduction", () => {
    const r = computeNetIncome(30000, "韩国", 6, "net");
    // Korean tax is moderate for this range: ~15-22% effective
    expectRate(r, 0.18, 0.05);
    expect(r.confidence).toBe("high");
  });
});

/* ══════════════════════════════════════════════════════
   7. Denmark — AM-bidrag pre-tax + employee deduction
   ══════════════════════════════════════════════════════ */
describe("Denmark", () => {
  test("Copenhagen ($50k): high tax country, ~28-34% effective", () => {
    const r = computeNetIncome(50000, "丹麦", 8, "net");
    // Denmark: AM-bidrag 8% + 10.65% employee deduction + 32.44% bracket
    // Engine's simplified model yields ~29-30% for $50k
    expectRate(r, 0.30, 0.04);
    expect(r.effectiveRate).toBeLessThan(0.50);
  });
});

/* ══════════════════════════════════════════════════════
   8. Singapore — progressive + CPF social cap
   ══════════════════════════════════════════════════════ */
describe("Singapore", () => {
  test("$40k: low income tax + CPF", () => {
    const r = computeNetIncome(40000, "新加坡", 3, "net");
    // Singapore has low income tax but 20% CPF (capped)
    // For $40k ≈ SGD 53,600: tax is low, CPF is high → ~20-25%
    expectRate(r, 0.22, 0.05);
  });

  test("expatNet: no CPF, just income tax", () => {
    const r = computeNetIncome(40000, "新加坡", 3, "expatNet");
    // Expat: no social (CPF), only income tax → much lower
    expect(r.effectiveRate).toBeLessThan(0.10);
    expect(r.hasExpatScheme).toBe(true);
  });
});

/* ══════════════════════════════════════════════════════
   9. Expat schemes
   ══════════════════════════════════════════════════════ */
describe("Expat schemes", () => {
  test("Netherlands 30% ruling: 30% income exempted", () => {
    const normal = computeNetIncome(80000, "荷兰", 0, "net");
    const expat = computeNetIncome(80000, "荷兰", 0, "expatNet");
    // Expat should pay less
    expect(expat.netUSD).toBeGreaterThan(normal.netUSD);
    expect(expat.hasExpatScheme).toBe(true);
  });

  test("Spain Beckham Law: flat 24% up to €600k", () => {
    const normal = computeNetIncome(60000, "西班牙", 0, "net");
    const expat = computeNetIncome(60000, "西班牙", 0, "expatNet");
    // Should benefit from flat rate
    expect(expat.netUSD).toBeGreaterThanOrEqual(normal.netUSD);
    expect(expat.hasExpatScheme).toBe(true);
  });

  test("Korea flat 19% expat scheme", () => {
    const normal = computeNetIncome(50000, "韩国", 6, "net");
    const expat = computeNetIncome(50000, "韩国", 6, "expatNet");
    // Expat result should be at least as good as normal
    expect(expat.netUSD).toBeGreaterThanOrEqual(normal.netUSD);
  });
});

/* ══════════════════════════════════════════════════════
   10. Edge cases
   ══════════════════════════════════════════════════════ */
describe("Edge cases", () => {
  test("Unknown country → gross passthrough, low confidence", () => {
    const r = computeNetIncome(50000, "不存在的国家", 0, "net");
    expect(r.netUSD).toBe(50000);
    expect(r.effectiveRate).toBe(0);
    expect(r.confidence).toBe("low");
  });

  test("Zero income → no crash", () => {
    const r = computeNetIncome(0, "美国", 1, "net");
    expect(r.netUSD).toBe(0);
    expect(r.effectiveRate).toBe(0);
  });

  test("effectiveRate is clamped to [0, 1]", () => {
    // Very low income in high-tax country — social minimums could theoretically exceed income
    const r = computeNetIncome(100, "丹麦", 8, "net");
    expect(r.effectiveRate).toBeGreaterThanOrEqual(0);
    expect(r.effectiveRate).toBeLessThanOrEqual(1);
  });

  test("Net income is rounded to integer", () => {
    const r = computeNetIncome(55555, "美国", 1, "net");
    expect(Number.isInteger(r.netUSD)).toBe(true);
  });
});

/* ══════════════════════════════════════════════════════
   11. With daily exchange rates (override static rate)
   ══════════════════════════════════════════════════════ */
describe("Daily exchange rates", () => {
  test("Japan with updated FX rate changes net USD", () => {
    const staticResult = computeNetIncome(23000, "日本", 2, "net", NO_RATES);
    // Use a significantly different rate
    const updatedResult = computeNetIncome(23000, "日本", 2, "net", { JPY: 130 });
    // Different FX rate → different net USD (when converted back)
    expect(updatedResult.netUSD).not.toBe(staticResult.netUSD);
  });
});
