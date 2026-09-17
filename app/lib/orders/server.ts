import { computeCustomShirtPrice } from "../apparel/pricing";
import { validateFullConfiguration as validateShirt } from "../apparel/validation";
import type { ShirtConfiguratorState } from "../apparel/types";
import { computeTumblerPrice } from "../tumbler/pricing";
import { validateFullConfiguration as validateTumbler } from "../tumbler/validation";
import type { TumblerConfiguratorState } from "../tumbler/types";
import { computeShippingEstimate, FULFILLMENT_METHOD } from "../cart/shipping";

type SubmittedItem = {
  kind: "custom_shirt" | "custom_tumbler";
  productId?: string;
  name?: string;
  quantity?: number;
  reviewRequired?: boolean;
  reviewReasons?: string[];
  config: Record<string, unknown>;
};

type OrderSubmission = {
  customer?: { name?: string; email?: string; phone?: string };
  fulfillmentMethod?: "pickup" | "shipping";
  destinationZip?: string;
  shippingAddress?: string;
  orderNotes?: string;
  items?: SubmittedItem[];
};

export type ValidatedOrder = {
  customer: { name: string; email: string; phone: string };
  fulfillmentMethod: "pickup" | "shipping";
  destinationZip: string;
  shippingAddress: string;
  orderNotes: string;
  items: Array<SubmittedItem & { name: string; productId: string; quantity: number; unitPriceCents: number; extendedPriceCents: number }>;
  subtotalCents: number;
  shippingCents: number;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateAndPriceOrder(input: OrderSubmission): ValidatedOrder {
  const name = input.customer?.name?.trim() ?? "";
  const email = input.customer?.email?.trim().toLowerCase() ?? "";
  const phone = input.customer?.phone?.trim() ?? "";
  if (!name || !emailPattern.test(email)) throw new Error("A valid customer name and email are required.");

  const fulfillmentMethod = input.fulfillmentMethod === FULFILLMENT_METHOD.SHIPPING ? FULFILLMENT_METHOD.SHIPPING : FULFILLMENT_METHOD.PICKUP;
  const destinationZip = input.destinationZip?.trim() ?? "";
  const shippingAddress = input.shippingAddress?.trim() ?? "";
  if (fulfillmentMethod === FULFILLMENT_METHOD.SHIPPING) {
    if (!/^\d{5}(-\d{4})?$/.test(destinationZip)) throw new Error("A valid destination ZIP is required for shipping.");
    if (!shippingAddress) throw new Error("A shipping address is required.");
  }

  if (!Array.isArray(input.items) || input.items.length === 0) throw new Error("The order has no items.");
  if (input.items.length > 50) throw new Error("Too many line items.");

  const items = input.items.map((item) => {
    if (!item || typeof item !== "object" || !item.config) throw new Error("Invalid line item.");
    if (item.kind === "custom_shirt") {
      const config = item.config as unknown as ShirtConfiguratorState;
      const validation = validateShirt(config);
      if (!validation.valid) throw new Error("A shirt configuration is incomplete.");
      const price = computeCustomShirtPrice(config);
      if (!price.valid) throw new Error(price.error);
      return { ...item, productId: item.productId || config.garmentId || "custom-shirt", name: item.name || "Custom Shirt", quantity: price.quantity, unitPriceCents: price.unitPriceCents, extendedPriceCents: price.extendedPriceCents };
    }
    if (item.kind === "custom_tumbler") {
      const config = item.config as unknown as TumblerConfiguratorState;
      const validation = validateTumbler(config);
      if (!validation.valid) throw new Error("A tumbler configuration is incomplete.");
      const price = computeTumblerPrice(config);
      if (!price.valid) throw new Error(price.error);
      return { ...item, productId: item.productId || config.productId || "custom-tumbler", name: item.name || "Custom Tumbler", quantity: price.quantity, unitPriceCents: price.unitPriceCents, extendedPriceCents: price.extendedPriceCents };
    }
    throw new Error("Unsupported line item type.");
  });

  const subtotalCents = items.reduce((sum, item) => sum + item.extendedPriceCents, 0);
  const shippingCents = computeShippingEstimate(fulfillmentMethod, destinationZip).shippingCents;
  return { customer: { name, email, phone }, fulfillmentMethod, destinationZip, shippingAddress, orderNotes: input.orderNotes?.trim() ?? "", items, subtotalCents, shippingCents };
}

export async function persistDraftOrder(db: D1Database, order: ValidatedOrder): Promise<string> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const statements = [
    db.prepare(`INSERT INTO orders (id,status,currency,customer_name,customer_email,customer_phone,fulfillment_method,destination_zip,shipping_address,order_notes,subtotal_cents,shipping_cents,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .bind(id, "draft", "usd", order.customer.name, order.customer.email, order.customer.phone, order.fulfillmentMethod, order.destinationZip, order.shippingAddress, order.orderNotes, order.subtotalCents, order.shippingCents, now, now),
    ...order.items.map((item) => db.prepare(`INSERT INTO order_items (id,order_id,kind,product_id,name,quantity,unit_price_cents,extended_price_cents,review_required,review_reasons_json,config_json,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`)
      .bind(crypto.randomUUID(), id, item.kind, item.productId, item.name, item.quantity, item.unitPriceCents, item.extendedPriceCents, item.reviewRequired ? 1 : 0, JSON.stringify(item.reviewReasons ?? []), JSON.stringify(item.config), now)),
  ];
  await db.batch(statements);
  return id;
}
