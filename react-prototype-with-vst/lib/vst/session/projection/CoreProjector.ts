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
  SourceProduct,
  ValidationError,
  ValidationWarning,
  isShelfSurfacePosition,
  HitTarget
} from "@vst/types";

/**
 * Default implementation of the Projector.
 * Applies Flux-like actions to a base PlanogramConfig and (simulates) the projection
 * to RenderInstances.
 */
export class CoreProjector implements IPlanogramProjector {
  /**
   * core-processing dependencies would be injected here in a real app.
   */
  constructor(
    private processor?: any,
    private metadata?: Map<string, ProductMetadata>,
  ) {}

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
    const indices = this.buildIndices(derivedConfig, renderInstances);

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
        case "PRODUCT_UPDATE":
          this.applyUpdate(config, action.productId, action.to, action.facings);
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
      const originalPosition = { ...product.placement.position };
      product.placement.position = to;
      if (!this.isProductValid(config, product)) {
        console.warn(`[CoreProjector] Rejected move for ${productId} to x:${(to as any).x}. Invalid position.`);
        product.placement.position = originalPosition as SemanticPosition;
      }
    }
  }

  private applyAdd(config: PlanogramConfig, product: SourceProduct) {
    // We allow adding the product even if it's currently invalid (e.g., overlapping)
    // to prevent it from "disappearing" from the session.
    // The validation layer will still mark it as an error/warning in the UI.
    config.products.push(product);
  }

  private applyRemove(config: PlanogramConfig, productId: string) {
    config.products = config.products.filter(p => p.id !== productId);
  }

  private applyFacings(config: PlanogramConfig, productId: string, facings: FacingConfig) {
    const product = config.products.find(p => p.id === productId);
    if (product) {
      const originalFacings = product.placement.facings ? { ...product.placement.facings } : undefined;
      product.placement.facings = facings;
      if (!this.isProductValid(config, product)) {
        console.warn(`[CoreProjector] Rejected facings update for ${productId} to ${facings.horizontal}. Invalid state.`);
        product.placement.facings = originalFacings as FacingConfig;
      }
    }
  }

  private applyUpdate(
    config: PlanogramConfig,
    productId: string,
    to?: SemanticPosition,
    facings?: FacingConfig,
  ) {
    const product = config.products.find((p) => p.id === productId);
    if (product) {
      const originalPosition = { ...product.placement.position };
      const originalFacings = product.placement.facings
        ? { ...product.placement.facings }
        : undefined;

      if (to) product.placement.position = to;
      if (facings) product.placement.facings = facings;

      if (!this.isProductValid(config, product)) {
        console.warn(`[CoreProjector] Rejected atomic update for ${productId}. Invalid state.`);
        product.placement.position = originalPosition as SemanticPosition;
        product.placement.facings = originalFacings as FacingConfig;
      }
    }
  }

  private isProductValid(config: PlanogramConfig, product: SourceProduct): boolean {
    const position = product.placement.position;
    if (!isShelfSurfacePosition(position)) return true;

    // Strict coordinate validation: ensure required numeric fields are present
    if (typeof (position as any).x !== "number" || isNaN((position as any).x)) return false;
    if (typeof (position as any).shelfIndex !== "number") return false;

    const meta = this.metadata?.get(product.sku);
    if (!meta) return true;

    const facings = product.placement.facings?.horizontal || 1;
    const width = meta.dimensions.physical.width * facings;
    const endX = position.x + width;
    const fixtureWidth = config.fixture?.dimensions.width || 0;

    // 1. Bounds check (with 0.5mm tolerance to prevent flickering during drag)
    if (position.x < -0.5 || endX > fixtureWidth + 0.5) return false;

    // 2. Collision check (with 0.5mm tolerance)
    for (const other of config.products) {
      if (other.id === product.id) continue;
      if (!isShelfSurfacePosition(other.placement.position)) continue;
      if (other.placement.position.shelfIndex !== position.shelfIndex) continue;
      if ((other.placement.position.depth || 0) !== (position.depth || 0)) continue;

      const otherMeta = this.metadata?.get(other.sku);
      if (!otherMeta) continue;

      const otherW = otherMeta.dimensions.physical.width * (other.placement.facings?.horizontal || 1);
      const otherXStart = other.placement.position.x;
      const otherXEnd = otherXStart + otherW;

      if (position.x < otherXEnd - 0.5 && endX > otherXStart + 0.5) {
        return false;
      }
    }

    return true;
  }

  /**
   * Simulates the projection from Config to RenderInstances.
   * This bridges the gap between the Session layer and the Core Processing layer.
   */
  private async generateRenderInstances(
    config: PlanogramConfig,
  ): Promise<RenderInstance[]> {
    // If we have a processor and metadata, use the real L4 generation logic
    if (this.processor && this.metadata) {
      try {
        const result = this.processor.processSync(config, this.metadata);
        if (result && result.renderInstances) {
          return result.renderInstances;
        }
      } catch (e) {
        console.error("CoreProjector: Real projection failed, falling back", e);
      }
    }

    // Fallback: mock mapping to prevent products from disappearing during transient invalid states
    const instances: RenderInstance[] = [];

    for (const p of config.products) {
      const meta = this.metadata?.get(p.sku);
      const position = p.placement.position;
      const isShelf = isShelfSurfacePosition(position);
      const facings = p.placement.facings?.horizontal || 1;
      const pWidth = meta?.dimensions.physical.width || 50;

      let worldY = 0;
      if (isShelf && config.fixture) {
        const shelves = (config.fixture.config.shelves as any[]) || [];
        const shelf = shelves.find(
          (s) => s.index === (position as any).shelfIndex,
        );
        if (shelf) worldY = shelf.baseHeight;
      }

      for (let f = 0; f < facings; f++) {
        instances.push({
          id: `${p.id}-${f}`,
          sku: p.sku,
          sourceData: p,
          metadata: meta || ({
            sku: p.sku,
            name: "Loading...",
            dimensions: { physical: { width: 50, height: 50, depth: 50 } }
          } as any),
          worldPosition: {
            x: ((isShelf ? (position as any).x ?? 0 : 0) + f * pWidth) as any,
            y: worldY as any,
            z: (isShelf ? (position as any).depth || 0 : 0) as any,
          },
          worldDimensions: {
            width: pWidth as any,
            height: (meta?.dimensions.physical.height || 50) as any,
            depth: (meta?.dimensions.physical.depth || 50) as any,
          },
          renderBounds: {
            x: 0 as any,
            y: 0 as any,
            width: pWidth as any,
            height: (meta?.dimensions.physical.height || 50) as any
          },
          renderCoordinates: { x: 0 as any, y: 0 as any, scale: 1 },
          anchorPoint: { x: 0, y: 1 },
          depthRatio: 1,
          assets: {
            spriteVariants: meta?.visualProperties?.assets?.spriteVariants || [],
          },
          visualProperties: {
            isFrontRow: true,
            materials: { emissiveColor: "#3b82f6" }
          },
          zLayerProperties: { facingContribution: f },
        } as unknown as RenderInstance);
      }
    }

    return instances;
  }

  private validate(config: PlanogramConfig, instances: RenderInstance[]): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // 1. Check shelf bounds for all products
    for (const product of config.products) {
      const position = product.placement.position;

      if (isShelfSurfacePosition(position)) {
        const meta = this.metadata?.get(product.sku);
        if (meta) {
          const facings = product.placement.facings?.horizontal || 1;
          const width = meta.dimensions.physical.width * facings;
          const endX = position.x + width;
          const fixtureWidth = config.fixture?.dimensions.width || 0;

          if (position.x < 0 || endX > fixtureWidth) {
            errors.push({
              code: "OUT_OF_BOUNDS",
              message: `Product ${product.sku} is out of bounds on shelf ${position.shelfIndex}`,
              entityId: product.id
            });
          }
        }
      }
    }

    // 2. Check collisions
    for (let i = 0; i < config.products.length; i++) {
      const p1 = config.products[i];
      const pos1 = p1.placement.position;
      if (!isShelfSurfacePosition(pos1)) continue;

      const meta1 = this.metadata?.get(p1.sku);
      if (!meta1) continue;

      const w1 = meta1.dimensions.physical.width * (p1.placement.facings?.horizontal || 1);
      const x1_start = pos1.x;
      const x1_end = x1_start + w1;

      for (let j = i + 1; j < config.products.length; j++) {
        const p2 = config.products[j];
        const pos2 = p2.placement.position;
        if (!isShelfSurfacePosition(pos2)) continue;

        if (pos1.shelfIndex === pos2.shelfIndex && (pos1.depth || 0) === (pos2.depth || 0)) {
          const meta2 = this.metadata?.get(p2.sku);
          if (!meta2) continue;

          const w2 = meta2.dimensions.physical.width * (p2.placement.facings?.horizontal || 1);
          const x2_start = pos2.x;
          const x2_end = x2_start + w2;

          if (x1_start < x2_end && x1_end > x2_start) {
            errors.push({
              code: "COLLISION_DETECTED",
              message: `Collision between ${p1.sku} and ${p2.sku} on shelf ${pos1.shelfIndex}`,
              entityId: p1.id
            });
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      canRender: true,
      errors,
      warnings
    };
  }

  private buildIndices(config: PlanogramConfig, instances: RenderInstance[]) {
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

    /**
     * World-Space Hit Resolution
     * Resolves a coordinate in Millimeters (mm) to a semantic target.
     */
    const resolveWorldPoint = (x: number, y: number): HitTarget | null => {
      // 1. Check Products (Top-down z-order from instances)
      // We iterate instances in reverse because last drawn is on top
      for (let i = instances.length - 1; i >= 0; i--) {
        const inst = instances[i];
        const worldPos = inst.worldPosition;
        const worldDim = inst.worldDimensions;

        // Hit testing in world space (mm), accounting for semantic anchor points.
        // In VST World Space, Y increases UPWARDS.
        // A screen-space anchor.y of 1.0 (bottom) means worldPos.y is the baseline (min Y).
        const xMin = worldPos.x - (inst.anchorPoint?.x || 0) * worldDim.width;
        const xMax = xMin + worldDim.width;
        const yMin = worldPos.y - (1 - (inst.anchorPoint?.y || 1)) * worldDim.height;
        const yMax = yMin + worldDim.height;

        const hit = x >= xMin && x <= xMax && y >= yMin && y <= yMax;

        if (hit) {
          return {
            type: "product",
            id: inst.sourceData.id,
            worldBounds: {
              x: worldPos.x,
              y: worldPos.y,
              width: worldDim.width,
              height: worldDim.height
            }
          };
        }
      }

      // 2. Check Shelves
      if (config.fixture) {
        const shelves = (config.fixture.config.shelves as any[]) || [];
        const fixtureWidth = config.fixture.dimensions.width;

        for (const shelf of shelves) {
          const shelfY = shelf.baseHeight;
          const tolerance = 20; // 20mm tolerance for shelf selection

          if (x >= 0 && x <= fixtureWidth && Math.abs(y - shelfY) < tolerance) {
            return {
              type: "shelf",
              id: shelf.id || `shelf-${shelf.index}`,
              index: shelf.index
            };
          }
        }
      }

      return null;
    };

    return { productById, metadataBySku, resolveWorldPoint };
  }
}
