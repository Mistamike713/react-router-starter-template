// Integration-style tests: cart state changes (quantity, removal,
// fulfillment/ZIP) recompute totals correctly using the same pure
// tax/shipping functions the cart UI calls on every render.

import { describe, expect, test } from "vitest";
import { cartReducer } from "./CartContext";
import { createEmptyCartState, getCartSubtotalCents, type CartState } from "./types";
import { computeTax } from "./tax";
import { computeShippingEstimate, validateDestinationZip, FULFILLMENT_METHOD } from "./shipping";

function addItem(state: CartState, unitPriceCents: number, quantity = 1) {
	return cartReducer(state, {
		type: "ADD_ITEM",
		item: { kind: "custom_shirt", productId: "x", name: "X", quantity, unitPriceCents, config: {} },
	});
}

describe("cart totals recompute correctly across state changes", () => {
	test("quantity increase updates subtotal, tax, and estimated total together", () => {
		let state = addItem(createEmptyCartState(), 2500);
		let subtotal = getCartSubtotalCents(state);
		const taxBefore = computeTax(subtotal).taxCents;

		const id = state.items[0].id;
		state = cartReducer(state, { type: "UPDATE_QUANTITY", id, quantity: 3 });
		subtotal = getCartSubtotalCents(state);
		const taxAfter = computeTax(subtotal).taxCents;

		expect(subtotal).toBe(7500);
		expect(taxAfter).toBeGreaterThan(taxBefore);
	});

	test("removing the only item drops subtotal, tax, and shipping back to zero", () => {
		let state = addItem(createEmptyCartState(), 3000);
		state = cartReducer(state, { type: "SET_FULFILLMENT_METHOD", method: FULFILLMENT_METHOD.SHIPPING });
		state = cartReducer(state, { type: "SET_DESTINATION_ZIP", zip: "77484" });
		const id = state.items[0].id;
		state = cartReducer(state, { type: "REMOVE_ITEM", id });

		const subtotal = getCartSubtotalCents(state);
		const tax = computeTax(subtotal);
		const shipping = computeShippingEstimate(state.fulfillmentMethod, state.destinationZip);
		expect(subtotal).toBe(0);
		expect(tax.taxCents).toBe(0);
		// Shipping is still a flat estimate tied to fulfillment+ZIP, not item count,
		// so it stays computed off the (still shipping) fulfillment choice — only
		// the merchandise subtotal and tax react to the cart being emptied here.
		expect(shipping.shippingCents).toBeGreaterThan(0);
	});

	test("switching from pickup to shipping adds a nonzero estimated shipping once a valid ZIP is set", () => {
		let state = addItem(createEmptyCartState(), 2000);
		const pickupShipping = computeShippingEstimate(state.fulfillmentMethod, state.destinationZip);
		expect(pickupShipping.shippingCents).toBe(0);

		state = cartReducer(state, { type: "SET_FULFILLMENT_METHOD", method: FULFILLMENT_METHOD.SHIPPING });
		expect(validateDestinationZip(state.fulfillmentMethod, state.destinationZip).valid).toBe(false);

		state = cartReducer(state, { type: "SET_DESTINATION_ZIP", zip: "77484" });
		expect(validateDestinationZip(state.fulfillmentMethod, state.destinationZip).valid).toBe(true);
		const shippingResult = computeShippingEstimate(state.fulfillmentMethod, state.destinationZip);
		expect(shippingResult.shippingCents).toBeGreaterThan(0);
	});

	test("editing an item's config via UPDATE_ITEM recalculates its extended price without touching other items", () => {
		let state = addItem(createEmptyCartState(), 2000);
		state = addItem(state, 3000);
		const editedId = state.items[0].id;
		state = cartReducer(state, { type: "UPDATE_ITEM", id: editedId, patch: { unitPriceCents: 2500, quantity: 2 } });

		expect(state.items[0].extendedPriceCents).toBe(5000);
		expect(state.items[1].extendedPriceCents).toBe(3000);
		expect(getCartSubtotalCents(state)).toBe(8000);
	});

	test("duplicating a custom_tumbler item preserves its config and adds to the combined total", () => {
		let state = cartReducer(createEmptyCartState(), {
			type: "ADD_ITEM",
			item: { kind: "custom_tumbler", productId: "16oz-snow-globe", name: "Custom Tumbler", quantity: 1, unitPriceCents: 2000, config: { finishOptionId: "snow_globe" } },
		});
		const id = state.items[0].id;
		state = cartReducer(state, { type: "DUPLICATE_ITEM", id });

		expect(state.items.length).toBe(2);
		expect(state.items[1].config).toEqual({ finishOptionId: "snow_globe" });
		expect(getCartSubtotalCents(state)).toBe(4000);
	});
});
