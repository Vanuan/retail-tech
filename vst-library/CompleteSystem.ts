import {
  PlanogramConfig,
  ProcessedPlanogram,
  IDataAccessLayer,
  Viewport,
  RenderResult,
  EditingState,
} from "@vst/vocabulary-types";
import {
  PlanogramSnapshot,
  PlanogramAction,
  ISessionManager,
} from "@vst/session-types";
import { IPlacementModelRegistry } from "@vst/placement-core";
import { PlacementModelRegistry } from "@vst/placement-models";
import { DataAccessLayer } from "@vst/data-access";
import { CoreLayerProcessor } from "@vst/core-processing";
import { SessionStore, CoreProjector } from "@vst/session";
import { AtlasBuilder } from "./atlas-processing";
import { PublisherRenderer } from "./renderer/contexts/PublisherRenderer";
import { VisualizerRenderer } from "./renderer/contexts/VisualizerRenderer";
import { VSERenderer } from "./renderer/contexts/VSERenderer";

/**
 * COMPLETE SYSTEM ORCHESTRATOR
 *
 * The top-level API for the VST Library. It provides a unified interface for
 * processing planogram data and rendering it to various targets (2D, 3D, Print).
 *
 * This class coordinates the flow between the stateless Core Processing Layer
 * and the stateful Renderer Layer, and provides integration with session-based
 * state management.
 */
export class CompleteSystem {
  public readonly core: CoreLayerProcessor;
  public readonly data: IDataAccessLayer;
  public readonly placementModels: IPlacementModelRegistry;
  public readonly atlas: AtlasBuilder;

  private renderers: {
    publisher: PublisherRenderer;
    visualizer: VisualizerRenderer;
    vse: VSERenderer;
  };

  constructor(
    options:
      | { cdnBaseUrl: string; placementModels?: IPlacementModelRegistry }
      | {
          dataAccessLayer: IDataAccessLayer;
          placementModels: IPlacementModelRegistry;
        },
  ) {
    // 1. Initialize Data Access Layer (Unified API for S3/DB)
    if ("dataAccessLayer" in options) {
      this.data = options.dataAccessLayer;
      this.placementModels = options.placementModels;
    } else {
      this.data = new DataAccessLayer({
        config: { cdnBaseUrl: options.cdnBaseUrl },
      });
      this.placementModels =
        options.placementModels || new PlacementModelRegistry();
    }

    // 2. Initialize Atlas Pipeline (Context-aware texture packing)
    this.atlas = new AtlasBuilder(this.data.assets);

    // 3. Initialize Core Processor
    this.core = new CoreLayerProcessor(
      this.data.fixtures,
      this.placementModels,
      this.data.products,
    );

    // 4. Initialize specialized renderers
    this.renderers = {
      publisher: new PublisherRenderer(),
      visualizer: new VisualizerRenderer(),
      vse: new VSERenderer(),
    };
  }

  /**
   * Main entry point: Transforms and renders a planogram from raw configuration.
   * @param config Raw L1-L3 planogram configuration.
   * @param target The rendering context (Canvas, WebGL, etc).
   * @param viewport Viewport and zoom settings.
   * @param options Configuration for choosing the renderer and interaction state.
   */
  public async renderPlanogram(
    config: PlanogramConfig,
    target: any,
    viewport: Viewport,
    options: {
      rendererType?: "publisher" | "visualizer" | "vse";
      editingState?: EditingState;
      useAtlas?: boolean;
      atlasQuality?: "low" | "medium" | "high" | "ultra";
    } = {},
  ): Promise<{
    success: boolean;
    renderResult: RenderResult;
    processedData: ProcessedPlanogram;
    performance: {
      coreProcessingTime: number;
      atlasGenerationTime?: number;
      renderTime: number;
      totalInstances: number;
      visibleInstances: number;
      drawCalls: number;
    };
  }> {
    const coreStartTime = performance.now();

    // PHASE 1: Core Processing (L1-L3 -> L4)
    // Transforms semantic placements into expanded, render-ready instances.
    const processedData = await this.core.processPlanogram(config);
    const coreEndTime = performance.now();

    // PHASE 1.5: Atlas Generation (Optional Optimization)
    let atlasStartTime = 0;
    let atlasEndTime = 0;
    if (options.useAtlas) {
      atlasStartTime = performance.now();
      processedData.atlas = await this.atlas.buildAtlas(
        {
          id: `atlas_${Date.now()}`,
          products: config.products.map((p) => ({
            sku: p.sku,
          })),
        },
        {
          context: options.rendererType || "visualizer",
          quality: options.atlasQuality || "medium",
        },
      );
      atlasEndTime = performance.now();
    }

    // PHASE 2: Select Renderer
    const rendererType = options.rendererType || "visualizer";
    const renderer = this.renderers[rendererType];

    if (!renderer) {
      throw new Error(`Unsupported renderer type: ${rendererType}`);
    }

    // PHASE 3: Execute Render Pipeline
    const renderResult = await renderer.render(
      processedData,
      target,
      viewport,
      options.editingState || null,
    );

    // PHASE 4: Compile Performance & Result Metadata
    return {
      success: renderResult.success,
      renderResult,
      processedData,
      performance: {
        coreProcessingTime: coreEndTime - coreStartTime,
        atlasGenerationTime: options.useAtlas
          ? atlasEndTime - atlasStartTime
          : undefined,
        renderTime: renderResult.renderTime,
        totalInstances: processedData.metadata.totalInstances,
        visibleInstances: renderResult.visibleInstances,
        drawCalls: renderResult.drawCalls,
      },
    };
  }

  /**
   * Renders a planogram from a pre-processed session snapshot.
   * This bypasses core processing and uses cached render instances.
   */
  public async renderSnapshot(
    snapshot: PlanogramSnapshot,
    target: any,
    viewport: Viewport,
    options: {
      rendererType?: "publisher" | "visualizer" | "vse";
      editingState?: EditingState;
    } = {},
  ): Promise<RenderResult> {
    const rendererType = options.rendererType || "visualizer";
    const renderer = this.renderers[rendererType];

    if (!renderer) {
      throw new Error(`Unsupported renderer type: ${rendererType}`);
    }

    // Wrap snapshot state into renderer-compatible format
    const processedData: ProcessedPlanogram = {
      renderInstances: snapshot.renderInstances,
      fixture: snapshot.config.fixture,
      metadata: {
        totalInstances: snapshot.renderInstances.length,
        validInstances: snapshot.renderInstances.length,
        invalidCount: 0,
        processingTime: 0,
      },
    };

    return await renderer.render(
      processedData,
      target,
      viewport,
      options.editingState || null,
    );
  }

  /**
   * Utility to update product metadata in the repository.
   */
  public async updateMetadata(sku: string, metadata: any): Promise<void> {
    await this.data.products.save(metadata);
    console.log(`[CompleteSystem] Updated metadata for SKU: ${sku}`);
  }

  /**
   * Accessor for renderer-specific configurations.
   */
  public getRenderer(type: "publisher" | "visualizer" | "vse") {
    return this.renderers[type];
  }

  /**
   * Creates a new stateful session for editing a planogram.
   * This ties the session logic (history, projection) to the core processing engine.
   */
  public createSession(config: PlanogramConfig): ISessionManager {
    const projector = new CoreProjector(this.core);
    return new SessionStore(config, projector);
  }
}
