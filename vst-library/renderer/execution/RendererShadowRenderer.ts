import { RenderInstance, RenderBounds } from "../../types/index";
import { Viewport, IRendererShadowRenderer } from "../../types/renderer";

/**
 * RENDERER SHADOW RENDERER
 * Handles the drawing of visual shadows for product instances.
 * Supports multiple shadow types (drop, contact, frost) to enhance
 * the depth and realism of the planogram representation.
 */
export class RendererShadowRenderer implements IRendererShadowRenderer {
  /**
   * Renders the shadow for a specific instance onto the context.
   * @param context The Canvas2D rendering context.
   * @param instance The prepared product instance data.
   * @param _viewport The current viewport state.
   */
  public async render(
    context: CanvasRenderingContext2D,
    instance: RenderInstance,
    _viewport: Viewport,
  ): Promise<void> {
    const shadow = instance.shadowProperties;

    // 1. Check if shadows are enabled and needed for this instance
    if (!shadow || !shadow.enabled || !shadow.needsShadow) {
      return;
    }

    // 2. Save current context state
    context.save();

    // 3. Apply shadow styles to the context
    // We use the built-in Canvas shadow API for efficiency
    context.shadowColor = shadow.color;
    context.shadowBlur = shadow.blur;
    context.shadowOffsetX = shadow.offset.x;
    context.shadowOffsetY = shadow.offset.y;

    // 4. Draw the shadow shape
    // The "shape" is typically a simplified version of the product's bounds
    // or a specialized path depending on the shadow type.
    this.drawShadowShape(context, instance);

    // 5. Restore context to clean state
    context.restore();
  }

  /**
   * Orchestrates drawing the actual shape that will cast the shadow.
   */
  private drawShadowShape(
    context: CanvasRenderingContext2D,
    instance: RenderInstance,
  ): void {
    const { renderBounds, shadowProperties } = instance;

    switch (shadowProperties.type) {
      case "drop":
        this.drawDropShadowShape(context, renderBounds);
        break;
      case "contact":
        this.drawContactShadowShape(context, renderBounds, instance);
        break;
      case "frost":
        this.drawFrostShadowShape(context, renderBounds, instance);
        break;
      default:
        // Default to a basic rectangular drop shadow
        this.drawDropShadowShape(context, renderBounds);
        break;
    }
  }

  /**
   * Draws a standard rectangular shape for a drop shadow.
   */
  private drawDropShadowShape(
    context: CanvasRenderingContext2D,
    bounds: RenderBounds,
  ): void {
    // We draw a rectangle that matches the destination size.
    // Since transforms are already applied, we draw at (0, 0).
    context.fillStyle = "rgba(0,0,0,1)"; // Opaque color, the shadow API handles the rest
    context.fillRect(0, 0, bounds.width, bounds.height);
  }

  /**
   * Draws a thin, intense elliptical shape at the base of the product
   * to simulate a contact shadow where the product touches the shelf.
   */
  private drawContactShadowShape(
    context: CanvasRenderingContext2D,
    bounds: RenderBounds,
    _instance: RenderInstance,
  ): void {
    const shadowHeight = Math.min(10, bounds.height * 0.1);

    context.beginPath();
    // Positioned at the bottom of the transform area
    context.ellipse(
      bounds.width / 2, // center X
      bounds.height,    // center Y (at the baseline)
      bounds.width / 2, // radius X
      shadowHeight,     // radius Y
      0,                // rotation
      0,
      Math.PI * 2,
    );
    context.fillStyle = "rgba(0,0,0,1)";
    context.fill();
  }

  /**
   * Draws a specialized shadow shape for refrigerated environments.
   * Typically more diffused and shifted.
   */
  private drawFrostShadowShape(
    context: CanvasRenderingContext2D,
    bounds: RenderBounds,
    _instance: RenderInstance,
  ): void {
    // Refrigerated shadows might be taller and more bluish/diffused
    context.fillStyle = "rgba(0,0,0,0.8)";
    context.fillRect(0, 0, bounds.width, bounds.height);
  }
}
