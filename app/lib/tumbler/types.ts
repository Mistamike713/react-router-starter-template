import type { ArtworkRef, PlacementState } from "../apparel/types";
import type { TumblerDesignSource } from "./config";

export type TumblerConfiguratorState = {
	productId: string | null;
	finishOptionId: string | null;
	designSource: TumblerDesignSource | null;
	/** Customer's own production-ready wrap artwork (designSource === upload_own). */
	artwork: ArtworkRef | null;
	/** Optional reference image, independent of designSource — usable alongside either path. */
	inspirationArtwork: ArtworkRef | null;
	personalizationText: string;
	instructions: string;
	placement: PlacementState | null;
	mockupAcknowledged: boolean;
	quantity: number;
};

export function createDefaultTumblerConfiguratorState(): TumblerConfiguratorState {
	return {
		productId: null,
		finishOptionId: null,
		designSource: null,
		artwork: null,
		inspirationArtwork: null,
		personalizationText: "",
		instructions: "",
		placement: null,
		mockupAcknowledged: false,
		quantity: 1,
	};
}
