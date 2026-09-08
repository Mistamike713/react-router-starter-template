import { useEffect, useState } from "react";

const CONTACT_EMAIL = "info@mnhcreations.com";
const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB, matches the server-side limit

type ProductOption = {
	label: string;
	price: number;
};

type Product = {
	id: string;
	name: string;
	description: string;
	options: ProductOption[];
	icon: React.ReactNode;
};

const products: Product[] = [
	{
		id: "16oz-snow-globe",
		name: "16oz — Snow Globe",
		description: "Plastic tumbler with a sealed snow-globe-style design.",
		options: [{ label: "Snow globe style", price: 20 }],
		icon: (
			<svg viewBox="0 0 64 96" width="56" height="84" aria-hidden="true">
				<rect x="10" y="14" width="44" height="74" rx="10" fill="#F4E3C7" stroke="#B9743B" strokeWidth="3" />
				<rect x="18" y="4" width="28" height="14" rx="4" fill="#B9743B" />
				<circle cx="32" cy="46" r="14" fill="#DCEFF2" stroke="#7FB3BF" strokeWidth="2" />
				<circle cx="26" cy="42" r="1.6" fill="#ffffff" />
				<circle cx="36" cy="50" r="1.4" fill="#ffffff" />
				<circle cx="31" cy="52" r="1.2" fill="#ffffff" />
				<circle cx="38" cy="40" r="1.1" fill="#ffffff" />
			</svg>
		),
	},
	{
		id: "20oz-glow-sublimation",
		name: "20oz — Glow / Sublimation",
		description: "Choose glow-in-the-dark or a white base ready for full-wrap sublimation art.",
		options: [
			{ label: "Glow in the dark", price: 30 },
			{ label: "Base white / sublimation", price: 25 },
		],
		icon: (
			<svg viewBox="0 0 64 96" width="56" height="84" aria-hidden="true">
				<rect x="8" y="12" width="48" height="78" rx="10" fill="#2B2138" stroke="#6C4A9B" strokeWidth="3" />
				<rect x="16" y="2" width="32" height="14" rx="4" fill="#6C4A9B" />
				<circle cx="22" cy="38" r="2" fill="#B98CE8" />
				<circle cx="40" cy="30" r="1.5" fill="#7FE8D0" />
				<circle cx="34" cy="55" r="1.7" fill="#F2E28B" />
				<circle cx="46" cy="62" r="1.3" fill="#B98CE8" />
				<circle cx="26" cy="70" r="1.4" fill="#7FE8D0" />
			</svg>
		),
	},
	{
		id: "25oz-glitter",
		name: "25oz — Glitter",
		description: "Full glitter tumbler for maximum sparkle.",
		options: [{ label: "Glitter style", price: 35 }],
		icon: (
			<svg viewBox="0 0 64 96" width="56" height="84" aria-hidden="true">
				<rect x="6" y="10" width="52" height="80" rx="10" fill="#F7E9EF" stroke="#C9528C" strokeWidth="3" />
				<rect x="14" y="0" width="36" height="14" rx="4" fill="#C9528C" />
				<circle cx="20" cy="34" r="1.4" fill="#F4C542" />
				<circle cx="30" cy="44" r="1.1" fill="#C9528C" />
				<circle cx="42" cy="30" r="1.3" fill="#7FB3BF" />
				<circle cx="24" cy="56" r="1.2" fill="#F4C542" />
				<circle cx="38" cy="60" r="1.5" fill="#C9528C" />
				<circle cx="46" cy="48" r="1.1" fill="#7FB3BF" />
				<circle cx="30" cy="72" r="1.3" fill="#F4C542" />
			</svg>
		),
	},
];

const optionValue = (productName: string, option: ProductOption) =>
	`${productName} — ${option.label} ($${option.price})`;

const steps = [
	{
		title: "Pick a size & style",
		body: "Choose your tumbler size and finish from the options above.",
	},
	{
		title: "Tell us your idea",
		body: "Send us your colors, names, or design ideas using the contact form.",
	},
	{
		title: "We create & ship",
		body: "We'll confirm your total (including shipping) and get your tumbler made and sent out.",
	},
];

