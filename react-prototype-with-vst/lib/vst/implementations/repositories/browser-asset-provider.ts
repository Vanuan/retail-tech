import { IBrowserAssetProvider } from "../../types/repositories/providers";

/**
 * Browser implementation of IAssetProvider.
 * Handles image loading, caching, and URL resolution in a browser environment.
 */
export class BrowserAssetProvider implements IBrowserAssetProvider {
  private cache: Map<string, HTMLImageElement> = new Map();
  private pending: Map<string, Promise<HTMLImageElement>> = new Map();

  // Simple registry for prototype purposes to map SKUs to URLs.
  // In a real application, this might be backed by a product catalog or API.
  private spriteRegistry: Map<string, string> = new Map();
  private maskRegistry: Map<string, string> = new Map();

  constructor() {}

  /**
   * Resolves a SKU and angle to a sprite URL.
   */
  getSpriteUrl(
    sku: string,
    angle: string | number = 0,
    variant?: string,
  ): string {
    // Check for exact match with angle
    const angleKey = `${sku}-${angle}`;
    if (this.spriteRegistry.has(angleKey)) {
      return this.spriteRegistry.get(angleKey)!;
    }

    // Check for SKU match (default angle/variant)
    if (this.spriteRegistry.has(sku)) {
      return this.spriteRegistry.get(sku)!;
    }

    return "";
  }

  /**
   * Resolves a SKU to its transparency mask URL.
   */
  getMaskUrl(sku: string): string {
    if (this.maskRegistry.has(sku)) {
      return this.maskRegistry.get(sku)!;
    }
    return "";
  }

  /**
   * Loads an image from a URL, using an in-memory cache.
   */
  loadImage(url: string): Promise<HTMLImageElement> {
    if (!url) {
      return Promise.reject(new Error("URL is empty"));
    }

    // Check cache first
    if (this.cache.has(url)) {
      return Promise.resolve(this.cache.get(url)!);
    }

    // Check if already loading
    if (this.pending.has(url)) {
      return this.pending.get(url)!;
    }

    // Load new image
    const promise = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";

      img.onload = () => {
        this.cache.set(url, img);
        this.pending.delete(url);
        resolve(img);
      };

      img.onerror = (err) => {
        this.pending.delete(url);
        console.error(
          `[BrowserAssetProvider] Failed to load image: ${url}`,
          err,
        );
        // We reject here, but consumer might want to handle it gracefully
        reject(err);
      };

      img.src = url;
    });

    this.pending.set(url, promise);
    return promise;
  }

  /**
   * Retrieves a loaded image from the cache synchronously.
   * Returns undefined if the image is not loaded.
   */
  getLoadedImage(url: string): HTMLImageElement | undefined {
    return this.cache.get(url);
  }

  /**
   * Prefetches a list of URLs into the cache.
   */
  async prefetch(urls: string[]): Promise<void> {
    const promises = urls.map((url) =>
      this.loadImage(url).catch((err) => {
        // Log but don't fail the entire prefetch
        console.warn(`[BrowserAssetProvider] Prefetch failed for ${url}`);
      }),
    );
    await Promise.all(promises);
  }

  /**
   * Clears the asset cache.
   */
  clearCache(): void {
    this.cache.clear();
    this.pending.clear();
  }

  /**
   * Helper method to register assets manually (useful for prototype/testing).
   */
  registerAsset(
    sku: string,
    url: string,
    type: "sprite" | "mask" = "sprite",
  ): void {
    if (type === "sprite") {
      this.spriteRegistry.set(sku, url);
    } else {
      this.maskRegistry.set(sku, url);
    }
  }
}
