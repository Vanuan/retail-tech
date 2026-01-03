import {
  PlanogramConfig,
  ProcessedPlanogram,
  RenderInstance,
  SourceProduct,
  ProductMetadata,
  FixtureConfig,
  ZIndex,
  Millimeters,
  DepthCategory,
} from "@vst/vocabulary-types";
import {
  isShelfSurfacePosition,
  createFacingConfig,
} from "@vst/vocabulary-logic";
import { IDataAccessLayer } from "@vst/vocabulary-types";
import { IPlacementModelRegistry } from "@vst/placement-core";

/**
 * CoreProcessor
 * Implements the "L4" transformation layer.
 * Converts Semantic (L1) data into Render-Ready (L4) instances.
 */
export class CoreProcessor {
  constructor(
    private dal: IDataAccessLayer,
    private placementModels: IPlacementModelRegistry,
  ) {}

  /**
   * Process a planogram configuration into a render-ready result.
   */
  async process(config: PlanogramConfig): Promise<ProcessedPlanogram> {
    // 1. Enrich (Fetch Metadata)
    const productSkus = new Set(config.products.map((p) => p.sku));
    const metadataMap = new Map<string, ProductMetadata>();

    for (const sku of Array.from(productSkus)) {
      const meta = await this.dal.products.getBySku(sku);
      if (meta) {
        metadataMap.set(sku, meta);
      }
    }

    return this.processSync(config, metadataMap);
  }

  /**
   * Synchronously process a planogram when metadata is already available.
   * Useful for immediate updates in UI components when state changes.
   */
  processSync(
    config: PlanogramConfig,
    metadataSource:
      | Map<string, ProductMetadata>
      | Record<string, ProductMetadata>,
  ): ProcessedPlanogram {
    const startTime = performance.now();
    const renderInstances: RenderInstance[] = [];
    const processingErrors: any[] = [];
    let validInstances = 0;
    let invalidCount = 0;

    const getMetadata = (sku: string) => {
      if (metadataSource instanceof Map) {
        return metadataSource.get(sku);
      }
      return (metadataSource as Record<string, ProductMetadata>)[sku];
    };

    // 2. Transform (L4 Generation)
    for (const product of config.products) {
      const metadata = getMetadata(product.sku);
      if (!metadata) {
        invalidCount++;
        processingErrors.push({
          productId: product.id,
          error: "Metadata not found",
        });
        continue;
      }

      try {
        const instances = this.generateInstancesForProduct(
          product,
          config.fixture,
          metadata,
        );
        renderInstances.push(...instances);
        validInstances += instances.length;
      } catch (e) {
        invalidCount++;
        processingErrors.push({ productId: product.id, error: e });
      }
    }

    // Sort by Z-Index for painter's algorithm
    renderInstances.sort((a, b) => a.zIndex - b.zIndex);

    return {
      renderInstances,
      fixture: config.fixture,
      metadata: {
        totalInstances: renderInstances.length,
        validInstances,
        invalidCount,
        processingTime: performance.now() - startTime,
        processingErrors,
      },
    };
  }

  /**
   * Generates expanded render instances for a single source product.
   */
  private generateInstancesForProduct(
    product: SourceProduct,
    fixture: FixtureConfig,
    metadata: ProductMetadata,
  ): RenderInstance[] {
    const instances: RenderInstance[] = [];
    const facings = product.placement.facings || createFacingConfig(1, 1);

    // Get Placement Model ID from semantic coordinates
    const modelType = product.placement.position.model;

    // We assume the registry provides access to the behavioral model implementation
    const behavioralModel =
      this.placementModels.get(modelType) ||
      this.placementModels.get("shelf-surface");

    if (!behavioralModel) {
      throw new Error(
        `Placement model '${modelType}' implementation not found`,
      );
    }

    for (let facingX = 0; facingX < facings.horizontal; facingX++) {
      for (let facingY = 0; facingY < facings.vertical; facingY++) {
        // STEP 1 & 2: Facing Expansion & Transform
        const worldPos = behavioralModel.transform(
          product.placement.position,
          fixture,
          metadata.dimensions.physical,
          metadata.dimensions.visual.anchor,
          { facingX, facingY },
        );

        // STEP 3: Depth Scaling
        let depth = 0;
        let shelfIndex = 0;

        if (isShelfSurfacePosition(product.placement.position)) {
          depth = product.placement.position.depth || 0;
          shelfIndex = product.placement.position.shelfIndex;
        }

        const depthScale = depth === 0 ? 1.0 : Math.pow(0.92, depth);

        // STEP 4: Z-Index Calculation
        const zIndexComponents = {
          shelf: shelfIndex,
          facing: facingX,
          depth: depth,
        };

        const zIndex = (1000 +
          shelfIndex * 100 -
          depth * 10 +
          facingX) as ZIndex;

        // Calculate visual properties
        const depthCategory: DepthCategory =
          depth === 0 ? "front" : depth === 1 ? "middle" : "back";

        // Create the RenderInstance (L4)
        const instance: RenderInstance = {
          id: `${product.id}-${facingX}-${facingY}`,
          sku: product.sku,
          sourceData: product,
          fixture: fixture,

          // Vocabulary uses ID string to avoid circular dependency with behavioral models
          placementModelId: modelType,
          metadata: metadata,

          physicalDimensions: metadata.dimensions.physical,
          visualDimensions: metadata.dimensions.visual,
          anchorPoint: metadata.dimensions.visual.anchor,

          worldPosition: worldPos,
          worldRotation: { x: 0, y: 0, z: 0 },
          worldDimensions: metadata.dimensions.physical,

          semanticCoordinates: product.placement.position,
          facingData: product.placement.facings || null,
          pyramidData: product.placement.pyramid || null,

          depthRatio: depthScale,
          renderScale: depthScale,
          scaledDimensions: {
            width: (metadata.dimensions.physical.width *
              depthScale) as Millimeters,
            height: (metadata.dimensions.physical.height *
              depthScale) as Millimeters,
            depth: (metadata.dimensions.physical.depth *
              depthScale) as Millimeters,
          },

          depthCategory,
          zIndexComponents,
          zIndex,
          visualProperties: {
            isFrontRow: depth === 0,
            isMiddleRow: depth === 1,
            isBackRow: depth > 1,
            depthCategory,
          },

          zLayerProperties: {
            baseZ: 1000 as ZIndex,
            shelfContribution: shelfIndex * 100,
            depthContribution: depth * -10,
            facingContribution: facingX,
            finalZIndex: zIndex,
          },

          shadowProperties: {
            enabled: true,
            type: metadata.visualProperties.shadowType || "standard",
            intensity: 0.3,
            offset: { x: 0, y: 4 },
            blur: 8,
            color: "rgba(0,0,0,0.3)",
            needsShadow: true,
          },

          maskProperties: {
            required: !!metadata.visualProperties.maskUrl,
            maskUrl: metadata.visualProperties.maskUrl || null,
            transparency: !!metadata.visualProperties.hasTransparency,
            maskType: "alpha-channel",
            compositeOperation: "destination-in",
          },

          assets: {
            spriteVariants: metadata.visualProperties.spriteVariants,
            maskUrl: metadata.visualProperties.maskUrl || null,
            shadowConfig: "default",
          },
        };

        instances.push(instance);
      }
    }

    return instances;
  }
}
