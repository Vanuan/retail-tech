import {
  RenderInstance,
  RenderBounds,
  Vector2,
  Vector3,
  FixtureConfig,
  ZIndex,
  Degrees,
  Pixels,
} from "@vst/vocabulary-types";
import { IPlacementModel } from "@vst/placement-core";

/**
 * CORE PRODUCT POSITIONER
 * Calculates final renderCoordinates & bounds using PlacementModel.
 * This component handles the mapping from semantic shelf positions to
 * specific screen/world coordinates, accounting for perspective scaling.
 */
export class CoreProductPositioner {
  /**
   * Processes the instance to calculate its final coordinates and bounds.
   */
  async process(
    instance: RenderInstance,
    fixture: FixtureConfig,
    placementModel: IPlacementModel,
  ): Promise<RenderInstance> {
    // 1. Transform semantic coordinates to base render coordinates using the Placement Model
    // These coordinates are typically in fixture-space (e.g., mm or normalized units)
    const basePos: Vector3 = placementModel.transform(
      instance.semanticCoordinates,
      fixture,
      instance.physicalDimensions,
      instance.anchorPoint,
    );

    // 1.1 Apply Layer 3 expansion offsets (Facings & Pyramids)
    // These offsets were calculated during the InstanceNormalizer phase.
    const expansionOffset: Vector3 = instance.expansionOffset || {
      x: 0,
      y: 0,
      z: 0,
    };

    const finalBasePos: Vector3 = {
      x: basePos.x + (expansionOffset.x || 0),
      y: basePos.y + (expansionOffset.y || 0),
      z: basePos.z + (expansionOffset.z || 0),
    };

    // 2. Apply perspective scaling to the position
    // As items move "back" in depth, their visual footprint shifts
    const scaledCoords = this.applyScaling(finalBasePos, instance);

    // 3. Calculate precise bounds for rendering (AABB)
    const bounds = this.calculateBounds(scaledCoords);

    // 4. Calculate baseline (the point where the product "sits" on the shelf surface)
    const baseline = this.calculateBaseline(instance, scaledCoords);

    return {
      ...instance,
      renderCoordinates: {
        x: scaledCoords.x as Pixels,
        y: scaledCoords.y as Pixels,
        z: finalBasePos.z as ZIndex,
        baseline,
        anchorPoint: instance.anchorPoint,
        rotation: 0 as Degrees, // Base rotation, can be modified by renderer layer
        scale: instance.renderScale,
      },
      renderBounds: bounds,
      collisionBounds: this.calculateCollisionBounds(bounds, instance),
    };
  }

  /**
   * Adjusts the position based on the calculated render scale and anchor point.
   */
  private applyScaling(basePos: Vector3, instance: RenderInstance) {
    const scaledWidth = instance.visualDimensions.width * instance.renderScale;
    const scaledHeight =
      instance.visualDimensions.height * instance.renderScale;

    // Use anchor points for positional offset (defaults to bottom-center)
    const anchorX = instance.anchorPoint.x;
    const anchorY = instance.anchorPoint.y;

    // Calculate the shift required to keep the product anchored correctly after scaling
    const offsetX = (instance.visualDimensions.width - scaledWidth) * anchorX;
    const offsetY = (instance.visualDimensions.height - scaledHeight) * anchorY;

    return {
      x: basePos.x + offsetX,
      y: basePos.y + offsetY,
      width: scaledWidth,
      height: scaledHeight,
    };
  }

  /**
   * Calculates the bounding box for the scaled instance.
   */
  private calculateBounds(coords: {
    x: number;
    y: number;
    width: number;
    height: number;
  }): RenderBounds {
    return {
      x: coords.x as Pixels,
      y: coords.y as Pixels,
      width: coords.width as Pixels,
      height: coords.height as Pixels,
      center: {
        x: (coords.x + coords.width / 2) as Pixels,
        y: (coords.y + coords.height / 2) as Pixels,
      },
    };
  }

  /**
   * Calculates the baseline coordinate for visual alignment.
   */
  private calculateBaseline(
    instance: RenderInstance,
    coords: { x: number; y: number; width: number; height: number },
  ): Vector2 {
    // The baseline is the point on the product that touches the shelf surface.
    // Usually defined by the anchor point (e.g., x: 0.5, y: 1.0)
    return {
      x: coords.x + coords.width * instance.anchorPoint.x,
      y: coords.y + coords.height * instance.anchorPoint.y,
    };
  }

  /**
   * Calculates bounds for collision detection.
   * Currently matches render bounds but can be narrowed for specific product types.
   */
  private calculateCollisionBounds(
    bounds: RenderBounds,
    instance: RenderInstance,
  ): RenderBounds {
    // In future iterations, this could be adjusted based on the physical dimensions
    // vs. the visual sprite dimensions.
    return { ...bounds };
  }
}
