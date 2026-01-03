import { PlanogramConfig } from "../planogram/config";
import { ProductMetadata } from "../planogram/metadata";
import { ProcessedPlanogram } from "../rendering/engine";

/**
 * Core projection contract.
 * Translates L1 + L3 into an L4 ProcessedPlanogram.
 *
 * This is a pure capability contract.
 * No guarantees about sync/async, caching, or validation depth.
 */
export interface ICoreProcessor {
  process(input: CoreProcessInput): ProcessedPlanogram;
}

export interface CoreProcessInput {
  readonly config: PlanogramConfig;
  readonly metadata: ReadonlyMap<string, ProductMetadata>;
}
