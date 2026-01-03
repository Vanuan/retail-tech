/**
 * VST LIBRARY - Core Entry Point
 *
 * This file consolidates the public API for the VST library, providing
 * access to domain vocabulary, behavioral logic, data repositories,
 * processing pipelines, and the unified system facade.
 */

// ============================================================================
// VOCABULARY & DOMAIN TYPES - The "Constitution" (L1-L4)
// ============================================================================
export * from "@vst/vocabulary-types";

// ============================================================================
// VOCABULARY LOGIC - Behavioral helpers (Validators & Factories)
// ============================================================================
export * from "@vst/vocabulary-logic";

// ============================================================================
// SESSION & STATE MANAGEMENT - Serializable actions, snapshots, and manager
// ============================================================================
export * from "@vst/session-types";
export * from "@vst/session";

// ============================================================================
// PLACEMENT MODELS - Translation strategy protocols
// ============================================================================
export * from "@vst/placement-core";

// ============================================================================
// CORE PROCESSING - Stateless transformation pipeline
// ============================================================================
export * from "@vst/core-processing";

// ============================================================================
// DATA ACCESS LAYER - Repositories & Implementation
// ============================================================================
export * from "./data-access";

// ============================================================================
// SYSTEM FACADE - Orchestration
// ============================================================================
export { CompleteSystem } from "./CompleteSystem";
