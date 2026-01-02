import { RendererLayer } from "../RendererLayer";
import { RenderInstance } from "../../types/index";
import { Viewport, EditingState, ProcessedPlanogram, RenderResult } from "../../types/renderer";

/**
 * VISUALIZER RENDERER
 *
 * Specialized implementation of RendererLayer optimized for 60fps real-time interaction
 * and interactive editing feedback. This is the primary renderer used in the
 * planogram editor/builder application.
 *
 * Key Features:
 * - Real-time interaction feedback (hover, selection, drag-and-drop).
 * - Parallax depth effects for immersive viewing.
 * - Dynamic shadow rendering.
 * - Performance-optimized culling and batching.
 */
export class VisualizerRenderer extends RendererLayer {
  private visualizerConfig = {
    enableParallax: true,
    enableShadows: true,
    enableRealTimeFeedback: true,
    highlightColor: "rgba(59, 130, 246, 0.5)", // Blue-500 with opacity
    selectionBorderColor: "#3B82F6",
    selectionBorderWidth: 2,
  };

  constructor(config: Partial<typeof VisualizerRenderer.prototype["visualizerConfig"]> = {}) {
    super('canvas2d');
    this.visualizerConfig = { ...this.visualizerConfig, ...config };
  }

  /**
   * Overrides render to inject visualizer-specific logic if needed.
   */
  public async render(
    processedPlanogram: ProcessedPlanogram,
    outputContext: CanvasRenderingContext2D,
    viewport: Viewport,
    editingState: EditingState | null = null
  ): Promise<RenderResult> {
    // In a production implementation, we would update the internal subsystems
    // (ParallaxController, ShadowRenderer) based on visualizerConfig here.

    return super.render(processedPlanogram, outputContext, viewport, editingState);
  }

  /**
   * Renders interactive overlays like selection highlights and hover states.
   */
  protected async applyOverlays(
    context: CanvasRenderingContext2D,
    instances: RenderInstance[],
    viewport: Viewport,
    editingState: EditingState | null
  ): Promise<void> {
    if (!this.visualizerConfig.enableRealTimeFeedback || !editingState) return;

    const { selectedInstanceIds = [], hoveredInstanceId } = editingState;

    context.save();

    // 1. Draw hover highlight
    if (hoveredInstanceId) {
      const hovered = instances.find(i => i.id === hoveredInstanceId);
      if (hovered) {
        this.drawInstanceHighlight(context, hovered, "rgba(255, 255, 255, 0.2)");
      }
    }

    // 2. Draw selection highlights
    if (selectedInstanceIds.length > 0) {
      for (const id of selectedInstanceIds) {
        const selected = instances.find(i => i.id === id);
        if (selected) {
          this.drawInstanceSelection(context, selected, viewport.zoom);
        }
      }
    }

    context.restore();
  }

  /**
   * Renders visual feedback specifically during active editing operations (like dragging).
   */
  protected async renderEditingFeedback(
    context: CanvasRenderingContext2D,
    instances: RenderInstance[],
    editingState: EditingState
  ): Promise<number> {
    let drawCalls = 0;

    if (editingState.isDragging && editingState.dragCurrentPos) {
      // Draw alignment guides or a ghost of the dragged product
      drawCalls += this.drawDragGuides(context, editingState, instances);
    }

    return drawCalls;
  }

  /**
   * Internal helper to draw a subtle highlight over an instance.
   */
  private drawInstanceHighlight(
    context: CanvasRenderingContext2D,
    instance: RenderInstance,
    color: string
  ): void {
    const { renderBounds } = instance;
    context.fillStyle = color;
    context.fillRect(renderBounds.x, renderBounds.y, renderBounds.width, renderBounds.height);
  }

  /**
   * Internal helper to draw a selection border around an instance.
   */
  private drawInstanceSelection(
    context: CanvasRenderingContext2D,
    instance: RenderInstance,
    zoom: number
  ): void {
    const { renderBounds } = instance;
    const padding = 2 / zoom;

    context.strokeStyle = this.visualizerConfig.selectionBorderColor;
    context.lineWidth = this.visualizerConfig.selectionBorderWidth / zoom;

    context.strokeRect(
      renderBounds.x - padding,
      renderBounds.y - padding,
      renderBounds.width + padding * 2,
      renderBounds.height + padding * 2
    );
  }

  /**
   * Draws alignment guides or "snapping" indicators during drag operations.
   */
  private drawDragGuides(
    context: CanvasRenderingContext2D,
    editingState: EditingState,
    _instances: RenderInstance[]
  ): number {
    if (!editingState.dragCurrentPos) return 0;

    const { x, y } = editingState.dragCurrentPos;

    context.save();
    context.setLineDash([5, 5]);
    context.strokeStyle = "rgba(59, 130, 246, 0.8)";
    context.lineWidth = 1;

    // Crosshair guides
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, 2000); // Assume large enough boundary
    context.moveTo(0, y);
    context.lineTo(2000, y);
    context.stroke();

    context.restore();
    return 1;
  }
}
