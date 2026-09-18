import { describe, expect, test } from "vitest";
import { isLaunchModeEnabled } from "./launchMode.server";

describe("isLaunchModeEnabled", () => {
	test("is enabled only when LAUNCH_MODE is exactly the string 'true'", () => {
		expect(isLaunchModeEnabled({ LAUNCH_MODE: "true" })).toBe(true);
	});

	test("defaults to disabled (restores the storefront) when unset", () => {
		expect(isLaunchModeEnabled({})).toBe(false);
	});

	test("treats any other value as disabled, never fails open", () => {
		expect(isLaunchModeEnabled({ LAUNCH_MODE: "false" })).toBe(false);
		expect(isLaunchModeEnabled({ LAUNCH_MODE: "1" })).toBe(false);
		expect(isLaunchModeEnabled({ LAUNCH_MODE: "" })).toBe(false);
	});
});
