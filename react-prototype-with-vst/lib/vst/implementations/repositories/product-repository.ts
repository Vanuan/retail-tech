import { IProductRepository } from "../../types/repositories/interfaces";
import { ProductMetadata } from "../../types/planogram/metadata";
import { PRODUCT_CATALOG } from "./mock-data";

/**
 * In-memory/LocalStorage Product Repository
 */
export class ProductRepository implements IProductRepository {
  private catalog: Map<string, ProductMetadata> = new Map();

  async initialize() {
    // Seed with mock data
    Object.entries(PRODUCT_CATALOG).forEach(([sku, meta]) => {
      this.catalog.set(sku, meta);
    });
  }

  async getBySku(sku: string): Promise<ProductMetadata | null> {
    return this.catalog.get(sku) || null;
  }

  async getByCategory(category: string): Promise<ProductMetadata[]> {
    return Array.from(this.catalog.values()).filter(
      (p) => p.classification?.category === category,
    );
  }

  async save(metadata: ProductMetadata): Promise<void> {
    this.catalog.set(metadata.sku, metadata);
  }

  async listAll(): Promise<ProductMetadata[]> {
    return Array.from(this.catalog.values());
  }
}
