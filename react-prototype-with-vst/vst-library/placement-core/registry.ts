/**
 * PLACEMENT MODEL REGISTRY
 * Central lookup for all available translation strategies.
 */

import { IPlacementModel } from "./interface";

export interface IPlacementModelRegistry {
  /** Retrieves a model by its ID */
  get(id: string): IPlacementModel | null;

  /** Registers a new translation strategy */
  register(model: IPlacementModel): void;

  /** Returns all registered models */
  getAll(): IPlacementModel[];
}
