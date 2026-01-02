import { PlanogramConfig } from "../planogram/config";
import { PlanogramAction } from "../intent/actions";
import { PlanogramSnapshot } from "../snapshot/state";

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
