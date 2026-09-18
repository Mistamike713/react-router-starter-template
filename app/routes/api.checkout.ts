import type { Route } from "./+types/api.checkout";
import { createStripeCheckoutSession } from "../lib/stripe/server";
import { mailingReady, normalizeEmail, type MailingEnv, type Subscriber } from "../lib/mailing.server";

export async function action({ request, context }: Route.ActionArgs) {
  if (request.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405 });
  try {
    const { orderId, couponCode } = await request.json() as { orderId?: string; couponCode?: string };
    if (!orderId) return Response.json({ error: "Order ID is required." }, { status: 400 });

    const db = context.cloudflare.env.ORDERS_DB;
    const order = await db.prepare("SELECT * FROM orders WHERE id = ?").bind(orderId).first<any>();
    if (!order || order.status !== "draft") return Response.json({ error: "Order is not available for checkout." }, { status: 409 });
    const { results } = await db.prepare("SELECT kind, name, quantity, unit_price_cents FROM order_items WHERE order_id = ? ORDER BY created_at").bind(orderId).all<any>();
    if (!results.length) return Response.json({ error: "Order has no items." }, { status: 400 });

    const secretKey = context.cloudflare.env.STRIPE_SECRET_KEY;
    if (!secretKey) throw new Error("Stripe is not configured.");
    const env = context.cloudflare.env as MailingEnv;
    let subscriber: Subscriber | null = null;
    let promotionId: string | undefined;
    if (mailingReady(env)) {
      subscriber = await db.prepare('SELECT * FROM mailing_subscribers WHERE email=?').bind(normalizeEmail(order.customer_email)).first<Subscriber>();
    }
    if (couponCode) {
      const paid = await db.prepare("SELECT id FROM orders WHERE lower(trim(customer_email))=? AND status='paid' LIMIT 1").bind(normalizeEmail(order.customer_email)).first();
      if (typeof couponCode !== 'string' || !subscriber?.confirmed_at || !subscriber.stripe_promotion_id || !subscriber.stripe_customer_id || subscriber.coupon_code !== couponCode.trim().toUpperCase() || paid) {
        return Response.json({error:'This code is not valid for this email or has already been used. Use the email that received your first-order code.'},{status:400});
      }
      promotionId = subscriber.stripe_promotion_id;
    }

    const session = await createStripeCheckoutSession({
      secretKey,
      orderId,
      customerEmail: order.customer_email,
      lines: results.map((row: any) => ({ kind: row.kind, name: row.name, quantity: row.quantity, unitPriceCents: row.unit_price_cents })),
      shippingCents: order.shipping_cents,
      fulfillmentMethod: order.fulfillment_method,
      origin: new URL(request.url).origin,
      customerId: subscriber?.stripe_customer_id || undefined,
      promotionId,
    });

    await db.prepare("UPDATE orders SET status='checkout_created', stripe_checkout_session_id=?, updated_at=? WHERE id=? AND status='draft'")
      .bind(session.id, new Date().toISOString(), orderId).run();

    return Response.json({ checkoutUrl: session.url, orderId });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to start checkout." }, { status: 500 });
  }
}
