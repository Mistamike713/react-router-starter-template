import type { Route } from "./+types/uploads.$key";

export async function loader({ params, context }: Route.LoaderArgs) {
	const { value, metadata } = await context.cloudflare.env.ORDER_UPLOADS.getWithMetadata(
		params.key,
		"arrayBuffer",
	);

	if (!value) {
		throw new Response("Not found", { status: 404 });
	}

	const contentType = (metadata as { contentType?: string } | null)?.contentType ?? "application/octet-stream";

	return new Response(value, {
		headers: {
			"Content-Type": contentType,
			"Cache-Control": "private, max-age=31536000, immutable",
		},
	});
}
