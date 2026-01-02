import {
  PlanogramConfig,
  PlanogramAction,
  PlanogramSnapshot,
  IPlanogramProjector,
} from "@vst/types";
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
  private projector: IPlanogramProjector;
  private listeners: Set<(snapshot: PlanogramSnapshot) => void> = new Set();

  // The current observable truth
  public currentSnapshot: PlanogramSnapshot | null = null;

  // State flags
  public isProjecting: boolean = false;

  constructor(base: PlanogramConfig, projector: IPlanogramProjector) {
    this.baseConfig = base;
    this.projector = projector;
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
   * Subscribes to changes in the projected snapshot.
   * Returns a cleanup function.
   */
  public subscribe(callback: (snapshot: PlanogramSnapshot) => void): () => void {
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
    this.isProjecting = true;
    try {
      const actions = this.history.activeActions;
      this.currentSnapshot = await this.projector.project(this.baseConfig, actions);
      this.notify();
    } catch (error) {
      console.error("Failed to project planogram state:", error);
      // In a real app, we might dispatch an error state here
    } finally {
      this.isProjecting = false;
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
