/**
 * @vst/retail-logic
 *
 * The "Semantic Physics" engine for VST.
 *
 * This package handles the logical validation, collision detection, and
 * auto-placement of products on fixtures. It operates entirely in
 * semantic space (mm/indices) and has no dependencies on the rendering engine.
 */

export { RetailLogic } from "./RetailLogic";
export * from "./types";

// Exporting internal engines for advanced usage or testing
export { CollisionEngine } from "./engines/CollisionEngine";
export { PlacementSuggester } from "./engines/PlacementSuggester";
export { IntentValidator } from "./engines/IntentValidator";

// Utilities
export { ActionApplier } from "./utils/ActionApplier";
