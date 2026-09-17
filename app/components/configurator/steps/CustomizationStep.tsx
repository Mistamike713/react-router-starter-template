import { getAvailableSpecialtyMaterials } from "~/lib/apparel/config";
import { CheckboxRow, ContinueButton, FieldError, Hint } from "../StepShell";
import type { StepProps } from "../stepTypes";

export function CustomizationStep({ state, patch, setState, errors, onContinue }: StepProps) {
	const materials = getAvailableSpecialtyMaterials();

	return (
		<>
			<CheckboxRow
				checked={state.specialtyHTV}
				onChange={(checked) => setState((prev) => ({ ...prev, specialtyHTV: checked, specialtyMaterialId: checked ? prev.specialtyMaterialId : null }))}
			>
				Specialty HTV (glow, glitter, metallic, holographic, reflective...)
			</CheckboxRow>
			{state.specialtyHTV && (
				<>
					<select
						value={state.specialtyMaterialId ?? ""}
						onChange={(e) => patch({ specialtyMaterialId: e.target.value || null })}
						className="rounded-[14px] border-[1.5px] border-[#F4E9D8] bg-[#FFF7EC] px-3 py-2.5 text-sm"
					>
						<option value="">{"— Choose material —"}</option>
						{materials.map((m) => (
							<option key={m.id} value={m.id}>
								{m.label}
							</option>
						))}
					</select>
					<FieldError message={errors.specialtyMaterialId} />
				</>
			)}

			<CheckboxRow checked={state.name} onChange={(checked) => patch({ name: checked })}>
				Add a Name
			</CheckboxRow>
			{state.name && (
				<>
					<input
						type="text"
						placeholder="Name to print"
						maxLength={20}
						defaultValue={state.nameValue}
						onBlur={(e) => patch({ nameValue: e.target.value })}
						className="rounded-[14px] border-[1.5px] border-[#F4E9D8] bg-[#FFF7EC] px-3 py-2.5 text-sm"
					/>
					<FieldError message={errors.nameValue} />
				</>
			)}

			<CheckboxRow checked={state.number} onChange={(checked) => patch({ number: checked })}>
				Add a Number
			</CheckboxRow>
			{state.number && (
				<>
					<input
						type="text"
						inputMode="numeric"
						placeholder="Number to print"
						maxLength={3}
						defaultValue={state.numberValue}
						onBlur={(e) => patch({ numberValue: e.target.value })}
						className="rounded-[14px] border-[1.5px] border-[#F4E9D8] bg-[#FFF7EC] px-3 py-2.5 text-sm"
					/>
					<FieldError message={errors.numberValue} />
				</>
			)}

			{state.name && state.number && <Hint>Name + Number is priced as a bundle, not two separate charges.</Hint>}

			<ContinueButton onClick={onContinue} />
		</>
	);
}
