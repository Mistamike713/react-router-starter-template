// ============================================================================
// Site-wide cart UI: header badge + slide-out drawer. Rendered once per page
// (home.tsx and shirt-configurator.tsx each include it in their header) —
// state lives in CartContext so it's shared across client-side navigation.
// ============================================================================

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router";
import { useCart } from "~/lib/cart/CartContext";
import { getCartItemCount, getCartSubtotalCents, type CartItem } from "~/lib/cart/types";
import { computeTax } from "~/lib/cart/tax";
import { computeShippingEstimate, validateDestinationZip, FULFILLMENT_METHOD } from "~/lib/cart/shipping";
import { generateOrderReference } from "~/lib/cart/orderReference";
import { buildOrderSummaryText } from "~/lib/cart/buildOrderSummary";
import { formatCents } from "~/lib/apparel/pricing";
import { describeCartItem, customShirtDetailLines } from "~/lib/cart/describeCartItem";

const CONTACT_EMAIL = "info@mnhcreations.com";

function isValidEmail(email: string): boolean {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function CartWidget() {
	const cart = useCart();
	const [isOpen, setIsOpen] = useState(false);
	const [mounted, setMounted] = useState(false);
	const [zipTouched, setZipTouched] = useState(false);
	const [contactTouched, setContactTouched] = useState(false);
	useEffect(() => setMounted(true), []);
	const items = cart.state.items;
	const itemCount = getCartItemCount(cart.state);
	const subtotalCents = getCartSubtotalCents(cart.state);
	const tax = computeTax(subtotalCents);
	const shipping = computeShippingEstimate(cart.state.fulfillmentMethod, cart.state.destinationZip);
	const zipValidation = validateDestinationZip(cart.state.fulfillmentMethod, cart.state.destinationZip);
	const estimatedTotalCents = subtotalCents + tax.taxCents + shipping.shippingCents;
	const nameValid = cart.state.customer.name.trim().length > 0;
	const emailValid = isValidEmail(cart.state.customer.email);
	const contactValid = nameValid && emailValid;
	const canSubmit = items.length > 0 && zipValidation.valid && contactValid;

	const handleSubmitOrder = () => {
		if (items.length === 0) return;
		if (!contactValid) {
			setContactTouched(true);
			setZipTouched(true);
			return;
		}
		if (!zipValidation.valid) {
			setZipTouched(true);
			return;
		}
		const subject = "MNH Creations — Order Request";
		const body = buildOrderSummaryText({
			orderReference: generateOrderReference(),
			customer: cart.state.customer,
			items,
			orderNotes: cart.state.orderNotes,
			subtotalCents,
			fulfillmentMethod: cart.state.fulfillmentMethod,
			destinationZip: cart.state.destinationZip,
			shippingAddress: cart.state.shippingAddress,
		});
		window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
	};

	return (
		<>
			<button
				type="button"
				onClick={() => setIsOpen(true)}
				aria-label="Open cart"
				className="inline-flex items-center gap-1.5 rounded-full bg-[#C9713D] px-3.5 py-2 text-sm font-extrabold text-white transition hover:bg-[#A85B2E]"
			>
				<span aria-hidden="true">{"\u{1F6D2}"}</span>
				<span className="hidden sm:inline">Cart</span>
				<span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white/90 px-1 text-xs text-[#A85B2E]">
					{itemCount}
				</span>
			</button>

			{mounted &&
				createPortal(
					<>
						<div
							aria-hidden={!isOpen}
							onClick={() => setIsOpen(false)}
							className={`fixed inset-0 z-40 bg-[#4A3728]/45 transition-opacity ${isOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}
						/>

						<aside
							role="dialog"
							aria-label="Shopping cart"
							aria-hidden={!isOpen}
							className={`fixed top-0 right-0 bottom-0 z-50 flex w-full max-w-[420px] flex-col bg-[#FFF7EC] text-[#4A3728] shadow-[-10px_0_30px_rgba(0,0,0,0.2)] transition-transform ${
								isOpen ? "translate-x-0" : "translate-x-full"
							}`}
						>
							<div className="flex items-center justify-between border-b border-[#F4E9D8] px-5 py-4">
								<h2 className="font-[family-name:var(--font-head)] text-xl font-semibold">Your Cart</h2>
								<button type="button" onClick={() => setIsOpen(false)} aria-label="Close cart" className="p-1 text-lg text-[#7A5C46]">
									{"✕"}
								</button>
							</div>

							{items.length === 0 ? (
								<p className="px-5 py-6 text-[#7A5C46]">Your cart is empty.</p>
							) : (
								<div className="min-h-0 flex-1 overflow-y-auto px-5">
									{items.map((item) => (
										<CartItemRow key={item.id} item={item} />
									))}
								</div>
							)}

							<div className="border-t border-[#F4E9D8] bg-white px-5 pt-4 pb-5">
								<fieldset className="mb-3.5 flex flex-col gap-1.5">
									<legend className="mb-0.5 text-sm font-bold">Your Contact Info</legend>
									<input
										type="text"
										value={cart.state.customer.name}
										onChange={(e) => cart.setCustomerInfo({ name: e.target.value })}
										onBlur={() => setContactTouched(true)}
										placeholder="Full name"
										aria-label="Full name"
										className="rounded-[14px] border-[1.5px] border-[#F4E9D8] bg-[#FFF7EC] px-3 py-2 text-sm"
									/>
									<input
										type="email"
										value={cart.state.customer.email}
										onChange={(e) => cart.setCustomerInfo({ email: e.target.value })}
										onBlur={() => setContactTouched(true)}
										placeholder="Email address"
										aria-label="Email address"
										className="rounded-[14px] border-[1.5px] border-[#F4E9D8] bg-[#FFF7EC] px-3 py-2 text-sm"
									/>
									<input
										type="tel"
										value={cart.state.customer.phone}
										onChange={(e) => cart.setCustomerInfo({ phone: e.target.value })}
										placeholder="Phone (optional)"
										aria-label="Phone number (optional)"
										className="rounded-[14px] border-[1.5px] border-[#F4E9D8] bg-[#FFF7EC] px-3 py-2 text-sm"
									/>
									{contactTouched && !contactValid && (
										<p role="alert" className="text-sm text-[#a33]">
											Please enter your name and a valid email address.
										</p>
									)}
								</fieldset>

								<fieldset className="mb-3.5">
									<legend className="mb-1.5 text-sm font-bold">How will you get your order?</legend>
									<div className="flex gap-4 text-sm">
										<label className="inline-flex items-center gap-1.5">
											<input
												type="radio"
												name="fulfillment-method"
												checked={cart.state.fulfillmentMethod === FULFILLMENT_METHOD.PICKUP}
												onChange={() => cart.setFulfillmentMethod(FULFILLMENT_METHOD.PICKUP)}
											/>
											Local Pickup
										</label>
										<label className="inline-flex items-center gap-1.5">
											<input
												type="radio"
												name="fulfillment-method"
												checked={cart.state.fulfillmentMethod === FULFILLMENT_METHOD.SHIPPING}
												onChange={() => cart.setFulfillmentMethod(FULFILLMENT_METHOD.SHIPPING)}
											/>
											Ship to Me
										</label>
									</div>
								</fieldset>

								{cart.state.fulfillmentMethod === FULFILLMENT_METHOD.SHIPPING && (
									<div className="mb-3.5 flex flex-col gap-1.5">
										<label htmlFor="cart-destination-zip" className="text-sm font-bold">
											Destination ZIP Code
										</label>
										<input
											id="cart-destination-zip"
											type="text"
											inputMode="numeric"
											value={cart.state.destinationZip}
											onChange={(e) => cart.setDestinationZip(e.target.value)}
											onBlur={() => setZipTouched(true)}
											placeholder="e.g. 77484"
											className="rounded-[14px] border-[1.5px] border-[#F4E9D8] bg-[#FFF7EC] px-3 py-2 text-sm"
										/>
										{zipTouched && !zipValidation.valid && (
											<p role="alert" className="text-sm text-[#a33]">
												{zipValidation.error}
											</p>
										)}
										<label htmlFor="cart-shipping-address" className="mt-1.5 text-sm font-bold">
											Shipping Address
										</label>
										<textarea
											id="cart-shipping-address"
											rows={2}
											value={cart.state.shippingAddress}
											onChange={(e) => cart.setShippingAddress(e.target.value)}
											placeholder="Street, city, state"
											className="rounded-[14px] border-[1.5px] border-[#F4E9D8] bg-[#FFF7EC] px-3 py-2 text-sm"
										/>
									</div>
								)}

								<div className="mb-3.5 flex flex-col gap-1.5">
									<label htmlFor="cart-order-notes" className="text-sm font-bold">
										Notes for MNH Creations
									</label>
									<textarea
										id="cart-order-notes"
										rows={3}
										defaultValue={cart.state.orderNotes}
										onBlur={(e) => cart.setOrderNotes(e.target.value)}
										placeholder="Anything else we should know about this order?"
										className="rounded-[14px] border-[1.5px] border-[#F4E9D8] bg-[#FFF7EC] px-3 py-2 text-sm"
									/>
								</div>

								<div className="flex justify-between py-1 text-sm">
									<span>Subtotal</span>
									<span>{formatCents(subtotalCents)}</span>
								</div>
								<div className="flex justify-between py-1 text-sm">
									<span>{tax.label}{tax.authoritative ? "" : " (est.)"}</span>
									<span>{formatCents(tax.taxCents)}</span>
								</div>
								<div className="flex justify-between py-1 text-sm">
									<span>{shipping.label}{shipping.authoritative ? "" : " (est.)"}</span>
									<span>{formatCents(shipping.shippingCents)}</span>
								</div>
								<div className="mt-1 flex justify-between border-t border-[#F4E9D8] pt-2 text-base font-extrabold">
									<span>Estimated Total</span>
									<span>{formatCents(estimatedTotalCents)}</span>
								</div>

								<button
									type="button"
									disabled={!canSubmit}
									onClick={handleSubmitOrder}
									className="mt-3 w-full rounded-full bg-[#C9713D] px-6 py-3 text-sm font-extrabold text-white transition hover:bg-[#A85B2E] disabled:cursor-not-allowed disabled:opacity-50"
								>
									Submit Order Request
								</button>
								<p className="mt-2 text-[0.72rem] text-[#7A5C46]">{tax.disclaimer}</p>
								<p className="text-[0.72rem] text-[#7A5C46]">{shipping.disclaimer}</p>
							</div>
						</aside>
					</>,
					document.body,
				)}
		</>
	);
}

function CartItemRow({ item }: { item: CartItem }) {
	const cart = useCart();
	const description = describeCartItem(item);
	const details = item.kind === "custom_shirt" ? customShirtDetailLines(item.config) : [];

	return (
		<div className="border-b border-[#F4E9D8] py-4">
			<h3 className="text-base font-semibold">{item.name}</h3>
			{description && <p className="mt-0.5 text-sm text-[#7A5C46]">{description}</p>}
			{details.length > 0 && (
				<ul className="mt-1 list-disc pl-4 text-[0.82rem] text-[#7A5C46]">
					{details.map((d) => (
						<li key={d}>{d}</li>
					))}
				</ul>
			)}
			{item.reviewRequired && (
				<p className="mt-1 text-[0.78rem] font-bold text-[#A85B2E]">
					Subject to MNH review ({item.reviewReasons.length} item{item.reviewReasons.length === 1 ? "" : "s"})
				</p>
			)}

			<div className="mt-2 flex items-center justify-between gap-3">
				<div className="inline-flex items-center gap-2.5">
					<button
						type="button"
						aria-label="Decrease quantity"
						onClick={() => cart.updateQuantity(item.id, item.quantity - 1)}
						className="h-7 w-7 rounded-full border-[1.5px] border-[#C9713D] text-[#A85B2E]"
					>
						{"−"}
					</button>
					<span className="min-w-5 text-center font-bold">{item.quantity}</span>
					<button
						type="button"
						aria-label="Increase quantity"
						onClick={() => cart.updateQuantity(item.id, item.quantity + 1)}
						className="h-7 w-7 rounded-full border-[1.5px] border-[#C9713D] text-[#A85B2E]"
					>
						+
					</button>
				</div>
				<div className="text-right">
					<div className="text-xs text-[#7A5C46]">{formatCents(item.unitPriceCents)} each</div>
					<div className="font-[family-name:var(--font-head)] text-[#A85B2E]">{formatCents(item.extendedPriceCents)}</div>
				</div>
			</div>

			<div className="mt-2 flex gap-3.5 text-[0.85rem] font-bold">
				{item.kind === "custom_shirt" && (
					<Link to={`/shirt-configurator?editId=${encodeURIComponent(item.id)}`} className="text-[#A85B2E] underline">
						Edit
					</Link>
				)}
				<button type="button" onClick={() => cart.duplicateItem(item.id)} className="text-[#A85B2E] underline">
					Duplicate
				</button>
				<button type="button" onClick={() => cart.removeItem(item.id)} className="text-[#a33] underline">
					Remove
				</button>
			</div>
		</div>
	);
}
