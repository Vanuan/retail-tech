import { ProductMetadata, IProductRepository, IAssetProvider } from "../types";
import { STUB_PRODUCTS } from "./stubs/products";

/**
 * PRODUCT REPOSITORY
 *
 * Acts as the Data Access Object (DAO) for the VST library. It handles the
 * retrieval and persistence of product metadata and integrates with the
 * AssetProvider to ensure visual assets are correctly mapped.
 *
 * Architectural Positioning:
 * - Metadata: Typically resides in a relational database or a headless CMS.
 * - Integration: Combines raw DB records with resolved CDN URLs from S3.
 */
export class ProductRepository implements IProductRepository {
  private assetProvider: IAssetProvider;

  // In-memory cache or local mock storage
  private localStore: Map<string, ProductMetadata> = new Map();

  constructor(assetProvider: IAssetProvider) {
    this.assetProvider = assetProvider;
    this.initializeDefaults();
  }

  /**
   * Populates the repository with default mock data for development.
   */
  private initializeDefaults(): void {
    STUB_PRODUCTS.forEach((p) => this.localStore.set(p.sku, p));
  }

  /**
   * Retrieves a product by its SKU, enriching it with resolved asset URLs.
   */
  public async getBySku(sku: string): Promise<ProductMetadata | null> {
    // 1. Fetch raw metadata from the source (Mocking a DB call here)
    const rawData = this.localStore.get(sku);
    if (!rawData) return null;

    // 2. Enrich the metadata with resolved URLs from the AssetProvider
    // This ensures that the application doesn't hardcode S3/CDN paths.
    return this.enrichProductMetadata(rawData);
  }

  /**
   * Retrieves all products for a specific category.
   */
  public async getByCategory(category: string): Promise<ProductMetadata[]> {
    const products = Array.from(this.localStore.values()).filter(
      (p) => p.classification.category === category,
    );

    return Promise.all(products.map((p) => this.enrichProductMetadata(p)));
  }

  /**
   * Persists or updates product metadata.
   */
  public async save(metadata: ProductMetadata): Promise<void> {
    this.localStore.set(metadata.sku, metadata);
  }

  /**
   * Helper to ensure visual properties are correctly resolved through the AssetProvider.
   * This is the "Strong API Boundary" where semantic data meets binary storage paths.
   */
  private async enrichProductMetadata(
    data: ProductMetadata,
  ): Promise<ProductMetadata> {
    const enriched = { ...data };

    // Resolve sprite variants
    // If the metadata doesn't have explicit URLs, we generate them based on standard patterns
    if (enriched.visualProperties.spriteVariants.length === 0) {
      // Example: Default to 'front' view if none specified
      const defaultUrl = this.assetProvider.getSpriteUrl(data.sku, "front");
      enriched.visualProperties.spriteVariants = [
        { angle: 0, url: defaultUrl },
      ];
    } else {
      // Re-resolve existing variants to ensure they use the latest CDN configuration
      enriched.visualProperties.spriteVariants =
        enriched.visualProperties.spriteVariants.map((v) => ({
          ...v,
          url: this.assetProvider.getSpriteUrl(data.sku, v.angle),
        }));
    }

    // Resolve mask URL
    enriched.visualProperties.maskUrl = this.assetProvider.getMaskUrl(data.sku);

    return enriched;
  }

  /**
   * Seeds the repository with initial data for testing/demo purposes.
   */
  public seed(products: ProductMetadata[]): void {
    products.forEach((p) => this.localStore.set(p.sku, p));
  }
}
