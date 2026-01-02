/**
 * PLACEMENT MODEL INTERFACE
 * Translates semantic retail coordinates into physical 3D space.
 */

import { Vector3 } from "../core/geometry";
import { SemanticPosition } from "../coordinates/semantic";
import { FixtureConfig } from "../planogram/config";

export interface IPlacementModel {
  /** Unique model identifier (e.g., "shelf-surface") */
  id: string;
  
  /** Human-readable name */
  name: string;
  
  /** 
   * Primary translation function.
   * Converts retail logic into fixture-relative millimeters.
   */
  transform(
    position: SemanticPosition,
    fixture: FixtureConfig,
  ): Vector3;
  
  /** Capability flags for this model */
  properties: PlacementModelProperties;
}

export interface PlacementModelProperties {
  /** Whether this model supports horizontal/vertical facings */
  supportsFacings: boolean;
  
  /** Whether this model uses discrete shelf levels */
  supportsShelves: boolean;
  
  /** Whether this model supports tapered pyramid stacking */
  supportsPyramids?: boolean;
  
  /** Model-specific metadata */
  [key: string]: unknown;
}
