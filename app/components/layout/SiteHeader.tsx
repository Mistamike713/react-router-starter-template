// ============================================================================
// Site-wide header/toolbar: MNH branding on the left, a hamburger menu and
// the cart on the right. Used by every page (home, shirt-configurator,
// tumbler-configurator) so navigation stays identical everywhere. Cart is
// always visible (never buried in the menu); secondary nav destinations
// (Shop, How It Works, About/Contact) live in the menu to keep the toolbar
// compact instead of a wide desktop nav bar.
// ============================================================================

import { useEffect, useId, useRef, useState } from "react";
import { CartWidget } from "~/components/cart/CartWidget";

export function SiteHeader() {
	const [menuOpen, setMenuOpen] = useState(false);
	const menuId = useId();
	const menuRef = useRef<HTMLDivElement>(null);
	const buttonRef = useRef<HTMLButtonElement>(null);

	useEffect(() => {
		if (!menuOpen) return;

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				setMenuOpen(false);
				buttonRef.current?.focus();
			}
		};
		const handlePointerDown = (event: MouseEvent) => {
			const target = event.target as Node;
			if (menuRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
			setMenuOpen(false);
		};

		document.addEventListener("keydown", handleKeyDown);
		document.addEventListener("mousedown", handlePointerDown);
		return () => {
			document.removeEventListener("keydown", handleKeyDown);
			document.removeEventListener("mousedown", handlePointerDown);
		};
	}, [menuOpen]);

	return (
		<header className="sticky top-0 z-30 border-b border-[#4A3728]/10 bg-[#FFF7EC]/90 backdrop-blur">
			<div className="mx-auto flex max-w-[1100px] items-center justify-between px-4.5 py-3 sm:px-6">
				<a href="/#top" className="flex items-center gap-2.5 rounded-[10px] focus-visible:outline-2 focus-visible:outline-[#C9713D] focus-visible:outline-offset-2">
					<img src="/logo.PNG" alt="MNH Creations logo" width={40} height={40} className="h-10 w-10 object-contain" />
					<span className="font-[family-name:var(--font-head)] text-lg font-semibold">MNH Creations</span>
				</a>

				<div className="flex items-center gap-2">
					<CartWidget />

					<div className="relative">
						<button
							ref={buttonRef}
							type="button"
							aria-expanded={menuOpen}
							aria-controls={menuId}
							aria-label={menuOpen ? "Close menu" : "Open menu"}
							onClick={() => setMenuOpen((open) => !open)}
							className="inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#C9713D] text-[#A85B2E] transition hover:bg-[#C9713D] hover:text-white focus-visible:outline-2 focus-visible:outline-[#C9713D] focus-visible:outline-offset-2"
						>
							<span aria-hidden="true" className="text-lg leading-none">
								{menuOpen ? "✕" : "☰"}
							</span>
						</button>

						{menuOpen && (
							<div
								id={menuId}
								ref={menuRef}
								role="menu"
								aria-label="Site menu"
								className="absolute top-[calc(100%+0.6rem)] right-0 w-60 rounded-[16px] border border-[#F4E9D8] bg-white p-2 shadow-[0_10px_30px_rgba(74,55,40,0.18)]"
							>
								<p className="px-3 pt-1.5 pb-1 text-[0.7rem] font-extrabold tracking-[1.5px] text-[#8A9A5B] uppercase">Shop</p>
								<MenuLink href="/shirt-configurator" onNavigate={() => setMenuOpen(false)}>
									T-Shirts
								</MenuLink>
								<MenuLink href="/tumbler-configurator" onNavigate={() => setMenuOpen(false)}>
									Tumblers
								</MenuLink>
								<div className="my-1.5 border-t border-[#F4E9D8]" />
								<MenuLink href="/#how-it-works" onNavigate={() => setMenuOpen(false)}>
									How It Works
								</MenuLink>
								<MenuLink href="/#contact" onNavigate={() => setMenuOpen(false)}>
									About / Contact
								</MenuLink>
							</div>
						)}
					</div>
				</div>
			</div>
		</header>
	);
}

function MenuLink({ href, onNavigate, children }: { href: string; onNavigate: () => void; children: React.ReactNode }) {
	return (
		<a
			role="menuitem"
			href={href}
			onClick={onNavigate}
			className="block rounded-[10px] px-3 py-2 text-sm font-bold text-[#4A3728] transition hover:bg-[#F4E9D8] focus-visible:outline-2 focus-visible:outline-[#C9713D] focus-visible:outline-offset-2"
		>
			{children}
		</a>
	);
}
