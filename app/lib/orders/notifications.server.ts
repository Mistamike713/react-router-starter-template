type OrderRow = {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  fulfillment_method: string;
  destination_zip: string;
  shipping_address: string;
  order_notes: string;
  subtotal_cents: number;
  shipping_cents: number;
  tax_cents: number | null;
  total_cents: number | null;
  paid_at: string | null;
};

type OrderItemRow = {
  kind: string;
  name: string;
  quantity: number;
  unit_price_cents: number;
  extended_price_cents: number;
  review_required: number;
  review_reasons_json: string;
  config_json: string;
};

type NotificationEnv = {
  ORDERS_DB: D1Database;
  RESEND_API_KEY?: string;
};

const OWNER_EMAIL = "orders@mnhcreations.com";
const FROM_EMAIL = "MNH Creations <info@mnhcreations.com>";

function money(cents: number | null | undefined) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format((cents ?? 0) / 100);
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function prettyConfig(json: string) {
  try {
    const value = JSON.parse(json);
    return JSON.stringify(value, null, 2);
  } catch {
    return json;
  }
}

async function resend(env: NotificationEnv, body: Record<string, unknown>, idempotencyKey: string) {
  if (!env.RESEND_API_KEY) throw new Error("RESEND_API_KEY is not configured");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error("Order notification email could not be sent");
}

export async function sendPaidOrderNotifications(env: NotificationEnv, orderId: string) {
  const order = await env.ORDERS_DB.prepare("SELECT * FROM orders WHERE id=? AND status='paid'")
    .bind(orderId).first<OrderRow>();
  if (!order) throw new Error("Paid order not found");

  const result = await env.ORDERS_DB.prepare("SELECT kind,name,quantity,unit_price_cents,extended_price_cents,review_required,review_reasons_json,config_json FROM order_items WHERE order_id=? ORDER BY created_at,id")
    .bind(orderId).all<OrderItemRow>();
  const items = result.results ?? [];

  const itemText = items.map((item, index) =>
    `${index + 1}. ${item.name} x${item.quantity} — ${money(item.extended_price_cents)}\nConfiguration:\n${prettyConfig(item.config_json)}${item.review_required ? `\nREVIEW REQUIRED: ${item.review_reasons_json}` : ""}`
  ).join("\n\n");

  const fulfillment = order.fulfillment_method === "shipping"
    ? `Shipping\n${order.shipping_address}\nZIP: ${order.destination_zip}`
    : "Pickup";

  const ownerText = `New paid MNH Creations order\n\nOrder: ${order.id}\nCustomer: ${order.customer_name}\nEmail: ${order.customer_email}\nPhone: ${order.customer_phone || "Not provided"}\nFulfillment: ${fulfillment}\n\nItems\n${itemText}\n\nNotes: ${order.order_notes || "None"}\nSubtotal: ${money(order.subtotal_cents)}\nShipping: ${money(order.shipping_cents)}\nTax: ${money(order.tax_cents)}\nTotal paid: ${money(order.total_cents)}`;

  const ownerHtml = `<div style="font-family:Arial,sans-serif;line-height:1.5;color:#4A3728"><h2>New paid MNH Creations order</h2><p><strong>Order:</strong> ${escapeHtml(order.id)}</p><p><strong>Customer:</strong> ${escapeHtml(order.customer_name)}<br><strong>Email:</strong> ${escapeHtml(order.customer_email)}<br><strong>Phone:</strong> ${escapeHtml(order.customer_phone || "Not provided")}</p><p><strong>Fulfillment:</strong><br>${escapeHtml(fulfillment).replaceAll("\n","<br>")}</p><h3>Items</h3>${items.map((item, index) => `<div style="margin-bottom:18px"><strong>${index + 1}. ${escapeHtml(item.name)} × ${item.quantity} — ${money(item.extended_price_cents)}</strong><pre style="white-space:pre-wrap;background:#FFF7EC;padding:12px;border-radius:8px">${escapeHtml(prettyConfig(item.config_json))}</pre>${item.review_required ? `<p><strong>REVIEW REQUIRED:</strong> ${escapeHtml(item.review_reasons_json)}</p>` : ""}</div>`).join("")}<p><strong>Notes:</strong> ${escapeHtml(order.order_notes || "None")}</p><p><strong>Subtotal:</strong> ${money(order.subtotal_cents)}<br><strong>Shipping:</strong> ${money(order.shipping_cents)}<br><strong>Tax:</strong> ${money(order.tax_cents)}<br><strong>Total paid:</strong> ${money(order.total_cents)}</p></div>`;

  const customerText = `Thank you for your order, ${order.customer_name}!\n\nWe received your payment for MNH Creations order ${order.id}.\n\n${items.map(item => `${item.name} x${item.quantity} — ${money(item.extended_price_cents)}`).join("\n")}\n\nTotal paid: ${money(order.total_cents)}\nFulfillment: ${fulfillment}\n\nWe will use the customization details submitted with your order for production. If we need clarification or a proof approval, we will contact you.\n\nQuestions? Reply to this email or contact info@mnhcreations.com.\n\nImagine. Create. Love.\nMNH Creations`;

  const customerHtml = `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#4A3728"><h2>Thank you for your order!</h2><p>Hi ${escapeHtml(order.customer_name)},</p><p>We received your payment for MNH Creations order <strong>${escapeHtml(order.id)}</strong>.</p><h3>Your order</h3>${items.map(item => `<p><strong>${escapeHtml(item.name)}</strong> × ${item.quantity} — ${money(item.extended_price_cents)}</p>`).join("")}<p><strong>Total paid: ${money(order.total_cents)}</strong></p><p><strong>Fulfillment:</strong><br>${escapeHtml(fulfillment).replaceAll("\n","<br>")}</p><p>We will use the customization details submitted with your order for production. If we need clarification or a proof approval, we will contact you.</p><p>Questions? Reply to this email or contact info@mnhcreations.com.</p><p><em>Imagine. Create. Love.</em><br>MNH Creations</p></div>`;

  await resend(env, {
    from: FROM_EMAIL,
    reply_to: [order.customer_email],
    to: [OWNER_EMAIL],
    subject: `New paid order — ${order.id}`,
    text: ownerText,
    html: ownerHtml,
  }, `paid-order-owner/${order.id}`);

  await resend(env, {
    from: FROM_EMAIL,
    reply_to: ["info@mnhcreations.com"],
    to: [order.customer_email],
    subject: `MNH Creations order confirmed — ${order.id}`,
    text: customerText,
    html: customerHtml,
  }, `paid-order-customer/${order.id}`);
}
