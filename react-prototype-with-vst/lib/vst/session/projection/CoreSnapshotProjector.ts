import {
  PlanogramConfig,
  RenderInstance,
  ValidationResult,
  ProductMetadata,
  ValidationError,
  Millimeters,
  ShelfConfig,
  ICoreProcessor,
} from "@vst/vocabulary-types";
import { ISnapshotProjector } from "../interfaces/ISnapshotProjector";
import { PlanogramSnapshot, HitTarget } from "../types/state";

/**
 * PROJECTOR - Render State Projection
 * Projects configuration to a renderable snapshot (L1 → L4).
 * This class is a thin wrapper around a dedicated ICoreProcessor. It delegates
 * all rendering logic to the processor and then enriches the result with
 * session-specific information, such as spatial indices for hit-testing.
 */
export class CoreSnapshotProjector implements ISnapshotProjector {
  /**
   * @param processor The rendering engine responsible for converting L1 config to L4 render instances.
   * @param metadata A map of product SKU to its metadata, required by the processor.
   */
  constructor(
    private processor: ICoreProcessor,
    private metadata: Map<string, ProductMetadata>,
  ) {}

  /**
   * Projects a configuration into a complete snapshot with render instances.
   * This operation is synchronous as it relies on the synchronous ICoreProcessor.
   */
  public async project(config: PlanogramConfig): Promise<PlanogramSnapshot> {
    // 1. Delegate ALL rendering to the processor. This is the single source of truth.
    const processed = this.processor.process({
      config,
      metadata: this.metadata,
    });

    // 2. Build validation results from the processor's output metadata.
    const validation: ValidationResult = {
      valid: processed.metadata.invalidCount === 0,
      canRender: processed.renderInstances.length > 0,
      errors: (processed.metadata.processingErrors || []) as ValidationError[],
      warnings: [], // The current processor does not produce warnings.
    };

    // 3. Build spatial indices for UI optimizations (e.g., hit-testing).
    // This is the unique responsibility of the session-layer projector.
    const indices = this.buildIndices(config, processed.renderInstances);

    // 4. Package the final, enriched snapshot object.
    return {
      ...processed,
      config,
      renderInstances: processed.renderInstances,
      validation,
      session: {
        isDirty: false, // To be overridden by the PlanogramReducer facade or SessionStore
        actionCount: 0, // To be overridden by the PlanogramReducer facade or SessionStore
        timestamp: Date.now(),
      },
      indices,
    };
  }

  /**
   * Builds spatial and lookup indices for the snapshot.
   * These are used by the UI to perform fast queries, such as converting
   * a mouse click to a product ID (hit-testing).
   */
  private buildIndices(config: PlanogramConfig, instances: RenderInstance[]) {
    const productById = new Map<string, RenderInstance>();
    const metadataBySku = new Map<string, ProductMetadata>();

    for (const inst of instances) {
      if (inst.sourceData?.id) {
        // Note: For facings > 1, this will only store the first instance.
        // This is generally acceptable for UI selection purposes.
        if (!productById.has(inst.sourceData.id)) {
          productById.set(inst.sourceData.id, inst);
        }
      }
      if (inst.metadata && !metadataBySku.has(inst.metadata.sku)) {
        metadataBySku.set(inst.metadata.sku, inst.metadata);
      }
    }

    const resolveWorldPoint = (x: number, y: number): HitTarget | null => {
      // Iterate backwards to prioritize items rendered on top.
      for (let i = instances.length - 1; i >= 0; i--) {
        const inst = instances[i];
        const { worldPosition: wp, worldDimensions: wd } = inst;

        // Calculate instance bounding box based on its anchor point.
        const xMin = wp.x - (inst.anchorPoint?.x || 0) * wd.width;
        const xMax = xMin + wd.width;
        const yMin = wp.y - (1 - (inst.anchorPoint?.y || 1)) * wd.height;
        const yMax = yMin + wd.height;

        if (x >= xMin && x <= xMax && y >= yMin && y <= yMax) {
          return {
            type: "product",
            id: inst.sourceData.id,
            worldBounds: {
              x: wp.x as Millimeters,
              y: wp.y as Millimeters,
              width: wd.width,
              height: wd.height,
            },
          };
        }
      }

      // Fallback to checking for shelves if no product was hit.
      if (config.fixture) {
        const shelves = (config.fixture.config.shelves as ShelfConfig[]) || [];
        const fixtureWidth = config.fixture.dimensions.width;

        for (const shelf of shelves) {
          const shelfY = shelf.baseHeight;
          // Use a tolerance for clicking on the shelf line.
          if (x >= 0 && x <= fixtureWidth && Math.abs(y - shelfY) < 20) {
            return {
              type: "shelf",
              id: shelf.id || `shelf-${shelf.index}`,
              index: shelf.index,
            };
          }
        }
      }

      return null;
    };

    return { productById, metadataBySku, resolveWorldPoint };
  }
}
