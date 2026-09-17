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
import { getTumblerFinishOption, getTumblerProduct } from "../tumbler/config";
import type { TumblerConfiguratorState } from "../tumbler/types";
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
			lines.push("Design source: customer-uploaded artwork");
		} else if (state.designSource === DESIGN_SOURCE.CUSTOMIZE_EXISTING) {
			lines.push(`Design source: customize MNH design${state.existingDesignRef ? ` (${state.existingDesignRef})` : ""}`);
		} else if (state.designServiceLevel) {
			const svc = DESIGN_SERVICE_CONFIG[state.designServiceLevel];
			lines.push(`Design service: ${svc ? svc.label : state.designServiceLevel}`);
		}
	}
	if (state.frontPlacement) {
		lines.push(`Front design size: ${state.frontPlacement.widthIn.toFixed(1)}in x ${state.frontPlacement.heightIn.toFixed(1)}in`);
	}
	if (state.backDesign && state.backPlacement) {
		lines.push(`Back design size: ${state.backPlacement.widthIn.toFixed(1)}in x ${state.backPlacement.heightIn.toFixed(1)}in`);
	}
	if (state.frontArtwork) {
		lines.push(`View / Download Customer Artwork (Front) — ${state.frontArtwork.fileName}: ${state.frontArtwork.url}`);
	}
	if (state.backDesign && state.backArtwork) {
		lines.push(`View / Download Customer Artwork (Back) — ${state.backArtwork.fileName}: ${state.backArtwork.url}`);
	}
	if (state.inspirationArtwork) {
		lines.push(`View / Download Inspiration Reference — ${state.inspirationArtwork.fileName}: ${state.inspirationArtwork.url}`);
	}
	if (state.mockupAcknowledged) lines.push("Customer confirmed the on-screen placement mockup");
	if (state.proofRequested) lines.push("Proof requested before production");
	return lines;
}

export function describeCustomTumbler(config: Record<string, unknown>): string {
	const state = config as Partial<TumblerConfiguratorState>;
	const product = getTumblerProduct(state.productId ?? null);
	const finish = getTumblerFinishOption(product, state.finishOptionId ?? null);
	const parts: string[] = [];
	if (product) parts.push(product.label);
	if (finish) parts.push(finish.label);
	return parts.join(" — ");
}

export function customTumblerDetailLines(config: Record<string, unknown>): string[] {
	const state = config as Partial<TumblerConfiguratorState>;
	const lines: string[] = [];
	if (state.personalizationText) lines.push(`Personalization: "${state.personalizationText}"`);
	if (state.designSource === "upload_own") {
		lines.push("Design source: customer-uploaded wrap artwork");
	} else if (state.designSource === "create_for_me") {
		lines.push("Design source: MNH Creations designs it");
	}
	if (state.placement) {
		lines.push(`Wrap design size: ${state.placement.widthIn.toFixed(1)}in x ${state.placement.heightIn.toFixed(1)}in`);
	}
	if (state.artwork) {
		lines.push(`View / Download Customer Artwork — ${state.artwork.fileName}: ${state.artwork.url}`);
	}
	if (state.inspirationArtwork) {
		lines.push(`View / Download Inspiration Reference — ${state.inspirationArtwork.fileName}: ${state.inspirationArtwork.url}`);
	}
	if (state.mockupAcknowledged) lines.push("Customer confirmed the on-screen placement mockup");
	return lines;
}

export function describeCartItem(item: CartItem): string {
	if (item.kind === "custom_shirt") return describeCustomShirt(item.config);
	if (item.kind === "custom_tumbler") return describeCustomTumbler(item.config);
	return typeof item.config.description === "string" ? item.config.description : "";
}
