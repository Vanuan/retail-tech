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
  IPlacementModelRegistry,
  ProductMetadata,
} from "../types";
import { AssetProvider } from "./AssetProvider";
import { ProductRepository } from "./ProductRepository";
import { FixtureRepository } from "./FixtureRepository";
import { PlanogramRepository } from "./PlanogramRepository";
import { PlacementModelRegistry } from "./PlacementModelRegistry";

export * from "./AssetProvider";
export * from "./ProductRepository";
export * from "./FixtureRepository";
export * from "./PlanogramRepository";
export * from "./PlacementModelRegistry";
export * from "./stubs";

/**
 * DATA ACCESS LAYER FACADE
 *
 * A high-level interface that simplifies library integration by orchestrating
 * multiple repositories and providers. This is the recommended way for the
 * CompleteSystem and Renderer layers to interact with the data persistence layer.
 */
export class DataAccessLayer implements IDataAccessLayer {
  public readonly assets: IAssetProvider;
  public readonly products: IProductRepository;
  public readonly fixtures: IFixtureRepository;
  public readonly planograms: IPlanogramRepository;
  public readonly placementModels: IPlacementModelRegistry;

  /**
   * Initializes the Data Access Layer.
   * Supports injection of custom implementations or defaults to internal providers.
   */
  constructor(options: {
    config?: { cdnBaseUrl: string; useMockStorage?: boolean };
    providers?: {
      assets?: IAssetProvider;
      products?: IProductRepository;
      fixtures?: IFixtureRepository;
      planograms?: IPlanogramRepository;
      placementModels?: IPlacementModelRegistry;
    };
  }) {
    const { config, providers = {} } = options;

    // Initialize Assets
    this.assets =
      providers.assets ||
      new AssetProvider({
        cdnBaseUrl: config?.cdnBaseUrl || "",
        useMockStorage: config?.useMockStorage,
      });

    // Initialize Products (depends on assets)
    this.products = providers.products || new ProductRepository(this.assets);

    // Initialize others
    this.fixtures = providers.fixtures || new FixtureRepository();
    this.planograms = providers.planograms || new PlanogramRepository();
    this.placementModels =
      providers.placementModels || new PlacementModelRegistry();
  }

  /**
   * Warm up the system by pre-loading core fixtures and essential assets.
   */
  public async initialize(): Promise<void> {
    // In a real implementation, this could fetch global settings or
    // common sprites needed for initial rendering.
    console.log(
      "[DataAccessLayer] Initialized with CDN:",
      (this.assets as any).cdnBaseUrl,
    );
  }

  /**
   * Helper to quickly resolve a full L4 ProductMetadata object including
   * binary assets from a simple SKU.
   */
  public async resolveFullProduct(
    sku: string,
  ): Promise<ProductMetadata | null> {
    return this.products.getBySku(sku);
  }

  /**
   * Cleans up internal caches to prevent memory leaks in long-running
   * sessions (e.g., the Visualizer editor).
   */
  public destroy(): void {
    this.assets.clearCache();
  }
}
