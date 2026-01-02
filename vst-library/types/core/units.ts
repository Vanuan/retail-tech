/**
 * UNIT TYPES
 * Type-safe wrappers for physical measurements.
 *
 * These branded types prevent accidental mixing of different units
 * while maintaining runtime compatibility with numbers.
 */

/**
 * MILLIMETERS
 * Physical distance measurement (retail space standard).
 *
 * @example
 * ```typescript
 * const shelfWidth: Millimeters = 1200;
 * const productX: Millimeters = 350;
 * ```
 */
export type Millimeters = number & { readonly __brand: "Millimeters" };

/**
 * PIXELS
 * Screen-space measurement (render coordinates).
 *
 * @example
 * ```typescript
 * const canvasX: Pixels = 480;
 * const productWidth: Pixels = 120;
 * ```
 */
export type Pixels = number & { readonly __brand: "Pixels" };

/**
 * DEGREES
 * Rotation angle measurement.
 *
 * @example
 * ```typescript
 * const rotation: Degrees = 45;
 * const viewAngle: Degrees = 315;
 * ```
 */
export type Degrees = number & { readonly __brand: "Degrees" };

/**
 * PERCENTAGE
 * Normalized value (0-100).
 *
 * @example
 * ```typescript
 * const depthScale: Percentage = 92; // 92% scale for back row
 * const opacity: Percentage = 80;
 * ```
 */
export type Percentage = number & { readonly __brand: "Percentage" };

/**
 * Z_INDEX
 * Draw order priority (higher = drawn later = on top).
 *
 * @example
 * ```typescript
 * const frontRowZ: ZIndex = 1000;
 * const backRowZ: ZIndex = 500;
 * ```
 */
export type ZIndex = number & { readonly __brand: "ZIndex" };

/**
 * SHELF_INDEX
 * Vertical level identifier (0 = bottom shelf).
 *
 * @example
 * ```typescript
 * const bottomShelf: ShelfIndex = 0;
 * const topShelf: ShelfIndex = 4;
 * ```
 */
export type ShelfIndex = number & { readonly __brand: "ShelfIndex" };

/**
 * DEPTH_LEVEL
 * Front-to-back row position (0 = front row).
 */
export type DepthLevel = 0 | 1 | 2 | 3;

/**
 * FACING_COUNT
 * Number of product repetitions (must be positive integer).
 */
export type FacingCount = number & { readonly __brand: "FacingCount" };

// ============================================================================
// UNIT CONVERSION HELPERS
// ============================================================================

/**
 * Converts millimeters to pixels based on zoom level.
 */
export function mmToPixels(mm: Millimeters, zoom: number): Pixels {
  return (mm * zoom) as Pixels;
}

/**
 * Converts pixels to millimeters based on zoom level.
 */
export function pixelsToMm(pixels: Pixels, zoom: number): Millimeters {
  return (pixels / zoom) as Millimeters;
}

/**
 * Converts degrees to radians.
 */
export function degreesToRadians(degrees: Degrees): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Converts radians to degrees.
 */
export function radiansToDegrees(radians: number): Degrees {
  return ((radians * 180) / Math.PI) as Degrees;
}

/**
 * Normalizes a percentage to 0-1 range.
 */
export function percentageToRatio(percentage: Percentage): number {
  return percentage / 100;
}

/**
 * Converts a ratio to percentage.
 */
export function ratioToPercentage(ratio: number): Percentage {
  return (ratio * 100) as Percentage;
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validates that a value is a non-negative millimeter measurement.
 */
export function isValidMillimeters(value: number): value is Millimeters {
  return value >= 0 && Number.isFinite(value);
}

/**
 * Validates that a value is a valid shelf index.
 */
export function isValidShelfIndex(value: number): value is ShelfIndex {
  return Number.isInteger(value) && value >= 0;
}

/**
 * Validates that a value is a valid depth level.
 */
export function isValidDepthLevel(value: number): value is DepthLevel {
  return [0, 1, 2, 3].includes(value);
}

/**
 * Validates that a value is a valid facing count.
 */
export function isValidFacingCount(value: number): value is FacingCount {
  return Number.isInteger(value) && value > 0;
}

// ============================================================================
// TYPE CONSTRUCTORS (Safe casting)
// ============================================================================

/**
 * Safely creates a Millimeters value with validation.
 */
export function millimeters(value: number): Millimeters {
  if (!isValidMillimeters(value)) {
    throw new Error(`Invalid millimeters value: ${value}`);
  }
  return value as Millimeters;
}

/**
 * Safely creates a ShelfIndex with validation.
 */
export function shelfIndex(value: number): ShelfIndex {
  if (!isValidShelfIndex(value)) {
    throw new Error(`Invalid shelf index: ${value}`);
  }
  return value as ShelfIndex;
}

/**
 * Safely creates a FacingCount with validation.
 */
export function facingCount(value: number): FacingCount {
  if (!isValidFacingCount(value)) {
    throw new Error(`Invalid facing count: ${value}`);
  }
  return value as FacingCount;
}
