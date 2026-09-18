import type { Route } from "./+types/api.stripe.webhook";
import { verifyStripeWebhook } from "../lib/stripe/webhook";

type StripeCheckoutSession = {
  id: string;
  client_reference_id?: string | null;
  metadata?: { order_id?: string };
  payment_intent?: string | null;
  payment_status?: string;
  amount_total?: number | null;
  total_details?: { amount_tax?: number | null } | null;
};

type StripeEvent = {
  id: string;
  type: string;
  data: { object: StripeCheckoutSession };
};

const SUCCESS_EVENTS = new Set([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
]);

export async function action({ request, context }: Route.ActionArgs) {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const secret = context.cloudflare.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return new Response("Webhook not configured", { status: 503 });

  const signature = request.headers.get("Stripe-Signature");
  if (!signature) return new Response("Missing signature", { status: 400 });

  const rawBody = await request.text();
  if (!(await verifyStripeWebhook({ payload: rawBody, signatureHeader: signature, secret }))) {
    return new Response("Invalid signature", { status: 400 });
  }

  let event: StripeEvent;
  try {
    event = JSON.parse(rawBody) as StripeEvent;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  if (!event.id || !event.type || !event.data?.object?.id) {
    return new Response("Invalid event", { status: 400 });
  }

  const session = event.data.object;
  const orderId = session.metadata?.order_id || session.client_reference_id || null;
  const db = context.cloudflare.env.ORDERS_DB;
  const now = new Date().toISOString();

  const alreadyProcessed = await db.prepare("SELECT event_id FROM stripe_events WHERE event_id = ?")
    .bind(event.id).first();
  if (alreadyProcessed) return Response.json({ received: true, duplicate: true });

  if (orderId && (SUCCESS_EVENTS.has(event.type) || event.type === "checkout.session.async_payment_failed" || event.type === "checkout.session.expired")) {
      const order = await db.prepare("SELECT stripe_checkout_session_id FROM orders WHERE id = ?")
        .bind(orderId).first<{ stripe_checkout_session_id?: string }>();

      if (!order || order.stripe_checkout_session_id !== session.id) {
        return new Response("Order/session mismatch", { status: 409 });
      }

  }

  if (orderId && SUCCESS_EVENTS.has(event.type)) {
    if (session.payment_status === "paid" || event.type === "checkout.session.async_payment_succeeded") {
      await db.batch([
        db.prepare(`UPDATE orders
          SET status='paid', stripe_payment_intent_id=?, tax_cents=?, total_cents=?, paid_at=COALESCE(paid_at, ?), updated_at=?
          WHERE id=? AND status IN ('checkout_created','paid')`)
          .bind(
            session.payment_intent || null,
            session.total_details?.amount_tax ?? 0,
            session.amount_total ?? null,
            now,
            now,
            orderId,
          ),
        db.prepare("INSERT INTO stripe_events (event_id, event_type, order_id, processed_at) VALUES (?, ?, ?, ?)")
          .bind(event.id, event.type, orderId, now),
      ]);
      return Response.json({ received: true });
    }
  }

  if (orderId && event.type === "checkout.session.async_payment_failed") {
    await db.batch([
      db.prepare("UPDATE orders SET status='failed', updated_at=? WHERE id=? AND status='checkout_created'")
        .bind(now, orderId),
      db.prepare("INSERT INTO stripe_events (event_id, event_type, order_id, processed_at) VALUES (?, ?, ?, ?)")
        .bind(event.id, event.type, orderId, now),
    ]);
    return Response.json({ received: true });
  }

  if (orderId && event.type === "checkout.session.expired") {
    await db.batch([
      db.prepare("UPDATE orders SET status='cancelled', updated_at=? WHERE id=? AND status='checkout_created'")
        .bind(now, orderId),
      db.prepare("INSERT INTO stripe_events (event_id, event_type, order_id, processed_at) VALUES (?, ?, ?, ?)")
        .bind(event.id, event.type, orderId, now),
    ]);
    return Response.json({ received: true });
  }

  await db.prepare("INSERT INTO stripe_events (event_id, event_type, order_id, processed_at) VALUES (?, ?, ?, ?)")
    .bind(event.id, event.type, orderId, now).run();

  return Response.json({ received: true });
}

