# VST Glossary

Comprehensive definitions of terms used throughout the VST system.

## Core Concepts

### Semantic Coordinates
**Definition:** Position data representing "retail truth" - where products are located in physical retail space using millimeters and logical indices.

**Why "semantic"?** They describe the *meaning* of a position in retail terms (shelf 2, 210mm from left) rather than screen pixels.

**Example:**
```typescript
{ model: 'shelf-surface', x: 210, shelfIndex: 2, depth: 0 }
```

**See also:** Render Coordinates, World Coordinates

---

### Render Coordinates
**Definition:** Position data representing screen-space location in pixels, calculated from semantic coordinates for drawing to canvas/WebGL.

**Key difference from semantic:** These change when you zoom or pan, while semantic coordinates remain constant.

**Example:**
```typescript
{ x: 420, y: 1800, width: 160, height: 500, scale: 1.0 }
```

**See also:** Semantic Coordinates, Viewport

---

### World Coordinates
**Definition:** 3D position in millimeters relative to the fixture origin, computed by the placement model.

**Purpose:** Intermediate representation between semantic (retail logic) and render (screen pixels).

**Example:**
```typescript
{ x: 210, y: 900, z: 0 }  // mm in 3D space
```

**See also:** Placement Model, Vector3

---

## Data Lifecycle

### L1 - Input Data
**Definition:** User intent layer. What the merchandiser specifies.

**Type:** `PlanogramConfig`

**Contains:** Fixture definition, list of products with semantic positions and facings.

**Storage:** Database, JSON files (persistent)

**Example:**
```typescript
{
  fixture: { type: 'shelf', placementModel: 'shelf-surface' },
  products: [{ sku: 'COKE-001', placement: { position: {...}, facings: {...} } }]
}
```

---

### L2 - Validation
**Definition:** Physical constraint checking layer.

**Type:** `ValidationResult`

**Checks:** Bounds validation, collision detection, fixture constraints.

**Example:**
```typescript
{
  valid: true,
  errors: [],
  warnings: ['Product near edge'],
  canRender: true
}
```

---

### L3 - Enrichment
**Definition:** Metadata augmentation layer. L1 data combined with database-fetched product metadata.

**Type:** `EnrichedProduct`

**Adds:** Physical dimensions, visual properties, pricing data.

**Example:**
```typescript
{
  sourceProduct: { sku: 'COKE-001', placement: {...} },
  metadata: { dimensions: {...}, visualProperties: {...}, pricing: {...} }
}
```

---

### L4 - Render Ready
**Definition:** Fully computed layer. Everything needed for rendering.

**Type:** `RenderInstance`

**Contains:** Render coordinates, z-index, bounding boxes, shadow/mask properties, asset URLs.

**Storage:** Ephemeral (computed at runtime, not persisted)

**Example:**
```typescript
{
  renderCoordinates: { x: 420, y: 1800, width: 160, height: 500 },
  zIndex: 1201,
  renderBounds: {...},
  shadowProperties: {...}
}
```

---

## Product Concepts

### Facing
**Definition:** A single unit of product visibility. One facing = one product front visible to the shopper.

**Types:**
- **Horizontal facing:** Products arranged side-by-side
- **Vertical facing:** Products stacked on top of each other

**Example:** A shelf with 6 bottles arranged in a 3×2 grid has 6 facings total (3 horizontal × 2 vertical).

**In code:**
```typescript
facings: { horizontal: 3, vertical: 2, total: 6 }
```

---

### SKU (Stock Keeping Unit)
**Definition:** Unique identifier for a product variant.

**Purpose:** Links placement data (L1) with metadata (L3).

**Example:** `'COKE-001'`, `'PEPSI-12OZ-001'`, `'CHIPS-LAYS-BBQ'`

**Usage:**
```typescript
const metadata = await productRepository.getBySku('COKE-001');
```

---

### Product Metadata
**Definition:** Database-stored information about a product's physical and visual properties.

**Contains:**
- Physical dimensions (width, height, depth in mm)
- Visual dimensions (sprite size, anchor point)
- Sprite variants (different viewing angles)
- Mask URL (for transparency)
- Classification (category, subcategory)
- Pricing

**Purpose:** Enriches placement data (L1) into renderable data (L4).

---

### Expansion
**Definition:** The process of converting a multi-facing SourceProduct into multiple RenderInstances.

**Example:** A product with 3 horizontal facings expands into 3 separate RenderInstances, each with an offset.

**Before expansion (L1):**
```typescript
{ sku: 'COKE-001', placement: { facings: { horizontal: 3 } } }  // 1 SourceProduct
```

