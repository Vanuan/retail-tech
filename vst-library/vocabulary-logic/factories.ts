/**
 * VOCABULARY FACTORIES
 * Helper functions for creating semantic positions and configurations
 * with sensible defaults.
 */

import {
  ShelfSurfacePosition,
  PegboardGridPosition,
  Freeform3DPosition,
  BasketBinPosition,
  FacingConfig,
  FacingCount,
  Millimeters
} from "@vst/vocabulary-types";

/**
 * Creates a shelf surface position with sensible defaults.
 */
export function createShelfSurfacePosition(
  params: Omit<ShelfSurfacePosition, "model">,
): ShelfSurfacePosition {
  return {
    model: "shelf-surface",
    ...params,
  };
}

/**
 * Creates a pegboard grid position with sensible defaults.
 */
export function createPegboardGridPosition(
  params: Omit<PegboardGridPosition, "model">,
): PegboardGridPosition {
  return {
    model: "pegboard-grid",
    gridSpacing: 25.4 as Millimeters, // Default to 1-inch standard
    ...params,
  };
}

/**
 * Creates a freeform 3D position.
 */
export function createFreeform3DPosition(
  params: Omit<Freeform3DPosition, "model">,
): Freeform3DPosition {
  return {
    model: "freeform-3d",
    ...params,
  };
}

/**
 * Creates a basket/bin position.
 */
export function createBasketBinPosition(
  params: Omit<BasketBinPosition, "model">,
): BasketBinPosition {
  return {
    model: "basket-bin",
    ...params,
  };
}

/**
 * Helper to create a FacingConfig with derived total.
 */
export function createFacingConfig(
  horizontal: number,
  vertical: number = 1
): FacingConfig {
  return {
    horizontal: horizontal as FacingCount,
    vertical: vertical as FacingCount,
  };
}
