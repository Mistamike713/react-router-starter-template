// ============================================================================
// Tumbler pricing engine — mirrors apparel/pricing.ts. Pure function, no
// DOM/React. Pricing is unchanged from the previous inquiry-flow listing:
// one line (the chosen finish option's price) times quantity.
// ============================================================================

import { getTumblerFinishOption, getTumblerProduct } from "./config";
import type { TumblerConfiguratorState } from "./types";
import type { PriceLine, PriceResult } from "../apparel/pricing";

export function computeTumblerPrice(state: TumblerConfiguratorState): PriceResult {
	const product = getTumblerProduct(state.productId);
	if (!product) {
		return { valid: false, error: "Please choose a tumbler.", lines: [], unitPriceCents: 0, extendedPriceCents: 0 };
	}
	const finish = getTumblerFinishOption(product, state.finishOptionId);
	if (!finish) {
		return { valid: false, error: "Please choose a finish.", lines: [], unitPriceCents: 0, extendedPriceCents: 0 };
	}

	const lines: PriceLine[] = [{ key: "base", label: finish.label, amountCents: finish.priceCents }];
	const unitPriceCents = lines.reduce((sum, l) => sum + l.amountCents, 0);
	const quantity = Math.max(1, Number(state.quantity) || 1);
	const extendedPriceCents = unitPriceCents * quantity;

	return {
		valid: true,
		error: null,
		tier: "adult",
		basePriceCents: finish.priceCents,
		lines,
		unitPriceCents,
		quantity,
		bulkDiscountPercent: 0,
		bulkDiscountCents: 0,
		extendedPriceCents,
	};
}
