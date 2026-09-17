// ============================================================================
// Interactive shirt mockup editor engine.
//
// A deterministic, canvas-drawn placement preview — NOT an AI-generated
// image and NOT a claim of exact color/production accuracy. It draws a
// schematic shirt silhouette in the selected color and lets the customer
// drag/resize their uploaded artwork (and see name/number text) within the
// garment's printable area, in physical inches, clamped to the current
// production-method + garment size limits.
//
// One MockupEditorEngine instance == one side (front or back) so front/back
// state never leaks into each other; the React wrapper component creates
// two independent instances when "Add Design to Back" is selected.
//
// This stays a plain TS class (not a React component) because canvas drag/
// resize is inherently imperative; the React wrapper instantiates it via
// useRef/useEffect. Pointer Events (not separate mouse/touch handlers)
// drive drag & resize so the same code works with mouse, touch, and pen.
// ============================================================================

const MIN_DESIGN_IN = 0.5;
const HANDLE_RADIUS_PX = 11;

export type MockupSide = "front" | "back";

export type Placement = { centerXIn: number; centerYIn: number; widthIn: number; heightIn: number };

export type PlacementState = {
	widthIn: number;
	heightIn: number;
	centerXIn: number;
	centerYIn: number;
	aspectLocked: boolean;
	maxWidthIn: number;
	maxHeightIn: number;
};

export type MockupEditorOptions = {
	maxWidthIn: number;
	maxHeightIn: number;
	garmentColorHex: string;
	side: MockupSide;
};

type RectPx = { x: number; y: number; width: number; height: number; centerXPx: number; centerYPx: number };
type Point = { x: number; y: number };
type DragMode = "move" | "resize-corner" | "resize-right" | "resize-bottom";
type DragState = { mode: DragMode; startPoint: Point; startPlacement: Placement };

export class MockupEditorEngine {
	private canvas: HTMLCanvasElement;
	private ctx: CanvasRenderingContext2D;
	private side: MockupSide;
	private maxWidthIn: number;
	private maxHeightIn: number;
	private garmentColorHex: string;

	private aspectLocked = true;
	private artworkImage: HTMLImageElement | null = null;
	private artworkAspect = 1;
	private nameText = "";
	private numberText = "";

	private placement: Placement | null = null;
	private dragState: DragState | null = null;
	private onChangeCallback: ((state: PlacementState | null) => void) | null = null;

	private cssWidth = 300;
	private cssHeight = 360;
	private pxPerInch = 10;
	private printableRectPx = { x: 0, y: 0, width: 0, height: 0 };

	private handlePointerDown = (event: PointerEvent) => this._handlePointerDown(event);
	private handlePointerMove = (event: PointerEvent) => this._handlePointerMove(event);
	private handlePointerUp = () => {
		this.dragState = null;
	};
	private handleResize = () => {
		this._layout();
		this.render();
	};

	constructor(canvas: HTMLCanvasElement, options: MockupEditorOptions) {
		this.canvas = canvas;
		const ctx = canvas.getContext("2d");
		if (!ctx) throw new Error("Canvas 2D context unavailable.");
		this.ctx = ctx;
		this.side = options.side;
		this.maxWidthIn = options.maxWidthIn;
		this.maxHeightIn = options.maxHeightIn;
		this.garmentColorHex = options.garmentColorHex || "#FFFFFF";

		this._layout();
		this._bindEvents();
		this.render();
	}

	onChange(callback: (state: PlacementState | null) => void) {
		this.onChangeCallback = callback;
	}

	private _emitChange() {
		this.onChangeCallback?.(this.getPlacementState());
	}

	/** Recomputes the canvas-space geometry for the shirt + printable area. */
	private _layout() {
		const canvas = this.canvas;
		const cssWidth = canvas.clientWidth || 300;
		const cssHeight = canvas.clientHeight || 360;
		const dpr = window.devicePixelRatio || 1;
		canvas.width = cssWidth * dpr;
		canvas.height = cssHeight * dpr;
		this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		this.cssWidth = cssWidth;
		this.cssHeight = cssHeight;

		// Printable area occupies a region roughly over the chest, sized to fit
		// within a comfortable box regardless of the shirt's drawn proportions.
		const boxWidthPx = cssWidth * 0.62;
		const boxHeightPx = cssHeight * 0.42;
		const pxPerInchW = boxWidthPx / this.maxWidthIn;
		const pxPerInchH = boxHeightPx / this.maxHeightIn;
		this.pxPerInch = Math.min(pxPerInchW, pxPerInchH);

		const printableWidthPx = this.maxWidthIn * this.pxPerInch;
		const printableHeightPx = this.maxHeightIn * this.pxPerInch;
		this.printableRectPx = {
			x: (cssWidth - printableWidthPx) / 2,
			y: cssHeight * (this.side === "back" ? 0.24 : 0.3),
			width: printableWidthPx,
			height: printableHeightPx,
		};
	}

