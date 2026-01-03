/**
 * @vst/session
 *
 * State management and business logic for the VST Editor.
 * Implements a Flux-like architecture with Undo/Redo capabilities.
 */

// ============================================================================
// STORE - State Container
// ============================================================================

export { SessionStore } from "./store/SessionStore";

export { HistoryStack } from "./store/HistoryStack";

// ============================================================================
// PROJECTION - Logic Engine
// ============================================================================

export { CoreSequenceRoller } from "./projection/CoreSequenceRoller";

// ============================================================================
// REACT INTEGRATION
// ============================================================================

export { usePlanogramSession } from "./hooks/usePlanogramSession";

export type { UsePlanogramSessionResult } from "./hooks/usePlanogramSession";

// ============================================================================
// TYPES
// ============================================================================

export * from "./types/actions";
export * from "./types/state";
export * from "./types/contract";
