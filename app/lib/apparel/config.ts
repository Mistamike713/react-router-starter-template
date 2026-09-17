// ============================================================================
// MNH Creations — Custom Apparel Configurator: centralized business data.
//
// Every dollar amount, size/color option, production limit, and fee in the
// configurator reads from this file. Nothing below should be hard-coded a
// second time in a UI component. To change a price, add a size, add a color,
// or enable a specialty material, edit the data here — no component changes
// required.
//
// All money values are stored in integer CENTS to avoid floating point
// rounding errors, and formatted for display only at render time.
// ============================================================================

// ---------------------------------------------------------------------------
// Size categories & pricing tiers
// ---------------------------------------------------------------------------

export const SIZE_CATEGORY = {
	INFANT: "infant",
	TODDLER: "toddler",
	YOUTH: "youth",
	ADULT: "adult",
} as const;
export type SizeCategory = (typeof SIZE_CATEGORY)[keyof typeof SIZE_CATEGORY];

export const PRICING_TIER = {
	YOUTH: "youth", // infant, toddler & youth all use youth/toddler add-on pricing
	ADULT: "adult",
} as const;
export type PricingTier = (typeof PRICING_TIER)[keyof typeof PRICING_TIER];

/** The pricing engine (never the customer) determines youth vs. adult tier. */
export function pricingTierForCategory(category: SizeCategory): PricingTier {
	return category === SIZE_CATEGORY.ADULT ? PRICING_TIER.ADULT : PRICING_TIER.YOUTH;
}

// ---------------------------------------------------------------------------
// Garments (fabric/brand). Each entry is a purchasable "garment type" shown
// in configurator step 1. Extensible: add hoodies/long-sleeve/etc. later by
// adding entries here with their own styleId.
// ---------------------------------------------------------------------------

export const FABRIC = {
	GILDAN_BELLA_CANVAS: "gildan_bella_canvas",
	DRI_FIT: "dri_fit",
} as const;
export type Fabric = (typeof FABRIC)[keyof typeof FABRIC];

export type FabricCapabilities = {
	material: string;
	polyesterPercentage: number;
	supportsHTV: boolean;
	supportsSublimation: boolean;
};

/**
 * Per-fabric physical/production capability flags. This is the extensibility
 * point called out by the spec: new fabrics/techniques (e.g. a future
 * poly-blend that supports dark-garment sublimation) are added here without
 * touching configurator logic, which only ever reads these flags.
 */
export const FABRIC_CAPABILITIES: Record<Fabric, FabricCapabilities> = {
	[FABRIC.GILDAN_BELLA_CANVAS]: {
		material: "cotton_blend",
		polyesterPercentage: 0,
		supportsHTV: true,
		// Sublimation dye bonds to polyester; a 0%-polyester cotton blend can't
		// take a sublimation print regardless of color. Revisit if MNH stocks a
		// poly-blend Gildan/Bella+Canvas SKU in the future.
		supportsSublimation: false,
	},
	[FABRIC.DRI_FIT]: {
		material: "polyester_performance",
		polyesterPercentage: 100,
		supportsHTV: true,
		supportsSublimation: true,
	},
};

export type Garment = {
	id: string;
	styleId: string;
	/** Customer-facing name. Never reference a specific brand/trademark here. */
	label: string;
	/** Short supporting copy shown under the label in the garment picker. */
	description: string;
	fabric: Fabric;
};

/**
 * Customer-facing garment names, intentionally generic (no brand/trademark
 * names like "Dri-Fit"). `fabric`/`styleId` still identify the underlying
 * stock for pricing and production purposes.
 */
export const GARMENTS: readonly Garment[] = [
	{
		id: "tee_gildan_bella_canvas",
		styleId: "short_sleeve_tee",
		label: "T-Shirt",
		description: "Soft, everyday cotton-blend short-sleeve tee.",
		fabric: FABRIC.GILDAN_BELLA_CANVAS,
	},
	{
		id: "tee_dri_fit",
		styleId: "short_sleeve_tee",
		label: "Performance Shirt",
		description: "Lightweight, moisture-wicking performance fabric.",
		fabric: FABRIC.DRI_FIT,
	},
];

