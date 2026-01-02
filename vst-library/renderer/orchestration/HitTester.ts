import { RenderInstance, Vector2 } from "../../types";
import { Viewport, HitTestResult, IHitTester } from "../../types/renderer";

/**
 * HIT TESTER
 * Detects interactions between user input (screen coordinates) and rendered products.
 * Uses prepared instance data and account for viewport transformations.
 */
export class HitTester implements IHitTester {
  /**
   * Tests a screen point against a set of instances.
   * @param screenX Horizontal screen coordinate.
   * @param screenY Vertical screen coordinate.
   * @param instances The list of active render instances.
   * @param viewport The current viewport state.
   */
  public test(
    screenX: number,
    screenY: number,
    instances: RenderInstance[],
    viewport: Viewport
  ): HitTestResult | null {
    // 1. Convert screen coordinates to world/planogram coordinates
    const worldPos = this.screenToWorld(screenX, screenY, viewport);

    // 2. Sort front to back for hit testing (opposite of draw order)
    // We want to hit the item the user sees "on top" first.
    const sortedInstances = [...instances].sort((a, b) => {
      const zA = a.zLayerProperties?.finalZIndex ?? 0;
      const zB = b.zLayerProperties?.finalZIndex ?? 0;
      return zB - zA;
    });

    // 3. Test each instance for a hit
    for (const instance of sortedInstances) {
      if (this.testInstance(worldPos, instance)) {
        return {
          instance,
          hitPoint: worldPos,
          screenPoint: { x: screenX, y: screenY }
        };
      }
    }

    return null;
  }

  /**
   * Performs the geometric hit test against a specific instance.
   */
  private testInstance(worldPos: Vector2, instance: RenderInstance): boolean {
    const bounds = instance.renderBounds;

    // Quick bounding box test (AABB)
    if (!this.pointInBounds(worldPos, bounds)) {
      return false;
    }

    // If instance has alpha mask requirements, we could perform a
    // pixel-perfect test here. For now, we return true if inside bounds.
    if (instance.maskProperties?.required) {
      return this.testAlphaMask(worldPos, instance);
    }

    return true;
  }

  /**
   * Translates screen-space coordinates to world-space coordinates.
   */
  private screenToWorld(screenX: number, screenY: number, viewport: Viewport): Vector2 {
    return {
      x: (screenX + viewport.x) / viewport.zoom,
      y: (screenY + viewport.y) / viewport.zoom
    };
  }

  /**
   * Checks if a point lies within a rectangular boundary.
   */
  private pointInBounds(point: Vector2, bounds: { x: number; y: number; width: number; height: number }): boolean {
    return (
      point.x >= bounds.x &&
      point.x <= bounds.x + bounds.width &&
      point.y >= bounds.y &&
      point.y <= bounds.y + bounds.height
    );
  }

  /**
   * Placeholder for pixel-perfect hit testing using the product's mask or sprite alpha.
   */
  private testAlphaMask(_worldPos: Vector2, _instance: RenderInstance): boolean {
    // In a full implementation, this would involve reading pixel data from a
    // hidden canvas or using the alpha channel of the sprite.
    return true;
  }
}
