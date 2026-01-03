import {
  Vector2,
  Vector3,
  RenderProjection,
  Viewport,
  RenderInstance,
  FixtureConfig,
  ShelfSurfacePosition,
  PegboardGridPosition,
  BasketBinPosition,
} from "@vst/vocabulary-types";
import { Projection } from "../implementations/projection";

/**
 * ViewportController
 *
 * Manages the logical state of the viewport (zoom, pan, dimensions) and
 * mediates between the PlanogramCanvas and the Projection utility.
 *
 * Responsibilities:
 * 1. Maintain RenderProjection state (ppi, zoom, offset).
 * 2. Handle interactions (zoomAt, panBy).
 * 3. Perform visibility culling (getVisibleInstances).
 * 4. Coordinate conversions (unproject).
 */
export class ViewportController {
  private projection: RenderProjection;
  private width: number;
  private height: number;
  private dpi: number;

  constructor(
    width: number,
    height: number,
    dpi: number,
    initialProjection?: Partial<RenderProjection>,
  ) {
    this.width = width;
    this.height = height;
    this.dpi = dpi;

    // Default PPI is 1.0 (1 pixel per mm) to match the application's
    // coordinate system conventions.
    const defaultPPI = 1.0;

    this.projection = {
      type: "orthographic",
      ppi: initialProjection?.ppi ?? defaultPPI,
      zoom: initialProjection?.zoom ?? 1.0,
      offset: initialProjection?.offset ?? { x: 0, y: 0, z: 0 },
      ...initialProjection,
    };
  }

  /**
   * Updates the viewport dimensions (e.g. on window resize).
   */
  public resize(width: number, height: number, dpi?: number): void {
    this.width = width;
    this.height = height;
    if (dpi !== undefined) {
      this.dpi = dpi;
    }
  }

  /**
   * Returns the current RenderProjection state.
   */
  public getProjection(): RenderProjection {
    // Return a copy to prevent direct mutation
    return {
      ...this.projection,
      offset: { ...this.projection.offset },
    };
  }

  /**
   * Returns the public Viewport interface.
   */
  public getViewport(): Viewport {
    return {
      x: 0,
      y: 0,
      width: this.width,
      height: this.height,
      zoom: this.projection.zoom,
      dpi: this.dpi,
    };
  }

  // --- Interaction Logic ---

  /**
   * Pans the viewport by a delta in pixels.
   */
  public panBy(delta: Vector2): void {
    this.projection.offset.x += delta.x;
    this.projection.offset.y += delta.y;
  }

  /**
   * Sets the pan offset directly (in pixels).
   */
  public setPan(x: number, y: number): void {
    this.projection.offset.x = x;
    this.projection.offset.y = y;
  }

  /**
   * Sets the zoom level directly.
   */
  public setZoom(zoom: number): void {
    this.projection.zoom = zoom;
  }

  /**
   * Performs a stable zoom at a specific screen point.
   * The point under the cursor remains stationary.
   *
   * @param screenPoint The focal point of the zoom in pixels.
   * @param factor The multiplier for the current zoom (e.g. 1.1 or 0.9).
   * @param minZoom Minimum allowed zoom level.
   * @param maxZoom Maximum allowed zoom level.
   */
  public zoomAt(
    screenPoint: Vector2,
    factor: number,
    minZoom: number = 0.1,
    maxZoom: number = 5.0,
  ): void {
    const oldZoom = this.projection.zoom;
    const newZoom = Math.max(minZoom, Math.min(maxZoom, oldZoom * factor));

    // Calculate the ratio of change
    const ratio = newZoom / oldZoom;

    // Calculate the distance from the offset (origin) to the focal point
    const oldDistX = screenPoint.x - this.projection.offset.x;
    const oldDistY = screenPoint.y - this.projection.offset.y;

    // Scale that distance by the zoom ratio
    const newDistX = oldDistX * ratio;
    const newDistY = oldDistY * ratio;

    // Update state
    this.projection.zoom = newZoom;
    this.projection.offset.x = screenPoint.x - newDistX;
    this.projection.offset.y = screenPoint.y - newDistY;
  }

  /**
   * Zooms into the center of the current viewport.
   */
  public zoomCenter(
    factor: number,
    minZoom: number = 0.1,
    maxZoom: number = 5.0,
  ): void {
    const center = { x: this.width / 2, y: this.height / 2 };
    this.zoomAt(center, factor, minZoom, maxZoom);
  }

