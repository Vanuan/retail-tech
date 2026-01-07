import {
  PlanogramConfig,
  PlanogramAction,
  ShelfConfig,
} from "@vst/vocabulary-types";

export class ActionApplier {
  /**
   * Applies a sequence of actions to a configuration state.
   * Returns a new configuration object (does not mutate inputs).
   */
  public static applyActions(
    config: PlanogramConfig,
    actions: readonly PlanogramAction[],
  ): PlanogramConfig {
    return actions.reduce(
      (currentConfig, action) => this.reduceAction(currentConfig, action),
      config,
    );
  }

  /**
   * Applies a single action to a configuration state.
   * Returns a new configuration object.
   */
  public static reduceAction(
    config: PlanogramConfig,
    action: PlanogramAction,
  ): PlanogramConfig {
    switch (action.type) {
      case "PRODUCT_ADD": {
        return {
          ...config,
          products: [...config.products, action.product],
        };
      }
      case "PRODUCT_REMOVE": {
        return {
          ...config,
          products: config.products.filter((p) => p.id !== action.productId),
        };
      }
      case "PRODUCT_MOVE": {
        return {
          ...config,
          products: config.products.map((p) =>
            p.id === action.productId
              ? { ...p, placement: { ...p.placement, position: action.to } }
              : p,
          ),
        };
      }
      case "PRODUCT_UPDATE_FACINGS": {
        return {
          ...config,
          products: config.products.map((p) =>
            p.id === action.productId
              ? {
                  ...p,
                  placement: { ...p.placement, facings: action.facings },
                }
              : p,
          ),
        };
      }
      case "BATCH": {
        return this.applyActions(config, action.actions);
      }
      case "SHELF_ADD": {
        const shelves = (config.fixture.config.shelves as ShelfConfig[]) || [];
        return {
          ...config,
          fixture: {
            ...config.fixture,
            config: {
              ...config.fixture.config,
              shelves: [...shelves, action.shelf],
            },
          },
        };
      }
      case "SHELF_REMOVE": {
        const shelves = (config.fixture.config.shelves as ShelfConfig[]) || [];
        return {
          ...config,
          fixture: {
            ...config.fixture,
            config: {
              ...config.fixture.config,
              shelves: shelves.filter((s) => s.index !== action.index),
            },
          },
        };
      }
      case "SHELF_UPDATE": {
        const shelves = (config.fixture.config.shelves as ShelfConfig[]) || [];
        return {
          ...config,
          fixture: {
            ...config.fixture,
            config: {
              ...config.fixture.config,
              shelves: shelves.map((s) =>
                s.index === action.index ? { ...s, ...action.updates } : s,
              ),
            },
          },
        };
      }
      case "FIXTURE_UPDATE": {
        const { config: updateConfig, ...updateOthers } = action.updates;
        const resultFixture = {
          ...config.fixture,
          ...updateOthers,
        };
        if (updateConfig) {
          resultFixture.config = {
            ...config.fixture.config,
            ...(updateConfig as Record<string, unknown>),
          };
        }
        return {
          ...config,
          fixture: resultFixture,
        };
      }
      default:
        return config;
    }
  }
}
