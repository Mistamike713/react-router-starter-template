// ============================================================================
// ShirtConfigurator — orchestrates the progressive, mobile-first custom
// shirt configuration flow: Garment -> Size -> Production Method -> Color ->
// Design -> Customization -> Mockup -> Quantity/Add to Cart.
//
// This component owns configurator state and step-progression; all pricing/
// compatibility/validation logic lives in ~/lib/apparel and is only called
// into here, never duplicated.
// ============================================================================

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useCart } from "~/lib/cart/CartContext";
import {
	getColor,
	getGarment,
	getSize,
	PRODUCTION_METHOD_DISCLOSURE,
} from "~/lib/apparel/config";
import { getReviewReasons } from "~/lib/apparel/compatibility";
import { computeCustomShirtPrice, formatCents } from "~/lib/apparel/pricing";
import {
	validateColorStep,
	validateCustomizationStep,
	validateDesignSourceStep,
	validateGarmentStep,
	validateMockupStep,
	validateSizeStep,
	type ValidationResult,
} from "~/lib/apparel/validation";
import { createDefaultShirtConfiguratorState, type ShirtConfiguratorState } from "~/lib/apparel/types";
import { StepShell } from "./StepShell";
import { GarmentStep } from "./steps/GarmentStep";
import { SizeStep } from "./steps/SizeStep";
import { ColorStep } from "./steps/ColorStep";
import { DesignStep } from "./steps/DesignStep";
import { CustomizationStep } from "./steps/CustomizationStep";
import { MockupStep } from "./steps/MockupStep";
import { QuantityStep } from "./steps/QuantityStep";
import type { StepProps } from "./stepTypes";

type StepDef = {
	id: string;
	title: string;
	validate: (state: ShirtConfiguratorState) => ValidationResult;
	render: (props: StepProps) => React.ReactNode;
};

const STEP_DEFS: StepDef[] = [
	{ id: "garment", title: "Garment", validate: validateGarmentStep, render: (p) => <GarmentStep {...p} /> },
	{ id: "size", title: "Size", validate: validateSizeStep, render: (p) => <SizeStep {...p} /> },
	{ id: "color", title: "Shirt Color", validate: validateColorStep, render: (p) => <ColorStep {...p} /> },
	{ id: "design", title: "Design", validate: validateDesignSourceStep, render: (p) => <DesignStep {...p} /> },
	{ id: "customization", title: "Customization", validate: validateCustomizationStep, render: (p) => <CustomizationStep {...p} /> },
	{ id: "mockup", title: "Mockup & Review", validate: validateMockupStep, render: (p) => <MockupStep {...p} /> },
	{ id: "quantity", title: "Quantity & Add to Cart", validate: () => ({ valid: true, errors: {} }), render: () => null },
];

function stepSummary(stepId: string, state: ShirtConfiguratorState): string {
	switch (stepId) {
		case "garment":
			return getGarment(state.garmentId)?.label ?? "Not selected";
		case "size":
			return getSize(state.sizeId)?.label ?? "Not selected";
		case "color":
			return getColor(state.colorId)?.label ?? "Not selected";
		case "design":
			if (!state.designSource) return "Not selected";
			if (state.designSource === "upload_own") return "Uploading my own design";
			if (state.designSource === "customize_existing") return "Customizing an MNH design";
			return "MNH Creations designs for me";
		case "customization": {
			const bits: string[] = [];
			if (state.specialtyHTV) bits.push("Specialty HTV");
			if (state.name && state.number) bits.push("Name + Number");
			else if (state.name) bits.push("Name");
			else if (state.number) bits.push("Number");
			return bits.length ? bits.join(", ") : "No add-ons";
		}
		case "mockup":
			return state.mockupAcknowledged ? "Placement confirmed" : "Not confirmed";
		case "quantity":
			return `Qty ${state.quantity}`;
		default:
			return "";
	}
}

