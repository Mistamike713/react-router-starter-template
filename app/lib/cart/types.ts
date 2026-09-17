export type CartItemKind = "simple_product" | "custom_shirt";

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

export type CartState = {
	items: CartItem[];
	orderNotes: string;
};

export function createEmptyCartState(): CartState {
	return { items: [], orderNotes: "" };
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
