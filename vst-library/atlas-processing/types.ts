/**
 * ATLAS PROCESSING TYPES
 *
 * Defines the structural types used by the Atlas Builder for texture packing
 * and asset optimization.
 */

// --- INPUT TYPES ---

/**
 * Simplified planogram configuration for atlas generation.
 */
export interface AtlasPlanogramConfig {
  id: string;
  name?: string;
  products: AtlasProductInstance[];
}

/**
 * An individual product instance within a planogram.
 */
export interface AtlasProductInstance {
  sku: string;
  variant?: string;      // 'default', 'holiday', 'promotional'
  angle?: string;        // 'front', 'tilt-5', 'tilt-10', etc.

  // Metadata for statistics
  facing?: {
    horizontal: number;
    vertical: number;
  };
  pyramid?: {
    layers: number;
  };
}

/**
 * Configuration options for the atlas generation process.
 */
export interface AtlasOptions {
  // Required
  context: 'publisher' | 'visualizer' | 'vse';
  quality: 'low' | 'medium' | 'high' | 'ultra';

  // Optional (with defaults)
  maxWidth?: number;           // Default: 4096
  maxHeight?: number;          // Default: 4096
  padding?: number;            // Default: 2
  format?: 'webp' | 'png';     // Default: 'webp'
  compression?: number;        // Default: 85 (0-100)
  powerOfTwo?: boolean;        // Default: true
  includeAngles?: string[];    // Default: based on context

  // Future capabilities
  mipmaps?: boolean;
  textureArray?: boolean;
}

// --- INTERNAL TYPES ---

/**
 * Represents a unique sprite requirement after deduplication.
 */
export interface UniqueSprite {
  sku: string;
  angle?: string;
  variant?: string;
  instanceCount: number;      // Frequency of appearance
}

/**
 * Temporary storage for rendered sprite canvases before packing.
 */
export interface SpriteCanvas {
  key: string;                // Format: sku_angle_variant
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
}

/**
 * A sprite that has been assigned coordinates within the atlas.
 */
export interface PackedSprite {
  key: string;                // Same as SpriteCanvas.key
  x: number;                  // Position in atlas texture
  y: number;                  // Position in atlas texture
  width: number;
  height: number;
}

/**
 * The result of the packing algorithm.
 */
export interface PackingResult {
  packedSprites: PackedSprite[];
  atlasWidth: number;
  atlasHeight: number;
  efficiency: number;         // 0.0 to 1.0
}

/**
 * Basic rectangular bounds.
 */
export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

// --- OUTPUT TYPES ---

/**
 * The final output of the Atlas Builder.
 */
export interface AtlasResult {
  // Core Visual Assets
  texture: HTMLCanvasElement;
  frames: Map<string, AtlasFrame>;
  uvMap: Map<string, UVCoordinates>;
  metadata: AtlasMetadata;

  // Export artifacts
  dataUrl?: string;
  blob?: Blob;
}

/**
 * Frame data for a single sprite within the atlas.
 */
export interface AtlasFrame {
  sku: string;
  angle?: string;
  variant?: string;

  // Pixel coordinates in the atlas texture
  x: number;
  y: number;
  width: number;
  height: number;

  // Original sprite dimensions (for scaling)
  sourceWidth: number;
  sourceHeight: number;

  // UV coordinates for shaders/engines
  uv: {
    u0: number;  // Left
    v0: number;  // Top
    u1: number;  // Right
    v1: number;  // Bottom
  };
}

/**
 * Specialized UV coordinate container.
 */
export interface UVCoordinates {
  // Normalized 0.0 to 1.0 range
  normalized: {
    u0: number;
    v0: number;
    u1: number;
    v1: number;
  };

  // Absolute pixel coordinates
  pixel: {
    x: number;
    y: number;
    width: number;
    height: number;
  };

  spriteId: string;
}

/**
 * Statistical and diagnostic metadata for the generated atlas.
 */
export interface AtlasMetadata {
  version: string;
  timestamp: string;
  generationTime: number;      // ms

  uniqueSprites: number;
  totalInstances: number;

  textureSize: {
    width: number;
    height: number;
  };
  format: string;

  context: string;
  quality: string;
  packingEfficiency: number;   // 0-1

  memoryUsage: number;         // estimated bytes
  compressionRatio: number;
}
