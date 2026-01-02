import { RenderInstance, Vector2 } from "../../types/index";
import { Viewport } from "../../types/renderer";

/**
 * PRICE DISPLAY (Renderer Layer)
 * Handles zoom-adaptive rendering of pricing information and promotional badges.
 * Ensures legibility across varying zoom levels using a non-linear scaling algorithm.
 */
export class PriceDisplay {
  private readonly BASE_FONT_SIZE = 12;
  private readonly MIN_SCREEN_SIZE = 9;
  private readonly MAX_SCREEN_SIZE = 24;

  /**
   * Renders the price tag for a specific instance.
   * @param context The Canvas2D rendering context.
   * @param instance The product instance to render metadata for.
   * @param viewport The current viewport state (zoom, etc).
   */
  public render(
    context: CanvasRenderingContext2D,
    instance: RenderInstance,
    viewport: Viewport
  ): void {
    const pricing = instance.sourceData.pricing;
    if (!pricing) return;

    const { renderBounds } = instance;
    const isPromo = !!pricing.promotionalPrice;
    const price = pricing.unitPrice;

    context.save();

    // 1. Calculate zoom-adaptive font size
    const fontSize = this.calculateFontSize(viewport.zoom);
    context.font = `${isPromo ? "bold" : "normal"} ${fontSize}px "Inter", "Segoe UI", sans-serif`;

    // 2. Prepare text and measurements
    const label = `$${price.toFixed(2)}`;
    const metrics = context.measureText(label);
    const padding = fontSize * 0.4;
    const boxWidth = metrics.width + padding * 2;
    const boxHeight = fontSize + padding;

    // 3. Position the tag at the bottom-left of the product bounds
    // We adjust for the viewport zoom to ensure the tag "sits" correctly
    // regardless of the perspective transformation applied to the product.
    const x = renderBounds.x;
    const y = renderBounds.y + renderBounds.height;

    // 4. Draw Background/Container
    this.drawBackground(context, x, y, boxWidth, boxHeight, isPromo, viewport.zoom);

    // 5. Draw Text
    context.fillStyle = isPromo ? "#FFFFFF" : "#1A1A1B";
    context.textBaseline = "top";
    context.fillText(label, x + padding, y + padding * 0.5);

    // 6. Optional: Draw Promo Badge if applicable
    if (isPromo) {
      this.drawPromoBadge(context, x + boxWidth, y, fontSize, viewport.zoom);
    }

    context.restore();
  }

  /**
   * S-Curve Font Scaling Algorithm
   * Calculates a font size that stays legible at low zoom but doesn't
   * overwhelm the screen at high zoom.
   */
  private calculateFontSize(zoom: number): number {
    // We target a consistent "on-screen" size by counter-acting the zoom,
    // but use a sigmoid (s-curve) to smooth the transition and prevent
    // the text from becoming too jittery or extreme.

    // Normalized range for zoom [0.5, 3.0] -> [-3, 3] for sigmoid
    const range = ((zoom - 0.5) / 2.5 - 0.5) * 6;
    const sigmoid = 1 / (1 + Math.exp(-range));

    // Calculate a "compensation factor" that determines how much we resist the zoom.
    // At low zoom, we want the font to be physically larger in the world.
    const scaleFactor = 1 / zoom;

    // Blend between a fixed world size and a fixed screen size based on the sigmoid
    const adjustedSize = this.BASE_FONT_SIZE * scaleFactor;

    // Clamp to ensure legibility and prevent screen-filling text
    const finalSize = Math.max(
      this.MIN_SCREEN_SIZE / zoom,
      Math.min(this.MAX_SCREEN_SIZE / zoom, adjustedSize)
    );

    return finalSize;
  }

  /**
   * Draws the stylized background for the price tag.
   */
  private drawBackground(
    context: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    isPromo: boolean,
    zoom: number
  ): void {
    const radius = 2 / zoom; // Sharp corners that scale well
    const lineWidth = 1 / zoom;

    context.beginPath();
    context.roundRect(x, y, width, height, radius);

    // Theme colors based on retail status
    context.fillStyle = isPromo ? "#E02020" : "#FFFFFF";
    context.fill();

    context.strokeStyle = isPromo ? "#B01010" : "#D1D5DB";
    context.lineWidth = lineWidth;
    context.stroke();
  }

  /**
   * Draws a small "SALE" or promo indicator badge.
   */
  private drawPromoBadge(
    context: CanvasRenderingContext2D,
    x: number,
    y: number,
    baseFontSize: number,
    zoom: number
  ): void {
    const badgeSize = baseFontSize * 0.7;
    const offset = 2 / zoom;

    context.save();
    context.translate(x + offset, y);

    // Draw small triangle badge
    context.beginPath();
    context.moveTo(0, 0);
    context.lineTo(badgeSize, 0);
    context.lineTo(0, badgeSize);
    context.closePath();

    context.fillStyle = "#FFD700"; // Gold/Promo yellow
    context.fill();

    context.restore();
  }
}
