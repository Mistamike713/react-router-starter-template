// Client-side helper: validates then uploads artwork to the real backend
// (/api/artwork-upload, backed by the same Cloudflare KV namespace the
// existing tumbler order-image upload uses) and returns an ArtworkRef.
// Raster pixel dimensions are read from the original File in the browser
// (no round trip needed) for the DPI/low-resolution check.

import { classifyArtworkKind, readRasterDimensions } from "./imageAnalysis";
import type { ArtworkRef } from "./types";

type UploadKind = "production" | "inspiration";
type UploadSide = "front" | "back";

export async function uploadArtwork(file: File, kind: UploadKind, side?: UploadSide): Promise<ArtworkRef> {
	const formData = new FormData();
	formData.set("file", file);
	formData.set("kind", kind);
	if (side) formData.set("side", side);

	const response = await fetch("/api/artwork-upload", { method: "POST", body: formData });
	if (!response.ok) {
		const body = (await response.json().catch(() => null)) as { error?: string } | null;
		throw new Error(body?.error || "Upload failed. Please try again.");
	}
	const result = (await response.json()) as { url: string; key: string; contentType: string; fileName: string };

	const artworkKind = classifyArtworkKind(file);
	let pixelWidth: number | undefined;
	let pixelHeight: number | undefined;
	if (artworkKind === "raster") {
		try {
			const dims = await readRasterDimensions(file);
			pixelWidth = dims.pixelWidth;
			pixelHeight = dims.pixelHeight;
		} catch {
			// Dimension read failed — production review will catch quality issues.
		}
	}

	return {
		key: result.key,
		url: result.url,
		fileName: result.fileName,
		mimeType: result.contentType,
		artworkKind,
		pixelWidth,
		pixelHeight,
		lowResolution: false,
		exceedsPrintArea: false,
	};
}
