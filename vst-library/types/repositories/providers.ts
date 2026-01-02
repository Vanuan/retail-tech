/**
 * ASSET PROVIDERS
 * Resolution and loading of external assets.
 */

export interface IAssetProvider {
  /** Resolves a SKU and angle to a sprite URL */
  getSpriteUrl(
    sku: string,
    angle?: string | number,
    variant?: string,
  ): string;
  
  /** Resolves a SKU to its transparency mask URL */
  getMaskUrl(sku: string): string;
  
  /** Generic image loader */
  loadImage(url: string): Promise<any>;
  
  /** Prefetches a list of URLs into cache */
  prefetch(urls: string[]): Promise<void>;
  
  /** Clears the asset cache */
  clearCache(): void;
}
