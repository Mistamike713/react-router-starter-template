import { useEffect } from "react";
import { DESIGN_SERVICE_CONFIG, DESIGN_SERVICE_LEVEL, DESIGN_SOURCE, MNH_DESIGN_CATALOG, type DesignServiceLevel } from "~/lib/apparel/config";
import { formatCents } from "~/lib/apparel/pricing";
import { ArtworkUploadField } from "../ArtworkUploadField";
import { CheckboxRow, Chip, ContinueButton, FieldError, Hint } from "../StepShell";
import type { StepProps } from "../stepTypes";

const CUSTOMIZE_EXISTING_SERVICE_LEVELS: DesignServiceLevel[] = [
	DESIGN_SERVICE_LEVEL.SIMPLE_CUSTOMIZATION,
	DESIGN_SERVICE_LEVEL.FULL_CUSTOM,
	DESIGN_SERVICE_LEVEL.COMPLEX_CUSTOM,
];
const CREATE_FOR_ME_SERVICE_LEVELS: DesignServiceLevel[] = [
	DESIGN_SERVICE_LEVEL.SIMPLE_CUSTOMIZATION,
	DESIGN_SERVICE_LEVEL.FULL_CUSTOM,
	DESIGN_SERVICE_LEVEL.COMPLEX_CUSTOM,
];

const SOURCE_OPTIONS = [
	{ id: DESIGN_SOURCE.UPLOAD_OWN, label: "Upload My Design", hint: "Production-ready artwork you already have." },
	{ id: DESIGN_SOURCE.CUSTOMIZE_EXISTING, label: "Customize an MNH Design", hint: "Start from one of our designs and tell us what to change." },
	{ id: DESIGN_SOURCE.CREATE_FOR_ME, label: "Create a Design for Me", hint: "MNH Creations designs it for you." },
] as const;

