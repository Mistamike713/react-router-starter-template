import { getEligibleColors } from "~/lib/apparel/compatibility";
import { ContinueButton, FieldError, Hint } from "../StepShell";
import type { StepProps } from "../stepTypes";

export function ColorStep({ state, patch, errors, onContinue }: StepProps) {
	if (!state.garmentId || !state.method) {
		return (
			<>
				<Hint>Choose a garment and production method first.</Hint>
				<ContinueButton onClick={onContinue} />
			</>
		);
	}

	const eligible = getEligibleColors(state.garmentId, state.method);

	return (
		<>
			<label htmlFor="cfg-color-select" className="text-sm font-bold">
				Shirt Color
			</label>
			<select
				id="cfg-color-select"
				value={state.colorId ?? ""}
				onChange={(e) => patch({ colorId: e.target.value || null })}
				className="rounded-[14px] border-[1.5px] border-[#F4E9D8] bg-[#FFF7EC] px-3 py-2.5 text-sm"
			>
				<option value="">{"— Choose a color —"}</option>
				{eligible.map((c) => (
					<option key={c.id} value={c.id}>
						{c.label}
					</option>
				))}
			</select>
			{eligible.length === 0 && <Hint>No colors are currently available for this combination.</Hint>}
			<FieldError message={errors.colorId} />
			<ContinueButton onClick={onContinue} />
		</>
	);
}
