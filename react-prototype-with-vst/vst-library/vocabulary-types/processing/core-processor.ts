import { PlanogramConfig } from "../planogram/config";
import { ProductMetadata } from "../planogram/metadata";
import { ProcessedPlanogram } from "../rendering/engine";
import { PlanogramAction } from "../planogram/actions";
import { ShelfIndex } from "../core/units";
import {
  PlacementConstraints,
  PlacementSuggestion,
} from "../planogram/placement";
import { ValidationResult } from "../validation";

/**
 * Core projection contract.
 * Translates L1 + L3 into an L4 ProcessedPlanogram.
 *
 * This is a pure capability contract.
 * No guarantees about sync/async, caching, or validation depth.
 *
 * Elevated to "Authority" status:
 * The processor is now responsible for deciding WHERE things go (suggestPlacement)
 * and IF they can go there (validateIntent), not just drawing them.
 */
export interface ICoreProcessor {
  /**
   * @deprecated Use project() for action-aware processing.
   */
  process(input: CoreProcessInput): ProcessedPlanogram;

  /**
   * Applies actions to a configuration and produces a complete snapshot.
   * This is the primary entry point for state calculation.
   */
  project(
    config: PlanogramConfig,
    actions: readonly PlanogramAction[],
    metadata: ReadonlyMap<string, ProductMetadata>,
  ): IPlanogramSnapshot;

  /**
   * Calculates the best placement for a product based on business rules.
   * Pure intent service - does not modify state.
   */
  suggestPlacement(input: PlacementSuggestionInput): PlacementSuggestion | null;

  /**
   * Validates if an action is permissible under business rules.
   * Pure intent service - does not modify state.
   */
  validateIntent(
    action: PlanogramAction,
    context: ValidationContext,
  ): ValidationResult;
}

export interface CoreProcessInput {
  readonly config: PlanogramConfig;
  readonly metadata: ReadonlyMap<string, ProductMetadata>;
}

export interface IPlanogramSnapshot extends ProcessedPlanogram {
  /**
   * The configuration state that resulted in this snapshot.
   * (Base config + actions applied)
   */
  readonly config: PlanogramConfig;
}

export interface PlacementSuggestionInput {
  readonly sku: string;
  readonly preferredShelf?: ShelfIndex;
  readonly constraints?: PlacementConstraints;

  // Context required for pure calculation
  readonly config: PlanogramConfig;
  readonly metadata: ReadonlyMap<string, ProductMetadata>;
}

export interface ValidationContext {
  readonly config: PlanogramConfig;
  readonly metadata: ReadonlyMap<string, ProductMetadata>;
}
