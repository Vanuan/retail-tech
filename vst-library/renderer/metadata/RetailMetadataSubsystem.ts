import { RenderInstance } from "../../types/index";
import { Viewport } from "../../types/renderer";
import { PriceDisplay } from "./PriceDisplay";
import { HeatmapEngine } from "./HeatmapEngine";

/**
 * RETAIL METADATA SUBSYSTEM
 *
 * Handles the rendering of non-product visual data that provides context to the retail environment.
 * This includes:
 * 1. Price Tags (Unit price, promotional badges)
 * 2. Labels (Product names, SKUs)
 * 3. Performance Indicators (Heatmaps, sales data overlays)
 * 4. Compliance Indicators (Out of stock, misplaced items)
 *
 * This subsystem ensures that critical retail information remains legible and correctly
 * positioned relative to the products, regardless of zoom level or perspective.
 */
export class RetailMetadataSubsystem {
  private priceDisplay: PriceDisplay;
  private heatmapEngine: HeatmapEngine;

  private config = {
    showPrices: true,
    showLabels: true,
    tagOpacity: 0.9,
    fontSize: 12,
    tagHeight: 24,
    tagPadding: 6,
  };

  constructor() {
    this.priceDisplay = new PriceDisplay();
    this.heatmapEngine = new HeatmapEngine();
  }

  /**
   * Renders all metadata for the provided list of visible instances.
   * @param instances Array of visible render instances.
   * @param context The Canvas2D rendering context.
   * @param viewport The current viewport state.
   * @returns The total number of draw calls performed.
   */
  public async renderAll(
    instances: RenderInstance[],
    context: CanvasRenderingContext2D,
    viewport: Viewport,
  ): Promise<number> {
    let drawCalls = 0;

    // 1. Render Heatmap overlays (bottom layer of metadata)
    this.heatmapEngine.render(context, instances);
    drawCalls += instances.length;

    // 2. Render individual product metadata (Price tags, labels)
    for (const instance of instances) {
      drawCalls += await this.renderProductMetadata(
        instance,
        context,
        viewport,
      );
    }

    return drawCalls;
  }

  /**
   * Renders specific metadata overlays for a single product.
   */
  private async renderProductMetadata(
    instance: RenderInstance,
    context: CanvasRenderingContext2D,
    viewport: Viewport,
  ): Promise<number> {
    let calls = 0;

    // 1. Render Price Tag using the zoom-adaptive PriceDisplay component
    if (this.config.showPrices && instance.sourceData.pricing) {
      this.priceDisplay.render(context, instance, viewport);
      calls++;
    }

    return calls;
  }

  /**
   * Updates subsystem configuration.
   */
  public updateConfig(newConfig: Partial<typeof this.config>): void {
    this.config = { ...this.config, ...newConfig };
  }
}
