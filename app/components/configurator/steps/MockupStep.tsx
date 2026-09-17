import { useEffect, useRef } from "react";
import { getColor, REVIEW_REASON, type ColorOption, type MaxDesignDimensions, type ReviewReason } from "~/lib/apparel/config";
import { getMaxDesignDimensionsForGarment, getReviewReasons } from "~/lib/apparel/compatibility";
import { computeEffectiveDpi, isLowResolution } from "~/lib/apparel/imageAnalysis";
import type { ArtworkRef, PlacementState, ShirtConfiguratorState } from "~/lib/apparel/types";
import { MockupEditor, type MockupEditorHandle } from "../MockupEditor";
import { CheckboxRow, ContinueButton, FieldError, Hint } from "../StepShell";
import type { StepProps } from "../stepTypes";

const REVIEW_REASON_LABELS: Record<ReviewReason, string> = {
	[REVIEW_REASON.SUBLIMATION_REVIEW]: "Sublimation orders are reviewed for compatibility",
	[REVIEW_REASON.LOW_RESOLUTION_ARTWORK]: "Artwork resolution will be reviewed",
	[REVIEW_REASON.COMPLEX_DESIGN]: "Complex custom design request",
	[REVIEW_REASON.PRINT_AREA_REVIEW]: "Design size/placement will be confirmed",
	[REVIEW_REASON.CUSTOMER_REQUESTED_PROOF]: "Proof requested before production",
	[REVIEW_REASON.SPECIALTY_MATERIAL_REVIEW]: "Specialty material availability will be confirmed",
};

export function MockupStep({ state, patch, errors, onContinue }: StepProps) {
	if (!state.sizeId || !state.garmentId || !state.colorId) {
		return (
			<>
				<Hint>Complete garment, size, and color first.</Hint>
				<ContinueButton onClick={onContinue} />
			</>
		);
	}

	const color = getColor(state.colorId);
	const maxDims = getMaxDesignDimensionsForGarment(state.sizeId, state.garmentId);
	if (!maxDims) return null;
	const reviewReasons = getReviewReasons(state);

	return (
		<>
			<AspectLockToggle state={state} patch={patch} />

			<div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
				<MockupSidePanel
					side="front"
					label="Front Design"
					color={color}
					maxDims={maxDims}
					artwork={state.frontArtwork}
					placement={state.frontPlacement}
					aspectLocked={state.frontPlacement?.aspectLocked ?? true}
					nameValue={state.nameValue}
					numberValue={state.numberValue}
					onPlacementChange={(placement) => patch({ frontPlacement: placement })}
					onArtworkUpdate={(artworkPatch) => state.frontArtwork && patch({ frontArtwork: { ...state.frontArtwork, ...artworkPatch } })}
				/>
				{state.backDesign && (
					<MockupSidePanel
						side="back"
						label="Back Design"
						color={color}
						maxDims={maxDims}
						artwork={state.backArtwork}
						placement={state.backPlacement}
						aspectLocked={state.backPlacement?.aspectLocked ?? true}
						nameValue={state.nameValue}
						numberValue={state.numberValue}
						onPlacementChange={(placement) => patch({ backPlacement: placement })}
						onArtworkUpdate={(artworkPatch) => state.backArtwork && patch({ backArtwork: { ...state.backArtwork, ...artworkPatch } })}
					/>
				)}
			</div>

			{state.inspirationArtwork && (
				<Hint>
					Inspiration reference on file: {state.inspirationArtwork.fileName} (used for reference only, not placed as final artwork).
				</Hint>
			)}

			{reviewReasons.length > 0 && (
				<div className="rounded-[14px] bg-[#F4E9D8] p-3.5 text-sm">
					<p>This configuration will be reviewed by MNH Creations before production:</p>
					<ul className="mt-1.5 list-disc pl-4.5">
						{reviewReasons.map((r) => (
							<li key={r}>{REVIEW_REASON_LABELS[r]}</li>
						))}
					</ul>
				</div>
			)}

			<CheckboxRow checked={state.proofRequested} onChange={(checked) => patch({ proofRequested: checked })}>
				Request final proof before production
			</CheckboxRow>

			<CheckboxRow checked={state.mockupAcknowledged} onChange={(checked) => patch({ mockupAcknowledged: checked })} emphasized>
				I understand the on-screen mockup is an approximate placement preview and MNH Creations may make minor adjustments for proper production.
			</CheckboxRow>
			<FieldError message={errors.mockupAcknowledged} />

			<ContinueButton onClick={onContinue} />
		</>
	);
}

