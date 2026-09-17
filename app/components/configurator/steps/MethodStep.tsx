import { PRODUCTION_METHOD_CONFIG } from "~/lib/apparel/config";
import { garmentSupportsMethod, getEligibleColors } from "~/lib/apparel/compatibility";
import { ContinueButton, FieldError, Hint } from "../StepShell";
import type { StepProps } from "../stepTypes";

export function MethodStep({ state, setState, errors, onContinue }: StepProps) {
	if (!state.garmentId) {
		return (
			<>
				<Hint>Choose a garment first.</Hint>
				<ContinueButton onClick={onContinue} />
			</>
		);
	}

	const handleSelect = (methodId: keyof typeof PRODUCTION_METHOD_CONFIG) => {
		setState((prev) => {
			if (!prev.garmentId) return prev;
			const eligible = getEligibleColors(prev.garmentId, methodId);
			const colorId = eligible.some((c) => c.id === prev.colorId) ? prev.colorId : null;
			return { ...prev, method: methodId, colorId };
		});
	};

	return (
		<>
			{Object.values(PRODUCTION_METHOD_CONFIG).map((methodConfig) => {
				const supported = garmentSupportsMethod(state.garmentId, methodConfig.id);
				const selected = state.method === methodConfig.id;
				return (
					<div
						key={methodConfig.id}
						className={`rounded-[14px] border-[1.5px] p-3.5 ${selected ? "border-[#C9713D] bg-[#C9713D]/5" : "border-[#F4E9D8]"} ${
							supported ? "" : "opacity-55"
						}`}
					>
						<button
							type="button"
							disabled={!supported}
							onClick={() => handleSelect(methodConfig.id)}
							className="text-left text-base font-extrabold disabled:cursor-not-allowed"
						>
							{methodConfig.label}
							{!supported && " (not available for this garment)"}
						</button>
						<p className="mt-1.5 text-sm text-[#7A5C46]">
							Equipment maximum: {methodConfig.maxPrintWidthIn}&quot; &times; {methodConfig.maxPrintHeightIn}&quot;
						</p>
						{methodConfig.requirementNotes.length > 0 && (
							<ul className="mt-1.5 list-disc pl-4.5 text-sm text-[#7A5C46]">
								{methodConfig.requirementNotes.map((note) => (
									<li key={note}>{note}</li>
								))}
							</ul>
						)}
						{methodConfig.requiresApproval && (
							<p className="mt-1.5 text-[0.8rem] text-[#A85B2E] italic">Subject to MNH Creations review/approval.</p>
						)}
					</div>
				);
			})}
			<FieldError message={errors.method} />
			<ContinueButton onClick={onContinue} />
		</>
	);
}
