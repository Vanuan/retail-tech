/**
 * FREEFORM 3D PLACEMENT MODEL
 * Implementation of the absolute XYZ positioning strategy.
 */

import {
  Vector2,
  Vector3,
  Dimensions3D,
  SemanticPosition,
  ExpansionIdentifier,
  FixtureConfig,
  Freeform3DPosition,
} from "@vst/vocabulary-types";
import { IPlacementModel, PlacementModelProperties } from "@vst/placement-core";
import {
  isFreeform3DPosition,
  createFreeform3DPosition,
} from "@vst/vocabulary-logic";

export class Freeform3DPlacementModel implements IPlacementModel {
  public readonly id = "freeform-3d";
  public readonly name = "Freeform 3D Placement";

  public readonly properties: PlacementModelProperties = {
    supportsFacings: false,
    supportsShelves: false,
  };

  /**
   * Translates freeform 3D coordinates to 3D world space.
   */
  public transform(
    pos: SemanticPosition,
    _fixture: FixtureConfig,
    _productDims: Dimensions3D,
    _anchor: Vector2,
    _identifier?: ExpansionIdentifier,
  ): Vector3 {
    if (!isFreeform3DPosition(pos)) {
      return { x: 0, y: 0, z: 0 };
    }
    return { ...pos.position };
  }

  /**
   * Translates 3D world space coordinates back to freeform 3D coordinates.
   */
  public project(worldPos: Vector3, _fixture: FixtureConfig): SemanticPosition {
    return createFreeform3DPosition({
      position: worldPos,
    }) as Freeform3DPosition;
  }
}
