// Separate from vite.config.ts deliberately — the Cloudflare Workers plugin
// there targets the "ssr" Vite environment and isn't meant to run under a
// plain Node test runner. Tests only need the ~/* path alias.
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
	plugins: [tsconfigPaths()],
	test: {
		environment: "node",
	},
});
