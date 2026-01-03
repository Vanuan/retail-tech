import {
  PlanogramConfig,
  RenderInstance,
  ValidationResult,
  ProductMetadata
} from "@vst/vocabulary-types";

/**
 * PLANOGRAM SNAPSHOT
 * The immutable result of projecting Actions onto a Base Config.
 * This object contains EVERYTHING the UI needs to render a frame.
 */
export interface PlanogramSnapshot {
  /**
   * The Derived L1 State
   * (Base Config + Applied Actions)
   */
  config: PlanogramConfig;

  /**
   * The Derived L4 Render State
   * (The "Pixel Truth" ready for Canvas/WebGL)
   */
  renderInstances: RenderInstance[];

  /**
   * The Verification State
   * (Collision checks, business rules)
   */
  validation: ValidationResult;

  /**
   * Session Metadata
   * Information about the state of the editor itself
   */
  session: {
    isDirty: boolean;
    actionCount: number;
    lastActionId?: string;
    selection?: string[];
    timestamp: number;
  };

  /**
   * Lookup Maps
   * optimises UI interaction (hover/click) without array scans
   */
  indices: {
    productById: Map<string, RenderInstance>;
    metadataBySku: Map<string, ProductMetadata>;
  };
}
