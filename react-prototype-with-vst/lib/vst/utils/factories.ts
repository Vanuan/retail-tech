import {
  ShelfSurfacePosition,
  PegboardGridPosition,
  Freeform3DPosition,
  BasketBinPosition,
  Millimeters,
  ShelfIndex,
  DepthLevel,
  FacingConfig,
  FacingCount,
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
 * Helper to convert UI inputs (numbers) to Domain Types (Millimeters/Indices)
 * Useful when receiving raw numbers from forms or sliders.
 */
export function createShelfPosition(input: {
  x: number;
  shelfIndex: number;
  depth: number;
}): ShelfSurfacePosition {
  return {
    model: "shelf-surface",
    x: input.x as Millimeters,
    shelfIndex: input.shelfIndex as ShelfIndex,
    depth: input.depth as DepthLevel,
  };
}

/**
 * Helper to create a FacingConfig from raw numbers.
 */
export function createFacingConfig(
  horizontal: number,
  vertical: number = 1,
): FacingConfig {
  return {
    horizontal: horizontal as FacingCount,
    vertical: vertical as FacingCount,
  };
}