  /**
   * Adjusts zoom and pan to fit the given fixture within the viewport.
   */
  public fitToFixture(fixture: FixtureConfig, padding: number = 20): void {
    const { width: fWidth, height: fHeight } = fixture.dimensions;
    const { width: vWidth, height: vHeight } = this;
    const { ppi } = this.projection;

    // Available space
    const availWidth = vWidth - padding * 2;
    const availHeight = vHeight - padding * 2;

    // Calculate required zoom to fit width and height
    // Width in pixels = fWidth * ppi * zoom
    // zoom = Width_px / (fWidth * ppi)
    const zoomX = availWidth / (fWidth * ppi);
    const zoomY = availHeight / (fHeight * ppi);

    // Use the smaller zoom to ensure it fits entirely
    const newZoom = Math.min(zoomX, zoomY);

    this.projection.zoom = newZoom;

    // Center the fixture
    // Fixture is drawn starting at offset.x, offset.y (plus Y flip logic)
    // We want the center of the fixture to be at center of viewport.

    // Project center of fixture (World)
    const worldCenter = { x: fWidth / 2, y: fHeight / 2, z: 0 };

    // Calculate required offset to center the fixture
    const scale = ppi * newZoom;

    // For X: project.x = (world.x * scale) + offset.x
    // offset.x = screen.x - (world.x * scale)
    this.projection.offset.x = vWidth / 2 - worldCenter.x * scale;

    // For Y: project.y = (fixtureHeightPx - world.y * scale) + offset.y
    // offset.y = screen.y - (fixtureHeightPx - world.y * scale)
    const fixtureHeightPx = fHeight * scale;
    this.projection.offset.y =
      vHeight / 2 - (fixtureHeightPx - worldCenter.y * scale);
  }

  // --- Coordinate Mapping ---

  /**
   * Converts a screen point (pixels) to World Space (millimeters).
   */
  public unproject(screenPoint: Vector2, fixture: FixtureConfig): Vector3 {
    return Projection.unproject(screenPoint, fixture, this.projection);
  }

  /**
   * Converts a World Space point (millimeters) to screen coordinates (pixels).
   */
  public project(worldPoint: Vector3, fixture: FixtureConfig): Vector2 {
    return Projection.project(worldPoint, fixture, this.projection);
  }

  // --- Culling ---

  /**
   * Generates a stable grouping key based on the placement model.
   * Handles shelves, pegboards, and bins correctly.
   */
  private getGroupKey(instance: RenderInstance): string {
    const { semanticCoordinates: sc, sourceData } = instance;
    const baseKey = sourceData.id;

    switch (sc.model) {
      case "shelf-surface":
        return `${baseKey}:shelf:${(sc as ShelfSurfacePosition).shelfIndex}`;
      case "pegboard-grid": {
        const p = sc as PegboardGridPosition;
        return `${baseKey}:peg:${p.holeX}:${p.holeY}`;
      }
      case "basket-bin":
        return `${baseKey}:bin:${(sc as BasketBinPosition).containerId}`;
      default:
        return baseKey;
    }
  }

  /**
   * Returns a subset of instances that are currently visible within the viewport.
   * This is an optimization to reduce the load on the renderer.
   */
  public getVisibleInstances(
    instances: RenderInstance[],
    fixture: FixtureConfig,
    margin: number = 500,
  ): RenderInstance[] {
    // 1. Calculate the visible window in screen space with a safety margin
    // This prevents objects from popping in/out at the edges and ensures
    // grouped elements (like price labels) have context.
    const viewportRect = {
      left: -margin,
      top: -margin,
      right: this.width + margin,
      bottom: this.height + margin,
    };

    // 2. Identify visible groups (Product ID + Shelf Index)
    const visibleGroups = new Set<string>();

    for (const instance of instances) {
      const pos = Projection.project(
        instance.worldPosition,
        fixture,
        this.projection,
      );
      const scale =
        this.projection.ppi * this.projection.zoom * instance.depthRatio;

      const renderWidth = instance.worldDimensions.width * scale;
      const renderHeight = instance.worldDimensions.height * scale;

      // Top-left of the instance sprite (given that anchor is typically relative)
      const x = pos.x - instance.anchorPoint.x * renderWidth;
      const y = pos.y - instance.anchorPoint.y * renderHeight;

      // Check intersection (AABB)
      const instanceRight = x + renderWidth;
      const instanceBottom = y + renderHeight;

      const isVisible = !(
        instanceRight < viewportRect.left ||
        x > viewportRect.right ||
        instanceBottom < viewportRect.top ||
        y > viewportRect.bottom
      );

      if (isVisible) {
        // Create a unique key for the group
        // This ensures that if any part of a product group is visible,
        // the entire group (all facings) is rendered, preventing label shifting.
        visibleGroups.add(this.getGroupKey(instance));
      }
    }

    // 3. Return all instances that belong to a visible group
    return instances.filter((instance) => {
      return visibleGroups.has(this.getGroupKey(instance));
    });
  }
}
