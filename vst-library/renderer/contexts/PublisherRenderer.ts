import { RendererLayer } from "../RendererLayer";
import { RenderInstance, FixtureConfig } from "../../types/index";
import { Viewport, EditingState, RenderResult, ProcessedPlanogram } from "../../types/renderer";

/**
 * PUBLISHER RENDERER
 *
 * A specialized implementation of RendererLayer optimized for static, high-resolution output.
 * Primarily used for generating printable PDFs, high-DPI images, or store floor plan reports.
 *
 * Key Features:
 * - High-DPI support (defaulting to 300 DPI for print quality).
 * - Vector-like clarity for text and metadata.
 * - Optional grid overlays and technical annotations.
 * - Optimized for single-frame execution rather than 60fps interaction.
 */
export class PublisherRenderer extends RendererLayer {
  private publisherConfig = {
    enableHeatmaps: false,
    enableGrid: true,
    printMode: true,
    dpi: 300,
    gridSpacing: 100, // mm
    annotationColor: "#555555"
  };

  constructor(config: Partial<typeof PublisherRenderer.prototype["publisherConfig"]> = {}) {
    super('canvas2d');
    this.publisherConfig = { ...this.publisherConfig, ...config };
  }

  /**
   * Overrides the main render method to ensure high-DPI scaling is applied
   * before the execution pipeline begins.
   */
  public async render(
    processedPlanogram: ProcessedPlanogram,
    outputContext: CanvasRenderingContext2D,
    viewport: Viewport,
    editingState: EditingState | null = null
  ): Promise<RenderResult> {
    // Force DPI settings for publishing
    const highDpiViewport = {
      ...viewport,
      dpi: this.publisherConfig.dpi
    };

    return super.render(processedPlanogram, outputContext, highDpiViewport, editingState);
  }

  /**
   * Specialized overlays for technical drawings and print layouts.
   */
  protected async applyOverlays(
    context: CanvasRenderingContext2D,
    instances: RenderInstance[],
    viewport: Viewport,
    _editingState: EditingState | null
  ): Promise<void> {
    if (this.publisherConfig.enableGrid) {
      this.drawTechnicalGrid(context, viewport);
    }

    if (this.publisherConfig.printMode) {
      this.drawPrintMargins(context, viewport);
    }
  }

  /**
   * Draws a coordinate grid over the planogram for physical alignment reference.
   */
  private drawTechnicalGrid(context: CanvasRenderingContext2D, viewport: Viewport): void {
    const { width, height, zoom } = viewport;
    const spacing = this.publisherConfig.gridSpacing * zoom;

    context.save();
    context.strokeStyle = "rgba(0, 0, 0, 0.1)";
    context.lineWidth = 0.5 / zoom;

    // Vertical lines
    for (let x = 0; x <= width; x += spacing) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, height);
      context.stroke();
    }

    // Horizontal lines
    for (let y = 0; y <= height; y += spacing) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(width, y);
      context.stroke();
    }

    context.restore();
  }

  /**
   * Draws crop marks or margins if needed for print templates.
   */
  private drawPrintMargins(context: CanvasRenderingContext2D, viewport: Viewport): void {
    const margin = 10 * (viewport.dpi || 96) / 25.4; // 10mm in pixels

    context.save();
    context.strokeStyle = "#ccc";
    context.setLineDash([5, 5]);
    context.strokeRect(margin, margin, viewport.width - margin * 2, viewport.height - margin * 2);
    context.restore();
  }
}
