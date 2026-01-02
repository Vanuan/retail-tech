import { PlanogramConfig } from "./planogram/config";
import { ValidationResult } from "./validation";
import { ProductMetadata } from "./planogram/metadata";
import { RenderInstance } from "./rendering/instance";

/**
 * LIFECYCLE STAGE 1: INPUT
 * User intent / Database storage format
 */
export namespace L1 {
  export type Config = PlanogramConfig;
}

/**
 * LIFECYCLE STAGE 2: VALIDATION
 * Physics and Logic checks
 */
export namespace L2 {
  export type Result = ValidationResult;
}

/**
 * LIFECYCLE STAGE 3: ENRICHMENT
 * Input + Database Metadata
 */
export namespace L3 {
  // Can be an alias, or a specific composite type
  export interface EnrichedProduct {
    source: L1.Config["products"][0];
    metadata: ProductMetadata;
  }
}

/**
 * LIFECYCLE STAGE 4: RENDER
 * Screen-ready data
 */
export namespace L4 {
  export type Instance = RenderInstance;
}
