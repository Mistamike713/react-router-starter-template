// ============================================================================
// Compatibility rules: which colors/methods/dimensions are valid together.
// Pure functions only — no DOM/React, so these are unit-testable and
// reusable by both the configurator UI and (eventually) a server-side
// validator.
// ============================================================================

import {
	ARTWORK_UPLOAD_CONFIG,
	COLORS,
	DESIGN_SERVICE_LEVEL,
	DESIGN_SOURCE,
	FABRIC_CAPABILITIES,
	PRODUCTION_METHOD,
	REVIEW_REASON,
	getColor,
	getGarment,
	getMaxDesignDimensionsIn,
	getSize,
	type ColorOption,
	type Fabric,
	type MaxDesignDimensions,
	type ProductionMethod,
	type ReviewReason,
} from "./config";
import type { ShirtConfiguratorState } from "./types";

/**
 * Returns true if `color` may be used with `fabric` under `method`.
 * HTV: any color the fabric is stocked in.
 * Sublimation: fabric must support sublimation AND color must be light.
 */
export function isColorEligible(color: ColorOption, fabric: Fabric, method: ProductionMethod | null | undefined): boolean {
	if (!color.fabrics.includes(fabric)) return false;
	if (method === PRODUCTION_METHOD.SUBLIMATION) {
		const caps = FABRIC_CAPABILITIES[fabric];
		return Boolean(caps && caps.supportsSublimation && color.lightColor);
	}
	return true;
}

/** Colors available for the given garment + production method. */
export function getEligibleColors(garmentId: string | null | undefined, method: ProductionMethod | null | undefined): ColorOption[] {
	const garment = getGarment(garmentId);
	if (!garment) return [];
	return COLORS.filter((c) => isColorEligible(c, garment.fabric, method));
}

/** Whether a garment supports a production method at all (any eligible color exists). */
export function garmentSupportsMethod(garmentId: string | null | undefined, method: ProductionMethod): boolean {
	const garment = getGarment(garmentId);
	if (!garment) return false;
	const caps = FABRIC_CAPABILITIES[garment.fabric];
	if (method === PRODUCTION_METHOD.HTV) return Boolean(caps && caps.supportsHTV);
	if (method === PRODUCTION_METHOD.SUBLIMATION) return Boolean(caps && caps.supportsSublimation);
	return false;
}

/** Effective max design dimensions (min of equipment vs. garment printable area). */
export function getMaxDesignDimensions(
	sizeId: string | null | undefined,
	method: ProductionMethod | null | undefined,
): MaxDesignDimensions | null {
	return getMaxDesignDimensionsIn(sizeId, method);
}

/**
 * Given a full configurator state, returns the set of review-required
 * reason codes that apply. Multiple reasons may be present simultaneously.
 * This does not block Add to Cart by itself — the UI/validation layer
 * decides which reasons are hard-blocking vs. soft "subject to review".
 */
export function getReviewReasons(state: ShirtConfiguratorState): ReviewReason[] {
	const reasons = new Set<ReviewReason>();

	const garment = getGarment(state.garmentId);
	const color = getColor(state.colorId);

	if (state.method === PRODUCTION_METHOD.SUBLIMATION) {
		reasons.add(REVIEW_REASON.SUBLIMATION_REVIEW);
		if (garment && color && !isColorEligible(color, garment.fabric, state.method)) {
			// Should normally be prevented by the color picker, but flag defensively.
			reasons.add(REVIEW_REASON.PRINT_AREA_REVIEW);
		}
	}

	if (state.specialtyHTV && state.specialtyMaterialId) {
		reasons.add(REVIEW_REASON.SPECIALTY_MATERIAL_REVIEW);
	}

	if (state.designSource === DESIGN_SOURCE.CREATE_FOR_ME && state.designServiceLevel === DESIGN_SERVICE_LEVEL.COMPLEX_CUSTOM) {
		reasons.add(REVIEW_REASON.COMPLEX_DESIGN);
	}

	if (state.proofRequested) {
		reasons.add(REVIEW_REASON.CUSTOMER_REQUESTED_PROOF);
	}

	const artworks = [state.frontArtwork, state.backArtwork].filter((a): a is NonNullable<typeof a> => Boolean(a));
	for (const art of artworks) {
		if (art.lowResolution) reasons.add(REVIEW_REASON.LOW_RESOLUTION_ARTWORK);
		if (art.exceedsPrintArea) reasons.add(REVIEW_REASON.PRINT_AREA_REVIEW);
	}

	const size = getSize(state.sizeId);
	if (size && state.method) {
		const max = getMaxDesignDimensions(state.sizeId, state.method);
		if (max && !max.limitedByEquipment) {
			// Garment-specific limit is tighter than equipment max — always worth
			// a human glance since it means we clamped below the "advertised" max.
			reasons.add(REVIEW_REASON.PRINT_AREA_REVIEW);
		}
	}

	return Array.from(reasons);
}

export type FileValidationResult = { valid: boolean; error: string | null };

/** File-type/size validation for artwork uploads. */
export function validateArtworkFile(file: File | null | undefined): FileValidationResult {
	if (!file) return { valid: false, error: "No file selected." };
	const cfg = ARTWORK_UPLOAD_CONFIG;
	const typeOk =
		(cfg.acceptedMimeTypes as readonly string[]).includes(file.type) ||
		cfg.acceptedExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));
	if (!typeOk) {
		return { valid: false, error: "Unsupported file type. Please upload a PNG, JPG, SVG, or PDF file." };
	}
	if (file.size > cfg.maxFileSizeBytes) {
		const maxMb = Math.round(cfg.maxFileSizeBytes / (1024 * 1024));
		return { valid: false, error: `File is too large. Maximum size is ${maxMb}MB.` };
	}
	if (file.size === 0) {
		return { valid: false, error: "That file appears to be empty." };
	}
	return { valid: true, error: null };
}
