import { RenderCoordinates } from "../../types";
import { IRendererProductPositioner } from "../../types/renderer";

/**
 * RENDERER PRODUCT POSITIONER
 * Applies final transforms to sprites/meshes in the rendering context.
 * Consumes pre-calculated coordinates from the Core Layer.
 */
export class RendererProductPositioner implements IRendererProductPositioner {
  /**
   * Applies translation, rotation, and scaling to the graphics context.
   * @param context The drawing context (e.g., CanvasRenderingContext2D).
   * @param renderCoordinates The prepared coordinates for rendering.
   */
  public applyTransforms(
    context: CanvasRenderingContext2D,
    renderCoordinates: RenderCoordinates,
  ): void {
    const { x, y, scale = 1, rotation = 0, anchorPoint } = renderCoordinates;

    // 1. Save current context state
    context.save();

    // 2. Move to pre-calculated position
    context.translate(x, y);

    // 3. Apply rotation around the anchor point
    if (rotation !== 0) {
      const anchorX = renderCoordinates.width * (anchorPoint?.x ?? 0.5);
      const anchorY = renderCoordinates.height * (anchorPoint?.y ?? 0.5);

      context.translate(anchorX, anchorY);
      context.rotate((rotation * Math.PI) / 180);
      context.translate(-anchorX, -anchorY);
    }

    // 4. Apply scale
    if (scale !== 1) {
      context.scale(scale, scale);
    }
  }

  /**
   * Restores the graphics context to its state before applyTransforms was called.
   * @param context The drawing context to restore.
   */
  public resetTransforms(context: CanvasRenderingContext2D): void {
    context.restore();
  }
}
