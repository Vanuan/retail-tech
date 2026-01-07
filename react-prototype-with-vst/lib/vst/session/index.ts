/**
 * @vst/session
 *
 * State management and business logic for the VST Editor.
 * Implements a Flux-like architecture with Undo/Redo capabilities.
 *
 * This package provides a tiered API:
 * - HIGH-LEVEL API: The `usePlanogramSession` hook is the recommended entry point for most users.
 * - LOW-LEVEL API: For advanced use cases requiring direct control over the `SessionStore`.
 * - BUILDING BLOCKS: The core components for customization or use in non-React environments.
 */

// ============================================================================
// HIGH-LEVEL API (Most users start here)
// ============================================================================

export { usePlanogramSession } from "./hooks/usePlanogramSession";
export type {
  UsePlanogramSessionResult,
  UsePlanogramSessionOptions,
} from "./hooks/usePlanogramSession";

// ============================================================================
// LOW-LEVEL API (Advanced use cases)
// ============================================================================

export { useSessionStore } from "./hooks/useSessionStore";
export type { UseSessionStoreResult } from "./hooks/useSessionStore";

export { SessionStore } from "./store/SessionStore";
export { HistoryStack } from "./store/HistoryStack";

// ============================================================================
// BUILDING BLOCKS (For testing, customization, or non-React usage)
// ============================================================================

// --- Interfaces ---

export type { ISnapshotProjector } from "./interfaces/ISnapshotProjector";
export type { IPlanogramReducer } from "./interfaces/IPlanogramReducer";

// --- Implementations ---

export { CoreSnapshotProjector } from "./projection/CoreSnapshotProjector";
export { PlanogramReducer } from "./facade/PlanogramReducer";

// ============================================================================
// TYPES
// ============================================================================

export * from "./types/actions";
export * from "./types/state";
