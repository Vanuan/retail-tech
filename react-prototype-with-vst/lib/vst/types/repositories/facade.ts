/**
 * DATA ACCESS FACADE
 * Unified interface for accessing all system data.
 */

import { IAssetProvider } from "./providers";
import { IProductRepository, IFixtureRepository, IPlanogramRepository } from "./interfaces";
import { IPlacementModelRegistry } from "../placement-models/registry";
import { ProductMetadata } from "../planogram/metadata";

export interface IDataAccessLayer {
  readonly assets: IAssetProvider;
  readonly products: IProductRepository;
  readonly fixtures: IFixtureRepository;
  readonly planograms: IPlanogramRepository;
  readonly placementModels: IPlacementModelRegistry;

  /** Initializes the data layer (e.g., pre-seeding, DB connection) */
  initialize(): Promise<void>;

  /** Convenience method to get metadata and resolve all assets */
  resolveFullProduct(sku: string): Promise<ProductMetadata | null>;

  /** Cleanup resources */
  destroy(): void;
}
