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
  IDataAccessLayer,
  ICoreProcessor,
  CoreProcessInput,
  IPlanogramSnapshot,
  PlanogramAction,
  ActionApplicationResult,
  PlacementSuggestionInput,
  PlacementSuggestion,
  ValidationContext,
  ValidationResult,
} from "@vst/vocabulary-types";
import {
  isShelfSurfacePosition,
  createFacingConfig,
} from "@vst/vocabulary-logic";
import { placementRegistry } from "@vst/placement-models";
import { RetailLogic, IRetailLogic, ActionApplier } from "@vst/retail-logic";

/**
 * CoreProcessor
 * Implements the "L4" transformation layer.
 * Converts Semantic (L1) data into Render-Ready (L4) instances.
 *
 * ELEVATED ROLE:
 * This class now acts as the "Authority" for planogram logic, handling:
 * 1. Projection (State + Actions -> Snapshot)
 * 2. Intent Validation (Can I do this?)
 * 3. Placement Suggestions (Where should this go?)
 */
export class CoreProcessor implements ICoreProcessor {
  private retailLogic = new RetailLogic();

  constructor(private dal: IDataAccessLayer) {}

  /**
   * Process a planogram configuration into a render-ready result (Async).
   */
  async processAsync(config: PlanogramConfig): Promise<ProcessedPlanogram> {
    // 1. Enrich (Fetch Metadata)
    const productSkus = new Set(config.products.map((p) => p.sku));
    const metadataMap = new Map<string, ProductMetadata>();

    for (const sku of Array.from(productSkus)) {
      const meta = await this.dal.products.getBySku(sku);
      if (meta) {
        metadataMap.set(sku, meta);
      }
    }

    return this.process({ config, metadata: metadataMap });
  }

  /**
   * Applies actions to a configuration and produces a complete snapshot.
   */
  project(
    config: PlanogramConfig,
    actions: readonly PlanogramAction[],
    metadata: ReadonlyMap<string, ProductMetadata>,
  ): IPlanogramSnapshot {
    // 1. Apply Actions (Derive L1 State)
    const derivedConfig = this.applyActions(config, actions);

    // 2. Process (Generate L4 State)
    const processed = this.process({ config: derivedConfig, metadata });

    // 3. Return Snapshot
    return {
      ...processed,
      config: derivedConfig,
    };
  }

  /**
   * Calculates the best placement for a product based on business rules.
   */
  suggestPlacement(
    input: PlacementSuggestionInput,
  ): PlacementSuggestion | null {
    const config = input.actions
      ? this.applyActions(input.config, input.actions)
      : input.config;

    return this.retailLogic.suggestPlacement({
      sku: input.sku,
      preferredShelf: input.preferredShelf,
      constraints: input.constraints,
      metadata: input.metadata as Map<string, ProductMetadata>,
      config,
      actions: [], // Actions are already applied to config
    });
  }

  /**
   * Validates if an action is permissible under business rules.
   */
  validateIntent(
    action: PlanogramAction,
    context: ValidationContext,
  ): ValidationResult {
    const config = context.actions
      ? this.applyActions(context.config, context.actions)
      : context.config;

    return this.retailLogic.validateIntent(action, {
      config,
      metadata: context.metadata as Map<string, ProductMetadata>,
    });
  }

  /**
   * Core projection logic.
   * Translates L1 + L3 into an L4 ProcessedPlanogram.
   */
  process(input: CoreProcessInput): ProcessedPlanogram {
    const { config, metadata: metadataSource } = input;
    const startTime = performance.now();
    const renderInstances: RenderInstance[] = [];
    const processingErrors: any[] = [];
    let validInstances = 0;
    let invalidCount = 0;

    const getMetadata = (sku: string) => {
      return metadataSource.get(sku);
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

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  /**
   * Pure function: Returns a new configuration object.
   */
  public applyActions(
    base: PlanogramConfig,
    actions: readonly PlanogramAction[],
  ): PlanogramConfig {
    return ActionApplier.applyActions(base, actions);
  }

  public applyActionsWithValidation(
    base: PlanogramConfig,
    actions: readonly PlanogramAction[],
    metadata: ReadonlyMap<string, ProductMetadata>,
  ): {
    config: PlanogramConfig;
    results: ActionApplicationResult[];
  } {
    let current = base;
    const results: ActionApplicationResult[] = [];

    for (const action of actions) {
      // Validate before applying
      const validation = this.validateIntent(action, {
        config: current,
        metadata,
      });

      if (!validation.valid) {
        // Action is invalid - record error but continue with previous state
        results.push({
          action,
          applied: false,
          validation,
        });
        continue;
      }

      // Apply action
      current = ActionApplier.reduceAction(current, action);

      results.push({
        action,
        applied: true,
        validation,
      });
    }

    return { config: current, results };
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

    // Get Placement Model
    const modelType = product.placement.position.model;
    const pModel =
      placementRegistry.get(modelType) ||
      placementRegistry.get("shelf-surface");

    if (!pModel) {
      throw new Error(`Placement model '${modelType}' not found`);
    }

    for (let facingX = 0; facingX < facings.horizontal; facingX++) {
      for (let facingY = 0; facingY < facings.vertical; facingY++) {
        // STEP 1 & 2: Facing Expansion & Transform
        const worldPos = pModel.transform(
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

        // Create the RenderInstance
        const instance: RenderInstance = {
          id: `${product.id}-${facingX}-${facingY}`,
          sku: product.sku,
          sourceData: product,
          fixture: fixture,
          placementModelId: pModel.id,
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
