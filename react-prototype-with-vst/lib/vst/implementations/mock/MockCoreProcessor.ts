import {
  ActionApplicationResult,
  CoreProcessInput,
  ICoreProcessor,
  IPlanogramSnapshot,
  PlacementSuggestion,
  PlacementSuggestionInput,
  PlanogramAction,
  PlanogramConfig,
  ProcessedPlanogram,
  ProductMetadata,
  RenderInstance,
  ShelfConfig,
  ShelfSurfacePosition,
  ValidationContext,
  ValidationResult,
} from "@vst/vocabulary-types";
import { isShelfSurfacePosition } from "@vst/vocabulary-logic";

/**
 * A lightweight, dependency-free mock implementation of the ICoreProcessor.
 * This is used for development, testing, and Storybook environments where
 * the real DAL-dependent CoreProcessor is not available or desired.
 *
 * It contains the simplified rendering logic that was previously used as a
 * fallback in the CoreSequenceRoller/CoreSnapshotProjector.
 */
export class MockCoreProcessor implements ICoreProcessor {
  constructor(private metadata: Map<string, ProductMetadata>) {}

  public project(
    config: PlanogramConfig,
    actions: readonly PlanogramAction[],
    metadata: ReadonlyMap<string, ProductMetadata>,
  ): IPlanogramSnapshot {
    const derivedConfig = this.applyActions(config, actions);
    const processed = this.process({ config: derivedConfig, metadata });
    return {
      ...processed,
      config: derivedConfig,
    };
  }

  public applyActions(
    base: PlanogramConfig,
    actions: readonly PlanogramAction[],
  ): PlanogramConfig {
    return actions.reduce((config, action) => {
      switch (action.type) {
        case "PRODUCT_MOVE":
          return {
            ...config,
            products: config.products.map((p) =>
              p.id === action.productId
                ? { ...p, placement: { ...p.placement, position: action.to } }
                : p,
            ),
          };
        case "PRODUCT_ADD":
          return {
            ...config,
            products: [...config.products, action.product],
          };
        case "PRODUCT_REMOVE":
          return {
            ...config,
            products: config.products.filter((p) => p.id !== action.productId),
          };
        case "BATCH":
          return this.applyActions(config, action.actions);
        default:
          return config;
      }
    }, base);
  }

  public applyActionsWithValidation(
    base: PlanogramConfig,
    actions: readonly PlanogramAction[],
    metadata: ReadonlyMap<string, ProductMetadata>,
  ): {
    config: PlanogramConfig;
    results: ActionApplicationResult[];
  } {
    let current = base;
    const results: ActionApplicationResult[] = [];

    for (const action of actions) {
      const validation = this.validateIntent(action, {
        config: current,
        metadata,
      });

      if (validation.valid) {
        current = this.applyActions(current, [action]);
      }

      results.push({
        action,
        applied: validation.valid,
        validation,
      });
    }

    return { config: current, results };
  }

  public suggestPlacement(
    input: PlacementSuggestionInput,
  ): PlacementSuggestion | null {
    return null;
  }

  public validateIntent(
    action: PlanogramAction,
    context: ValidationContext,
  ): ValidationResult {
    return {
      valid: true,
      canRender: true,
      errors: [],
      warnings: [],
    };
  }

  /**
   * Processes a planogram configuration into a set of renderable instances.
   * @param input The planogram configuration and associated metadata.
   * @returns A ProcessedPlanogram object containing render instances.
   */
  public process(input: CoreProcessInput): ProcessedPlanogram {
    const { config } = input;
    const instances: RenderInstance[] = [];
    const shelves = (config.fixture.config.shelves as ShelfConfig[]) || [];

    for (const p of config.products) {
      const meta = input.metadata.get(p.sku) || this.metadata.get(p.sku);
      const position = p.placement.position;
      const isShelf = isShelfSurfacePosition(position);
      const facings = p.placement.facings?.horizontal || 1;
      const pWidth = meta?.dimensions.physical.width || 50;
      const pHeight = meta?.dimensions.physical.height || 50;
      const pDepth = meta?.dimensions.physical.depth || 50;

      let worldY = 0;
      if (isShelf) {
        const shelfPos = position as ShelfSurfacePosition;
        const shelf = shelves.find((s) => s.index === shelfPos.shelfIndex);
        if (shelf) {
          worldY = shelf.baseHeight;
        }
      }

      for (let f = 0; f < facings; f++) {
        const instanceId = facings > 1 ? `${p.id}-${f}` : p.id;
        instances.push({
          id: instanceId,
          sku: p.sku,
          sourceData: p,
          metadata: meta || ({} as any),
          worldPosition: {
            x:
              (isShelf ? (position as ShelfSurfacePosition).x : 0) + f * pWidth,
            y: worldY,
            z: isShelf ? (position as ShelfSurfacePosition).depth || 0 : 0,
          },
          worldDimensions: {
            width: pWidth,
            height: pHeight,
            depth: pDepth,
          },
          anchorPoint: { x: 0, y: 1 }, // Bottom-left
          depthRatio: 1,
          visualProperties: {
            isFrontRow: true,
          },
        } as unknown as RenderInstance); // Using 'as' to simplify mock object creation
      }
    }

    return {
      renderInstances: instances,
      fixture: config.fixture,
      metadata: {
        totalInstances: instances.length,
        validInstances: instances.length,
        invalidCount: 0,
        processingTime: 1, // Mock time
      },
    };
  }
}
