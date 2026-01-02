# Placement Models

Placement models are the "translation strategies" of the VST library. They define how semantic retail coordinates (like "Shelf 3, 200mm from left") are converted into physical 3D coordinates (X, Y, Z in millimeters) relative to a fixture.

## Core Interface

Every placement model must implement the `IPlacementModel` interface:

- **transform()**: The core logic that performs the coordinate translation.
- **properties**: Metadata about what the model supports (facings, shelves, etc.).

## Standard Models

1. **Shelf Surface**: The most common model. Products are placed on flat horizontal surfaces.
2. **Pegboard Grid**: Products hang from hooks on a discrete grid of holes.
3. **Freeform 3D**: Direct XYZ positioning for complex, irregular displays.
4. **Basket/Bin**: Products are contained within bounded volumes.
