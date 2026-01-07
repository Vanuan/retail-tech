/**
 * BASKET / BIN PLACEMENT MODEL
 * Implementation of the container-based positioning strategy.
 */

import {
  Vector2,
  Vector3,
  Dimensions3D,
  SemanticPosition,
  ExpansionIdentifier,
  FixtureConfig,
  BasketBinPosition,
} from "@vst/vocabulary-types";
import { IPlacementModel, PlacementModelProperties } from "@vst/placement-core";
import {
  isBasketBinPosition,
  createBasketBinPosition,
} from "@vst/vocabulary-logic";

export class BasketBinPlacementModel implements IPlacementModel {
  public readonly id = "basket-bin";
  public readonly name = "Basket / Bin Container";

  public readonly properties: PlacementModelProperties = {
    supportsFacings: false,
    supportsShelves: false,
  };

  /**
   * Translates basket bin coordinates to 3D world space.
   *
   * Logic:
   * - Slots are typically discrete areas within a container.
   * - This basic implementation assumes slots are spaced 100mm apart.
   */
  public transform(
    pos: SemanticPosition,
    _fixture: FixtureConfig,
    _productDims: Dimensions3D,
    _anchor: Vector2,
    _identifier?: ExpansionIdentifier,
  ): Vector3 {
    if (!isBasketBinPosition(pos)) {
      return { x: 0, y: 0, z: 0 };
    }

    // Basic implementation: slots are 100mm apart horizontally by default
    const slotWidth = 100;
    const x = pos.slotIndex * slotWidth + (pos.offset?.x || 0);
    const y = pos.offset?.y || 0;
    const z = 0;

    return { x, y, z };
  }

  /**
   * Translates 3D world space coordinates back to basket bin coordinates.
   */
  public project(worldPos: Vector3, _fixture: FixtureConfig): SemanticPosition {
    const slotWidth = 100;
    return createBasketBinPosition({
      containerId: "default-bin",
      slotIndex: Math.floor(worldPos.x / slotWidth),
      offset: { x: worldPos.x % slotWidth, y: worldPos.y },
    }) as BasketBinPosition;
  }
}
