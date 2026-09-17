// ============================================================================
// Non-interactive "on the tumbler" preview, rendered from the same
// placement state as TumblerWrapEditor's flat wrap. An approximate
// cylindrical representation — the wrap's seam/back portion is hidden by
// the cylinder, same as a real tumbler — kept in sync purely by re-drawing
// on every prop change (no engine/state of its own).
// ============================================================================

import { useEffect, useRef } from "react";
import { renderCylinderPreview, type PlacementState } from "~/lib/tumbler/tumblerMockupEngine";

type TumblerMockupPreviewProps = {
	artworkUrl: string | null;
	placement: PlacementState | null;
	wrapWidthIn: number;
	wrapHeightIn: number;
	bodyColorHex: string;
};

export function TumblerMockupPreview({ artworkUrl, placement, wrapWidthIn, wrapHeightIn, bodyColorHex }: TumblerMockupPreviewProps) {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const imageRef = useRef<HTMLImageElement | null>(null);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const draw = () => renderCylinderPreview(canvas, { artworkImage: imageRef.current, placement, wrapWidthIn, wrapHeightIn, bodyColorHex });

		if (!artworkUrl) {
			imageRef.current = null;
			draw();
			return;
		}
		if (imageRef.current?.src !== artworkUrl) {
			const image = new Image();
			image.onload = () => {
				imageRef.current = image;
				draw();
			};
			image.src = artworkUrl;
		} else {
			draw();
		}
	}, [artworkUrl, placement, wrapWidthIn, wrapHeightIn, bodyColorHex]);

	return (
		<div>
			<canvas ref={canvasRef} className="block h-[220px] w-full rounded-[14px] bg-[#F4E9D8]" />
			<p className="mt-1.5 text-[0.78rem] text-[#7A5C46] italic">
				Approximate preview only — the seam/back of the wrap isn&apos;t shown, and MNH Creations may adjust final placement.
			</p>
		</div>
	);
}
