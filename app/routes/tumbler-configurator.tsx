import { useSearchParams } from "react-router";
import { CartWidget } from "~/components/cart/CartWidget";
import { TumblerConfigurator } from "~/components/tumbler/TumblerConfigurator";

const CONTACT_EMAIL = "info@mnhcreations.com";

export default function TumblerConfiguratorPage() {
	const [searchParams] = useSearchParams();
	const editItemId = searchParams.get("editId");
	const initialProductId = searchParams.get("productId");

	return (
		<div className="bg-[#FFF7EC] text-[#4A3728]">
			<header className="sticky top-0 z-20 border-b border-[#4A3728]/10 bg-[#FFF7EC]/90 backdrop-blur">
				<div className="mx-auto flex max-w-[1100px] flex-wrap items-center justify-between gap-y-2 px-6 py-3">
					<a href="/#top" className="flex items-center gap-2.5">
						<img src="/logo.PNG" alt="MNH Creations logo" width={44} height={44} className="h-11 w-11 object-contain" />
						<span className="font-[family-name:var(--font-head)] text-lg font-semibold">MNH Creations</span>
					</a>
					<nav aria-label="Primary" className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm font-bold text-[#7A5C46] sm:gap-x-6">
						<a href="/#products" className="hover:text-[#A85B2E]">Tumblers</a>
						<a href="/shirt-configurator" className="hover:text-[#A85B2E]">Custom Shirts</a>
						<a href="/#contact" className="hover:text-[#A85B2E]">Contact</a>
						<CartWidget />
					</nav>
				</div>
			</header>

			<main className="py-10">
				<div className="mx-auto max-w-[1100px] px-6">
					<p className="mb-1.5 text-xs font-extrabold tracking-[2px] text-[#8A9A5B] uppercase">Custom Tumblers</p>
					<h1 className="font-[family-name:var(--font-head)] text-[clamp(1.7rem,4vw,2.4rem)] font-semibold">
						Build Your Custom Tumbler
					</h1>
					<p className="mt-2 mb-8 max-w-[640px] text-[#7A5C46]">
						Pick your tumbler and finish, add your design, and preview the wrap below. Your price updates as you go.
						All custom production is subject to MNH Creations review before printing.
					</p>

					<TumblerConfigurator editItemId={editItemId} initialProductId={initialProductId} />
				</div>
			</main>

			<footer className="mt-10 bg-[#4A3728] py-6 text-[#F4E9D8]">
				<div className="mx-auto flex max-w-[1100px] flex-wrap items-center justify-between gap-1.5 px-6 text-sm">
					<div>
						<p>&copy; {new Date().getFullYear()} MNH Creations. All rights reserved.</p>
						<p className="text-[#F4E9D8]/65">Custom tumbler orders are reviewed by MNH Creations before production.</p>
					</div>
					<p className="text-[#F4E9D8]/85 italic">
						imagine. create. love. &mdash;{" "}
						<a href={`mailto:${CONTACT_EMAIL}`} className="text-[#F4E9D8]">
							{CONTACT_EMAIL}
						</a>
					</p>
				</div>
			</footer>
		</div>
	);
}
