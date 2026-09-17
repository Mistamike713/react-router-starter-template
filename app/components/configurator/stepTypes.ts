import type { ShirtConfiguratorState } from "~/lib/apparel/types";

export type StepProps = {
	state: ShirtConfiguratorState;
	patch: (partial: Partial<ShirtConfiguratorState>) => void;
	setState: (updater: (prev: ShirtConfiguratorState) => ShirtConfiguratorState) => void;
	errors: Record<string, string>;
	onContinue: () => void;
};
