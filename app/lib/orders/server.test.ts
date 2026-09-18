import { expect, test, vi } from "vitest";
import { validateAndPriceOrder } from "./server";
import { createDefaultTumblerConfiguratorState } from "../tumbler/types";
import { TUMBLER_DESIGN_SOURCE } from "../tumbler/config";
import { createStripeCheckoutSession } from "../stripe/server";
import { cartReducer } from "../cart/CartContext";
import { createEmptyCartState } from "../cart/types";

const config = {
  ...createDefaultTumblerConfiguratorState(),
  productId: "16oz-snow-globe", finishOptionId: "snow_globe",
  designSource: TUMBLER_DESIGN_SOURCE.UPLOAD_OWN,
  artwork: { key: "abc", url: "/uploads/abc", fileName: "wrap.png", mimeType: "image/png", artworkKind: "raster" },
  mockupAcknowledged: true, quantity: 1,
};
const item = { kind: "custom_tumbler" as const, name: "Tumbler", productId: "16oz-snow-globe", quantity: 2, unitPriceCents: 1, config };
const input = { customer: { name: "Test", email: "test@example.com" }, items: [item] };

test("cart quantity overrides stale configuration and client prices", () => {
  const order = validateAndPriceOrder(input);
  expect(order.subtotalCents).toBe(4000);
  expect(order.items[0]).toMatchObject({ quantity: 2, unitPriceCents: 2000, extendedPriceCents: 4000, config: { quantity: 2 } });
});
test.each([0, -1, 1.5, NaN, Infinity, undefined, "2"])("rejects invalid quantity %s", (quantity) => {
  expect(() => validateAndPriceOrder({ ...input, items: [{ ...item, quantity: quantity as number }] })).toThrow("quantity");
});
test("cart edits and old saved carts synchronize configuration", () => {
  let state = cartReducer(createEmptyCartState(), { type: "ADD_ITEM", item });
  const id = state.items[0].id;
  state = cartReducer(state, { type: "UPDATE_QUANTITY", id, quantity: 3 });
  expect(state.items[0].config.quantity).toBe(3);
  state = cartReducer(state, { type: "UPDATE_ITEM", id, patch: { quantity: 4, config } });
  expect(state.items[0].config.quantity).toBe(4);
  state.items[0].config.quantity = 1;
  state = cartReducer(state, { type: "HYDRATE", state });
  expect(state.items[0].config.quantity).toBe(4);
});
test("two different products retain quantities and authoritative prices in Stripe", async () => {
  const order = validateAndPriceOrder({ ...input, items: [item, { ...item, quantity: 1, productId: "25oz-glitter", config: { ...config, productId: "25oz-glitter", finishOptionId: "glitter" } }] });
  expect(order.subtotalCents).toBe(7500);
  const fetchMock = vi.fn().mockResolvedValue(Response.json({ id: "cs_test_mock", url: "https://example.com" }));
  vi.stubGlobal("fetch", fetchMock);
  try {
    await createStripeCheckoutSession({ secretKey: "test-only", orderId: "order-test", customerEmail: "test@example.com", lines: order.items, shippingCents: 0, fulfillmentMethod: "pickup", origin: "https://example.com" });
    const body = fetchMock.mock.calls[0][1].body as URLSearchParams;
    expect(body.get("line_items[0][quantity]")).toBe("2");
    expect(body.get("line_items[0][price_data][unit_amount]")).toBe("2000");
    expect(body.get("line_items[1][quantity]")).toBe("1");
    expect(body.get("line_items[1][price_data][unit_amount]")).toBe("3500");
  } finally { vi.unstubAllGlobals(); }
});
