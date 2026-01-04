import { PlanogramConfig } from "@vst/vocabulary-types";
import { PlanogramSnapshot } from "../types/state";

/**
 * PROJECTOR - Render State Projection
 * Projects configuration to renderable snapshot (L1 → L4)
 */
export interface ISnapshotProjector {
  /**
   * Projects a configuration into a complete snapshot with render instances.
   * May be async (calls processor, builds spatial indices, etc.)
   */
  project(config: PlanogramConfig): Promise<PlanogramSnapshot>;
}
