import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
	index("routes/home.tsx"),
	route("shirt-configurator", "routes/shirt-configurator.tsx"),
	route("tumbler-configurator", "routes/tumbler-configurator.tsx"),
	route("api/upload", "routes/api.upload.ts"),
	route("api/artwork-upload", "routes/api.artwork-upload.ts"),
	route("uploads/:key", "routes/uploads.$key.ts"),
] satisfies RouteConfig;