export function getGarment(garmentId: string | null | undefined): Garment | null {
	return GARMENTS.find((g) => g.id === garmentId) ?? null;
}

// ---------------------------------------------------------------------------
// Sizes & base pricing table
// ---------------------------------------------------------------------------

/** Price row keys map a size to a row in BASE_PRICE_TABLE_CENTS below. */
export const PRICE_ROW = {
	INFANT: "infant",
	TODDLER_2T_5T: "toddler_2t_5t",
	YOUTH_XS_XL: "youth_xs_xl",
	ADULT_S_L: "adult_s_l",
	ADULT_XL: "adult_xl",
	ADULT_2XL: "adult_2xl",
	ADULT_3XL: "adult_3xl",
} as const;
export type PriceRow = (typeof PRICE_ROW)[keyof typeof PRICE_ROW];

/**
 * Base garment price in cents, keyed [priceRow][fabric].
 * Source: MNH Creations current price sheet. Adult XL is intentionally its
 * own row (NOT part of Adult S-L) at $35 / $38. To add 4XL+, add a new
 * PRICE_ROW entry, a row here, and one SIZES entry below.
 */
export const BASE_PRICE_TABLE_CENTS: Record<PriceRow, Record<Fabric, number>> = {
	[PRICE_ROW.INFANT]: { [FABRIC.GILDAN_BELLA_CANVAS]: 1600, [FABRIC.DRI_FIT]: 1800 },
	[PRICE_ROW.TODDLER_2T_5T]: { [FABRIC.GILDAN_BELLA_CANVAS]: 1800, [FABRIC.DRI_FIT]: 2000 },
	[PRICE_ROW.YOUTH_XS_XL]: { [FABRIC.GILDAN_BELLA_CANVAS]: 1800, [FABRIC.DRI_FIT]: 2000 },
	[PRICE_ROW.ADULT_S_L]: { [FABRIC.GILDAN_BELLA_CANVAS]: 2200, [FABRIC.DRI_FIT]: 2400 },
	[PRICE_ROW.ADULT_XL]: { [FABRIC.GILDAN_BELLA_CANVAS]: 3500, [FABRIC.DRI_FIT]: 3800 },
	[PRICE_ROW.ADULT_2XL]: { [FABRIC.GILDAN_BELLA_CANVAS]: 3800, [FABRIC.DRI_FIT]: 4100 },
	[PRICE_ROW.ADULT_3XL]: { [FABRIC.GILDAN_BELLA_CANVAS]: 4100, [FABRIC.DRI_FIT]: 4400 },
};

export type SizeOption = {
	id: string;
	label: string;
	category: SizeCategory;
	priceRow: PriceRow;
};

