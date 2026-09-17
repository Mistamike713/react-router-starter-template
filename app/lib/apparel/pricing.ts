// ============================================================================
// Pricing engine: the ONE place that turns a configurator state into a
// dollar amount. Pure functions, no DOM/React — reusable client-side and
// (if MNH ever adds order-time server validation) server-side too, so the
// same math can independently re-verify a submitted order instead of
// trusting a browser-computed total.
// ============================================================================

import {
	ADDON_PRICING_CENTS,
	DESIGN_SERVICE_CONFIG,
	DESIGN_SOURCE,
	BULK_PRICING_RULES,
	RUSH_ORDER_CONFIG,
	getBasePriceCents,
	getGarment,
	getSize,
	getSpecialtyHTVPriceCents,
	pricingTierForCategory,
	type PricingTier,
} from "./config";
import type { ShirtConfiguratorState } from "./types";

export type PriceLine = { key: string; label: string; amountCents: number };

export type PriceResult =
	| {
			valid: false;
			error: string;
			lines: PriceLine[];
			unitPriceCents: number;
			extendedPriceCents: number;
	  }
	| {
			valid: true;
			error: null;
			tier: PricingTier;
			basePriceCents: number;
			lines: PriceLine[];
			unitPriceCents: number;
			quantity: number;
			bulkDiscountPercent: number;
			bulkDiscountCents: number;
			extendedPriceCents: number;
	  };

/**
 * Applies future quantity-discount rules (currently empty/disabled). Kept
 * as an explicit hook so enabling bulk pricing later doesn't require
 * restructuring callers — just populate BULK_PRICING_RULES.
 */
function getBulkDiscountPercent(quantity: number): number {
	let best = 0;
	for (const rule of BULK_PRICING_RULES) {
		if (quantity >= rule.minQty && rule.discountPercent > best) {
			best = rule.discountPercent;
		}
	}
	return best;
}

/** Computes the full price breakdown for one configured custom-shirt line item. */
export function computeCustomShirtPrice(state: ShirtConfiguratorState & { rushOrder?: boolean }): PriceResult {
	const garment = getGarment(state.garmentId);
	const size = getSize(state.sizeId);
	if (!garment || !size) {
		return { valid: false, error: "Incomplete garment/size selection.", lines: [], unitPriceCents: 0, extendedPriceCents: 0 };
	}

	const basePriceCents = getBasePriceCents(state.sizeId, garment.fabric);
	if (basePriceCents == null) {
		return { valid: false, error: "No price configured for this size/fabric.", lines: [], unitPriceCents: 0, extendedPriceCents: 0 };
	}

	const tier = pricingTierForCategory(size.category);
	const addonPrices = ADDON_PRICING_CENTS[tier];

	const lines: PriceLine[] = [];
	lines.push({ key: "base", label: "Base Shirt", amountCents: basePriceCents });

	if (state.backDesign) {
		lines.push({ key: "backDesign", label: "Add Design to Back", amountCents: addonPrices.backDesign });
	}

	if (state.specialtyHTV && state.specialtyMaterialId) {
		lines.push({
			key: "specialtyHTV",
			label: "Specialty HTV",
			amountCents: getSpecialtyHTVPriceCents(state.specialtyMaterialId, tier),
		});
	}

	const wantsName = Boolean(state.name);
	const wantsNumber = Boolean(state.number);
	if (wantsName && wantsNumber) {
		lines.push({ key: "nameAndNumber", label: "Name + Number", amountCents: addonPrices.nameAndNumber });
	} else if (wantsName) {
		lines.push({ key: "name", label: "Name", amountCents: addonPrices.name });
	} else if (wantsNumber) {
		lines.push({ key: "number", label: "Number", amountCents: addonPrices.number });
	}

	// Design service fee / deposit. "Upload My Design" is always $0 (customer
	// supplies production-ready art); the other two sources carry whatever
	// service level the customer selected.
	if (state.designSource && state.designSource !== DESIGN_SOURCE.UPLOAD_OWN && state.designServiceLevel) {
		const serviceConfig = DESIGN_SERVICE_CONFIG[state.designServiceLevel];
		if (serviceConfig && serviceConfig.feeCents > 0) {
			lines.push({
				key: "designService",
				label: serviceConfig.isDeposit ? `${serviceConfig.label} — Nonrefundable Deposit` : serviceConfig.label,
				amountCents: serviceConfig.feeCents,
			});
		}
	}

	if (RUSH_ORDER_CONFIG.enabled && state.rushOrder) {
		const rushCents =
			RUSH_ORDER_CONFIG.feeType === "percent"
				? Math.round(basePriceCents * (RUSH_ORDER_CONFIG.feePercent / 100))
				: RUSH_ORDER_CONFIG.feeCents;
		if (rushCents > 0) {
			lines.push({ key: "rushOrder", label: RUSH_ORDER_CONFIG.label, amountCents: rushCents });
		}
	}

	const unitPriceCents = lines.reduce((sum, l) => sum + l.amountCents, 0);
	const quantity = Math.max(1, Number(state.quantity) || 1);

	const bulkDiscountPercent = getBulkDiscountPercent(quantity);
	const preDiscountExtendedCents = unitPriceCents * quantity;
	const bulkDiscountCents = Math.round(preDiscountExtendedCents * (bulkDiscountPercent / 100));
	const extendedPriceCents = preDiscountExtendedCents - bulkDiscountCents;

	return {
		valid: true,
		error: null,
		tier,
		basePriceCents,
		lines,
		unitPriceCents,
		quantity,
		bulkDiscountPercent,
		bulkDiscountCents,
		extendedPriceCents,
	};
}

export function formatCents(cents: number): string {
	return `$${(cents / 100).toFixed(2)}`;
}
