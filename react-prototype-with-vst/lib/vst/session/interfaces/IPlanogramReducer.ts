import { PlanogramConfig } from "@vst/vocabulary-types";
import { PlanogramAction } from "../types/actions";
import { PlanogramSnapshot } from "../types/state";

/**
 * COMBINED INTERFACE
 * Coordinates action reduction and snapshot projection.
 * This is the primary interface used by the SessionStore.
 */
export interface IPlanogramReducer {
  /**
   * Reduces an array of actions onto a base configuration and
   * projects the result into a complete renderable snapshot.
   */
  reduce(
    base: PlanogramConfig,
    actions: PlanogramAction[],
  ): Promise<PlanogramSnapshot>;
}
