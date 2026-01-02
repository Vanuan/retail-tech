import { Millimeters, ShelfIndex, DepthLevel } from "../core/units";
import { ShelfSurfacePosition } from "./semantic";

// Helper to convert UI inputs (numbers) to Domain Types (Millimeters)
export function createShelfPosition(input: {
  x: number;
  shelfIndex: number;
  depth: number;
}): ShelfSurfacePosition {
  return {
    model: "shelf-surface",
    x: input.x as Millimeters, // Safe cast here, centrally
    shelfIndex: input.shelfIndex as ShelfIndex,
    depth: input.depth as DepthLevel,
  };
}
