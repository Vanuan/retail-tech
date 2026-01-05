import { PlanogramAction } from "./planogram/actions";
import { ValidationResult } from "./validation";
import { IPlanogramSnapshot } from "./processing/core-processor";
import { ShelfIndex } from "./core/units";
import { PlacementSuggestion } from "./planogram/placement";

export interface IPlanogramSession {
  snapshot: IPlanogramSnapshot | null;

  stage(action: PlanogramAction): ValidationResult;
  stageTransient(action: PlanogramAction): ValidationResult;

  validate(action: PlanogramAction): ValidationResult;

  undo(): void;
  redo(): void;

  commit(): Promise<void>;

  setSelection(ids: string[]): void;

  suggestPlacement(input: {
    sku: string;
    preferredShelf?: ShelfIndex;
  }): PlacementSuggestion | null;
}
