import { PlanogramConfig } from "@vst/vocabulary-types";
import { PlanogramAction } from "./actions";
import { PlanogramSnapshot } from "./snapshot";

/**
 * PROJECTOR CONTRACT
 * Pure function signature: (State + Action) => New State
 */
export interface IPlanogramProjector {
  /**
   * Projects a sequence of actions onto a base configuration
   * to produce a complete renderable snapshot.
   */
  project(
    base: PlanogramConfig,
    actions: PlanogramAction[]
  ): Promise<PlanogramSnapshot>;
}
