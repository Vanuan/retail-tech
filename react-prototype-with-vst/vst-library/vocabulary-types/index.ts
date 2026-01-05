/**
 * @vst/vocabulary-types - The shared language of the VST ecosystem.
 *
 * This package contains only nouns, shapes, and invariants.
 * It contains NO behavior, NO helpers, and NO runtime logic.
 */

// ============================================================================
// CORE - Primitives and units
// ============================================================================

export * from "./core";

// ============================================================================
// COORDINATES - Physical and semantic positioning protocols
// ============================================================================

export {
  SemanticPosition,
  SemanticPositionBase,
  ShelfSurfacePosition,
  PegboardGridPosition,
  Freeform3DPosition,
  BasketBinPosition,
  PlacementModelType,
  ExpansionIdentifier,
} from "./coordinates/semantic";

export { RenderCoordinates, RenderBounds } from "./coordinates/render";

// ============================================================================
// PLANOGRAM - Business domain vocabulary
// ============================================================================

export {
  PlanogramConfig,
  FixtureConfig,
  ShelfConfig,
  FixtureBackground,
} from "./planogram/config";

export { PlanogramConfigSchema } from "./planogram/schemas";

export { SourceProduct, ProductPlacement } from "./planogram/product";

export {
  ProductMetadata,
  ProductClassification,
  ProductVisualProperties,
} from "./planogram/metadata";

export {
  FacingConfig,
  PyramidConfig,
  PlacementConstraints,
  PlacementSuggestion,
} from "./planogram/placement";

export * from "./planogram/actions";

// ============================================================================
// REPOSITORIES - Data access contracts (Interfaces only)
// ============================================================================

export { IAssetProvider } from "./repositories/providers";

export {
  IProductRepository,
  IFixtureRepository,
  IPlanogramRepository,
} from "./repositories/interfaces";

export { IDataAccessLayer } from "./repositories/facade";

// ============================================================================
// VALIDATION - Quality assurance shapes
// ============================================================================

export {
  ValidationResult,
  ValidationError,
  ValidationWarning,
} from "./validation";

export { ValidationErrorCode } from "./validation/codes";

// ============================================================================
// RENDERING - Drawing engine contracts (L4 Vocabulary)
// ============================================================================

export {
  Viewport,
  RenderContextType,
  RenderEngineConfig,
  RenderResult,
  ProjectionType,
  RenderProjection,
  IVstRenderer,
  ProcessedPlanogram,
} from "./rendering/engine";

export type { RenderInstance } from "./rendering/instance";

export {
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

export { EditingState } from "./rendering/interaction";

export {
  ZLayerProperties,
  ShadowProperties,
  MaskProperties,
  DepthCategory,
} from "./rendering/properties";

// ============================================================================
// PROCESSING - Computation and transformation contracts
// ============================================================================

export * from "./processing";

// ============================================================================
// LIFECYCLE - Data transformation stages
// ============================================================================

export * from "./lifecycle/types";

// ============================================================================
// SESSION - State management contracts
// ============================================================================

export * from "./session";
