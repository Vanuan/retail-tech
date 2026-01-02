# Rendering Layer

This module defines the contracts for the drawing engine and the fully-processed data structures it consumes.

## Contents

- **instance.ts**: `RenderInstance` - the "L4" data structure ready for rendering.
- **properties.ts**: Visual properties like shadows, masks, and Z-layering.
- **engine.ts**: `Viewport`, `ProcessedPlanogram`, and engine results.
- **subsystems.ts**: Interfaces for the various renderer components (HitTester, SpriteRenderer, etc.).
- **interaction.ts**: Types for editor state and interaction.

## Data Flow

The `RenderInstance` is created by the core processor (L1 → L4) and contains pre-calculated screen coordinates, scales, and draw order, allowing the renderer to remain "dumb" and platform-agnostic.
