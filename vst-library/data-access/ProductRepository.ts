import { IProductRepository, ProductMetadata } from "@vst/vocabulary-types";
import { PRODUCT_CATALOG } from "./mock-data";

/**
 * In-memory/LocalStorage Product Repository
 */
export class ProductRepository implements IProductRepository {
  private catalog: Map<string, ProductMetadata> = new Map();

  /**
   * Initializes the repository by seeding it with mock catalog data.
   */
  async initialize() {
    // Seed with mock data
    Object.entries(PRODUCT_CATALOG).forEach(([sku, meta]) => {
      this.catalog.set(sku, meta);
    });
  }

  /**
   * Retrieves product metadata by SKU.
   */
  async getBySku(sku: string): Promise<ProductMetadata | null> {
    return this.catalog.get(sku) || null;
  }

  /**
   * Retrieves all products belonging to a specific category.
   */
  async getByCategory(category: string): Promise<ProductMetadata[]> {
    return Array.from(this.catalog.values()).filter(
      (p) => p.classification?.category === category,
    );
  }

  /**
   * Persists or updates product metadata.
   */
  async save(metadata: ProductMetadata): Promise<void> {
    this.catalog.set(metadata.sku, metadata);
  }

  /**
   * Returns the entire product catalog.
   */
  async listAll(): Promise<ProductMetadata[]> {
    return Array.from(this.catalog.values());
  }
}
