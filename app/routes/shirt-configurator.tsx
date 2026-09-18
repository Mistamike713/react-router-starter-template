import { redirect, useSearchParams } from "react-router";
import { SiteHeader } from "~/components/layout/SiteHeader";
import { ShirtConfigurator } from "~/components/configurator/ShirtConfigurator";
import { isLaunchModeEnabled } from "~/lib/launchMode.server";
import type { Route } from "./+types/shirt-configurator";

const CONTACT_EMAIL = "info@mnhcreations.com";

export function loader({ context }: Route.LoaderArgs) {
	if (isLaunchModeEnabled(context.cloudflare.env)) throw redirect("/");
	return null;
}

export default function ShirtConfiguratorPage() {
	const [searchParams] = useSearchParams();
	const editItemId = searchParams.get("editId");

	return (
		<div className="bg-[#FFF7EC] text-[#4A3728]">
			<SiteHeader />

			<main className="py-10">
				<div className="mx-auto max-w-[1100px] px-6">
					<p className="mb-1.5 text-xs font-extrabold tracking-[2px] text-[#8A9A5B] uppercase">Custom Apparel</p>
					<h1 className="font-[family-name:var(--font-head)] text-[clamp(1.7rem,4vw,2.4rem)] font-semibold">
						Build Your Custom HTV / Sublimation Shirt
					</h1>
					<p className="mt-2 mb-8 max-w-[640px] text-[#7A5C46]">
						Pick your garment, size, color, and design below. Your price updates as you go. All custom production is
						subject to MNH Creations review before printing.
					</p>

					<ShirtConfigurator editItemId={editItemId} />
				</div>
			</main>

			<footer className="mt-10 bg-[#4A3728] py-6 text-[#F4E9D8]">
				<div className="mx-auto flex max-w-[1100px] flex-wrap items-center justify-between gap-1.5 px-6 text-sm">
					<div>
						<p>&copy; {new Date().getFullYear()} MNH Creations. All rights reserved.</p>
						<p className="text-[#F4E9D8]/65">Custom apparel orders are reviewed by MNH Creations before production.</p>
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
