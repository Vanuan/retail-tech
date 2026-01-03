import {
  AtlasPlanogramConfig,
  AtlasOptions,
  AtlasResult,
  UniqueSprite,
  SpriteCanvas,
  PackingResult,
  AtlasFrame,
  UVCoordinates,
  AtlasMetadata,
  AtlasProductInstance,
} from "./types";
import { MaxRectsPacker } from "./MaxRectsPacker";
import { ValidationError } from "./errors";
import { IAssetProvider } from "@vst/vocabulary-types";

/**
 * QUALITY PROFILES
 * Defines default settings for different rendering contexts.
 */
const QUALITY_PROFILES = {
  publisher: {
    format: "png" as const,
    compression: 100,
    maxTextureSize: 8192,
    angles: ["front"],
  },
  visualizer: {
    format: "webp" as const,
    compression: 85,
    maxTextureSize: 4096,
    angles: ["front", "5", "15", "-5", "-15"],
  },
  vse: {
    format: "webp" as const,
    compression: 75,
    maxTextureSize: 2048,
    angles: ["front", "5", "15", "30", "45", "-5", "-15", "-30", "-45"],
  },
};

/**
 * ATLAS BUILDER
 *
 * Orchestrates the conversion of a semantic planogram into an optimized
 * texture atlas. It handles deduplication of assets, sprite generation,
 * rectangle packing, and UV coordinate mapping.
 */
export class AtlasBuilder {
  private assetProvider: IAssetProvider;

  constructor(assetProvider: IAssetProvider) {
    this.assetProvider = assetProvider;
  }

  /**
   * Main entry point: Transforms a planogram config into a packed AtlasResult.
   */
  public async buildAtlas(
    config: AtlasPlanogramConfig,
    options: AtlasOptions,
  ): Promise<AtlasResult> {
    const startTime = performance.now();

    // 1. Validation
    this.validate(config, options);

    // 2. Configuration & Defaults
    const opts = this.mergeDefaults(options);

    // 3. Deduplication (Phase 1 Optimization)
    // Identify unique combinations of SKU, angle, and variant to avoid redrawing same items.
    // This expands each product instance into all angles required by the profile.
    const uniqueSprites = this.deduplicateProducts(
      config.products,
      opts.includeAngles,
    );

    // 4. Sprite Generation
    // Create individual canvases for each unique sprite.
    const spriteCanvases = await this.generateSprites(uniqueSprites, opts);

    // 5. Packing (MaxRects Algorithm)
    // Find the most efficient layout for all unique sprites.
    const packing = this.packSprites(spriteCanvases, opts);

    // 6. Texture Generation
    // Render the final combined atlas texture.
    const texture = await this.generateTexture(packing, spriteCanvases);

    // 7. UV Map Generation
    // Calculate normalized and pixel coordinates for the renderer.
    const { frames, uvMap } = this.generateUVMap(packing, texture);

    // 8. Final Metadata Compilation
    const metadata = this.createMetadata(
      config,
      uniqueSprites,
      packing,
      texture,
      opts,
      performance.now() - startTime,
    );

    return {
      texture,
      frames,
      uvMap,
      metadata,
    };
  }

  private validate(config: AtlasPlanogramConfig, options: AtlasOptions): void {
    if (!config.products || config.products.length === 0) {
      throw new ValidationError(
        "Planogram config must contain at least one product.",
      );
    }
    if (!["publisher", "visualizer", "vse"].includes(options.context)) {
      throw new ValidationError(`Invalid context: ${options.context}`);
    }
  }

  private mergeDefaults(options: AtlasOptions): Required<AtlasOptions> {
    const profile = QUALITY_PROFILES[options.context];

    return {
      maxWidth: options.maxWidth ?? profile.maxTextureSize,
      maxHeight: options.maxHeight ?? profile.maxTextureSize,
      padding: options.padding ?? 2,
      format: options.format ?? profile.format,
      compression: options.compression ?? profile.compression,
      powerOfTwo: options.powerOfTwo ?? true,
      includeAngles: options.includeAngles ?? profile.angles,
      mipmaps: options.mipmaps ?? false,
      textureArray: options.textureArray ?? false,
      context: options.context,
      quality: options.quality,
    };
  }

  /**
   * Filters the full list of products into a unique set of visual assets.
   * Expands each product to include all angles required by the quality profile.
   */
  private deduplicateProducts(
    products: AtlasProductInstance[],
    includeAngles: string[],
  ): UniqueSprite[] {
    const map = new Map<string, UniqueSprite>();

    for (const product of products) {
      // If a specific angle is requested, use it; otherwise generate all angles for the profile
      const anglesToInclude = product.angle ? [product.angle] : includeAngles;

      for (const angle of anglesToInclude) {
        const key = this.getSpriteKey(product.sku, angle, product.variant);

        if (!map.has(key)) {
          map.set(key, {
            sku: product.sku,
            angle,
            variant: product.variant,
            instanceCount: 1,
          });
        } else {
          map.get(key)!.instanceCount++;
        }
      }
    }

    return Array.from(map.values());
  }

  private getSpriteKey(sku: string, angle?: string, variant?: string): string {
    return `${sku}_${angle || "front"}_${variant || "default"}`;
  }

  /**
   * Generates canvases for each unique sprite by loading real assets from the CDN.
   */
  private async generateSprites(
    uniqueSprites: UniqueSprite[],
    options: Required<AtlasOptions>,
  ): Promise<SpriteCanvas[]> {
    return Promise.all(
      uniqueSprites.map(async (sprite) => {
        const canvas = await this.createSpriteCanvas(sprite, options);
        return {
          key: this.getSpriteKey(sprite.sku, sprite.angle, sprite.variant),
          canvas,
          width: canvas.width,
          height: canvas.height,
        };
      }),
    );
  }

