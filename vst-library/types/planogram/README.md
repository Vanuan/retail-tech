# Planogram Domain

This module contains the high-level business entities for the planogram system.

## Contents

- **config.ts**: `PlanogramConfig` and `FixtureConfig` - the primary input types.
- **product.ts**: `SourceProduct` and `ProductPlacement` definitions.
- **metadata.ts**: `ProductMetadata` - rich catalog data for products.
- **placement.ts**: `FacingConfig` and `PyramidConfig` for repetition logic.

## Usage

These types are primarily used at the edges of the system (API inputs, database storage) and as the foundation for the core processing pipeline.
