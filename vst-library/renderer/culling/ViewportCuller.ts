import { RenderInstance } from "../../types";
import { Viewport } from "../../types/renderer";

interface CullerCacheEntry {
  instances: RenderInstance[];
  timestamp: number;
  viewport: Viewport;
}

/**
 * VIEWPORT CULLER
 * Optimized visibility detection for rendering large planograms.
 * Consumes prepared instances from the Core Layer and filters them
 * based on the current camera/viewport bounds.
 */
export class ViewportCuller {
  private cache: Map<string, CullerCacheEntry> = new Map();
  private readonly visibilityMargin: number = 300; // pixels
  private readonly cacheValidityMs: number = 100;

  /**
   * Filters all instances down to those currently visible in the viewport.
   * @param instances The list of all prepared render instances.
   * @param viewport The current viewport state (position, size, zoom).
   */
  public cull(instances: RenderInstance[], viewport: Viewport): RenderInstance[] {
    const cacheKey = this.getCacheKey(viewport);

    // Cache hit check (valid for 100ms or until viewport changes significantly)
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      if (Date.now() - cached.timestamp < this.cacheValidityMs) {
        return cached.instances;
      }
    }

    // Expand viewport bounds for preloading and smooth panning
    const expandedBounds = this.expandViewport(viewport);

    // Filter instances using bounding box intersection
    const visibleInstances = instances.filter((instance) =>
      this.isInstanceVisible(instance, expandedBounds),
    );

    // Performance Optimization: Sort by distance from viewport center.
    // This allows the renderer to process "priority" items first if needed.
    const viewportCenter = {
      x: viewport.x + viewport.width / 2,
      y: viewport.y + viewport.height / 2,
    };

    visibleInstances.sort((a, b) => {
      const distA = this.calculateDistanceSq(
        a.renderBounds.center,
        viewportCenter,
      );
      const distB = this.calculateDistanceSq(
        b.renderBounds.center,
        viewportCenter,
      );
      return distA - distB;
    });

    // Update cache
    this.cache.set(cacheKey, {
      instances: visibleInstances,
      timestamp: Date.now(),
      viewport: { ...viewport },
    });

    this.cleanCache();

    return visibleInstances;
  }

  /**
   * Checks if an instance's render bounds intersect with the visibility bounds.
   */
  private isInstanceVisible(instance: RenderInstance, bounds: any): boolean {
    const { renderBounds } = instance;

    return (
      renderBounds.x + renderBounds.width >= bounds.x &&
      renderBounds.x <= bounds.x + bounds.width &&
      renderBounds.y + renderBounds.height >= bounds.y &&
      renderBounds.y <= bounds.y + bounds.height
    );
  }

  /**
   * Expands the viewport area to include a margin for smoother rendering during movement.
   */
  private expandViewport(viewport: Viewport) {
    const margin = this.visibilityMargin / viewport.zoom;
    return {
      x: viewport.x - margin,
      y: viewport.y - margin,
      width: viewport.width + margin * 2,
      height: viewport.height + margin * 2,
    };
  }

  /**
   * Generates a string key for caching visibility results.
   */
  private getCacheKey(viewport: Viewport): string {
    // Round position to reduce cache churn during micro-panning
    const rx = Math.floor(viewport.x / 5) * 5;
    const ry = Math.floor(viewport.y / 5) * 5;
    return `${rx}_${ry}_${viewport.width}_${viewport.height}_${viewport.zoom.toFixed(2)}`;
  }

  private calculateDistanceSq(
    p1: { x: number; y: number },
    p2: { x: number; y: number },
  ): number {
    return Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2);
  }

  /**
   * Prunes the cache to prevent memory leaks.
   */
  private cleanCache(): void {
    if (this.cache.size > 20) {
      // Clear entire cache if it grows too large
      this.cache.clear();
    }
  }
}
