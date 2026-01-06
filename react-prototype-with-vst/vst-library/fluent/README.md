# @vst/fluent

A headless, deterministic, fluent API for expressing retail intent.

## Overview

`@vst/fluent` provides a programmatic interface for building planograms without requiring a UI, React, or a stateful session. It is designed for automation, batch generation, CI/CD pipelines, and unit testing.

The package serves as an orchestration layer over the `ICoreProcessor`, translating high-level retail intent into valid `PlanogramActions` and `ProcessedPlanogram` outputs.

## Key Principles

- **Zero React Dependency**: Pure TypeScript library.
- **Deterministic**: Given the same input and processor, it always produces the same output.
- **Intent-Driven**: Focuses on *what* should happen (e.g., "place this product after that one") rather than *how* (e.g., calculating x/y coordinates).
- **Single Source of Truth**: Delegates all business rules and physics to the `ICoreProcessor`.

## Installation

```json
{
  "dependencies": {
    "@vst/fluent": "workspace:*",
    "@vst/vocabulary-types": "workspace:*",
    "@vst/vocabulary-actions": "workspace:*"
  }
}
```

## Usage

### Basic Headless Generation

```ts
import { PlanogramBuilder } from "@vst/fluent";
import { CoreProcessor } from "@vst/core-processor-impl";

const builder = new PlanogramBuilder(initialConfig, productMetadata, {
  processor: new CoreProcessor(),
  strict: true
});

const result = builder
  .addShelf({ baseHeight: 300 })
  .addShelf({ baseHeight: 600 })
  .addProduct("SKU_123")
    .withFacings({ horizontal: 2, vertical: 1 })
    .commit()
  .addProduct("SKU_456")
    .commit() // Automatically finds next available space via Processor
  .build();

console.log(result.renderInstances.length);
```

### Validation & Strict Mode

The builder can be run in `strict` mode, which will throw an `InvalidIntentError` the moment an action violates business rules (e.g., placing a product where it doesn't fit).

```ts
try {
  builder.moveProduct("ID_1", { model: "shelf-surface", shelfIndex: 99, x: 0 });
} catch (e) {
  // Throws if shelf 99 doesn't exist or is blocked
}
```

## API Reference

### `PlanogramBuilder`

- `addProduct(sku: string): ProductIntentBuilder`: Start adding a product.
- `removeProduct(id: string): this`: Remove a product instance.
- `moveProduct(id: string, to: SemanticPosition): this`: Move a product instance.
- `addShelf(config?: Partial<ShelfConfig>): this`: Add a new shelf.
- `removeShelf(index: ShelfIndex): this`: Remove a shelf.
- `validate(): ValidationResult`: Check if the current state is valid.
- `build(): ProcessedPlanogram`: Finalize intent and project the L4 state.
- `snapshot(): IPlanogramSnapshot`: Get the L4 state and the derived L1 config.

### `ProductIntentBuilder`

- `withFacings(config: FacingConfig): this`: Set horizontal/vertical facings.
- `at(position: SemanticPosition): this`: Set a specific position.
- `withId(id: string): this`: Set a specific product ID.
- `commit(): PlanogramBuilder`: Finalize the product intent and return to the main builder.

## Relationship to Architecture

`@vst/fluent` sits as a sibling to `@vst/session`. While the Session is used for **interactive** workflows (undo/redo, transient states), the Fluent Builder is used for **programmatic** workflows. Both rely on the `CoreProcessor` for the underlying logic.