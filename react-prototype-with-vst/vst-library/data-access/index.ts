/**
 * @vst/data-access
 *
 * Unified Data Access Layer for VST.
 * This package provides concrete implementations of the repository interfaces
 * defined in @vst/vocabulary-types, including browser-based asset management
 * and localStorage persistence with data healing logic.
 */

export * from "./storage";
export * from "./mock-data";
export * from "./AssetProvider";
export * from "./BrowserAssetProvider";
export * from "./ProductRepository";
export * from "./FixtureRepository";
export * from "./PlanogramRepository";
export * from "./DataAccessLayer";

import { DataAccessLayer } from "./DataAccessLayer";

/**
 * Global singleton instance for the data access layer.
 * Initialized with browser-standard providers.
 */
export const dal = new DataAccessLayer();
