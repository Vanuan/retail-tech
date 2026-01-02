/**
 * PLACEMENT STRATEGIES
 * Logic for repeating and stacking products.
 */

import { Millimeters, FacingCount } from "../core/units";

/**
 * FacingConfig
 * Defines 2D repetition of a product.
 */
export interface FacingConfig {
  /** Number of horizontal repetitions */
  horizontal: FacingCount;
  
  /** Number of vertical repetitions */
  vertical: FacingCount;
  
  /** Total count (horizontal * vertical) */
  readonly total: number;
}

/**
 * PyramidConfig
 * For tapered stacking of products.
 */
export interface PyramidConfig {
  /** Number of layers in the stack */
  layers: number;
  
  /** Configuration of the bottom-most layer */
  baseFacings: {
    horizontal: FacingCount;
    vertical: FacingCount;
  };
  
  /** How many units to remove per layer horizontally */
  horizontalDecrement: number;
  
  /** How many units to add per layer vertically (usually for nesting) */
  verticalIncrement: number;
  
  /** Horizontal alignment of the stack */
  alignment: "center" | "left" | "right";
  
  /** Depth shift per layer in mm */
  depthShift?: Millimeters;
  
  /** Vertical gap between layers in mm */
  verticalGap?: Millimeters;
}

/**
 * Helper to create a FacingConfig.
 */
export function createFacingConfig(
  horizontal: number,
  vertical: number = 1
): FacingConfig {
  return {
    horizontal: horizontal as FacingCount,
    vertical: vertical as FacingCount,
    total: horizontal * vertical,
  };
}
