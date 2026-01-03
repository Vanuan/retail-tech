import { PlanogramAction } from "./actions";
import { PlanogramSnapshot } from "./snapshot";

/**
 * SESSION MANAGER CONTRACT
 *
 * Defines the public interface for a stateful session container.
 * The manager handles the lifecycle of an editing session, coordinating
 * between action history and the projection of those actions into a
 * renderable snapshot.
 */
export interface ISessionManager {
  /**
   * The current derived state of the planogram.
   */
  readonly snapshot: PlanogramSnapshot | null;

  /**
   * Dispatches an action to mutate the state.
   */
  dispatch(action: PlanogramAction): Promise<void>;

  /**
   * Reverts the last action in the history stack.
   */
  undo(): Promise<void>;

  /**
   * Re-applies the next action in the history stack.
   */
  redo(): Promise<void>;

  /**
   * Subscribes to changes in the session state.
   * @returns A cleanup function to unsubscribe.
   */
  subscribe(callback: (snapshot: PlanogramSnapshot) => void): () => void;
}
