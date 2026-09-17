// ============================================================================
// Site-wide shopping cart context.
//
// Works for BOTH the existing tumbler products (kind: 'simple_product') and
// the custom shirt configurator (kind: 'custom_shirt', which carries the
// full ShirtConfiguratorState in `config`). This app is server-rendered
// (React Router 7 SSR on Cloudflare Workers), so the cart always renders
// empty on the server and hydrates from localStorage in a client-only
// effect immediately after mount — persisting anonymous-customer carts
// without requiring accounts, matching the rest of this site.
// ============================================================================

import { createContext, useCallback, useContext, useEffect, useReducer, useState, type ReactNode } from "react";
import {
	createEmptyCartState,
	type CartItem,
	type CartState,
	type NewCartItemInput,
} from "./types";
import { FULFILLMENT_METHOD, type FulfillmentMethod } from "./shipping";

const STORAGE_KEY = "mnh_cart_v1";

export type CartAction =
	| { type: "HYDRATE"; state: CartState }
	| { type: "ADD_ITEM"; item: NewCartItemInput }
	| { type: "REMOVE_ITEM"; id: string }
	| { type: "UPDATE_QUANTITY"; id: string; quantity: number }
	| { type: "UPDATE_ITEM"; id: string; patch: Partial<NewCartItemInput> }
	| { type: "DUPLICATE_ITEM"; id: string }
	| { type: "SET_ORDER_NOTES"; notes: string }
	| { type: "SET_FULFILLMENT_METHOD"; method: FulfillmentMethod }
	| { type: "SET_DESTINATION_ZIP"; zip: string }
	| { type: "CLEAR" };

