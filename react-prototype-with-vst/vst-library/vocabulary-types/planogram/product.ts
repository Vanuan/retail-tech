/**
 * PRODUCT ENTITIES
 * Source data for products within a planogram.
 */

import { SemanticPosition } from "../coordinates/semantic";
import { FacingConfig, PyramidConfig } from "./placement";

/**
 * ProductPlacement
 * Defines where and how a product is placed.
 */
export interface ProductPlacement {
  /** The retail-truth position */
  readonly position: SemanticPosition;

  /** How many times the product repeats */
  readonly facings?: FacingConfig;

  /** Stacking configuration */
  readonly pyramid?: PyramidConfig;

  /** Business-logic constraints (e.g., "must be on eye level") */
  readonly constraints?: Record<string, unknown>;
}

/**
 * SourceProduct
 * The raw input data for a product in a planogram.
 */
export interface SourceProduct {
  /** Unique instance identifier */
  readonly id: string;

  /** Product SKU/Stock code */
  readonly sku: string;

  /** Where it is placed */
  readonly placement: ProductPlacement;

  /** Optional performance data (sales, etc.) */
  readonly performance?: Record<string, unknown>;

  /** Transactional pricing */
  readonly pricing?: {
    readonly unitPrice: number;
    readonly promotionalPrice?: number;
  };
}
