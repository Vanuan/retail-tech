import { ISpriteExecution, IRendererProductSprite, IRendererMaskRenderer, IRendererShadowRenderer } from "../../types/renderer";
import { SpriteCache } from "./SpriteCache";
import { RendererProductSprite } from "./RendererProductSprite";
import { RendererMaskRenderer } from "./RendererMaskRenderer";
import { RendererShadowRenderer } from "./RendererShadowRenderer";

/**
 * SPRITE EXECUTION SUBSYSTEM
 *
 * Central hub for the Renderer Layer's asset execution and visual effect tasks.
 * This subsystem aggregates managers responsible for:
 * 1. Asset Caching (Managing image memory and loading)
 * 2. Sprite Rendering (Drawing the product images with parallax logic)
 * 3. Masking (Applying clipping and transparency shapes)
 * 4. Shadowing (Drawing depth effects like drop and contact shadows)
 *
 * It manages the lifecycle of visual assets and coordinates the multi-step
 * drawing process for each product instance.
 */
export class SpriteExecutionSubsystem implements ISpriteExecution {
  public readonly spriteCache: SpriteCache;
  public readonly productSprite: IRendererProductSprite;
  public readonly maskRenderer: IRendererMaskRenderer;
  public readonly shadowRenderer: IRendererShadowRenderer;

  constructor() {
    this.spriteCache = new SpriteCache();
    this.productSprite = new RendererProductSprite(this.spriteCache);
    this.maskRenderer = new RendererMaskRenderer();
    this.shadowRenderer = new RendererShadowRenderer();
  }

  /**
   * Cleans up all cached assets across the execution subsystems.
   * Useful when switching planograms or when memory pressure is high.
   */
  public clearAllCaches(): void {
    this.spriteCache.clear();
    if (typeof (this.maskRenderer as any).clearCache === 'function') {
      (this.maskRenderer as any).clearCache();
    }
  }

  /**
   * Provides access to the underlying sprite cache for statistics and monitoring.
   */
  public getCacheStats() {
    return this.spriteCache.getStats();
  }
}
