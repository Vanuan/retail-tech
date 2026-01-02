import { RenderInstance } from "../../types";
import { Viewport, IRendererZLayerManager } from "../../types/renderer";

/**
 * RENDERER Z-LAYER MANAGER
 * Manages drawing order and depth on the target canvas/scene.
 * Consumes z-index properties calculated by the Core Layer.
 */
export class RendererZLayerManager implements IRendererZLayerManager {
  /**
   * Sorts instances by their final z-index for correct back-to-front rendering.
   */
  public sortByZIndex(instances: RenderInstance[]): RenderInstance[] {
    return [...instances].sort((a, b) => {
      // Use pre-calculated z-index from Core Layer
      const zA = a.zLayerProperties?.finalZIndex ?? 0;
      const zB = b.zLayerProperties?.finalZIndex ?? 0;

      // Lower z-index draws first (back to front)
      // This ensures that products at the back are drawn before
      // products in front of them.
      return zA - zB;
    });
  }

  /**
   * Apply advanced stacking context rules for special cases.
   * This can be used to isolate layers (e.g., all items on one shelf)
   * to apply group-level effects or optimizations.
   */
  public applyStackingContext(
    instances: RenderInstance[],
    viewport: Viewport,
  ): RenderInstance[] {
    // Group by shelf level
    const byShelf = this.groupByShelf(instances);

    // Sort shelf indices to process them in order
    const shelfIndices = Object.keys(byShelf)
      .map(Number)
      .sort((a, b) => a - b);

    // Apply shelf-specific rules
    return shelfIndices.flatMap((index) => {
      return this.applyShelfStacking(byShelf[index], viewport);
    });
  }

  /**
   * Groups instances by their semantic shelf index.
   */
  private groupByShelf(
    instances: RenderInstance[],
  ): Record<number, RenderInstance[]> {
    return instances.reduce(
      (groups: Record<number, RenderInstance[]>, instance) => {
        const shelfIndex = instance.semanticCoordinates?.shelfIndex ?? 0;
        if (!groups[shelfIndex]) {
          groups[shelfIndex] = [];
        }
        groups[shelfIndex].push(instance);
        return groups;
      },
      {},
    );
  }

  /**
   * Internal logic for handling overlapping items within a single shelf context.
   */
  private applyShelfStacking(
    instances: RenderInstance[],
    _viewport: Viewport,
  ): RenderInstance[] {
    // Standard shelf stacking: sort by facing depth
    // This provides a fallback if zIndex calculation didn't account for facing
    return [...instances].sort((a, b) => {
      const facingA = a.semanticCoordinates?.facing ?? 1;
      const facingB = b.semanticCoordinates?.facing ?? 1;

      // Items with higher facing numbers (deeper back) draw first
      // Assuming higher facing index = deeper in shelf
      return facingB - facingA;
    });
  }
}
