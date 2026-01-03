import {
  PlanogramConfig,
  RenderInstance,
  ValidationResult,
  ProductMetadata,
  SemanticPosition,
  FacingConfig,
  SourceProduct,
  ValidationError,
  ValidationWarning,
  Millimeters,
  ShelfSurfacePosition,
  FixtureConfig,
  ProcessedPlanogram,
  ShelfConfig,
  ICoreProcessor,
} from "@vst/vocabulary-types";
import { isShelfSurfacePosition } from "@vst/utils";
import { IPlanogramSequenceRoller } from "../types/contract";
import { PlanogramAction } from "../types/actions";
import { PlanogramSnapshot, HitTarget } from "../types/state";

/**
 * INTERNAL MUTABLE INTERFACES
 * Used only within the applyActions "reducer" to handle cloning and mutation.
 */
interface MutableSourceProduct extends Omit<SourceProduct, "placement"> {
  placement: {
    position: SemanticPosition;
    facings?: FacingConfig;
  };
}

interface MutableFixtureConfig extends Omit<FixtureConfig, "config"> {
  config: Record<string, unknown>;
}

interface MutablePlanogramConfig extends Omit<
  PlanogramConfig,
  "fixture" | "products"
> {
  fixture: MutableFixtureConfig;
  products: MutableSourceProduct[];
}

/**
 * Default implementation of the Projector.
 * Applies Flux-like actions to a base PlanogramConfig and (simulates) the projection
 * to RenderInstances.
 */
export class CoreSequenceRoller implements IPlanogramSequenceRoller {
  constructor(
    private processor?: ICoreProcessor,
    private metadata?: Map<string, ProductMetadata>,
  ) {}

  public async roll(
    base: PlanogramConfig,
    actions: PlanogramAction[],
  ): Promise<PlanogramSnapshot> {
    // 1. Apply Actions to derive new L1 Config (The "Reducer")
    const derivedConfig = this.applyActions(base, actions);

    // 2. Project L1 -> L4 (Render Instances)
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
    // Deep clone to ensure immutability
    const config = JSON.parse(JSON.stringify(base)) as MutablePlanogramConfig;

    for (const action of actions) {
      this.executeAction(config, action);
    }

    return config;
  }

