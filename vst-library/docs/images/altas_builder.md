# Atlas Pipeline Technical Specification v2.0

## 1. Overview

The **Atlas Pipeline** transforms individual product sprites into a single optimized texture atlas, reducing HTTP requests, draw calls, and memory usage.

**Core Benefit**: 100 sprites = 100 HTTP requests → 1 atlas = 1 HTTP request

**Key Principle**: Atlas building is **decoupled from positioning**. The atlas only cares about unique sprites (SKU+angle+variant), not where they appear in the planogram.

### Architectural Position
```
Layer 1: Data Layer → Asset Metadata, CDN
Layer 2: Atlas Pipeline → [THIS SERVICE]  
Layer 3: Business Logic → Planogram rules
Layer 4: Renderer → Canvas2D, WebGL, BabylonJS
```

---

## 2. Implementation Phases

### ✅ Phase 1: Canvas2D Foundation (CURRENT)
- Canvas2D texture generation
- MaxRects packing algorithm
- WebP/PNG output
- UV coordinate mapping
- Sprite deduplication
- Quality profiles

### 📋 Phase 2: WebGL Integration (FUTURE)
- WebGL texture binding
- GPU upload optimization
- Mipmap generation
- Power-of-two constraints

### 📋 Phase 3: 3D Engine Integration (FUTURE)
- BabylonJS texture support
- Three.js compatibility
- Normal/specular maps
- Texture arrays

---

## 3. Core Principles

### 3.1 Unique Sprite Deduplication

**Rule**: Atlas contains only unique sprites, regardless of how many times they appear.

```typescript
// Example: CEREAL-001 appears 12 times at different positions
// Atlas contains only 1 sprite, referenced 12 times during rendering

function deduplicateSprites(products: ProductInstance[]): UniqueSprite[] {
  const map = new Map<string, UniqueSprite>();
  
  for (const product of products) {
    const key = `${product.sku}_${product.angle || 'front'}_${product.variant || 'default'}`;
    
    if (!map.has(key)) {
      map.set(key, {
        sku: product.sku,
        angle: product.angle,
        variant: product.variant,
        instanceCount: 1,
      });
    } else {
      map.get(key)!.instanceCount++;
    }
  }
  
  return Array.from(map.values());
}
```

### 3.2 Context-Aware Quality Profiles

```typescript
const QUALITY_PROFILES = {
  publisher: {
    // 2D Print - Maximum quality
    dpi: 300,
    format: 'png',
    compression: 100,
    maxTextureSize: 8192,
    angles: ['front'],
  },
  
  visualizer: {
    // 2.5D Interactive - Balanced
    dpi: 150,
    format: 'webp',
    compression: 85,
    maxTextureSize: 4096,
    angles: ['front', 'tilt-5', 'tilt-10'],
  },
  
  vse: {
    // 3D Immersive - Performance-focused
    dpi: 72,
    format: 'webp',
    compression: 75,
    maxTextureSize: 2048,
    angles: ['front', 'tilt-5', 'tilt-10', 'rotate-15'],
  },
};
```

---

## 4. Type Definitions

### 4.1 Input Types

```typescript
interface PlanogramConfig {
  id: string;
  name?: string;
  products: ProductInstance[];
}

interface ProductInstance {
  sku: string;
  variant?: string;      // 'default', 'holiday', 'promotional'
  angle?: string;        // 'front', 'tilt-5', 'tilt-10', etc.
  
  // Metadata (for statistics only, not used in packing)
  facing?: {
    horizontal: number;
    vertical: number;
  };
  pyramid?: {
    layers: number;
  };
}

interface AtlasOptions {
  // Required
  context: 'publisher' | 'visualizer' | 'vse';
  quality: 'low' | 'medium' | 'high' | 'ultra';
  
  // Optional (with defaults)
  maxWidth?: number;           // Default: 4096
  maxHeight?: number;          // Default: 4096
  padding?: number;            // Default: 2
  format?: 'webp' | 'png';    // Default: 'webp'
  compression?: number;        // Default: 85 (0-100)
  powerOfTwo?: boolean;        // Default: true
  includeAngles?: string[];    // Default: based on context
  
  // Phase 2+
  mipmaps?: boolean;
  textureArray?: boolean;
}
```

### 4.2 Internal Types