export const SIZES: readonly SizeOption[] = [
	{ id: "infant_6m", label: "6 Months", category: SIZE_CATEGORY.INFANT, priceRow: PRICE_ROW.INFANT },
	{ id: "infant_12m", label: "12 Months", category: SIZE_CATEGORY.INFANT, priceRow: PRICE_ROW.INFANT },
	{ id: "infant_18m", label: "18 Months", category: SIZE_CATEGORY.INFANT, priceRow: PRICE_ROW.INFANT },
	{ id: "infant_24m", label: "24 Months", category: SIZE_CATEGORY.INFANT, priceRow: PRICE_ROW.INFANT },
	{ id: "toddler_2t", label: "2T", category: SIZE_CATEGORY.TODDLER, priceRow: PRICE_ROW.TODDLER_2T_5T },
	{ id: "toddler_3t", label: "3T", category: SIZE_CATEGORY.TODDLER, priceRow: PRICE_ROW.TODDLER_2T_5T },
	{ id: "toddler_4t", label: "4T", category: SIZE_CATEGORY.TODDLER, priceRow: PRICE_ROW.TODDLER_2T_5T },
	{ id: "toddler_5t", label: "5T", category: SIZE_CATEGORY.TODDLER, priceRow: PRICE_ROW.TODDLER_2T_5T },
	{ id: "youth_xs", label: "Youth XS", category: SIZE_CATEGORY.YOUTH, priceRow: PRICE_ROW.YOUTH_XS_XL },
	{ id: "youth_s", label: "Youth S", category: SIZE_CATEGORY.YOUTH, priceRow: PRICE_ROW.YOUTH_XS_XL },
	{ id: "youth_m", label: "Youth M", category: SIZE_CATEGORY.YOUTH, priceRow: PRICE_ROW.YOUTH_XS_XL },
	{ id: "youth_l", label: "Youth L", category: SIZE_CATEGORY.YOUTH, priceRow: PRICE_ROW.YOUTH_XS_XL },
	{ id: "youth_xl", label: "Youth XL", category: SIZE_CATEGORY.YOUTH, priceRow: PRICE_ROW.YOUTH_XS_XL },
	{ id: "adult_s", label: "Adult S", category: SIZE_CATEGORY.ADULT, priceRow: PRICE_ROW.ADULT_S_L },
	{ id: "adult_m", label: "Adult M", category: SIZE_CATEGORY.ADULT, priceRow: PRICE_ROW.ADULT_S_L },
	{ id: "adult_l", label: "Adult L", category: SIZE_CATEGORY.ADULT, priceRow: PRICE_ROW.ADULT_S_L },
	{ id: "adult_xl", label: "Adult XL", category: SIZE_CATEGORY.ADULT, priceRow: PRICE_ROW.ADULT_XL },
	{ id: "adult_2xl", label: "Adult 2XL", category: SIZE_CATEGORY.ADULT, priceRow: PRICE_ROW.ADULT_2XL },
	{ id: "adult_3xl", label: "Adult 3XL", category: SIZE_CATEGORY.ADULT, priceRow: PRICE_ROW.ADULT_3XL },
];

export function getSize(sizeId: string | null | undefined): SizeOption | null {
	return SIZES.find((s) => s.id === sizeId) ?? null;
}

export function getBasePriceCents(sizeId: string | null | undefined, fabric: Fabric): number | null {
	const size = getSize(sizeId);
	if (!size) return null;
	const row = BASE_PRICE_TABLE_CENTS[size.priceRow];
	if (!row || !(fabric in row)) return null;
	return row[fabric];
}

export type PrintableAreaIn = { width: number; height: number };

/**
 * Conservative garment/size-specific printable area, in inches. These are
 * placeholder UI boundaries (NOT precise per-garment measurements — MNH has
 * not supplied exact printable dimensions per size yet). Final placement is
 * always subject to production review regardless of what's shown here.
 * Replace with real measured values per size as they become available.
 */
export const PRINTABLE_AREA_IN: Record<SizeCategory, PrintableAreaIn> = {
	[SIZE_CATEGORY.INFANT]: { width: 8, height: 10 },
	[SIZE_CATEGORY.TODDLER]: { width: 9, height: 12 },
	[SIZE_CATEGORY.YOUTH]: { width: 10, height: 13 },
	[SIZE_CATEGORY.ADULT]: { width: 12, height: 16 },
};

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------

export type ColorOption = {
	id: string;
	label: string;
	hex: string;
	fabrics: Fabric[];
	/**
	 * Current sublimation requirement is a light-colored garment; this flag
	 * (not a hardcoded rule) drives that filter so it can change if MNH's
	 * sublimation process changes (see FABRIC_CAPABILITIES note above).
	 */
	lightColor: boolean;
};

