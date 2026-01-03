import { RenderInstance, FixtureConfig } from "@vst/vocabulary-types";
import { IPlacementModel } from "@vst/placement-core";

/**
 * MASK REQUIRED CHECKER
 * Determines if a mask is needed based on product shape and transparency.
 * Masks are used in rendering to cut out or define the shape of a sprite,
 * especially for non-rectangular products or those with transparency.
 */
export class MaskRequiredChecker {
  /**
   * Processes the instance to determine mask properties.
   */
  async process(
    instance: RenderInstance,
    _fixture: FixtureConfig,
    _placementModel: IPlacementModel,
  ): Promise<RenderInstance> {
    const needsMask = this.determineIfMaskNeeded(instance);

    return {
      ...instance,
      maskProperties: {
        required: needsMask,
        maskUrl: needsMask ? instance.assets.maskUrl : null,
        transparency:
          instance.metadata.visualProperties?.hasTransparency || false,
        maskType: this.getMaskType(instance),
        // 'destination-in' is a common composite operation for masking,
        // where the destination (the sprite) is only visible where the source (the mask) is opaque.
        compositeOperation: "destination-in",
      },
    };
  }

  /**
   * Logic to decide if a product requires a mask for rendering.
   * This is based on product category and visual properties like transparency.
   */
  private determineIfMaskNeeded(instance: RenderInstance): boolean {
    const productCategory = instance.metadata.classification?.category;

    // Define product categories that generally require masks
    const categoriesNeedingMask = [
      "bottles",
      "jars",
      "irregular-shapes",
      "organic-produce",
      "clothing",
      "soft-goods",
      "bags",
    ];

    // Define product categories that typically DO NOT require masks (e.g., simple boxes)
    const categoriesNotNeedingMask = [
      "boxes",
      "cubes",
      "rectangular",
      "cartons",
      "packaged-goods",
      "canned-goods",
    ];

    // If it falls into a category that explicitly doesn't need a mask, return false.
    if (
      categoriesNotNeedingMask.some((cat) => productCategory?.includes(cat))
    ) {
      return false;
    }

    // If it falls into a category that typically needs a mask, or if it has transparency, return true.
    return (
      (categoriesNeedingMask.some((cat) => productCategory?.includes(cat)) ||
        instance.metadata.visualProperties?.hasTransparency) ??
      false
    );
  }

  /**
   * Determines the type of mask required based on product characteristics.
   */
  private getMaskType(
    instance: RenderInstance,
  ): "alpha-channel" | "silhouette" | "outline" {
    // If the product has transparency metadata, we'll use an alpha-channel mask.
    if (instance.metadata.visualProperties?.hasTransparency) {
      return "alpha-channel";
    }

    const productCategory = instance.metadata.classification?.category;

    // Specific categories like bottles/jars might use silhouette masks.
    if (
      productCategory?.includes("bottle") ||
      productCategory?.includes("jar")
    ) {
      return "silhouette";
    }

    // Default to an outline mask for other shaped products.
    return "outline";
  }
}