```typescript
interface UniqueSprite {
  sku: string;
  angle?: string;
  variant?: string;
  instanceCount: number;      // How many times this sprite appears
}

interface SpriteCanvas {
  key: string;                // Format: sku_angle_variant
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
}

interface PackedSprite {
  key: string;                // Same as SpriteCanvas.key
  x: number;                  // Position in atlas texture
  y: number;                  // Position in atlas texture
  width: number;
  height: number;
}

interface PackingResult {
  packedSprites: PackedSprite[];
  atlasWidth: number;
  atlasHeight: number;
  efficiency: number;         // 0-1
}

interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}
```

### 4.3 Output Types

```typescript
interface AtlasResult {
  // Core
  texture: HTMLCanvasElement;
  frames: Map<string, AtlasFrame>;
  uvMap: Map<string, UVCoordinates>;
  metadata: AtlasMetadata;
  
  // Export formats
  dataUrl?: string;
  blob?: Blob;
  
  // Phase 2+
  webGLTexture?: WebGLTexture;
  babylonTexture?: any;
}

interface AtlasFrame {
  sku: string;
  angle?: string;
  variant?: string;
  
  // Position in atlas texture (pixels)
  x: number;
  y: number;
  width: number;
  height: number;
  
  // Original sprite dimensions
  sourceWidth: number;
  sourceHeight: number;
  
  // UV coordinates (normalized 0-1)
  uv: {
    u0: number;  // Left
    v0: number;  // Top
    u1: number;  // Right
    v1: number;  // Bottom
  };
}

interface UVCoordinates {
  // Normalized coordinates (for WebGL)
  normalized: {
    u0: number;  // 0-1 range
    v0: number;
    u1: number;
    v1: number;
  };
  
  // Pixel coordinates (for Canvas2D)
  pixel: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  
  spriteId: string;
}

interface AtlasMetadata {
  version: string;
  timestamp: string;
  generationTime: number;      // milliseconds
  
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
  
  memoryUsage: number;         // bytes
  compressionRatio: number;
  
  // Phase 2+
  mipmapLevels?: number;
}
```

---

## 5. Core Implementation

### 5.1 Atlas Builder

