# Core Primitives

This module contains the fundamental building blocks used across the VST library.

## Contents

- **geometry.ts**: Basic math types like `Vector2`, `Vector3`, and `Bounds`.
- **dimensions.ts**: Size definitions (`Dimensions3D`, `VisualDimensions`).
- **units.ts**: Type-safe branded units for Millimeters, Pixels, Degrees, etc.

## Principles

1. **Unit Safety**: Use branded types for physical measurements to avoid mixing millimeters and pixels.
2. **Generic Primitives**: Keep geometry types generic; apply units where they are used in domain models.