  /**
   * Creates a canvas for the sprite by loading the real image from S3/CDN.
   */
  private async createSpriteCanvas(
    sprite: UniqueSprite,
    options: Required<AtlasOptions>,
  ): Promise<HTMLCanvasElement> {
    const url = this.assetProvider.getSpriteUrl(
      sprite.sku,
      sprite.angle,
      sprite.variant,
    );

    try {
      const img = await this.assetProvider.loadImage(url);

      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx)
        throw new Error("Failed to create 2D context for sprite canvas.");

      ctx.drawImage(img, 0, 0);
      return canvas;
    } catch (error) {
      console.warn(
        `AtlasBuilder: Failed to load real texture for ${sprite.sku}, falling back to placeholder.`,
        error,
      );
      return this.createPlaceholderCanvas(sprite, options);
    }
  }

  /**
   * Fallback: Creates a placeholder canvas if the real asset is missing.
   */
  private async createPlaceholderCanvas(
    sprite: UniqueSprite,
    options: Required<AtlasOptions>,
  ): Promise<HTMLCanvasElement> {
    const baseSize = this.getBaseSizeForQuality(options.quality);

    const canvas = document.createElement("canvas");
    canvas.width = baseSize;
    canvas.height = baseSize * 1.5;

    const ctx = canvas.getContext("2d");
    if (!ctx)
      throw new Error("Failed to create 2D context for placeholder canvas.");

    ctx.fillStyle = this.getColorForSku(sprite.sku);
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "white";
    ctx.font = "10px sans-serif";
    ctx.fillText(`${sprite.sku} (fallback)`, 5, 15);

    return canvas;
  }

  private getBaseSizeForQuality(quality: string): number {
    const sizes: Record<string, number> = {
      low: 32,
      medium: 64,
      high: 128,
      ultra: 256,
    };
    return sizes[quality] || 64;
  }

  private getColorForSku(sku: string): string {
    let hash = 0;
    for (let i = 0; i < sku.length; i++) {
      hash = sku.charCodeAt(i) + ((hash << 5) - hash);
    }
    return `hsl(${Math.abs(hash) % 360}, 65%, 55%)`;
  }

  /**
   * Executes the packing algorithm.
   */
  private packSprites(
    sprites: SpriteCanvas[],
    options: Required<AtlasOptions>,
  ): PackingResult {
    const packer = new MaxRectsPacker(
      options.maxWidth,
      options.maxHeight,
      options.padding,
    );

    return packer.pack(sprites);
  }

  /**
   * Composites the packed sprites into the final atlas texture.
   */
  private async generateTexture(
    packing: PackingResult,
    spriteCanvases: SpriteCanvas[],
  ): Promise<HTMLCanvasElement> {
    const canvas = document.createElement("canvas");
    canvas.width = packing.atlasWidth;
    canvas.height = packing.atlasHeight;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) throw new Error("Failed to create atlas texture context.");

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const spriteMap = new Map(spriteCanvases.map((s) => [s.key, s.canvas]));

    for (const packed of packing.packedSprites) {
      const source = spriteMap.get(packed.key);
      if (!source) continue;

      ctx.drawImage(source, packed.x, packed.y, packed.width, packed.height);
    }

    return canvas;
  }

  /**
   * Generates the coordinate mapping for use by renderers.
   */
  private generateUVMap(
    packing: PackingResult,
    texture: HTMLCanvasElement,
  ): { frames: Map<string, AtlasFrame>; uvMap: Map<string, UVCoordinates> } {
    const frames = new Map<string, AtlasFrame>();
    const uvMap = new Map<string, UVCoordinates>();

    const texW = texture.width;
    const texH = texture.height;

    for (const packed of packing.packedSprites) {
      // Key format is sku_angle_variant
      const parts = packed.key.split("_");
      const sku = parts[0];
      const angle = parts[1];
      const variant = parts[2];

      const frame: AtlasFrame = {
        sku,
        angle: angle !== "front" ? angle : undefined,
        variant: variant !== "default" ? variant : undefined,
        x: packed.x,
        y: packed.y,
        width: packed.width,
        height: packed.height,
        sourceWidth: packed.width,
        sourceHeight: packed.height,
        uv: {
          u0: packed.x / texW,
          v0: packed.y / texH,
          u1: (packed.x + packed.width) / texW,
          v1: (packed.y + packed.height) / texH,
        },
      };

      const uv: UVCoordinates = {
        normalized: frame.uv,
        pixel: {
          x: packed.x,
          y: packed.y,
          width: packed.width,
          height: packed.height,
        },
        spriteId: packed.key,
      };

      frames.set(packed.key, frame);
      uvMap.set(packed.key, uv);
    }

    return { frames, uvMap };
  }

  private createMetadata(
    config: AtlasPlanogramConfig,
    uniqueSprites: UniqueSprite[],
    packing: PackingResult,
    texture: HTMLCanvasElement,
    options: Required<AtlasOptions>,
    generationTime: number,
  ): AtlasMetadata {
    const totalInstances = uniqueSprites.reduce(
      (sum, s) => sum + s.instanceCount,
      0,
    );

    return {
      version: "2.0",
      timestamp: new Date().toISOString(),
      generationTime,
      uniqueSprites: uniqueSprites.length,
      totalInstances,
      textureSize: {
        width: texture.width,
        height: texture.height,
      },
      format: options.format,
      context: options.context,
      quality: options.quality,
      packingEfficiency: packing.efficiency,
      memoryUsage: texture.width * texture.height * 4, // 4 bytes per pixel (RGBA)
      compressionRatio: packing.efficiency, // Simple placeholder for efficiency metrics
    };
  }
}
