// ============================================================================
// Tumbler configurator validation — mirrors apparel/validation.ts.
// ============================================================================

import { TUMBLER_DESIGN_SOURCE } from "./config";
import type { TumblerConfiguratorState } from "./types";

export type ValidationResult = { valid: boolean; errors: Record<string, string> };

export function validateProductStep(state: TumblerConfiguratorState): ValidationResult {
	const errors: Record<string, string> = {};
	if (!state.productId) errors.productId = "Please choose a tumbler.";
	else if (!state.finishOptionId) errors.finishOptionId = "Please choose a finish.";
	return { valid: Object.keys(errors).length === 0, errors };
}

export function validateDesignStep(state: TumblerConfiguratorState): ValidationResult {
	const errors: Record<string, string> = {};
	if (!state.designSource) {
		errors.designSource = "Please tell us how you’ll provide your design.";
		return { valid: false, errors };
	}
	if (state.designSource === TUMBLER_DESIGN_SOURCE.UPLOAD_OWN && (!state.artwork || !state.artwork.key)) {
		errors.artwork = "Please upload your wrap design artwork.";
	}
	if (state.designSource === TUMBLER_DESIGN_SOURCE.CREATE_FOR_ME && (!state.instructions || !state.instructions.trim())) {
		errors.instructions = "Please describe the design you’d like created.";
	}
	return { valid: Object.keys(errors).length === 0, errors };
}

export function validateMockupStep(state: TumblerConfiguratorState): ValidationResult {
	const errors: Record<string, string> = {};
	if (!state.mockupAcknowledged) {
		errors.mockupAcknowledged = "Please confirm you understand the mockup is a placement preview.";
	}
	return { valid: Object.keys(errors).length === 0, errors };
}

const STEP_VALIDATORS: Array<(state: TumblerConfiguratorState) => ValidationResult> = [
	validateProductStep,
	validateDesignStep,
	validateMockupStep,
];

export function validateFullConfiguration(state: TumblerConfiguratorState): ValidationResult {
	let errors: Record<string, string> = {};
	for (const validator of STEP_VALIDATORS) {
		const result = validator(state);
		errors = { ...errors, ...result.errors };
	}
	return { valid: Object.keys(errors).length === 0, errors };
}
