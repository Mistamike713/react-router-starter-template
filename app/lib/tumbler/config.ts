// ============================================================================
// MNH Creations — Custom Tumbler Configurator: centralized business data.
//
// Mirrors the apparel config.ts pattern: every product, finish option, and
// price lives here so the configurator/cart never hardcode a dollar amount
// or SKU a second time. Extensible — add a new tumbler product/size by
// adding an entry here, no component changes required.
//
// Prices/labels below are carried over unchanged from the previous
// inquiry-only tumbler listing on the homepage (see the "Custom Tumblers"
// section this replaces) — only the ordering flow changed, not the pricing.
// ============================================================================

export type TumblerFinishOption = {
	id: string;
	label: string;
	priceCents: number;
};

export type WrapDimensionsIn = { width: number; height: number };

export type TumblerProduct = {
	id: string;
	label: string;
	description: string;
	sizeOz: number;
	finishOptions: readonly TumblerFinishOption[];
	/**
	 * Flat sublimation-wrap print area, in inches (the unrolled design panel
	 * that wraps around the cylinder). Placeholder measurements — MNH has
	 * not supplied exact per-product wrap dimensions yet; replace with real
	 * measured values as they become available, the same caveat as the
	 * apparel PRINTABLE_AREA_IN table.
	 */
	wrapDimensionsIn: WrapDimensionsIn;
	bodyColorHex: string;
};

export const TUMBLER_PRODUCTS: readonly TumblerProduct[] = [
	{
		id: "16oz-snow-globe",
		label: "16oz — Snow Globe",
		description: "Plastic tumbler with a sealed snow-globe-style design.",
		sizeOz: 16,
		finishOptions: [{ id: "snow_globe", label: "Snow globe style", priceCents: 2000 }],
		wrapDimensionsIn: { width: 8.0, height: 3.2 },
		bodyColorHex: "#F4E3C7",
	},
	{
		id: "20oz-glow-sublimation",
		label: "20oz — Glow / Sublimation",
		description: "Choose glow-in-the-dark or a white base ready for full-wrap sublimation art.",
		sizeOz: 20,
		finishOptions: [
			{ id: "glow_dark", label: "Glow in the dark", priceCents: 3000 },
			{ id: "base_white_sublimation", label: "Base white / sublimation", priceCents: 2500 },
		],
		wrapDimensionsIn: { width: 8.66, height: 3.3 },
		bodyColorHex: "#FFFFFF",
	},
	{
		id: "25oz-glitter",
		label: "25oz — Glitter",
		description: "Full glitter tumbler for maximum sparkle.",
		sizeOz: 25,
		finishOptions: [{ id: "glitter", label: "Glitter style", priceCents: 3500 }],
		wrapDimensionsIn: { width: 9.25, height: 3.5 },
		bodyColorHex: "#F7E9EF",
	},
];

export function getTumblerProduct(productId: string | null | undefined): TumblerProduct | null {
	return TUMBLER_PRODUCTS.find((p) => p.id === productId) ?? null;
}

export function getTumblerFinishOption(product: TumblerProduct | null, finishId: string | null | undefined): TumblerFinishOption | null {
	if (!product) return null;
	return product.finishOptions.find((o) => o.id === finishId) ?? null;
}

export const TUMBLER_DESIGN_SOURCE = {
	UPLOAD_OWN: "upload_own",
	CREATE_FOR_ME: "create_for_me",
} as const;
export type TumblerDesignSource = (typeof TUMBLER_DESIGN_SOURCE)[keyof typeof TUMBLER_DESIGN_SOURCE];
