import { describe, expect, test } from "vitest";
import { computeTumblerPrice } from "./pricing";
import { createDefaultTumblerConfiguratorState, type TumblerConfiguratorState } from "./types";

function baseState(overrides: Partial<TumblerConfiguratorState> = {}): TumblerConfiguratorState {
	return { ...createDefaultTumblerConfiguratorState(), productId: "16oz-snow-globe", finishOptionId: "snow_globe", ...overrides };
}

describe("computeTumblerPrice", () => {
	test("16oz Snow Globe is $20.00, matching the previous inquiry-flow price", () => {
		const result = computeTumblerPrice(baseState());
		expect(result.valid).toBe(true);
		expect(result.valid && result.unitPriceCents).toBe(2000);
	});

	test("20oz Glow / Sublimation finish options are $30 (glow) and $25 (base white/sublimation)", () => {
		const glow = computeTumblerPrice(baseState({ productId: "20oz-glow-sublimation", finishOptionId: "glow_dark" }));
		const sub = computeTumblerPrice(baseState({ productId: "20oz-glow-sublimation", finishOptionId: "base_white_sublimation" }));
		expect(glow.valid && glow.unitPriceCents).toBe(3000);
		expect(sub.valid && sub.unitPriceCents).toBe(2500);
	});

	test("25oz Glitter is $35.00", () => {
		const result = computeTumblerPrice(baseState({ productId: "25oz-glitter", finishOptionId: "glitter" }));
		expect(result.valid && result.unitPriceCents).toBe(3500);
	});

	test("quantity changes recalculate the extended total correctly", () => {
		const result = computeTumblerPrice(baseState({ quantity: 3 }));
		expect(result.valid && result.extendedPriceCents).toBe(result.unitPriceCents * 3);
	});

	test("is invalid without a product or finish selection", () => {
		expect(computeTumblerPrice(baseState({ productId: null })).valid).toBe(false);
		expect(computeTumblerPrice(baseState({ finishOptionId: null })).valid).toBe(false);
	});
});