export const COLORS: readonly ColorOption[] = [
	{ id: "white", label: "White", hex: "#FFFFFF", fabrics: [FABRIC.GILDAN_BELLA_CANVAS, FABRIC.DRI_FIT], lightColor: true },
	{ id: "ash_grey", label: "Ash Grey", hex: "#D9D6D0", fabrics: [FABRIC.GILDAN_BELLA_CANVAS, FABRIC.DRI_FIT], lightColor: true },
	{ id: "sport_grey", label: "Sport Grey", hex: "#9B9B9B", fabrics: [FABRIC.GILDAN_BELLA_CANVAS, FABRIC.DRI_FIT], lightColor: false },
	{ id: "black", label: "Black", hex: "#161616", fabrics: [FABRIC.GILDAN_BELLA_CANVAS, FABRIC.DRI_FIT], lightColor: false },
	{ id: "navy", label: "Navy", hex: "#1B2A4A", fabrics: [FABRIC.GILDAN_BELLA_CANVAS, FABRIC.DRI_FIT], lightColor: false },
	{ id: "red", label: "Red", hex: "#B22234", fabrics: [FABRIC.GILDAN_BELLA_CANVAS, FABRIC.DRI_FIT], lightColor: false },
	{ id: "royal_blue", label: "Royal Blue", hex: "#2455C6", fabrics: [FABRIC.GILDAN_BELLA_CANVAS, FABRIC.DRI_FIT], lightColor: false },
	{ id: "forest_green", label: "Forest Green", hex: "#1B4332", fabrics: [FABRIC.GILDAN_BELLA_CANVAS], lightColor: false },
	{ id: "maroon", label: "Maroon", hex: "#5E1A26", fabrics: [FABRIC.GILDAN_BELLA_CANVAS], lightColor: false },
	{ id: "purple", label: "Purple", hex: "#4B2E83", fabrics: [FABRIC.GILDAN_BELLA_CANVAS], lightColor: false },
];

export function getColor(colorId: string | null | undefined): ColorOption | null {
	return COLORS.find((c) => c.id === colorId) ?? null;
}

// ---------------------------------------------------------------------------
// Production methods
// ---------------------------------------------------------------------------

export const PRODUCTION_METHOD = {
	HTV: "htv",
	SUBLIMATION: "sublimation",
} as const;
export type ProductionMethod = (typeof PRODUCTION_METHOD)[keyof typeof PRODUCTION_METHOD];

export type ProductionMethodConfig = {
	id: ProductionMethod;
	label: string;
	shortLabel: string;
	maxPrintWidthIn: number;
	maxPrintHeightIn: number;
	requiresApproval: boolean;
	requirementNotes: string[];
};

export const PRODUCTION_METHOD_CONFIG: Record<ProductionMethod, ProductionMethodConfig> = {
	[PRODUCTION_METHOD.HTV]: {
		id: PRODUCTION_METHOD.HTV,
		label: "HTV / Vinyl",
		shortLabel: "HTV",
		maxPrintWidthIn: 24,
		maxPrintHeightIn: 24,
		requiresApproval: true,
		requirementNotes: [],
	},
	[PRODUCTION_METHOD.SUBLIMATION]: {
		id: PRODUCTION_METHOD.SUBLIMATION,
		label: "Sublimation",
		shortLabel: "Sublimation",
		maxPrintWidthIn: 11,
		maxPrintHeightIn: 17,
		requiresApproval: true,
		requirementNotes: [
			"Polyester-compatible garment",
			"Light-colored garment",
			"Final configuration subject to MNH Creations approval",
		],
	},
};

export type MaxDesignDimensions = {
	width: number;
	height: number;
	limitedByEquipment: boolean;
};

/**
 * Effective max design dimensions = MIN(equipment max, garment/size
 * printable area) on each axis independently, per spec section 6. Requires
 * a specific production method, so it's used internally (e.g. by MNH's own
 * production workflow) rather than by the customer-facing configurator,
 * which no longer collects a method — see getMaxDesignDimensionsForFabric.
 */
export function getMaxDesignDimensionsIn(
	sizeId: string | null | undefined,
	method: ProductionMethod | null | undefined,
): MaxDesignDimensions | null {
	const size = getSize(sizeId);
	const methodConfig = method ? PRODUCTION_METHOD_CONFIG[method] : null;
	if (!size || !methodConfig) return null;
	const garmentArea = PRINTABLE_AREA_IN[size.category];
	return {
		width: Math.min(methodConfig.maxPrintWidthIn, garmentArea.width),
		height: Math.min(methodConfig.maxPrintHeightIn, garmentArea.height),
		limitedByEquipment:
			methodConfig.maxPrintWidthIn <= garmentArea.width && methodConfig.maxPrintHeightIn <= garmentArea.height,
	};
}

