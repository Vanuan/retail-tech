import { Vector2, Vector3 } from "../types/core/geometry";
import { RenderProjection } from "../types/rendering/engine";
import { FixtureConfig } from "../types/planogram/config";

/**
 * Projection Utility
 *
 * Handles the mapping between World Space (Millimeters) and Screen Space (Pixels).
 * This logic is decoupled from the business logic to allow for different
 * rendering contexts (2D Canvas, 3D WebGL, etc.)
 */
export class Projection {
  /**
   * Projects a World Space point to Screen Space.
   *
   * @param worldPoint - The point in Millimeters relative to fixture origin (bottom-left)
   * @param fixture - The fixture configuration (for height-flip calculation)
   * @param projection - The current projection parameters (zoom, pan, ppi)
   */
  static project(
    worldPoint: Vector3,
    fixture: FixtureConfig,
    projection: RenderProjection
  ): Vector2 {
    const { ppi, zoom, offset } = projection;
    const scale = ppi * zoom;

    // 1. Scale world units to pixels
    const pxX = worldPoint.x * scale;
    const pxY = worldPoint.y * scale;

    // 2. Flip Y Axis (World Y=0 is bottom, Screen Y=0 is top)
    const fixtureHeightPx = fixture.dimensions.height * scale;

    // 3. Apply Pan/Offset
    const screenX = pxX + offset.x;
    const screenY = (fixtureHeightPx - pxY) + offset.y;

    return { x: screenX, y: screenY };
  }

  /**
   * Unprojects a Screen Space point back to World Space Millimeters.
   *
   * @param screenPoint - The pixel coordinate on the canvas
   * @param fixture - The fixture configuration
   * @param projection - The current projection parameters
   */
  static unproject(
    screenPoint: Vector2,
    fixture: FixtureConfig,
    projection: RenderProjection
  ): Vector3 {
    const { ppi, zoom, offset } = projection;
    const scale = ppi * zoom;

    // 1. Remove offset
    const relativeX = screenPoint.x - offset.x;
    const relativeY = screenPoint.y - offset.y;

    // 2. Reverse Y Flip
    const fixtureHeightPx = fixture.dimensions.height * scale;
    const pxY = fixtureHeightPx - relativeY;

    // 3. Unscale to world units
    return {
      x: relativeX / scale,
      y: pxY / scale,
      z: 0 // Z-plane usually represents the front of the fixture in 2D
    };
  }

  /**
   * Scales a dimension from World Space (mm) to Screen Space (pixels)
   */
  static scale(mm: number, projection: RenderProjection): number {
    return mm * projection.ppi * projection.zoom;
  }

  /**
   * Unscales a dimension from Screen Space (pixels) to World Space (mm)
   */
  static unscale(px: number, projection: RenderProjection): number {
    return px / (projection.ppi * projection.zoom);
  }
}