	setMaxDimensionsIn(widthIn: number, heightIn: number) {
		this.maxWidthIn = widthIn;
		this.maxHeightIn = heightIn;
		this._layout();
		if (this.placement) {
			this.placement.widthIn = Math.min(this.placement.widthIn, widthIn);
			this.placement.heightIn = Math.min(this.placement.heightIn, heightIn);
			this._clampCenter();
		}
		this.render();
		this._emitChange();
	}

	setGarmentColor(hex: string) {
		this.garmentColorHex = hex;
		this.render();
	}

	setNameNumberText(name: string, number: string) {
		this.nameText = name || "";
		this.numberText = number || "";
		this.render();
	}

	setAspectLocked(locked: boolean) {
		this.aspectLocked = locked;
		this._emitChange();
	}

	setArtworkImage(image: HTMLImageElement) {
		this.artworkImage = image;
		this.artworkAspect = image.naturalWidth ? image.naturalWidth / image.naturalHeight : 1;
		const defaultWidthIn = Math.min(this.maxWidthIn * 0.6, this.maxWidthIn);
		const defaultHeightIn = this.aspectLocked ? defaultWidthIn / this.artworkAspect : Math.min(this.maxHeightIn * 0.6, this.maxHeightIn);
		this.placement = {
			centerXIn: this.maxWidthIn / 2,
			centerYIn: this.maxHeightIn / 2,
			widthIn: Math.min(defaultWidthIn, this.maxWidthIn),
			heightIn: Math.min(defaultHeightIn, this.maxHeightIn),
		};
		this._clampCenter();
		this.render();
		this._emitChange();
	}

	clearArtwork() {
		this.artworkImage = null;
		this.placement = null;
		this.render();
		this._emitChange();
	}

	getPlacementState(): PlacementState | null {
		if (!this.placement) return null;
		return {
			widthIn: round1(this.placement.widthIn),
			heightIn: round1(this.placement.heightIn),
			centerXIn: round1(this.placement.centerXIn),
			centerYIn: round1(this.placement.centerYIn),
			aspectLocked: this.aspectLocked,
			maxWidthIn: this.maxWidthIn,
			maxHeightIn: this.maxHeightIn,
		};
	}

	/** Restores a previously-saved placement (used when editing a cart item). */
	setPlacementState(state: PlacementState | null | undefined) {
		if (!state) return;
		this.aspectLocked = Boolean(state.aspectLocked);
		this.placement = {
			centerXIn: state.centerXIn,
			centerYIn: state.centerYIn,
			widthIn: Math.min(state.widthIn, this.maxWidthIn),
			heightIn: Math.min(state.heightIn, this.maxHeightIn),
		};
		this._clampCenter();
		this.render();
	}

	centerHorizontal() {
		if (!this.placement) return;
		this.placement.centerXIn = this.maxWidthIn / 2;
		this.render();
		this._emitChange();
	}

	centerVertical() {
		if (!this.placement) return;
		this.placement.centerYIn = this.maxHeightIn / 2;
		this.render();
		this._emitChange();
	}

	reset() {
		if (!this.artworkImage) return;
		this.setArtworkImage(this.artworkImage);
	}

	destroy() {
		this.canvas.removeEventListener("pointerdown", this.handlePointerDown);
		window.removeEventListener("pointermove", this.handlePointerMove);
		window.removeEventListener("pointerup", this.handlePointerUp);
		window.removeEventListener("resize", this.handleResize);
	}

	private _clampCenter() {
		const p = this.placement;
		if (!p) return;
		p.widthIn = clamp(p.widthIn, MIN_DESIGN_IN, this.maxWidthIn);
		p.heightIn = clamp(p.heightIn, MIN_DESIGN_IN, this.maxHeightIn);
		const halfW = p.widthIn / 2;
		const halfH = p.heightIn / 2;
		p.centerXIn = clamp(p.centerXIn, halfW, this.maxWidthIn - halfW);
		p.centerYIn = clamp(p.centerYIn, halfH, this.maxHeightIn - halfH);
	}

