/**
 * SEMANTIC COORDINATES
 * Open protocols for different placement models.
 * Represents the "Retail Truth" in physical units and logical indices.
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
 * The shared contract for all placement models.
 * Open for extension by implementing this interface.
 */
export interface SemanticPositionBase {
  /** The discriminator for the placement model (e.g., 'shelf-surface') */
  readonly model: string;
}

/**
 * SEMANTIC POSITION
 * The polymorphic type for all placement model coordinate systems.
 * Defined as the base interface to allow for organic, decentralized growth.
 */
export type SemanticPosition = SemanticPositionBase;

// ============================================================================
// SHELF SURFACE MODEL - Continuous X with discrete shelves
// ============================================================================

export interface ShelfSurfacePosition extends SemanticPositionBase {
  readonly model: "shelf-surface";

  /** Horizontal position in mm from fixture left edge */
  readonly x: Millimeters;

  /** Shelf level index (0 = bottom shelf) */
  readonly shelfIndex: ShelfIndex;

  /** Row depth (0 = front row, 1+ = back rows) */
  readonly depth: DepthLevel;

  /** Optional Y offset from shelf surface (mm) */
  readonly yOffset?: Millimeters;
}

// ============================================================================
// PEGBOARD GRID MODEL - Discrete hole grid (1-inch standard)
// ============================================================================

export interface PegboardGridPosition extends SemanticPositionBase {
  readonly model: "pegboard-grid";

  /** Horizontal hole coordinate (column index) */
  readonly holeX: number;

  /** Vertical hole coordinate (row index) */
  readonly holeY: number;

  /** Grid spacing in mm (typically 25.4 for 1-inch standard) */
  readonly gridSpacing?: Millimeters;
}

// ============================================================================
// FREEFORM 3D MODEL - Absolute XYZ positioning
// ============================================================================

export interface Freeform3DPosition extends SemanticPositionBase {
  readonly model: "freeform-3d";

  /** Absolute position in 3D space (mm from fixture origin) */
  readonly position: Vector3;

  /** Optional rotation in degrees */
  readonly rotation?: Vector3;
}

// ============================================================================
// BASKET/BIN MODEL - Container-based positioning
// ============================================================================

export interface BasketBinPosition extends SemanticPositionBase {
  readonly model: "basket-bin";

  /** Container identifier */
  readonly containerId: string;

  /** Position within container (0-indexed) */
  readonly slotIndex: number;

  /** Optional XY offset within slot (mm) */
  readonly offset?: Vector2;
}

// ============================================================================
// METADATA & UTILITIES
// ============================================================================

/**
 * EXPANSION INSTANCE IDENTIFIER
 * Used to identify specific instances within a facing group.
 */
export interface ExpansionIdentifier {
  /** Horizontal facing index (0-based) */
  readonly facingX: number;

  /** Vertical facing index (0-based) */
  readonly facingY: number;

  /** Layer index for pyramid displays (0 = base layer) */
  readonly pyramidLayer?: number;
}
