// ============================================================================
// Human-shareable order reference numbers. There is no backend order
// database yet (that arrives with Stripe in a later phase), so this is a
// client-generated reference the customer and MNH Creations can both refer
// to in email correspondence — not a payment or fulfillment confirmation.
// ============================================================================

export function generateOrderReference(): string {
	const stamp = Date.now().toString(36).toUpperCase();
	const random = Math.random().toString(36).slice(2, 6).toUpperCase();
	return `MNH-${stamp}-${random}`;
}
