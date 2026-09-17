// ============================================================================
// Interactive tumbler wrap editor engine.
//
// A deterministic, canvas-drawn placement preview — NOT an AI-generated
// image and NOT a claim of exact color/production accuracy — for the FLAT
// sublimation wrap panel (the unrolled design that gets printed and wrapped
// around the cylinder). The customer drags/resizes their uploaded artwork
// within the wrap's printable area, in physical inches, clamped to the
// product's wrap dimensions.
//
// Deliberately mirrors the structure of apparel/mockupEditorEngine.ts (same
// Pointer Events drag/resize approach) but draws a flat wrap panel instead
// of a shirt silhouette, and has no front/back or name/number concept.
// A separate, non-interactive TumblerCylinderPreview (see the React
// component of the same purpose) renders the second "on the tumbler"
// representation from the same placement state.
// ============================================================================

const MIN_DESIGN_IN = 0.5;
const HANDLE_RADIUS_PX = 11;

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

export type TumblerWrapEditorOptions = {
	wrapWidthIn: number;
	wrapHeightIn: number;
	bodyColorHex: string;
};

type RectPx = { x: number; y: number; width: number; height: number };
type Point = { x: number; y: number };
type DragMode = "move" | "resize-corner" | "resize-right" | "resize-bottom";
type DragState = { mode: DragMode; startPoint: Point; startPlacement: Placement };

export class TumblerWrapEditorEngine {
	private canvas: HTMLCanvasElement;
	private ctx: CanvasRenderingContext2D;
	private wrapWidthIn: number;
	private wrapHeightIn: number;
	private bodyColorHex: string;

	private aspectLocked = true;
	private artworkImage: HTMLImageElement | null = null;
	private artworkAspect = 1;

	private placement: Placement | null = null;
	private dragState: DragState | null = null;
	private onChangeCallback: ((state: PlacementState | null) => void) | null = null;

	private cssWidth = 320;
	private cssHeight = 200;
	private pxPerInch = 10;
	private wrapRectPx = { x: 0, y: 0, width: 0, height: 0 };

	private handlePointerDown = (event: PointerEvent) => this._handlePointerDown(event);
	private handlePointerMove = (event: PointerEvent) => this._handlePointerMove(event);
	private handlePointerUp = () => {
		this.dragState = null;
	};
	private handleResize = () => {
		this._layout();
		this.render();
	};

