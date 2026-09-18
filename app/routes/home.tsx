import { useEffect, useState } from "react";
import { SiteHeader } from "~/components/layout/SiteHeader";
import { getMinBasePriceCents } from "~/lib/apparel/config";
import { formatCents } from "~/lib/apparel/pricing";
import { getMinTumblerPriceCents } from "~/lib/tumbler/config";

const CONTACT_EMAIL = "info@mnhcreations.com";
const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB, matches the server-side limit

/**
 * Homepage category entry points. Each links straight into that category's
 * configurator, where the specific product/size/finish is chosen. Add a
 * future category (decals, mugs, signs, bags, ...) by adding an entry here
 * once it actually exists — never a placeholder for something not yet
 * available to order.
 */
type ProductCategory = {
	id: string;
	label: string;
	description: string;
	href: string;
	startingAtCents: number;
	icon: React.ReactNode;
};

const PRODUCT_CATEGORIES: ProductCategory[] = [
	{
		id: "tshirts",
		label: "Custom T-Shirts",
		description: "Choose a T-Shirt or Performance Shirt, pick your size and color, and add your design.",
		href: "/shirt-configurator",
		startingAtCents: getMinBasePriceCents(),
		icon: (
			<svg viewBox="0 0 64 64" width="52" height="52" aria-hidden="true">
				<path
					d="M20 6 L10 16 L16 24 L20 21 L20 58 L44 58 L44 21 L48 24 L54 16 L44 6 L38 6 C38 9 35 12 32 12 C29 12 26 9 26 6 Z"
					fill="#C9713D"
					stroke="#A85B2E"
					strokeWidth="2"
				/>
			</svg>
		),
	},
	{
		id: "tumblers",
		label: "Custom Tumblers",
		description: "Pick a tumbler size and finish, upload your design, and preview the wrap before you order.",
		href: "/tumbler-configurator",
		startingAtCents: getMinTumblerPriceCents(),
		icon: (
			<svg viewBox="0 0 64 96" width="48" height="72" aria-hidden="true">
				<rect x="10" y="14" width="44" height="74" rx="10" fill="#F4E3C7" stroke="#B9743B" strokeWidth="3" />
				<rect x="18" y="4" width="28" height="14" rx="4" fill="#B9743B" />
			</svg>
		),
	},
];

const steps = [
	{ title: "Choose Your Product", body: "Pick a category above — T-Shirts, Tumblers, and more to come." },
	{ title: "Customize It", body: "Choose your size, color, and finish, then add your design or ask MNH to create one." },
	{ title: "Review Your Design", body: "Preview your design placement and confirm the details before it's added to your cart." },
	{ title: "MNH Creates It", body: "MNH Creations reviews your order and brings your design to life." },
	{ title: "Pickup or Delivery", body: "Choose local pickup or shipping — your total updates to match." },
];

