/**
 * VALIDATION CONTRACTS
 * Shared types for reporting success/failure across the system.
 */

import { ValidationErrorCode } from "./codes";

// The standard response for any validity check (L2)
export interface ValidationResult {
  valid: boolean;
  canRender: boolean; // Can we draw it even if it's invalid? (e.g. slight collision)
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  code: ValidationErrorCode;
  message: string;

  // Path to the invalid data (e.g., "products[0].position.x")
  path?: string[];

  // ID of the entity causing the error
  entityId?: string;
}

export interface ValidationWarning {
  code: ValidationErrorCode;
  message: string;
  entityId?: string;
}