/** A single top-level aspect-lock toggle that applies to whichever side(s) are active. */
function AspectLockToggle({ state, patch }: { state: ShirtConfiguratorState; patch: StepProps["patch"] }) {
	const locked = state.frontPlacement?.aspectLocked ?? true;
	const setLocked = (checked: boolean) => {
		patch({
			frontPlacement: state.frontPlacement ? { ...state.frontPlacement, aspectLocked: checked } : state.frontPlacement,
			backPlacement: state.backPlacement ? { ...state.backPlacement, aspectLocked: checked } : state.backPlacement,
		});
	};
	return (
		<CheckboxRow checked={locked} onChange={setLocked}>
			Maintain Aspect Ratio
		</CheckboxRow>
	);
}

type MockupSidePanelProps = {
	side: "front" | "back";
	label: string;
	color: ColorOption | null;
	maxDims: MaxDesignDimensions;
	artwork: ArtworkRef | null;
	placement: PlacementState | null;
	aspectLocked: boolean;
	nameValue: string;
	numberValue: string;
	onPlacementChange: (placement: PlacementState | null) => void;
	onArtworkUpdate: (patch: Partial<ArtworkRef>) => void;
};

function MockupSidePanel({
	side,
	label,
	color,
	maxDims,
	artwork,
	placement,
	aspectLocked,
	nameValue,
	numberValue,
	onPlacementChange,
	onArtworkUpdate,
}: MockupSidePanelProps) {
	const editorRef = useRef<MockupEditorHandle>(null);

	// Recompute the low-resolution flag whenever placement size or artwork
	// pixel dimensions change, so getReviewReasons() always sees current data.
	useEffect(() => {
		if (!artwork || artwork.artworkKind !== "raster" || !artwork.pixelWidth || !artwork.pixelHeight || !placement) return;
		const dpi = computeEffectiveDpi(artwork.pixelWidth, artwork.pixelHeight, placement.widthIn, placement.heightIn);
		const lowRes = isLowResolution(dpi);
		if (lowRes !== artwork.lowResolution) onArtworkUpdate({ lowResolution: lowRes });
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [placement?.widthIn, placement?.heightIn, artwork?.pixelWidth, artwork?.pixelHeight]);

	const canPreviewInCanvas = artwork && artwork.artworkKind !== "document";

	return (
		<div>
			<h3 className="mb-2 text-base font-semibold">{label}</h3>
			<MockupEditor
				ref={editorRef}
				side={side}
				maxWidthIn={maxDims.width}
				maxHeightIn={maxDims.height}
				garmentColorHex={color?.hex ?? "#FFFFFF"}
				artworkUrl={canPreviewInCanvas ? artwork!.url : null}
				nameText={nameValue}
				numberText={numberValue}
				aspectLocked={aspectLocked}
				initialPlacement={placement}
				onPlacementChange={onPlacementChange}
			/>
			{artwork && artwork.artworkKind === "document" && (
				<Hint>PDF artwork uploaded — a placement preview isn&apos;t available in the browser; MNH Creations will confirm exact placement during production review.</Hint>
			)}

			<div className="mt-2.5 flex flex-wrap gap-2">
				<button type="button" onClick={() => editorRef.current?.centerHorizontal()} className="rounded-full border-2 border-[#C9713D] px-3.5 py-1.5 text-xs font-extrabold text-[#A85B2E]">
					Center H
				</button>
				<button type="button" onClick={() => editorRef.current?.centerVertical()} className="rounded-full border-2 border-[#C9713D] px-3.5 py-1.5 text-xs font-extrabold text-[#A85B2E]">
					Center V
				</button>
				<button type="button" onClick={() => editorRef.current?.reset()} className="rounded-full border-2 border-[#C9713D] px-3.5 py-1.5 text-xs font-extrabold text-[#A85B2E]">
					Reset
				</button>
			</div>

			<div className="mt-2.5 text-sm text-[#7A5C46]">
				<p className="font-bold text-[#4A3728]">Design Size</p>
				{placement ? (
					<p>
						Width: {placement.widthIn.toFixed(1)} in {"·"} Height: {placement.heightIn.toFixed(1)} in
					</p>
				) : (
					<p>Upload artwork to position it here.</p>
				)}
				{artwork?.lowResolution && (
					<p className="font-bold text-[#A85B2E]">
						Low-resolution artwork {"—"} this image may appear blurry or pixelated at the selected print size. MNH Creations will review it before production.
					</p>
				)}
				<p className="italic">
					Maximum for current configuration: {maxDims.width}&quot; &times; {maxDims.height}&quot;
				</p>
			</div>
		</div>
	);
}
