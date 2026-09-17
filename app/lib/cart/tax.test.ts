import { describe, expect, test } from "vitest";
import { computeTax } from "./tax";

describe("computeTax", () => {
	// TEST 20/21 — Tax is displayed separately and Total = Subtotal + Tax
	test("returns a rate/amount separate from the subtotal, with a non-authoritative disclaimer", () => {
		const result = computeTax(10000, { ratePercent: 7 });
		expect(result.taxCents).toBe(700);
		expect(result.authoritative).toBe(false);
		expect(result.disclaimer.length).toBeGreaterThan(0);
	});

	test("with the default (unconfigured) rate never fabricates a nonzero tax", () => {
		const result = computeTax(10000);
		expect(result.taxCents).toBe(0);
	});

	test("rounds to the nearest cent", () => {
		const result = computeTax(999, { ratePercent: 7.25 });
		expect(result.taxCents).toBe(Math.round(999 * 0.0725));
	});
});