```typescript
class AtlasBuilder {
  async buildAtlas(
    config: PlanogramConfig,
    options: AtlasOptions
  ): Promise<AtlasResult> {
    const startTime = performance.now();
    
    // 1. Validate inputs
    this.validate(config, options);
    
    // 2. Apply defaults
    const opts = this.mergeDefaults(options);
    
    // 3. Deduplicate products → unique sprites
    const uniqueSprites = this.deduplicateProducts(config.products);
    
    // 4. Generate sprite canvases
    const spriteCanvases = await this.generateSprites(uniqueSprites, opts);
    
    // 5. Pack sprites into atlas
    const packing = this.packSprites(spriteCanvases, opts);
    
    // 6. Generate atlas texture
    const texture = await this.generateTexture(packing, spriteCanvases);
    
    // 7. Generate UV map
    const { frames, uvMap } = this.generateUVMap(packing, texture);
    
    // 8. Create metadata
    const metadata = this.createMetadata(
      config,
      uniqueSprites,
      packing,
      texture,
      opts,
      performance.now() - startTime
    );
    
    return { texture, frames, uvMap, metadata };
  }
  
  private validate(config: PlanogramConfig, options: AtlasOptions): void {
    if (!config.products || config.products.length === 0) {
      throw new ValidationError('Config must contain products');
    }
    
    if (!['publisher', 'visualizer', 'vse'].includes(options.context)) {
      throw new ValidationError('Invalid context');
    }
    
    if (!['low', 'medium', 'high', 'ultra'].includes(options.quality)) {
      throw new ValidationError('Invalid quality');
    }
  }
  
  private mergeDefaults(options: AtlasOptions): Required<AtlasOptions> {
    const profile = QUALITY_PROFILES[options.context];
    
    return {
      maxWidth: options.maxWidth ?? 4096,
      maxHeight: options.maxHeight ?? 4096,
      padding: options.padding ?? 2,
      format: options.format ?? profile.format,
      compression: options.compression ?? profile.compression,
      powerOfTwo: options.powerOfTwo ?? true,
      includeAngles: options.includeAngles ?? profile.angles,
      mipmaps: options.mipmaps ?? false,
      textureArray: options.textureArray ?? false,
      ...options,
    };
  }
  
  private deduplicateProducts(products: ProductInstance[]): UniqueSprite[] {
    const map = new Map<string, UniqueSprite>();
    
    for (const product of products) {
      const key = this.getSpriteKey(product);
      
      if (!map.has(key)) {
        map.set(key, {
          sku: product.sku,
          angle: product.angle,
          variant: product.variant,
          instanceCount: 1,
        });
      } else {
        map.get(key)!.instanceCount++;
      }
    }
    
    return Array.from(map.values());
  }
  
  private getSpriteKey(product: ProductInstance | UniqueSprite): string {
    return `${product.sku}_${product.angle || 'front'}_${product.variant || 'default'}`;
  }
  
  private async generateSprites(
    uniqueSprites: UniqueSprite[],
    options: Required<AtlasOptions>
  ): Promise<SpriteCanvas[]> {
    return Promise.all(
      uniqueSprites.map(async (sprite) => {
        const canvas = await this.createSpriteCanvas(sprite, options);
        return {
          key: this.getSpriteKey(sprite),
          canvas,
          width: canvas.width,
          height: canvas.height,
        };
      })
    );
  }
  
  private async createSpriteCanvas(
    sprite: UniqueSprite,
    options: Required<AtlasOptions>
  ): Promise<HTMLCanvasElement> {
    // In production, this would load actual sprite images
    // For now, create placeholder
    const baseSize = this.getBaseSizeForQuality(options.quality);
    
    const canvas = document.createElement('canvas');
    canvas.width = baseSize;
    canvas.height = baseSize * 1.5;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get canvas context');
    
    // Draw placeholder sprite
    ctx.fillStyle = this.getColorForSku(sprite.sku);
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    return canvas;
  }
  
  private getBaseSizeForQuality(quality: string): number {
    const sizes = { low: 32, medium: 64, high: 128, ultra: 256 };
    return sizes[quality as keyof typeof sizes] || 64;
  }
  
  private getColorForSku(sku: string): string {
    const hash = sku.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return `hsl(${hash % 360}, 70%, 60%)`;
  }
  
  private packSprites(
    sprites: SpriteCanvas[],
    options: Required<AtlasOptions>
  ): PackingResult {
    const packer = new MaxRectsPacker(
      options.maxWidth,
      options.maxHeight,
      options.padding
    );
    
    return packer.pack(sprites);
  }
  
  private async generateTexture(
    packing: PackingResult,
    spriteCanvases: SpriteCanvas[]
  ): Promise<HTMLCanvasElement> {
    const canvas = document.createElement('canvas');
    canvas.width = packing.atlasWidth;
    canvas.height = packing.atlasHeight;
    
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) throw new Error('Cannot get canvas context');
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Create lookup map
    const spriteMap = new Map(
      spriteCanvases.map(s => [s.key, s.canvas])
    );
    
    // Draw each sprite at packed position
    for (const packed of packing.packedSprites) {
      const spriteCanvas = spriteMap.get(packed.key);
      if (!spriteCanvas) {
        console.warn(`Sprite not found: ${packed.key}`);
        continue;
      }
      
      ctx.drawImage(
        spriteCanvas,
        packed.x,
        packed.y,
        packed.width,
        packed.height
      );
    }
    
    return canvas;
  }
  
  private generateUVMap(
    packing: PackingResult,
    texture: HTMLCanvasElement
  ): { frames: Map<string, AtlasFrame>; uvMap: Map<string, UVCoordinates> } {
    const frames = new Map<string, AtlasFrame>();
    const uvMap = new Map<string, UVCoordinates>();
    
    for (const packed of packing.packedSprites) {
      const [sku, angle, variant] = packed.key.split('_');
      
      const frame: AtlasFrame = {
        sku,
        angle: angle !== 'front' ? angle : undefined,
        variant: variant !== 'default' ? variant : undefined,
        x: packed.x,
        y: packed.y,
        width: packed.width,
        height: packed.height,
        sourceWidth: packed.width,
        sourceHeight: packed.height,
        uv: {
          u0: packed.x / texture.width,
          v0: packed.y / texture.height,
          u1: (packed.x + packed.width) / texture.width,
          v1: (packed.y + packed.height) / texture.height,
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
    config: PlanogramConfig,
    uniqueSprites: UniqueSprite[],
    packing: PackingResult,
    texture: HTMLCanvasElement,
    options: Required<AtlasOptions>,
    generationTime: number
  ): AtlasMetadata {
    const totalInstances = uniqueSprites.reduce(
      (sum, s) => sum + s.instanceCount,
      0
    );
    
    return {
      version: '2.0',
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
      memoryUsage: texture.width * texture.height * 4,
      compressionRatio: packing.efficiency,
    };
  }
}
```

