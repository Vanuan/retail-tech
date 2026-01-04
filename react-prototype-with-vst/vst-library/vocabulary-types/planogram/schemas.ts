import { z } from "zod";

/**
 * Zod Schemas for Planogram Domain Entities
 * Used for runtime validation of data (e.g. from localStorage or API)
 */

// Basic units
const MillimetersSchema = z.number();
const ShelfIndexSchema = z.number().int().min(0);

// Product Position / Placement
const ShelfPositionSchema = z.object({
  model: z.literal("shelf-surface"),
  x: MillimetersSchema,
  shelfIndex: ShelfIndexSchema,
  depth: z.number().default(0),
});

const FacingConfigSchema = z.object({
  horizontal: z.number().int().min(1),
  vertical: z.number().int().min(1),
  total: z.number().int().min(1).optional(),
});

const ProductPlacementSchema = z.object({
  position: ShelfPositionSchema, // Discriminated union can be added here if we have more models
  facings: FacingConfigSchema,
});

// Source Product (Instance on a planogram)
const SourceProductSchema = z.object({
  id: z.string(),
  sku: z.string(),
  placement: ProductPlacementSchema,
  pricing: z
    .object({
      unitPrice: z.number().optional(),
    })
    .optional(),
});

// Shelf Configuration
const ShelfConfigSchema = z.object({
  id: z.string(),
  index: ShelfIndexSchema,
  baseHeight: MillimetersSchema,
});

// Fixture Configuration
const FixtureVisualPropertiesSchema = z.object({
  assets: z.object({
    upright: z.string().optional(),
    base: z.string().optional(),
    shelf: z.string().optional(),
    shelfSurface: z.string().optional(),
    priceRail: z.string().optional(),
    back: z.string().optional(),
  }),
  dimensions: z
    .object({
      uprightWidth: MillimetersSchema.optional(),
      baseHeight: MillimetersSchema.optional(),
      shelfSurfaceHeight: MillimetersSchema.optional(),
      priceRailHeight: MillimetersSchema.optional(),
      priceLabelHeight: MillimetersSchema.optional(),
      headerHeight: MillimetersSchema.optional(),
    })
    .optional(),
});

const FixtureConfigSchema = z.object({
  type: z.string(),
  placementModel: z.string(),
  dimensions: z.object({
    width: MillimetersSchema,
    height: MillimetersSchema,
    depth: MillimetersSchema,
  }),
  config: z.object({
    shelves: z.array(ShelfConfigSchema),
    depthSpacing: z.number().optional(),
  }),
  visualProperties: FixtureVisualPropertiesSchema.optional(),
  background: z
    .object({
      color: z.string().optional(),
      imageUrl: z.string().optional(),
    })
    .optional(),
});

// Top Level Planogram Configuration
export const PlanogramConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
  thumbnail: z.string().optional(),
  fixture: FixtureConfigSchema,
  products: z.array(SourceProductSchema),
});

export type PlanogramConfig = z.infer<typeof PlanogramConfigSchema>;
