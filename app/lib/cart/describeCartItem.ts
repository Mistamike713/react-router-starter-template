// Human-readable summaries of a cart item's configuration, used by the cart
// drawer and the mailto order-request body. Kept separate from CartContext
// so it can be unit tested without React.

import {
	DESIGN_SERVICE_CONFIG,
	DESIGN_SOURCE,
	PRODUCTION_METHOD_CONFIG,
	SPECIALTY_MATERIALS,
	getColor,
	getGarment,
	getSize,
	type ProductionMethod,
} from "../apparel/config";
import type { ShirtConfiguratorState } from "../apparel/types";
import type { CartItem } from "./types";

export function describeCustomShirt(config: Record<string, unknown>): string {
	const state = config as Partial<ShirtConfiguratorState>;
	const garment = getGarment(state.garmentId ?? null);
	const size = getSize(state.sizeId ?? null);
	const color = getColor(state.colorId ?? null);
	const method = state.method ? PRODUCTION_METHOD_CONFIG[state.method as ProductionMethod] : null;
	const parts: string[] = [];
	if (size) parts.push(size.label);
	if (garment) parts.push(garment.label);
	if (color) parts.push(color.label);
	// method is set only on orders configured before the production-method
	// step was removed from the customer flow; shown here for continuity.
	if (method) parts.push(method.shortLabel);
	return parts.join(" — ");
}

export function customShirtDetailLines(config: Record<string, unknown>): string[] {
	const state = config as Partial<ShirtConfiguratorState>;
	const lines: string[] = [];
	if (state.backDesign) lines.push("Back design added");
	if (state.specialtyHTV && state.specialtyMaterialId) {
		const mat = SPECIALTY_MATERIALS.find((m) => m.id === state.specialtyMaterialId);
		lines.push(`Specialty HTV: ${mat ? mat.label : state.specialtyMaterialId}`);
	}
	if (state.name && state.nameValue) lines.push(`Name: "${state.nameValue}"`);
	if (state.number && state.numberValue) lines.push(`Number: "${state.numberValue}"`);
	if (state.designSource) {
		if (state.designSource === DESIGN_SOURCE.UPLOAD_OWN) {
			const fileName = state.frontArtwork?.fileName;
			lines.push(`Design: uploaded artwork${fileName ? ` (${fileName})` : ""}`);
		} else if (state.designServiceLevel) {
			const svc = DESIGN_SERVICE_CONFIG[state.designServiceLevel];
			lines.push(`Design service: ${svc ? svc.label : state.designServiceLevel}`);
		}
	}
	if (state.proofRequested) lines.push("Proof requested before production");
	return lines;
}

export function describeCartItem(item: CartItem): string {
	if (item.kind === "custom_shirt") return describeCustomShirt(item.config);
	return typeof item.config.description === "string" ? item.config.description : "";
}
