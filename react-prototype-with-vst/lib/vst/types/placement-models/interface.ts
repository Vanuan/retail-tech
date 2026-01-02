/**
 * PLACEMENT MODEL INTERFACE
 * Translates semantic retail coordinates into physical 3D space.
 */

import { Vector2, Vector3 } from "../core/geometry";
import { Dimensions3D } from "../core/dimensions";
import { SemanticPosition, ExpansionIdentifier } from "../coordinates/semantic";
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
    dimensions: Dimensions3D,
    anchor: Vector2,
    identifier?: ExpansionIdentifier,
  ): Vector3;

  /**
   * Reverse translation function.
   * Converts fixture-relative millimeters back to retail logic.
   */
  project(worldPosition: Vector3, fixture: FixtureConfig): SemanticPosition;

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
