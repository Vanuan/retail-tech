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
  position: SemanticPosition;
  
  /** How many times the product repeats */
  facings?: FacingConfig;
  
  /** Stacking configuration */
  pyramid?: PyramidConfig;
  
  /** Business-logic constraints (e.g., "must be on eye level") */
  constraints?: Record<string, unknown>;
}

/**
 * SourceProduct
 * The raw input data for a product in a planogram.
 */
export interface SourceProduct {
  /** Unique instance identifier */
  id: string;
  
  /** Product SKU/Stock code */
  sku: string;
  
  /** Where it is placed */
  placement: ProductPlacement;
  
  /** Optional performance data (sales, etc.) */
  performance?: Record<string, unknown>;
  
  /** Transactional pricing */
  pricing?: {
    unitPrice: number;
    promotionalPrice?: number;
  };
}
