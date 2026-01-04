/**
 * ASSET PROVIDERS
 * Resolution and loading of external assets.
 */

export interface IAssetProvider {
  /** Resolves a SKU and angle to a sprite URL */
  getSpriteUrl(sku: string, angle?: string | number, variant?: string): string;

  /** Resolves a SKU to its transparency mask URL */
  getMaskUrl(sku: string): string;

  /**
   * Generic image loader
   * Returns a promise that resolves when the asset is ready.
   * Implementation-specific (e.g., HTMLImageElement in browser, Buffer in Node).
   */
  loadImage(url: string): Promise<any>;

  /**
   * Retrieves a loaded image from the cache synchronously.
   */
  getLoadedImage(url: string): any;

  /** Prefetches a list of URLs into cache */
  prefetch(urls: string[]): Promise<void>;

  /** Clears the asset cache */
  clearCache(): void;

  /** Helper method to register assets manually (useful for prototype/testing) */
  registerAsset(sku: string, url: string, type?: "sprite" | "mask"): void;
}
