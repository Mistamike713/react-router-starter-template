import { describe, expect, test } from "vitest";
import { cartReducer } from "./CartContext";
import { createEmptyCartState, getCartItemCount, getCartSubtotalCents, type CartState, type NewCartItemInput } from "./types";

function addItem(state: CartState, input: NewCartItemInput) {
	return cartReducer(state, { type: "ADD_ITEM", item: input });
}

describe("cartReducer", () => {
	// TEST 15 — Configured product survives Add to Cart
	test("ADD_ITEM stores the full item including config and computed extended price", () => {
		let state = createEmptyCartState();
		state = addItem(state, {
			kind: "custom_shirt",
			productId: "custom_htv_sublimation_shirt",
			name: "Custom HTV Shirt",
			quantity: 2,
			unitPriceCents: 3500,
			reviewRequired: true,
			reviewReasons: ["SUBLIMATION_REVIEW"],
			config: { sizeId: "adult_xl", colorId: "black" },
		});
		expect(state.items[0].extendedPriceCents).toBe(7000);
		expect(state.items[0].config).toEqual({ sizeId: "adult_xl", colorId: "black" });
	});

	// TEST 17 — Existing MNH products can be added to the same cart
	test("cart holds both simple_product and custom_shirt items together", () => {
		let state = createEmptyCartState();
		state = addItem(state, { kind: "simple_product", productId: "tumbler_16oz", name: "16oz Tumbler", quantity: 1, unitPriceCents: 2000, config: {} });
		state = addItem(state, { kind: "custom_shirt", productId: "custom_htv_sublimation_shirt", name: "Custom Shirt", quantity: 1, unitPriceCents: 3500, config: {} });
		expect(state.items.length).toBe(2);
		expect(getCartItemCount(state)).toBe(2);
	});

	// TEST 18/19 — Quantity changes recalculate totals; subtotal is correct
	test("UPDATE_QUANTITY recalculates extended price and cart subtotal", () => {
		let state = createEmptyCartState();
		state = addItem(state, { kind: "simple_product", productId: "x", name: "X", quantity: 1, unitPriceCents: 1000, config: {} });
		const id = state.items[0].id;
		state = cartReducer(state, { type: "UPDATE_QUANTITY", id, quantity: 4 });
		expect(state.items[0].extendedPriceCents).toBe(4000);
		expect(getCartSubtotalCents(state)).toBe(4000);
	});

	// TEST 23 — Removing an item works
	test("REMOVE_ITEM removes the item and updates totals", () => {
		let state = createEmptyCartState();
		state = addItem(state, { kind: "simple_product", productId: "x", name: "X", quantity: 1, unitPriceCents: 1000, config: {} });
		const id = state.items[0].id;
		state = cartReducer(state, { type: "REMOVE_ITEM", id });
		expect(state.items.length).toBe(0);
		expect(getCartSubtotalCents(state)).toBe(0);
	});

	// TEST 24 — Duplicate item works
	test("DUPLICATE_ITEM creates an independent copy with a new id", () => {
		let state = createEmptyCartState();
		state = addItem(state, { kind: "custom_shirt", productId: "x", name: "X", quantity: 1, unitPriceCents: 1000, config: { nameValue: "Alex" } });
		const id = state.items[0].id;
		state = cartReducer(state, { type: "DUPLICATE_ITEM", id });
		expect(state.items.length).toBe(2);
		const copy = state.items[1];
		expect(copy.id).not.toBe(id);
		(copy.config as { nameValue: string }).nameValue = "Jordan";
		expect((state.items[0].config as { nameValue: string }).nameValue).toBe("Alex");
	});

	// TEST 22 — Editing a configured shirt restores its selections (via UPDATE_ITEM)
	test("UPDATE_ITEM replaces config/pricing while preserving the item id", () => {
		let state = createEmptyCartState();
		state = addItem(state, { kind: "custom_shirt", productId: "x", name: "X", quantity: 1, unitPriceCents: 1000, config: { sizeId: "adult_m" } });
		const id = state.items[0].id;
		state = cartReducer(state, {
			type: "UPDATE_ITEM",
			id,
			patch: { name: "X Updated", quantity: 2, unitPriceCents: 1500, config: { sizeId: "adult_l" } },
		});
		const updated = state.items[0];
		expect(updated.id).toBe(id);
		expect((updated.config as { sizeId: string }).sizeId).toBe("adult_l");
		expect(updated.extendedPriceCents).toBe(3000);
	});

	test("SET_ORDER_NOTES stores order-level notes separate from item configs", () => {
		let state = createEmptyCartState();
		state = cartReducer(state, { type: "SET_ORDER_NOTES", notes: "Please rush if possible" });
		expect(state.orderNotes).toBe("Please rush if possible");
	});
});
