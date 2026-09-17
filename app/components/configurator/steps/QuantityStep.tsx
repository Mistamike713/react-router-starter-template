import { validateFullConfiguration } from "~/lib/apparel/validation";
import type { StepProps } from "../stepTypes";

type QuantityStepProps = StepProps & { onAddToCart: () => void; isEditing: boolean };

export function QuantityStep({ state, patch, onAddToCart, isEditing }: QuantityStepProps) {
	const { valid, errors: finalErrors } = validateFullConfiguration(state);

	return (
		<>
			<div className="flex items-center gap-4">
				<button
					type="button"
					onClick={() => patch({ quantity: Math.max(1, state.quantity - 1) })}
					className="h-8 w-8 rounded-full border-[1.5px] border-[#C9713D] text-[#A85B2E]"
				>
					{"−"}
				</button>
				<span className="min-w-7 text-center text-lg font-extrabold">{state.quantity}</span>
				<button
					type="button"
					onClick={() => patch({ quantity: state.quantity + 1 })}
					className="h-8 w-8 rounded-full border-[1.5px] border-[#C9713D] text-[#A85B2E]"
				>
					+
				</button>
			</div>

			{!valid && (
				<div className="rounded-[14px] bg-[#a33]/10 p-3.5 text-sm text-[#a33]">
					<p>Please complete the following before adding to cart:</p>
					<ul className="mt-1.5 list-disc pl-4.5">
						{Object.values(finalErrors).map((msg) => (
							<li key={msg}>{msg}</li>
						))}
					</ul>
				</div>
			)}

			<button
				type="button"
				disabled={!valid}
				onClick={onAddToCart}
				className="w-full rounded-full bg-[#C9713D] px-6 py-3 text-sm font-extrabold text-white transition hover:bg-[#A85B2E] disabled:cursor-not-allowed disabled:opacity-50"
			>
				{isEditing ? "Save Changes to Cart" : "Add to Cart"}
			</button>
		</>
	);
}
