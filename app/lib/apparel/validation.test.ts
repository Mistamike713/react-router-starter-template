import { describe, expect, test } from "vitest";
import { validateColorStep, validateCustomizationStep, validateFullConfiguration } from "./validation";
import { DESIGN_SOURCE } from "./config";
import { createDefaultShirtConfiguratorState, type ShirtConfiguratorState } from "./types";

function completeState(overrides: Partial<ShirtConfiguratorState> = {}): ShirtConfiguratorState {
	return {
		...createDefaultShirtConfiguratorState(),
		garmentId: "tee_gildan_bella_canvas",
		sizeId: "adult_l",
		method: "htv",
		colorId: "black",
		designSource: DESIGN_SOURCE.UPLOAD_OWN,
		frontArtwork: { key: "abc123", url: "/uploads/abc123", fileName: "logo.png", mimeType: "image/png", artworkKind: "raster" },
		mockupAcknowledged: true,
		...overrides,
	};
}

describe("validateFullConfiguration", () => {
	test("a fully completed state passes validation", () => {
		expect(validateFullConfiguration(completeState()).valid).toBe(true);
	});

	test("missing color fails validation with a specific field error", () => {
		const result = validateFullConfiguration(completeState({ colorId: null }));
		expect(result.valid).toBe(false);
		expect(result.errors.colorId).toBeTruthy();
	});

	test("mockup acknowledgment is required before Add to Cart", () => {
		const result = validateFullConfiguration(completeState({ mockupAcknowledged: false }));
		expect(result.valid).toBe(false);
		expect(result.errors.mockupAcknowledged).toBeTruthy();
	});

	test("Upload My Design requires front artwork", () => {
		const result = validateFullConfiguration(completeState({ frontArtwork: null }));
		expect(result.valid).toBe(false);
		expect(result.errors.frontArtwork).toBeTruthy();
	});
});

describe("validateColorStep", () => {
	test("a color the garment's fabric isn't stocked in is rejected", () => {
		// Forest Green is only stocked on the cotton-blend fabric, not the performance-shirt fabric.
		const result = validateColorStep({ ...createDefaultShirtConfiguratorState(), garmentId: "tee_dri_fit", colorId: "forest_green" });
		expect(result.valid).toBe(false);
	});

	test("every fabric-stocked color is accepted without a customer-selected production method", () => {
		const result = validateColorStep({ ...createDefaultShirtConfiguratorState(), garmentId: "tee_dri_fit", colorId: "black" });
		expect(result.valid).toBe(true);
	});
});

describe("validateCustomizationStep", () => {
	test("name toggle without a name value fails validation", () => {
		const result = validateCustomizationStep({ ...createDefaultShirtConfiguratorState(), name: true, nameValue: "" });
		expect(result.valid).toBe(false);
		expect(result.errors.nameValue).toBeTruthy();
	});

	test("number toggle without a number value fails validation", () => {
		const result = validateCustomizationStep({ ...createDefaultShirtConfiguratorState(), number: true, numberValue: "  " });
		expect(result.valid).toBe(false);
		expect(result.errors.numberValue).toBeTruthy();
	});

	test("specialty HTV toggle without a material selection fails validation", () => {
		const result = validateCustomizationStep({ ...createDefaultShirtConfiguratorState(), specialtyHTV: true, specialtyMaterialId: null });
		expect(result.valid).toBe(false);
		expect(result.errors.specialtyMaterialId).toBeTruthy();
	});
});
