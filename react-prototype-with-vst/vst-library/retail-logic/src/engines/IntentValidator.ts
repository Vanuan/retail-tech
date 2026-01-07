import {
  PlanogramAction,
  ValidationResult,
  ValidationErrorCode,
  ValidationError,
  ValidationWarning,
  ProductMetadata,
  PlanogramConfig,
  SemanticPosition,
} from "@vst/vocabulary-types";
import { isShelfSurfacePosition } from "@vst/vocabulary-logic";
import { RetailContext } from "../types";
import { CollisionEngine } from "./CollisionEngine";
import { ActionApplier } from "../utils/ActionApplier";

export class IntentValidator {
  constructor(private collisionEngine: CollisionEngine) {}

  /**
   * Validates if a proposed action is physically and logically possible.
   * Acts as the "Rule Book" for the planogram.
   */
  public validateIntent(
    action: PlanogramAction,
    context: RetailContext
  ): ValidationResult {
    switch (action.type) {
      case "PRODUCT_ADD": {
        return this.validatePlacement(
          context.config,
          context.metadata,
          action.product.sku,
          action.product.placement.position,
          action.product.placement.facings?.horizontal || 1,
          action.product.id
        );
      }

      case "PRODUCT_MOVE": {
        const product = context.config.products.find(
          (p) => p.id === action.productId
        );
        if (!product) {
          return this.createError("PRODUCT_NOT_FOUND", "Product not found");
        }
        return this.validatePlacement(
          context.config,
          context.metadata,
          product.sku,
          action.to,
          product.placement.facings?.horizontal || 1,
          action.productId
        );
      }

      case "PRODUCT_UPDATE_FACINGS": {
        const product = context.config.products.find(
          (p) => p.id === action.productId
        );
        if (!product) {
          return this.createError("PRODUCT_NOT_FOUND", "Product not found");
        }
        return this.validatePlacement(
          context.config,
          context.metadata,
          product.sku,
          product.placement.position,
          action.facings.horizontal,
          action.productId
        );
      }

      case "BATCH": {
        let currentConfig = context.config;
        let valid = true;
        let canRender = true;
        const errors: ValidationError[] = [];
        const warnings: ValidationWarning[] = [];

        for (const subAction of action.actions) {
          // Validate against the evolving state
          const result = this.validateIntent(subAction, {
            config: currentConfig,
            metadata: context.metadata,
          });

          if (!result.valid) valid = false;
          if (!result.canRender) canRender = false;
          errors.push(...result.errors);
          warnings.push(...result.warnings);

          // Apply action to simulate next state if valid
          // (Even if invalid, we might want to continue to find other errors,
          // but logically subsequent actions might depend on this one working)
          if (result.valid) {
            currentConfig = ActionApplier.reduceAction(currentConfig, subAction);
          }
        }

        return {
          valid,
          canRender,
          errors,
          warnings,
        };
      }

      default:
        // Non-product actions (like SHELF_ADD) are generally allowed
        // unless we implement specific logic for them.
        return {
          valid: true,
          canRender: true,
          errors: [],
          warnings: [],
        };
    }
  }

  private validatePlacement(
    config: PlanogramConfig,
    metadata: ReadonlyMap<string, ProductMetadata>,
    sku: string,
    position: SemanticPosition,
    facings: number,
    excludeProductId?: string
  ): ValidationResult {
    // 1. Basic Bounds Check
    if (!isShelfSurfacePosition(position)) {
      // We currently only strictly validate Shelf Surface positioning
      return { valid: true, canRender: true, errors: [], warnings: [] };
    }

    const meta = metadata.get(sku);
    if (!meta) {
      return this.createError("METADATA_MISSING", "Metadata not found");
    }

    const width = meta.dimensions.physical.width * facings;
    const fixtureWidth = config.fixture.dimensions.width;

    if (position.x < 0 || position.x + width > fixtureWidth) {
      return this.createError("OUT_OF_BOUNDS", "Placement is out of bounds");
    }

    // 2. Collision Check
    const hasCollision = this.collisionEngine.checkCollision(
      config,
      metadata,
      sku,
      position,
      facings,
      excludeProductId
    );

    if (hasCollision) {
      return this.createError(
        "COLLISION",
        "Product collides with another product"
      );
    }

    return { valid: true, canRender: true, errors: [], warnings: [] };
  }

  private createError(code: string, message: string): ValidationResult {
    return {
      valid: false,
      canRender: true,
      errors: [
        {
          code: code as ValidationErrorCode,
          message,
        },
      ],
      warnings: [],
    };
  }
}
