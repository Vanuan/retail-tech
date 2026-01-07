/**
 * DATA ACCESS LAYER IMPLEMENTATION
 * Concrete implementations of repositories and the unified facade.
 */

import {
  IDataAccessLayer,
  IAssetProvider,
  ProductMetadata,
} from "@vst/vocabulary-types";
import { IPlacementModelRegistry } from "@vst/placement-core";
import { placementRegistry } from "@vst/placement-models";
import { BrowserAssetProvider } from "./BrowserAssetProvider";
import { AssetProvider } from "./AssetProvider";
import { ProductRepository } from "./ProductRepository";
import { FixtureRepository } from "./FixtureRepository";
import { PlanogramRepository } from "./PlanogramRepository";

/**
 * Unified Data Access Layer implementation
 */
export class DataAccessLayer implements IDataAccessLayer {
  public readonly assets: IAssetProvider;
  public readonly products: ProductRepository;
  public readonly fixtures: FixtureRepository;
  public readonly planograms: PlanogramRepository;
  public readonly placementModels: IPlacementModelRegistry;

  constructor(options: { config?: { cdnBaseUrl: string } } = {}) {
    if (options.config?.cdnBaseUrl) {
      this.assets = new AssetProvider({
        cdnBaseUrl: options.config.cdnBaseUrl,
      });
    } else {
      this.assets = new BrowserAssetProvider();
    }

    this.products = new ProductRepository();
    this.fixtures = new FixtureRepository();
    this.planograms = new PlanogramRepository();
    this.placementModels = placementRegistry;
  }

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

  async resolveFullProduct(sku: string): Promise<ProductMetadata | null> {
    const meta = await this.products.getBySku(sku);
    if (!meta) return null;

    // In a real app, this might involve fetching high-res assets
    // or resolving dynamic properties.
    return meta;
  }

  destroy(): void {
    this.assets.clearCache();
  }
}

/**
 * Global singleton instance for the data access layer
 */
export const dal = new DataAccessLayer();
