/**
 * RENDER COORDINATES
 * Screen-space positioning and bounds for the drawing engine.
 * Values here are typically in Pixels.
 */

import { Vector2 } from "../core/geometry";
import { Pixels, ZIndex, Degrees } from "../core/units";

/**
 * RenderCoordinates
 * Precise positioning for a rendered sprite.
 */
export interface RenderCoordinates extends Vector2 {
  x: Pixels;
  y: Pixels;
  width: Pixels;
  height: Pixels;
  z?: ZIndex;
  
  /** Baseline for text or relative alignment */
  baseline: Vector2;
  
  /** Pivot point (0-1 range) */
  anchorPoint: Vector2;
  
  /** Rotation in degrees */
  rotation: Degrees;
  
  /** Scale factor (1.0 = 100%) */
  scale: number;
}

/**
 * RenderBounds
 * Rectangular area used for hit testing and occlusion.
 */
export interface RenderBounds {
  x: Pixels;
  y: Pixels;
  width: Pixels;
  height: Pixels;
  center: Vector2;
}
