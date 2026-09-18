import type { Route } from "./+types/api.orders";
import { persistDraftOrder, validateAndPriceOrder } from "../lib/orders/server";
import { isLaunchModeEnabled } from "../lib/launchMode.server";

export async function action({ request, context }: Route.ActionArgs) {
  if (request.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405 });
  if (isLaunchModeEnabled(context.cloudflare.env)) {
    return Response.json({ error: "MNH Creations launches October 1. Join the mailing list for 15% off your first order." }, { status: 403 });
  }
  try {
    const payload = await request.json();
    const validated = validateAndPriceOrder(payload);
    const orderId = await persistDraftOrder(context.cloudflare.env.ORDERS_DB, validated);
    return Response.json({
      orderId,
      status: "draft",
      currency: "usd",
      subtotalCents: validated.subtotalCents,
      shippingCents: validated.shippingCents,
      estimatedTotalBeforeTaxCents: validated.subtotalCents + validated.shippingCents,
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create order.";
    return Response.json({ error: message }, { status: 400 });
  }
}