/**
 * Method-independent max design dimensions for the customer-facing
 * configurator: MNH chooses the production method (see
 * PRODUCTION_METHOD_DISCLOSURE), so the placement/preview bounds shown to
 * the customer must be safe for every method the fabric supports — the
 * minimum equipment size across those methods, bounded by the garment's
 * printable area.
 */
export function getMaxDesignDimensionsForFabric(
	sizeId: string | null | undefined,
	fabric: Fabric | null | undefined,
): MaxDesignDimensions | null {
	const size = getSize(sizeId);
	if (!size || !fabric) return null;
	const caps = FABRIC_CAPABILITIES[fabric];
	const methods: ProductionMethod[] = [];
	if (caps?.supportsHTV) methods.push(PRODUCTION_METHOD.HTV);
	if (caps?.supportsSublimation) methods.push(PRODUCTION_METHOD.SUBLIMATION);
	if (methods.length === 0) return null;

	const garmentArea = PRINTABLE_AREA_IN[size.category];
	const equipmentMaxWidthIn = Math.min(...methods.map((m) => PRODUCTION_METHOD_CONFIG[m].maxPrintWidthIn));
	const equipmentMaxHeightIn = Math.min(...methods.map((m) => PRODUCTION_METHOD_CONFIG[m].maxPrintHeightIn));

	return {
		width: Math.min(equipmentMaxWidthIn, garmentArea.width),
		height: Math.min(equipmentMaxHeightIn, garmentArea.height),
		limitedByEquipment: equipmentMaxWidthIn <= garmentArea.width && equipmentMaxHeightIn <= garmentArea.height,
	};
}

/**
 * Customer-facing disclosure: MNH — not the customer — decides HTV vs.
 * sublimation based on the product, artwork, material, color, and design.
 * PRODUCTION_METHOD/PRODUCTION_METHOD_CONFIG above remain as internal data
 * for MNH's own production workflow.
 */
export const PRODUCTION_METHOD_DISCLOSURE =
	"Production method is selected by MNH Creations based on your product, artwork, material, color, and design to achieve the best result.";

// ---------------------------------------------------------------------------
// Add-on pricing (youth/toddler/infant vs. adult tiers)
// ---------------------------------------------------------------------------

export type AddonPricing = {
	backDesign: number;
	specialtyHTV: number;
	name: number;
	number: number;
	nameAndNumber: number;
};

export const ADDON_PRICING_CENTS: Record<PricingTier, AddonPricing> = {
	[PRICING_TIER.YOUTH]: {
		backDesign: 800,
		specialtyHTV: 200,
		name: 500,
		number: 500,
		nameAndNumber: 800,
	},
	[PRICING_TIER.ADULT]: {
		backDesign: 1000,
		specialtyHTV: 400,
		name: 500,
		number: 500,
		nameAndNumber: 800,
	},
};

// ---------------------------------------------------------------------------
// Specialty HTV materials — configurable list; `available` gates whether a
// material is offered at all, `priceOverrideCents` lets a specific material
// (per tier) diverge from the standard specialty-HTV add-on price later.
// ---------------------------------------------------------------------------

export type SpecialtyMaterial = {
	id: string;
	label: string;
	available: boolean;
	priceOverrideCents: number | null;
};

export const SPECIALTY_MATERIALS: readonly SpecialtyMaterial[] = [
	{ id: "glow_in_dark", label: "Glow in the Dark", available: true, priceOverrideCents: null },
	{ id: "glitter", label: "Glitter", available: true, priceOverrideCents: null },
	{ id: "metallic", label: "Metallic", available: true, priceOverrideCents: null },
	{ id: "holographic", label: "Holographic", available: true, priceOverrideCents: null },
	{ id: "reflective", label: "Reflective", available: true, priceOverrideCents: null },
	{ id: "other", label: "Other Specialty Material (describe in notes)", available: true, priceOverrideCents: null },
];

