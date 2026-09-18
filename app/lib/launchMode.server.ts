// ============================================================================
// Centralized pre-launch gate. ONE flag controls whether the public
// storefront is available: the LAUNCH_MODE environment variable (set in
// wrangler.json `vars`, same pattern as MAILING_ENABLED). While enabled,
// storefront routes redirect to the launch landing page and order/checkout
// creation is rejected server-side — see home.tsx, shirt-configurator.tsx,
// tumbler-configurator.tsx, checkout.success.tsx, api.orders.ts, and
// api.checkout.ts, each of which import isLaunchModeEnabled from here.
//
// To restore the full storefront: set LAUNCH_MODE to "false" (or remove it)
// in wrangler.json and deploy via the normal production pipeline. No other
// code changes are required.
// ============================================================================

export type LaunchModeEnv = { LAUNCH_MODE?: string };

export function isLaunchModeEnabled(env: LaunchModeEnv): boolean {
	return env.LAUNCH_MODE === "true";
}
