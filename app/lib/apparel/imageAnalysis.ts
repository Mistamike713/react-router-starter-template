// ============================================================================
// Artwork quality analysis: reads raster pixel dimensions and estimates
// whether the artwork will look good at the customer's requested physical
// print size. This flags for review — it never auto-rejects an image.
//
// Browser-only (uses Image/URL.createObjectURL) — only ever called from
// client components, never during SSR.
// ============================================================================

import { ARTWORK_UPLOAD_CONFIG } from "./config";

export type ArtworkKind = "raster" | "vector" | "document";

export function classifyArtworkKind(file: File | null | undefined): ArtworkKind {
	if (!file) return "document";
	const type = (file.type || "").toLowerCase();
	const name = (file.name || "").toLowerCase();
	if (type === "image/svg+xml" || name.endsWith(".svg")) return "vector";
	if (type === "application/pdf" || name.endsWith(".pdf")) return "document";
	if (type.startsWith("image/")) return "raster";
	return "document";
}

/** Reads pixel dimensions of a raster image file in the browser. */
export function readRasterDimensions(file: File): Promise<{ pixelWidth: number; pixelHeight: number }> {
	return new Promise((resolve, reject) => {
		const url = URL.createObjectURL(file);
		const img = new Image();
		img.onload = () => {
			const dims = { pixelWidth: img.naturalWidth, pixelHeight: img.naturalHeight };
			URL.revokeObjectURL(url);
			resolve(dims);
		};
		img.onerror = () => {
			URL.revokeObjectURL(url);
			reject(new Error("Could not read image dimensions."));
		};
		img.src = url;
	});
}

/**
 * Effective DPI for a raster image at a given physical print size, using
 * the tighter (more conservative) of the width/height ratios.
 */
export function computeEffectiveDpi(
	pixelWidth: number | null | undefined,
	pixelHeight: number | null | undefined,
	physicalWidthIn: number | null | undefined,
	physicalHeightIn: number | null | undefined,
): number | null {
	if (!pixelWidth || !pixelHeight || !physicalWidthIn || !physicalHeightIn) return null;
	const widthDpi = pixelWidth / physicalWidthIn;
	const heightDpi = pixelHeight / physicalHeightIn;
	return Math.min(widthDpi, heightDpi);
}

export function isLowResolution(dpi: number | null): boolean {
	if (dpi == null) return false;
	return dpi < ARTWORK_UPLOAD_CONFIG.lowResolutionDpiThreshold;
}

export type ArtworkAnalysis = {
	kind: ArtworkKind;
	pixelWidth?: number;
	pixelHeight?: number;
	effectiveDpi?: number | null;
	lowResolution: boolean;
	skippedReason?: string;
	error?: string;
};

/**
 * Full analysis pipeline for an uploaded artwork file at a requested print
 * size. Vector (SVG) artwork never gets a resolution warning since it
 * scales losslessly; documents (PDF) are skipped since we can't reliably
 * read embedded raster resolution without a PDF-rendering library.
 */
export async function analyzeArtwork(file: File, physicalWidthIn: number, physicalHeightIn: number): Promise<ArtworkAnalysis> {
	const kind = classifyArtworkKind(file);

	if (kind === "vector") {
		return { kind, lowResolution: false };
	}
	if (kind === "document") {
		return { kind, lowResolution: false, skippedReason: "PDF resolution is verified during production review." };
	}

	try {
		const { pixelWidth, pixelHeight } = await readRasterDimensions(file);
		const effectiveDpi = computeEffectiveDpi(pixelWidth, pixelHeight, physicalWidthIn, physicalHeightIn);
		return {
			kind,
			pixelWidth,
			pixelHeight,
			effectiveDpi,
			lowResolution: isLowResolution(effectiveDpi),
		};
	} catch (err) {
		return { kind, lowResolution: false, error: err instanceof Error ? err.message : String(err) };
	}
}
