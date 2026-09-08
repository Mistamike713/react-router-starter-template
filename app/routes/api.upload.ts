import type { Route } from "./+types/api.upload";

const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8MB
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif"]);
const RETENTION_SECONDS = 60 * 60 * 24 * 90; // 90 days

export async function action({ request, context }: Route.ActionArgs) {
	if (request.method !== "POST") {
		return Response.json({ error: "Method not allowed" }, { status: 405 });
	}

	const formData = await request.formData();
	const file = formData.get("image");

	if (!(file instanceof File)) {
		return Response.json({ error: "No image file provided" }, { status: 400 });
	}

	if (!ALLOWED_TYPES.has(file.type)) {
		return Response.json({ error: "Unsupported file type" }, { status: 415 });
	}

	if (file.size > MAX_FILE_BYTES) {
		return Response.json({ error: "File is too large (max 8MB)" }, { status: 413 });
	}

	const key = crypto.randomUUID();
	const bytes = await file.arrayBuffer();

	await context.cloudflare.env.ORDER_UPLOADS.put(key, bytes, {
		expirationTtl: RETENTION_SECONDS,
		metadata: { contentType: file.type, originalName: file.name },
	});

	const url = new URL(`/uploads/${key}`, request.url).toString();
	return Response.json({ url });
}
