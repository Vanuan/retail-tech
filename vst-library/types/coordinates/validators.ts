/**
 * COORDINATE VALIDATORS
 * Type guards and validation logic for semantic positions.
 */

import {
  SemanticPosition,
  ShelfSurfacePosition,
  PegboardGridPosition,
  Freeform3DPosition,
  BasketBinPosition,
} from "./semantic";

export function isShelfSurfacePosition(
  pos: SemanticPosition,
): pos is ShelfSurfacePosition {
  return pos.model === "shelf-surface";
}

export function isPegboardGridPosition(
  pos: SemanticPosition,
): pos is PegboardGridPosition {
  return pos.model === "pegboard-grid";
}

export function isFreeform3DPosition(
  pos: SemanticPosition,
): pos is Freeform3DPosition {
  return pos.model === "freeform-3d";
}

export function isBasketBinPosition(
  pos: SemanticPosition,
): pos is BasketBinPosition {
  return pos.model === "basket-bin";
}

/**
 * Validates a semantic position has required fields and valid values.
 */
export function validateSemanticPosition(pos: SemanticPosition): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  switch (pos.model) {
    case "shelf-surface":
      if (pos.x < 0) errors.push("x must be non-negative");
      if (pos.shelfIndex < 0) errors.push("shelfIndex must be non-negative");
      if (pos.depth < 0) errors.push("depth must be non-negative");
      break;

    case "pegboard-grid":
      if (pos.holeX < 0) errors.push("holeX must be non-negative");
      if (pos.holeY < 0) errors.push("holeY must be non-negative");
      break;

    case "freeform-3d":
      if (!pos.position) errors.push("position is required");
      break;

    case "basket-bin":
      if (!pos.containerId) errors.push("containerId is required");
      if (pos.slotIndex < 0) errors.push("slotIndex must be non-negative");
      break;
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
