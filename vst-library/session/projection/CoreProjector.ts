import {
  IPlanogramProjector,
  PlanogramConfig,
  PlanogramAction,
  PlanogramSnapshot,
  RenderInstance,
  ValidationResult,
  ProductMetadata,
  SemanticPosition,
  FacingConfig,
  SourceProduct
} from "@vst/types";

/**
 * Default implementation of the Projector.
 * Applies Flux-like actions to a base PlanogramConfig and (simulates) the projection
 * to RenderInstances.
 */
export class CoreProjector implements IPlanogramProjector {

  /**
   * core-processing dependencies would be injected here in a real app.
   * For this implementation, we will simulate the L4 projection.
   */
  constructor() {}

  public async project(
    base: PlanogramConfig,
    actions: PlanogramAction[]
  ): Promise<PlanogramSnapshot> {
    // 1. Apply Actions to derive new L1 Config (The "Reducer")
    const derivedConfig = this.applyActions(base, actions);

    // 2. Project L1 -> L4 (Render Instances)
    // In the full system, this delegates to ProductInstanceGenerator/Positioners
    const renderInstances = await this.generateRenderInstances(derivedConfig);

    // 3. Run Validation
    const validation = this.validate(derivedConfig, renderInstances);

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
      indices
    };
  }

  /**
   * The "Reducer" logic: (State, Actions) => NewState
   */
  private applyActions(base: PlanogramConfig, actions: PlanogramAction[]): PlanogramConfig {
    // Deep clone to ensure immutability (naive implementation for this exercise)
    const config: PlanogramConfig = JSON.parse(JSON.stringify(base));

    for (const action of actions) {
      switch (action.type) {
        case "PRODUCT_MOVE":
          this.applyMove(config, action.productId, action.to);
          break;
        case "PRODUCT_ADD":
          this.applyAdd(config, action.product);
          break;
        case "PRODUCT_REMOVE":
          this.applyRemove(config, action.productId);
          break;
        case "PRODUCT_FACINGS":
          this.applyFacings(config, action.productId, action.facings);
          break;
        case "FIXTURE_UPDATE":
          if (config.fixture) {
             config.fixture.config = { ...config.fixture.config, ...action.config };
          }
          break;
      }
    }

    return config;
  }

  private applyMove(config: PlanogramConfig, productId: string, to: SemanticPosition) {
    const product = config.products.find(p => p.id === productId);
    if (product) {
      product.placement.coordinates = to;
    }
  }

  private applyAdd(config: PlanogramConfig, product: SourceProduct) {
    // Ensure uniqueness or handle replacement strategies here
    config.products.push(product);
  }

  private applyRemove(config: PlanogramConfig, productId: string) {
    config.products = config.products.filter(p => p.id !== productId);
  }

  private applyFacings(config: PlanogramConfig, productId: string, facings: FacingConfig) {
    const product = config.products.find(p => p.id === productId);
    if (product) {
      product.placement.facings = facings;
    }
  }

  /**
   * Simulates the projection from Config to RenderInstances.
   * This bridges the gap between the Session layer and the Core Processing layer.
   */
  private async generateRenderInstances(config: PlanogramConfig): Promise<RenderInstance[]> {
    // In a real integration, this would call:
    // return Promise.all(config.products.map(p => this.instanceGenerator.process(..., p)));

    // For this structural layer, we map roughly
    return config.products.map(p => {
        // We cast this because constructing a full RenderInstance requires
        // the heavy logic from core-processing (dimensions, scaling, etc.)
        return {
            id: p.id,
            sourceData: p,
            // Mocking required fields to satisfy the type for the snapshot
            metadata: { sku: p.sku } as any,
            renderBounds: { x: 0, y: 0, width: 0, height: 0 },
            renderCoordinates: { x: 0, y: 0, scale: 1 }
        } as unknown as RenderInstance;
    });
  }

  private validate(config: PlanogramConfig, instances: RenderInstance[]): ValidationResult {
    // Mock validation result
    return {
      valid: true,
      canRender: true,
      errors: [],
      warnings: []
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
