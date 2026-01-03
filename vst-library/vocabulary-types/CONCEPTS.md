# VST Core Concepts

**A visual guide to understanding how the Virtual Store Technology system works.**

This document explains the fundamental architecture and data flow with diagrams, examples, and step-by-step transformations.

---

## Table of Contents

1. [The Big Picture](#the-big-picture)
2. [Three Coordinate Spaces](#three-coordinate-spaces)
3. [The Four-Layer Pipeline](#the-four-layer-pipeline)
4. [Placement Models Explained](#placement-models-explained)
5. [Processing Pipeline Details](#processing-pipeline-details)
6. [Consumer Perspectives](#consumer-perspectives)
7. [Best Practices](#best-practices)

---

## The Big Picture

### What Problem Does VST Solve?

**Problem:** How do you represent where products are in a retail space in a way that:
- Works across different rendering engines (Canvas2D, WebGL, Three.js)
- Can be validated against physical constraints
- Can be stored efficiently in a database
- Can be edited by merchandisers without knowing code

**Solution:** Separate "retail truth" (semantic coordinates) from "rendering truth" (screen pixels).

### The Complete Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    👤 USER (Merchandiser)                        │
│              "Put 3 Cokes on shelf 2, near the left"            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    User creates/edits in UI
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 📄 L1: INPUT DATA (PlanogramConfig)                             │
│                                                                  │
│ Stored in: Database (PostgreSQL, MongoDB, etc.)                 │
│ Format: JSON                                                     │
│ Size: ~5KB for 50 products                                      │
│                                                                  │
│ {                                                                │
│   fixture: {                                                     │
│     type: 'shelf',                                              │
│     placementModel: 'shelf-surface',                            │
│     dimensions: { width: 1200, height: 1800, depth: 400 }      │
│   },                                                             │
│   products: [{                                                   │
│     id: 'p1',                                                    │
│     sku: 'COKE-001',                                            │
│     placement: {                                                │
│       position: {                                               │
│         model: 'shelf-surface',                                 │
│         x: 210,              // mm from left edge               │
│         shelfIndex: 2,       // 3rd shelf from bottom           │
│         depth: 0             // front row                       │
│       },                                                         │
│       facings: { horizontal: 3, vertical: 1 }                   │
│     }                                                            │
│   }]                                                             │
│ }                                                                │
│                                                                  │
│ Key: Semantic coordinates (retail truth in millimeters)         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    System loads for display
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ ✅ L2: VALIDATION                                                │
│                                                                  │
│ Validator checks:                                                │
│ • Is x within fixture bounds?                                   │
│   ✓ 0 ≤ 210 ≤ 1200 (valid)                                     │
│                                                                  │
│ • Does shelfIndex exist?                                        │
│   ✓ Fixture has 3 shelves (0, 1, 2)                            │
│                                                                  │
│ • Does product fit with facings?                                │
│   Product width: 80mm                                            │
│   Total width: 80 × 3 = 240mm                                   │
│   End position: 210 + 240 = 450mm                               │
│   ✓ 450 ≤ 1200 (fits)                                           │
│                                                                  │
│ • Any collisions with other products?                            │
│   ✓ No products at shelf 2, x: 210-450                         │
│                                                                  │
│ Result: ValidationResult { valid: true, errors: [] }            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    Validation passed
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 🔍 L3: ENRICHMENT                                                │
│                                                                  │
│ Data Access Layer fetches from database:                        │
│                                                                  │
│ ProductRepository.getBySku('COKE-001'):                         │
│ {                                                                │
│   sku: 'COKE-001',                                              │
│   name: 'Coca-Cola Classic 12oz Can',                          │
│   dimensions: {                                                  │
│     physical: { width: 80, height: 250, depth: 80 }            │
│     visual: { width: 85, height: 260, anchor: {x: 0.5, y: 1} } │
│   },                                                             │
│   visualProperties: {                                            │
│     spriteVariants: [                                            │
│       { angle: 0, url: 'cdn.../coke-front.png' },              │
│       { angle: 90, url: 'cdn.../coke-side.png' }               │
│     ],                                                           │
│     maskUrl: 'cdn.../coke-mask.png',                           │
│     hasTransparency: true                                        │
│   },                                                             │
│   pricing: { unitPrice: 1.99 }                                  │
│ }                                                                │
│                                                                  │
│ Result: EnrichedProduct (L1 + metadata)                         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    Metadata attached
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ ⚙️ L4: CORE PROCESSING (The "Magic" Happens Here)               │
│                                                                  │
│ Core Processor executes 7 steps:                                │
│                                                                  │
│ STEP 1: FACING EXPANSION                                         │
│ Input: 1 SourceProduct with facings: { horizontal: 3 }          │
│ Output: 3 RenderInstance objects                                 │
│                                                                  │
│   Instance 0: { facing: 0, expansionOffset: { x: 0 } }         │
│   Instance 1: { facing: 1, expansionOffset: { x: 80 } }        │
│   Instance 2: { facing: 2, expansionOffset: { x: 160 } }       │
│                                                                  │
│ STEP 2: PLACEMENT MODEL TRANSFORM                                │
│ ShelfSurfaceModel.transform(position, fixture):                 │
│   Input (semantic): { x: 210, shelfIndex: 2, depth: 0 }        │
│   Shelf config: shelf[2] = { baseHeight: 900mm }               │
│   Depth config: depthSpacing = 300mm                            │
│   Output (world): { x: 210, y: 900, z: 0 } (mm in 3D space)   │
│                                                                  │
│ STEP 3: DEPTH SCALING                                            │
│   Depth 0 (front row): scale = 1.0 (100%)                       │
│   Depth 1+ (back rows): scale = 0.92 (92%)                      │
│   This instance: depth = 0, so scale = 1.0                      │
│                                                                  │
│ STEP 4: Z-INDEX CALCULATION (Draw Order)                         │
│   Formula: baseZ + (shelf × 100) + facing - (depth × 100)      │
│   Instance 0: 1000 + (2×100) + 0 - (0×100) = 1200              │
│   Instance 1: 1000 + (2×100) + 1 - (0×100) = 1201              │
│   Instance 2: 1000 + (2×100) + 2 - (0×100) = 1202              │
│   (Lower z = drawn first = appears behind)                       │
│                                                                  │
│ STEP 5: RENDER COORDINATES (World mm → Screen pixels)           │
│   Viewport zoom: 2.0x                                            │
│   Instance 0:                                                    │
│     renderX = (210 + 0) × 2.0 = 420px                           │
│     renderY = 900 × 2.0 = 1800px                                │
│     width = 80 × 1.0 × 2.0 = 160px                             │
│     height = 250 × 1.0 × 2.0 = 500px                           │
│                                                                  │
│ STEP 6: BOUNDING BOX CALCULATION                                 │
│   renderBounds: { x: 420, y: 1800, width: 160, height: 500 }   │
│   collisionBounds: (same, used for mouse hit testing)           │
│                                                                  │
│ STEP 7: VISUAL PROPERTIES                                        │
│   depthVisualization: {                                          │
│     isFrontRow: true, category: 'front', scale: 100            │
│   }                                                              │
│   shadowProperties: {                                            │
│     enabled: true, type: 'standard', intensity: 0.3            │
│   }                                                              │
│   maskProperties: {                                              │
│     required: true, maskUrl: 'cdn.../coke-mask.png'           │
│   }                                                              │
│                                                                  │
│ Result: RenderInstance[] (fully calculated, ready to draw)      │
│ Memory: ~50KB for 3 instances                                    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    Send to renderer
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 🎨 RENDERER (Canvas2D / WebGL / Three.js)                       │
│                                                                  │
│ Rendering loop:                                                  │
│                                                                  │
│ 1. Sort instances by zIndex (1200, 1201, 1202)                 │
│                                                                  │
│ 2. For each instance (in z-order):                              │
│                                                                  │
│    a. Draw shadow                                                │
│       ctx.shadowColor = 'rgba(0,0,0,0.3)'                      │
│       ctx.shadowBlur = 8                                         │
│       ctx.shadowOffsetY = 4                                      │
│                                                                  │
│    b. Apply mask (if required)                                   │
│       Load mask image                                            │
│       Set composite operation: 'destination-in'                  │
│                                                                  │
│    c. Draw sprite                                                │
│       Select angle: 0° (front view)                             │
│       ctx.drawImage(sprite, 420, 1800, 160, 500)               │
│                                                                  │
│    d. Apply depth effects                                        │
│       (For back rows: scale to 92%, adjust brightness)          │
│                                                                  │
│ 3. Draw overlays (selection, hover, collision warnings)         │
│                                                                  │
│ Output: Visual planogram on screen                               │
│ Frame time: ~16ms (60 FPS)                                       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    User sees result
                              ↓
                    👤 USER sees planogram
```

---

## Three Coordinate Spaces

The system uses three different coordinate systems for different purposes. Understanding when to use each is crucial.

### 1. Retail Space (Semantic Coordinates)

**Purpose:** Describe where products are in retail terms  
**Units:** Millimeters, shelf indices, depth levels  
**Use when:** Storing data, validating placements, business logic  
**Storage:** Database, JSON files (persistent)

```typescript
// Shelf Surface Model
{
  model: 'shelf-surface',
  x: 210,              // 210mm from fixture left edge
  shelfIndex: 2,       // 3rd shelf from bottom (0-indexed)
  depth: 0             // Front row
}

// Pegboard Model
{
  model: 'pegboard-grid',
  holeX: 8,           // 8th hole from left
  holeY: 12,          // 12th hole from bottom
  gridSpacing: 25.4   // 1-inch standard
}
```

**Visual Representation:**

```
Fixture (1200mm wide × 1800mm tall)
┌────────────────────────────────────────┐
│ Shelf 2 (900mm from floor)             │
│ ├──────────────────────────────────┐   │
│ │                                  │   │
│ │  [Product]                       │   │
│ │   ↑                              │   │
│ │   └─ x: 210mm from left edge     │   │
│ │      depth: 0 (front row)        │   │
│ └──────────────────────────────────┘   │
│ Shelf 1 (450mm from floor)             │
│ ├──────────────────────────────────┐   │
│ └──────────────────────────────────┘   │
│ Shelf 0 (0mm from floor)               │
│ ├──────────────────────────────────┐   │
│ └──────────────────────────────────┘   │
└────────────────────────────────────────┘
```

### 2. World Space (3D Coordinates)

**Purpose:** Physics simulation, 3D rendering, spatial relationships  
**Units:** Millimeters in 3D coordinate system  
**Use when:** Processing, placement model transforms  
**Storage:** Ephemeral (computed at runtime)

```typescript
{
  x: 210,    // 210mm from fixture left (same as semantic)
  y: 900,    // 900mm from floor (computed from shelfIndex)
  z: 0       // 0mm from front (computed from depth)
}
```

**Visual Representation:**

```
3D World Space (side view)
        Y (height)
        ↑
        │
 1800mm │     Top of fixture
        │
        │
  900mm │ ════════════════ Shelf 2 (y: 900)
        │     [Product] ← z: 0 (front edge)
        │
  450mm │ ════════════════ Shelf 1 (y: 450)
        │
    0mm └─────────────────────────────→ Z (depth)
       Floor              0mm  300mm  600mm
                        front middle back
```

### 3. Screen Space (Render Coordinates)

**Purpose:** Drawing to canvas, hit testing, UI interactions  
**Units:** Pixels  
**Use when:** Rendering, mouse events, visual effects  
**Storage:** Ephemeral (recomputed on zoom/pan)

```typescript
{
  x: 420,              // 420 pixels from canvas left
  y: 1800,             // 1800 pixels from canvas top
  width: 160,          // 160 pixels wide
  height: 500,         // 500 pixels tall
  scale: 1.0,          // 100% size (front row)
  rotation: 0          // No rotation
}
```

**Visual Representation:**

```
Canvas (1920px × 1080px)
┌────────────────────────────────────────────────┐
│ (0, 0)                                         │
│                                                │
│                        [Product Image]         │
│                         160px × 500px          │
│                         at (420px, 1800px)     │
│                                                │
│                                                │
│                                         (1920, │
└───────────────────────────────────────────1080)┘
```

### Transformation Between Spaces

```
SEMANTIC (retail)  →  WORLD (3D)  →  RENDER (screen)
     ↓                    ↓              ↓
{ x: 210,           { x: 210,      { x: 420,
  shelfIndex: 2,      y: 900,        y: 1800,
  depth: 0 }          z: 0 }         width: 160 }
     ↓                    ↓              ↓
Placement Model     Viewport        Canvas API
  .transform()        Transform       .drawImage()
```

**Example Transformation:**

```typescript
// STEP 1: Semantic → World (Placement Model)
const semantic = { model: 'shelf-surface', x: 210, shelfIndex: 2, depth: 0 };
const world = placementModel.transform(semantic, fixture);
// Result: { x: 210, y: 900, z: 0 }

// STEP 2: World → Render (Viewport Transform)
const zoom = 2.0;
const render = {
  x: world.x * zoom,              // 210 × 2.0 = 420px
  y: world.y * zoom,              // 900 × 2.0 = 1800px
  width: metadata.width * zoom,   // 80 × 2.0 = 160px
  height: metadata.height * zoom  // 250 × 2.0 = 500px
};
```

---

## The Four-Layer Pipeline

Each layer serves a distinct purpose in the data transformation pipeline.

### L1: Input Data (The Intent)

**What it is:** The merchandiser's intent - what products should be where  
**Type:** `PlanogramConfig`  
**Stored:** Yes (database, JSON files)  
**Size:** Small (~5KB for 50 products)

```typescript
// L1 Example
{
  fixture: {
    type: 'shelf',
    placementModel: 'shelf-surface',
    dimensions: { width: 1200, height: 1800, depth: 400 }
  },
  products: [
    {
      id: 'p1',
      sku: 'COKE-001',
      placement: {
        position: { model: 'shelf-surface', x: 210, shelfIndex: 2, depth: 0 },
        facings: { horizontal: 3, vertical: 1 }
      }
    }
  ]
}
```

**Key characteristics:**
- ✅ Human-readable and editable
- ✅ Compact and efficient to store
- ✅ Device-independent (works on any screen)
- ✅ Validatable against physical constraints

### L2: Validation (The Reality Check)

**What it is:** Physical constraint checking  
**Type:** `ValidationResult`  
**Stored:** No (ephemeral)

```typescript
// L2 Example
{
  valid: true,
  errors: [],
  warnings: ['Product near edge'],
  canRender: true
}
```

**Validation checks:**

1. **Bounds checking**
   ```
   Is x within fixture? → 0 ≤ 210 ≤ 1200 ✓
   Is shelfIndex valid? → shelfIndex < shelves.length ✓
   ```

2. **Collision detection**
   ```
   Product occupies: x: 210 to 450 (210 + 80×3)
   Do other products overlap? → Check all products ✓
   ```

3. **Physical constraints**
   ```
   Does product fit on shelf? → 240mm ≤ 1200mm ✓
   Is shelf depth sufficient? → 80mm ≤ 400mm ✓
   ```

### L3: Enrichment (Adding Details)

**What it is:** L1 data combined with product metadata  
**Type:** `EnrichedProduct`  
**Stored:** No (fetched from database at runtime)

```typescript
// L3 Example
{
  // Original L1 data
  sourceProduct: {
    sku: 'COKE-001',
    placement: { /* ... */ }
  },
  
  // Enriched metadata from database
  metadata: {
    dimensions: {
      physical: { width: 80, height: 250, depth: 80 },
      visual: { width: 85, height: 260, anchor: { x: 0.5, y: 1 } }
    },
    visualProperties: {
      spriteVariants: [
        { angle: 0, url: 'cdn.../coke-front.png' }
      ],
      maskUrl: 'cdn.../coke-mask.png'
    },
    pricing: { unitPrice: 1.99 }
  }
}
```

**Why separate from L1?**
- Product metadata changes independently (price updates, new images)
- L1 remains lightweight and cacheable
- Single source of truth for product data

### L4: Render Ready (Fully Computed)

**What it is:** Everything needed to draw the product  
**Type:** `RenderInstance`  
**Stored:** No (computed on demand)  
**Size:** Large (~50KB for 3 instances)

```typescript
// L4 Example (simplified)
{
  // Identity
  id: 'COKE-001-0',
  sku: 'COKE-001',
  
  // Original data preserved
  sourceData: { /* L1 SourceProduct */ },
  metadata: { /* L3 ProductMetadata */ },
  semanticPosition: { model: 'shelf-surface', x: 210, shelfIndex: 2, depth: 0 },
  
  // Computed for rendering
  renderCoordinates: { x: 420, y: 1800, width: 160, height: 500, scale: 1.0 },
  renderBounds: { x: 420, y: 1800, width: 160, height: 500 },
  zIndex: 1200,
  
  // Visual effects computed
  depthVisualization: { isFrontRow: true, category: 'front', scale: 100 },
  shadowProperties: { enabled: true, type: 'standard', intensity: 0.3 },
  maskProperties: { required: true, maskUrl: 'cdn.../coke-mask.png' },
  
  // Assets resolved
  assets: {
    spriteVariants: [{ angle: 0, url: 'cdn.../coke-front.png' }],
    maskUrl: 'cdn.../coke-mask.png'
  }
}
```

**Why compute at runtime?**
- Depends on viewport (zoom, pan)
- Contains redundant calculated data
- 10x larger than L1
- Changes frequently (on every zoom/pan)

### Layer Comparison Table

| Aspect | L1 Input | L2 Validation | L3 Enrichment | L4 Render |
|--------|----------|---------------|---------------|-----------|
| **Stored** | ✅ Yes | ❌ No | ❌ No | ❌ No |
| **Size** | Small (~5KB) | Tiny (~1KB) | Medium (~10KB) | Large (~50KB) |
| **Coordinates** | Semantic (mm) | N/A | Semantic (mm) | Render (px) |
| **Purpose** | Business intent | Constraint check | Add metadata | Ready to draw |
| **Lifespan** | Permanent | Transient | Transient | Ephemeral |
| **Changes when** | User edits | On validation | On fetch | On zoom/pan |

---

## Placement Models Explained

A **placement model** is a translation strategy that converts semantic coordinates into 3D world coordinates.

### The Concept

```
┌─────────────────────────────────┐
│ Semantic Position               │
│ (Retail Language)               │
│ "Shelf 2, 210mm from left"      │
└─────────────────────────────────┘
              ↓
     [Placement Model Transform]
              ↓
┌─────────────────────────────────┐
│ World Position (3D Space)       │
│ (x: 210mm, y: 900mm, z: 0mm)   │
└─────────────────────────────────┘
```

### Why Different Models?

Different fixtures organize products differently:

| Fixture Type | Organization | Best Model |
|-------------|--------------|------------|
| Grocery shelf | Continuous horizontal, discrete vertical | Shelf Surface |
| Tool wall | Grid of holes | Pegboard Grid |
| Floor bin | Container slots | Basket/Bin |
| Custom display | Free placement | Freeform 3D |

### Shelf Surface Model in Detail

**Concept:** Products rest on horizontal shelves, can be placed at any X position.

```
Fixture View (front):
┌────────────────────────────────────────┐
│ Shelf 2 (y: 900mm)                     │
│ ════════════════════════════════════   │
│      [A]  [B]  [C]                     │
│       ↑    ↑    ↑                      │
│      210  290  370 (x in mm)           │
│                                        │
│ Shelf 1 (y: 450mm)                     │
│ ════════════════════════════════════   │
│      [D]  [E]                          │
│                                        │
│ Shelf 0 (y: 0mm)                       │
│ ════════════════════════════════════   │
│      [F]  [G]  [H]  [I]                │
└────────────────────────────────────────┘
```

**Transform Logic:**

```typescript
class ShelfSurfaceModel implements IPlacementModel {
  transform(position: ShelfSurfacePosition, fixture: FixtureConfig): Vector3 {
    // X: Direct mapping (continuous positioning)
    const x = position.x;
    
    // Y: Look up shelf configuration
    const shelf = fixture.config.shelves[position.shelfIndex];
    const y = shelf.baseHeight + (position.yOffset ?? 0);
    
    // Z: Multiply depth by spacing
    const z = position.depth * fixture.config.depthSpacing;
    
    return { x, y, z };
  }
}
```

**Example:**

```typescript
// Input (semantic)
const position = {
  model: 'shelf-surface',
  x: 210,
  shelfIndex: 2,
  depth: 0
};

const fixture = {
  config: {
    shelves: [
      { index: 0, baseHeight: 0 },
      { index: 1, baseHeight: 450 },
      { index: 2, baseHeight: 900 }
    ],
    depthSpacing: 300
  }
};

// Transform
const world = model.transform(position, fixture);
// Output: { x: 210, y: 900, z: 0 }
```

### Pegboard Grid Model in Detail

**Concept:** Products hang on pegs inserted into a grid of holes.

```
Pegboard View (front):
┌────────────────────────────────────────┐
│ • • • • • • • • • • • • • • • • (holeY: 12)
│ • • • • • • • • • • • • • • • •
│ • • • • • • • • • • • • • • • •
│ • • • • • • • • [Product A]
│ • • • • • • • • • on peg at
│ • • • • • • • • • (holeX: 8, holeY: 10)
│ • • • • • • • • • •
│ • • • • • • • • • •
│ • • [Product B] •
│ • • at (3, 4)
│ (holeY: 0) • • • • • • • • • • •
└────────────────────────────────────────┘
  ↑
 holeX: 0
```

**Transform Logic:**

```typescript
class PegboardGridModel implements IPlacementModel {
  transform(position: PegboardGridPosition, fixture: FixtureConfig): Vector3 {
    const gridSpacing = position.gridSpacing ?? 25.4; // 1-inch default
    
    return {
      x: position.holeX * gridSpacing,
      y: position.holeY * gridSpacing,
      z: 0  // Pegboards are typically single-depth
    };
  }
}
```

**Example:**

```typescript
// Input (semantic)
const position = {
  model: 'pegboard-grid',
  holeX: 8,
  holeY: 10,
  gridSpacing: 25.4
};

// Transform
const world = model.transform(position, fixture);
// Output: { x: 203.2, y: 254, z: 0 }
//         (8 × 25.4 = 203.2mm, 10 × 25.4 = 254mm)
```

---

## Processing Pipeline Details

### Step-by-Step: Facing Expansion

**Input:** 1 SourceProduct with 3 horizontal facings  
**Output:** 3 RenderInstances

```
Before Expansion (L1):
┌─────────────────────────────────┐
│ SourceProduct                   │
│ {                               │
│   sku: 'COKE-001',              │
│   placement: {                  │
│     position: { x: 210, ... },  │
│     facings: { horizontal: 3 }  │
│   }                             │
│ }                               │
└─────────────────────────────────┘
              ↓
      [Expansion Logic]
              ↓
After Expansion (L4):
┌─────────────────────────────────┐
│ RenderInstance #0               │
│ { facing: 0,                    │
│   expansionOffset: { x: 0 } }   │
│            [Product]            │
│             at x: 210           │
└─────────────────────────────────┘
┌─────────────────────────────────┐
│ RenderInstance #1               │
│ { facing: 1,                    │
│   expansionOffset: { x: 80 } }  │
│            [Product]            │
│             at x: 290           │
└─────────────────────────────────┘
┌─────────────────────────────────┐
│ RenderInstance #2               │
│ { facing: 2,                    │
│   expansionOffset: { x: 160 } } │
│            [Product]            │
│             at x: 370           │
└─────────────────────────────────┘
```

**Code:**

```typescript
function expandFacings(
  source: SourceProduct, 
  metadata: ProductMetadata
): RenderInstance[] {
  const instances: RenderInstance[] = [];
  const horizontal = source.placement.facings?.horizontal ?? 1;
  
  for (let facing = 0; facing < horizontal; facing++) {
    instances.push({
      id: `${source.id}-${facing}`,
      facing,
      expansionOffset: {
        x: facing * metadata.dimensions.physical.width,
        y: 0,
        z: 0
      },
      // ... other properties
    });
  }
  
  return instances;
}
```

### Step-by-Step: Z-Index Calculation

**Purpose:** Determine draw order (higher z-index = drawn later = appears on top)

**Formula:**
```
zIndex = baseZ + shelfContribution + facingContribution + depthContribution

Where:
  baseZ = 1000 (fixture base layer)
  shelfContribution = shelfIndex × 100
  facingContribution = facingIndex × 1
  depthContribution = -depth × 100 (negative = front rows on top)
```

**Example Calculation:**

```
Product on shelf 2, facing 1, front row:
  baseZ = 1000
  + shelfContribution = 2 × 100 = 200
  + facingContribution = 1 × 1 = 1
  + depthContribution = -0 × 100 = 0
  ─────────────────────────────────────
  zIndex = 1201

Same product, back row (depth = 1):
  baseZ = 1000
  + shelfContribution = 2 × 100 = 200
  + facingContribution = 1 × 1 = 1
  + depthContribution = -1 × 100 = -100
  ─────────────────────────────────────
  zIndex = 1101 (drawn before front row)
```

**Visual Result:**

```
Draw Order (low to high z-index):
┌────────────────────────────────────────┐
│                                        │
│  Background (z: 0)                     │
│                                        │
│  ┌──────────────┐                      │
│  │ Back Row     │ (z: 1101)            │
│  │ [Product]    │ 92% scale            │
│  └──────────────┘                      │
│      ┌──────────────┐                  │
│      │ Front Row    │ (z: 1201)        │
│      │ [Product]    │ 100% scale       │
│      └──────────────┘                  │
│                                        │
│  Selection Overlay (z: 9999)           │
│                                        │
└────────────────────────────────────────┘
```

### Step-by-Step: Depth Scaling

**Purpose:** Simulate perspective - products further back appear smaller

```
Depth Scale Rules:
  depth = 0 (front row):  scale = 1.0  (100% size)
  depth = 1 (middle row): scale = 0.92 (92% size)
  depth ≥ 2 (back rows):  scale = 0.92 (92% size)
```

**Visual Effect:**

```
Side View of Shelf:
                Front Row        Back Row
                (depth: 0)       (depth: 1)
                scale: 1.0       scale: 0.92
                    │                │
    Eye Level ─┐    │                │
               │   ┌┴────┐      ┌────┴┐
               │   │     │      │     │
   Shopper ────┼──▶│ 100%│      │ 92% │
               │   │     │      │     │
               │   └─────┘      └─────┘
               │    
    Floor ─────┘   ═════════════════════ Shelf Surface
```

**Code:**

```typescript
function calculateDepthScale(depth: number): number {
  return depth === 0 ? 1.0 : 0.92;
}

function applyDepthScaling(
  dimensions: Dimensions3D, 
  scale: number
): Dimensions3D {
  return {
    width: dimensions.width * scale,
    height: dimensions.height * scale,
    depth: dimensions.depth * scale
  };
}
```

---

## Consumer Perspectives

Different developers need different subsets of the type system.

### Backend Developer

**Role:** Store and retrieve planograms, validate user input

**Needs:**
- L1 types only (`PlanogramConfig`, `SourceProduct`)
- Validation types (`ValidationResult`)
- Repository interfaces (`IPlanogramRepository`)

**Example workflow:**

```typescript
import { PlanogramConfig, validatePlanogramConfig } from '@vst/types';

async function savePlanogram(config: PlanogramConfig): Promise<void> {
  // Validate
  const validation = validatePlanogramConfig(config);
  if (!validation.valid) {
    throw new ValidationError(validation.errors);
  }
  
  // Store as JSON
  await db.planograms.insert({
    id: uuid(),
    config: JSON.stringify(config),
    created: new Date()
  });
}
```

**Doesn't need:**
- L4 types (RenderInstance)
- Render coordinates
- Visual properties

### Core Processor Developer

**Role:** Transform L1 data into L4 render-ready instances

**Needs:**
- All lifecycle types (L1, L2, L3, L4)
- Placement model interfaces (`IPlacementModel`)
- Repository interfaces (to fetch metadata)
- Coordinate types (semantic, world, render)

**Example workflow:**

```typescript
import { 
  PlanogramConfig, 
  ProcessedPlanogram,
  IPlacementModel,
  IDataAccessLayer 
} from '@vst/types';

class CoreProcessor {
  constructor(private dal: IDataAccessLayer) {}
  
  async process(config: PlanogramConfig): Promise<ProcessedPlanogram> {
    // L2: Validate
    const validation = this.validate(config);
    if (!validation.valid) {
      return { renderInstances: [], metadata: { errors: validation.errors } };
    }
    
    // L3: Enrichment
    const enriched = await this.enrich(config);
    
    // L4: Transform to render instances
    const instances = this.transform(enriched);
    
    return {
      renderInstances: instances,
      fixture: config.fixture,
      metadata: { totalInstances: instances.length }
    };
  }
}
```

### Renderer Developer

**Role:** Draw products to canvas/WebGL

**Needs:**
- L4 types only (`RenderInstance`, `RenderCoordinates`)
- Viewport types
- Visual property types (shadow, mask, z-index)

**Example workflow:**

```typescript
import { RenderInstance, Viewport } from '@vst/types';

class CanvasRenderer {
  render(
    instances: RenderInstance[], 
    viewport: Viewport,
    ctx: CanvasRenderingContext2D
  ): void {
    // Sort by z-index
    const sorted = instances.sort((a, b) => a.zIndex - b.zIndex);
    
    for (const instance of sorted) {
      // Just draw - no processing needed
      this.drawInstance(ctx, instance, viewport);
    }
  }
  
  private drawInstance(
    ctx: CanvasRenderingContext2D,
    instance: RenderInstance,
    viewport: Viewport
  ): void {
    const { x, y, width, height } = instance.renderCoordinates;
    
    // Draw shadow
    if (instance.shadowProperties.enabled) {
      this.drawShadow(ctx, instance);
    }
    
    // Draw sprite
    const sprite = this.spriteCache.get(instance.assets.spriteVariants[0].url);
    ctx.drawImage(sprite, x, y, width, height);
    
    // Apply mask
    if (instance.maskProperties.required) {
      this.applyMask(ctx, instance);
    }
  }
}
```

**Doesn't need:**
- L1 types (PlanogramConfig)
- Semantic coordinates
- Placement models

### UI Editor Developer

**Role:** Allow users to edit planograms interactively

**Needs:**
- L1 types (to update user edits)
- L4 types (to display current state)
- Validation types (to show errors)
- Editing state types (`EditingState`)

**Example workflow:**

```typescript
import { 
  RenderInstance, 
  SemanticPosition,
  isShelfSurfacePosition,
  EditingState 
} from '@vst/types';

class PlanogramEditor {
  private state: EditingState = {
    selectedInstanceId: null,
    isDragging: false
  };
  
  handleDragStart(instance: RenderInstance, mousePos: Vector2): void {
    this.state.selectedInstanceId = instance.id;
    this.state.isDragging = true;
    this.state.dragOffset = {
      x: mousePos.x - instance.renderCoordinates.x,
      y: mousePos.y - instance.renderCoordinates.y
    };
  }
  
  handleDragMove(mousePos: Vector2): void {
    if (!this.state.isDragging) return;
    
    const instance = this.getInstance(this.state.selectedInstanceId);
    
    // Convert screen pixels to semantic millimeters
    const newX = this.screenToSemantic(mousePos.x, this.viewport);
    
    // Update semantic position (L1 data)
    if (isShelfSurfacePosition(instance.semanticPosition)) {
      const updated = {
        ...instance.semanticPosition,
        x: newX
      };
      
      // Validate
      const validation = this.validate(updated);
      if (validation.valid) {
        this.updatePosition(instance.id, updated);
        this.reprocess(); // Trigger L1 → L4
      } else {
        this.showCollisionWarning();
      }
    }
  }
}
```

---

## Best Practices

### 1. Store L1, Compute L4

**❌ BAD:**
```typescript
// Storing computed render coordinates in database
await db.save({
  id: 'instance-1',
  renderX: 420,     // Pixels - changes with zoom!
  renderY: 1800,
  width: 160
});
```

**✅ GOOD:**
```typescript
// Store semantic coordinates (L1)
await db.save({
  id: 'product-1',
  sku: 'COKE-001',
  position: {
    model: 'shelf-surface',
    x: 210,           // Millimeters - device-independent
    shelfIndex: 2
  }
});

// Compute render coordinates (L4) at runtime
const instances = await processor.process(config);
```

**Why?**
- L1 is 10x smaller
- L1 works on any screen size/zoom
- L4 becomes stale when viewport changes

### 2. Validate Before Processing

**❌ BAD:**
```typescript
// Process without validation
const instances = await processor.process(config);
// May crash or produce invalid results
```

**✅ GOOD:**
```typescript
// Validate first
const validation = validatePlanogramConfig(config);
if (!validation.valid) {
  throw new Error(`Invalid planogram: ${validation.errors.join(', ')}`);
}

// Then process
const instances = await processor.process(config);
```

### 3. Use Type Guards for Pattern Matching

**❌ BAD:**
```typescript
// Runtime type checking without type guards
if (position.x !== undefined && position.shelfIndex !== undefined) {
  // TypeScript doesn't know what model this is
  const world = transformShelfSurface(position); // Type error!
}
```

**✅ GOOD:**
```typescript
// Type guards enable type narrowing
if (isShelfSurfacePosition(position)) {
  // TypeScript knows: position is ShelfSurfacePosition
  const world = transformShelfSurface(position); // ✓ Type safe
}

// Or use switch for exhaustive matching
switch (position.model) {
  case 'shelf-surface':
    return transformShelfSurface(position);
  case 'pegboard-grid':
    return transformPegboard(position);
  default:
    const _exhaustive: never = position; // Compiler error if case missed
    throw new Error('Unknown model');
}
```

### 4. Preserve Semantic Coordinates in L4

**❌ BAD:**
```typescript
// Losing original semantic data
interface RenderInstance {
  renderX: number;  // Pixels - can't trace back to retail space
  renderY: number;
}
```

**✅ GOOD:**
```typescript
// Preserve semantic coordinates
interface RenderInstance {
  semanticPosition: SemanticPosition;  // Original retail truth
  renderCoordinates: RenderCoordinates; // Computed screen position
}

// Benefits:
// - Can validate against original constraints
// - Can recompute render coords on zoom
// - Can trace back to merchandiser's intent
```

### 5. Handle Edge Cases in Placement Models

**❌ BAD:**
```typescript
transform(position: SemanticPosition): Vector3 {
  // Assumes shelf exists
  const y = fixture.shelves[position.shelfIndex].baseHeight;
  return { x: position.x, y, z: 0 };
}
```

**✅ GOOD:**
```typescript
transform(position: SemanticPosition, fixture: FixtureConfig): Vector3 {
  // Validate shelf exists
  if (position.shelfIndex >= fixture.shelves.length) {
    throw new Error(`Shelf ${position.shelfIndex} does not exist`);
  }
  
  // Handle negative coordinates
  if (position.x < 0) {
    throw new Error(`X position cannot be negative: ${position.x}`);
  }
  
  const shelf = fixture.shelves[position.shelfIndex];
  const y = shelf.baseHeight + (position.yOffset ?? 0);
  const z = (position.depth ?? 0) * (fixture.depthSpacing ?? 300);
  
  return { x: position.x, y, z };
}
```

### 6. When to Reprocess L1 → L4

| User Action | Reprocess? | Why |
|-------------|-----------|-----|
| **Pan viewport** | ❌ No | Just shift existing render coords |
| **Zoom in/out** | ❌ No | Just scale existing render coords |
| **Move product** | ✅ Yes | Semantic position changed (L1 updated) |
| **Add product** | ✅ Yes | New product in L1, needs expansion |
| **Change facings** | ✅ Yes | Expansion count changed, need new instances |
| **Update product image** | ❌ No | Just reload sprite, no processing needed |
| **Resize window** | ❌ No | Just update viewport, render coords stay same |

---

## Summary

The VST system maintains a clear separation between:

1. **What merchandisers intend** (L1 semantic coordinates)
2. **What physics allows** (L2 validation)
3. **What products look like** (L3 metadata)
4. **How computers render it** (L4 render coordinates)

This separation enables:

✅ **Portability** - Same planogram works across Canvas2D, WebGL, Three.js  
✅ **Validation** - Check physical constraints before rendering  
✅ **Performance** - Cache L1, recompute L4 only when needed  
✅ **Debugging** - Always trace back to original semantic intent  
✅ **Extensibility** - Add new placement models without changing L1/L4  

The **placement model** acts as the translation layer between retail reality (semantic coordinates in millimeters) and visual representation (render coordinates in pixels), allowing the system to support diverse fixture types while maintaining a consistent data model.