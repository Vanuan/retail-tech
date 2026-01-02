/**
 * @vst/session
 *
 * State management and business logic for the VST Editor.
 * Implements a Flux-like architecture with Undo/Redo capabilities.
 */

// ============================================================================
// STORE - State Container
// ============================================================================

export {
  SessionStore
} from "./store/SessionStore";

export {
  HistoryStack
} from "./store/HistoryStack";

// ============================================================================
// PROJECTION - Logic Engine
// ============================================================================

export {
  CoreProjector
} from "./projection/CoreProjector";

// ============================================================================
// REACT INTEGRATION
// ============================================================================

export {
  usePlanogramSession,
  UsePlanogramSessionResult
} from "./hooks/usePlanogramSession";
