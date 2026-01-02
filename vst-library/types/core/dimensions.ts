import { Vector2 } from "./geometry";
import { Millimeters } from "./units";

/**
 * DIMENSIONS TYPES
 *
 * Standardized structures for describing the size and spatial properties
 * of physical objects and visual elements.
 */

/**
 * Dimensions3D
 * Represents the physical size of an object in 3D space.
 * Typically used for products, fixtures, and shelves in millimeters.
 */
export interface Dimensions3D {
  /** Width (X-axis) in millimeters. */
  width: Millimeters;
  /** Height (Y-axis) in millimeters. */
  height: Millimeters;
  /** Depth (Z-axis) in millimeters. */
  depth: Millimeters;
}

/**
 * VisualDimensions
 * Represents the rendered size and alignment of a 2D sprite or element.
 */
export interface VisualDimensions {
  /** Rendered width. */
  width: number;
  /** Rendered height. */
  height: number;
  /** 
   * Pivot point for rotation and scaling. 
   * Usually (0.5, 0.5) for center or (0.5, 1.0) for bottom-center.
   */
  anchor: Vector2;
}

/**
 * ProductDimensions
 * Combined container for physical reality and visual representation.
 */
export interface ProductDimensions {
  physical: Dimensions3D;
  visual: VisualDimensions;
}
