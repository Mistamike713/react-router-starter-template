// ============================================================================
// Temporary pre-launch landing experience, rendered by home.tsx in place of
// the full storefront homepage while LAUNCH_MODE is enabled (see
// app/lib/launchMode.server.ts). Deliberately minimal — a launch
// announcement, not another full homepage — and renders inside the SAME
// outer wrapper/background watermark as the real homepage (see home.tsx),
// so the branded background/logo treatment is pixel-identical either way.
// ============================================================================

import { Link } from "react-router";

const CONTACT_EMAIL = "info@mnhcreations.com";

export function LaunchLandingPage() {
	return (
		<div className="relative z-10 mx-auto flex min-h-[calc(100dvh-2rem)] max-w-[720px] flex-col items-center justify-center px-6 py-20 text-center">
			<p className="mb-3 text-xs font-extrabold tracking-[2px] text-[#8A9A5B] uppercase">MNH Creations</p>

			<h1 className="font-[family-name:var(--font-head)] text-[clamp(2rem,6vw,3.2rem)] leading-[1.15] font-semibold text-[#4A3728]">
				MNH Creations launches October 1st!
			</h1>

			<p className="mt-4 max-w-[520px] text-[1.15rem] font-bold text-[#7A5C46]">
				Join our mailing list and get 15% off your first order.
			</p>

			<p className="mt-2 max-w-[440px] text-[0.95rem] text-[#7A5C46]">
				Something special is coming. Custom creations, made just for you.
			</p>

			<Link
				to="/mailing-list"
				className="mt-8 w-full max-w-[360px] rounded-full bg-[#C9713D] px-8 py-4 text-base font-extrabold tracking-wide text-white uppercase transition hover:-translate-y-px hover:bg-[#A85B2E]"
			>
				Join the Mailing List
			</Link>

			<p className="mt-4 text-[0.85rem] text-[#7A5C46]">Already joined? We&apos;ll see you October 1st.</p>

			<p className="mt-16 text-[0.8rem] text-[#7A5C46]/80">
				&copy; {new Date().getFullYear()} MNH Creations &mdash;{" "}
				<a href={`mailto:${CONTACT_EMAIL}`} className="underline">
					{CONTACT_EMAIL}
				</a>
			</p>
		</div>
	);
}
