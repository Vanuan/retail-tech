/**
 * PEGBOARD GRID PLACEMENT MODEL
 * Implementation of the discrete hole-based positioning strategy (e.g., Pegboard, Slatwall).
 */

import {
  Vector2,
  Vector3,
  Dimensions3D,
  SemanticPosition,
  ExpansionIdentifier,
  FixtureConfig,
  PegboardGridPosition,
} from "@vst/vocabulary-types";
import { IPlacementModel, PlacementModelProperties } from "@vst/placement-core";
import {
  isPegboardGridPosition,
  createPegboardGridPosition,
} from "@vst/vocabulary-logic";

export class PegboardGridPlacementModel implements IPlacementModel {
  public readonly id = "pegboard-grid";
  public readonly name = "Pegboard / Slatwall";

  public readonly properties: PlacementModelProperties = {
    supportsFacings: false, // Grid positions usually imply specific discrete slots
    supportsShelves: false,
  };

  /**
   * Translates pegboard grid coordinates to 3D world space.
   */
  public transform(
    pos: SemanticPosition,
    _fixture: FixtureConfig,
    _productDims: Dimensions3D,
    _anchor: Vector2,
    _identifier?: ExpansionIdentifier,
  ): Vector3 {
    if (!isPegboardGridPosition(pos)) {
      return { x: 0, y: 0, z: 0 };
    }

    const spacing = pos.gridSpacing || 25.4;

    // Calculate absolute position based on grid indices
    // holeX and holeY represent the coordinate on the pegboard grid
    const x = pos.holeX * spacing;
    const y = pos.holeY * spacing;
    const z = 0; // Pegboard items are usually flush or have hook offsets handled by sprite anchor

    return { x, y, z };
  }

  /**
   * Translates 3D world space coordinates back to pegboard grid coordinates.
   */
  public project(worldPos: Vector3, _fixture: FixtureConfig): SemanticPosition {
    const spacing = 25.4; // Default to 1-inch standard
    return createPegboardGridPosition({
      holeX: Math.round(worldPos.x / spacing),
      holeY: Math.round(worldPos.y / spacing),
    }) as PegboardGridPosition;
  }
}
