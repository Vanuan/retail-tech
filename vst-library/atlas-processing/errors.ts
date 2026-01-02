/**
 * ATLAS PROCESSING ERRORS
 *
 * Specialized error classes for the Atlas Builder pipeline.
 */

export class AtlasError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'AtlasError';
    // Ensure the prototype is correctly set for custom errors in TypeScript
    Object.setPrototypeOf(this, AtlasError.prototype);
  }
}

export class PackingError extends AtlasError {
  constructor(message: string) {
    super(message, 'PACKING_ERROR');
    this.name = 'PackingError';
    Object.setPrototypeOf(this, PackingError.prototype);
  }
}

export class ValidationError extends AtlasError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}