  private executeAction(
    config: MutablePlanogramConfig,
    action: PlanogramAction,
  ) {
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
          config.fixture.config = {
            ...config.fixture.config,
            ...action.config,
          };
        }
        break;
      case "BATCH":
        for (const subAction of action.actions) {
          this.executeAction(config, subAction);
        }
        break;
    }
  }

  private applyMove(
    config: MutablePlanogramConfig,
    productId: string,
    to: SemanticPosition,
  ) {
    const product = config.products.find((p) => p.id === productId);
    if (product) {
      const originalPosition = { ...product.placement.position };
      product.placement.position = to;
      if (
        !this.isProductValid(
          config as unknown as PlanogramConfig,
          product as unknown as SourceProduct,
        )
      ) {
        console.warn(
          `[CoreSequenceRoller] Rejected move for ${productId}. Invalid position.`,
        );
        product.placement.position = originalPosition;
      }
    }
  }

  private applyAdd(config: MutablePlanogramConfig, product: SourceProduct) {
    config.products.push(JSON.parse(JSON.stringify(product)));
  }

  private applyRemove(config: MutablePlanogramConfig, productId: string) {
    config.products = config.products.filter((p) => p.id !== productId);
  }

  private applyFacings(
    config: MutablePlanogramConfig,
    productId: string,
    facings: FacingConfig,
  ) {
    const product = config.products.find((p) => p.id === productId);
    if (product) {
      const originalFacings = product.placement.facings
        ? { ...product.placement.facings }
        : undefined;
      product.placement.facings = facings;
      if (
        !this.isProductValid(
          config as unknown as PlanogramConfig,
          product as unknown as SourceProduct,
        )
      ) {
        console.warn(
          `[CoreSequenceRoller] Rejected facings update for ${productId}. Invalid state.`,
        );
        product.placement.facings = originalFacings;
      }
    }
  }

  private applyUpdate(
    config: MutablePlanogramConfig,
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

      if (
        !this.isProductValid(
          config as unknown as PlanogramConfig,
          product as unknown as SourceProduct,
        )
      ) {
        console.warn(
          `[CoreSequenceRoller] Rejected atomic update for ${productId}. Invalid state.`,
        );
        product.placement.position = originalPosition;
        product.placement.facings = originalFacings;
      }
    }
  }

  private isProductValid(
    config: PlanogramConfig,
    product: SourceProduct,
  ): boolean {
    const position = product.placement.position;
    if (!isShelfSurfacePosition(position)) return true;

    // Strict coordinate validation
    const shelfPos = position as ShelfSurfacePosition;
    if (typeof shelfPos.x !== "number" || isNaN(shelfPos.x)) return false;
    if (typeof shelfPos.shelfIndex !== "number") return false;

    const meta = this.metadata?.get(product.sku);
    if (!meta) return true;

    const facings = product.placement.facings?.horizontal || 1;
    const width = meta.dimensions.physical.width * facings;
    const endX = shelfPos.x + width;
    const fixtureWidth = config.fixture?.dimensions.width || 0;

    // 1. Bounds check (with 0.5mm tolerance)
    if (shelfPos.x < -0.5 || endX > fixtureWidth + 0.5) return false;

    // 2. Collision check (with 0.5mm tolerance)
    for (const other of config.products) {
      if (other.id === product.id) continue;
      if (!isShelfSurfacePosition(other.placement.position)) continue;

      const otherPos = other.placement.position as ShelfSurfacePosition;
      if (otherPos.shelfIndex !== shelfPos.shelfIndex) continue;
      if ((otherPos.depth || 0) !== (shelfPos.depth || 0)) continue;

      const otherMeta = this.metadata?.get(other.sku);
      if (!otherMeta) continue;

      const otherW =
        otherMeta.dimensions.physical.width *
        (other.placement.facings?.horizontal || 1);
      const otherXStart = otherPos.x;
      const otherXEnd = otherXStart + otherW;

      if (shelfPos.x < otherXEnd - 0.5 && endX > otherXStart + 0.5) {
        return false;
      }
    }

    return true;
  }

  private async generateRenderInstances(
    config: PlanogramConfig,
  ): Promise<RenderInstance[]> {
    if (this.processor && this.metadata) {
      try {
        const result = this.processor.process({
          config,
          metadata: this.metadata,
        });
        if (result && result.renderInstances) {
          return result.renderInstances;
        }
      } catch (e) {
        console.error(
          "CoreSequenceRoller: Real projection failed, falling back",
          e,
        );
      }
    }

    // Fallback Mock Logic
    const instances: RenderInstance[] = [];
    const shelves = (config.fixture.config.shelves as ShelfConfig[]) || [];

    for (const p of config.products) {
      const meta = this.metadata?.get(p.sku);
      const position = p.placement.position;
      const isShelf = isShelfSurfacePosition(position);
      const facings = p.placement.facings?.horizontal || 1;
      const pWidth = meta?.dimensions.physical.width || 50;

      let worldY = 0;
      if (isShelf) {
        const shelfPos = position as ShelfSurfacePosition;
        const shelf = shelves.find((s) => s.index === shelfPos.shelfIndex);
        if (shelf) worldY = shelf.baseHeight;
      }

      for (let f = 0; f < facings; f++) {
        instances.push({
          id: `${p.id}-${f}`,
          sku: p.sku,
          sourceData: p,
          metadata: meta || ({} as any),
          worldPosition: {
            x:
              (isShelf ? (position as ShelfSurfacePosition).x : 0) + f * pWidth,
            y: worldY,
            z: isShelf ? (position as ShelfSurfacePosition).depth || 0 : 0,
          },
          worldDimensions: {
            width: pWidth,
            height: meta?.dimensions.physical.height || 50,
            depth: meta?.dimensions.physical.depth || 50,
          },
          anchorPoint: { x: 0, y: 1 },
          depthRatio: 1,
          visualProperties: {
            isFrontRow: true,
          },
        } as unknown as RenderInstance);
      }
    }

    return instances;
  }

  private validate(
    config: PlanogramConfig,
    instances: RenderInstance[],
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    for (const product of config.products) {
      const position = product.placement.position;

      if (isShelfSurfacePosition(position)) {
        const shelfPos = position as ShelfSurfacePosition;
        const meta = this.metadata?.get(product.sku);
        if (meta) {
          const facings = product.placement.facings?.horizontal || 1;
          const width = meta.dimensions.physical.width * facings;
          const endX = shelfPos.x + width;
          const fixtureWidth = config.fixture?.dimensions.width || 0;

          if (shelfPos.x < 0 || endX > fixtureWidth) {
            errors.push({
              code: "OUT_OF_BOUNDS",
              message: `Product ${product.sku} is out of bounds`,
              entityId: product.id,
            });
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      canRender: true,
      errors,
      warnings,
    };
  }

  private buildIndices(config: PlanogramConfig, instances: RenderInstance[]) {
    const productById = new Map<string, RenderInstance>();
    const metadataBySku = new Map<string, ProductMetadata>();

    for (const inst of instances) {
      if (inst.sourceData?.id) {
        productById.set(inst.sourceData.id, inst);
      }
      if (inst.metadata) {
        metadataBySku.set(inst.metadata.sku, inst.metadata);
      }
    }

    const resolveWorldPoint = (x: number, y: number): HitTarget | null => {
      for (let i = instances.length - 1; i >= 0; i--) {
        const inst = instances[i];
        const { worldPosition: wp, worldDimensions: wd } = inst;

        const xMin = wp.x - (inst.anchorPoint?.x || 0) * wd.width;
        const xMax = xMin + wd.width;
        const yMin = wp.y - (1 - (inst.anchorPoint?.y || 1)) * wd.height;
        const yMax = yMin + wd.height;

        if (x >= xMin && x <= xMax && y >= yMin && y <= yMax) {
          return {
            type: "product",
            id: inst.sourceData.id,
            worldBounds: {
              x: wp.x as Millimeters,
              y: wp.y as Millimeters,
              width: wd.width,
              height: wd.height,
            },
          };
        }
      }

      if (config.fixture) {
        const shelves = (config.fixture.config.shelves as ShelfConfig[]) || [];
        const fixtureWidth = config.fixture.dimensions.width;

        for (const shelf of shelves) {
          const shelfY = shelf.baseHeight;
          if (x >= 0 && x <= fixtureWidth && Math.abs(y - shelfY) < 20) {
            return {
              type: "shelf",
              id: shelf.id || `shelf-${shelf.index}`,
              index: shelf.index,
            };
          }
        }
      }

      return null;
    };

    return { productById, metadataBySku, resolveWorldPoint };
  }
}
