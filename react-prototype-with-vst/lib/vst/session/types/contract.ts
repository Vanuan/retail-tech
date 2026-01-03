import { PlanogramConfig } from "@vst/vocabulary-types";
import { PlanogramAction } from "./actions";
import { PlanogramSnapshot } from "./state";

/**
 * SEQUENCE ROLLER CONTRACT
 * Pure function signature: (State + Action) => New State
 */
export interface IPlanogramSequenceRoller {
  /**
   * Rolls a sequence of actions onto a base configuration
   * to produce a complete renderable snapshot.
   */
  roll(
    base: PlanogramConfig,
    actions: PlanogramAction[],
  ): Promise<PlanogramSnapshot>;
}
