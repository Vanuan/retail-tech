import { PyramidConfig, RenderInstance, Vector3 } from "../types/index";

/**
 * PYRAMID BUILDER (Layer 3)
 * Generates stacked instances for display items (e.g., stacked cans or fruit).
 * This component implements the "narrowing" effect where upper layers have
 * fewer items than the base, creating a pyramid or stack formation.
 */
export class PyramidBuilder {
  /**
   * Generates a list of 3D offsets for each instance in the pyramid stack.
   * @param instance The base RenderInstance template.
   * @returns An array of Vector3 offsets (in millimeters).
   */
  public calculateStackOffsets(instance: RenderInstance): Vector3[] {
    const { pyramidData, physicalDimensions } = instance;

    // If no pyramid data is provided, return a single instance at origin
    if (!pyramidData) {
      return [{ x: 0, y: 0, z: 0 }];
    }

    const offsets: Vector3[] = [];

    const {
      layers,
      baseFacings,
      horizontalDecrement,
      verticalIncrement,
      alignment = "center",
      depthShift = 0,
      verticalGap = 0,
    } = pyramidData;

    let currentY = 0;
    const baseWidth = baseFacings.horizontal * physicalDimensions.width;

    for (let l = 0; l < layers; l++) {
      const itemsWide = Math.max(
        1,
        baseFacings.horizontal - l * horizontalDecrement,
      );
      const itemsHigh = Math.max(
        1,
        baseFacings.vertical + l * verticalIncrement,
      );

      const layerWidth = itemsWide * physicalDimensions.width;
      const offsetZ = l * depthShift;

      let startX = 0;
      if (alignment === "center") {
        startX = (baseWidth - layerWidth) / 2;
      } else if (alignment === "right") {
        startX = baseWidth - layerWidth;
      }

      for (let v = 0; v < itemsHigh; v++) {
        const offsetY = currentY + v * physicalDimensions.height;
        for (let h = 0; h < itemsWide; h++) {
          offsets.push({
            x: startX + h * physicalDimensions.width,
            y: offsetY,
            z: offsetZ,
          });
        }
      }

      currentY += itemsHigh * physicalDimensions.height + verticalGap;
    }

    return offsets;
  }

  /**
   * Helper to determine total instances required for a pyramid configuration.
   */
  public calculateTotalInstances(pyramidData: PyramidConfig | null): number {
    if (!pyramidData) return 1;

    const { layers, baseFacings, horizontalDecrement, verticalIncrement } =
      pyramidData;

    let total = 0;
    for (let l = 0; l < layers; l++) {
      const itemsWide = Math.max(
        1,
        baseFacings.horizontal - l * horizontalDecrement,
      );
      const itemsHigh = Math.max(
        1,
        baseFacings.vertical + l * verticalIncrement,
      );
      total += itemsWide * itemsHigh;
    }
    return total;
  }
}
