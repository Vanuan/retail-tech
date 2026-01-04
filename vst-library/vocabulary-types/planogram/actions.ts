import { SemanticPosition } from "../coordinates/semantic";
import { FacingConfig } from "./placement";
import { SourceProduct } from "./product";
import { ShelfConfig, FixtureConfig } from "./config";
import { ShelfIndex } from "../core/units";

/**
 * PLANOGRAM ACTIONS
 *
 * These shapes define the "write" side of the Planogram architecture.
 * They represent the intent to change the state of the planogram.
 *
 * These are pure data structures (DTOs) and contain no logic.
 */

export interface BasePlanogramAction {
  readonly type: string;
}

export interface ProductAddAction extends BasePlanogramAction {
  type: "PRODUCT_ADD";
  product: SourceProduct;
}

export interface ProductRemoveAction extends BasePlanogramAction {
  type: "PRODUCT_REMOVE";
  productId: string;
}

export interface ProductMoveAction extends BasePlanogramAction {
  type: "PRODUCT_MOVE";
  productId: string;
  to: SemanticPosition;
}

export interface ProductUpdateFacingsAction extends BasePlanogramAction {
  type: "PRODUCT_UPDATE_FACINGS";
  productId: string;
  facings: FacingConfig;
}

export interface ShelfAddAction extends BasePlanogramAction {
  type: "SHELF_ADD";
  shelf: ShelfConfig;
}

export interface ShelfRemoveAction extends BasePlanogramAction {
  type: "SHELF_REMOVE";
  index: ShelfIndex;
}

export interface ShelfUpdateAction extends BasePlanogramAction {
  type: "SHELF_UPDATE";
  index: ShelfIndex;
  updates: Partial<ShelfConfig>;
}

export interface FixtureUpdateAction extends BasePlanogramAction {
  type: "FIXTURE_UPDATE";
  updates: Partial<FixtureConfig>;
}

export interface BatchAction extends BasePlanogramAction {
  type: "BATCH";
  actions: PlanogramAction[];
}

export type PlanogramAction =
  | ProductAddAction
  | ProductRemoveAction
  | ProductMoveAction
  | ProductUpdateFacingsAction
  | ShelfAddAction
  | ShelfRemoveAction
  | ShelfUpdateAction
  | FixtureUpdateAction
  | BatchAction;
