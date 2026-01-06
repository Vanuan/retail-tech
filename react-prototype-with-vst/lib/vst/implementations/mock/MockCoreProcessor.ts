import {
  CoreProcessInput,
  ICoreProcessor,
  ProcessedPlanogram,
  ProductMetadata,
  RenderInstance,
  ShelfConfig,
  ShelfSurfacePosition,
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
      const meta = this.metadata.get(p.sku);
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
              (isShelf ? (position as ShelfSurfacePosition).x : 0) +
              f * pWidth,
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