export function getAvailableSpecialtyMaterials(): SpecialtyMaterial[] {
	return SPECIALTY_MATERIALS.filter((m) => m.available);
}

export function getSpecialtyHTVPriceCents(materialId: string | null | undefined, tier: PricingTier): number {
	const material = SPECIALTY_MATERIALS.find((m) => m.id === materialId);
	if (material && typeof material.priceOverrideCents === "number") {
		return material.priceOverrideCents;
	}
	return ADDON_PRICING_CENTS[tier].specialtyHTV;
}

// ---------------------------------------------------------------------------
// Design source & design service pricing
// ---------------------------------------------------------------------------

export const DESIGN_SOURCE = {
	UPLOAD_OWN: "upload_own", // "Upload My Design" — production-ready artwork
	CUSTOMIZE_EXISTING: "customize_existing", // "Customize an MNH Design"
	CREATE_FOR_ME: "create_for_me", // "Create a Design for Me"
} as const;
export type DesignSource = (typeof DESIGN_SOURCE)[keyof typeof DESIGN_SOURCE];

export const DESIGN_SERVICE_LEVEL = {
	ARTWORK_READY: "artwork_ready",
	SIMPLE_CUSTOMIZATION: "simple_customization",
	FULL_CUSTOM: "full_custom",
	COMPLEX_CUSTOM: "complex_custom",
} as const;
export type DesignServiceLevel = (typeof DESIGN_SERVICE_LEVEL)[keyof typeof DESIGN_SERVICE_LEVEL];

export type DesignServiceConfigEntry = {
	id: DesignServiceLevel;
	label: string;
	feeCents: number;
	isDeposit: boolean;
	description: string;
};

export const DESIGN_SERVICE_CONFIG: Record<DesignServiceLevel, DesignServiceConfigEntry> = {
	[DESIGN_SERVICE_LEVEL.ARTWORK_READY]: {
		id: DESIGN_SERVICE_LEVEL.ARTWORK_READY,
		label: "Artwork Ready",
		feeCents: 0,
		isDeposit: false,
		description: "You supply production-ready artwork. No design fee.",
	},
	[DESIGN_SERVICE_LEVEL.SIMPLE_CUSTOMIZATION]: {
		id: DESIGN_SERVICE_LEVEL.SIMPLE_CUSTOMIZATION,
		label: "Simple Customization",
		feeCents: 500,
		isDeposit: false,
		description: "Text, basic wording, name, number, basic arrangement, or small/simple changes.",
	},
	[DESIGN_SERVICE_LEVEL.FULL_CUSTOM]: {
		id: DESIGN_SERVICE_LEVEL.FULL_CUSTOM,
		label: "Full Custom Design",
		feeCents: 1000,
		isDeposit: false,
		description: "MNH Creations creates a design from your concept or inspiration.",
	},
	[DESIGN_SERVICE_LEVEL.COMPLEX_CUSTOM]: {
		id: DESIGN_SERVICE_LEVEL.COMPLEX_CUSTOM,
		label: "Complex Custom Design",
		feeCents: 1500,
		isDeposit: true,
		description:
			"A nonrefundable $15 deposit begins the custom design process and is applied toward your final design " +
			"fee. MNH Creations will review your request and confirm any additional design cost before production begins.",
	},
};

// ---------------------------------------------------------------------------
// Design workflow — internal statuses. Only a subset is customer-visible;
// the rest is architecture for a future MNH-side design/production tool.
// ---------------------------------------------------------------------------

export const DESIGN_STATUS = {
	AWAITING_REVIEW: "awaiting_review",
	DESIGN_ACCEPTED: "design_accepted",
	DESIGN_IN_PROGRESS: "design_in_progress",
	PROOF_READY: "proof_ready",
	CUSTOMER_CHANGES_REQUESTED: "customer_changes_requested",
	CUSTOMER_APPROVED: "customer_approved",
	APPROVED_FOR_PRODUCTION: "approved_for_production",
} as const;
export type DesignStatus = (typeof DESIGN_STATUS)[keyof typeof DESIGN_STATUS];

