import {
  SemanticPosition,
  FacingConfig,
  ShelfConfig,
  ShelfIndex,
  FixtureConfig,
} from "@vst/vocabulary-types";

import {
  ProductAddAction,
  ProductRemoveAction,
  ProductMoveAction,
  ProductUpdateFacingsAction,
  ShelfAddAction,
  ShelfRemoveAction,
  ShelfUpdateAction,
  FixtureUpdateAction,
  BatchAction,
  PlanogramAction,
} from "./types";

export const PlanogramActions = {
  addProduct(input: {
    id: string;
    sku: string;
    position: SemanticPosition;
    facings: FacingConfig;
  }): ProductAddAction {
    return {
      type: "PRODUCT_ADD",
      product: {
        id: input.id,
        sku: input.sku,
        placement: {
          position: input.position,
          facings: input.facings,
        },
      },
    };
  },

  removeProduct(productId: string): ProductRemoveAction {
    return {
      type: "PRODUCT_REMOVE",
      productId,
    };
  },

  moveProduct(input: {
    productId: string;
    to: SemanticPosition;
  }): ProductMoveAction {
    return {
      type: "PRODUCT_MOVE",
      productId: input.productId,
      to: input.to,
    };
  },

  updateFacings(input: {
    productId: string;
    facings: FacingConfig;
  }): ProductUpdateFacingsAction {
    return {
      type: "PRODUCT_UPDATE_FACINGS",
      productId: input.productId,
      facings: input.facings,
    };
  },

  addShelf(shelf: ShelfConfig): ShelfAddAction {
    return {
      type: "SHELF_ADD",
      shelf,
    };
  },

  removeShelf(index: ShelfIndex): ShelfRemoveAction {
    return {
      type: "SHELF_REMOVE",
      index,
    };
  },

  updateShelf(input: {
    index: ShelfIndex;
    updates: Partial<ShelfConfig>;
  }): ShelfUpdateAction {
    return {
      type: "SHELF_UPDATE",
      index: input.index,
      updates: input.updates,
    };
  },

  updateFixture(updates: Partial<FixtureConfig>): FixtureUpdateAction {
    return {
      type: "FIXTURE_UPDATE",
      updates,
    };
  },

  batch(actions: PlanogramAction[]): BatchAction {
    return {
      type: "BATCH",
      actions,
    };
  },
} as const;
