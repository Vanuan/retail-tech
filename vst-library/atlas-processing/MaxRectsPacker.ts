import {
  Rectangle,
  SpriteCanvas,
  PackedSprite,
  PackingResult
} from "./types";
import { PackingError } from "./errors";

/**
 * MAX RECTS PACKER
 *
 * Implements the MaxRects algorithm for efficient 2D texture packing.
 * This algorithm maintains a list of maximal free rectangles and splits them
 * as new sprites are placed.
 */
export class MaxRectsPacker {
  private freeRects: Rectangle[];
  private maxWidth: number;
  private maxHeight: number;
  private padding: number;

  constructor(maxWidth: number, maxHeight: number, padding: number) {
    this.maxWidth = maxWidth;
    this.maxHeight = maxHeight;
    this.padding = padding;

    // Initialize with one large free rectangle covering the entire allowed area
    this.freeRects = [{ x: 0, y: 0, width: maxWidth, height: maxHeight }];
  }

  /**
   * Packs an array of sprites into the smallest possible atlas area.
   * @param sprites Array of sprites with dimensions to be packed.
   * @returns A packing result containing positions and efficiency metrics.
   */
  public pack(sprites: SpriteCanvas[]): PackingResult {
    // Sort by area (descending) - a common heuristic for better packing density
    const sorted = [...sprites].sort(
      (a, b) => (b.width * b.height) - (a.width * a.height)
    );

    const packedSprites: PackedSprite[] = [];

    for (const sprite of sorted) {
      const packed = this.findBestFit(sprite);

      if (!packed) {
        throw new PackingError(
          `Cannot fit sprite: ${sprite.key} (${sprite.width}x${sprite.height}) into ${this.maxWidth}x${this.maxHeight} atlas.`
        );
      }

      packedSprites.push(packed);
      this.updateFreeRects(packed);
    }

    // Calculate the actual used dimensions of the atlas
    const atlasWidth = packedSprites.length > 0
      ? Math.max(...packedSprites.map(p => p.x + p.width + this.padding))
      : 0;
    const atlasHeight = packedSprites.length > 0
      ? Math.max(...packedSprites.map(p => p.y + p.height + this.padding))
      : 0;

    return {
      packedSprites,
      atlasWidth,
      atlasHeight,
      efficiency: this.calculateEfficiency(packedSprites, atlasWidth, atlasHeight),
    };
  }

  /**
   * Finds the best free rectangle for a sprite using the "Best Area Fit" heuristic.
   */
  private findBestFit(sprite: SpriteCanvas): PackedSprite | null {
    let bestRect: Rectangle | null = null;
    let bestScore = Infinity;

    // Accounts for padding on all sides of the sprite
    const w = sprite.width + this.padding * 2;
    const h = sprite.height + this.padding * 2;

    for (const rect of this.freeRects) {
      if (rect.width < w || rect.height < h) continue;

      // Score calculation: prioritize rectangles that leave the least leftover area
      const areaFit = rect.width * rect.height - w * h;
      const shortSideFit = Math.min(rect.width - w, rect.height - h);

      // Heuristic score (lower is better)
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

  /**
   * Updates the list of free maximal rectangles after a sprite has been placed.
   */
  private updateFreeRects(packed: PackedSprite): void {
    const placedRect: Rectangle = {
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

      // If they intersect, split the free rectangle into up to 4 smaller ones
      newRects.push(...this.split(rect, placedRect));
    }

    // Clean up the list to keep only maximal rectangles
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

  /**
   * Splits a free rectangle into smaller rectangles based on its intersection with a placed rectangle.
   */
  private split(rect: Rectangle, placed: Rectangle): Rectangle[] {
    const result: Rectangle[] = [];

    // Left split
    if (placed.x > rect.x) {
      result.push({ x: rect.x, y: rect.y, width: placed.x - rect.x, height: rect.height });
    }
    // Right split
    if (placed.x + placed.width < rect.x + rect.width) {
      result.push({ x: placed.x + placed.width, y: rect.y, width: (rect.x + rect.width) - (placed.x + placed.width), height: rect.height });
    }
    // Top split
    if (placed.y > rect.y) {
      result.push({ x: rect.x, y: rect.y, width: rect.width, height: placed.y - rect.y });
    }
    // Bottom split
    if (placed.y + placed.height < rect.y + rect.height) {
      result.push({ x: rect.x, y: placed.y + placed.height, width: rect.width, height: (rect.y + rect.height) - (placed.y + placed.height) });
    }

    // Filter out tiny or invalid rectangles
    return result.filter(r => r.width > 0 && r.height > 0);
  }

  /**
   * Removes rectangles that are completely contained within other rectangles.
   */
  private removeRedundant(rects: Rectangle[]): Rectangle[] {
    return rects.filter((rect, i) => {
      return !rects.some((other, j) => i !== j && this.contains(other, rect));
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
    if (width === 0 || height === 0) return 0;

    const totalArea = width * height;
    const usedArea = packedSprites.reduce(
      (sum, p) => sum + (p.width * p.height),
      0
    );

    return usedArea / totalArea;
  }
}
