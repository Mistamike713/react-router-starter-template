// ============================================================================
// TumblerConfigurator — orchestrates the progressive, mobile-first custom
// tumbler configuration flow: Product & Finish -> Design -> Mockup & Review
// -> Quantity/Add to Cart. Mirrors ShirtConfigurator.tsx's structure and
// reuses the same generic step UI (StepShell/Chip/etc.) and upload
// architecture (ArtworkUploadField / /api/artwork-upload) as the apparel
// configurator, per the "one upload system, not two" requirement.
// ============================================================================

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useCart } from "~/lib/cart/CartContext";
import { TUMBLER_PRODUCTS, TUMBLER_DESIGN_SOURCE, getTumblerProduct, getTumblerFinishOption } from "~/lib/tumbler/config";
import { computeTumblerPrice } from "~/lib/tumbler/pricing";
import { formatCents } from "~/lib/apparel/pricing";
import {
	validateDesignStep,
	validateMockupStep,
	validateProductStep,
	type ValidationResult,
} from "~/lib/tumbler/validation";
import { createDefaultTumblerConfiguratorState, type TumblerConfiguratorState } from "~/lib/tumbler/types";
import { ArtworkUploadField } from "../configurator/ArtworkUploadField";
import { CheckboxRow, Chip, ContinueButton, FieldError, Hint, StepShell } from "../configurator/StepShell";
import { TumblerWrapEditor, type TumblerWrapEditorHandle } from "./TumblerWrapEditor";
import { TumblerMockupPreview } from "./TumblerMockupPreview";

type StepDef = {
	id: string;
	title: string;
	validate: (state: TumblerConfiguratorState) => ValidationResult;
};

const STEP_DEFS: StepDef[] = [
	{ id: "product", title: "Tumbler & Finish", validate: validateProductStep },
	{ id: "design", title: "Design", validate: validateDesignStep },
	{ id: "mockup", title: "Mockup & Review", validate: validateMockupStep },
	{ id: "quantity", title: "Quantity & Add to Cart", validate: () => ({ valid: true, errors: {} }) },
];

function stepSummary(stepId: string, state: TumblerConfiguratorState): string {
	const product = getTumblerProduct(state.productId);
	const finish = getTumblerFinishOption(product, state.finishOptionId);
	switch (stepId) {
		case "product":
			return product && finish ? `${product.label} — ${finish.label}` : "Not selected";
		case "design":
			if (!state.designSource) return "Not selected";
			return state.designSource === TUMBLER_DESIGN_SOURCE.UPLOAD_OWN ? "Uploading my own wrap design" : "MNH Creations designs for me";
		case "mockup":
			return state.mockupAcknowledged ? "Placement confirmed" : "Not confirmed";
		case "quantity":
			return `Qty ${state.quantity}`;
		default:
			return "";
	}
}

