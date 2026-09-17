// ============================================================================
// Builds the plain-text MNH Creations order-request email body: a full,
// organized production summary (not raw JSON) covering customer contact
// info, fulfillment choice, full per-item configuration with artwork
// links, and a financial summary. Kept separate from CartWidget so it's
// unit-testable without React.
// ============================================================================

import { computeTax } from "./tax";
import { computeShippingEstimate, FULFILLMENT_METHOD, type FulfillmentMethod } from "./shipping";
import { describeCartItem, customShirtDetailLines } from "./describeCartItem";
import { formatCents } from "../apparel/pricing";
import type { CartItem, CustomerInfo } from "./types";

export function buildOrderSummaryText(params: {
	orderReference: string;
	customer: CustomerInfo;
	items: CartItem[];
	orderNotes: string;
	subtotalCents: number;
	fulfillmentMethod: FulfillmentMethod;
	destinationZip: string;
	shippingAddress: string;
}): string {
	const { orderReference, customer, items, orderNotes, subtotalCents, fulfillmentMethod, destinationZip, shippingAddress } = params;
	const tax = computeTax(subtotalCents);
	const shipping = computeShippingEstimate(fulfillmentMethod, destinationZip);
	const lines = [
		"MNH Creations — Order Request",
		`Order Reference: ${orderReference} (for correspondence only — not a payment confirmation)`,
		"",
		"Customer",
		`  Name: ${customer.name}`,
		`  Email: ${customer.email}`,
		`  Phone: ${customer.phone || "(not provided)"}`,
		"",
		"Fulfillment",
		fulfillmentMethod === FULFILLMENT_METHOD.PICKUP
			? "  Local Pickup"
			: `  Ship to ZIP ${destinationZip}\n  Address: ${shippingAddress || "(not provided)"}`,
		"",
		"Items",
	];
	items.forEach((item, idx) => {
		lines.push(`${idx + 1}. ${item.name} ×${item.quantity} — ${formatCents(item.extendedPriceCents)}`);
		const description = describeCartItem(item);
		if (description) lines.push(`   ${description}`);
		if (item.kind === "custom_shirt") {
			customShirtDetailLines(item.config).forEach((l) => lines.push(`   - ${l}`));
			const instructions = item.config.instructions;
			if (typeof instructions === "string" && instructions) lines.push(`   Instructions: ${instructions}`);
			if (item.reviewRequired) lines.push(`   [Subject to MNH review: ${item.reviewReasons.join(", ")}]`);
		}
		lines.push("");
	});
	lines.push("Financial Summary");
	lines.push(`  Merchandise Subtotal: ${formatCents(subtotalCents)}`);
	lines.push(`  ${tax.label}: ${formatCents(tax.taxCents)}${tax.authoritative ? "" : " (estimate)"}`);
	lines.push(`  ${shipping.label}: ${formatCents(shipping.shippingCents)}${shipping.authoritative ? "" : " (estimate)"}`);
	lines.push(`  Estimated Total: ${formatCents(subtotalCents + tax.taxCents + shipping.shippingCents)}`);
	if (orderNotes) lines.push("", "Notes for MNH Creations:", orderNotes);
	return lines.join("\n");
}
