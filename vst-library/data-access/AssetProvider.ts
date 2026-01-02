import { IAssetProvider } from "../types/data-access";

/**
 * ASSET PROVIDER
 *
 * This service manages the resolution and retrieval of visual assets (sprites, masks, textures).
 * It bridges the gap between semantic metadata (stored in a Database/MetadataStore)
 * and binary storage (S3-compatible storage served via CDN).
 *
 * Architectural Decision:
 * - Product Sprites: Stored in S3-compatible buckets for scalability.
 * - File Structure: /products/{sku}/sprites/{variant}_{angle}.webp
 * - Delivery: Served via CDN (e.g., CloudFront, Akamai) to ensure low-latency
 *   asset loading for the Renderer and Atlas Builder.
 */
export class AssetProvider implements IAssetProvider {
  private cdnBaseUrl: string;
  private imageCache: Map<string, any> = new Map();
  private useMockStorage: boolean = false;
  private mockStorage: Map<string, string> = new Map(); // Mock S3 bucket: path -> dataUrl

  constructor(config: { cdnBaseUrl: string; useMockStorage?: boolean }) {
    this.cdnBaseUrl = config.cdnBaseUrl.endsWith("/")
      ? config.cdnBaseUrl.slice(0, -1)
      : config.cdnBaseUrl;
    this.useMockStorage = config.useMockStorage || false;
  }

  /**
   * Seeds the mock storage with asset data.
   * Useful for local development or testing without a real CDN.
   */
  public seedMockStorage(assets: Record<string, string>): void {
    for (const [path, data] of Object.entries(assets)) {
      this.mockStorage.set(path, data);
    }
  }

  /**
   * Resolves the canonical CDN URL for a product sprite based on its parameters.
   *
   * @param sku The product SKU.
   * @param angle The parallax viewing angle (e.g., 'front', '0', '45').
   * @param variant The product variant (e.g., 'default', 'holiday').
   * @returns A fully qualified URL to the asset in S3/CDN.
   */
  public getSpriteUrl(
    sku: string,
    angle: string | number = "front",
    variant: string = "default",
  ): string {
    const normalizedSku = sku.toLowerCase();
    const normalizedAngle =
      typeof angle === "number" ? angle.toString() : angle;

    const path = `/products/${normalizedSku}/sprites/${variant}_${normalizedAngle}.webp`;

    if (this.useMockStorage && this.mockStorage.has(path)) {
      return this.mockStorage.get(path)!;
    }

    // Path pattern: {cdn}/products/{sku}/sprites/{variant}_{angle}.webp
    return `${this.cdnBaseUrl}${path}`;
  }

  /**
   * Resolves the URL for a product's transparency mask.
   */
  public getMaskUrl(sku: string): string {
    const path = `/products/${sku.toLowerCase()}/masks/main.png`;

    if (this.useMockStorage && this.mockStorage.has(path)) {
      return this.mockStorage.get(path)!;
    }

    return `${this.cdnBaseUrl}${path}`;
  }

  /**
   * Fetches an image from the CDN and returns an HTMLImageElement.
   * This is used by the AtlasBuilder to composite real textures into the atlas.
   *
   * @param url The resolved CDN URL.
   * @returns A promise resolving to the loaded image element.
   */
  public async loadImage(url: string): Promise<any> {
    // Return from cache if already loaded
    if (this.imageCache.has(url)) {
      return this.imageCache.get(url)!;
    }

    // Environment-agnostic check: Node.js/SSR environments won't have the Image constructor.
    if (typeof Image === "undefined") {
      return url;
    }

    return new Promise((resolve, reject) => {
      const img = new Image();

      // Essential for cross-origin canvas manipulation (Atlas Building)
      img.crossOrigin = "anonymous";

      img.onload = () => {
        this.imageCache.set(url, img);
        resolve(img);
      };

      img.onerror = () => {
        reject(new Error(`AssetProvider: Failed to load image at ${url}`));
      };

      img.src = url;
    });
  }

  /**
   * Batch pre-loads a set of assets.
   * Recommended to be called during Core Layer processing to warm the cache.
   */
  public async prefetch(urls: string[]): Promise<void> {
    const uniqueUrls = [...new Set(urls)];
    await Promise.allSettled(uniqueUrls.map((url) => this.loadImage(url)));
  }

  /**
   * Clears the internal image cache to free up memory.
   */
  public clearCache(): void {
    this.imageCache.clear();
  }
}
