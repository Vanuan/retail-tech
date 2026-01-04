import { useEffect, useState, useCallback } from "react";
import { PlanogramAction } from "../types/actions";
import { PlanogramSnapshot } from "../types/state";
import { SessionStore } from "../store/SessionStore";

export interface UseSessionStoreResult {
  snapshot: PlanogramSnapshot | null;
  dispatch: (action: PlanogramAction) => Promise<void>;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  canUndo: boolean;
  canRedo: boolean;
  isProjecting: boolean;
}

/**
 * LOW-LEVEL HOOK: useSessionStore
 * Bridges the imperative SessionStore with React's declarative updates.
 *
 * @param store The SessionStore instance to subscribe to.
 */
export function useSessionStore(
  store: SessionStore | null,
): UseSessionStoreResult {
  // Sync React state with the Store's current snapshot
  const [snapshot, setSnapshot] = useState<PlanogramSnapshot | null>(
    store?.currentSnapshot ?? null,
  );

  useEffect(() => {
    if (!store) {
      setSnapshot(null);
      return;
    }

    // 1. Check if store updated while component was mounting
    if (store.currentSnapshot !== snapshot) {
      setSnapshot(store.currentSnapshot);
    }

    // 2. Subscribe to future updates
    const unsubscribe = store.subscribe((newSnapshot) => {
      setSnapshot(newSnapshot);
    });

    // 3. Cleanup on unmount or store change
    return () => {
      unsubscribe();
    };
  }, [store]);

  // Wrap imperative methods in useCallback to prevent unnecessary child re-renders
  const dispatch = useCallback(
    async (action: PlanogramAction) => {
      if (store) await store.dispatch(action);
    },
    [store],
  );

  const undo = useCallback(async () => {
    if (store) await store.undo();
  }, [store]);

  const redo = useCallback(async () => {
    if (store) await store.redo();
  }, [store]);

  return {
    snapshot,
    dispatch,
    undo,
    redo,
    // Evaluate getters on every render cycle
    canUndo: store?.canUndo ?? false,
    canRedo: store?.canRedo ?? false,
    isProjecting: store?.isProjecting ?? false,
  };
}

/**
 * @deprecated Use `usePlanogram` for a simpler setup, or `useSessionStore` if you need to pass a manual store.
 */
export const usePlanogramSession = useSessionStore;

/**
 * @deprecated Use `UseSessionStoreResult` instead.
 */
export type UsePlanogramSessionResult = UseSessionStoreResult;