export function TumblerConfigurator({ editItemId, initialProductId }: { editItemId: string | null; initialProductId?: string | null }) {
	const cart = useCart();
	const navigate = useNavigate();

	const [state, setState] = useState<TumblerConfiguratorState>(() => {
		const initial = createDefaultTumblerConfiguratorState();
		if (!editItemId && initialProductId) {
			const product = getTumblerProduct(initialProductId);
			if (product) {
				initial.productId = product.id;
				initial.finishOptionId = product.finishOptions.length === 1 ? product.finishOptions[0].id : null;
			}
		}
		return initial;
	});
	const [activeStepIndex, setActiveStepIndex] = useState(0);
	const [maxReachedIndex, setMaxReachedIndex] = useState(0);
	const [pendingErrors, setPendingErrors] = useState<Record<string, string>>({});
	const [editingItemId, setEditingItemId] = useState<string | null>(null);
	const [isLoadingEdit, setIsLoadingEdit] = useState(Boolean(editItemId));
	const loadedEditRef = useRef(false);

	useEffect(() => {
		if (!editItemId || loadedEditRef.current) return;
		if (!cart.hydrated) return;
		loadedEditRef.current = true;
		const item = cart.getItem(editItemId);
		if (item && item.kind === "custom_tumbler") {
			const loadedState: TumblerConfiguratorState = {
				...createDefaultTumblerConfiguratorState(),
				...(item.config as Partial<TumblerConfiguratorState>),
				quantity: item.quantity,
			};
			setState(loadedState);
			setEditingItemId(editItemId);
			setMaxReachedIndex(STEP_DEFS.length - 1);
			setActiveStepIndex(STEP_DEFS.length - 1);
		}
		setIsLoadingEdit(false);
	}, [cart, editItemId]);

	const patch = (partial: Partial<TumblerConfiguratorState>) => setState((prev) => ({ ...prev, ...partial }));

	const handleContinue = (stepIndex: number) => {
		const { valid, errors } = STEP_DEFS[stepIndex].validate(state);
		setPendingErrors(valid ? {} : errors);
		if (valid) {
			setMaxReachedIndex((prev) => Math.max(prev, stepIndex + 1));
			setActiveStepIndex(Math.min(stepIndex + 1, STEP_DEFS.length - 1));
		}
	};

	const handleAddToCart = () => {
		const priceResult = computeTumblerPrice(state);
		if (!priceResult.valid) return;
		const product = getTumblerProduct(state.productId);
		const finish = getTumblerFinishOption(product, state.finishOptionId);
		if (!product || !finish) return;
		const name = `Custom Tumbler — ${product.label} (${finish.label})`;

		const payload = {
			kind: "custom_tumbler" as const,
			productId: product.id,
			name,
			quantity: priceResult.quantity,
			unitPriceCents: priceResult.unitPriceCents,
			reviewRequired: true,
			reviewReasons: ["CUSTOM_TUMBLER_REVIEW"],
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
		return <p className="text-[#7A5C46]">Loading your saved tumbler…</p>;
	}

	return (
		<div className="grid grid-cols-1 gap-7 lg:grid-cols-[1.6fr_1fr] lg:items-start">
			<div>
				<p className="mb-3.5 font-extrabold text-[#7A5C46]">
					{editingItemId
						? "Editing your saved tumbler — update anything below."
						: `Step ${activeStepIndex + 1} of ${STEP_DEFS.length}: ${STEP_DEFS[activeStepIndex].title}`}
				</p>
				{STEP_DEFS.map((stepDef, index) => {
					const isActive = index === activeStepIndex;
					const { valid } = stepDef.validate(state);
					const isComplete = valid && index < activeStepIndex;
					const isReachable = index <= maxReachedIndex;
					const onContinue = () => handleContinue(index);
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
							{stepDef.id === "product" && <ProductStep state={state} patch={patch} errors={isActive ? pendingErrors : {}} onContinue={onContinue} />}
							{stepDef.id === "design" && <DesignStep state={state} patch={patch} setState={setState} errors={isActive ? pendingErrors : {}} onContinue={onContinue} />}
							{stepDef.id === "mockup" && <MockupStep state={state} patch={patch} errors={isActive ? pendingErrors : {}} onContinue={onContinue} />}
							{stepDef.id === "quantity" && <QuantityStep state={state} patch={patch} onAddToCart={handleAddToCart} isEditing={Boolean(editingItemId)} />}
						</StepShell>
					);
				})}
			</div>

			<LivePriceSummary state={state} />
		</div>
	);
}

type StepChildProps = {
	state: TumblerConfiguratorState;
	patch: (partial: Partial<TumblerConfiguratorState>) => void;
	errors: Record<string, string>;
	onContinue: () => void;
};

function ProductStep({ state, patch, errors, onContinue }: StepChildProps) {
	const product = getTumblerProduct(state.productId);
	return (
		<>
			<div className="flex flex-col gap-2.5">
				{TUMBLER_PRODUCTS.map((p) => (
					<Chip
						key={p.id}
						selected={state.productId === p.id}
						onClick={() => patch({ productId: p.id, finishOptionId: p.finishOptions.length === 1 ? p.finishOptions[0].id : null })}
					>
						<span className="block font-extrabold">{p.label}</span>
						<span className={`block text-xs font-normal ${state.productId === p.id ? "text-white/85" : "text-[#7A5C46]"}`}>{p.description}</span>
					</Chip>
				))}
			</div>
			<FieldError message={errors.productId} />

			{product && product.finishOptions.length > 1 && (
				<>
					<label htmlFor="cfg-tumbler-finish" className="text-sm font-bold">
						Finish
					</label>
					<select
						id="cfg-tumbler-finish"
						value={state.finishOptionId ?? ""}
						onChange={(e) => patch({ finishOptionId: e.target.value || null })}
						className="rounded-[14px] border-[1.5px] border-[#F4E9D8] bg-[#FFF7EC] px-3 py-2.5 text-sm"
					>
						<option value="">{"— Choose a finish —"}</option>
						{product.finishOptions.map((o) => (
							<option key={o.id} value={o.id}>
								{o.label} — {formatCents(o.priceCents)}
							</option>
						))}
					</select>
					<FieldError message={errors.finishOptionId} />
				</>
			)}

			<ContinueButton onClick={onContinue} />
		</>
	);
}

