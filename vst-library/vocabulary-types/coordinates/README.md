# Coordinate Systems

This module defines how objects are positioned in both physical retail space and screen space.

## Semantic Coordinates (`semantic.ts`)

The "Retail Truth". These use discriminated unions to handle different fixture types:

- **Shelf Surface**: Continuous X position across discrete shelves.
- **Pegboard Grid**: Discrete hole coordinates (e.g., Column 5, Row 10).
- **Freeform 3D**: Absolute XYZ coordinates for total flexibility.
- **Basket/Bin**: Slot-based positioning within containers.

## Render Coordinates (`render.ts`)

Screen-space values (pixels) used by the renderer. These include:
- Scaled dimensions
- Rotation
- Z-index layer information
- Anchor points for sprites

## Key Types

- `SemanticPosition`: Union of all retail positioning models.
- `RenderCoordinates`: Flat structure for the drawing engine.
- `FacingConfig`: Repetition rules for products (facings).