export default function Home() {
	const [formNote, setFormNote] = useState("");
	const [imageFile, setImageFile] = useState<File | null>(null);
	const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
	const [imageError, setImageError] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	useEffect(() => {
		if (!imageFile) {
			setImagePreviewUrl(null);
			return;
		}
		const objectUrl = URL.createObjectURL(imageFile);
		setImagePreviewUrl(objectUrl);
		return () => URL.revokeObjectURL(objectUrl);
	}, [imageFile]);

	const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0] ?? null;
		if (!file) {
			setImageFile(null);
			setImageError("");
			return;
		}
		if (!file.type.startsWith("image/")) {
			setImageFile(null);
			setImageError("Please choose an image file.");
			event.target.value = "";
			return;
		}
		if (file.size > MAX_IMAGE_BYTES) {
			setImageFile(null);
			setImageError("That image is too large — please choose one under 8MB.");
			event.target.value = "";
			return;
		}
		setImageError("");
		setImageFile(file);
	};

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const form = event.currentTarget;
		if (!form.checkValidity()) {
			form.reportValidity();
			return;
		}

		setIsSubmitting(true);
		setFormNote("");

		let imageUrl: string | null = null;
		if (imageFile) {
			try {
				const uploadData = new FormData();
				uploadData.set("image", imageFile);
				const response = await fetch("/api/upload", { method: "POST", body: uploadData });
				if (!response.ok) throw new Error("Upload failed");
				const result = (await response.json()) as { url: string };
				imageUrl = result.url;
			} catch {
				setIsSubmitting(false);
				setFormNote("Couldn't upload your image — please try again, or send the order without it.");
				return;
			}
		}

		const formData = new FormData(form);
		const subject = "MNH Creations — Custom Request";
		const body = [
			`Name: ${formData.get("name")}`,
			`Email: ${formData.get("email")}`,
			"",
			"Details:",
			(formData.get("message") as string) || "(none provided)",
			...(imageUrl ? ["", `Reference image: ${imageUrl}`] : []),
		].join("\n");

		window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
		setIsSubmitting(false);
		setFormNote("Opening your email app to send this order request...");
	};

	return (
		<div className="bg-[#FFF7EC] text-[#4A3728]">
			{/*
				Branded background watermark: fixed to the viewport (not the hero
				section) so it stays put while the page scrolls, instead of
				scrolling away with the hero content. Deliberately `position: fixed`
				rather than `background-attachment: fixed`, which is unreliable on
				iOS Safari. Placed before <header> (a sibling, not a descendant) so
				the header's `backdrop-blur` can never make it that element's
				containing block, and outside any `overflow-hidden` ancestor so it
				isn't clipped. `pointer-events-none` + z-0 keep it inert and behind
				every interactive element; `html,body { overflow-x: hidden }`
				(app.css) keeps its off-screen portion from causing horizontal
				scroll on any viewport size.
			*/}
			<div
				aria-hidden="true"
				className="pointer-events-none fixed -top-28 -right-28 z-0 h-[420px] w-[420px] overflow-hidden rounded-full sm:-top-32 sm:-right-36 sm:h-[480px] sm:w-[480px] lg:h-[560px] lg:w-[560px]"
				style={{ background: "radial-gradient(circle at 30% 30%, #F4E9D8, #C9713D 140%)" }}
			>
				<img
					src="/logo.PNG"
					alt=""
					className="absolute inset-0 m-auto h-[62%] w-[62%] object-contain opacity-[0.16] mix-blend-luminosity"
					style={{ filter: "grayscale(85%) brightness(0.5) contrast(0.85)" }}
				/>
			</div>

			<SiteHeader />

			<main id="top">
				<section className="relative overflow-hidden py-20">
					<div className="relative z-10 mx-auto max-w-[1100px] px-6">
						<div className="max-w-[640px]">
							<img
								src="/logo.PNG"
								alt="MNH Creations — imagine. create. love."
								width={200}
								height={200}
								className="mb-3 h-[200px] w-[200px] object-contain"
							/>
							<p className="mb-2.5 text-xs font-extrabold tracking-[2px] text-[#8A9A5B] uppercase">
								Custom Creations &bull; Personalized Gifts &bull; Handmade Designs
							</p>
							<h1 className="font-[family-name:var(--font-head)] text-[clamp(2.1rem,4vw,3rem)] leading-[1.15] font-semibold text-[#4A3728]">
								Custom Creations, Made With Love
							</h1>
							<p className="mt-3 max-w-[520px] text-[1.05rem] text-[#7A5C46]">
								One-of-a-kind shirts and tumblers, personalized just for you. Pick a category below and
								build your design — we&apos;ll bring it to life.
							</p>
							<div className="mt-6 flex flex-wrap gap-3.5">
								<a
									href="#products"
									className="rounded-full bg-[#C9713D] px-6 py-3 text-sm font-extrabold text-white transition hover:-translate-y-px hover:bg-[#A85B2E]"
								>
									Shop Categories
								</a>
								<a
									href={`mailto:${CONTACT_EMAIL}`}
									className="rounded-full border-2 border-[#C9713D] px-6 py-3 text-sm font-extrabold text-[#A85B2E] transition hover:bg-[#C9713D] hover:text-white"
								>
									Contact Us
								</a>
							</div>
						</div>
					</div>
				</section>

				<section id="products" className="scroll-mt-20 py-16">
					<div className="mx-auto max-w-[1100px] px-6">
						<h2 className="text-center font-[family-name:var(--font-head)] text-[clamp(1.7rem,3vw,2.2rem)] font-semibold">
							Shop by Category
						</h2>
						<p className="mx-auto mt-2 mb-10 max-w-[560px] text-center text-[#7A5C46]">
							Every item is made to order and reviewed by MNH Creations before production.
						</p>

						<div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-7">
							{PRODUCT_CATEGORIES.map((category) => (
								<a
									key={category.id}
									href={category.href}
									className="flex flex-col items-start rounded-[20px] border-2 border-[#C9713D] bg-white p-7 shadow-[0_10px_30px_rgba(74,55,40,0.10)] transition hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(74,55,40,0.16)]"
								>
									<div className="mb-3.5 self-center">{category.icon}</div>
									<h3 className="self-center font-[family-name:var(--font-head)] text-[1.35rem] font-semibold">{category.label}</h3>
									<p className="mt-1.5 min-h-[42px] text-[0.95rem] text-[#7A5C46]">{category.description}</p>
									<p className="mt-3 font-bold">
										Starting at <span className="font-[family-name:var(--font-head)] text-[1.1rem] text-[#A85B2E]">{formatCents(category.startingAtCents)}</span>
									</p>
									<span className="mt-4 w-full rounded-full bg-[#C9713D] px-6 py-3 text-center text-sm font-extrabold text-white">
										Start Customizing
									</span>
								</a>
							))}
						</div>

						<p className="mt-10 text-center text-[#7A5C46]">
							Need something different?{" "}
							<a href={`mailto:${CONTACT_EMAIL}`} className="font-extrabold text-[#A85B2E] underline">
								Contact MNH Creations
							</a>{" "}
							for unusual requests.
						</p>
					</div>
				</section>

				<section id="how-it-works" className="scroll-mt-20 bg-[#F4E9D8] py-16">
					<div className="mx-auto max-w-[1100px] px-6">
						<h2 className="text-center font-[family-name:var(--font-head)] text-[clamp(1.7rem,3vw,2.2rem)] font-semibold">
							How It Works
						</h2>
						<ol className="mt-8 grid list-none grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-7 p-0 text-center">
							{steps.map((step, index) => (
								<li key={step.title}>
									<span className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#8A9A5B] font-[family-name:var(--font-head)] font-semibold text-white">
										{index + 1}
									</span>
									<h3 className="text-[1.05rem] font-semibold">{step.title}</h3>
									<p className="text-[0.92rem] text-[#7A5C46]">{step.body}</p>
								</li>
							))}
						</ol>
					</div>
				</section>

				<section id="contact" className="scroll-mt-20 py-16 pb-24">
					<div className="mx-auto grid max-w-[1100px] grid-cols-1 gap-12 px-6 md:grid-cols-[1fr_1.3fr]">
						<div>
							<h2 className="font-[family-name:var(--font-head)] text-[clamp(1.7rem,3vw,2.2rem)] font-semibold">
								Need Something Different?
							</h2>
							<p className="text-[#7A5C46]">
								Most orders go through our T-Shirt and Tumbler configurators above, with pricing and your
								cart built in. For anything unusual — a different product, a bulk order, or a custom
								request — tell us about it here and we&apos;ll reach out.
							</p>
							<p className="text-[#7A5C46]">
								Prefer to email directly?{" "}
								<a href={`mailto:${CONTACT_EMAIL}`} className="font-extrabold text-[#A85B2E]">
									{CONTACT_EMAIL}
								</a>
							</p>
						</div>

						<form
							onSubmit={handleSubmit}
							className="rounded-[20px] bg-white p-7 shadow-[0_10px_30px_rgba(74,55,40,0.10)]"
						>
							<div className="mb-4 flex flex-col gap-1.5">
								<label htmlFor="name" className="text-sm font-bold">Name</label>
								<input
									type="text"
									id="name"
									name="name"
									required
									autoComplete="name"
									className="rounded-[14px] border-[1.5px] border-[#F4E9D8] bg-[#FFF7EC] px-3 py-2.5 text-[0.95rem] focus:outline-2 focus:outline-[#C9713D] focus:outline-offset-1"
								/>
							</div>

							<div className="mb-4 flex flex-col gap-1.5">
								<label htmlFor="email" className="text-sm font-bold">Email</label>
								<input
									type="email"
									id="email"
									name="email"
									required
									autoComplete="email"
									className="rounded-[14px] border-[1.5px] border-[#F4E9D8] bg-[#FFF7EC] px-3 py-2.5 text-[0.95rem] focus:outline-2 focus:outline-[#C9713D] focus:outline-offset-1"
								/>
							</div>

							<div className="mb-4 flex flex-col gap-1.5">
								<label htmlFor="message" className="text-sm font-bold">Tell us what you have in mind</label>
								<textarea
									id="message"
									name="message"
									rows={4}
									className="rounded-[14px] border-[1.5px] border-[#F4E9D8] bg-[#FFF7EC] px-3 py-2.5 text-[0.95rem] focus:outline-2 focus:outline-[#C9713D] focus:outline-offset-1"
								/>
							</div>

							<div className="mb-4 flex flex-col gap-1.5">
								<label htmlFor="image" className="text-sm font-bold">Reference image (optional)</label>
								<input
									type="file"
									id="image"
									name="image"
									accept="image/*"
									onChange={handleImageChange}
									className="rounded-[14px] border-[1.5px] border-[#F4E9D8] bg-[#FFF7EC] px-3 py-2.5 text-[0.85rem] file:mr-3 file:rounded-full file:border-0 file:bg-[#C9713D] file:px-3 file:py-1.5 file:text-sm file:font-bold file:text-white"
								/>
								<p className="text-[0.8rem] text-[#7A5C46]">A photo, design idea, or inspiration pic — up to 8MB.</p>
								{imagePreviewUrl && (
									<img
										src={imagePreviewUrl}
										alt="Selected reference"
										className="mt-1 h-24 w-24 rounded-[14px] object-cover"
									/>
								)}
								{imageError && <p className="text-[0.8rem] font-bold text-[#C9528C]">{imageError}</p>}
							</div>

							<button
								type="submit"
								disabled={isSubmitting}
								className="rounded-full bg-[#C9713D] px-6 py-3 text-sm font-extrabold text-white transition hover:bg-[#A85B2E] disabled:cursor-not-allowed disabled:opacity-60"
							>
								{isSubmitting ? "Sending..." : "Send Request"}
							</button>
							<p role="status" className="mt-3 min-h-[1.2em] text-[0.88rem] text-[#8A9A5B]">
								{formNote}
							</p>
						</form>
					</div>
				</section>
			</main>

			<section className="bg-[#F4E9D8] px-6 py-12 text-center text-[#4A3728]">
				<h2 className="text-3xl font-bold">Something special for your first order.</h2>
				<p className="mx-auto my-4 max-w-xl">Join the MNH Creations mailing list for new designs, shop news, and 15% off your first order when you confirm your email.</p>
				<a href="/mailing-list" className="inline-block rounded-full bg-[#C9713D] px-7 py-3 font-bold text-white">Join & get 15% off</a>
			</section>
			<footer className="bg-[#4A3728] py-6 text-[#F4E9D8]">
				<div className="mx-auto flex max-w-[1100px] flex-wrap items-center justify-between gap-1.5 px-6 text-sm">
					<div>
						<p>&copy; {new Date().getFullYear()} MNH Creations. All rights reserved.</p>
						<p className="text-[#F4E9D8]/65">Prices listed do not include shipping &amp; handling.</p>
					</div>
					<p className="text-[#F4E9D8]/85 italic">
						imagine. create. love. &mdash;{" "}
						<a href={`mailto:${CONTACT_EMAIL}`} className="text-[#F4E9D8]">{CONTACT_EMAIL}</a>
					</p>
				</div>
			</footer>
		</div>
	);
}
