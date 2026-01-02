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

export {
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

export {
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

export {
  // Configuration
  PlanogramConfig,
  FixtureConfig,
  FixtureBackground,
} from "./planogram/config";

export {
  // Product entities
  SourceProduct,
  ProductPlacement,
} from "./planogram/product";

export {
  // Metadata
  ProductMetadata,
  ProductClassification,
  ProductVisualProperties,
} from "./planogram/metadata";

export {
  // Placement logic
  FacingConfig,
  PyramidConfig,
  createFacingConfig,
} from "./planogram/placement";

// ============================================================================
// PLACEMENT MODELS - Translation strategies
// ============================================================================

export {
  // Core interface
  IPlacementModel,
  PlacementModelProperties,
} from "./placement-models/interface";

export {
  // Registry
  IPlacementModelRegistry,
} from "./placement-models/registry";

// ============================================================================
// REPOSITORIES - Data access interfaces
// ============================================================================

export {
  // Asset resolution
  IAssetProvider,
} from "./repositories/providers";

export {
  // Data repositories
  IProductRepository,
  IFixtureRepository,
  IPlanogramRepository,
} from "./repositories/interfaces";

export {
  // Unified facade
  IDataAccessLayer,
} from "./repositories/facade";

// ============================================================================
// VALIDATION - Quality assurance
// ============================================================================

export {
  ValidationResult,
  ValidationError,
  ValidationWarning,
} from "./validation";

// ============================================================================
// RENDERING - Drawing engine contracts
// ============================================================================

export {
  // Viewport and context
  Viewport,
  RenderContextType,
  RenderEngineConfig,
  RenderResult,
  ProcessedPlanogram,
} from "./rendering/engine";

export type {
  RenderInstance,
} from "./rendering/instance";

export {
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

export {
  // Interaction state
  EditingState,
} from "./rendering/interaction";

export {
  // Visual properties
  ZLayerProperties,
  ShadowProperties,
  MaskProperties,
  DepthCategory,
} from "./rendering/properties";

// ============================================================================
// SESSION & STATE MANAGEMENT - Flux architecture
// ============================================================================

export {
  PlanogramAction,
  MoveProductAction,
  AddProductAction,
  RemoveProductAction,
  UpdateFacingsAction,
  UpdateFixtureAction,
} from "./intent/actions";

export {
  PlanogramSnapshot,
} from "./snapshot/state";

export {
  IPlanogramProjector,
} from "./projection/contract";

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
