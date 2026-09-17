import { describe, expect, test } from "vitest";
import { computeCustomShirtPrice } from "./pricing";
import { DESIGN_SERVICE_LEVEL, DESIGN_SOURCE } from "./config";
import { createDefaultShirtConfiguratorState, type ShirtConfiguratorState } from "./types";

function baseState(overrides: Partial<ShirtConfiguratorState> = {}): ShirtConfiguratorState {
	return {
		...createDefaultShirtConfiguratorState(),
		garmentId: "tee_gildan_bella_canvas",
		sizeId: "adult_l",
		method: "htv",
		colorId: "black",
		designSource: DESIGN_SOURCE.UPLOAD_OWN,
		...overrides,
	};
}

describe("computeCustomShirtPrice", () => {
	// TEST 1 — Adult XL Gildan/Bella+Canvas base price is $35
	test("Adult XL Gildan/Bella+Canvas base price is $35.00", () => {
		const result = computeCustomShirtPrice(baseState({ garmentId: "tee_gildan_bella_canvas", sizeId: "adult_xl" }));
		expect(result.valid).toBe(true);
		expect(result.valid && result.basePriceCents).toBe(3500);
	});

	// TEST 2 — Adult XL Dri-Fit base price is $38
	test("Adult XL Dri-Fit base price is $38.00", () => {
		const result = computeCustomShirtPrice(baseState({ garmentId: "tee_dri_fit", sizeId: "adult_xl" }));
		expect(result.valid && result.basePriceCents).toBe(3800);
	});

	// TEST 3 — Adult 2XL / 3XL pricing matches configuration
	test("Adult 2XL and 3XL pricing matches the configured price table", () => {
		const xxl = computeCustomShirtPrice(baseState({ garmentId: "tee_gildan_bella_canvas", sizeId: "adult_2xl" }));
		const xxlDriFit = computeCustomShirtPrice(baseState({ garmentId: "tee_dri_fit", sizeId: "adult_2xl" }));
		const xxxl = computeCustomShirtPrice(baseState({ garmentId: "tee_gildan_bella_canvas", sizeId: "adult_3xl" }));
		const xxxlDriFit = computeCustomShirtPrice(baseState({ garmentId: "tee_dri_fit", sizeId: "adult_3xl" }));
		expect(xxl.valid && xxl.basePriceCents).toBe(3800);
		expect(xxlDriFit.valid && xxlDriFit.basePriceCents).toBe(4100);
		expect(xxxl.valid && xxxl.basePriceCents).toBe(4100);
		expect(xxxlDriFit.valid && xxxlDriFit.basePriceCents).toBe(4400);
	});

	test("Adult S-L base prices are $22 (Gildan/Bella+Canvas) and $24 (Dri-Fit)", () => {
		const cotton = computeCustomShirtPrice(baseState({ garmentId: "tee_gildan_bella_canvas", sizeId: "adult_s" }));
		const driFit = computeCustomShirtPrice(baseState({ garmentId: "tee_dri_fit", sizeId: "adult_m" }));
		expect(cotton.valid && cotton.basePriceCents).toBe(2200);
		expect(driFit.valid && driFit.basePriceCents).toBe(2400);
	});

	test("Infant, toddler, and youth base prices match the price table", () => {
		const infant = computeCustomShirtPrice(baseState({ sizeId: "infant_12m" }));
		const toddler = computeCustomShirtPrice(baseState({ sizeId: "toddler_3t" }));
		const youth = computeCustomShirtPrice(baseState({ sizeId: "youth_m" }));
		expect(infant.valid && infant.basePriceCents).toBe(1600);
		expect(toddler.valid && toddler.basePriceCents).toBe(1800);
		expect(youth.valid && youth.basePriceCents).toBe(1800);
	});

	// TEST 4 — Adult back design adds exactly $10
	test("Adult back design adds exactly $10.00", () => {
		const withBack = computeCustomShirtPrice(baseState({ sizeId: "adult_l", backDesign: true }));
		const withoutBack = computeCustomShirtPrice(baseState({ sizeId: "adult_l", backDesign: false }));
		expect(withBack.unitPriceCents - withoutBack.unitPriceCents).toBe(1000);
	});

	// TEST 5 — Youth back design adds exactly $8
	test("Youth back design adds exactly $8.00", () => {
		const withBack = computeCustomShirtPrice(baseState({ sizeId: "youth_m", backDesign: true }));
		const withoutBack = computeCustomShirtPrice(baseState({ sizeId: "youth_m", backDesign: false }));
		expect(withBack.unitPriceCents - withoutBack.unitPriceCents).toBe(800);
	});

	// TEST 6 — Adult specialty HTV adds exactly $4
	test("Adult specialty HTV adds exactly $4.00", () => {
		const withSpecialty = computeCustomShirtPrice(baseState({ sizeId: "adult_l", specialtyHTV: true, specialtyMaterialId: "glitter" }));
		const without = computeCustomShirtPrice(baseState({ sizeId: "adult_l", specialtyHTV: false }));
		expect(withSpecialty.unitPriceCents - without.unitPriceCents).toBe(400);
	});

	// TEST 7 — Youth specialty HTV adds exactly $2
	test("Youth specialty HTV adds exactly $2.00", () => {
		const withSpecialty = computeCustomShirtPrice(baseState({ sizeId: "youth_m", specialtyHTV: true, specialtyMaterialId: "glitter" }));
		const without = computeCustomShirtPrice(baseState({ sizeId: "youth_m", specialtyHTV: false }));
		expect(withSpecialty.unitPriceCents - without.unitPriceCents).toBe(200);
	});

	// TEST 8 — Name + Number adds $8, not $10
	test("Name + Number adds exactly $8.00, not $5 + $5", () => {
		const both = computeCustomShirtPrice(baseState({ name: true, number: true }));
		const nameOnly = computeCustomShirtPrice(baseState({ name: true, number: false }));
		const numberOnly = computeCustomShirtPrice(baseState({ name: false, number: true }));
		const neither = computeCustomShirtPrice(baseState({ name: false, number: false }));
		expect(both.unitPriceCents - neither.unitPriceCents).toBe(800);
		expect(nameOnly.unitPriceCents - neither.unitPriceCents).toBe(500);
		expect(numberOnly.unitPriceCents - neither.unitPriceCents).toBe(500);
	});

	test("Upload My Design carries no design service fee (base price includes one standard front design)", () => {
		const result = computeCustomShirtPrice(baseState({ designSource: DESIGN_SOURCE.UPLOAD_OWN }));
		expect(result.lines.some((l) => l.key === "designService")).toBe(false);
	});

	test("Complex Custom Design charges the $15 nonrefundable deposit as a line item", () => {
		const result = computeCustomShirtPrice(
			baseState({ designSource: DESIGN_SOURCE.CREATE_FOR_ME, designServiceLevel: DESIGN_SERVICE_LEVEL.COMPLEX_CUSTOM }),
		);
		const line = result.lines.find((l) => l.key === "designService");
		expect(line).toBeTruthy();
		expect(line?.amountCents).toBe(1500);
	});

	// TEST 18 — Quantity changes recalculate totals correctly
	test("Quantity changes recalculate the extended total correctly", () => {
		const result = computeCustomShirtPrice(baseState({ sizeId: "adult_l", quantity: 3 }));
		expect(result.valid && result.extendedPriceCents).toBe(result.unitPriceCents * 3);
	});

	test("computeCustomShirtPrice is invalid without a garment/size", () => {
		const result = computeCustomShirtPrice(baseState({ garmentId: null }));
		expect(result.valid).toBe(false);
	});
});
