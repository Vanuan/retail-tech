import { SemanticPosition } from "../coordinates/semantic";
import { FacingConfig } from "../planogram/placement";
import { SourceProduct } from "../planogram/product";

/**
 * PLANOGRAM ACTIONS
 * The "Verbs" of the system. Serializable instructions to change state.
 */

export type PlanogramAction =
  | MoveProductAction
  | AddProductAction
  | RemoveProductAction
  | UpdateFacingsAction
  | UpdateProductAction
  | UpdateFixtureAction;

export interface MoveProductAction {
  type: "PRODUCT_MOVE";
  productId: string;
  to: SemanticPosition; // Reusing existing strong type
  isGhost?: boolean; // For drag-preview actions
}

export interface AddProductAction {
  type: "PRODUCT_ADD";
  product: SourceProduct; // Reusing existing L1 type
}

export interface RemoveProductAction {
  type: "PRODUCT_REMOVE";
  productId: string;
}

export interface UpdateFacingsAction {
  type: "PRODUCT_FACINGS";
  productId: string;
  facings: FacingConfig;
}

export interface UpdateProductAction {
  type: "PRODUCT_UPDATE";
  productId: string;
  to?: SemanticPosition;
  facings?: FacingConfig;
}

export interface UpdateFixtureAction {
  type: "FIXTURE_UPDATE";
  config: Record<string, unknown>; // Specific to fixture model
}
