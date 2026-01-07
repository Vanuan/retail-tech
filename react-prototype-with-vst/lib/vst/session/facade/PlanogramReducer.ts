import {
  PlanogramConfig,
  ICoreProcessor,
  ProductMetadata,
  ValidationResult,
} from "@vst/vocabulary-types";
import { PlanogramAction } from "../types/actions";
import { PlanogramSnapshot } from "../types/state";
import { IPlanogramReducer } from "../interfaces/IPlanogramReducer";
import { ISnapshotProjector } from "../interfaces/ISnapshotProjector";

/**
 * FACADE - Coordinates Reducer + Projector
 * This is the primary implementation of IPlanogramReducer used by the SessionStore.
 * It separates the business logic of applying actions (reduction) from the
 * logic of generating renderable state (projection).
 */
export class PlanogramReducer implements IPlanogramReducer {
  constructor(
    private processor: ICoreProcessor,
    private snapshotProjector: ISnapshotProjector,
    private metadata: Map<string, ProductMetadata>,
  ) {}

  public async reduce(
    base: PlanogramConfig,
    actions: PlanogramAction[],
  ): Promise<PlanogramSnapshot> {
    // Step 1: Apply actions with validation using the Core Processor (Single Source of Truth)
    // This replaces the duplicated logic in CoreActionReducer.
    const { config: derivedConfig, results } =
      this.processor.applyActionsWithValidation(base, actions, this.metadata);

    // Step 2: Project config to snapshot (async)
    // This generates render instances, builds spatial indices, and runs L4 validation.
    const snapshot = await this.snapshotProjector.project(derivedConfig);

    // Step 3: Merge validation from reduction and projection phases
    const failedActions = results.filter((r) => !r.applied);
    const validation: ValidationResult = {
      ...snapshot.validation,
      valid: snapshot.validation.valid && failedActions.length === 0,
      errors: [
        ...snapshot.validation.errors,
        ...failedActions.flatMap((r) => r.validation.errors),
      ],
      warnings: [
        ...(snapshot.validation.warnings || []),
        ...results.flatMap((r) => r.validation.warnings || []),
      ],
    };

    // Step 4: Overlay session metadata
    // We enrich the snapshot with session-specific information derived from the action sequence.
    return {
      ...snapshot,
      validation,
      session: {
        ...snapshot.session,
        isDirty: actions.length > 0,
        actionCount: actions.length,
      },
    };
  }
}
