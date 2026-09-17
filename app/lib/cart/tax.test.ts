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

	// TEST — the centralized MNH Creations rate (8.25%) applies by default
	test("the default rate is 8.25% and is applied when no override is given", () => {
		const result = computeTax(10000);
		expect(result.taxCents).toBe(825);
		expect(result.ratePercent).toBe(8.25);
		expect(result.label).toBe("Estimated Tax");
		expect(result.authoritative).toBe(false);
	});

	test("rounds to the nearest cent", () => {
		const result = computeTax(999, { ratePercent: 7.25 });
		expect(result.taxCents).toBe(Math.round(999 * 0.0725));
	});
});
