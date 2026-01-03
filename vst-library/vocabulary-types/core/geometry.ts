/**
 * GEOMETRY PRIMITIVES
 *
 * Fundamental mathematical structures used throughout the VST library.
 * These types are generic and unit-agnostic. Use branded types from
 * `units.ts` for type-safe physical or screen-space measurements.
 */

/**
 * Vector2
 * Represents a point, position, or direction in 2D space.
 */
export interface Vector2 {
  x: number;
  y: number;
}

/**
 * Vector3
 * Represents a point, position, or direction in 3D space.
 * Extends Vector2 to include depth (Z-axis).
 */
export interface Vector3 extends Vector2 {
  z: number;
}

/**
 * Bounds
 * Defines a rectangular region in 2D space using an origin point
 * and dimensions.
 */
export interface Bounds {
  /** The x-coordinate of the origin point. */
  x: number;
  /** The y-coordinate of the origin point. */
  y: number;
  /** The horizontal size of the region. */
  width: number;
  /** The vertical size of the region. */
  height: number;
}
