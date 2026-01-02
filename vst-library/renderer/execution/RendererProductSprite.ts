import { RenderInstance } from "../../types/index";
import { Viewport, IRendererProductSprite } from "../../types/renderer";
import { SpriteCache, CachedSprite } from "./SpriteCache";
import { ParallaxController } from "./ParallaxController";

/**
 * PRODUCT SPRITE (Renderer Version)
 * Handles the loading and drawing of product images on the canvas.
 * Implements 9-angle parallax logic to select the most appropriate sprite
 * based on the viewer's perspective.
 */
export class RendererProductSprite implements IRendererProductSprite {
  private spriteCache: SpriteCache;
  private angleSelector: ParallaxController;
  private currentAtlas: any = null;

  constructor(spriteCache: SpriteCache) {
    this.spriteCache = spriteCache;
    this.angleSelector = new ParallaxController();
  }

  /**
   * Sets the current texture atlas to use for rendering.
   */
  public setAtlas(atlas: any): void {
    this.currentAtlas = atlas;
  }

  /**
   * Renders the product sprite onto the provided context.
   * @param context The Canvas2D rendering context.
   * @param instance The prepared product instance data.
   * @param viewport The current viewport state.
   */
  public async render(
    context: CanvasRenderingContext2D,
    instance: RenderInstance,
    viewport: Viewport,
  ): Promise<{ drawCalls: number; angle: number }> {
    // 1. Determine which of the 9 parallax angles to use based on position
    const angle = this.angleSelector.selectAngle(instance, viewport);

    // 2. Optimized Atlas Rendering Path
    if (this.currentAtlas && this.currentAtlas.frames) {
      // Reconstruct the key used by AtlasBuilder: sku_angle_variant
      const atlasAngle = angle === 0 ? "front" : angle.toString();
      const atlasKey = `${instance.sku}_${atlasAngle}_default`;

      const frame = this.currentAtlas.frames.get(atlasKey);
      if (frame) {
        context.drawImage(
          this.currentAtlas.texture,
          frame.x,
          frame.y,
          frame.width,
          frame.height,
          0,
          0,
          instance.renderCoordinates.width,
          instance.renderCoordinates.height,
        );
        return { drawCalls: 1, angle };
      }
    }

    // 3. Traditional Individual Sprite Path (using cache)
    const sprite = await this.loadSprite(instance, angle);

    if (!sprite || !sprite.image) {
      console.warn(
        `Could not load sprite for SKU: ${instance.sku} at angle: ${angle}`,
      );
      return { drawCalls: 0, angle };
    }

    // 3. Draw the sprite.
    // Note: Transforms (translation, rotation, scale) are assumed to be already
    // applied to the context by the VisualOrchestrationSubsystem.
    context.drawImage(
      sprite.image,
      0,
      0, // Source X, Y
      sprite.width,
      sprite.height, // Source W, H
      0,
      0, // Destination X, Y (relative to transform)
      instance.renderCoordinates.width,
      instance.renderCoordinates.height, // Destination W, H
    );

    return { drawCalls: 1, angle };
  }

  /**
   * Loads a sprite for a specific angle, utilizing the sprite cache.
   */
  private async loadSprite(
    instance: RenderInstance,
    angle: number,
  ): Promise<CachedSprite | null> {
    const cacheKey = `${instance.sku}_${angle}`;

    if (this.spriteCache.has(cacheKey)) {
      return this.spriteCache.get(cacheKey)!;
    }

    // Determine the URL for this specific angle variant
    const spriteUrl = this.getSpriteUrl(instance, angle);
    if (!spriteUrl) return null;

    try {
      const image = await this.loadImage(spriteUrl);
      const spriteData: CachedSprite = {
        image,
        width: image.naturalWidth,
        height: image.naturalHeight,
        angle,
        timestamp: Date.now(),
      };

      this.spriteCache.set(cacheKey, spriteData);
      return spriteData;
    } catch (error) {
      console.error(`Failed to load sprite image: ${spriteUrl}`, error);
      return null;
    }
  }

  /**
   * Resolves the correct asset URL for a given angle from the instance metadata.
   */
  private getSpriteUrl(instance: RenderInstance, angle: number): string | null {
    // Search for a variant that matches the requested parallax angle
    // In many implementations, we pick the closest available angle if an exact match isn't found.
    const variants = instance.assets.spriteVariants;

    if (!variants || variants.length === 0) {
      return null;
    }

    const exactMatch = variants.find((v) => v.angle === angle);
    if (exactMatch) return exactMatch.url;

    // Fallback: Return the first available variant (usually index 0 / front view)
    return variants[0].url;
  }

  /**
   * Helper to load an HTMLImageElement asynchronously.
   */
  private loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = (err) => reject(err);
      img.src = url;
    });
  }
}
