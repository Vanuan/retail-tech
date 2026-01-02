# @vst/types

Core TypeScript definitions for the Virtual Store Technology (VST) library. This package provides the "Common Language" used by the Backend, Core Processor, Renderer, and UI Editor.

## 📦 Installation

```bash
npm install @vst/types
```

## 🚀 Quick Start

### Creating a Planogram (L1)

```typescript
import { PlanogramConfig, createShelfSurfacePosition } from '@vst/types';

const planogram: PlanogramConfig = {
  fixture: {
    type: 'gondola',
    placementModel: 'shelf-surface',
    dimensions: { width: 1200, height: 1800, depth: 400 },
    config: {
      shelves: [
        { index: 0, baseHeight: 100, width: 1200, depth: 400 },
        { index: 1, baseHeight: 500, width: 1200, depth: 400 },
        { index: 2, baseHeight: 900, width: 1200, depth: 400 }
      ],
      depthSpacing: 300
    }
  },
  products: [
    {
      id: 'instance-1',
      sku: 'COKE-001',
      placement: {
        position: createShelfSurfacePosition({ x: 150, shelfIndex: 1, depth: 0 }),
        facings: { horizontal: 3, vertical: 1, total: 3 }
      }
    }
  ]
};
```

### Processing for Display (L1 → L4)

```typescript
import { CoreProcessor } from '@vst/core'; // Implementation
import { ProcessedPlanogram } from '@vst/types';

const processor = new CoreProcessor();
const processed: ProcessedPlanogram = await processor.process(planogram);
```

## 🎯 Core Concepts

### Three Critical Concepts

#### 1. Semantic Coordinates: The "Retail Truth"
How merchandisers think. Position is relative to logical structures (shelves, grids).
```typescript
// Shelf Surface
{ model: 'shelf-surface', x: 200, shelfIndex: 2, depth: 0 }

// Pegboard
{ model: 'pegboard-grid', holeX: 5, holeY: 10, gridSpacing: 25.4 }
```

#### 2. Four-Layer Pipeline
Data flows through four distinct stages:
1.  **L1 Input**: User intent (Source Product).
2.  **L2 Validation**: Structural integrity check.
3.  **L3 Enrichment**: Catalog data merge (Dimensions, Assets).
4.  **L4 Render**: Fully computed screen-ready data (RenderInstance).

#### 3. Placement Models
Translation strategies that convert "Retail Truth" (Semantic) into "Physical Truth" (3D World Space).

## 🤔 Decision Trees

### "Which coordinate type do I need?"
- **Am I saving data to the database?** → Use `SemanticPosition` (L1).
- **Am I checking if a product fits on a shelf?** → Use `SemanticPosition` + `Dimensions3D`.
- **Am I drawing pixels to the screen?** → Use `RenderCoordinates` (L4).
- **Am I calculating 3D collisions?** → Use `Vector3` (World Space).

### "Which lifecycle type do I need?"
- **I'm building an API endpoint to save planograms.** → `PlanogramConfig` (L1).
- **I'm writing a validation rule.** → `ValidationResult` (L2).
- **I'm fetching product details.** → `EnrichedProduct` (L3).
- **I'm rendering the canvas.** → `RenderInstance` (L4).

### "Which placement model should I use?"
- **Standard grocery shelves?** → `shelf-surface`
- **Hanging products (tools, candy bags)?** → `pegboard-grid`
- **Dump bins or baskets?** → `basket-bin`
- **Mannequins or complex displays?** → `freeform-3d`

## 💡 Usage Examples

### Example 1: Backend - Store a Planogram
```typescript
import { Backend } from '@vst/types';

async function savePlanogram(id: string, config: Backend.PlanogramConfig) {
  // Backend only needs L1 types
  await db.planograms.set(id, {
    id,
    config,
    created: new Date()
  });
}
```

