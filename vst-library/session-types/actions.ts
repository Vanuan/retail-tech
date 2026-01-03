import { SemanticPosition, FacingConfig, SourceProduct } from "@vst/vocabulary-types";

/**
 * PLANOGRAM ACTIONS
 * The "Verbs" of the system. Serializable instructions to change state.
 */

export type PlanogramAction =
  | MoveProductAction
  | AddProductAction
  | RemoveProductAction
  | UpdateFacingsAction
  | UpdateFixtureAction;

export interface MoveProductAction {
  type: "PRODUCT_MOVE";
  productId: string;
  to: SemanticPosition;
  isGhost?: boolean; // For drag-preview actions
}

export interface AddProductAction {
  type: "PRODUCT_ADD";
  product: SourceProduct;
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

export interface UpdateFixtureAction {
  type: "FIXTURE_UPDATE";
  config: Record<string, unknown>; // Specific to fixture model
}