**After expansion (L4):**
```typescript
[
  { id: 'COKE-001-0', offset: { x: 0 } },
  { id: 'COKE-001-1', offset: { x: 80 } },
  { id: 'COKE-001-2', offset: { x: 160 } }
]  // 3 RenderInstances
```

---

## Fixture Concepts

### Fixture
**Definition:** The physical retail structure that holds products (shelf, pegboard, end cap, basket).

**Properties:**
- Type (shelf, pegboard, freeform, basket-bin)
- Placement model (translation strategy)
- Physical dimensions
- Configuration (shelves, slots, grids)

**Example:**
```typescript
{
  type: 'shelf',
  placementModel: 'shelf-surface',
  dimensions: { width: 1200, height: 1800, depth: 400 },
  config: { shelves: [...], depthSpacing: 300 }
}
```

---

### Shelf
**Definition:** A horizontal surface within a fixture where products rest.

**Properties:**
- Index (0 = bottom shelf)
- Base height (Y position from floor in mm)
- Width and depth
- Optional slot configuration

**Example:**
```typescript
{ index: 2, baseHeight: 900, width: 1200, depth: 400, slots: 16 }
```

---

### Slot
**Definition:** A logical division of a shelf, used for magnetic snapping in editors.

**Purpose:** Help merchandisers align products to standard retail equipment markings.

**Important:** Slots are **helper structures**, not the storage format. Products store absolute X positions in mm.

**Example:** A 1200mm shelf with 16 slots has `slotWidth = 75mm`.

---

### Depth
**Definition:** Front-to-back row position on a shelf.

**Values:**
- `0` = Front row (closest to shopper)
- `1` = Middle row
- `2+` = Back rows

**Visual effect:** Back rows are rendered at 92% scale to simulate perspective.

**Example:**
```typescript
{ depth: 0 }  // Front row, 100% scale
{ depth: 1 }  // Back row, 92% scale
```

---

## Placement Models

### Placement Model
**Definition:** A translation strategy that converts semantic coordinates into 3D world coordinates.

**Interface:**
```typescript
interface IPlacementModel {
  transform(position: SemanticPosition, fixture: FixtureConfig): Vector3;
}
```

**Purpose:** Decouples business logic (how merchandisers think) from rendering logic (how computers draw).

**Available models:** shelf-surface, pegboard-grid, freeform-3d, basket-bin

---

### Shelf Surface Model
**Definition:** Placement model for standard retail shelving with continuous X-axis and discrete shelf levels.

**ID:** `'shelf-surface'`

**Coordinates:**
```typescript
{ model: 'shelf-surface', x: 210, shelfIndex: 2, depth: 0 }
```

**Transform:**
```
World X = x
World Y = shelf[shelfIndex].baseHeight + yOffset
World Z = depth × depthSpacing
```

**Use cases:** Grocery shelves, gondolas, coolers

---

### Pegboard Grid Model
**Definition:** Placement model for wall-mounted peg displays with discrete grid positioning.

**ID:** `'pegboard-grid'`

**Coordinates:**
```typescript
{ model: 'pegboard-grid', holeX: 8, holeY: 12, gridSpacing: 25.4 }
```

**Transform:**
```
World X = holeX × gridSpacing
World Y = holeY × gridSpacing
World Z = 0
```

**Use cases:** Hardware stores, tool displays, jewelry

---

## Rendering Concepts

### Z-Index
**Definition:** Draw order priority. Higher values are drawn later, appearing on top.

**Calculation:**
```
zIndex = baseZ + (shelfIndex × 100) + facingIndex - (depth × 100)
```

**Purpose:** Ensures proper layering (front products appear in front of back products, higher shelves appear above lower shelves).

**Example:**
```typescript
Front row, shelf 2, facing 0: zIndex = 1000 + 200 + 0 - 0 = 1200
Back row, shelf 2, facing 0:  zIndex = 1000 + 200 + 0 - 100 = 1100
```

---

### Viewport
**Definition:** The visible portion of the planogram on screen.

**Properties:**
- Position (x, y offset)
- Size (width, height)
- Zoom level (0.5x to 3.0x)
- DPI

**Purpose:** Determines which products are visible and how to transform world coordinates to screen pixels.

**Example:**
```typescript
{ x: 0, y: 0, width: 1920, height: 1080, zoom: 1.5, dpi: 2 }
```

---

### Sprite
**Definition:** A 2D image representing a product from a specific viewing angle.

**Variants:** Products can have multiple sprites (front view, side view, angled view).

**Example:**
```typescript
spriteVariants: [
  { angle: 0, url: 'front.png' },
  { angle: 90, url: 'side.png' },
  { angle: 315, url: 'angle.png' }
]
```

---

### Mask
**Definition:** An alpha channel image used to handle product transparency.

**Purpose:** Properly composite transparent products (bottles, packages with see-through elements).

