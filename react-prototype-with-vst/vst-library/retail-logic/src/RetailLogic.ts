import {
  PlanogramAction,
  ValidationResult,
  PlanogramConfig,
  ProductMetadata,
  PlacementSuggestion,
} from "@vst/vocabulary-types";
import {
  IRetailLogic,
  RetailContext,
  SuggestionRequest,
  CollisionMap,
} from "./types";
import { CollisionEngine } from "./engines/CollisionEngine";
import { PlacementSuggester } from "./engines/PlacementSuggester";
import { IntentValidator } from "./engines/IntentValidator";

/**
 * The entry point for the @vst/retail-logic package.
 *
 * This class orchestrates the "Semantic Physics" of the system.
 * It provides headless validation, collision detection, and auto-placement logic
 * without any dependency on the rendering pipeline.
 */
export class RetailLogic implements IRetailLogic {
  private collisionEngine: CollisionEngine;
  private placementSuggester: PlacementSuggester;
  private intentValidator: IntentValidator;

  constructor() {
    this.collisionEngine = new CollisionEngine();
    this.placementSuggester = new PlacementSuggester(this.collisionEngine);
    this.intentValidator = new IntentValidator(this.collisionEngine);
  }

  /**
   * Validates if a proposed action is physically and logically possible.
   * This is what the Session uses during drag-and-drop.
   */
  public validateIntent(
    action: PlanogramAction,
    context: RetailContext
  ): ValidationResult {
    return this.intentValidator.validateIntent(action, context);
  }

  /**
   * Finds the optimal spot for a product.
   * This is what the Fluent API uses for .addProduct("SKU").commit()
   */
  public suggestPlacement(
    input: SuggestionRequest
  ): PlacementSuggestion | null {
    return this.placementSuggester.suggest(input);
  }

  /**
   * High-speed check for product overlaps.
   */
  public getCollisions(
    config: PlanogramConfig,
    metadata: Map<string, ProductMetadata>
  ): CollisionMap {
    return this.collisionEngine.getCollisions(config, metadata);
  }
}
