/**
 * INTERACTION STATE
 * Types for handling user input and editor state.
 */

import { Vector2 } from "../core/geometry";
import { RenderInstance } from "./instance";

export interface EditingState {
  selectedInstanceId: string | null;
  selectedInstanceIds?: string[];
  hoveredInstanceId: string | null;
  isDragging: boolean;
  dragOffset?: Vector2;
  dragCurrentPos?: Vector2;
  ghostInstance?: Partial<RenderInstance>;
}
