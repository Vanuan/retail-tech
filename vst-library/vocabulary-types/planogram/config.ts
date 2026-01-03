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
  readonly id: string;
  readonly index: ShelfIndex;
  readonly baseHeight: Millimeters;
}

/**
 * FixtureConfig
 * Defines the physical structure where products are placed.
 */
export interface FixtureConfig {
  /** Fixture type identifier (e.g., "gondola", "pegboard") */
  readonly type: string;

  /** The translation strategy to use (e.g., "shelf-surface") */
  readonly placementModel: string;

  /** Physical bounding box */
  readonly dimensions: Dimensions3D;

  /** Model-specific configuration (e.g., shelf heights) */
  readonly config: Record<string, unknown>;

  /** Visual assets for the fixture components */
  readonly visualProperties?: FixtureVisualProperties;

  /** Optional visual background */
  readonly background?: FixtureBackground;
}

export interface FixtureBackground {
  readonly color?: string;
  readonly imageUrl?: string;
}

export interface FixtureVisualProperties {
  readonly assets: {
    readonly upright?: string;
    readonly base?: string;
    readonly shelf?: string; // Legacy/Combined
    readonly shelfSurface?: string; // Top surface where products sit
    readonly priceRail?: string; // Front edge for price labels
    readonly back?: string;
  };
  /** Physical dimensions of visual components in millimeters */
  readonly dimensions?: {
    readonly uprightWidth?: Millimeters;
    readonly baseHeight?: Millimeters;
    readonly shelfSurfaceHeight?: Millimeters;
    readonly priceRailHeight?: Millimeters;
    readonly priceLabelHeight?: Millimeters;
    readonly headerHeight?: Millimeters;
  };
}

/**
 * PlanogramConfig (L1)
 * The top-level input data for the system.
 */
export interface PlanogramConfig {
  readonly id: string;
  readonly name: string;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly thumbnail?: string;
  readonly fixture: FixtureConfig;
  readonly products: readonly SourceProduct[];
}
