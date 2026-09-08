import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
	index("routes/home.tsx"),
	route("api/upload", "routes/api.upload.ts"),
	route("uploads/:key", "routes/uploads.$key.ts"),
] satisfies RouteConfig;
