/**
 * DATA ACCESS LAYER
 *
 * This module provides a unified entry point for all data-related operations
 * within the VST library. It abstracts the complexities of asset resolution,
 * metadata retrieval, and fixture configuration.
 */

import {
  IDataAccessLayer,
  IAssetProvider,
  IProductRepository,
  IFixtureRepository,
  IPlanogramRepository,
  ProductMetadata,
} from "@vst/vocabulary-types";
import { IPlacementModelRegistry } from "@vst/placement-core";

import { BrowserAssetProvider } from "./BrowserAssetProvider";
import { ProductRepository } from "./ProductRepository";
import { FixtureRepository } from "./FixtureRepository";
import { PlanogramRepository } from "./PlanogramRepository";

export * from "./BrowserAssetProvider";
export * from "./ProductRepository";
export * from "./FixtureRepository";
export * from "./PlanogramRepository";
export * from "./PlacementModelRegistry";

/**
 * Unified Data Access Layer implementation
 */
export class DataAccessLayer implements IDataAccessLayer {
  public readonly assets: BrowserAssetProvider;
  public readonly products: ProductRepository;
  public readonly fixtures: FixtureRepository;
  public readonly planograms: PlanogramRepository;

  constructor(options: { config?: { cdnBaseUrl: string } } = {}) {
    this.assets = new BrowserAssetProvider();
    this.products = new ProductRepository();
    this.fixtures = new FixtureRepository();
    this.planograms = new PlanogramRepository();
  }

  /**
   * Initializes the data layer by loading core entities and registering assets.
   */
  async initialize(): Promise<void> {
    await this.products.initialize();
    await this.fixtures.initialize();

    // Register initial assets from catalog
    const allProducts = await this.products.listAll();
    allProducts.forEach((product) => {
      if (product.visualProperties.spriteVariants?.[0]) {
        this.assets.registerAsset(
          product.sku,
          product.visualProperties.spriteVariants[0].url,
          "sprite",
        );
      }
      if (product.visualProperties.maskUrl) {
        this.assets.registerAsset(
          product.sku,
          product.visualProperties.maskUrl,
          "mask",
        );
      }
    });

    console.log(
      "[DataAccessLayer] Initialized with",
      allProducts.length,
      "products",
    );
  }

  /**
   * Convenience method to get metadata and resolve all assets.
   */
  async resolveFullProduct(sku: string): Promise<ProductMetadata | null> {
    const meta = await this.products.getBySku(sku);
    if (!meta) return null;

    // In a real app, this might involve fetching high-res assets
    // or resolving dynamic properties.
    return meta;
  }

  /**
   * Cleanup resources.
   */
  destroy(): void {
    this.assets.clearCache();
  }
}

/**
 * Global singleton instance for the data access layer
 */
export const dal = new DataAccessLayer();
