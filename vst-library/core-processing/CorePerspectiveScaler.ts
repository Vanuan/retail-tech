import { RenderInstance } from "../types";

/**
 * CORE PERSPECTIVE SCALER
 * Calculates renderScale and depthRatio based on physical depth within the fixture.
 * Standard implementation: Front-row: 100%, Back-row: 92% (8% reduction)
 */
export class CorePerspectiveScaler {
  /**
   * Processes the instance to determine its scale based on depth.
   */
  async process(instance: RenderInstance): Promise<RenderInstance> {
    const { z, depth = 0 } = instance.semanticCoordinates;
    const maxDepth = instance.fixture.dimensions.depth || 400;

    // Calculate depth ratio (0.0 = front, 1.0 = back)
    // Prioritize absolute Z (mm) if available.
    // Otherwise, estimate physical depth using logical row index and product depth.
    let physicalDepth =
      z !== undefined ? z : depth * (instance.physicalDimensions.depth || 100);

    // Add expansion offset Z (used in pyramid stacking)
    if (instance.expansionOffset?.z) {
      physicalDepth += instance.expansionOffset.z;
    }

    const depthRatio = Math.min(1.0, Math.max(0.0, physicalDepth / maxDepth));

    // Apply perspective scaling logic
    const renderScale = this.calculatePerspectiveScale(depthRatio);

    return {
      ...instance,
      depthRatio,
      renderScale,
      scaledDimensions: {
        width: instance.visualDimensions.width * renderScale,
        height: instance.visualDimensions.height * renderScale,
        depth: instance.physicalDimensions.depth * renderScale,
      },
      visualProperties: {
        ...instance.visualProperties,
        isFrontRow: depthRatio < 0.33,
        isMiddleRow: depthRatio >= 0.33 && depthRatio <= 0.66,
        isBackRow: depthRatio > 0.66,
        depthCategory: this.getDepthCategory(depthRatio),
      },
    };
  }

  /**
   * Performs linear interpolation for scale based on depth.
   * Front (depthRatio 0): 100% scale
   * Back (depthRatio 1): 92% scale
   */
  private calculatePerspectiveScale(depthRatio: number): number {
    const frontScale = 1.0;
    const backScale = 0.92;

    return frontScale - depthRatio * (frontScale - backScale);
  }

  /**
   * Categorizes depth into semantic buckets.
   */
  private getDepthCategory(depthRatio: number): "front" | "middle" | "back" {
    if (depthRatio < 0.33) return "front";
    if (depthRatio < 0.66) return "middle";
    return "back";
  }
}
