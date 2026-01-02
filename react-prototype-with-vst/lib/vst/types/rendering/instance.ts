/**
 * RENDER INSTANCE
 * The "L4" data structure: fully processed and ready for the drawing engine.
 */

import { Dimensions3D, VisualDimensions } from "../core/dimensions";
import { Vector2, Vector3 } from "../core/geometry";
import { RenderCoordinates, RenderBounds } from "../coordinates/render";
import { SemanticPosition } from "../coordinates/semantic";
import { SourceProduct, FixtureConfig, ProductMetadata } from "../planogram";
import { FacingConfig, PyramidConfig } from "../planogram/placement";
import { IPlacementModel } from "../placement-models/interface";
import {
  ShadowProperties,
  MaskProperties,
  ZLayerProperties,
  DepthCategory,
} from "./properties";

/**
 * RenderInstance
 * Contains everything needed to draw a single product on screen.
 */
export interface RenderInstance {
  /** Unique identifier */
  id: string;
  sku: string;

  /** Original L1 source data */
  sourceData: SourceProduct;
  fixture: FixtureConfig;

  /** Resolved strategy and metadata */
  placementModel: IPlacementModel;
  metadata: ProductMetadata;

  /** Physical and visual sizing */
  physicalDimensions: Dimensions3D;
  visualDimensions: VisualDimensions;
  anchorPoint: Vector2;

  /** Positioning */
  semanticCoordinates: SemanticPosition;
  facingData: FacingConfig | null;
  pyramidData: PyramidConfig | null;
  expansionOffset?: Vector3;

  /**
   * WORLD SPACE (Retail Truth)
   * Units: Millimeters. Position is relative to Fixture Origin (0,0,0)
   */
  worldPosition: Vector3;
  worldRotation: Vector3; // Euler angles
  worldDimensions: Dimensions3D;

  /** Scaling logic */
  depthRatio: number;
  renderScale: number;
  scaledDimensions: Dimensions3D;

  /**
   * VISUAL HINTS
   * Context-agnostic descriptions of how it should look.
   */
  depthCategory: DepthCategory;
  zIndexComponents: {
    shelf: number;
    facing: number;
    depth: number;
  };

  /** Visual state */
  visualProperties: {
    isFrontRow: boolean;
    isMiddleRow: boolean;
    isBackRow: boolean;
    depthCategory: DepthCategory;
  };

  /** Calculated draw order */
  zIndex: number;
  zLayerProperties: ZLayerProperties;

  /**
   * RENDERING CONTEXT DATA (L5)
   * These are now optional as they are calculated by the specific engine.
   */
  renderCoordinates?: RenderCoordinates;
  renderBounds?: RenderBounds;
  collisionBounds?: RenderBounds;

  /** Visual effects */
  shadowProperties: ShadowProperties;
  maskProperties: MaskProperties;

  /** Asset handles */
  assets: {
    spriteVariants: Array<{ angle: number; url: string }>;
    maskUrl: string | null;
    shadowConfig: string;
  };

  /** Optional debug/profiling info */
  performance?: Record<string, unknown>;
}