### 5.2 MaxRects Packing Algorithm

```typescript
class MaxRectsPacker {
  private freeRects: Rectangle[];
  private maxWidth: number;
  private maxHeight: number;
  private padding: number;
  
  constructor(maxWidth: number, maxHeight: number, padding: number) {
    this.maxWidth = maxWidth;
    this.maxHeight = maxHeight;
    this.padding = padding;
    this.freeRects = [{ x: 0, y: 0, width: maxWidth, height: maxHeight }];
  }
  
  pack(sprites: SpriteCanvas[]): PackingResult {
    // Sort by area (descending) for better packing
    const sorted = [...sprites].sort(
      (a, b) => (b.width * b.height) - (a.width * a.height)
    );
    
    const packedSprites: PackedSprite[] = [];
    
    for (const sprite of sorted) {
      const packed = this.findBestFit(sprite);
      
      if (!packed) {
        throw new PackingError(`Cannot fit sprite: ${sprite.key}`);
      }
      
      packedSprites.push(packed);
      this.updateFreeRects(packed);
    }
    
    const atlasWidth = Math.max(...packedSprites.map(p => p.x + p.width + this.padding));
    const atlasHeight = Math.max(...packedSprites.map(p => p.y + p.height + this.padding));
    
    return {
      packedSprites,
      atlasWidth,
      atlasHeight,
      efficiency: this.calculateEfficiency(packedSprites, atlasWidth, atlasHeight),
    };
  }
  
  private findBestFit(sprite: SpriteCanvas): PackedSprite | null {
    let bestRect: Rectangle | null = null;
    let bestScore = Infinity;
    
    const w = sprite.width + this.padding * 2;
    const h = sprite.height + this.padding * 2;
    
    for (const rect of this.freeRects) {
      if (rect.width < w || rect.height < h) continue;
      
      // Best Area Fit heuristic
      const areaFit = rect.width * rect.height - w * h;
      const shortSideFit = Math.min(rect.width - w, rect.height - h);
      const score = areaFit + shortSideFit * 0.1;
      
      if (score < bestScore) {
        bestScore = score;
        bestRect = rect;
      }
    }
    
    if (!bestRect) return null;
    
    return {
      key: sprite.key,
      x: bestRect.x + this.padding,
      y: bestRect.y + this.padding,
      width: sprite.width,
      height: sprite.height,
    };
  }
  
  private updateFreeRects(packed: PackedSprite): void {
    const placedRect = {
      x: packed.x - this.padding,
      y: packed.y - this.padding,
      width: packed.width + this.padding * 2,
      height: packed.height + this.padding * 2,
    };
    
    const newRects: Rectangle[] = [];
    
    for (const rect of this.freeRects) {
      if (!this.intersects(rect, placedRect)) {
        newRects.push(rect);
        continue;
      }
      
      // Split into non-intersecting rectangles
      newRects.push(...this.split(rect, placedRect));
    }
    
    this.freeRects = this.removeRedundant(newRects);
  }
  
  private intersects(a: Rectangle, b: Rectangle): boolean {
    return !(
      a.x + a.width <= b.x ||
      b.x + b.width <= a.x ||
      a.y + a.height <= b.y ||
      b.y + b.height <= a.y
    );
  }
  
  private split(rect: Rectangle, placed: Rectangle): Rectangle[] {
    const result: Rectangle[] = [];
    
    // Left
    if (rect.x < placed.x) {
      result.push({
        x: rect.x,
        y: rect.y,
        width: placed.x - rect.x,
        height: rect.height,
      });
    }
    
    // Right
    if (rect.x + rect.width > placed.x + placed.width) {
      result.push({
        x: placed.x + placed.width,
        y: rect.y,
        width: (rect.x + rect.width) - (placed.x + placed.width),
        height: rect.height,
      });
    }
    
    // Top
    if (rect.y < placed.y) {
      result.push({
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: placed.y - rect.y,
      });
    }
    
    // Bottom
    if (rect.y + rect.height > placed.y + placed.height) {
      result.push({
        x: rect.x,
        y: placed.y + placed.height,
        width: rect.width,
        height: (rect.y + rect.height) - (placed.y + placed.height),
      });
    }
    
    return result.filter(
      r => r.width > this.padding * 2 && r.height > this.padding * 2
    );
  }
  
  private removeRedundant(rects: Rectangle[]): Rectangle[] {
    return rects.filter((rect, i) => {
      return !rects.some((other, j) => 
        i !== j && this.contains(other, rect)
      );
    });
  }
  
  private contains(a: Rectangle, b: Rectangle): boolean {
    return (
      b.x >= a.x &&
      b.y >= a.y &&
      b.x + b.width <= a.x + a.width &&
      b.y + b.height <= a.y + a.height
    );
  }
  
  private calculateEfficiency(
    packedSprites: PackedSprite[],
    width: number,
    height: number
  ): number {
    const totalArea = width * height;
    const usedArea = packedSprites.reduce(
      (sum, p) => sum + (p.width * p.height),
      0
    );
    return totalArea > 0 ? usedArea / totalArea : 0;
  }
}
```

