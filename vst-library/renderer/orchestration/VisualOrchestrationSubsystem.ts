import { IVisualOrchestration, IRendererZLayerManager, IRendererProductPositioner, IHitTester } from "../../types/renderer";
import { RendererZLayerManager } from "./RendererZLayerManager";
import { RendererProductPositioner } from "./RendererProductPositioner";
import { HitTester } from "./HitTester";

/**
 * VISUAL ORCHESTRATION SUBSYSTEM
 *
 * Central hub for the Renderer Layer's spatial and visual organization tasks.
 * This subsystem aggregates managers responsible for:
 * 1. Z-Indexing (Ordering objects for correct draw overlap)
 * 2. Positioning (Applying spatial transforms to the rendering context)
 * 3. Hit Testing (Detecting user interaction with spatial objects)
 *
 * It acts as a bridge between the raw prepared data from the Core Layer
 * and the execution commands required by the Drawing Engine.
 */
export class VisualOrchestrationSubsystem implements IVisualOrchestration {
  public readonly zLayerManager: IRendererZLayerManager;
  public readonly productPositioner: IRendererProductPositioner;
  public readonly hitTester: IHitTester;

  constructor() {
    this.zLayerManager = new RendererZLayerManager();
    this.productPositioner = new RendererProductPositioner();
    this.hitTester = new HitTester();
  }

  /**
   * Orchestrates the visual preparation for a group of instances.
   * This typically involves sorting them for the correct draw order.
   *
   * @param instances Array of render-ready instances from the Core Layer.
   * @returns Sorted array of instances ready for the drawing loop.
   */
  public prepareDrawOrder(instances: any[]): any[] {
    return this.zLayerManager.sortByZIndex(instances);
  }
}
