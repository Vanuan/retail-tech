import { RenderInstance } from "../../types/index";
import { Viewport } from "../../types/renderer";

/**
 * HEATMAP ENGINE (Renderer Layer)
 *
 * Visualizes business performance metrics by overlaying color-coded heatmaps
 * onto product instances. This allows users to quickly identify high and low
 * performing areas of the planogram.
 *
 * Supported Metrics:
 * - turnover: Sales volume
 * - velocity: Speed of stock movement
 * - profit: Margin-based performance
 */
export class HeatmapEngine {
  private config = {
    opacity: 0.5,
    overlayPadding: 2, // mm padding inside the product bounds
    enabled: true,
    metric: "velocity", // Default metric to visualize
  };

  /**
   * Renders heatmap overlays for a set of instances.
   * @param context The Canvas2D rendering context.
   * @param instances The visible instances to process.
   * @param activeMetric The performance metric key to visualize.
   */
  public render(
    context: CanvasRenderingContext2D,
    instances: RenderInstance[],
    activeMetric: string = this.config.metric
  ): void {
    if (!this.config.enabled) return;

    context.save();

    for (const instance of instances) {
      this.renderInstanceOverlay(context, instance, activeMetric);
    }

    context.restore();
  }

  /**
   * Renders a color overlay for a single instance based on its performance score.
   */
  private renderInstanceOverlay(
    context: CanvasRenderingContext2D,
    instance: RenderInstance,
    metric: string
  ): void {
    const performanceData = instance.performance;
    if (!performanceData || performanceData[metric] === undefined) {
      return;
    }

    // Normalize value (expected range 0.0 to 1.0)
    const value = Math.max(0, Math.min(1, performanceData[metric]));
    const { renderBounds } = instance;

    // 1. Calculate the color based on Red-Yellow-Green scale
    const color = this.getColorForValue(value);

    // 2. Apply semi-transparent fill
    context.fillStyle = color;

    // Draw slightly smaller than the product bounds to show product context if needed
    const padding = this.config.overlayPadding * instance.renderScale;
    context.fillRect(
      renderBounds.x + padding,
      renderBounds.y + padding,
      renderBounds.width - padding * 2,
      renderBounds.height - padding * 2
    );

    // 3. Optional: Add a subtle border to the heatmap cell
    context.strokeStyle = this.getColorForValue(value, 0.8);
    context.lineWidth = 1;
    context.strokeRect(
      renderBounds.x + padding,
      renderBounds.y + padding,
      renderBounds.width - padding * 2,
      renderBounds.height - padding * 2
    );
  }

  /**
   * Maps a normalized 0.0 - 1.0 value to a HSL color string.
   * 0.0 -> Red (Low performance)
   * 0.5 -> Yellow (Average)
   * 1.0 -> Green (High performance)
   */
  private getColorForValue(value: number, alpha: number = this.config.opacity): string {
    // Hue range: 0 (Red) to 120 (Green)
    const hue = value * 120;
    return `hsla(${hue}, 85%, 45%, ${alpha})`;
  }

  /**
   * Updates the engine configuration.
   */
  public updateConfig(newConfig: Partial<typeof this.config>): void {
    this.config = { ...this.config, ...newConfig };
  }
}