---

## 6. Integration Examples

### 6.1 Canvas2D Rendering (Phase 1)

```typescript
class Canvas2DRenderer {
  private atlas: AtlasResult | null = null;
  
  setAtlas(atlas: AtlasResult): void {
    this.atlas = atlas;
  }
  
  renderProduct(
    ctx: CanvasRenderingContext2D,
    sku: string,
    x: number,
    y: number,
    angle?: string,
    variant?: string
  ): void {
    if (!this.atlas) throw new Error('Atlas not set');
    
    const key = `${sku}_${angle || 'front'}_${variant || 'default'}`;
    const frame = this.atlas.frames.get(key);
    
    if (!frame) {
      console.warn(`Frame not found: ${key}`);
      return;
    }
    
    // Draw from atlas texture to target position
    ctx.drawImage(
      this.atlas.texture,
      frame.x, frame.y, frame.width, frame.height,  // Source in atlas
      x, y, frame.width, frame.height               // Destination on canvas
    );
  }
}
```

### 6.2 WebGL Rendering (Phase 2 - Future)

```typescript
class WebGLRenderer {
  private gl: WebGLRenderingContext;
  private texture: WebGLTexture | null = null;
  private atlas: AtlasResult | null = null;
  
  uploadAtlas(atlas: AtlasResult): void {
    this.atlas = atlas;
    this.texture = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
    
    this.gl.texImage2D(
      this.gl.TEXTURE_2D, 0, this.gl.RGBA,
      this.gl.RGBA, this.gl.UNSIGNED_BYTE,
      atlas.texture
    );
    
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
  }
  
  renderProduct(sku: string, x: number, y: number, angle?: string): void {
    const key = `${sku}_${angle || 'front'}_default`;
    const uv = this.atlas!.uvMap.get(key);
    
    if (!uv) return;
    
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
    this.renderQuad(x, y, uv.normalized);
  }
}
```

---

## 7. Error Handling

```typescript
class AtlasError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'AtlasError';
  }
}

class PackingError extends AtlasError {
  constructor(message: string) {
    super(message, 'PACKING_ERROR');
  }
}

class ValidationError extends AtlasError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR');
  }
}
```

---

## 8. Usage Example

```typescript
// Build atlas
const builder = new AtlasBuilder();
const atlas = await builder.buildAtlas(
  {
    id: 'planogram-001',
    products: [
      { sku: 'CEREAL-001', facing: { horizontal: 3, vertical: 2 } },
      { sku: 'CEREAL-002' },
      { sku: 'CEREAL-001' }, // Duplicate - deduped automatically
    ],
  },
  {
    context: 'visualizer',
    quality: 'high',
  }
);

// Render (positioning is separate concern)
const renderer = new Canvas2DRenderer();
renderer.setAtlas(atlas);

const ctx = canvas.getContext('2d')!;
renderer.renderProduct(ctx, 'CEREAL-001', 100, 50);
renderer.renderProduct(ctx, 'CEREAL-001', 200, 50);
renderer.renderProduct(ctx, 'CEREAL-002', 300, 50);
```

---

## 9. Performance

### Time Complexity
- **Build**: O(n log n) where n = unique sprites
- **Render (Canvas2D)**: O(n) draw calls
- **Render (WebGL)**: O(1) texture bind

### Space Complexity
- **Memory**: width × height × 4 bytes (RGBA)
- **Example**: 4096×4096 = 67MB raw, ~20MB WebP

### Benchmarks
```typescript
const TARGETS = {
  buildTime: {
    small: '<100ms',   // <50 sprites
    medium: '<500ms',  // 50-200 sprites
    large: '<2s',      // 200-500 sprites
  },
  efficiency: {
    minimum: 0.70,
    target: 0.80,
    optimal: 0.85,
  },
};
```
