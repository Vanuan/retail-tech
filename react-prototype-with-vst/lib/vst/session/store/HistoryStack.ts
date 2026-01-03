import { PlanogramAction } from "@vst/types";

/**
 * Manages the timeline of actions for Undo/Redo functionality.
 * Maintains two stacks: 'past' (applied actions) and 'future' (undone actions).
 */
export class HistoryStack {
  // Actions that are currently applied
  private _past: PlanogramAction[] = [];

  // Actions that have been undone and can be redone
  private _future: PlanogramAction[] = [];

  constructor() {}

  /**
   * Gets the sequence of actions that should be projected onto the base state.
   */
  public get activeActions(): PlanogramAction[] {
    // Return a copy to prevent mutation
    return [...this._past];
  }

  public get undoStackSize(): number {
    return this._past.length;
  }

  public get redoStackSize(): number {
    return this._future.length;
  }

  public get canUndo(): boolean {
    return this._past.length > 0;
  }

  public get canRedo(): boolean {
    return this._future.length > 0;
  }

  /**
   * Adds a new action to the history and clears the redo stack.
   */
  public push(action: PlanogramAction): void {
    this._past.push(action);
    // When a new action is performed, the redo history is invalid
    this._future = [];
  }

  /**
   * Replaces the last action with a new one.
   * Useful for "squashing" intermediate dragging states.
   */
  public replaceLast(action: PlanogramAction): void {
    if (this._past.length > 0) {
      this._past[this._past.length - 1] = action;
    } else {
      this.push(action);
    }
  }

  /**
   * Reverts the last action, moving it to the future stack.
   * @returns true if an action was undone
   */
  public undo(): boolean {
    const action = this._past.pop();
    if (action) {
      this._future.push(action);
      return true;
    }
    return false;
  }

  /**
   * Re-applies the most recently undone action.
   * @returns true if an action was redone
   */
  public redo(): boolean {
    const action = this._future.pop();
    if (action) {
      this._past.push(action);
      return true;
    }
    return false;
  }

  /**
   * Resets the history.
   */
  public clear(): void {
    this._past = [];
    this._future = [];
  }
}
