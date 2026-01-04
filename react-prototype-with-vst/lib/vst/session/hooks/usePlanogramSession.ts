import { useState, useMemo, useEffect } from "react";
import {
  PlanogramConfig,
  ProductMetadata,
  ICoreProcessor,
} from "@vst/vocabulary-types";
import { SessionStore } from "../store/SessionStore";
import { CoreActionReducer } from "../reduction/CoreActionReducer";
import { CoreSnapshotProjector } from "../projection/CoreSnapshotProjector";
import { PlanogramReducer } from "../facade/PlanogramReducer";
import { CoreProcessor } from "../../implementations/core/processor";
import { useSessionStore, UseSessionStoreResult } from "./useSessionStore";

export interface UsePlanogramSessionOptions {
  /**
   * A custom processor implementation. If not provided, a default
   * `CoreProcessor` will be instantiated. This is useful for testing or
   * supplying a mock processor in development environments.
   */
  processor?: ICoreProcessor;
}

export interface UsePlanogramSessionResult extends UseSessionStoreResult {
  /**
   * A boolean flag indicating if the session is fully initialized and ready.
   * This becomes true once `config`, `metadata`, the `store`, and the initial
   * `snapshot` are all available.
   */
  isReady: boolean;

  /**
   * The underlying `SessionStore` instance. This is exposed for advanced
   * use cases that require direct interaction with the store, such as
   * committing changes.
   */
  store: SessionStore | null;
}

/**
 * A comprehensive React hook that encapsulates all the logic for managing a
 * planogram editing session. It handles the instantiation of the processor,
 * reducer, and store, and subscribes to state changes.
 *
 * @example
 * ```tsx
 * const session = usePlanogramSession(config, metadata, dal);
 *
 * if (!session.isReady) return <Loading />;
 *
 * return (
 *   <Canvas
 *     snapshot={session.snapshot}
 *     onProductMove={(id, pos) => session.dispatch({
 *       type: "PRODUCT_MOVE",
 *       productId: id,
 *       to: pos
 *     })}
 *   />
 * );
 * ```
 *
 * @param config The planogram configuration data (L1). The session will re-initialize if the ID of this object changes.
 * @param metadata A map of product SKU to its corresponding metadata.
 * @param dal The data access layer, required by the `CoreProcessor` to fetch necessary data.
 * @param options An optional object to provide a custom processor.
 * @returns A state object containing the latest snapshot, dispatch functions, and session status.
 */
export function usePlanogramSession(
  config: PlanogramConfig | null,
  metadata: Map<string, ProductMetadata> | null,
  dal: any, // In a real app, this would have a proper DAL interface type
  options?: UsePlanogramSessionOptions,
): UsePlanogramSessionResult {
  // 1. Memoize the processor. It's stable as long as the DAL and custom processor don't change.
  const processor = useMemo(() => {
    return options?.processor || new CoreProcessor(dal);
  }, [dal, options?.processor]);

  // 2. Memoize the reducer/projector facade. This re-initializes if the processor or metadata changes.
  const reducer = useMemo(() => {
    if (!metadata) return null;

    const actionReducer = new CoreActionReducer(metadata);
    const snapshotProjector = new CoreSnapshotProjector(processor, metadata);

    return new PlanogramReducer(actionReducer, snapshotProjector);
  }, [processor, metadata]);

  // 3. Manage the SessionStore instance's lifecycle.
  const [store, setStore] = useState<SessionStore | null>(null);

  useEffect(() => {
    // A new store is created only when a valid config and reducer are available.
    if (config && reducer) {
      const newStore = new SessionStore(config, reducer);
      setStore(newStore);

      // The effect cleanup function can be used for future disposal logic.
      return () => {
        // e.g., newStore.dispose();
      };
    } else {
      // If config or reducer is missing, ensure the store is cleared.
      setStore(null);
    }
    // This effect runs when the planogram's identity changes (via config.id) or the reducer is rebuilt.
  }, [config?.id, reducer]);

  // 4. Use the low-level hook to subscribe the component to store updates.
  const sessionResult = useSessionStore(store);

  // 5. Return the combined, user-friendly result object.
  return {
    ...sessionResult,
    isReady: !!(config && metadata && store && sessionResult.snapshot),
    store,
  };
}
