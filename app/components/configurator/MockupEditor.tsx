// ============================================================================
// React wrapper around MockupEditorEngine (the imperative canvas class).
// Canvas drag/resize doesn't map cleanly to declarative JSX, so the engine
// stays a plain class instantiated here via useRef/useEffect — this
// component's only job is keeping engine state in sync with React props and
// exposing center/reset actions to the parent step component.
// ============================================================================

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { MockupEditorEngine, type MockupSide, type PlacementState } from "~/lib/apparel/mockupEditorEngine";

export type MockupEditorHandle = {
	centerHorizontal: () => void;
	centerVertical: () => void;
	reset: () => void;
};

type MockupEditorProps = {
	side: MockupSide;
	maxWidthIn: number;
	maxHeightIn: number;
	garmentColorHex: string;
	artworkUrl: string | null;
	nameText: string;
	numberText: string;
	aspectLocked: boolean;
	initialPlacement: PlacementState | null;
	onPlacementChange: (placement: PlacementState | null) => void;
};

export const MockupEditor = forwardRef<MockupEditorHandle, MockupEditorProps>(function MockupEditor(
	{ side, maxWidthIn, maxHeightIn, garmentColorHex, artworkUrl, nameText, numberText, aspectLocked, initialPlacement, onPlacementChange },
	ref,
) {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const engineRef = useRef<MockupEditorEngine | null>(null);
	const onPlacementChangeRef = useRef(onPlacementChange);
	onPlacementChangeRef.current = onPlacementChange;
	const appliedInitialPlacementRef = useRef(false);

	// Mount the engine once per canvas element.
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const engine = new MockupEditorEngine(canvas, { maxWidthIn, maxHeightIn, garmentColorHex, side });
		engine.setAspectLocked(aspectLocked);
		engine.onChange((state) => onPlacementChangeRef.current(state));
		engineRef.current = engine;
		return () => {
			engine.destroy();
			engineRef.current = null;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [side]);

	useEffect(() => {
		engineRef.current?.setMaxDimensionsIn(maxWidthIn, maxHeightIn);
	}, [maxWidthIn, maxHeightIn]);

	useEffect(() => {
		engineRef.current?.setGarmentColor(garmentColorHex);
	}, [garmentColorHex]);

	useEffect(() => {
		engineRef.current?.setNameNumberText(nameText, numberText);
	}, [nameText, numberText]);

	useEffect(() => {
		engineRef.current?.setAspectLocked(aspectLocked);
	}, [aspectLocked]);

	useEffect(() => {
		const engine = engineRef.current;
		if (!engine) return;
		if (!artworkUrl) {
			engine.clearArtwork();
			return;
		}
		const image = new Image();
		image.onload = () => {
			engine.setArtworkImage(image);
			if (!appliedInitialPlacementRef.current && initialPlacement) {
				engine.setPlacementState(initialPlacement);
				appliedInitialPlacementRef.current = true;
			}
		};
		image.src = artworkUrl;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [artworkUrl]);

	useImperativeHandle(ref, () => ({
		centerHorizontal: () => engineRef.current?.centerHorizontal(),
		centerVertical: () => engineRef.current?.centerVertical(),
		reset: () => engineRef.current?.reset(),
	}));

	return <canvas ref={canvasRef} className="block h-[340px] w-full touch-none rounded-[14px] bg-[#F4E9D8]" />;
});