export const CUSTOMER_VISIBLE_DESIGN_STATUSES: ReadonlySet<DesignStatus> = new Set([
	DESIGN_STATUS.AWAITING_REVIEW,
	DESIGN_STATUS.PROOF_READY,
	DESIGN_STATUS.CUSTOMER_CHANGES_REQUESTED,
	DESIGN_STATUS.CUSTOMER_APPROVED,
]);

// ---------------------------------------------------------------------------
// Review-required reasons. Multiple may apply to a single line item.
// ---------------------------------------------------------------------------

export const REVIEW_REASON = {
	SUBLIMATION_REVIEW: "SUBLIMATION_REVIEW",
	LOW_RESOLUTION_ARTWORK: "LOW_RESOLUTION_ARTWORK",
	COMPLEX_DESIGN: "COMPLEX_DESIGN",
	PRINT_AREA_REVIEW: "PRINT_AREA_REVIEW",
	CUSTOMER_REQUESTED_PROOF: "CUSTOMER_REQUESTED_PROOF",
	SPECIALTY_MATERIAL_REVIEW: "SPECIALTY_MATERIAL_REVIEW",
} as const;
export type ReviewReason = (typeof REVIEW_REASON)[keyof typeof REVIEW_REASON];

// ---------------------------------------------------------------------------
// Future pricing hooks — present but inactive. Do not enable without an
// explicit MNH decision; the engine is simply architected to accept them.
// ---------------------------------------------------------------------------

export type BulkPricingRule = { minQty: number; discountPercent: number };

/** Quantity-discount rules. Empty = off. */
export const BULK_PRICING_RULES: readonly BulkPricingRule[] = [];

export const RUSH_ORDER_CONFIG = {
	enabled: false,
	label: "Rush Order",
	feeType: "flat_per_item" as "flat_per_item" | "percent",
	feeCents: 0,
	feePercent: 0,
};

// ---------------------------------------------------------------------------
// Tax — centralized, configurable, explicitly non-authoritative until a real
// rate/jurisdiction engine is wired in.
// ---------------------------------------------------------------------------

export const TAX_CONFIG = {
	enabled: true,
	// No jurisdiction-specific rate has been supplied yet. Keeping this at 0
	// avoids silently charging an invented rate; set a real percent (e.g. 7.25
	// for 7.25%) once MNH confirms the taxing jurisdiction, or replace this
	// whole module with a real tax service integration.
	defaultRatePercent: 0,
	label: "Estimated Sales Tax",
	authoritative: false,
	disclaimer:
		"Sales tax shown is an estimate for reference only and is not authoritative. " +
		"MNH Creations will confirm final tax due before charging your order.",
};

// ---------------------------------------------------------------------------
// Upload constraints
// ---------------------------------------------------------------------------

export const ARTWORK_UPLOAD_CONFIG = {
	acceptedMimeTypes: ["image/png", "image/jpeg", "image/svg+xml", "application/pdf"] as const,
	acceptedExtensions: [".png", ".jpg", ".jpeg", ".svg", ".pdf"] as const,
	maxFileSizeBytes: 25 * 1024 * 1024, // 25MB
	lowResolutionDpiThreshold: 150,
};

// ---------------------------------------------------------------------------
// Sample MNH design catalog for "Customize an MNH Design". Placeholder
// entries — MNH should replace with real design thumbnails/IDs.
// ---------------------------------------------------------------------------

export type MnhDesignCatalogEntry = { id: string; label: string; placeholder: boolean };

export const MNH_DESIGN_CATALOG: readonly MnhDesignCatalogEntry[] = [
	{ id: "mnh_sample_floral", label: "Sample: Floral Monogram", placeholder: true },
	{ id: "mnh_sample_varsity", label: "Sample: Varsity Number Block", placeholder: true },
	{ id: "mnh_sample_retro", label: "Sample: Retro Sunset", placeholder: true },
];
