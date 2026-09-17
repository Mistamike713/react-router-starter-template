import { describe, expect, test } from "vitest";
import { computeShippingEstimate, validateDestinationZip, FULFILLMENT_METHOD } from "./shipping";

describe("computeShippingEstimate", () => {
	test("local pickup is always free and needs no destination ZIP", () => {
		const result = computeShippingEstimate(FULFILLMENT_METHOD.PICKUP, "");
		expect(result.shippingCents).toBe(0);
	});

	test("shipping with a destination ZIP produces a nonzero, non-authoritative estimate", () => {
		const result = computeShippingEstimate(FULFILLMENT_METHOD.SHIPPING, "77484");
		expect(result.shippingCents).toBeGreaterThan(0);
		expect(result.authoritative).toBe(false);
		expect(result.label).toBe("Estimated Shipping");
		expect(result.disclaimer.length).toBeGreaterThan(0);
	});

	test("shipping without a destination ZIP yet does not fabricate a rate", () => {
		const result = computeShippingEstimate(FULFILLMENT_METHOD.SHIPPING, "");
		expect(result.shippingCents).toBe(0);
	});
});

describe("validateDestinationZip", () => {
	test("pickup never requires a ZIP", () => {
		expect(validateDestinationZip(FULFILLMENT_METHOD.PICKUP, "").valid).toBe(true);
	});

	test("shipping requires a non-empty ZIP", () => {
		const result = validateDestinationZip(FULFILLMENT_METHOD.SHIPPING, "");
		expect(result.valid).toBe(false);
		expect(result.error).toBeTruthy();
	});

	test("shipping rejects a malformed ZIP", () => {
		expect(validateDestinationZip(FULFILLMENT_METHOD.SHIPPING, "abc").valid).toBe(false);
		expect(validateDestinationZip(FULFILLMENT_METHOD.SHIPPING, "1234").valid).toBe(false);
	});

	test("shipping accepts a valid 5-digit ZIP and a ZIP+4", () => {
		expect(validateDestinationZip(FULFILLMENT_METHOD.SHIPPING, "77484").valid).toBe(true);
		expect(validateDestinationZip(FULFILLMENT_METHOD.SHIPPING, "77484-1234").valid).toBe(true);
	});
});
