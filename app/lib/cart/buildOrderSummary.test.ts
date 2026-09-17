import { describe, expect, test } from "vitest";
import { buildOrderSummaryText } from "./buildOrderSummary";
import { FULFILLMENT_METHOD } from "./shipping";
import type { CartItem, CustomerInfo } from "./types";

function customerInfo(overrides: Partial<CustomerInfo> = {}): CustomerInfo {
	return { name: "Jordan Rivera", email: "jordan@example.com", phone: "555-1234", ...overrides };
}

function shirtItem(overrides: Partial<CartItem> = {}): CartItem {
	return {
		id: "cartitem_1",
		kind: "custom_shirt",
		productId: "custom_htv_sublimation_shirt",
		name: "Custom T-Shirt — Adult L, Black",
		quantity: 1,
		unitPriceCents: 2500,
		extendedPriceCents: 2500,
		reviewRequired: false,
		reviewReasons: [],
		config: {
			garmentId: "tee_gildan_bella_canvas",
			sizeId: "adult_l",
			colorId: "black",
			frontArtwork: { key: "abc123", url: "https://mnhcreations.example/uploads/abc123", fileName: "logo.png", mimeType: "image/png", artworkKind: "raster" },
		},
		addedAt: 0,
		updatedAt: 0,
		...overrides,
	};
}

describe("buildOrderSummaryText", () => {
	test("includes customer name, email, and phone", () => {
		const text = buildOrderSummaryText({
			orderReference: "MNH-TEST-0001",
			customer: customerInfo(),
			items: [shirtItem()],
			orderNotes: "",
			subtotalCents: 2500,
			fulfillmentMethod: FULFILLMENT_METHOD.PICKUP,
			destinationZip: "",
			shippingAddress: "",
		});
		expect(text).toContain("Jordan Rivera");
		expect(text).toContain("jordan@example.com");
		expect(text).toContain("555-1234");
	});

	test("includes the order reference and is not raw JSON", () => {
		const text = buildOrderSummaryText({
			orderReference: "MNH-TEST-0002",
			customer: customerInfo(),
			items: [shirtItem()],
			orderNotes: "",
			subtotalCents: 2500,
			fulfillmentMethod: FULFILLMENT_METHOD.PICKUP,
			destinationZip: "",
			shippingAddress: "",
		});
		expect(text).toContain("Order Reference: MNH-TEST-0002");
		expect(text.trim().startsWith("{")).toBe(false);
	});

	test("shows a View / Download Customer Artwork link for uploaded front artwork", () => {
		const text = buildOrderSummaryText({
			orderReference: "MNH-TEST-0003",
			customer: customerInfo(),
			items: [shirtItem()],
			orderNotes: "",
			subtotalCents: 2500,
			fulfillmentMethod: FULFILLMENT_METHOD.PICKUP,
			destinationZip: "",
			shippingAddress: "",
		});
		expect(text).toContain("View / Download Customer Artwork (Front)");
		expect(text).toContain("https://mnhcreations.example/uploads/abc123");
	});

	test("shows pickup fulfillment with no ZIP/address required", () => {
		const text = buildOrderSummaryText({
			orderReference: "MNH-TEST-0004",
			customer: customerInfo(),
			items: [shirtItem()],
			orderNotes: "",
			subtotalCents: 2500,
			fulfillmentMethod: FULFILLMENT_METHOD.PICKUP,
			destinationZip: "",
			shippingAddress: "",
		});
		expect(text).toContain("Local Pickup");
	});

	test("shows shipping destination ZIP and address when shipping is selected", () => {
		const text = buildOrderSummaryText({
			orderReference: "MNH-TEST-0005",
			customer: customerInfo(),
			items: [shirtItem()],
			orderNotes: "",
			subtotalCents: 2500,
			fulfillmentMethod: FULFILLMENT_METHOD.SHIPPING,
			destinationZip: "77484",
			shippingAddress: "123 Main St, Katy, TX",
		});
		expect(text).toContain("Ship to ZIP 77484");
		expect(text).toContain("123 Main St, Katy, TX");
	});

	test("financial summary includes Merchandise Subtotal, Estimated Tax, Estimated Shipping, and Estimated Total", () => {
		const text = buildOrderSummaryText({
			orderReference: "MNH-TEST-0006",
			customer: customerInfo(),
			items: [shirtItem()],
			orderNotes: "",
			subtotalCents: 2500,
			fulfillmentMethod: FULFILLMENT_METHOD.SHIPPING,
			destinationZip: "77484",
			shippingAddress: "123 Main St",
		});
		expect(text).toContain("Merchandise Subtotal: $25.00");
		expect(text).toContain("Estimated Tax");
		expect(text).toContain("Estimated Shipping");
		expect(text).toContain("Estimated Total");
	});

	test("is readable/organized text, not JSON, even with special characters in notes", () => {
		const text = buildOrderSummaryText({
			orderReference: "MNH-TEST-0007",
			customer: customerInfo(),
			items: [shirtItem()],
			orderNotes: 'Please use {"curly": "braces"} font style',
			subtotalCents: 2500,
			fulfillmentMethod: FULFILLMENT_METHOD.PICKUP,
			destinationZip: "",
			shippingAddress: "",
		});
		expect(text).toContain("Notes for MNH Creations:");
		expect(() => JSON.parse(text)).toThrow();
	});
});