function DesignStep({ state, patch, setState, errors, onContinue }: StepChildProps & { setState: React.Dispatch<React.SetStateAction<TumblerConfiguratorState>> }) {
	return (
		<>
			<div className="flex flex-col gap-2.5">
				<Chip selected={state.designSource === TUMBLER_DESIGN_SOURCE.UPLOAD_OWN} onClick={() => setState((prev) => ({ ...prev, designSource: TUMBLER_DESIGN_SOURCE.UPLOAD_OWN }))}>
					<span className="block font-extrabold">Upload My Design</span>
					<span className={`block text-xs font-normal ${state.designSource === TUMBLER_DESIGN_SOURCE.UPLOAD_OWN ? "text-white/85" : "text-[#7A5C46]"}`}>
						Production-ready wrap artwork you already have.
					</span>
				</Chip>
				<Chip selected={state.designSource === TUMBLER_DESIGN_SOURCE.CREATE_FOR_ME} onClick={() => setState((prev) => ({ ...prev, designSource: TUMBLER_DESIGN_SOURCE.CREATE_FOR_ME }))}>
					<span className="block font-extrabold">Create a Design for Me</span>
					<span className={`block text-xs font-normal ${state.designSource === TUMBLER_DESIGN_SOURCE.CREATE_FOR_ME ? "text-white/85" : "text-[#7A5C46]"}`}>
						MNH Creations designs it for you from your inspiration and notes.
					</span>
				</Chip>
			</div>
			<FieldError message={errors.designSource} />

			{state.designSource === TUMBLER_DESIGN_SOURCE.UPLOAD_OWN && (
				<ArtworkUploadField label="Wrap Design Artwork" value={state.artwork} onChange={(ref) => patch({ artwork: ref })} kind="production" errorMessage={errors.artwork} />
			)}

			{state.designSource && (
				<>
					<ArtworkUploadField label="Inspiration Image (optional)" value={state.inspirationArtwork} onChange={(ref) => patch({ inspirationArtwork: ref })} kind="inspiration" />

					<label htmlFor="cfg-tumbler-personalization" className="text-sm font-bold">
						Personalization (name, initials, etc. — optional)
					</label>
					<input
						id="cfg-tumbler-personalization"
						type="text"
						value={state.personalizationText}
						onChange={(e) => patch({ personalizationText: e.target.value })}
						className="rounded-[14px] border-[1.5px] border-[#F4E9D8] bg-[#FFF7EC] px-3 py-2.5 text-sm"
					/>

					<label htmlFor="cfg-tumbler-instructions" className="text-sm font-bold">
						Notes for MNH Creations
					</label>
					<textarea
						id="cfg-tumbler-instructions"
						rows={3}
						defaultValue={state.instructions}
						onBlur={(e) => patch({ instructions: e.target.value })}
						placeholder={
							state.designSource === TUMBLER_DESIGN_SOURCE.CREATE_FOR_ME
								? "Describe the design you'd like created (concept, colors, style, inspiration)."
								: "Anything else we should know about this design?"
						}
						className="rounded-[14px] border-[1.5px] border-[#F4E9D8] bg-[#FFF7EC] px-3 py-2.5 text-sm"
					/>
					<FieldError message={errors.instructions} />
				</>
			)}

			<ContinueButton onClick={onContinue} />
		</>
	);
}

