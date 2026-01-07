/**
 * PLACEMENT MODEL REGISTRY
 * Central lookup for all available translation strategies.
 */

import { IPlacementModel, IPlacementModelRegistry } from "@vst/placement-core";
import { ShelfSurfacePlacementModel } from "./ShelfSurfacePlacementModel";
import { PegboardGridPlacementModel } from "./PegboardGridPlacementModel";
import { Freeform3DPlacementModel } from "./Freeform3DPlacementModel";
import { BasketBinPlacementModel } from "./BasketBinPlacementModel";

/**
 * PLACEMENT MODEL REGISTRY IMPLEMENTATION
 *
 * Manages available placement models that determine how products are spatially
 * organized within different types of fixtures.
 *
 * Architectural Positioning:
 * - Part of the Data Access Layer to provide a unified API for structural rules.
 * - Decoupled from vocabulary-types to allow for behavioral implementation.
 */
export class PlacementModelRegistry implements IPlacementModelRegistry {
  private models: Map<string, IPlacementModel> = new Map();

  constructor() {
    this.initializeDefaultModels();
  }

  /**
   * Pre-loads standard retail placement models.
   */
  private initializeDefaultModels(): void {
    // Register the four standard VST placement models
    this.register(new ShelfSurfacePlacementModel());
    this.register(new PegboardGridPlacementModel());
    this.register(new Freeform3DPlacementModel());
    this.register(new BasketBinPlacementModel());
  }

  /**
   * Retrieves a placement model by its unique identifier.
   */
  public get(id: string): IPlacementModel | null {
    return this.models.get(id) || null;
  }

  /**
   * Registers a new placement model implementation.
   */
  public register(model: IPlacementModel): void {
    if (!model || !model.id) {
      throw new Error(
        "PlacementModelRegistry: Cannot register a model without a valid ID.",
      );
    }
    this.models.set(model.id, model);
  }

  /**
   * Returns all registered placement models.
   */
  public getAll(): IPlacementModel[] {
    return Array.from(this.models.values());
  }
}
