import { RenderInstance } from "../../types";
import { Viewport } from "../../types/renderer";

/**
 * PARALLAX CONTROLLER
 * Determines the visual angle of a product sprite based on its position
 * relative to the viewport's center. This simulates 2.5D perspective
 * shifts as the user pans across the planogram.
 */
export class ParallaxController {
  // Define the viewing angles for the 9-angle parallax system
  // These represent the horizontal rotation (in degrees) of the product
  private readonly angles: number[] = [-45, -30, -15, -5, 0, 5, 15, 30, 45];

  /**
   * Selects the optimal viewing angle based on the instance's position
   * relative to the center of focus.
   *
   * @param instance The render instance being processed.
   * @param viewport The current viewport state.
   * @returns The selected angle in degrees.
   */
  public selectAngle(instance: RenderInstance, viewport: Viewport): number {
    // 1. Calculate the viewport's horizontal center in world space
    const viewportCenterX = viewport.x + (viewport.width / 2) / viewport.zoom;

    // 2. Get the product's horizontal center
    const instanceCenterX = instance.renderBounds.center.x;

    // 3. Calculate the relative horizontal offset
    const deltaX = instanceCenterX - viewportCenterX;

    // 4. Normalize the offset based on a reference width
    // (e.g., how far from center before we hit the maximum viewing angle)
    // We'll use half the viewport width as the threshold for max parallax.
    const maxThreshold = (viewport.width / 2) / viewport.zoom;
    const normalizedOffset = Math.max(-1, Math.min(1, deltaX / maxThreshold));

    // 5. Map the normalized offset (-1.0 to 1.0) to one of the 9 angle steps (0-8)
    // -1.0 maps to index 0, 0 maps to index 4, 1.0 maps to index 8
    const stepIndex = Math.round((normalizedOffset + 1) * 4);

    return this.angles[stepIndex];
  }

  /**
   * Optional: Applies vertical parallax if supported by the asset variants.
   * For most standard planograms, horizontal parallax is the primary driver of depth.
   */
  public selectVerticalAngle(instance: RenderInstance, viewport: Viewport): number {
    const viewportCenterY = viewport.y + (viewport.height / 2) / viewport.zoom;
    const instanceCenterY = instance.renderBounds.center.y;
    const deltaY = instanceCenterY - viewportCenterY;

    // Simplified vertical step (e.g., looking from above, straight, or below)
    return deltaY > 100 ? 10 : (deltaY < -100 ? -10 : 0);
  }
}
