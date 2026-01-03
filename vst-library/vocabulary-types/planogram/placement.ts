/**
 * PLACEMENT STRATEGIES
 * Declarative shapes for repeating and stacking products.
 */

import { Millimeters, FacingCount } from "../core/units";

/**
 * FacingConfig
 * Defines 2D repetition of a product.
 */
export interface FacingConfig {
  /** Number of horizontal repetitions */
  readonly horizontal: FacingCount;

  /** Number of vertical repetitions */
  readonly vertical: FacingCount;
}

/**
 * PyramidConfig
 * For tapered stacking of products.
 */
export interface PyramidConfig {
  /** Number of layers in the stack */
  readonly layers: number;

  /** Configuration of the bottom-most layer */
  readonly baseFacings: {
    readonly horizontal: FacingCount;
    readonly vertical: FacingCount;
  };

  /** How many units to remove per layer horizontally */
  readonly horizontalDecrement: number;

  /** How many units to add per layer vertically (usually for nesting) */
  readonly verticalIncrement: number;

  /** Horizontal alignment of the stack */
  readonly alignment: "center" | "left" | "right";

  /** Depth shift per layer in mm */
  readonly depthShift?: Millimeters;

  /** Vertical gap between layers in mm */
  readonly verticalGap?: Millimeters;
}
