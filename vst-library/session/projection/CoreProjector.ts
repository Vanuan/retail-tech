import {
  PlanogramConfig,
  RenderInstance,
  ValidationResult,
  ProductMetadata,
  SemanticPosition,
  FacingConfig,
  SourceProduct,
} from "@vst/vocabulary-types";
import {
  IPlanogramProjector,
  PlanogramAction,
  PlanogramSnapshot,
} from "@vst/session-types";
import { CoreLayerProcessor } from "@vst/core-processing";

/**
 * Default implementation of the Projector.
 * Applies Flux-like actions to a base PlanogramConfig and projects
 * to RenderInstances using the CoreLayerProcessor.
 */
export class CoreProjector implements IPlanogramProjector {
  private processor: CoreLayerProcessor;

  constructor(processor: CoreLayerProcessor) {
    this.processor = processor;
  }

  public async project(
    base: PlanogramConfig,
    actions: PlanogramAction[],
  ): Promise<PlanogramSnapshot> {
    // 1. Apply Actions to derive new L1 Config (The "Reducer")
    const derivedConfig = this.applyActions(base, actions);

    // 2. Project L1 -> L4 (Render Instances) using the Core Processor
    const processed = await this.processor.processPlanogram(derivedConfig);
    const renderInstances = processed.renderInstances;

    // 3. Construct Validation Result from processing metadata
    const validation: ValidationResult = {
      valid: processed.metadata.invalidCount === 0,
      canRender: renderInstances.length > 0,
      errors: (processed.metadata.processingErrors || []) as any[],
      warnings: [],
    };

    // 4. Build Indices for fast lookup
    const indices = this.buildIndices(renderInstances);

    // 5. Construct the immutable Snapshot
    return {
      config: derivedConfig,
      renderInstances,
      validation,
      session: {
        isDirty: actions.length > 0,
        actionCount: actions.length,
        timestamp: Date.now(),
        // selection would be handled by the store
      },
      indices,
    };
  }

  /**
   * The "Reducer" logic: (State, Actions) => NewState
   */
  private applyActions(
    base: PlanogramConfig,
    actions: PlanogramAction[],
  ): PlanogramConfig {
    // Deep clone to ensure immutability (naive implementation for this exercise)
    const config: PlanogramConfig = JSON.parse(JSON.stringify(base));

    let currentConfig = config;

    for (const action of actions) {
      switch (action.type) {
        case "PRODUCT_MOVE":
          currentConfig = this.applyMove(
            currentConfig,
            action.productId,
            action.to,
          );
          break;
        case "PRODUCT_ADD":
          currentConfig = this.applyAdd(currentConfig, action.product);
          break;
        case "PRODUCT_REMOVE":
          currentConfig = this.applyRemove(currentConfig, action.productId);
          break;
        case "PRODUCT_FACINGS":
          currentConfig = this.applyFacings(
            currentConfig,
            action.productId,
            action.facings,
          );
          break;
        case "FIXTURE_UPDATE":
          currentConfig = {
            ...currentConfig,
            fixture: {
              ...currentConfig.fixture,
              config: {
                ...currentConfig.fixture.config,
                ...action.config,
              },
            },
          };
          break;
      }
    }

    return currentConfig;
  }

  private applyMove(
    config: PlanogramConfig,
    productId: string,
    to: SemanticPosition,
  ): PlanogramConfig {
    return {
      ...config,
      products: config.products.map((p) =>
        p.id === productId
          ? {
              ...p,
              placement: {
                ...p.placement,
                position: to,
              },
            }
          : p,
      ),
    };
  }

  private applyAdd(
    config: PlanogramConfig,
    product: SourceProduct,
  ): PlanogramConfig {
    return {
      ...config,
      products: [...config.products, product],
    };
  }

  private applyRemove(
    config: PlanogramConfig,
    productId: string,
  ): PlanogramConfig {
    return {
      ...config,
      products: config.products.filter((p) => p.id !== productId),
    };
  }

  private applyFacings(
    config: PlanogramConfig,
    productId: string,
    facings: FacingConfig,
  ): PlanogramConfig {
    return {
      ...config,
      products: config.products.map((p) =>
        p.id === productId
          ? {
              ...p,
              placement: {
                ...p.placement,
                facings: facings,
              },
            }
          : p,
      ),
    };
  }

  private buildIndices(instances: RenderInstance[]) {
    const productById = new Map<string, RenderInstance>();
    const metadataBySku = new Map<string, ProductMetadata>();

    for (const inst of instances) {
      // Accessing sourceData via 'any' because RenderInstance is complex
      // and we just mocked it above.
      const source = (inst as any).sourceData as SourceProduct;
      if (source && source.id) {
        productById.set(source.id, inst);
      }

      if (inst.metadata) {
        metadataBySku.set(inst.metadata.sku, inst.metadata);
      }
    }

    return { productById, metadataBySku };
  }
}
