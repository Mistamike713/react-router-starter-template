import type { Route } from "./+types/api.checkout";
import { createStripeCheckoutSession } from "../lib/stripe/server";

export async function action({ request, context }: Route.ActionArgs) {
  if (request.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405 });
  try {
    const { orderId } = await request.json() as { orderId?: string };
    if (!orderId) return Response.json({ error: "Order ID is required." }, { status: 400 });

    const db = context.cloudflare.env.ORDERS_DB;
    const order = await db.prepare("SELECT * FROM orders WHERE id = ?").bind(orderId).first<any>();
    if (!order || order.status !== "draft") return Response.json({ error: "Order is not available for checkout." }, { status: 409 });
    const { results } = await db.prepare("SELECT name, quantity, unit_price_cents FROM order_items WHERE order_id = ? ORDER BY created_at").bind(orderId).all<any>();
    if (!results.length) return Response.json({ error: "Order has no items." }, { status: 400 });

    const secretKey = context.cloudflare.env.STRIPE_SECRET_KEY;
    if (!secretKey) throw new Error("Stripe is not configured.");

    const session = await createStripeCheckoutSession({
      secretKey,
      orderId,
      customerEmail: order.customer_email,
      lines: results.map((row: any) => ({ name: row.name, quantity: row.quantity, unitPriceCents: row.unit_price_cents })),
      shippingCents: order.shipping_cents,
      fulfillmentMethod: order.fulfillment_method,
      origin: new URL(request.url).origin,
    });

    await db.prepare("UPDATE orders SET status='checkout_created', stripe_checkout_session_id=?, updated_at=? WHERE id=? AND status='draft'")
      .bind(session.id, new Date().toISOString(), orderId).run();

    return Response.json({ checkoutUrl: session.url, orderId });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to start checkout." }, { status: 500 });
  }
}