	constructor(canvas: HTMLCanvasElement, options: TumblerWrapEditorOptions) {
		this.canvas = canvas;
		const ctx = canvas.getContext("2d");
		if (!ctx) throw new Error("Canvas 2D context unavailable.");
		this.ctx = ctx;
		this.wrapWidthIn = options.wrapWidthIn;
		this.wrapHeightIn = options.wrapHeightIn;
		this.bodyColorHex = options.bodyColorHex || "#FFFFFF";

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

	private _layout() {
		const canvas = this.canvas;
		const cssWidth = canvas.clientWidth || 320;
		const cssHeight = canvas.clientHeight || 200;
		const dpr = window.devicePixelRatio || 1;
		canvas.width = cssWidth * dpr;
		canvas.height = cssHeight * dpr;
		this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		this.cssWidth = cssWidth;
		this.cssHeight = cssHeight;

		const marginPx = 24;
		const boxWidthPx = cssWidth - marginPx * 2;
		const boxHeightPx = cssHeight - marginPx * 2;
		const pxPerInchW = boxWidthPx / this.wrapWidthIn;
		const pxPerInchH = boxHeightPx / this.wrapHeightIn;
		this.pxPerInch = Math.min(pxPerInchW, pxPerInchH);

		const wrapWidthPx = this.wrapWidthIn * this.pxPerInch;
		const wrapHeightPx = this.wrapHeightIn * this.pxPerInch;
		this.wrapRectPx = {
			x: (cssWidth - wrapWidthPx) / 2,
			y: (cssHeight - wrapHeightPx) / 2,
			width: wrapWidthPx,
			height: wrapHeightPx,
		};
	}

	setWrapDimensionsIn(widthIn: number, heightIn: number) {
		this.wrapWidthIn = widthIn;
		this.wrapHeightIn = heightIn;
		this._layout();
		if (this.placement) {
			this.placement.widthIn = Math.min(this.placement.widthIn, widthIn);
			this.placement.heightIn = Math.min(this.placement.heightIn, heightIn);
			this._clampCenter();
		}
		this.render();
		this._emitChange();
	}

	setBodyColor(hex: string) {
		this.bodyColorHex = hex;
		this.render();
	}

	setAspectLocked(locked: boolean) {
		this.aspectLocked = locked;
		this._emitChange();
	}

	setArtworkImage(image: HTMLImageElement) {
		this.artworkImage = image;
		this.artworkAspect = image.naturalWidth ? image.naturalWidth / image.naturalHeight : 1;
		const defaultWidthIn = Math.min(this.wrapWidthIn * 0.85, this.wrapWidthIn);
		const defaultHeightIn = this.aspectLocked ? defaultWidthIn / this.artworkAspect : Math.min(this.wrapHeightIn * 0.85, this.wrapHeightIn);
		this.placement = {
			centerXIn: this.wrapWidthIn / 2,
			centerYIn: this.wrapHeightIn / 2,
			widthIn: Math.min(defaultWidthIn, this.wrapWidthIn),
			heightIn: Math.min(defaultHeightIn, this.wrapHeightIn),
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
			maxWidthIn: this.wrapWidthIn,
			maxHeightIn: this.wrapHeightIn,
		};
	}

	setPlacementState(state: PlacementState | null | undefined) {
		if (!state) return;
		this.aspectLocked = Boolean(state.aspectLocked);
		this.placement = {
			centerXIn: state.centerXIn,
			centerYIn: state.centerYIn,
			widthIn: Math.min(state.widthIn, this.wrapWidthIn),
			heightIn: Math.min(state.heightIn, this.wrapHeightIn),
		};
		this._clampCenter();
		this.render();
	}

	centerHorizontal() {
		if (!this.placement) return;
		this.placement.centerXIn = this.wrapWidthIn / 2;
		this.render();
		this._emitChange();
	}

	centerVertical() {
		if (!this.placement) return;
		this.placement.centerYIn = this.wrapHeightIn / 2;
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
		p.widthIn = clamp(p.widthIn, MIN_DESIGN_IN, this.wrapWidthIn);
		p.heightIn = clamp(p.heightIn, MIN_DESIGN_IN, this.wrapHeightIn);
		const halfW = p.widthIn / 2;
		const halfH = p.heightIn / 2;
		p.centerXIn = clamp(p.centerXIn, halfW, this.wrapWidthIn - halfW);
		p.centerYIn = clamp(p.centerYIn, halfH, this.wrapHeightIn - halfH);
	}

	private _artworkRectPx(): RectPx | null {
		if (!this.placement) return null;
		const wr = this.wrapRectPx;
		const widthPx = this.placement.widthIn * this.pxPerInch;
		const heightPx = this.placement.heightIn * this.pxPerInch;
		const centerXPx = wr.x + this.placement.centerXIn * this.pxPerInch;
		const centerYPx = wr.y + this.placement.centerYIn * this.pxPerInch;
		return { x: centerXPx - widthPx / 2, y: centerYPx - heightPx / 2, width: widthPx, height: heightPx };
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
			const widthIn = clamp(start.widthIn * scaleDelta, MIN_DESIGN_IN, this.wrapWidthIn);
			const heightIn = this.aspectLocked ? widthIn / this.artworkAspect : clamp(start.heightIn * scaleDelta, MIN_DESIGN_IN, this.wrapHeightIn);
			this.placement.widthIn = clamp(widthIn, MIN_DESIGN_IN, this.wrapWidthIn);
			this.placement.heightIn = clamp(heightIn, MIN_DESIGN_IN, this.wrapHeightIn);
		} else if (this.dragState.mode === "resize-right") {
			this.placement.widthIn = clamp(start.widthIn + dxIn, MIN_DESIGN_IN, this.wrapWidthIn);
		} else if (this.dragState.mode === "resize-bottom") {
			this.placement.heightIn = clamp(start.heightIn + dyIn, MIN_DESIGN_IN, this.wrapHeightIn);
		}

		this._clampCenter();
		this.render();
		this._emitChange();
	}

	render() {
		const ctx = this.ctx;
		ctx.clearRect(0, 0, this.cssWidth, this.cssHeight);

		const wr = this.wrapRectPx;
		ctx.save();
		ctx.fillStyle = this.bodyColorHex;
		ctx.fillRect(wr.x, wr.y, wr.width, wr.height);
		ctx.setLineDash([5, 4]);
		ctx.strokeStyle = "rgba(74, 55, 40, 0.35)";
		ctx.lineWidth = 1.5;
		ctx.strokeRect(wr.x, wr.y, wr.width, wr.height);
		ctx.restore();

		if (this.artworkImage && this.placement) {
			const rect = this._artworkRectPx();
			if (rect) {
				ctx.save();
				ctx.drawImage(this.artworkImage, rect.x, rect.y, rect.width, rect.height);
				ctx.strokeStyle = "#C9713D";
				ctx.lineWidth = 2;
				ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);

				drawHandle(ctx, rect.x + rect.width, rect.y + rect.height);
				if (!this.aspectLocked) {
					drawHandle(ctx, rect.x + rect.width, rect.y + rect.height / 2);
					drawHandle(ctx, rect.x + rect.width / 2, rect.y + rect.height);
				}
				ctx.restore();
			}
		}
	}
}