export function DesignStep({ state, patch, setState, errors, onContinue }: StepProps) {
	const handleSourceChange = (sourceId: (typeof SOURCE_OPTIONS)[number]["id"]) => {
		setState((prev) => ({ ...prev, designSource: sourceId, existingDesignRef: null, designServiceLevel: null }));
	};

	// Default the design-service level to something sensible whenever the
	// design source changes to one that needs a service level, or the
	// currently-selected level isn't valid for the current source.
	useEffect(() => {
		if (state.designSource === DESIGN_SOURCE.CUSTOMIZE_EXISTING) {
			if (!state.designServiceLevel || !CUSTOMIZE_EXISTING_SERVICE_LEVELS.includes(state.designServiceLevel)) {
				patch({ designServiceLevel: DESIGN_SERVICE_LEVEL.SIMPLE_CUSTOMIZATION });
			}
		} else if (state.designSource === DESIGN_SOURCE.CREATE_FOR_ME) {
			if (!state.designServiceLevel || !CREATE_FOR_ME_SERVICE_LEVELS.includes(state.designServiceLevel)) {
				patch({ designServiceLevel: DESIGN_SERVICE_LEVEL.FULL_CUSTOM });
			}
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [state.designSource]);

	return (
		<>
			<div className="flex flex-col gap-2.5">
				{SOURCE_OPTIONS.map((opt) => (
					<Chip key={opt.id} selected={state.designSource === opt.id} onClick={() => handleSourceChange(opt.id)}>
						<span className="block font-extrabold">{opt.label}</span>
						<span className={`block text-xs font-normal ${state.designSource === opt.id ? "text-white/85" : "text-[#7A5C46]"}`}>{opt.hint}</span>
					</Chip>
				))}
			</div>
			<FieldError message={errors.designSource} />

			{state.designSource === DESIGN_SOURCE.UPLOAD_OWN && (
				<ArtworkUploadField
					label="Front Design Artwork"
					value={state.frontArtwork}
					onChange={(ref) => patch({ frontArtwork: ref })}
					kind="production"
					side="front"
					errorMessage={errors.frontArtwork}
				/>
			)}

			{state.designSource === DESIGN_SOURCE.CUSTOMIZE_EXISTING && (
				<>
					<label htmlFor="cfg-existing-design" className="text-sm font-bold">Choose a design to customize</label>
					<select
						id="cfg-existing-design"
						value={state.existingDesignRef ?? ""}
						onChange={(e) => patch({ existingDesignRef: e.target.value || null })}
						className="rounded-[14px] border-[1.5px] border-[#F4E9D8] bg-[#FFF7EC] px-3 py-2.5 text-sm"
					>
						<option value="">{"— Choose —"}</option>
						{MNH_DESIGN_CATALOG.map((d) => (
							<option key={d.id} value={d.id}>
								{d.label}
							</option>
						))}
					</select>
					<FieldError message={errors.existingDesignRef} />
					<DesignServiceSelector
						levelIds={CUSTOMIZE_EXISTING_SERVICE_LEVELS}
						selected={state.designServiceLevel}
						onSelect={(level) => patch({ designServiceLevel: level })}
					/>
					<InstructionsField
						value={state.instructions}
						onChange={(v) => patch({ instructions: v })}
						placeholder="Tell us what to customize (text, colors, names, arrangement, etc.)"
						error={errors.instructions}
					/>
					<ArtworkUploadField
						label="Inspiration Image (optional)"
						value={state.inspirationArtwork}
						onChange={(ref) => patch({ inspirationArtwork: ref })}
						kind="inspiration"
					/>
				</>
			)}

			{state.designSource === DESIGN_SOURCE.CREATE_FOR_ME && (
				<>
					<DesignServiceSelector
						levelIds={CREATE_FOR_ME_SERVICE_LEVELS}
						selected={state.designServiceLevel}
						onSelect={(level) => patch({ designServiceLevel: level })}
					/>
					<FieldError message={errors.designServiceLevel} />
					<InstructionsField
						value={state.instructions}
						onChange={(v) => patch({ instructions: v })}
						placeholder="Describe the design you'd like created (concept, colors, style, inspiration)."
						error={errors.instructions}
					/>
					<ArtworkUploadField
						label="Inspiration Image (optional)"
						value={state.inspirationArtwork}
						onChange={(ref) => patch({ inspirationArtwork: ref })}
						kind="inspiration"
					/>
				</>
			)}

			{state.designSource && (
				<>
					<CheckboxRow
						checked={state.backDesign}
						onChange={(checked) => setState((prev) => ({ ...prev, backDesign: checked, backArtwork: checked ? prev.backArtwork : null }))}
					>
						Add a design to the back too
					</CheckboxRow>
					{state.backDesign && state.designSource === DESIGN_SOURCE.UPLOAD_OWN && (
						<ArtworkUploadField
							label="Back Design Artwork"
							value={state.backArtwork}
							onChange={(ref) => patch({ backArtwork: ref })}
							kind="production"
							side="back"
							errorMessage={errors.backArtwork}
						/>
					)}
				</>
			)}

			<ContinueButton onClick={onContinue} />
		</>
	);
}

function DesignServiceSelector({
	levelIds,
	selected,
	onSelect,
}: {
	levelIds: DesignServiceLevel[];
	selected: DesignServiceLevel | null;
	onSelect: (level: DesignServiceLevel) => void;
}) {
	return (
		<div className="flex flex-col gap-2.5 rounded-[14px] bg-[#F4E9D8] p-3">
			<span className="text-sm font-bold">Design Service Level</span>
			{levelIds.map((levelId) => {
				const cfg = DESIGN_SERVICE_CONFIG[levelId];
				return (
					<label key={levelId} className="flex items-start gap-2.5 text-sm">
						<input type="radio" name="design-service" checked={selected === levelId} onChange={() => onSelect(levelId)} className="mt-0.5" />
						<span>
							<strong className="block">
								{cfg.label} {"—"}{" "}
								{cfg.isDeposit ? `${formatCents(cfg.feeCents)} deposit` : cfg.feeCents === 0 ? "Included" : `+${formatCents(cfg.feeCents)}`}
							</strong>
							<span className="text-[0.8rem] text-[#7A5C46]">{cfg.description}</span>
						</span>
					</label>
				);
			})}
		</div>
	);
}

function InstructionsField({
	value,
	onChange,
	placeholder,
	error,
}: {
	value: string;
	onChange: (v: string) => void;
	placeholder: string;
	error?: string;
}) {
	return (
		<div className="flex flex-col gap-1.5">
			<label htmlFor="cfg-instructions" className="text-sm font-bold">Instructions for MNH Creations</label>
			<textarea
				id="cfg-instructions"
				rows={3}
				defaultValue={value}
				onBlur={(e) => onChange(e.target.value)}
				placeholder={placeholder}
				className="rounded-[14px] border-[1.5px] border-[#F4E9D8] bg-[#FFF7EC] px-3 py-2.5 text-sm"
			/>
			<FieldError message={error} />
		</div>
	);
}
