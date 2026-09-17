import type { ReactNode } from "react";

type StepShellProps = {
	index: number;
	title: string;
	isActive: boolean;
	isComplete: boolean;
	isReachable: boolean;
	summary: string;
	onHeaderClick: () => void;
	children: ReactNode;
};

/** One accordion step: collapsed steps show a one-line summary, only the active step renders its panel. */
export function StepShell({ index, title, isActive, isComplete, isReachable, summary, onHeaderClick, children }: StepShellProps) {
	return (
		<section className={`mb-3.5 overflow-hidden rounded-[20px] bg-white shadow-[0_10px_30px_rgba(74,55,40,0.10)] ${!isReachable ? "opacity-50" : ""}`}>
			<button
				type="button"
				disabled={!isReachable}
				onClick={onHeaderClick}
				className="flex w-full items-center gap-3 px-4.5 py-4 text-left disabled:cursor-not-allowed"
			>
				<span
					className={`flex h-7.5 w-7.5 flex-none items-center justify-center rounded-full font-[family-name:var(--font-head)] font-bold ${
						isComplete ? "bg-[#8A9A5B] text-white" : "bg-[#F4E9D8] text-[#4A3728]"
					}`}
				>
					{isComplete ? "✓" : index + 1}
				</span>
				<span className="flex min-w-0 flex-1 flex-col gap-0.5">
					<span className="font-extrabold">{title}</span>
					{!isActive && <span className="truncate text-sm text-[#7A5C46]">{summary}</span>}
				</span>
				<span className="text-[#7A5C46]" aria-hidden="true">
					{isActive ? "▴" : "▾"}
				</span>
			</button>
			{isActive && <div className="flex flex-col gap-3.5 px-4.5 pb-5">{children}</div>}
		</section>
	);
}

export function FieldError({ message }: { message?: string }) {
	if (!message) return null;
	return (
		<p role="alert" className="text-sm text-[#a33]">
			{message}
		</p>
	);
}

export function ContinueButton({ onClick, label = "Continue" }: { onClick: () => void; label?: string }) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="self-start rounded-full bg-[#C9713D] px-6 py-2.5 text-sm font-extrabold text-white transition hover:bg-[#A85B2E]"
		>
			{label}
		</button>
	);
}

export function Hint({ children }: { children: ReactNode }) {
	return <p className="text-sm text-[#7A5C46] italic">{children}</p>;
}

export function Chip({
	selected,
	disabled,
	onClick,
	children,
}: {
	selected: boolean;
	disabled?: boolean;
	onClick: () => void;
	children: ReactNode;
}) {
	return (
		<button
			type="button"
			disabled={disabled}
			onClick={onClick}
			className={`rounded-[14px] border-[1.5px] px-3.5 py-2.5 text-left text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-55 ${
				selected ? "border-[#C9713D] bg-[#C9713D] text-white" : "border-[#F4E9D8] bg-[#FFF7EC] text-[#4A3728]"
			}`}
		>
			{children}
		</button>
	);
}

export function CheckboxRow({
	checked,
	onChange,
	children,
	emphasized,
}: {
	checked: boolean;
	onChange: (checked: boolean) => void;
	children: ReactNode;
	emphasized?: boolean;
}) {
	return (
		<label className={`flex items-start gap-2.5 text-sm ${emphasized ? "rounded-[14px] bg-[#C9713D]/10 p-3" : ""}`}>
			<input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5" />
			<span>{children}</span>
		</label>
	);
}