	private _artworkRectPx(): RectPx | null {
		if (!this.placement) return null;
		const pr = this.printableRectPx;
		const widthPx = this.placement.widthIn * this.pxPerInch;
		const heightPx = this.placement.heightIn * this.pxPerInch;
		const centerXPx = pr.x + this.placement.centerXIn * this.pxPerInch;
		const centerYPx = pr.y + this.placement.centerYIn * this.pxPerInch;
		return { x: centerXPx - widthPx / 2, y: centerYPx - heightPx / 2, width: widthPx, height: heightPx, centerXPx, centerYPx };
	}

	private _bindEvents() {
		this.canvas.addEventListener("pointerdown", this.handlePointerDown);
		window.addEventListener("pointermove", this.handlePointerMove);
		window.addEventListener("pointerup", this.handlePointerUp);
		window.addEventListener("resize", this.handleResize);
	}

	private _canvasPoint(event: PointerEvent): Point {
		const rect = this.canvas.getBoundingClientRect();
		return { x: event.clientX - rect.left, y: event.clientY - rect.top };
	}

	private _handlePointerDown(event: PointerEvent) {
		if (!this.placement) return;
		const point = this._canvasPoint(event);
		const rect = this._artworkRectPx();
		if (!rect) return;
		const corner = { x: rect.x + rect.width, y: rect.y + rect.height };
		const rightMid = { x: rect.x + rect.width, y: rect.y + rect.height / 2 };
		const bottomMid = { x: rect.x + rect.width / 2, y: rect.y + rect.height };

		if (distance(point, corner) <= HANDLE_RADIUS_PX) {
			this.dragState = { mode: "resize-corner", startPoint: point, startPlacement: { ...this.placement } };
		} else if (!this.aspectLocked && distance(point, rightMid) <= HANDLE_RADIUS_PX) {
			this.dragState = { mode: "resize-right", startPoint: point, startPlacement: { ...this.placement } };
		} else if (!this.aspectLocked && distance(point, bottomMid) <= HANDLE_RADIUS_PX) {
			this.dragState = { mode: "resize-bottom", startPoint: point, startPlacement: { ...this.placement } };
		} else if (point.x >= rect.x && point.x <= rect.x + rect.width && point.y >= rect.y && point.y <= rect.y + rect.height) {
			this.dragState = { mode: "move", startPoint: point, startPlacement: { ...this.placement } };
		} else {
			return;
		}
		this.canvas.setPointerCapture(event.pointerId);
		event.preventDefault();
	}

	private _handlePointerMove(event: PointerEvent) {
		if (!this.dragState || !this.placement) return;
		const point = this._canvasPoint(event);
		const dxIn = (point.x - this.dragState.startPoint.x) / this.pxPerInch;
		const dyIn = (point.y - this.dragState.startPoint.y) / this.pxPerInch;
		const start = this.dragState.startPlacement;

		if (this.dragState.mode === "move") {
			this.placement.centerXIn = start.centerXIn + dxIn;
			this.placement.centerYIn = start.centerYIn + dyIn;
		} else if (this.dragState.mode === "resize-corner") {
			const scaleDelta = 1 + (dxIn + dyIn) / (start.widthIn + start.heightIn);
			const widthIn = clamp(start.widthIn * scaleDelta, MIN_DESIGN_IN, this.maxWidthIn);
			const heightIn = this.aspectLocked ? widthIn / this.artworkAspect : clamp(start.heightIn * scaleDelta, MIN_DESIGN_IN, this.maxHeightIn);
			this.placement.widthIn = clamp(widthIn, MIN_DESIGN_IN, this.maxWidthIn);
			this.placement.heightIn = clamp(heightIn, MIN_DESIGN_IN, this.maxHeightIn);
		} else if (this.dragState.mode === "resize-right") {
			this.placement.widthIn = clamp(start.widthIn + dxIn, MIN_DESIGN_IN, this.maxWidthIn);
		} else if (this.dragState.mode === "resize-bottom") {
			this.placement.heightIn = clamp(start.heightIn + dyIn, MIN_DESIGN_IN, this.maxHeightIn);
		}

		this._clampCenter();
		this.render();
		this._emitChange();
	}

	render() {
		const ctx = this.ctx;
		ctx.clearRect(0, 0, this.cssWidth, this.cssHeight);
		drawShirtSilhouette(ctx, this.cssWidth, this.cssHeight, this.garmentColorHex, this.side);

		const pr = this.printableRectPx;
		ctx.save();
		ctx.setLineDash([5, 4]);
		ctx.strokeStyle = "rgba(74, 55, 40, 0.35)";
		ctx.lineWidth = 1.5;
		ctx.strokeRect(pr.x, pr.y, pr.width, pr.height);
		ctx.restore();

		if (this.artworkImage && this.placement) {
			const rect = this._artworkRectPx();
			if (rect) {
				ctx.save();
				ctx.drawImage(this.artworkImage, rect.x, rect.y, rect.width, rect.height);
				ctx.strokeStyle = "#C9713D";
				ctx.lineWidth = 2;
				ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);

				// Corner (uniform) resize handle — always shown.
				drawHandle(ctx, rect.x + rect.width, rect.y + rect.height);
				if (!this.aspectLocked) {
					drawHandle(ctx, rect.x + rect.width, rect.y + rect.height / 2);
					drawHandle(ctx, rect.x + rect.width / 2, rect.y + rect.height);
				}
				ctx.restore();
			}
		}

