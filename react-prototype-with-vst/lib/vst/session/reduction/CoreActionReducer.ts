import {
  PlanogramConfig,
  ProductMetadata,
  SemanticPosition,
  FacingConfig,
  SourceProduct,
  FixtureConfig,
  ShelfSurfacePosition,
} from "@vst/vocabulary-types";
import { isShelfSurfacePosition } from "@vst/utils";
import { PlanogramAction } from "../types/actions";
import { IActionReducer } from "../interfaces/IActionReducer";

/**
 * INTERNAL MUTABLE INTERFACES
 * Used only within the reduce "reducer" to handle cloning and mutation.
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
 * REDUCER - Pure State Transformation
 * Applies actions to configuration (L1 → L1).
 * Pure implementation: no side effects, synchronous.
 */
export class CoreActionReducer implements IActionReducer {
  constructor(private metadata?: Map<string, ProductMetadata>) {}

  public reduce(
    base: PlanogramConfig,
    actions: PlanogramAction[],
  ): PlanogramConfig {
    // Deep clone to ensure immutability
    const config = JSON.parse(JSON.stringify(base)) as MutablePlanogramConfig;

    for (const action of actions) {
      this.executeAction(config, action);
    }

    return config as unknown as PlanogramConfig;
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
          `[CoreActionReducer] Rejected move for ${productId}. Invalid position.`,
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
          `[CoreActionReducer] Rejected facings update for ${productId}. Invalid state.`,
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
          `[CoreActionReducer] Rejected atomic update for ${productId}. Invalid state.`,
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

    const shelfPos = position as ShelfSurfacePosition;
    if (typeof shelfPos.x !== "number" || isNaN(shelfPos.x)) return false;
    if (typeof shelfPos.shelfIndex !== "number") return false;

    const meta = this.metadata?.get(product.sku);
    if (!meta) return true;

    const facings = product.placement.facings?.horizontal || 1;
    const width = meta.dimensions.physical.width * facings;
    const endX = shelfPos.x + width;
    const fixtureWidth = config.fixture?.dimensions.width || 0;

    // Bounds check
    if (shelfPos.x < -0.5 || endX > fixtureWidth + 0.5) return false;

    // Collision check
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
}
