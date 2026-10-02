import { describe, expect, test } from "vitest";
import { fitArtworkToArea } from "./mockupPlacement";

describe("fitArtworkToArea", () => {
	test("centers a square design inside both shirt dimensions", () => {
		expect(fitArtworkToArea(1, 12, 16, 0.5)).toEqual({ widthIn: 6, heightIn: 6 });
	});

	test("constrains portrait artwork by available height", () => {
		expect(fitArtworkToArea(0.25, 12, 16, 0.5)).toEqual({ widthIn: 2, heightIn: 8 });
	});

	test("constrains wide artwork by available width", () => {
		expect(fitArtworkToArea(4, 12, 16, 0.5)).toEqual({ widthIn: 6, heightIn: 1.5 });
	});

	test("falls back safely when image dimensions are invalid", () => {
		expect(fitArtworkToArea(Number.NaN, 8, 4, 0.5)).toEqual({ widthIn: 2, heightIn: 2 });
	});
});
