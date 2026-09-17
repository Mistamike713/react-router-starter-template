import type { DesignServiceLevel, DesignSource, ProductionMethod, SizeCategory } from "./config";

/** A production/inspiration artwork file, now persisted server-side via /api/artwork-upload. */
export type ArtworkRef = {
	key: string;
	url: string;
	fileName: string;
	mimeType: string;
	artworkKind: "raster" | "vector" | "document";
	pixelWidth?: number;
	pixelHeight?: number;
	lowResolution?: boolean;
	exceedsPrintArea?: boolean;
};

/** Front/back artwork placement, in inches, relative to the printable area's own coordinate system. */
export type PlacementState = {
	widthIn: number;
	heightIn: number;
	centerXIn: number;
	centerYIn: number;
	aspectLocked: boolean;
	maxWidthIn: number;
	maxHeightIn: number;
};

export type ShirtConfiguratorState = {
	garmentId: string | null;
	sizeId: string | null;
	sizeCategoryFilter: SizeCategory | null;
	method: ProductionMethod | null;
	colorId: string | null;
	backDesign: boolean;
	designSource: DesignSource | null;
	existingDesignRef: string | null;
	designServiceLevel: DesignServiceLevel | null;
	instructions: string;
	frontArtwork: ArtworkRef | null;
	backArtwork: ArtworkRef | null;
	inspirationArtwork: ArtworkRef | null;
	specialtyHTV: boolean;
	specialtyMaterialId: string | null;
	name: boolean;
	nameValue: string;
	number: boolean;
	numberValue: string;
	frontPlacement: PlacementState | null;
	backPlacement: PlacementState | null;
	mockupAcknowledged: boolean;
	proofRequested: boolean;
	quantity: number;
};

export function createDefaultShirtConfiguratorState(): ShirtConfiguratorState {
	return {
		garmentId: null,
		sizeId: null,
		sizeCategoryFilter: null,
		method: null,
		colorId: null,
		backDesign: false,
		designSource: null,
		existingDesignRef: null,
		designServiceLevel: null,
		instructions: "",
		frontArtwork: null,
		backArtwork: null,
		inspirationArtwork: null,
		specialtyHTV: false,
		specialtyMaterialId: null,
		name: false,
		nameValue: "",
		number: false,
		numberValue: "",
		frontPlacement: null,
		backPlacement: null,
		mockupAcknowledged: false,
		proofRequested: false,
		quantity: 1,
	};
}
