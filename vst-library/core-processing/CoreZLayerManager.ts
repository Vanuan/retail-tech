import { RenderInstance, ZIndex, FixtureConfig } from "@vst/vocabulary-types";
import { isShelfSurfacePosition } from "@vst/vocabulary-logic";
import { IPlacementModel } from "@vst/placement-core";

/**
 * CORE Z-LAYER MANAGER
 * Calculates final zIndex with shelf/facing bonuses.
 * This ensures correct draw order (back-to-front) in 2D rendering contexts.
 */
export class CoreZLayerManager {
  /**
   * Calculates the z-index for an instance based on its semantic position and physical depth.
   */
  async process(
    instance: RenderInstance,
    fixture: FixtureConfig,
    placementModel: IPlacementModel,
  ): Promise<RenderInstance> {
    let shelfIndex = 0;
    if (isShelfSurfacePosition(instance.semanticCoordinates)) {
      shelfIndex = instance.semanticCoordinates.shelfIndex;
    }

    // Base z-index calculation
    // We use large offsets to ensure layers don't overlap unexpectedly.
    // In standard 2D renderers, higher Z renders ON TOP.
    let calculatedZIndex = 0;

    // 1. Shelf contribution: higher shelves render above lower shelves in a typical 2D view
    calculatedZIndex += shelfIndex * 1000;

    // 2. Depth contribution: front items (depthRatio 0) must render ON TOP of back items (depthRatio 1).
    // We subtract the depth contribution from the shelf base.
    const depthContribution = Math.floor((1 - instance.depthRatio) * 500);
    calculatedZIndex += depthContribution;

    // 3. Promotional/Priority bonus: these should slightly lift the product within its layer
    if (instance.sourceData.pricing?.promotionalPrice) {
      calculatedZIndex += 5;
    }

    const zIndex = calculatedZIndex as ZIndex;

    return {
      ...instance,
      zIndex,
      zLayerProperties: {
        baseZ: zIndex,
        shelfContribution: shelfIndex * 1000,
        facingContribution: 0, // Horizontal overlap is typically avoided or handled by draw order
        depthContribution,
        finalZIndex: zIndex,
      },
    };
  }
}
