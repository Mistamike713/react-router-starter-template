export type FittedArtworkSize = { widthIn: number; heightIn: number };

/**
 * Fits artwork inside a centered fraction of a printable area without ever
 * changing its aspect ratio or allowing either axis to exceed that area.
 */
export function fitArtworkToArea(
	aspect: number,
	maxWidthIn: number,
	maxHeightIn: number,
	fillFraction: number,
): FittedArtworkSize {
	const safeAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : 1;
	const targetWidth = maxWidthIn * fillFraction;
	const targetHeight = maxHeightIn * fillFraction;
	const widthIn = Math.min(targetWidth, targetHeight * safeAspect);
	return { widthIn, heightIn: widthIn / safeAspect };
}
