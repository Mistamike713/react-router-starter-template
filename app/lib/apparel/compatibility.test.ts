import { describe, expect, test } from "vitest";
import {
	garmentSupportsMethod,
	getEligibleColors,
	getMaxDesignDimensions,
	getMaxDesignDimensionsForGarment,
	getReviewReasons,
	validateArtworkFile,
} from "./compatibility";
import { GARMENTS, PRODUCTION_METHOD, PRODUCTION_METHOD_DISCLOSURE, REVIEW_REASON } from "./config";
import { createDefaultShirtConfiguratorState } from "./types";

describe("getMaxDesignDimensions", () => {
	// TEST 9 — Sublimation displays an 11" x 17" equipment maximum
	test("Sublimation equipment maximum is 11x17 for a garment with a large printable area", () => {
		const dims = getMaxDesignDimensions("adult_l", PRODUCTION_METHOD.SUBLIMATION);
		expect(dims?.width).toBe(11);
		expect(dims?.height).toBe(16); // adult printable area height (16) is the tighter bound here
	});

	// TEST 10 — Vinyl displays a 24x24 equipment maximum, clamped by garment area
	test("HTV/Vinyl is clamped to the garment printable area on an adult tee (12x16), not the raw 24x24 equipment max", () => {
		const dims = getMaxDesignDimensions("adult_l", PRODUCTION_METHOD.HTV);
		expect(dims?.width).toBe(12);
		expect(dims?.height).toBe(16);
		expect(dims?.limitedByEquipment).toBe(false);
	});

	test("An infant garment clamps HTV well below the 24x24 equipment maximum", () => {
		const dims = getMaxDesignDimensions("infant_12m", PRODUCTION_METHOD.HTV);
		expect(dims?.width).toBe(8);
		expect(dims?.height).toBe(10);
	});
});

describe("sublimation compatibility", () => {
	// TEST 11 — Sublimation prevents/flags incompatible dark/non-polyester garments
	test("Sublimation is not supported at all on the cotton-blend Gildan/Bella+Canvas fabric", () => {
		expect(garmentSupportsMethod("tee_gildan_bella_canvas", PRODUCTION_METHOD.SUBLIMATION)).toBe(false);
		expect(garmentSupportsMethod("tee_dri_fit", PRODUCTION_METHOD.SUBLIMATION)).toBe(true);
	});

	test("Sublimation color list on Dri-Fit excludes dark colors and includes only light colors", () => {
		const colors = getEligibleColors("tee_dri_fit", PRODUCTION_METHOD.SUBLIMATION);
		expect(colors.length).toBeGreaterThan(0);
		expect(colors.every((c) => c.lightColor === true)).toBe(true);
		expect(colors.some((c) => c.id === "black")).toBe(false);
	});

	test("HTV color list on Dri-Fit includes both light and dark colors it is stocked in", () => {
		const colors = getEligibleColors("tee_dri_fit", PRODUCTION_METHOD.HTV);
		expect(colors.some((c) => c.id === "black")).toBe(true);
		expect(colors.some((c) => c.id === "white")).toBe(true);
	});

	test("Sublimation color list on cotton-blend Gildan/Bella+Canvas is empty (fabric does not support sublimation)", () => {
		const colors = getEligibleColors("tee_gildan_bella_canvas", PRODUCTION_METHOD.SUBLIMATION);
		expect(colors.length).toBe(0);
	});
});

describe("getReviewReasons", () => {
	test("flags SUBLIMATION_REVIEW whenever sublimation is selected", () => {
		const reasons = getReviewReasons({
			...createDefaultShirtConfiguratorState(),
			garmentId: "tee_dri_fit",
			colorId: "white",
			method: PRODUCTION_METHOD.SUBLIMATION,
		});
		expect(reasons).toContain(REVIEW_REASON.SUBLIMATION_REVIEW);
	});

	test("flags SPECIALTY_MATERIAL_REVIEW only when a specialty material is selected", () => {
		const withSpecialty = getReviewReasons({
			...createDefaultShirtConfiguratorState(),
			garmentId: "tee_gildan_bella_canvas",
			method: PRODUCTION_METHOD.HTV,
			specialtyHTV: true,
			specialtyMaterialId: "glitter",
		});
		const withoutSpecialty = getReviewReasons({
			...createDefaultShirtConfiguratorState(),
			garmentId: "tee_gildan_bella_canvas",
			method: PRODUCTION_METHOD.HTV,
			specialtyHTV: false,
		});
		expect(withSpecialty).toContain(REVIEW_REASON.SPECIALTY_MATERIAL_REVIEW);
		expect(withoutSpecialty).not.toContain(REVIEW_REASON.SPECIALTY_MATERIAL_REVIEW);
	});
});

describe("customer-facing garment simplification", () => {
	test("garment labels are generic, customer-facing names with no brand/trademark terms", () => {
		const labels = GARMENTS.map((g) => g.label);
		expect(labels).toContain("T-Shirt");
		expect(labels).toContain("Performance Shirt");
		expect(labels.join(" ")).not.toMatch(/dri-fit/i);
	});

	test("the Performance Shirt carries the required supporting copy", () => {
		const performance = GARMENTS.find((g) => g.id === "tee_dri_fit");
		expect(performance?.description).toBe("Lightweight, moisture-wicking performance fabric.");
	});

	test("a production-method disclosure explaining MNH decides the method is available", () => {
		expect(PRODUCTION_METHOD_DISCLOSURE.length).toBeGreaterThan(0);
		expect(PRODUCTION_METHOD_DISCLOSURE).toMatch(/MNH Creations/);
	});

	test("getEligibleColors without a method returns every color the fabric is stocked in", () => {
		const colors = getEligibleColors("tee_dri_fit");
		expect(colors.some((c) => c.id === "black")).toBe(true);
		expect(colors.some((c) => c.id === "white")).toBe(true);
		expect(colors.length).toBeGreaterThan(1);
	});

	test("getMaxDesignDimensionsForGarment is method-independent and never exceeds any supported method's equipment max", () => {
		// tee_dri_fit supports both HTV (24x24) and sublimation (11x17); the
		// customer-facing bound must be safe for whichever MNH picks.
		const dims = getMaxDesignDimensionsForGarment("adult_l", "tee_dri_fit");
		expect(dims?.width).toBe(11);
		expect(dims?.height).toBe(16);
	});
});

describe("validateArtworkFile", () => {
	test("rejects unsupported file types", () => {
		const fakeFile = { name: "design.exe", type: "application/x-msdownload", size: 1000 } as File;
		expect(validateArtworkFile(fakeFile).valid).toBe(false);
	});

	test("accepts a reasonably-sized PNG", () => {
		const fakeFile = { name: "design.png", type: "image/png", size: 2 * 1024 * 1024 } as File;
		expect(validateArtworkFile(fakeFile).valid).toBe(true);
	});

	test("rejects an oversized file", () => {
		const fakeFile = { name: "design.png", type: "image/png", size: 100 * 1024 * 1024 } as File;
		expect(validateArtworkFile(fakeFile).valid).toBe(false);
	});
});
