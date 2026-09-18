// ============================================================================
// Custom-shirt configurator artwork upload.
//
// Deliberately a SEPARATE route from api.upload.ts (the tumbler order's
// reference-image upload), which keeps its exact existing behavior/limits
// untouched. This route reuses the same ORDER_UPLOADS KV binding — same
// backend, same storage — but accepts the broader file types production
// artwork needs (PNG/JPG/SVG/PDF) at a larger size limit, and records
// which side (front/back) and purpose (production artwork vs. inspiration
// reference) the file is for.
//
// Serving uploaded files back reuses the existing generic uploads.$key.ts
// loader unchanged — it already serves any KV entry by key with its stored
// content-type, so no new "read" route was needed here.
// ============================================================================

import type { Route } from "./+types/api.artwork-upload";
import { isLaunchModeEnabled } from "~/lib/launchMode.server";

const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25MB
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/svg+xml", "application/pdf"]);
const ALLOWED_EXTENSIONS = [".png", ".jpg", ".jpeg", ".svg", ".pdf"];
const RETENTION_SECONDS = 60 * 60 * 24 * 90; // 90 days, matches the tumbler upload route

const VALID_KINDS = new Set(["production", "inspiration"]);
const VALID_SIDES = new Set(["front", "back"]);

export async function action({ request, context }: Route.ActionArgs) {
	if (request.method !== "POST") {
		return Response.json({ error: "Method not allowed" }, { status: 405 });
	}

	// No publicly accessible pre-launch page uses this — only the (already
	// redirected while LAUNCH_MODE is on) shirt/tumbler configurators do.
	if (isLaunchModeEnabled(context.cloudflare.env)) {
		return Response.json({ error: "MNH Creations launches October 1. Join the mailing list for 15% off your first order." }, { status: 403 });
	}

	const formData = await request.formData();
	const file = formData.get("file");
	const kindRaw = formData.get("kind");
	const sideRaw = formData.get("side");

	if (!(file instanceof File)) {
		return Response.json({ error: "No file provided" }, { status: 400 });
	}

	const typeOk = ALLOWED_TYPES.has(file.type) || ALLOWED_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext));
	if (!typeOk) {
		return Response.json({ error: "Unsupported file type. Please upload a PNG, JPG, SVG, or PDF file." }, { status: 415 });
	}

	if (file.size > MAX_FILE_BYTES) {
		return Response.json({ error: "File is too large (max 25MB)" }, { status: 413 });
	}

	if (file.size === 0) {
		return Response.json({ error: "That file appears to be empty." }, { status: 400 });
	}

	const kind = typeof kindRaw === "string" && VALID_KINDS.has(kindRaw) ? kindRaw : "production";
	const side = typeof sideRaw === "string" && VALID_SIDES.has(sideRaw) ? sideRaw : undefined;

	// Sanitize the original filename before storing it as metadata — it's
	// never executed, only echoed back for display, but strip anything that
	// isn't a plain filename character to be safe.
	const originalName = file.name.replace(/[^\w.\- ]+/g, "_").slice(0, 200);

	const key = crypto.randomUUID();
	const bytes = await file.arrayBuffer();

	await context.cloudflare.env.ORDER_UPLOADS.put(key, bytes, {
		expirationTtl: RETENTION_SECONDS,
		metadata: { contentType: file.type, originalName, kind, side },
	});

	const url = new URL(`/uploads/${key}`, request.url).toString();
	return Response.json({ url, key, contentType: file.type, fileName: originalName });
}