### Example 2: Core Processor - Transform L1 → L4
```typescript
import { Processor } from '@vst/types';

async function processPlanogram(config: Processor.PlanogramConfig): Promise<Processor.ProcessedPlanogram> {
  const processor = new CoreProcessor(); // Implementation
  // Returns fully calculated L4 instances
  return await processor.execute(config);
}
```

### Example 3: Renderer - Draw to Canvas
```typescript
import { Renderer } from '@vst/types';

function renderFrame(context: CanvasRenderingContext2D, instances: Renderer.RenderInstance[]) {
  // Sort by calculated Z-index
  const sorted = instances.sort((a, b) => a.zIndex - b.zIndex);

  for (const instance of sorted) {
    const { x, y, width, height } = instance.renderCoordinates;
    const sprite = instance.assets.spriteVariants[0];
    
    // Renderer is "dumb" - just draws what it's told
    context.drawImage(sprite.image, x, y, width, height);
  }
}
```

### Example 4: UI Editor - Handle User Interaction
```typescript
import { Editor } from '@vst/types';

function handleDrag(
  instance: Editor.RenderInstance, 
  deltaX: number
): Editor.ValidationResult {
  // UI needs to understand both Render (interaction) and Semantic (logic) types
  const newX = instance.semanticCoordinates.x + deltaX;
  
  // Validate against business rules
  if (newX < 0) return { valid: false, errors: ['Off shelf'] };
  
  return { valid: true, errors: [] };
}
```

## 🔑 Key Interfaces

### SemanticPosition (Discriminated Union)
```typescript
type SemanticPosition = 
  | ShelfSurfacePosition 
  | PegboardGridPosition 
  | Freeform3DPosition 
  | BasketBinPosition;
```

### PlanogramConfig (L1)
The root input object.
```typescript
interface PlanogramConfig {
  fixture: FixtureConfig;
  products: SourceProduct[];
}
```

### RenderInstance (L4)
The final output object.
```typescript
interface RenderInstance {
  id: string;
  renderCoordinates: RenderCoordinates; // Pixels
  zIndex: number;
  assets: { sprite: string; mask: string };
  // ... plus original source data
}
```

## 🎨 Type-Safe Units

We use "branded types" to prevent unit conversion errors.

```typescript
import { Millimeters, Pixels } from '@vst/types/core';

const width: Millimeters = 100 as Millimeters;
const screenWidth: Pixels = 100 as Pixels;

// ❌ Error: Type 'Pixels' is not assignable to type 'Millimeters'
const physicalWidth: Millimeters = screenWidth; 
```

## 🏗️ Design Principles

1.  **Separation of Concerns**: L1 (Intent) is distinct from L4 (Render). The backend never needs to know about pixels.
2.  **Type Safety First**: Discriminated unions and branded types catch errors at compile time.
3.  **Explicit Over Implicit**: "Magic numbers" are replaced by explicit semantic fields (`shelfIndex`, `depth`).
4.  **Portability**: The core logic is pure TypeScript, runnable in Node.js (Backend), Browser (UI), or Web Worker (Processor).

## 📚 Documentation Links

- [CONCEPTS.md](./CONCEPTS.md) - Deep dive into coordinate systems.
- [GLOSSARY.md](./GLOSSARY.md) - Definitions of terms.
- [coordinates/README.md](./coordinates/README.md) - Coordinate system details.
- [placement-models/README.md](./placement-models/README.md) - How to choose a model.

## 🗂️ Package Structure

```
vst-library/types/
├── core/               # Units (mm, px) and geometry primitives
├── coordinates/        # Semantic positions and render coordinates
├── planogram/          # Business domain (products, fixtures, config)
├── lifecycle/          # L1-L4 pipeline stage definitions
├── rendering/          # Renderer layer contracts and instances
├── placement-models/   # Translation strategy interfaces
├── repositories/       # Data access and persistence interfaces
└── exports/            # Consumer-specific bundles
```
