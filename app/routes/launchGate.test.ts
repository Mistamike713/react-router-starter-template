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
		const body = await response.json();
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
});
