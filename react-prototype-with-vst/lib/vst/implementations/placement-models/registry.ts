/**
 * PLACEMENT MODEL REGISTRY
 * Implementation of the central lookup for all available translation strategies.
 */

import { IPlacementModel } from "./interface";
import { IPlacementModelRegistry } from "./registry-interface";
import { ShelfSurfacePlacementModel } from "./shelf-surface";

export class PlacementModelRegistry implements IPlacementModelRegistry {
  private models: Map<string, IPlacementModel> = new Map();

  constructor() {
    // Register default models
    this.register(new ShelfSurfacePlacementModel());
  }

  /**
   * Retrieves a model by its ID.
   * @param id The unique identifier of the placement model (e.g., "shelf-surface").
   */
  public get(id: string): IPlacementModel | null {
    return this.models.get(id) || null;
  }

  /**
   * Registers a new translation strategy.
   * @param model An instance of a class implementing IPlacementModel.
   */
  public register(model: IPlacementModel): void {
    if (this.models.has(model.id)) {
      console.warn(
        `Placement model with ID "${model.id}" is already registered. Overwriting.`,
      );
    }
    this.models.set(model.id, model);
  }

  /**
   * Returns all registered models.
   */
  public getAll(): IPlacementModel[] {
    return Array.from(this.models.values());
  }
}

/**
 * Singleton instance for easy access across the application.
 */
export const placementRegistry = new PlacementModelRegistry();
