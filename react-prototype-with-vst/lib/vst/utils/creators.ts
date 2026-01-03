import {
  FacingConfig,
  ShelfSurfacePosition,
  PegboardGridPosition,
  Freeform3DPosition,
  BasketBinPosition,
  FacingCount,
  Millimeters,
  ShelfIndex,
  DepthLevel,
} from "@vst/vocabulary-types";

/**
 * Helper to create a FacingConfig.
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

/**
 * Helper to convert UI inputs (numbers) to Domain Types (Millimeters)
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
    gridSpacing: 25.4 as any, // Default to 1-inch standard
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
