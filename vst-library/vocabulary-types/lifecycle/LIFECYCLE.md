# Data Lifecycle Pipeline

The VST library processes data through four distinct layers, moving from abstract "Retail Truth" to concrete "Pixel Truth".

## The Four Layers

1.  **L1: Input (PlanogramConfig)**: The raw data from the backend or user.
2.  **L2: Validation (ValidationResult)**: Ensuring the data is structurally sound.
3.  **L3: Enrichment (EnrichedProduct)**: Merging source data with catalog metadata.
4.  **L4: Render (RenderInstance)**: The final, engine-ready representation.

## Why Separate?

Separating these layers allows different parts of the system to focus on specific concerns. The backend only cares about L1, the core processor handles the transformation L1 → L4, and the renderer only cares about L4.
