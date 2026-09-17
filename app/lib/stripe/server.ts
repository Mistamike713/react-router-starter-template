type CheckoutLine = { name: string; quantity: number; unitPriceCents: number };

function append(params: URLSearchParams, key: string, value: string | number | boolean) {
  params.append(key, String(value));
}

export async function createStripeCheckoutSession(args: {
  secretKey: string;
  orderId: string;
  customerEmail: string;
  lines: CheckoutLine[];
  shippingCents: number;
  fulfillmentMethod: "pickup" | "shipping";
  origin: string;
}) {
  const params = new URLSearchParams();
  append(params, "mode", "payment");
  append(params, "success_url", `${args.origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`);
  append(params, "cancel_url", `${args.origin}/?checkout=cancelled`);
  append(params, "client_reference_id", args.orderId);
  append(params, "metadata[order_id]", args.orderId);
  append(params, "customer_email", args.customerEmail);
  append(params, "automatic_tax[enabled]", true);
  append(params, "billing_address_collection", "auto");

  args.lines.forEach((line, index) => {
    append(params, `line_items[${index}][price_data][currency]`, "usd");
    append(params, `line_items[${index}][price_data][product_data][name]`, line.name);
    append(params, `line_items[${index}][price_data][unit_amount]`, line.unitPriceCents);
    append(params, `line_items[${index}][quantity]`, line.quantity);
  });

  if (args.shippingCents > 0) {
    const i = args.lines.length;
    append(params, `line_items[${i}][price_data][currency]`, "usd");
    append(params, `line_items[${i}][price_data][product_data][name]`, "Shipping");
    append(params, `line_items[${i}][price_data][unit_amount]`, args.shippingCents);
    append(params, `line_items[${i}][quantity]`, 1);
  }

  if (args.fulfillmentMethod === "shipping") {
    append(params, "shipping_address_collection[allowed_countries][0]", "US");
  }

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });
  const data = await response.json() as { id?: string; url?: string; error?: { message?: string } };
  if (!response.ok || !data.id || !data.url) throw new Error(data.error?.message || "Stripe could not create Checkout.");
  return { id: data.id, url: data.url };
}
