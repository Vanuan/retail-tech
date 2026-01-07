/**
 * SHELF SURFACE PLACEMENT MODEL
 * Implementation of the standard shelf-based positioning strategy.
 */

import {
  Vector2,
  Vector3,
  Dimensions3D,
  SemanticPosition,
  ExpansionIdentifier,
  ShelfSurfacePosition,
  FixtureConfig,
  Millimeters,
  ShelfIndex,
  DepthLevel,
} from "@vst/vocabulary-types";
import { IPlacementModel, PlacementModelProperties } from "@vst/placement-core";
import { isShelfSurfacePosition } from "@vst/vocabulary-logic";

export class ShelfSurfacePlacementModel implements IPlacementModel {
  public readonly id = "shelf-surface";
  public readonly name = "Shelf Surface";

  public readonly properties: PlacementModelProperties = {
    supportsFacings: true,
    supportsShelves: true,
    supportsPyramids: true,
  };

  /**
   * Translates shelf-surface semantic coordinates to 3D world space.
   *
   * Logic:
   * - X: position.x + (facingX * productWidth)
   * - Y: shelf.baseHeight + (facingY * productHeight) + yOffset
   * - Z: position.depth * depthSpacing (conventionally deep)
   */
  public transform(
    position: SemanticPosition,
    fixture: FixtureConfig,
    dimensions: Dimensions3D,
    anchor: Vector2,
    identifier?: ExpansionIdentifier,
  ): Vector3 {
    if (!isShelfSurfacePosition(position)) {
      throw new Error(
        `Invalid position model for ShelfSurfacePlacementModel: ${position.model}`,
      );
    }

    const shelfPos = position as ShelfSurfacePosition;
    const shelves =
      (fixture.config.shelves as Array<{
        index: number;
        baseHeight: number;
      }>) || [];
    const shelf = shelves.find((s) => s.index === shelfPos.shelfIndex);

    if (!shelf && shelves.length > 0) {
      console.warn(
        `Shelf index ${shelfPos.shelfIndex} not found in fixture config.`,
      );
    }

    const facingX = identifier?.facingX ?? 0;
    const facingY = identifier?.facingY ?? 0;

    // Calculate world coordinates using the provided anchor.
    // This ensures that the semantic 'shelfPos.x' remains the left edge
    // regardless of whether the rendering engine uses center or edge anchors.
    // Note: anchor.y = 1.0 usually means bottom in 2D systems, so we use (1 - anchor.y)
    // to align with World Space where Y increases upwards.
    const x = (shelfPos.x + (facingX + anchor.x) * dimensions.width) as number;
    const y = ((shelf?.baseHeight ?? 0) +
      (facingY + 1 - anchor.y) * dimensions.height +
      (shelfPos.yOffset ?? 0)) as number;

    // Z-axis usually represents depth layers or depth from the front of the shelf
    // In this implementation, we use the fixture's depthSpacing for visual depth levels
    const depthSpacing = (fixture.config.depthSpacing as number) ?? 300;
    const z = (shelfPos.depth * depthSpacing) as number;

    return { x, y, z };
  }

  /**
   * Translates 3D world space coordinates back to shelf-surface semantic coordinates.
   */
  public project(
    worldPosition: Vector3,
    fixture: FixtureConfig,
  ): SemanticPosition {
    const shelves =
      (fixture.config.shelves as Array<{
        index: number;
        baseHeight: number;
      }>) || [];

    // Find closest shelf by Y coordinate
    let closestShelfIndex = 0;
    let minDistance = Number.POSITIVE_INFINITY;

    shelves.forEach((shelf) => {
      const distance = Math.abs(worldPosition.y - shelf.baseHeight);
      if (distance < minDistance) {
        minDistance = distance;
        closestShelfIndex = shelf.index;
      }
    });

    const depthSpacing = (fixture.config.depthSpacing as number) ?? 300;
    const depth = Math.max(0, Math.round(worldPosition.z / depthSpacing));

    return {
      model: "shelf-surface",
      x: Math.max(0, worldPosition.x) as Millimeters,
      shelfIndex: closestShelfIndex as ShelfIndex,
      depth: depth as DepthLevel,
    } as ShelfSurfacePosition;
  }
}
