import { describe, expect, test } from "vitest";
import { validateDesignStep, validateFullConfiguration, validateProductStep } from "./validation";
import { TUMBLER_DESIGN_SOURCE } from "./config";
import { createDefaultTumblerConfiguratorState, type TumblerConfiguratorState } from "./types";

function completeState(overrides: Partial<TumblerConfiguratorState> = {}): TumblerConfiguratorState {
	return {
		...createDefaultTumblerConfiguratorState(),
		productId: "16oz-snow-globe",
		finishOptionId: "snow_globe",
		designSource: TUMBLER_DESIGN_SOURCE.UPLOAD_OWN,
		artwork: { key: "abc", url: "/uploads/abc", fileName: "wrap.png", mimeType: "image/png", artworkKind: "raster" },
		mockupAcknowledged: true,
		...overrides,
	};
}

describe("validateProductStep", () => {
	test("requires both a product and a finish option", () => {
		expect(validateProductStep({ ...createDefaultTumblerConfiguratorState() }).valid).toBe(false);
		expect(validateProductStep({ ...createDefaultTumblerConfiguratorState(), productId: "16oz-snow-globe" }).valid).toBe(false);
		expect(validateProductStep({ ...createDefaultTumblerConfiguratorState(), productId: "16oz-snow-globe", finishOptionId: "snow_globe" }).valid).toBe(true);
	});
});

describe("validateDesignStep", () => {
	test("Upload My Design requires artwork", () => {
		const result = validateDesignStep({ ...createDefaultTumblerConfiguratorState(), designSource: TUMBLER_DESIGN_SOURCE.UPLOAD_OWN });
		expect(result.valid).toBe(false);
		expect(result.errors.artwork).toBeTruthy();
	});

	test("Create a Design for Me requires instructions", () => {
		const result = validateDesignStep({ ...createDefaultTumblerConfiguratorState(), designSource: TUMBLER_DESIGN_SOURCE.CREATE_FOR_ME });
		expect(result.valid).toBe(false);
		expect(result.errors.instructions).toBeTruthy();
	});
});

describe("validateFullConfiguration", () => {
	test("a fully completed state passes validation", () => {
		expect(validateFullConfiguration(completeState()).valid).toBe(true);
	});

	test("mockup acknowledgment is required before Add to Cart", () => {
		const result = validateFullConfiguration(completeState({ mockupAcknowledged: false }));
		expect(result.valid).toBe(false);
		expect(result.errors.mockupAcknowledged).toBeTruthy();
	});
});
