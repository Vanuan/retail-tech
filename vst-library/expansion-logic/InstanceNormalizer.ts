import { RenderInstance, Vector3 } from "@vst/vocabulary-types";
import { FacingCalculator } from "./FacingCalculator";
import { PyramidBuilder } from "./PyramidBuilder";

/**
 * INSTANCE NORMALIZER (Layer 3)
 * The entry point for Layer 3 processing. It orchestrates the expansion of a
 * single semantic product placement into N render-ready instances.
 *
 * It transforms one "source product" placement into multiple physical instances
 * that account for facings (horizontal/vertical) and stacking (pyramids).
 */
export class InstanceNormalizer {
  private facingCalculator: FacingCalculator;
  private pyramidBuilder: PyramidBuilder;

  constructor() {
    this.facingCalculator = new FacingCalculator();
    this.pyramidBuilder = new PyramidBuilder();
  }

  /**
   * Normalizes a base template into multiple instances based on facing and pyramid data.
   * @param template - The initial RenderInstance generated from raw source data.
   * @returns An array of RenderInstance objects with unique IDs and calculated offsets.
   */
  public normalize(template: RenderInstance): RenderInstance[] {
    // 1. Pyramid Expansion (e.g., stacked cans, fruit piles)
    // Pyramid logic often defines a complex 3D structure that supercedes simple grid facings.
    if (template.pyramidData) {
      return this.expandPyramid(template);
    }

    // 2. Facing Expansion (Standard horizontal/vertical grid facings)
    if (
      template.facingData &&
      (template.facingData.horizontal > 1 || template.facingData.vertical > 1)
    ) {
      return this.expandFacings(template);
    }

    // 3. Fallback: No expansion needed (Single instance)
    return [template];
  }

  /**
   * Expands an instance based on horizontal and vertical facing counts.
   */
  private expandFacings(template: RenderInstance): RenderInstance[] {
    const instances: RenderInstance[] = [];
    const { horizontal, vertical } = template.facingData!;

    for (let v = 0; v < vertical; v++) {
      for (let h = 0; h < horizontal; h++) {
        // Calculate the coordinate offset for this specific facing in millimeters
        const offset = this.facingCalculator.calculateFacingOffset(
          template,
          h,
          v,
        );

        // Create a deep clone to prevent state sharing between instances.
        // RenderInstance is a pure data structure at this stage.
        const instance: RenderInstance = JSON.parse(JSON.stringify(template));

        // Generate a unique ID following the architectural pattern: parentID_hH_vV
        instance.id = `${template.id}_h${h}_v${v}`;

        // Update semantic coordinates to reflect this specific facing's position for metadata/analytics
        // Since semanticCoordinates are readonly, we would typically handle expansion indices
        // in a dedicated metadata field or via the expansionOffset.

        // Attach the expansion offset for use by the CoreProductPositioner
        // This offset is added to the base coordinates during final rendering position calculation.
        instance.expansionOffset = {
          x: offset.x,
          y: offset.y,
          z: 0,
        };

        instances.push(instance);
      }
    }

    return instances;
  }

  /**
   * Expands an instance based on pyramid stacking logic.
   */
  private expandPyramid(template: RenderInstance): RenderInstance[] {
    const offsets = this.pyramidBuilder.calculateStackOffsets(template);

    return offsets.map((offset: Vector3, index: number) => {
      const instance: RenderInstance = JSON.parse(JSON.stringify(template));

      // Generate a unique ID: parentID_pIndex
      instance.id = `${template.id}_p${index}`;

      // Attach the expansion offset (which includes depth/Z shifts for the pyramid effect)
      instance.expansionOffset = offset;

      return instance;
    });
  }
}
