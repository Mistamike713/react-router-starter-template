import { describe, expect, test } from "vitest";
import { customShirtDetailLines, customTumblerDetailLines, describeCustomShirt, describeCustomTumbler } from "./describeCartItem";

describe("describeCustomShirt", () => {
	test("shows the customer-facing garment label without brand/trademark terms", () => {
		const text = describeCustomShirt({ garmentId: "tee_dri_fit", sizeId: "adult_l", colorId: "black" });
		expect(text).toContain("Performance Shirt");
		expect(text).not.toMatch(/dri-fit/i);
	});
});

describe("customShirtDetailLines", () => {
	test("includes a View / Download Customer Artwork link for front artwork with its filename", () => {
		const lines = customShirtDetailLines({
			frontArtwork: { key: "abc", url: "https://mnh.example/uploads/abc", fileName: "design.png", mimeType: "image/png", artworkKind: "raster" },
		});
		const line = lines.find((l) => l.includes("Front"));
		expect(line).toContain("View / Download Customer Artwork (Front)");
		expect(line).toContain("design.png");
		expect(line).toContain("https://mnh.example/uploads/abc");
	});

	test("includes a back-artwork link only when a back design is enabled", () => {
		const withoutBackDesign = customShirtDetailLines({
			backDesign: false,
			backArtwork: { key: "b", url: "https://mnh.example/uploads/b", fileName: "back.png", mimeType: "image/png", artworkKind: "raster" },
		});
		expect(withoutBackDesign.some((l) => l.includes("Back"))).toBe(false);

		const withBackDesign = customShirtDetailLines({
			backDesign: true,
			backArtwork: { key: "b", url: "https://mnh.example/uploads/b", fileName: "back.png", mimeType: "image/png", artworkKind: "raster" },
		});
		expect(withBackDesign.some((l) => l.includes("View / Download Customer Artwork (Back)"))).toBe(true);
	});

	test("includes an inspiration reference link, separate from production artwork", () => {
		const lines = customShirtDetailLines({
			inspirationArtwork: { key: "i", url: "https://mnh.example/uploads/i", fileName: "inspo.jpg", mimeType: "image/jpeg", artworkKind: "raster" },
		});
		expect(lines.some((l) => l.includes("View / Download Inspiration Reference"))).toBe(true);
	});

	test("includes front/back design placement dimensions when set", () => {
		const lines = customShirtDetailLines({
			frontPlacement: { widthIn: 8, heightIn: 10, centerXIn: 0, centerYIn: 0, aspectLocked: true, maxWidthIn: 12, maxHeightIn: 16 },
		});
		expect(lines.some((l) => l.includes("Front design size: 8.0in x 10.0in"))).toBe(true);
	});
});

describe("describeCustomTumbler", () => {
	test("shows the product and finish label", () => {
		const text = describeCustomTumbler({ productId: "16oz-snow-globe", finishOptionId: "snow_globe" });
		expect(text).toBe("16oz — Snow Globe — Snow globe style");
	});
});

describe("customTumblerDetailLines", () => {
	test("includes a View / Download Customer Artwork link for uploaded wrap artwork", () => {
		const lines = customTumblerDetailLines({
			artwork: { key: "abc", url: "https://mnh.example/uploads/abc", fileName: "wrap.png", mimeType: "image/png", artworkKind: "raster" },
		});
		expect(lines.some((l) => l.includes("View / Download Customer Artwork") && l.includes("wrap.png"))).toBe(true);
	});

	test("includes personalization text and wrap design placement size", () => {
		const lines = customTumblerDetailLines({
			personalizationText: "Alex",
			placement: { widthIn: 6, heightIn: 3, centerXIn: 0, centerYIn: 0, aspectLocked: true, maxWidthIn: 8, maxHeightIn: 3.2 },
		});
		expect(lines.some((l) => l.includes('Personalization: "Alex"'))).toBe(true);
		expect(lines.some((l) => l.includes("Wrap design size: 6.0in x 3.0in"))).toBe(true);
	});
});
