import { PlanogramConfig } from "@vst/vocabulary-types";
import { IPlanogramSequenceRoller } from "../types/contract";
import { PlanogramAction } from "../types/actions";
import { PlanogramSnapshot } from "../types/state";
import { HistoryStack } from "./HistoryStack";

/**
 * SESSION STORE
 * The central hub for editing state.
 * Implements a Flux-like architecture where actions are dispatched,
 * history is managed, and the resulting state is projected.
 */
export class SessionStore {
  private baseConfig: PlanogramConfig;
  private history: HistoryStack;
  private roller: IPlanogramSequenceRoller;
  private selection: string[] = [];
  private listeners: Set<(snapshot: PlanogramSnapshot) => void> = new Set();
  private projectionId: number = 0;

  // The current observable truth
  public currentSnapshot: PlanogramSnapshot | null = null;

  // State flags
  public isProjecting: boolean = false;

  constructor(base: PlanogramConfig, roller: IPlanogramSequenceRoller) {
    this.baseConfig = base;
    this.roller = roller;
    this.history = new HistoryStack();

    // Trigger initial projection
    this.recalculate();
  }

  /**
   * Dispatches a new action to modify the planogram.
   * This pushes the action to history and triggers a re-projection.
   */
  public async dispatch(action: PlanogramAction): Promise<void> {
    this.history.push(action);
    await this.recalculate();
  }

  /**
   * Dispatches an action that replaces the last one in the history stack.
   * Useful for continuous interactions like dragging to avoid flooding history.
   */
  public async dispatchSquashed(action: PlanogramAction): Promise<void> {
    const actions = this.history.activeActions;
    const lastAction = actions[actions.length - 1];

    // Only squash if the last action was also a transient update for the SAME product.
    // We NEVER squash onto a PRODUCT_ADD, otherwise the product disappears from history.
    const canSquash =
      lastAction &&
      (lastAction.type === "PRODUCT_MOVE" ||
        lastAction.type === "PRODUCT_FACINGS" ||
        lastAction.type === "PRODUCT_UPDATE") &&
      "productId" in action &&
      (lastAction as any).productId === (action as any).productId;

    if (canSquash) {
      this.history.replaceLast(action);
    } else {
      this.history.push(action);
    }

    await this.recalculate();
  }

  /**
   * Reverts the last action.
   */
  public async undo(): Promise<void> {
    if (this.history.undo()) {
      await this.recalculate();
    }
  }

  /**
   * Re-applies the most recently undone action.
   */
  public async redo(): Promise<void> {
    if (this.history.redo()) {
      await this.recalculate();
    }
  }

  /**
   * Checks if undo is possible.
   */
  public get canUndo(): boolean {
    return this.history.canUndo;
  }

  /**
   * Checks if redo is possible.
   */
  public get canRedo(): boolean {
    return this.history.canRedo;
  }

  /**
   * Updates the current selection and notifies listeners.
   */
  public setSelection(ids: string[]): void {
    this.selection = ids;
    if (this.currentSnapshot) {
      this.currentSnapshot.session.selection = [...ids];
      this.notify();
    }
  }

  /**
   * Commits the current state as the new base.
   * Clears history and resets the dirty flag.
   */
  public async commit(): Promise<void> {
    if (this.currentSnapshot) {
      this.baseConfig = this.currentSnapshot.config;
      this.history.clear();
      await this.recalculate();
    }
  }

  /**
   * Subscribes to changes in the projected snapshot.
   * Returns a cleanup function.
   */
  public subscribe(
    callback: (snapshot: PlanogramSnapshot) => void,
  ): () => void {
    this.listeners.add(callback);
    // If we already have state, notify immediately
    if (this.currentSnapshot) {
      callback(this.currentSnapshot);
    }
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Core logic: Projects the base config + action history into a new snapshot.
   */
  private async recalculate(): Promise<void> {
    const currentId = ++this.projectionId;
    this.isProjecting = true;
    try {
      const actions = this.history.activeActions;
      const snapshot = await this.roller.roll(this.baseConfig, actions);

      // Concurrency Guard: If a newer projection has started, ignore this result.
      // This prevents out-of-order updates from overwriting the latest state.
      if (currentId !== this.projectionId) return;

      // Overlay store-managed session state
      snapshot.session.selection = [...this.selection];

      this.currentSnapshot = snapshot;
      this.notify();
    } catch (error) {
      console.error("Failed to project planogram state:", error);
    } finally {
      if (currentId === this.projectionId) {
        this.isProjecting = false;
      }
    }
  }

  private notify() {
    if (this.currentSnapshot) {
      for (const listener of this.listeners) {
        listener(this.currentSnapshot);
      }
    }
  }
}
