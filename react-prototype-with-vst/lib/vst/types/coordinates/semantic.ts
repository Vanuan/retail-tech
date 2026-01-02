/**
 * SEMANTIC COORDINATES
 * Clear discriminated unions for different placement models.
 * Represents the "Retail Truth" in millimeters and logical indices.
 */

import { Vector2, Vector3 } from "../core/geometry";
import { Millimeters, ShelfIndex, DepthLevel } from "../core/units";

/**
 * PLACEMENT MODEL TYPES
 * Discriminator for coordinate unions.
 */
export type PlacementModelType =
  | "shelf-surface"
  | "pegboard-grid"
  | "freeform-3d"
  | "basket-bin";

/**
 * BASE SEMANTIC POSITION
 * All placement models extend this with model-specific fields.
 */
export interface BaseSemanticPosition {
  /** The placement model this coordinate system uses */
  readonly model: PlacementModelType;
}

// ============================================================================
// SHELF SURFACE MODEL - Continuous X with discrete shelves
// ============================================================================

export interface ShelfSurfacePosition extends BaseSemanticPosition {
  readonly model: "shelf-surface";

  /** Horizontal position in mm from fixture left edge */
  x: Millimeters;

  /** Shelf level index (0 = bottom shelf) */
  shelfIndex: ShelfIndex;

  /** Row depth (0 = front row, 1+ = back rows) */
  depth: DepthLevel;

  /** Optional Y offset from shelf surface (mm) */
  yOffset?: Millimeters;
}

// ============================================================================
// PEGBOARD GRID MODEL - Discrete hole grid (1-inch standard)
// ============================================================================

export interface PegboardGridPosition extends BaseSemanticPosition {
  readonly model: "pegboard-grid";

  /** Horizontal hole coordinate (column index) */
  holeX: number;

  /** Vertical hole coordinate (row index) */
  holeY: number;

  /** Grid spacing in mm (typically 25.4 for 1-inch standard) */
  gridSpacing?: Millimeters; // Default: 25.4
}

// ============================================================================
// FREEFORM 3D MODEL - Absolute XYZ positioning
// ============================================================================

export interface Freeform3DPosition extends BaseSemanticPosition {
  readonly model: "freeform-3d";

  /** Absolute position in 3D space (mm from fixture origin) */
  position: Vector3;

  /** Optional rotation in degrees */
  rotation?: Vector3;
}

// ============================================================================
// BASKET/BIN MODEL - Container-based positioning
// ============================================================================

export interface BasketBinPosition extends BaseSemanticPosition {
  readonly model: "basket-bin";

  /** Container identifier */
  containerId: string;

  /** Position within container (0-indexed) */
  slotIndex: number;

  /** Optional XY offset within slot (mm) */
  offset?: Vector2;
}

// ============================================================================
// UNION TYPE - All possible semantic positions
// ============================================================================

/**
 * SEMANTIC POSITION
 * Discriminated union of all placement model coordinate systems.
 */
export type SemanticPosition =
  | ShelfSurfacePosition
  | PegboardGridPosition
  | Freeform3DPosition
  | BasketBinPosition;

/**
 * EXPANSION INSTANCE IDENTIFIER
 * Used to identify specific instances within a facing group.
 */
export interface ExpansionIdentifier {
  /** Horizontal facing index (0-based) */
  facingX: number;

  /** Vertical facing index (0-based) */
  facingY: number;

  /** Layer index for pyramid displays (0 = base layer) */
  pyramidLayer?: number;
}
