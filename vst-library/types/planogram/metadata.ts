/**
 * PRODUCT METADATA
 * Rich information about products from a master catalog.
 */

import { ProductDimensions } from "../core/dimensions";

export interface ProductMetadata {
  id: string;
  sku: string;
  name: string;
  
  /** Catalog classification */
  classification: ProductClassification;
  
  /** Size information (Physical + Visual) */
  dimensions: ProductDimensions;
  
  /** Rendering hints */
  visualProperties: ProductVisualProperties;
  
  /** Standard pricing */
  pricing?: {
    unitPrice: number;
  };
}

export interface ProductClassification {
  category: string;
  subCategory?: string;
  brand?: string;
}

export interface ProductVisualProperties {
  /** Sprite URLs for different viewing angles */
  spriteVariants: Array<{ angle: number; url: string }>;
  
  /** Transparency mask URL */
  maskUrl?: string | null;
  
  /** Whether the image has alpha transparency */
  hasTransparency?: boolean;
  
  /** The type of shadow to render */
  shadowType?: "standard" | "contact" | "frost" | "drop";
}