**Types:**
- `alpha-channel` - Use image's built-in alpha
- `silhouette` - Generate from opaque pixels
- `outline` - Generate edge detection

**Example:**
```typescript
maskProperties: {
  required: true,
  maskUrl: 'coke-mask.png',
  maskType: 'alpha-channel'
}
```

---

### Shadow
**Definition:** Visual effect rendered beneath products to simulate lighting.

**Types:**
- `standard` - Default drop shadow
- `contact` - Shadow appears to touch surface
- `frost` - Soft glow effect
- `drop` - Hard shadow with offset

**Properties:**
```typescript
{
  type: 'standard',
  intensity: 0.3,
  offset: { x: 0, y: 4 },
  blur: 8,
  color: 'rgba(0, 0, 0, 0.3)'
}
```

---

### Bounding Box
**Definition:** Rectangular area encompassing a product, used for collision detection and hit testing.

**Types:**
- **Render bounds** - Screen-space pixels (for drawing)
- **Collision bounds** - Semantic-space millimeters (for validation)

**Example:**
```typescript
renderBounds: { x: 420, y: 1800, width: 160, height: 500 }
```

---

## System Concepts

### Core Processor
**Definition:** The subsystem that transforms L1 input data into L4 render-ready data.

**Responsibilities:**
- Facing expansion
- Placement model application
- Depth scaling
- Z-index calculation
- Render coordinate computation
- Bounding box generation

**Input:** `PlanogramConfig` (L1)  
**Output:** `ProcessedPlanogram` (L4)

---

### Data Access Layer
**Definition:** Unified interface for accessing repositories and external data sources.

**Provides:**
- Product repository (metadata lookup)
- Fixture repository (fixture definitions)
- Planogram repository (planogram storage)
- Asset provider (CDN URL resolution)
- Placement model registry

**Purpose:** Dependency injection, testability, abstraction.

---

### Renderer
**Definition:** Platform-specific drawing engine (Canvas2D, WebGL, Three.js).

**Responsibilities:**
- Sort RenderInstances by z-index
- Draw shadows
- Apply masks
- Draw sprites
- Handle viewport transforms

**Input:** `RenderInstance[]` (L4)  
**Output:** Visual planogram on screen

---

### Hit Testing
**Definition:** Determining which product instance is at a given screen coordinate.

**Use cases:** Mouse clicks, hover effects, selection.

**Process:**
1. Convert screen point to world coordinates
2. Check collision bounds of each RenderInstance
3. Return topmost instance (highest z-index)

**Example:**
```typescript
const hit = hitTester.test(mouseX, mouseY, renderInstances, viewport);
if (hit) {
  console.log('Clicked:', hit.instance.sku);
}
```

---

## Units

### Millimeters (mm)
**Definition:** Standard unit for physical measurements in retail space.

**Used for:** Semantic coordinates, physical dimensions, fixture sizing.

**Example:** `x: 210` means 210mm from the fixture's left edge.

---

### Pixels (px)
**Definition:** Standard unit for screen-space measurements.

**Used for:** Render coordinates, canvas drawing, UI elements.

**Conversion:** `pixels = millimeters × zoom`

---

### Degrees (°)
**Definition:** Angular measurement for rotations and viewing angles.

**Used for:** Sprite variants, product rotation (in freeform 3D model).

**Example:** `angle: 90` means 90° (right side view)

---

## Abbreviations

- **VST** - Virtual Store Technology
- **SKU** - Stock Keeping Unit
- **L1-L4** - Lifecycle layers 1 through 4
- **3D** - Three-dimensional
- **2D** - Two-dimensional
- **CDN** - Content Delivery Network
- **UI** - User Interface
- **API** - Application Programming Interface
- **DAO** - Data Access Object
- **DPI** - Dots Per Inch

---

## Quick Reference

| Term | Layer | Units | Purpose |
|------|-------|-------|---------|
| SemanticCoordinates | L1 | mm, indices | Retail intent |
| RenderCoordinates | L4 | pixels | Screen drawing |
| WorldCoordinates | L3 | mm | 3D space |
| Facing | L1 | count | Product repetition |
| Z-Index | L4 | number | Draw order |
| Viewport | Renderer | pixels | Visible area |
| Fixture | L1 | mm | Physical structure |
| Placement Model | L3 | N/A | Translation strategy |

---

## Related Documents

- [README.md](./README.md) - Overview and quick start
- [CONCEPTS.md](./CONCEPTS.md) - Visual data flow diagrams
- [coordinates/README.md](./coordinates/README.md) - Coordinate system guide
- [lifecycle/README.md](./lifecycle/README.md) - Pipeline explanation
- [placement-models/README.md](./placement-models/README.md) - Model selection guide