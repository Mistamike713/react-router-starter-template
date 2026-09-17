// ============================================================================
// Centralized shipping-estimate calculation. Like tax.ts, this is a single
// small module rather than scattered literals in UI code, so a real carrier
// rate lookup (USPS/UPS API, weight/dimension-based, multi-zone, etc.) can
// be dropped in later behind the same computeShippingEstimate signature
// without touching the cart UI.
// ============================================================================

export const FULFILLMENT_METHOD = {
	PICKUP: "pickup",
	SHIPPING: "shipping",
} as const;
export type FulfillmentMethod = (typeof FULFILLMENT_METHOD)[keyof typeof FULFILLMENT_METHOD];

export const SHIPPING_CONFIG = {
	enabled: true,
	label: "Estimated Shipping",
	authoritative: false,
	// MNH Creations ships from this ZIP. Used for future carrier-rate lookups;
	// not shown to the customer today.
	shipFromZip: "77484",
	// No carrier-rate integration yet — a single flat estimate for any shipped
	// order. Replace with a real per-zone/weight lookup later; callers never
	// need to change when that happens.
	flatRateCents: 900,
	disclaimer:
		"Shipping shown is an estimate for reference only, not a live carrier quote. " +
		"MNH Creations will confirm final shipping cost before charging your order.",
};

export type ShippingResult = {
	shippingCents: number;
	authoritative: boolean;
	label: string;
	disclaimer: string;
};

/**
 * Local pickup is always free and needs no destination ZIP. Shipping uses a
 * flat, clearly-labeled estimate once a destination ZIP has been entered;
 * validate the ZIP separately with validateDestinationZip before relying on
 * this to gate order submission.
 */
export function computeShippingEstimate(
	fulfillmentMethod: FulfillmentMethod,
	destinationZip: string | null | undefined,
): ShippingResult {
	if (!SHIPPING_CONFIG.enabled || fulfillmentMethod === FULFILLMENT_METHOD.PICKUP) {
		return { shippingCents: 0, authoritative: false, label: SHIPPING_CONFIG.label, disclaimer: SHIPPING_CONFIG.disclaimer };
	}
	const hasZip = Boolean(destinationZip && destinationZip.trim());
	return {
		shippingCents: hasZip ? SHIPPING_CONFIG.flatRateCents : 0,
		authoritative: false,
		label: SHIPPING_CONFIG.label,
		disclaimer: SHIPPING_CONFIG.disclaimer,
	};
}

export type ZipValidationResult = { valid: boolean; error: string | null };

/** Pickup never requires a ZIP. Shipping requires a plausible 5-digit (or ZIP+4) US ZIP code. */
export function validateDestinationZip(fulfillmentMethod: FulfillmentMethod, zip: string | null | undefined): ZipValidationResult {
	if (fulfillmentMethod === FULFILLMENT_METHOD.PICKUP) return { valid: true, error: null };
	const trimmed = (zip ?? "").trim();
	if (!trimmed) return { valid: false, error: "Please enter a destination ZIP code." };
	if (!/^\d{5}(-\d{4})?$/.test(trimmed)) return { valid: false, error: "Please enter a valid 5-digit ZIP code." };
	return { valid: true, error: null };
}
