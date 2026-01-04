import { PlanogramConfig } from "@vst/vocabulary-types";
import { PlanogramAction } from "../types/actions";

/**
 * REDUCER - Pure State Transformation
 * Applies actions to configuration (L1 → L1)
 */
export interface IActionReducer {
  /**
   * Reduces an array of actions onto a base configuration.
   * Pure function: no side effects, synchronous.
   */
  reduce(
    base: PlanogramConfig,
    actions: PlanogramAction[]
  ): PlanogramConfig;
}