/**
 * Renders the second, non-interactive "on the tumbler" representation from
 * the same placement state used by the flat wrap editor above — an
 * approximate cylindrical preview (rounded body outline + a soft edge
 * shading gradient to suggest curvature), not a precise render. Shares no
 * mutable state with TumblerWrapEditorEngine; called fresh on every paint.
 */
export function renderCylinderPreview(
	canvas: HTMLCanvasElement,
	options: {
		artworkImage: HTMLImageElement | null;
		placement: PlacementState | null;
		wrapWidthIn: number;
		wrapHeightIn: number;
		bodyColorHex: string;
	},
) {
	const ctx = canvas.getContext("2d");
	if (!ctx) return;
	const dpr = window.devicePixelRatio || 1;
	const cssWidth = canvas.clientWidth || 260;
	const cssHeight = canvas.clientHeight || 220;
	canvas.width = cssWidth * dpr;
	canvas.height = cssHeight * dpr;
	ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	ctx.clearRect(0, 0, cssWidth, cssHeight);

	const bodyWidth = cssWidth * 0.46;
	const bodyHeight = cssHeight * 0.82;
	const bodyX = (cssWidth - bodyWidth) / 2;
	const bodyY = (cssHeight - bodyHeight) / 2;
	const radius = bodyWidth * 0.16;

	ctx.save();
	roundedRectPath(ctx, bodyX, bodyY, bodyWidth, bodyHeight, radius);
	ctx.clip();
	ctx.fillStyle = options.bodyColorHex;
	ctx.fillRect(bodyX, bodyY, bodyWidth, bodyHeight);

	if (options.artworkImage && options.placement) {
		// Map the flat wrap placement onto the visible front-facing band of the
		// cylinder body proportionally (wrap inches -> body pixels).
		const scaleX = bodyWidth / options.wrapWidthIn;
		const scaleY = bodyHeight / options.wrapHeightIn;
		const p = options.placement;
		const drawWidth = p.widthIn * scaleX;
		const drawHeight = p.heightIn * scaleY;
		const drawX = bodyX + p.centerXIn * scaleX - drawWidth / 2;
		const drawY = bodyY + p.centerYIn * scaleY - drawHeight / 2;
		ctx.drawImage(options.artworkImage, drawX, drawY, drawWidth, drawHeight);
	}

	// Soft edge shading to suggest a cylindrical surface.
	const shade = ctx.createLinearGradient(bodyX, 0, bodyX + bodyWidth, 0);
	shade.addColorStop(0, "rgba(0,0,0,0.22)");
	shade.addColorStop(0.18, "rgba(0,0,0,0)");
	shade.addColorStop(0.82, "rgba(0,0,0,0)");
	shade.addColorStop(1, "rgba(0,0,0,0.22)");
	ctx.fillStyle = shade;
	ctx.fillRect(bodyX, bodyY, bodyWidth, bodyHeight);
	const highlight = ctx.createLinearGradient(bodyX, 0, bodyX + bodyWidth, 0);
	highlight.addColorStop(0.32, "rgba(255,255,255,0)");
	highlight.addColorStop(0.42, "rgba(255,255,255,0.25)");
	highlight.addColorStop(0.52, "rgba(255,255,255,0)");
	ctx.fillStyle = highlight;
	ctx.fillRect(bodyX, bodyY, bodyWidth, bodyHeight);
	ctx.restore();

	ctx.save();
	roundedRectPath(ctx, bodyX, bodyY, bodyWidth, bodyHeight, radius);
	ctx.lineWidth = 2;
	ctx.strokeStyle = "rgba(74,55,40,0.4)";
	ctx.stroke();
	ctx.restore();
}

function roundedRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
	ctx.beginPath();
	ctx.moveTo(x + radius, y);
	ctx.arcTo(x + width, y, x + width, y + height, radius);
	ctx.arcTo(x + width, y + height, x, y + height, radius);
	ctx.arcTo(x, y + height, x, y, radius);
	ctx.arcTo(x, y, x + width, y, radius);
	ctx.closePath();
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

function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}

function round1(value: number): number {
	return Math.round(value * 10) / 10;
}

function distance(a: Point, b: Point): number {
	return Math.hypot(a.x - b.x, a.y - b.y);
}
