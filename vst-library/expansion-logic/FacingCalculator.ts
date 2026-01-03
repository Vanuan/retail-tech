import { RenderInstance, Vector2 } from "@vst/vocabulary-types";

/**
 * FACING CALCULATOR (Layer 3)
 * Calculates individual offsets for each horizontal and vertical facing.
 * This is used during the expansion phase to position multiple instances
 * derived from a single semantic placement.
 */
export class FacingCalculator {
  /**
   * Calculates the coordinate offset for a specific facing index.
   * @param instance The base RenderInstance template.
   * @param hIndex Horizontal facing index (0 to facingData.horizontal - 1).
   * @param vIndex Vertical facing index (0 to facingData.vertical - 1).
   * @returns A Vector2 representing the X and Y offset in millimeters.
   */
  public calculateFacingOffset(
    instance: RenderInstance,
    hIndex: number,
    vIndex: number,
  ): Vector2 {
    const { physicalDimensions, facingData } = instance;

    if (!facingData) {
      return { x: 0, y: 0 };
    }

    // Horizontal offset: Each facing is shifted by its physical width.
    // In retail logic, facings usually expand to the right.
    const offsetX = hIndex * physicalDimensions.width;

    // Vertical offset: Each vertical facing is shifted by its physical height.
    // Note: In 2D planogram space, Y often grows upwards from the shelf base.
    const offsetY = vIndex * physicalDimensions.height;

    return {
      x: offsetX,
      y: offsetY,
    };
  }

  /**
   * Calculates a scale factor if multiple facings must fit into a constrained width.
   * @param totalWidthAvailable The width of the shelf/fixture section.
   * @param instance The instance being expanded.
   * @returns A scale multiplier (default 1.0).
   */
  public calculateFacingScale(
    totalWidthAvailable: number,
    instance: RenderInstance,
  ): number {
    const { physicalDimensions, facingData } = instance;
    if (!facingData || facingData.horizontal <= 1) return 1.0;

    const requiredWidth = physicalDimensions.width * facingData.horizontal;

    // If the facings exceed available space, we might need to downscale
    // However, usually retail logic involves "overflow" or "clipping" rather than scaling,
    // but some visualizers prefer fitting.
    if (requiredWidth > totalWidthAvailable && totalWidthAvailable > 0) {
      return totalWidthAvailable / requiredWidth;
    }

    return 1.0;
  }
}
