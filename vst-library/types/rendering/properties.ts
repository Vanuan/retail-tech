/**
 * RENDERING PROPERTIES
 * Visual characteristics for instances in the render pipeline.
 */

import { Vector2 } from "../core/geometry";
import { ZIndex } from "../core/units";

/**
 * ShadowProperties
 * Configuration for drop shadows and contact shadows.
 */
export interface ShadowProperties {
  enabled: boolean;
  type: "standard" | "contact" | "frost" | "drop";
  intensity: number;
  offset: Vector2;
  blur: number;
  color: string;
  needsShadow: boolean;
}

/**
 * MaskProperties
 * Configuration for transparency and clipping masks.
 */
export interface MaskProperties {
  required: boolean;
  maskUrl: string | null;
  transparency: boolean;
  maskType: "alpha-channel" | "silhouette" | "outline";
  compositeOperation: string;
}

/**
 * ZLayerProperties
 * Factors that contribute to the final draw order.
 */
export interface ZLayerProperties {
  /** Baseline Z-index from fixture */
  baseZ: ZIndex;
  
  /** Contribution from shelf height */
  shelfContribution: number;
  
  /** Contribution from horizontal facing order */
  facingContribution: number;
  
  /** Contribution from front-to-back depth */
  depthContribution: number;
  
  /** The final calculated draw order */
  finalZIndex: ZIndex;
}

/**
 * DepthCategory
 * Logical depth bucket for visual effects.
 */
export type DepthCategory = "front" | "middle" | "back";