export default function Home() {
	const [selectedOption, setSelectedOption] = useState("");
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

	const handleInquire = (value: string) => {
		setSelectedOption(value);
		document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
		document.getElementById("name")?.focus({ preventScroll: true });
	};

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
		const subject = `Tumbler Order Inquiry — ${formData.get("product")}`;
		const body = [
			`Name: ${formData.get("name")}`,
			`Email: ${formData.get("email")}`,
			`Tumbler: ${formData.get("product")}`,
			`Quantity: ${formData.get("quantity")}`,
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
			<header className="sticky top-0 z-20 border-b border-[#4A3728]/10 bg-[#FFF7EC]/90 backdrop-blur">
				<div className="mx-auto flex max-w-[1100px] items-center justify-between px-6 py-3">
					<a href="#top" className="flex items-center gap-2.5">
						<img src="/logo.PNG" alt="MNH Creations logo" width={44} height={44} className="h-11 w-11 object-contain" />
						<span className="font-[family-name:var(--font-head)] text-lg font-semibold">MNH Creations</span>
					</a>
					<nav aria-label="Primary" className="flex gap-6 text-sm font-bold text-[#7A5C46]">
						<a href="#products" className="hover:text-[#A85B2E]">Products</a>
						<a href="#how-it-works" className="hover:text-[#A85B2E]">How It Works</a>
						<a href="#contact" className="hover:text-[#A85B2E]">Contact</a>
					</nav>
				</div>
			</header>

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
								Custom Tumblers, Made With Love
							</h1>
							<p className="mt-3 max-w-[520px] text-[1.05rem] text-[#7A5C46]">
								One-of-a-kind tumblers, personalized just for you. Pick a style below and
								send us your idea — we&apos;ll bring it to life.
							</p>
							<div className="mt-6 flex flex-wrap gap-3.5">
								<a
									href="#products"
									className="rounded-full bg-[#C9713D] px-6 py-3 text-sm font-extrabold text-white transition hover:-translate-y-px hover:bg-[#A85B2E]"
								>
									See Our Tumblers
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
					<div
						aria-hidden="true"
						className="absolute -top-32 -right-36 h-[480px] w-[480px] rounded-full opacity-50"
						style={{
							background: "radial-gradient(circle at 30% 30%, #F4E9D8, #C9713D 140%)",
						}}
					/>
				</section>

				<section id="products" className="py-16">
					<div className="mx-auto max-w-[1100px] px-6">
						<h2 className="text-center font-[family-name:var(--font-head)] text-[clamp(1.7rem,3vw,2.2rem)] font-semibold">
							Custom Tumblers
						</h2>
						<p className="mx-auto mt-2 mb-10 max-w-[560px] text-center text-[#7A5C46]">
							Every tumbler is made to order. Shipping is calculated separately and added to your total.
						</p>

						<div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-7">
							{products.map((product) => (
								<article
									key={product.id}
									className="flex flex-col items-start rounded-[20px] bg-white p-6 pt-7 shadow-[0_10px_30px_rgba(74,55,40,0.10)]"
								>
									<div className="mb-3 self-center">{product.icon}</div>
									<h3 className="self-center font-[family-name:var(--font-head)] text-[1.2rem] font-semibold">
										{product.name}
									</h3>
									<p className="min-h-[42px] text-[0.92rem] text-[#7A5C46]">{product.description}</p>
									<ul className="mt-2 mb-1 w-full list-none border-t border-[#F4E9D8] p-0">
										{product.options.map((option) => (
											<li
												key={option.label}
												className="flex items-baseline justify-between border-b border-[#F4E9D8] py-2.5 font-bold"
											>
												<span>{option.label}</span>
												<span className="font-[family-name:var(--font-head)] text-[1.05rem] text-[#A85B2E]">
													${option.price}
												</span>
											</li>
										))}
									</ul>
									<p className="mb-4.5 text-[0.8rem] text-[#7A5C46] italic">+ shipping &amp; handling</p>
									<button
										type="button"
										onClick={() =>
											handleInquire(
												product.options.length === 1
													? optionValue(product.name, product.options[0])
													: "",
											)
										}
										className="w-full rounded-full border-2 border-[#C9713D] px-6 py-3 text-center text-sm font-extrabold text-[#A85B2E] transition hover:bg-[#C9713D] hover:text-white"
									>
										Inquire to Order
									</button>
								</article>
							))}
						</div>
					</div>
				</section>

				<section id="how-it-works" className="bg-[#F4E9D8] py-16">
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

				<section id="contact" className="py-16 pb-24">
					<div className="mx-auto grid max-w-[1100px] grid-cols-1 gap-12 px-6 md:grid-cols-[1fr_1.3fr]">
						<div>
							<h2 className="font-[family-name:var(--font-head)] text-[clamp(1.7rem,3vw,2.2rem)] font-semibold">
								Ready to Order?
							</h2>
							<p className="text-[#7A5C46]">
								Fill out the form and let us know which tumbler you&apos;d like and any
								customization details. We&apos;ll reach out to confirm your order and
								shipping cost.
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
								<label htmlFor="product" className="text-sm font-bold">Tumbler</label>
								<select
									id="product"
									name="product"
									required
									value={selectedOption}
									onChange={(event) => setSelectedOption(event.target.value)}
									className="rounded-[14px] border-[1.5px] border-[#F4E9D8] bg-[#FFF7EC] px-3 py-2.5 text-[0.95rem] focus:outline-2 focus:outline-[#C9713D] focus:outline-offset-1"
								>
									<option value="" disabled>Choose a tumbler...</option>
									{products.flatMap((product) =>
										product.options.map((option) => (
											<option key={optionValue(product.name, option)} value={optionValue(product.name, option)}>
												{product.name} ({option.label}) — ${option.price}
											</option>
										)),
									)}
								</select>
							</div>

							<div className="mb-4 flex flex-col gap-1.5">
								<label htmlFor="quantity" className="text-sm font-bold">Quantity</label>
								<input
									type="number"
									id="quantity"
									name="quantity"
									min={1}
									defaultValue={1}
									required
									className="rounded-[14px] border-[1.5px] border-[#F4E9D8] bg-[#FFF7EC] px-3 py-2.5 text-[0.95rem] focus:outline-2 focus:outline-[#C9713D] focus:outline-offset-1"
								/>
							</div>

							<div className="mb-4 flex flex-col gap-1.5">
								<label htmlFor="message" className="text-sm font-bold">Details (colors, names, design ideas)</label>
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
								{isSubmitting ? "Sending..." : "Send Order Inquiry"}
							</button>
							<p role="status" className="mt-3 min-h-[1.2em] text-[0.88rem] text-[#8A9A5B]">
								{formNote}
							</p>
						</form>
					</div>
				</section>
			</main>

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
