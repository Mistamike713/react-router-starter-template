// ============================================================================
// React wrapper around TumblerWrapEditorEngine, mirroring configurator/
// MockupEditor.tsx's pattern for the shirt engine: the engine stays a plain
// class instantiated via useRef/useEffect, this component keeps it in sync
// with React props and exposes center/reset actions to the parent.
// ============================================================================

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { TumblerWrapEditorEngine, type PlacementState } from "~/lib/tumbler/tumblerMockupEngine";

export type TumblerWrapEditorHandle = {
	centerHorizontal: () => void;
	centerVertical: () => void;
	reset: () => void;
};

type TumblerWrapEditorProps = {
	wrapWidthIn: number;
	wrapHeightIn: number;
	bodyColorHex: string;
	artworkUrl: string | null;
	aspectLocked: boolean;
	initialPlacement: PlacementState | null;
	onPlacementChange: (placement: PlacementState | null) => void;
};

export const TumblerWrapEditor = forwardRef<TumblerWrapEditorHandle, TumblerWrapEditorProps>(function TumblerWrapEditor(
	{ wrapWidthIn, wrapHeightIn, bodyColorHex, artworkUrl, aspectLocked, initialPlacement, onPlacementChange },
	ref,
) {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const engineRef = useRef<TumblerWrapEditorEngine | null>(null);
	const onPlacementChangeRef = useRef(onPlacementChange);
	onPlacementChangeRef.current = onPlacementChange;
	const appliedInitialPlacementRef = useRef(false);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const engine = new TumblerWrapEditorEngine(canvas, { wrapWidthIn, wrapHeightIn, bodyColorHex });
		engine.setAspectLocked(aspectLocked);
		engine.onChange((state) => onPlacementChangeRef.current(state));
		engineRef.current = engine;
		return () => {
			engine.destroy();
			engineRef.current = null;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		engineRef.current?.setWrapDimensionsIn(wrapWidthIn, wrapHeightIn);
	}, [wrapWidthIn, wrapHeightIn]);

	useEffect(() => {
		engineRef.current?.setBodyColor(bodyColorHex);
	}, [bodyColorHex]);

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

	return <canvas ref={canvasRef} className="block h-[220px] w-full touch-none rounded-[14px] bg-[#F4E9D8]" />;
});
