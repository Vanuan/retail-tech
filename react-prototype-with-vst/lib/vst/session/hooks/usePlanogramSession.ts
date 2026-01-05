import { useState, useMemo, useEffect } from "react";
import {
  PlanogramConfig,
  ProductMetadata,
  ICoreProcessor,
  PlanogramAction,
  ValidationResult,
  IPlanogramSession,
  PlacementSuggestionInput,
} from "@vst/vocabulary-types";
import { SessionStore } from "../store/SessionStore";
import { CoreActionReducer } from "../reduction/CoreActionReducer";
import { CoreSnapshotProjector } from "../projection/CoreSnapshotProjector";
import { PlanogramReducer } from "../facade/PlanogramReducer";
import { CoreProcessor } from "../../implementations/core/processor";
import { useSessionStore } from "./useSessionStore";
import { PlanogramSnapshot } from "../types/state";

export interface UsePlanogramSessionOptions {
  /**
   * A custom processor implementation. If not provided, a default
   * `CoreProcessor` will be instantiated. This is useful for testing or
   * supplying a mock processor in development environments.
   */
  processor?: ICoreProcessor;
}

export interface UsePlanogramSessionResult {
  /**
   * The session facade for interacting with the planogram.
   */
  session: IPlanogramSession | null;

  /**
   * The current renderable snapshot.
   */
  snapshot: PlanogramSnapshot | null;

  /**
   * A boolean flag indicating if the session is fully initialized and ready.
   */
  isReady: boolean;

  /**
   * Status flags from the underlying store.
   */
  canUndo: boolean;
  canRedo: boolean;
  isProjecting: boolean;
}

/**
 * A comprehensive React hook that encapsulates all the logic for managing a
 * planogram editing session.
 */
export function usePlanogramSession(
  config: PlanogramConfig | null,
  metadata: Map<string, ProductMetadata> | null,
  dal: any,
  options?: UsePlanogramSessionOptions,
): UsePlanogramSessionResult {
  // 1. Memoize the processor.
  const processor = useMemo(() => {
    return options?.processor || new CoreProcessor(dal);
  }, [dal, options?.processor]);

  // 2. Memoize the reducer/projector facade.
  const reducer = useMemo(() => {
    if (!metadata) return null;

    const actionReducer = new CoreActionReducer(metadata);
    const snapshotProjector = new CoreSnapshotProjector(processor, metadata);

    return new PlanogramReducer(actionReducer, snapshotProjector);
  }, [processor, metadata]);

  // 3. Manage the SessionStore instance's lifecycle.
  const [store, setStore] = useState<SessionStore | null>(null);

  useEffect(() => {
    if (config && reducer) {
      const newStore = new SessionStore(config, reducer);
      setStore(newStore);
      return () => {
        // cleanup if needed
      };
    } else {
      setStore(null);
    }
  }, [config?.id, reducer]);

  // 4. Use the low-level hook to subscribe to store updates.
  const sessionResult = useSessionStore(store);

  // 5. Create the Session Facade
  const sessionFacade = useMemo<IPlanogramSession | null>(() => {
    if (!store || !metadata || !sessionResult.snapshot) return null;

    return {
      snapshot: sessionResult.snapshot,

      validate: (action: PlanogramAction) => {
        return processor.validateIntent(action, {
          config: sessionResult.snapshot!.config,
          metadata,
        });
      },

      stage: (action: PlanogramAction) => {
        const validation = processor.validateIntent(action, {
          config: sessionResult.snapshot!.config,
          metadata,
        });

        if (validation.valid) {
          store.dispatch(action);
        }
        return validation;
      },

      stageTransient: (action: PlanogramAction) => {
        const validation = processor.validateIntent(action, {
          config: sessionResult.snapshot!.config,
          metadata,
        });

        if (validation.valid) {
          store.dispatchSquashed(action);
        }
        return validation;
      },

      undo: () => store.undo(),
      redo: () => store.redo(),
      commit: () => store.commit(),

      setSelection: (ids: string[]) => {
        store.setSelection(ids);
      },

      suggestPlacement: (
        input: Omit<PlacementSuggestionInput, "config" | "metadata">,
      ) => {
        return processor.suggestPlacement({
          ...input,
          config: sessionResult.snapshot!.config,
          metadata,
        });
      },
    };
  }, [store, processor, metadata, sessionResult.snapshot]);

  // 6. Return the combined result object.
  return {
    session: sessionFacade,
    snapshot: sessionResult.snapshot,
    isReady: !!(config && metadata && store && sessionResult.snapshot),
    canUndo: sessionResult.canUndo,
    canRedo: sessionResult.canRedo,
    isProjecting: sessionResult.isProjecting,
  };
}
