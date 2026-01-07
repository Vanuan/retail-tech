import {
  PlanogramConfig,
  ProductMetadata,
  PlanogramAction,
  PlacementConstraints,
  PlacementSuggestion,
  ValidationResult,
  ShelfIndex,
} from "@vst/vocabulary-types";

export interface RetailContext {
  config: PlanogramConfig;
  metadata: Map<string, ProductMetadata>;
}

export interface SuggestionRequest {
  sku: string;
  preferredShelf?: ShelfIndex | null;
  constraints?: PlacementConstraints;
  metadata: Map<string, ProductMetadata>;
  actions?: readonly PlanogramAction[];
  config: PlanogramConfig;
}

export interface Collision {
  sourceId: string; // The ID of the product being checked
  targetId: string; // The ID of the product it collided with (existing on shelf)
  overlap: number; // Overlap amount in semantic units
  position: number; // X position where collision occurs
}

export type CollisionMap = Map<string, Collision[]>;

export interface IRetailLogic {
  /**
   * Validates if a proposed action is physically and logically possible.
   * This is what the Session uses during drag-and-drop.
   */
  validateIntent(
    action: PlanogramAction,
    context: RetailContext,
  ): ValidationResult;

  /**
   * Finds the optimal spot for a product.
   * This is what the Fluent API uses for .addProduct("SKU").commit()
   */
  suggestPlacement(input: SuggestionRequest): PlacementSuggestion | null;

  /**
   * High-speed check for product overlaps.
   */
  getCollisions(
    config: PlanogramConfig,
    metadata: Map<string, ProductMetadata>,
  ): CollisionMap;
}