		if (this.nameText || this.numberText) {
			ctx.save();
			ctx.fillStyle = isLightColor(this.garmentColorHex) ? "#2A2A2A" : "#FFFFFF";
			ctx.font = "700 16px Inter, sans-serif";
			ctx.textAlign = "center";
			const textY = pr.y + pr.height + 26;
			if (this.side === "back" && this.numberText) {
				ctx.font = "700 34px Inter, sans-serif";
				ctx.fillText(this.numberText, this.cssWidth / 2, textY + 20);
				ctx.font = "700 16px Inter, sans-serif";
			}
			if (this.nameText) {
				ctx.fillText(this.nameText, this.cssWidth / 2, textY);
			} else if (this.side === "front" && this.numberText) {
				ctx.fillText(this.numberText, this.cssWidth / 2, textY);
			}
			ctx.restore();
		}
	}
}

function drawHandle(ctx: CanvasRenderingContext2D, x: number, y: number) {
	ctx.beginPath();
	ctx.arc(x, y, HANDLE_RADIUS_PX - 3, 0, Math.PI * 2);
	ctx.fillStyle = "#ffffff";
	ctx.fill();
	ctx.lineWidth = 2;
	ctx.strokeStyle = "#C9713D";
	ctx.stroke();
}

function drawShirtSilhouette(ctx: CanvasRenderingContext2D, width: number, height: number, colorHex: string, side: MockupSide) {
	const cx = width / 2;
	const shoulderY = height * 0.08;
	const bodyTop = height * 0.14;
	const bodyBottom = height * 0.94;
	const bodyHalfWidth = width * 0.3;
	const collarWidth = width * 0.12;
	const sleeveLength = width * 0.16;

	ctx.save();
	ctx.beginPath();
	ctx.moveTo(cx - collarWidth, shoulderY);
	ctx.lineTo(cx - bodyHalfWidth, shoulderY + height * 0.03);
	ctx.lineTo(cx - bodyHalfWidth - sleeveLength, shoulderY + height * 0.14);
	ctx.lineTo(cx - bodyHalfWidth - sleeveLength * 0.5, shoulderY + height * 0.22);
	ctx.lineTo(cx - bodyHalfWidth, bodyTop + height * 0.08);
	ctx.lineTo(cx - bodyHalfWidth, bodyBottom);
	ctx.lineTo(cx + bodyHalfWidth, bodyBottom);
	ctx.lineTo(cx + bodyHalfWidth, bodyTop + height * 0.08);
	ctx.lineTo(cx + bodyHalfWidth + sleeveLength * 0.5, shoulderY + height * 0.22);
	ctx.lineTo(cx + bodyHalfWidth + sleeveLength, shoulderY + height * 0.14);
	ctx.lineTo(cx + bodyHalfWidth, shoulderY + height * 0.03);
	ctx.lineTo(cx + collarWidth, shoulderY);
	if (side === "back") {
		ctx.lineTo(cx, shoulderY + height * 0.02);
	} else {
		ctx.quadraticCurveTo(cx, shoulderY + height * 0.06, cx - collarWidth, shoulderY);
	}
	ctx.closePath();
	ctx.fillStyle = colorHex;
	ctx.fill();
	ctx.lineWidth = 2;
	ctx.strokeStyle = isLightColor(colorHex) ? "rgba(0,0,0,0.25)" : "rgba(0,0,0,0.4)";
	ctx.stroke();
	ctx.restore();
}

function isLightColor(hex: string): boolean {
	const value = hex.replace("#", "");
	if (value.length !== 6) return true;
	const r = parseInt(value.slice(0, 2), 16);
	const g = parseInt(value.slice(2, 4), 16);
	const b = parseInt(value.slice(4, 6), 16);
	const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
	return luminance > 0.6;
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}

function round1(value: number): number {
	return Math.round(value * 10) / 10;
}

function distance(a: Point, b: Point): number {
	return Math.hypot(a.x - b.x, a.y - b.y);
}
