/**
 * @vst/placement-models
 *
 * Concrete implementations of VST placement models.
 * This package provides the logic for translating semantic retail
 * coordinates into physical 3D space for various fixture types.
 */

export * from "./ShelfSurfacePlacementModel";
export * from "./PegboardGridPlacementModel";
export * from "./Freeform3DPlacementModel";
export * from "./BasketBinPlacementModel";
export * from "./PlacementModelRegistry";

import { PlacementModelRegistry } from "./PlacementModelRegistry";

/**
 * Global singleton instance for the placement model registry.
 * Provides access to standard retail placement strategies.
 */
export const placementRegistry = new PlacementModelRegistry();
