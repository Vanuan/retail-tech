import { RenderInstance } from "../../types/index";
import { Viewport, IRendererMaskRenderer } from "../../types/renderer";

/**
 * RENDERER MASK RENDERER
 * Handles the application of masks to product sprites.
 * Masks are used to create non-rectangular shapes (e.g., bottles, fruit)
 * and manage transparency effects during the drawing phase.
 */
export class RendererMaskRenderer implements IRendererMaskRenderer {
  private maskCache: Map<string, HTMLImageElement> = new Map();

  /**
   * Applies the mask associated with the instance to the current context.
   * This uses Global Composite Operations to "clip" the already drawn sprite.
   *
   * @param context The Canvas2D rendering context.
   * @param instance The prepared product instance data containing mask properties.
   * @param viewport The current viewport state.
   */
  public async apply(
    context: CanvasRenderingContext2D,
    instance: RenderInstance,
    _viewport: Viewport,
  ): Promise<void> {
    const { maskProperties, renderCoordinates } = instance;

    // 1. Safety check: don't process if no mask is required or if no URL exists
    if (!maskProperties?.required || !maskProperties.maskUrl) {
      return;
    }

    // 2. Load the mask image asset
    const maskImage = await this.loadMask(maskProperties.maskUrl);
    if (!maskImage) return;

    // 3. Configure the context for masking
    // 'destination-in' means: keep the existing pixels (the sprite) only where
    // the new pixels (the mask) overlap and are opaque.
    context.globalCompositeOperation = (maskProperties.compositeOperation as GlobalCompositeOperation) || 'destination-in';

    // 4. Draw the mask onto the sprite
    // Note: The context transform is already set to the product's position/scale/rotation
    // by the Positioner subsystem.
    context.drawImage(
      maskImage,
      0, 0,
      maskImage.naturalWidth, maskImage.naturalHeight,
      0, 0,
      renderCoordinates.width, renderCoordinates.height
    );

    // 5. Reset the composite operation to default so it doesn't affect subsequent draws
    context.globalCompositeOperation = 'source-over';
  }

  /**
   * Loads and caches the mask image.
   * @param url The URL of the mask asset.
   */
  private async loadMask(url: string): Promise<HTMLImageElement | null> {
    if (this.maskCache.has(url)) {
      return this.maskCache.get(url)!;
    }

    try {
      const img = await this.loadImage(url);
      this.maskCache.set(url, img);
      return img;
    } catch (error) {
      console.error(`RendererMaskRenderer: Failed to load mask from ${url}`, error);
      return null;
    }
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

  /**
   * Clears the internal mask asset cache.
   */
  public clearCache(): void {
    this.maskCache.clear();
  }
}
