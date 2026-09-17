import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
	index("routes/home.tsx"),
	route("shirt-configurator", "routes/shirt-configurator.tsx"),
	route("tumbler-configurator", "routes/tumbler-configurator.tsx"),
	route("api/upload", "routes/api.upload.ts"),
	route("api/artwork-upload", "routes/api.artwork-upload.ts"),
	route("api/orders", "routes/api.orders.ts"),
	route("api/checkout", "routes/api.checkout.ts"),
	route("api/stripe/webhook", "routes/api.stripe.webhook.ts"),
	route("checkout/success", "routes/checkout.success.tsx"),
	route("uploads/:key", "routes/uploads.$key.ts"),
] satisfies RouteConfig;
