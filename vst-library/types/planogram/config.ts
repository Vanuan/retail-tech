/**
 * PLANOGRAM CONFIGURATION
 * High-level structure of a planogram and its fixtures.
 */

import { Dimensions3D } from "../core/dimensions";
import { SourceProduct } from "./product";

/**
 * FixtureConfig
 * Defines the physical structure where products are placed.
 */
export interface FixtureConfig {
  /** Fixture type identifier (e.g., "gondola", "pegboard") */
  type: string;
  
  /** The translation strategy to use (e.g., "shelf-surface") */
  placementModel: string;
  
  /** Physical bounding box */
  dimensions: Dimensions3D;
  
  /** Model-specific configuration (e.g., shelf heights) */
  config: Record<string, unknown>;
  
  /** Optional visual background */
  background?: FixtureBackground;
}

export interface FixtureBackground {
  color?: string;
  imageUrl?: string;
}

/**
 * PlanogramConfig (L1)
 * The top-level input data for the system.
 */
export interface PlanogramConfig {
  fixture: FixtureConfig;
  products: SourceProduct[];
}
