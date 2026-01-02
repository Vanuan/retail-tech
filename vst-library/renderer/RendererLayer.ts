import { ProcessedPlanogram, FixtureConfig, RenderInstance } from "../types";
import {
  Viewport,
  EditingState,
  RenderResult,
  RenderContextType,
  IVisualOrchestration,
  ISpriteExecution,
} from "../types/renderer";
import { RenderEngine } from "./RenderEngine";
import { VisualOrchestrationSubsystem } from "./orchestration/VisualOrchestrationSubsystem";
import { SpriteExecutionSubsystem } from "./execution/SpriteExecutionSubsystem";
import { RetailMetadataSubsystem } from "./metadata/RetailMetadataSubsystem";
import { ViewportCuller } from "./culling/ViewportCuller";
import { PerformanceMonitor } from "./PerformanceMonitor";

/**
 * RENDERER LAYER - Platform-specific drawing engine
 * Consumes prepared instances from Core Layer Processing and performs actual rendering.
 * This class orchestrates various subsystems to produce the final visual output
 * on a canvas or other rendering target.
 */
export class RendererLayer {
  protected renderEngine: RenderEngine;
  protected visualOrchestration: VisualOrchestrationSubsystem;
  protected spriteExecution: SpriteExecutionSubsystem;
  protected retailMetadata: RetailMetadataSubsystem;

  protected viewportCuller: ViewportCuller;
  protected performanceMonitor: PerformanceMonitor;

  protected currentViewport: Viewport | null = null;
  protected currentZoom: number = 1.0;

  constructor(contextType: RenderContextType = "canvas2d") {
    this.renderEngine = new RenderEngine(contextType);

    // Initialize subsystems
    this.visualOrchestration = new VisualOrchestrationSubsystem();
    this.spriteExecution = new SpriteExecutionSubsystem();
    this.retailMetadata = new RetailMetadataSubsystem();

    // Performance and optimization systems
    this.viewportCuller = new ViewportCuller();
    this.performanceMonitor = new PerformanceMonitor();
  }

  /**
   * Main render method - Consumes prepared data and draws it to the output context.
   * @param processedPlanogram Data prepared by the Core Layer.
   * @param outputContext The target drawing context (e.g. CanvasRenderingContext2D).
   * @param viewport The current viewing window configuration.
   * @param editingState Optional state for interactive editing feedback.
   */
  public async render(
    processedPlanogram: ProcessedPlanogram,
    outputContext: any,
    viewport: Viewport,
    editingState: EditingState | null = null,
  ): Promise<RenderResult> {
    const startTime = performance.now();

    // Update internal viewport state
    this.currentViewport = viewport;
    this.currentZoom = viewport.zoom || 1.0;

    // Register atlas for this render pass if provided (enables optimized atlas rendering)
    this.spriteExecution.productSprite.setAtlas(processedPlanogram.atlas);

    // 1. Viewport culling (optimization: only process what's on screen)
    const visibleInstances = this.viewportCuller.cull(
      processedPlanogram.renderInstances,
      viewport,
    );

    // 2. Set up and clear the render context
    this.renderEngine.initialize(outputContext, {
      width: viewport.width,
      height: viewport.height,
      dpi: viewport.dpi || 96,
      clearColor: "#ffffff",
    });

    // 3. Execute the core rendering pipeline
    const renderResult = await this.executeRenderPipeline(
      visibleInstances,
      processedPlanogram.fixture,
      outputContext,
      viewport,
      editingState,
    );

    // 4. Record and monitor performance metrics
    const endTime = performance.now();
    this.performanceMonitor.recordFrame({
      renderTime: endTime - startTime,
      visibleInstances: visibleInstances.length,
      totalInstances: processedPlanogram.renderInstances.length,
      drawCalls: renderResult.drawCalls,
      memory: (performance as any).memory?.usedJSHeapSize || 0,
    });

    // 5. Apply context-specific overlays (e.g. editing indicators)
    await this.applyOverlays(
      outputContext,
      visibleInstances,
      viewport,
      editingState,
    );

    return {
      ...renderResult,
      visibleInstances: visibleInstances.length,
      renderTime: endTime - startTime,
    };
  }

