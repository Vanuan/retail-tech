import { PlanogramConfig } from "@vst/vocabulary-types";
import { PlanogramAction } from "../types/actions";
import { PlanogramSnapshot } from "../types/state";
import { IPlanogramReducer } from "../interfaces/IPlanogramReducer";
import { IActionReducer } from "../interfaces/IActionReducer";
import { ISnapshotProjector } from "../interfaces/ISnapshotProjector";

/**
 * FACADE - Coordinates Reducer + Projector
 * This is the primary implementation of IPlanogramReducer used by the SessionStore.
 * It separates the business logic of applying actions (reduction) from the
 * logic of generating renderable state (projection).
 */
export class PlanogramReducer implements IPlanogramReducer {
  constructor(
    private actionReducer: IActionReducer,
    private snapshotProjector: ISnapshotProjector,
  ) {}

  public async reduce(
    base: PlanogramConfig,
    actions: PlanogramAction[],
  ): Promise<PlanogramSnapshot> {
    // Step 1: Reduce actions to config (synchronous)
    // This applies business rules and validates actions against the L1 model.
    const derivedConfig = this.actionReducer.reduce(base, actions);

    // Step 2: Project config to snapshot (async)
    // This generates render instances, builds spatial indices, and runs L4 validation.
    const snapshot = await this.snapshotProjector.project(derivedConfig);

    // Step 3: Overlay session metadata
    // We enrich the snapshot with session-specific information derived from the action sequence.
    return {
      ...snapshot,
      session: {
        ...snapshot.session,
        isDirty: actions.length > 0,
        actionCount: actions.length,
      },
    };
  }
}
