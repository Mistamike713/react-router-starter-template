import { GARMENTS } from "~/lib/apparel/config";
import { getEligibleColors } from "~/lib/apparel/compatibility";
import { Chip, ContinueButton, FieldError } from "../StepShell";
import type { StepProps } from "../stepTypes";

export function GarmentStep({ state, setState, errors, onContinue }: StepProps) {
	const handleSelect = (garmentId: string) => {
		setState((prev) => {
			const eligible = getEligibleColors(garmentId);
			if (!eligible.some((c) => c.id === prev.colorId)) {
				return { ...prev, garmentId, colorId: null };
			}
			return { ...prev, garmentId };
		});
	};

	return (
		<>
			<div className="flex flex-col gap-2.5">
				{GARMENTS.map((g) => (
					<Chip key={g.id} selected={state.garmentId === g.id} onClick={() => handleSelect(g.id)}>
						<span className="block font-extrabold">{g.label}</span>
						<span className={`block text-xs font-normal ${state.garmentId === g.id ? "text-white/85" : "text-[#7A5C46]"}`}>{g.description}</span>
					</Chip>
				))}
			</div>
			<FieldError message={errors.garmentId} />
			<ContinueButton onClick={onContinue} />
		</>
	);
}
