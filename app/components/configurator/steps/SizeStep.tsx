import { SIZE_CATEGORY, SIZES, type SizeCategory } from "~/lib/apparel/config";
import { Chip, ContinueButton, FieldError } from "../StepShell";
import type { StepProps } from "../stepTypes";

const CATEGORY_LABELS: Record<SizeCategory, string> = {
	[SIZE_CATEGORY.INFANT]: "Infant",
	[SIZE_CATEGORY.TODDLER]: "Toddler",
	[SIZE_CATEGORY.YOUTH]: "Youth",
	[SIZE_CATEGORY.ADULT]: "Adult",
};

const CATEGORIES: SizeCategory[] = [SIZE_CATEGORY.INFANT, SIZE_CATEGORY.TODDLER, SIZE_CATEGORY.YOUTH, SIZE_CATEGORY.ADULT];

export function SizeStep({ state, patch, errors, onContinue }: StepProps) {
	const sizesInCategory = state.sizeCategoryFilter ? SIZES.filter((s) => s.category === state.sizeCategoryFilter) : [];

	return (
		<>
			<div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
				{CATEGORIES.map((cat) => (
					<Chip key={cat} selected={state.sizeCategoryFilter === cat} onClick={() => patch({ sizeCategoryFilter: cat })}>
						{CATEGORY_LABELS[cat]}
					</Chip>
				))}
			</div>

			{state.sizeCategoryFilter && (
				<div className="flex flex-wrap gap-2.5">
					{sizesInCategory.map((s) => (
						<Chip key={s.id} selected={state.sizeId === s.id} onClick={() => patch({ sizeId: s.id })}>
							{s.label}
						</Chip>
					))}
				</div>
			)}

			<FieldError message={errors.sizeId} />
			<ContinueButton onClick={onContinue} />
		</>
	);
}