function MockupStep({ state, patch, errors, onContinue }: StepChildProps) {
	const product = getTumblerProduct(state.productId);
	const editorRef = useRef<TumblerWrapEditorHandle>(null);

	if (!product) {
		return (
			<>
				<Hint>Choose a tumbler first.</Hint>
				<ContinueButton onClick={onContinue} />
			</>
		);
	}

	const artworkUrl = state.artwork?.url ?? null;
	const aspectLocked = state.placement?.aspectLocked ?? true;

	return (
		<>
			<CheckboxRow checked={aspectLocked} onChange={(checked) => patch({ placement: state.placement ? { ...state.placement, aspectLocked: checked } : state.placement })}>
				Maintain Aspect Ratio
			</CheckboxRow>

			<div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
				<div>
					<h3 className="mb-2 text-base font-semibold">Flat Wrap Design</h3>
					<TumblerWrapEditor
						ref={editorRef}
						wrapWidthIn={product.wrapDimensionsIn.width}
						wrapHeightIn={product.wrapDimensionsIn.height}
						bodyColorHex={product.bodyColorHex}
						artworkUrl={artworkUrl}
						aspectLocked={aspectLocked}
						initialPlacement={state.placement}
						onPlacementChange={(placement) => patch({ placement })}
					/>
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
				</div>
				<div>
					<h3 className="mb-2 text-base font-semibold">On the Tumbler (Approximate)</h3>
					<TumblerMockupPreview
						artworkUrl={artworkUrl}
						placement={state.placement}
						wrapWidthIn={product.wrapDimensionsIn.width}
						wrapHeightIn={product.wrapDimensionsIn.height}
						bodyColorHex={product.bodyColorHex}
					/>
				</div>
			</div>

			{state.inspirationArtwork && (
				<Hint>Inspiration reference on file: {state.inspirationArtwork.fileName} (used for reference only, not placed as final artwork).</Hint>
			)}

			<div className="rounded-[14px] bg-[#F4E9D8] p-3.5 text-sm">
				<p>All custom tumbler orders are reviewed by MNH Creations before production.</p>
			</div>

			<CheckboxRow checked={state.mockupAcknowledged} onChange={(checked) => patch({ mockupAcknowledged: checked })} emphasized>
				I understand the on-screen mockup is an approximate placement preview and MNH Creations may make minor adjustments for proper production.
			</CheckboxRow>
			<FieldError message={errors.mockupAcknowledged} />

			<ContinueButton onClick={onContinue} />
		</>
	);
}

function QuantityStep({
	state,
	patch,
	onAddToCart,
	isEditing,
}: {
	state: TumblerConfiguratorState;
	patch: (partial: Partial<TumblerConfiguratorState>) => void;
	onAddToCart: () => void;
	isEditing: boolean;
}) {
	return (
		<>
			<label htmlFor="cfg-tumbler-quantity" className="text-sm font-bold">
				Quantity
			</label>
			<input
				id="cfg-tumbler-quantity"
				type="number"
				min={1}
				value={state.quantity}
				onChange={(e) => patch({ quantity: Math.max(1, Number(e.target.value) || 1) })}
				className="w-24 rounded-[14px] border-[1.5px] border-[#F4E9D8] bg-[#FFF7EC] px-3 py-2.5 text-sm"
			/>
			<button type="button" onClick={onAddToCart} className="self-start rounded-full bg-[#C9713D] px-6 py-2.5 text-sm font-extrabold text-white transition hover:bg-[#A85B2E]">
				{isEditing ? "Save Changes" : "Add to Cart"}
			</button>
		</>
	);
}

function LivePriceSummary({ state }: { state: TumblerConfiguratorState }) {
	const product = getTumblerProduct(state.productId);
	const finish = getTumblerFinishOption(product, state.finishOptionId);
	const priceResult = product && finish ? computeTumblerPrice(state) : null;
	const configLine = [product?.label, finish?.label].filter(Boolean).join(" — ");

	return (
		<aside className="rounded-[20px] bg-white p-5 shadow-[0_10px_30px_rgba(74,55,40,0.10)] lg:sticky lg:top-24">
			<h2 className="font-[family-name:var(--font-head)] text-lg font-semibold">Custom Tumbler</h2>
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
				<p className="text-sm text-[#7A5C46] italic">Your price will appear here as you build your tumbler.</p>
			)}

			<p className="mt-4 text-[0.72rem] text-[#7A5C46]">All custom tumbler orders are subject to MNH Creations review/approval.</p>
		</aside>
	);
}
