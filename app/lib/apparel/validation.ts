// ============================================================================
// Configurator validation: inline, field-level errors (never a generic
// "something went wrong"). Shared by the step UI (to gate "Next") and the
// final Add to Cart action (to gate submission).
// ============================================================================

import { DESIGN_SERVICE_LEVEL, DESIGN_SOURCE } from "./config";
import { getEligibleColors } from "./compatibility";
import type { ShirtConfiguratorState } from "./types";

export type ValidationResult = { valid: boolean; errors: Record<string, string> };

export function validateGarmentStep(state: ShirtConfiguratorState): ValidationResult {
	const errors: Record<string, string> = {};
	if (!state.garmentId) errors.garmentId = "Please choose a garment.";
	return { valid: Object.keys(errors).length === 0, errors };
}

export function validateSizeStep(state: ShirtConfiguratorState): ValidationResult {
	const errors: Record<string, string> = {};
	if (!state.sizeId) errors.sizeId = "Please choose a size.";
	return { valid: Object.keys(errors).length === 0, errors };
}

export function validateColorStep(state: ShirtConfiguratorState): ValidationResult {
	const errors: Record<string, string> = {};
	if (!state.colorId) {
		errors.colorId = "Please choose a shirt color.";
	} else if (state.garmentId) {
		const eligible = getEligibleColors(state.garmentId);
		if (!eligible.some((c) => c.id === state.colorId)) {
			errors.colorId = "That color is not available for the selected garment. Please choose another.";
		}
	}
	return { valid: Object.keys(errors).length === 0, errors };
}

export function validateDesignSourceStep(state: ShirtConfiguratorState): ValidationResult {
	const errors: Record<string, string> = {};
	if (!state.designSource) {
		errors.designSource = "Please tell us how you’ll provide your design.";
		return { valid: false, errors };
	}

	if (state.designSource === DESIGN_SOURCE.UPLOAD_OWN) {
		if (!state.frontArtwork || !state.frontArtwork.key) {
			errors.frontArtwork = "Please upload your front design artwork.";
		}
		if (state.backDesign && (!state.backArtwork || !state.backArtwork.key)) {
			errors.backArtwork = 'Please upload your back design artwork, or turn off "Add Design to Back".';
		}
	}

	if (state.designSource === DESIGN_SOURCE.CUSTOMIZE_EXISTING) {
		if (!state.existingDesignRef) {
			errors.existingDesignRef = "Please select an MNH design to customize.";
		}
		if (!state.instructions || !state.instructions.trim()) {
			errors.instructions = "Please tell us what to customize (text, colors, names, etc.).";
		}
	}

	if (state.designSource === DESIGN_SOURCE.CREATE_FOR_ME) {
		if (!state.designServiceLevel) {
			errors.designServiceLevel = "Please choose a design service level.";
		}
		if (!state.instructions || !state.instructions.trim()) {
			errors.instructions = "Please describe the design you’d like created.";
		}
	}

	return { valid: Object.keys(errors).length === 0, errors };
}

export function validateCustomizationStep(state: ShirtConfiguratorState): ValidationResult {
	const errors: Record<string, string> = {};
	if (state.specialtyHTV && !state.specialtyMaterialId) {
		errors.specialtyMaterialId = "Please choose a specialty material.";
	}
	if (state.name && !(state.nameValue && state.nameValue.trim())) {
		errors.nameValue = "Please enter the name to print.";
	}
	if (state.number && !(state.numberValue && state.numberValue.trim())) {
		errors.numberValue = "Please enter the number to print.";
	}
	return { valid: Object.keys(errors).length === 0, errors };
}

export function validateMockupStep(state: ShirtConfiguratorState): ValidationResult {
	const errors: Record<string, string> = {};
	if (!state.mockupAcknowledged) {
		errors.mockupAcknowledged = "Please confirm you understand the mockup is a placement preview.";
	}
	return { valid: Object.keys(errors).length === 0, errors };
}

const STEP_VALIDATORS: Array<(state: ShirtConfiguratorState) => ValidationResult> = [
	validateGarmentStep,
	validateSizeStep,
	validateColorStep,
	validateDesignSourceStep,
	validateCustomizationStep,
	validateMockupStep,
];

/** Runs every step validator and merges results — used to gate Add to Cart. */
export function validateFullConfiguration(state: ShirtConfiguratorState): ValidationResult {
	let errors: Record<string, string> = {};
	for (const validator of STEP_VALIDATORS) {
		const result = validator(state);
		errors = { ...errors, ...result.errors };
	}
	return { valid: Object.keys(errors).length === 0, errors };
}