export function ShirtConfigurator({ editItemId }: { editItemId: string | null }) {
	const cart = useCart();
	const navigate = useNavigate();

	const [state, setState] = useState<ShirtConfiguratorState>(createDefaultShirtConfiguratorState);
	const [activeStepIndex, setActiveStepIndex] = useState(0);
	const [maxReachedIndex, setMaxReachedIndex] = useState(0);
	const [pendingErrors, setPendingErrors] = useState<Record<string, string>>({});
	const [editingItemId, setEditingItemId] = useState<string | null>(null);
	const [isLoadingEdit, setIsLoadingEdit] = useState(Boolean(editItemId));
	const loadedEditRef = useRef(false);

	// Wait for cart localStorage hydration before trying to load an item to
	// edit — the cart provider always starts empty on the server/first paint.
	useEffect(() => {
		if (!editItemId || loadedEditRef.current) return;
		if (!cart.hydrated) return;
		loadedEditRef.current = true;
		const item = cart.getItem(editItemId);
		if (item && item.kind === "custom_shirt") {
			const loadedState: ShirtConfiguratorState = {
				...createDefaultShirtConfiguratorState(),
				...(item.config as Partial<ShirtConfiguratorState>),
				quantity: item.quantity,
			};
			const size = getSize(loadedState.sizeId);
			if (size) loadedState.sizeCategoryFilter = size.category;
			setState(loadedState);
			setEditingItemId(editItemId);
			setMaxReachedIndex(STEP_DEFS.length - 1);
			setActiveStepIndex(STEP_DEFS.length - 1);
		}
		setIsLoadingEdit(false);
	}, [cart, editItemId]);

	const patch = (partial: Partial<ShirtConfiguratorState>) => setState((prev) => ({ ...prev, ...partial }));

	const handleContinue = (stepIndex: number) => {
		const { valid, errors } = STEP_DEFS[stepIndex].validate(state);
		setPendingErrors(valid ? {} : errors);
		if (valid) {
			setMaxReachedIndex((prev) => Math.max(prev, stepIndex + 1));
			setActiveStepIndex(Math.min(stepIndex + 1, STEP_DEFS.length - 1));
		}
	};

	const handleAddToCart = () => {
		const priceResult = computeCustomShirtPrice(state);
		if (!priceResult.valid) return;
		const reviewReasons = getReviewReasons(state);
		const garment = getGarment(state.garmentId);
		const size = getSize(state.sizeId);
		const color = getColor(state.colorId);
		if (!garment || !size || !color) return;
		const name = `Custom ${garment.label} — ${size.label}, ${color.label}`;

		const payload = {
			kind: "custom_shirt" as const,
			productId: "custom_htv_sublimation_shirt",
			name,
			quantity: priceResult.quantity,
			unitPriceCents: priceResult.unitPriceCents,
			reviewRequired: reviewReasons.length > 0,
			reviewReasons,
			config: JSON.parse(JSON.stringify(state)),
		};

		if (editingItemId) {
			cart.updateItem(editingItemId, payload);
		} else {
			cart.addItem(payload);
		}
		navigate("/");
	};

	if (isLoadingEdit) {
		return <p className="text-[#7A5C46]">Loading your saved shirt…</p>;
	}

	return (
		<div className="grid grid-cols-1 gap-7 lg:grid-cols-[1.6fr_1fr] lg:items-start">
			<div>
				<p className="mb-3 font-extrabold text-[#7A5C46]">
					{editingItemId ? "Editing your saved shirt — update anything below." : `Step ${activeStepIndex + 1} of ${STEP_DEFS.length}: ${STEP_DEFS[activeStepIndex].title}`}
				</p>
				<p className="mb-3.5 rounded-[14px] bg-[#F4E9D8] p-3 text-sm text-[#7A5C46]">{PRODUCTION_METHOD_DISCLOSURE}</p>
				{STEP_DEFS.map((stepDef, index) => {
					const isActive = index === activeStepIndex;
					const { valid } = stepDef.validate(state);
					const isComplete = valid && index < activeStepIndex;
					const isReachable = index <= maxReachedIndex;
					const stepProps: StepProps = {
						state,
						patch,
						setState,
						errors: isActive ? pendingErrors : {},
						onContinue: () => handleContinue(index),
					};
					return (
						<StepShell
							key={stepDef.id}
							index={index}
							title={stepDef.title}
							isActive={isActive}
							isComplete={isComplete}
							isReachable={isReachable}
							summary={stepSummary(stepDef.id, state)}
							onHeaderClick={() => {
								if (index <= maxReachedIndex) setActiveStepIndex(index);
							}}
						>
							{stepDef.id === "quantity" ? (
								<QuantityStep {...stepProps} onAddToCart={handleAddToCart} isEditing={Boolean(editingItemId)} />
							) : (
								stepDef.render(stepProps)
							)}
						</StepShell>
					);
				})}
			</div>

			<LivePriceSummary state={state} />
		</div>
	);
}

function LivePriceSummary({ state }: { state: ShirtConfiguratorState }) {
	const garment = getGarment(state.garmentId);
	const size = getSize(state.sizeId);
	const color = getColor(state.colorId);
	const priceResult = garment && size ? computeCustomShirtPrice(state) : null;

	const configLine = [size?.label, garment?.label, color?.label].filter(Boolean).join(" — ");

	return (
		<aside className="rounded-[20px] bg-white p-5 shadow-[0_10px_30px_rgba(74,55,40,0.10)] lg:sticky lg:top-24">
			<h2 className="font-[family-name:var(--font-head)] text-lg font-semibold">Custom Shirt</h2>
			{configLine && <p className="mt-1 mb-3 text-sm text-[#7A5C46]">{configLine}</p>}

			{priceResult && priceResult.valid ? (
				<>
					<div className="border-t border-[#F4E9D8] pt-2.5">
						{priceResult.lines.map((line) => (
							<div key={line.key} className="flex justify-between py-1 text-sm">
								<span>{line.label}</span>
								<span>{formatCents(line.amountCents)}</span>
							</div>
						))}
						<div className="mt-1.5 flex justify-between border-t border-[#F4E9D8] pt-2 font-extrabold">
							<span>Item Total</span>
							<span>{formatCents(priceResult.unitPriceCents)}</span>
						</div>
					</div>
					<p className="mt-3 font-bold">Quantity: {priceResult.quantity}</p>
					<div className="mt-2 flex justify-between border-t border-[#F4E9D8] pt-2 text-base font-extrabold text-[#A85B2E]">
						<span>Extended Total</span>
						<span>{formatCents(priceResult.extendedPriceCents)}</span>
					</div>
				</>
			) : (
				<p className="text-sm text-[#7A5C46] italic">Your price will appear here as you build your shirt.</p>
			)}

			<p className="mt-4 text-[0.72rem] text-[#7A5C46]">All HTV and sublimation orders are subject to MNH Creations review/approval.</p>
		</aside>
	);
}