function generateId(): string {
	if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
		return `cartitem_${crypto.randomUUID()}`;
	}
	return `cartitem_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function buildItem(input: NewCartItemInput, id: string, now: number): CartItem {
	const quantity = Math.max(1, Math.round(Number(input.quantity) || 1));
	const unitPriceCents = Math.max(0, Math.round(Number(input.unitPriceCents) || 0));
	return {
		id,
		kind: input.kind,
		productId: input.productId,
		name: input.name,
		quantity,
		unitPriceCents,
		extendedPriceCents: unitPriceCents * quantity,
		reviewRequired: Boolean(input.reviewRequired),
		reviewReasons: input.reviewReasons ? [...input.reviewReasons] : [],
		config: input.config ?? {},
		addedAt: now,
		updatedAt: now,
	};
}

export function cartReducer(state: CartState, action: CartAction): CartState {
	switch (action.type) {
		case "HYDRATE":
			return action.state;

		case "ADD_ITEM": {
			const now = Date.now();
			const item = buildItem(action.item, generateId(), now);
			return { ...state, items: [...state.items, item] };
		}

		case "REMOVE_ITEM":
			return { ...state, items: state.items.filter((i) => i.id !== action.id) };

		case "UPDATE_QUANTITY":
			return {
				...state,
				items: state.items.map((item) => {
					if (item.id !== action.id) return item;
					const quantity = Math.max(1, Math.round(Number(action.quantity) || 1));
					return { ...item, quantity, extendedPriceCents: item.unitPriceCents * quantity, updatedAt: Date.now() };
				}),
			};

		case "UPDATE_ITEM":
			return {
				...state,
				items: state.items.map((item) => {
					if (item.id !== action.id) return item;
					const merged = { ...item, ...action.patch };
					const quantity = Math.max(1, Math.round(Number(merged.quantity) || 1));
					const unitPriceCents = Math.max(0, Math.round(Number(merged.unitPriceCents) || 0));
					return {
						...merged,
						id: item.id,
						quantity,
						unitPriceCents,
						extendedPriceCents: unitPriceCents * quantity,
						updatedAt: Date.now(),
					};
				}),
			};

		case "DUPLICATE_ITEM": {
			const existing = state.items.find((i) => i.id === action.id);
			if (!existing) return state;
			const now = Date.now();
			const copy: CartItem = {
				...existing,
				id: generateId(),
				addedAt: now,
				updatedAt: now,
				config: JSON.parse(JSON.stringify(existing.config)),
			};
			return { ...state, items: [...state.items, copy] };
		}

		case "SET_ORDER_NOTES":
			return { ...state, orderNotes: action.notes };

		case "SET_FULFILLMENT_METHOD":
			return { ...state, fulfillmentMethod: action.method };

		case "SET_DESTINATION_ZIP":
			return { ...state, destinationZip: action.zip };

		case "CLEAR":
			return createEmptyCartState();

		default:
			return state;
	}
}

type CartContextValue = {
	state: CartState;
	/** True once client-side localStorage hydration has run. Callers that need to read an existing item (e.g. "edit this cart item") must wait for this before trusting an empty/missing result. */
	hydrated: boolean;
	addItem: (item: NewCartItemInput) => void;
	removeItem: (id: string) => void;
	updateQuantity: (id: string, quantity: number) => void;
	updateItem: (id: string, patch: Partial<NewCartItemInput>) => void;
	duplicateItem: (id: string) => void;
	setOrderNotes: (notes: string) => void;
	setFulfillmentMethod: (method: FulfillmentMethod) => void;
	setDestinationZip: (zip: string) => void;
	clear: () => void;
	getItem: (id: string) => CartItem | null;
};

const CartContext = createContext<CartContextValue | null>(null);

function readStoredState(): CartState | null {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw);
		if (!parsed || !Array.isArray(parsed.items)) return null;
		// Older saved carts predate fulfillmentMethod/destinationZip — default
		// them in rather than losing the saved cart.
		return {
			items: parsed.items,
			orderNotes: typeof parsed.orderNotes === "string" ? parsed.orderNotes : "",
			fulfillmentMethod: parsed.fulfillmentMethod === FULFILLMENT_METHOD.SHIPPING ? FULFILLMENT_METHOD.SHIPPING : FULFILLMENT_METHOD.PICKUP,
			destinationZip: typeof parsed.destinationZip === "string" ? parsed.destinationZip : "",
		};
	} catch {
		return null;
	}
}

export function CartProvider({ children }: { children: ReactNode }) {
	const [state, dispatch] = useReducer(cartReducer, createEmptyCartState());
	const [hydrated, setHydrated] = useState(false);

	// Client-only hydration from localStorage, run once after mount so the
	// server-rendered (always-empty) markup matches the client's first paint.
	useEffect(() => {
		const stored = readStoredState();
		if (stored) dispatch({ type: "HYDRATE", state: stored });
		setHydrated(true);
	}, []);

	// Persist every change, but never before hydration has run — otherwise
	// the initial empty state would overwrite a previously saved cart.
	useEffect(() => {
		if (!hydrated) return;
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
		} catch {
			// Storage full/unavailable (private browsing, quota) — cart still
			// works for this page load, just won't survive a refresh.
		}
	}, [state, hydrated]);

	const addItem = useCallback((item: NewCartItemInput) => dispatch({ type: "ADD_ITEM", item }), []);
	const removeItem = useCallback((id: string) => dispatch({ type: "REMOVE_ITEM", id }), []);
	const updateQuantity = useCallback((id: string, quantity: number) => dispatch({ type: "UPDATE_QUANTITY", id, quantity }), []);
	const updateItem = useCallback((id: string, patch: Partial<NewCartItemInput>) => dispatch({ type: "UPDATE_ITEM", id, patch }), []);
	const duplicateItem = useCallback((id: string) => dispatch({ type: "DUPLICATE_ITEM", id }), []);
	const setOrderNotes = useCallback((notes: string) => dispatch({ type: "SET_ORDER_NOTES", notes }), []);
	const setFulfillmentMethod = useCallback((method: FulfillmentMethod) => dispatch({ type: "SET_FULFILLMENT_METHOD", method }), []);
	const setDestinationZip = useCallback((zip: string) => dispatch({ type: "SET_DESTINATION_ZIP", zip }), []);
	const clear = useCallback(() => dispatch({ type: "CLEAR" }), []);
	const getItem = useCallback((id: string) => state.items.find((i) => i.id === id) ?? null, [state.items]);

	return (
		<CartContext.Provider
			value={{
				state,
				hydrated,
				addItem,
				removeItem,
				updateQuantity,
				updateItem,
				duplicateItem,
				setOrderNotes,
				setFulfillmentMethod,
				setDestinationZip,
				clear,
				getItem,
			}}
		>
			{children}
		</CartContext.Provider>
	);
}

export function useCart(): CartContextValue {
	const ctx = useContext(CartContext);
	if (!ctx) throw new Error("useCart must be used within a CartProvider");
	return ctx;
}
