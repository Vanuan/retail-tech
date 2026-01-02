import { RenderInstance, ValidationResult } from "../types";

/**
 * VALIDATION RULES PROCESSOR
 * Applies L2 validation rules to instances to ensure they are renderable.
 * This processor checks for potential issues that might prevent an instance
 * from being displayed correctly or logically within the fixture.
 */
export class ValidationRulesProcessor {
  /**
   * Validates a single render instance against a set of predefined rules.
   * @param instance The prepared render instance to validate.
   * @returns A ValidationResult object indicating validity, errors, and warnings.
   */
  validate(instance: RenderInstance): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Rule 1: Bounds validation - Ensure the product fits within the fixture.
    if (!this.validateBounds(instance)) {
      errors.push("Product bounds exceed fixture dimensions.");
    }

    // Rule 2: Shelf existence validation - Ensure the product is placed on a valid shelf.
    if (!this.validateShelf(instance)) {
      errors.push("Invalid shelf index or shelf data missing.");
    }

    // Rule 3: Facing count validation - Warn if facing counts are unusually high or low.
    if (!this.validateFacings(instance)) {
      warnings.push("Facing count is outside recommended range.");
    }

    // Rule 4: Scale validation - Warn if the render scale is too extreme.
    if (!this.validateScale(instance)) {
      warnings.push(
        "Render scale is outside optimal range (too small or too large).",
      );
    }

    // Rule 5: Asset availability - Check if essential assets (like sprites) are available.
    if (!this.validateAssets(instance)) {
      errors.push("Missing essential assets (e.g., sprite definition).");
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      // canRender is typically true if there are no errors. Warnings might be acceptable.
      canRender: errors.length === 0,
    };
  }

  /**
   * Checks if the product's calculated render bounds are within the fixture's dimensions.
   */
  private validateBounds(instance: RenderInstance): boolean {
    const bounds = instance.renderBounds;
    const fixtureWidth = instance.fixture.dimensions.width;
    const fixtureHeight = instance.fixture.dimensions.height;

    // Check if bounds are defined and are within the fixture's viewport.
    return (
      bounds &&
      bounds.x >= 0 &&
      bounds.y >= 0 &&
      bounds.x + bounds.width <= fixtureWidth &&
      bounds.y + bounds.height <= fixtureHeight
    );
  }

  /**
   * Checks if the shelf index is valid.
   * This is a basic check; a more robust implementation might query the fixture's
   * configuration for the exact number of available shelves.
   */
  private validateShelf(instance: RenderInstance): boolean {
    const shelfIndex = instance.semanticCoordinates?.shelfIndex;
    const fixtureConfig = instance.fixture.config;

    // Check if the placement model even uses shelves
    const supportsShelves =
      instance.placementModel?.properties?.supportsShelves ?? true;
    if (!supportsShelves) {
      return true;
    }

    // If shelfIndex is missing, check if we have absolute Y as a valid alternative
    if (shelfIndex === undefined || shelfIndex === null) {
      return instance.semanticCoordinates?.y !== undefined;
    }

    // Ensure shelfIndex is a non-negative number.
    if (
      typeof shelfIndex !== "number" ||
      shelfIndex < 0 ||
      !Number.isInteger(shelfIndex)
    ) {
      return false;
    }

    // Optional: Check against max shelves if available in fixture config
    if (
      fixtureConfig?.maxShelves !== undefined &&
      shelfIndex >= fixtureConfig.maxShelves
    ) {
      return false;
    }

    return true;
  }

  /**
   * Checks if the facing count is within a reasonable range.
   * For example, a product with 100 horizontal facings might be an error.
   */
  private validateFacings(instance: RenderInstance): boolean {
    const facingsData = instance.facingData;

    // If no facing data, assume it's valid (might be a single item not in a facing grid).
    if (!facingsData) {
      return true;
    }

    const horizontal = facingsData.horizontal || 1;
    const vertical = facingsData.vertical || 1;

    // Define acceptable ranges (these are examples and can be tuned)
    const maxHorizontalFacings = 10;
    const maxVerticalFacings = 5;

    return (
      horizontal > 0 &&
      horizontal <= maxHorizontalFacings &&
      vertical > 0 &&
      vertical <= maxVerticalFacings
    );
  }

  /**
   * Checks if the calculated scale factor is within acceptable visual limits.
   * Very small or very large scales might indicate errors or lead to rendering issues.
   */
  private validateScale(instance: RenderInstance): boolean {
    const renderScale = instance.renderScale;

    // Define acceptable scale range (e.g., 0.1x to 5.0x)
    const minScale = 0.1;
    const maxScale = 5.0;

    return renderScale >= minScale && renderScale <= maxScale;
  }

  /**
   * Checks if necessary assets for rendering are available.
   * At minimum, we expect some form of visual representation like sprite variants.
   */
  private validateAssets(instance: RenderInstance): boolean {
    // We expect spriteVariants to always be an array due to type definition.
    const hasSpriteVariants = instance.assets.spriteVariants.length > 0;
    const maskUrlExists = instance.assets.maskUrl !== null;

    return hasSpriteVariants || maskUrlExists; // Simplified: requires sprites or mask
  }
}
