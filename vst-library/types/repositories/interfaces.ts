/**
 * REPOSITORY INTERFACES
 * Data access objects for domain entities.
 */

import { ProductMetadata } from "../planogram/metadata";
import { FixtureConfig, PlanogramConfig } from "../planogram/config";

export interface IProductRepository {
  getBySku(sku: string): Promise<ProductMetadata | null>;
  getByCategory(category: string): Promise<ProductMetadata[]>;
  save(metadata: ProductMetadata): Promise<void>;
}

export interface IFixtureRepository {
  getByType(type: string): Promise<FixtureConfig | null>;
  registerFixture(config: FixtureConfig): Promise<void>;
  listAvailableTypes(): Promise<string[]>;
}

export interface IPlanogramRepository {
  getById(id: string): Promise<PlanogramConfig | null>;
  listAllIds(): Promise<string[]>;
  save(id: string, config: PlanogramConfig): Promise<void>;
  delete(id: string): Promise<boolean>;
}
