import { z } from "zod";

// Zod Schema for runtime validation
export const ShelfPositionSchema = z.object({
  model: z.literal("shelf-surface"),
  x: z.number().min(0),
  shelfIndex: z.number().int().min(0),
  depth: z.number().int().min(0),
});

export const AddProductRequestSchema = z.object({
  sku: z.string(),
  position: z.discriminatedUnion("model", [
    ShelfPositionSchema,
    // PegboardSchema, etc.
  ]),
});

// Infer the "Wire Type" (what comes over JSON)
export type AddProductRequest = z.infer<typeof AddProductRequestSchema>;
