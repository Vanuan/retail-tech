/**
 * PLANOGRAM CONFIGURATION
 * High-level structure of a planogram and its fixtures.
 */

import { Dimensions3D } from "../core/dimensions";
import { Millimeters, ShelfIndex } from "../core/units";
import { SourceProduct } from "./product";

/**
 * ShelfConfig
 * Defines a single shelf within a fixture.
 */
export interface ShelfConfig {
  id: string;
  index: ShelfIndex;
  baseHeight: Millimeters;
}

/**
 * FixtureConfig
 * Defines the physical structure where products are placed.
 */
export interface FixtureConfig {
  /** Fixture type identifier (e.g., "gondola", "pegboard") */
  type: string;

  /** The translation strategy to use (e.g., "shelf-surface") */
  placementModel: string;

  /** Physical bounding box */
  dimensions: Dimensions3D;

  /** Model-specific configuration (e.g., shelf heights) */
  config: Record<string, unknown>;

  /** Visual assets for the fixture components */
  visualProperties?: FixtureVisualProperties;

  /** Optional visual background */
  background?: FixtureBackground;
}

export interface FixtureBackground {
  color?: string;
  imageUrl?: string;
}

export interface FixtureVisualProperties {
  assets: {
    upright?: string;
    base?: string;
    shelf?: string; // Legacy/Combined
    shelfSurface?: string; // Top surface where products sit
    priceRail?: string; // Front edge for price labels
    back?: string;
  };
  /** Physical dimensions of visual components in millimeters */
  dimensions?: {
    uprightWidth?: Millimeters;
    baseHeight?: Millimeters;
    shelfSurfaceHeight?: Millimeters;
    priceRailHeight?: Millimeters;
    priceLabelHeight?: Millimeters;
    headerHeight?: Millimeters;
  };
}

/**
 * PlanogramConfig (L1)
 * The top-level input data for the system.
 */
export interface PlanogramConfig {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  thumbnail?: string;
  fixture: FixtureConfig;
  products: SourceProduct[];
}
