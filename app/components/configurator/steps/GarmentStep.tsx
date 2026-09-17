import { GARMENTS } from "~/lib/apparel/config";
import { garmentSupportsMethod, getEligibleColors } from "~/lib/apparel/compatibility";
import { Chip, ContinueButton, FieldError } from "../StepShell";
import type { StepProps } from "../stepTypes";

export function GarmentStep({ state, setState, errors, onContinue }: StepProps) {
	const handleSelect = (garmentId: string) => {
		setState((prev) => {
			if (prev.method && !garmentSupportsMethod(garmentId, prev.method)) {
				return { ...prev, garmentId, method: null, colorId: null };
			}
			if (prev.method) {
				const eligible = getEligibleColors(garmentId, prev.method);
				if (!eligible.some((c) => c.id === prev.colorId)) {
					return { ...prev, garmentId, colorId: null };
				}
			}
			return { ...prev, garmentId };
		});
	};

	return (
		<>
			<div className="flex flex-col gap-2.5">
				{GARMENTS.map((g) => (
					<Chip key={g.id} selected={state.garmentId === g.id} onClick={() => handleSelect(g.id)}>
						{g.label}
					</Chip>
				))}
			</div>
			<FieldError message={errors.garmentId} />
			<ContinueButton onClick={onContinue} />
		</>
	);
}