  /**
   * Orchestrates the multi-phase drawing process.
   */
  protected async executeRenderPipeline(
    instances: RenderInstance[],
    fixture: FixtureConfig,
    context: any,
    viewport: Viewport,
    editingState: EditingState | null,
  ): Promise<{ drawCalls: number; success: boolean }> {
    let totalDrawCalls = 0;

    // PHASE 1: Render fixture background
    if (fixture.background) {
      await this.renderFixtureBackground(fixture, context, viewport);
      totalDrawCalls++;
    }

    // PHASE 2: Sort instances by pre-calculated z-index for correct draw order
    const sortedInstances =
      this.visualOrchestration.zLayerManager.sortByZIndex(instances);

    // PHASE 3: Render each product instance
    for (const instance of sortedInstances) {
      const instanceResult = await this.renderInstance(
        instance,
        context,
        viewport,
      );
      totalDrawCalls += instanceResult.drawCalls;
    }

    // PHASE 4: Render retail metadata (prices, labels, etc.)
    totalDrawCalls += await this.retailMetadata.renderAll(
      instances,
      context,
      viewport,
    );

    // PHASE 5: Apply editing feedback if in edit mode
    if (editingState) {
      totalDrawCalls += await this.renderEditingFeedback(
        context,
        instances,
        editingState,
      );
    }

    return { drawCalls: totalDrawCalls, success: true };
  }

  /**
   * Performs the atomic drawing operations for a single product instance.
   */
  protected async renderInstance(
    instance: RenderInstance,
    context: any,
    viewport: Viewport,
  ): Promise<{ drawCalls: number; instanceId: string }> {
    let drawCalls = 0;

    // 1. Apply spatial transforms (position, scale, rotation)
    this.visualOrchestration.productPositioner.applyTransforms(
      context,
      instance.renderCoordinates,
    );

    // 2. Render shadow if enabled in preparation
    if (instance.shadowProperties?.enabled) {
      await this.spriteExecution.shadowRenderer.render(
        context,
        instance,
        viewport,
      );
      drawCalls++;
    }

    // 3. Render the product sprite using parallax logic
    const spriteResult = await this.spriteExecution.productSprite.render(
      context,
      instance,
      viewport,
    );
    drawCalls += spriteResult.drawCalls;

    // 4. Apply masking for shape definition or transparency
    if (instance.maskProperties?.required) {
      await this.spriteExecution.maskRenderer.apply(
        context,
        instance,
        viewport,
      );
      drawCalls++;
    }

    // 5. Reset transforms to clean the state for the next item
    this.visualOrchestration.productPositioner.resetTransforms(context);

    return { drawCalls, instanceId: instance.id };
  }

  /**
   * Internal helper to render the fixture's visual background.
   */
  protected async renderFixtureBackground(
    fixture: FixtureConfig,
    context: any,
    _viewport: Viewport,
  ): Promise<void> {
    if (fixture.background?.color) {
      context.fillStyle = fixture.background.color;
      context.fillRect(
        0,
        0,
        fixture.dimensions.width,
        fixture.dimensions.height,
      );
    }
  }

  /**
   * Placeholder for specialized overlays (selection boxes, guides, etc.)
   */
  protected async applyOverlays(
    _context: any,
    _instances: RenderInstance[],
    _viewport: Viewport,
    _editingState: EditingState | null,
  ): Promise<void> {
    // To be implemented by subclasses or specialized subsystems
  }

  /**
   * Placeholder for rendering visual feedback during interactive edits.
   */
  protected async renderEditingFeedback(
    _context: any,
    _instances: RenderInstance[],
    _editingState: EditingState,
  ): Promise<number> {
    // Returns number of draw calls
    return 0;
  }

  /**
   * Returns current performance metrics.
   */
  public getPerformanceMetrics() {
    return this.performanceMonitor.getMetrics();
  }
}
