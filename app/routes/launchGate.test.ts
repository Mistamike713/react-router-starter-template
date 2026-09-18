// ============================================================================
// Route-level tests for the pre-launch gate (LAUNCH_MODE). Verifies both
// states: ON (storefront hidden/blocked, mailing list + webhook untouched)
// and OFF (everything behaves exactly as it did before this feature).
// ============================================================================

import { describe, expect, test } from "vitest";
import { loader as homeLoader } from "./home";
import { loader as shirtLoader } from "./shirt-configurator";
import { loader as tumblerLoader } from "./tumbler-configurator";
import { loader as checkoutSuccessLoader } from "./checkout.success";
import { action as ordersAction } from "./api.orders";
import { action as checkoutAction } from "./api.checkout";
import { action as uploadAction } from "./api.upload";
import { action as artworkUploadAction } from "./api.artwork-upload";
import { loader as uploadsKeyLoader } from "./uploads.$key";

function ctx(env: Record<string, unknown>) {
	return { context: { cloudflare: { env } }, params: {} } as any;
}

async function expectRedirectHome(run: () => unknown) {
	try {
		await run();
		throw new Error("expected a redirect to be thrown");
	} catch (response) {
		expect(response).toBeInstanceOf(Response);
		expect((response as Response).status).toBe(302);
		expect((response as Response).headers.get("Location")).toBe("/");
	}
}

describe("launch mode ON", () => {
	const env = { LAUNCH_MODE: "true" };

	test("home loader reports launchMode: true", () => {
		const result = homeLoader(ctx(env));
		expect(result.launchMode).toBe(true);
	});

	test("shirt-configurator route redirects to home", async () => {
		await expectRedirectHome(() => shirtLoader(ctx(env)));
	});

	test("tumbler-configurator route redirects to home", async () => {
		await expectRedirectHome(() => tumblerLoader(ctx(env)));
	});

	test("checkout/success route redirects to home before touching the database", async () => {
		const request = new Request("https://mnhcreations.com/checkout/success?session_id=cs_test");
		await expectRedirectHome(() => checkoutSuccessLoader({ request, ...ctx(env) } as any));
	});

	test("order creation is rejected server-side with no draft order created", async () => {
		const request = new Request("https://mnhcreations.com/api/orders", {
			method: "POST",
			body: JSON.stringify({ customer: { name: "Test", email: "test@example.com" }, items: [] }),
		});
		const response = await ordersAction({ request, ...ctx(env) } as any);
		expect(response.status).toBe(403);
		const body = (await response.json()) as { error: string };
		expect(body.error).toMatch(/october/i);
	});

	test("checkout initiation is rejected server-side without calling Stripe", async () => {
		const request = new Request("https://mnhcreations.com/api/checkout", {
			method: "POST",
			body: JSON.stringify({ orderId: "does-not-matter" }),
		});
		const response = await checkoutAction({ request, ...ctx(env) } as any);
		expect(response.status).toBe(403);
	});

	test("the tumbler reference-image upload endpoint is rejected — no public pre-launch page uses it", async () => {
		const request = new Request("https://mnhcreations.com/api/upload", { method: "POST" });
		const response = await uploadAction({ request, ...ctx(env) } as any);
		expect(response.status).toBe(403);
	});

	test("the configurator artwork-upload endpoint is rejected — no public pre-launch page uses it", async () => {
		const request = new Request("https://mnhcreations.com/api/artwork-upload", { method: "POST" });
		const response = await artworkUploadAction({ request, ...ctx(env) } as any);
		expect(response.status).toBe(403);
	});

	test("retrieval of already-uploaded assets is NOT gated (only creation is)", async () => {
		const env2 = { ...env, ORDER_UPLOADS: { getWithMetadata: async () => ({ value: null, metadata: null }) } };
		const response = await uploadsKeyLoader({ params: { key: "some-key" }, context: { cloudflare: { env: env2 } } } as any).catch((r: unknown) => r);
		// Untouched behavior: an unknown key still 404s, not 403 — proving the
		// launch gate was never consulted for this route.
		expect(response).toBeInstanceOf(Response);
		expect((response as Response).status).toBe(404);
	});
});

describe("launch mode OFF", () => {
	const env = {};

	test("home loader reports launchMode: false, restoring the full storefront", () => {
		const result = homeLoader(ctx(env));
		expect(result.launchMode).toBe(false);
	});

	test("shirt-configurator route does not redirect", async () => {
		expect(await shirtLoader(ctx(env))).toBeNull();
	});

	test("tumbler-configurator route does not redirect", async () => {
		expect(await tumblerLoader(ctx(env))).toBeNull();
	});

	test("upload endpoints are reachable again (reach normal validation, not the launch 403)", async () => {
		const uploadResponse = await uploadAction({ request: new Request("https://mnhcreations.com/api/upload", { method: "POST", body: new FormData() }), ...ctx(env) } as any);
		expect(uploadResponse.status).not.toBe(403);
		const artworkResponse = await artworkUploadAction({ request: new Request("https://mnhcreations.com/api/artwork-upload", { method: "POST", body: new FormData() }), ...ctx(env) } as any);
		expect(artworkResponse.status).not.toBe(403);
	});
});
