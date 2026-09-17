// ============================================================================
// Centralized tax calculation. Deliberately a single small module rather
// than scattered `* 1.07` literals in UI code, so a jurisdiction-aware tax
// service can be dropped in later behind the same `computeTax` signature.
// ============================================================================

import { TAX_CONFIG } from "../apparel/config";

export type TaxResult = {
	taxCents: number;
	ratePercent: number;
	authoritative: boolean;
	label: string;
	disclaimer: string;
};

export function computeTax(subtotalCents: number, overrides: { ratePercent?: number } = {}): TaxResult {
	if (!TAX_CONFIG.enabled) {
		return { taxCents: 0, ratePercent: 0, authoritative: false, label: TAX_CONFIG.label, disclaimer: TAX_CONFIG.disclaimer };
	}
	const ratePercent = typeof overrides.ratePercent === "number" ? overrides.ratePercent : TAX_CONFIG.defaultRatePercent;
	const taxCents = Math.round(subtotalCents * (ratePercent / 100));
	return {
		taxCents,
		ratePercent,
		authoritative: TAX_CONFIG.authoritative,
		label: TAX_CONFIG.label,
		disclaimer: TAX_CONFIG.disclaimer,
	};
}
