import { FULFILLMENT_METHOD, type FulfillmentMethod } from "./shipping";

export type CartItemKind = "simple_product" | "custom_shirt" | "custom_tumbler";

export type CartItem = {
	id: string;
	kind: CartItemKind;
	productId: string;
	name: string;
	quantity: number;
	unitPriceCents: number;
	extendedPriceCents: number;
	reviewRequired: boolean;
	reviewReasons: string[];
	/** ShirtConfiguratorState for kind === 'custom_shirt'; a minimal description for 'simple_product'. */
	config: Record<string, unknown>;
	addedAt: number;
	updatedAt: number;
};

export type CustomerInfo = {
	name: string;
	email: string;
	phone: string;
};

export function createEmptyCustomerInfo(): CustomerInfo {
	return { name: "", email: "", phone: "" };
}

export type CartState = {
	items: CartItem[];
	orderNotes: string;
	/** How the order will reach the customer. Defaults to pickup so an empty cart never demands a ZIP. */
	fulfillmentMethod: FulfillmentMethod;
	/** Only meaningful (and validated) when fulfillmentMethod === "shipping". */
	destinationZip: string;
	/** Full street/city/state, only meaningful when fulfillmentMethod === "shipping". */
	shippingAddress: string;
	customer: CustomerInfo;
};

export function createEmptyCartState(): CartState {
	return {
		items: [],
		orderNotes: "",
		fulfillmentMethod: FULFILLMENT_METHOD.PICKUP,
		destinationZip: "",
		shippingAddress: "",
		customer: createEmptyCustomerInfo(),
	};
}

export type NewCartItemInput = {
	kind: CartItemKind;
	productId: string;
	name: string;
	quantity: number;
	unitPriceCents: number;
	reviewRequired?: boolean;
	reviewReasons?: string[];
	config: Record<string, unknown>;
};

export function getCartItemCount(state: CartState): number {
	return state.items.reduce((sum, item) => sum + item.quantity, 0);
}

export function getCartSubtotalCents(state: CartState): number {
	return state.items.reduce((sum, item) => sum + item.extendedPriceCents, 0);
}
