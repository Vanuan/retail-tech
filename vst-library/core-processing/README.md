# Core Processing

The Core Processing module is the brain of the VST library. It is responsible for the transformation of "Semantic Data" (User Intent) into "Render Data" (Screen Ready).

## Responsibility

It bridges the gap between Layer 1 (Data) and Layer 4 (Render) by executing a pipeline of logical operations:

1.  **Enrichment**: Merging raw planogram placements with rich product metadata from the Data Access Layer.
2.  **Expansion**: Calculating positions for repeated items (facings) and stacked groups (pyramids).
3.  **Transformation**: Applying `PlacementModels` to convert semantic coordinates (e.g., Shelf 1, Position 200mm) into World Space (Vector3).
4.  **Scaling**: Applying depth-based scaling and perspective logic.
5.  **Ordering**: Calculating Z-indices to ensure correct visual overlap (Painter's Algorithm).

## Key Components

### CoreLayerProcessor (`CoreLayerProcessor.ts`)

The primary entry point. It orchestrates a decoupled transformation pipeline where individual processors (Scaling, Z-Layering, Positioning) operate on `RenderInstance` templates.

```typescript
import { CoreLayerProcessor } from '@vst/core-processing';
import { PlacementModelRegistry } from '@vst/data-access';

// Typically initialized within CompleteSystem or with DAL components
const processor = new CoreLayerProcessor(
  dal.fixtures,
  new PlacementModelRegistry(),
  dal.products
);

const result = await processor.processPlanogram(planogramConfig);
// result.renderInstances is now ready for the Renderer
```

### CoreProcessor (`CoreProcessor.ts`)

A legacy or higher-level orchestrator that provides a simplified API for synchronous and asynchronous processing by wrapping the DAL.

### Transformation Logic

The processor relies on `IPlacementModel` implementations to handle the specific geometry of different fixtures.

- **Shelf Surface**: Calculates X/Y based on shelf height and product width.
- **Pegboard**: Calculates grid positions.

### Z-Layering

A critical part of the core logic is determining the draw order. The processor assigns a `zIndex` to every instance based on:
1.  **Shelf Level**: Higher shelves are drawn last (on top).
2.  **Depth**: Front items are drawn last.
3.  **Horizontal Position**: Logic varies by angle, but typically left-to-right.

## Performance

The core processor is designed to be:
- **Stateless**: It takes input and produces output without side effects.
- **Fast**: Suitable for real-time execution during drag-and-drop operations (using `processSync`).
- **Isomorphic**: Can run in the main thread, a Web Worker, or on the Server (Node.js).