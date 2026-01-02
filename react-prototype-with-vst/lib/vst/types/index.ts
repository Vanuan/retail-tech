/**
 * @vst/types - Core TypeScript Definitions
 *
 * Barrel exports organized by concern.
 * Import what you need, when you need it.
 */

// ============================================================================
// CORE - Primitives and units
// ============================================================================

export * from "./core";

// ============================================================================
// COORDINATES - Physical and semantic positioning
// ============================================================================

export type {
  // Semantic coordinate types
  SemanticPosition,
  ShelfSurfacePosition,
  PegboardGridPosition,
  Freeform3DPosition,
  BasketBinPosition,
  PlacementModelType,
  ExpansionIdentifier,

  // Complete placement specification
} from "./coordinates/semantic";

export type {
  // Render-space coordinates
  RenderCoordinates,
  RenderBounds,
} from "./coordinates/render";

export {
  // Type guards and validation
  isShelfSurfacePosition,
  isPegboardGridPosition,
  isFreeform3DPosition,
  isBasketBinPosition,
  validateSemanticPosition,
} from "./coordinates/validators";

// ============================================================================
// PLANOGRAM - Business domain
// ============================================================================

export type {
  // Configuration
  PlanogramConfig,
  FixtureConfig,
  ShelfConfig,
  FixtureBackground,
} from "./planogram/config";

export type {
  // Product entities
  SourceProduct,
  ProductPlacement,
} from "./planogram/product";

export type {
  // Metadata
  ProductMetadata,
  ProductClassification,
  ProductVisualProperties,
} from "./planogram/metadata";

export type {
  // Placement logic
  FacingConfig,
  PyramidConfig,
} from "./planogram/placement";

export { createFacingConfig } from "./planogram/placement";

// ============================================================================
// PLACEMENT MODELS - Translation strategies
// ============================================================================

export type {
  // Core interface
  IPlacementModel,
  PlacementModelProperties,
} from "./placement-models/interface";

export type {
  // Registry
  IPlacementModelRegistry,
} from "./placement-models/registry";

// ============================================================================
// REPOSITORIES - Data access interfaces
// ============================================================================

export type {
  // Asset provider
  IAssetProvider,
} from "./repositories/providers";

export type {
  // Data repositories
  IProductRepository,
  IFixtureRepository,
  IPlanogramRepository,
} from "./repositories/interfaces";

export type {
  // Unified facade
  IDataAccessLayer,
} from "./repositories/facade";

// ============================================================================
// RENDERING - Drawing engine contracts
// ============================================================================

export type {
  // Viewport and context
  Viewport,
  RenderContextType,
  RenderEngineConfig,
  RenderResult,
  ProcessedPlanogram,
} from "./rendering/engine";

export type { RenderInstance } from "./rendering/instance";

export type {
  // Subsystem interfaces
  IVisualOrchestration,
  IRendererZLayerManager,
  IRendererProductPositioner,
  IHitTester,
  HitTestResult,
  ISpriteExecution,
  IRendererProductSprite,
  IRendererMaskRenderer,
  IRendererShadowRenderer,
} from "./rendering/subsystems";

export type {
  // Interaction state
  EditingState,
} from "./rendering/interaction";

export type {
  // Visual properties
  ZLayerProperties,
  ShadowProperties,
  MaskProperties,
  DepthCategory,
} from "./rendering/properties";

// ============================================================================
// CONVENIENCE - Helper functions
// ============================================================================

import {
  ShelfSurfacePosition,
  PegboardGridPosition,
  Freeform3DPosition,
  BasketBinPosition,
} from "./coordinates/semantic";

/**
 * Creates a shelf surface position with sensible defaults.
 */
export function createShelfSurfacePosition(
  params: Omit<ShelfSurfacePosition, "model">,
): ShelfSurfacePosition {
  return {
    model: "shelf-surface",
    ...params,
  };
}

/**
 * Creates a pegboard grid position with sensible defaults.
 */
export function createPegboardGridPosition(
  params: Omit<PegboardGridPosition, "model">,
): PegboardGridPosition {
  return {
    model: "pegboard-grid",
    gridSpacing: 25.4 as any, // Default to 1-inch standard
    ...params,
  };
}

/**
 * Creates a freeform 3D position.
 */
export function createFreeform3DPosition(
  params: Omit<Freeform3DPosition, "model">,
): Freeform3DPosition {
  return {
    model: "freeform-3d",
    ...params,
  };
}

/**
 * Creates a basket/bin position.
 */
export function createBasketBinPosition(
  params: Omit<BasketBinPosition, "model">,
): BasketBinPosition {
  return {
    model: "basket-bin",
    ...params,
  };
}
